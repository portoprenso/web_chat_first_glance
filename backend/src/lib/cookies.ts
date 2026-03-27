import type { FastifyReply } from 'fastify';

import type { AppConfig } from '../config/env.js';

export function setRefreshTokenCookie(reply: FastifyReply, token: string, config: AppConfig): void {
  reply.setCookie(config.REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    path: '/auth',
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearRefreshTokenCookie(reply: FastifyReply, config: AppConfig): void {
  reply.clearCookie(config.REFRESH_COOKIE_NAME, {
    path: '/auth',
    sameSite: 'lax',
    secure: config.isProduction,
  });
}
