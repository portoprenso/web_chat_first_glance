import fp from 'fastify-plugin';

import { verifyAccessToken } from '../lib/jwt.js';
import { AppError } from '../lib/errors.js';

export const authenticatePlugin = fp((app, _opts, done) => {
  app.decorateRequest('user', null);

  app.decorate('authenticate', (request, reply) => {
    void reply;
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer access token.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    try {
      const payload = verifyAccessToken(token, app.config);
      request.user = {
        userId: payload.sub,
      };
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Access token is invalid or expired.');
    }
  });

  done();
});
