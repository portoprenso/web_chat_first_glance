import jwt from 'jsonwebtoken';

import type { AppConfig } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  exp: number;
  iat: number;
};

export function signAccessToken(
  userId: string,
  config: AppConfig,
): {
  token: string;
  expiresAt: string;
} {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const exp = issuedAtSeconds + config.ACCESS_TOKEN_TTL_MINUTES * 60;

  const token = jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${config.ACCESS_TOKEN_TTL_MINUTES}m`,
  });

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function verifyAccessToken(token: string, config: AppConfig): AccessTokenPayload {
  const payload = jwt.verify(token, config.JWT_ACCESS_SECRET);

  if (typeof payload !== 'object' || payload === null || typeof payload.sub !== 'string') {
    throw new Error('Invalid token payload.');
  }

  return payload as AccessTokenPayload;
}
