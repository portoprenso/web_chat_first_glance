import type { PrismaClient, User } from '@prisma/client';

import type { AppConfig } from '../../config/env.js';
import { toUserDto } from '../../contracts/rest/presenters.js';
import { AppError } from '../../lib/errors.js';
import { normalizeEmail, type RequestMeta } from '../../lib/http.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { createOpaqueToken, hashOpaqueToken } from '../../lib/tokens.js';

type AuthServiceDeps = {
  config: AppConfig;
  prisma: PrismaClient;
};

type SessionBundle = {
  refreshToken: string;
  session: {
    accessToken: string;
    accessTokenExpiresAt: string;
    user: ReturnType<typeof toUserDto>;
  };
};

function getRefreshExpiry(config: AppConfig): Date {
  return new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function issueSession(
  deps: AuthServiceDeps,
  user: User,
  meta: RequestMeta,
): Promise<SessionBundle> {
  const refreshToken = createOpaqueToken();
  const accessToken = signAccessToken(user.id, deps.config);

  await deps.prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: getRefreshExpiry(deps.config),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  return {
    refreshToken,
    session: {
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      user: toUserDto(user),
    },
  };
}

export async function registerUser(
  deps: AuthServiceDeps,
  input: {
    email: string;
    password: string;
    displayName: string;
  },
  meta: RequestMeta,
): Promise<SessionBundle> {
  const email = normalizeEmail(input.email);

  const existingUser = await deps.prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with that email already exists.');
  }

  const user = await deps.prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName.trim(),
    },
  });

  return issueSession(deps, user, meta);
}

export async function loginUser(
  deps: AuthServiceDeps,
  input: {
    email: string;
    password: string;
  },
  meta: RequestMeta,
): Promise<SessionBundle> {
  const email = normalizeEmail(input.email);
  const user = await deps.prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  return issueSession(deps, user, meta);
}

export async function refreshSession(
  deps: AuthServiceDeps,
  rawRefreshToken: string | undefined,
  meta: RequestMeta,
): Promise<SessionBundle> {
  if (!rawRefreshToken) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is missing.');
  }

  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const currentSession = await deps.prisma.refreshSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!currentSession || currentSession.revokedAt || currentSession.expiresAt <= new Date()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh session is invalid or expired.');
  }

  return deps.prisma.$transaction(async (tx) => {
    const nextRefreshToken = createOpaqueToken();
    const replacementSession = await tx.refreshSession.create({
      data: {
        userId: currentSession.userId,
        tokenHash: hashOpaqueToken(nextRefreshToken),
        expiresAt: getRefreshExpiry(deps.config),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    await tx.refreshSession.update({
      where: { id: currentSession.id },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
        replacedBySessionId: replacementSession.id,
      },
    });

    const accessToken = signAccessToken(currentSession.user.id, deps.config);

    return {
      refreshToken: nextRefreshToken,
      session: {
        accessToken: accessToken.token,
        accessTokenExpiresAt: accessToken.expiresAt,
        user: toUserDto(currentSession.user),
      },
    };
  });
}

export async function logoutSession(
  deps: AuthServiceDeps,
  rawRefreshToken: string | undefined,
): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  await deps.prisma.refreshSession.updateMany({
    where: {
      tokenHash: hashOpaqueToken(rawRefreshToken),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      lastUsedAt: new Date(),
    },
  });
}
