import type { WebSocket } from 'ws';

import { verifyAccessToken } from '../lib/jwt.js';
import { clientEventSchema, serverEventSchemas } from '../contracts/ws/events.js';
import type { AppConfig } from '../config/env.js';

type TrackedSocket = WebSocket & {
  isAlive?: boolean;
  expiryTimer?: NodeJS.Timeout;
  userId?: string;
};

type ServerEvent = {
  type: string;
  payload: Record<string, unknown>;
};

export class WebSocketHub {
  private readonly socketsByUserId = new Map<string, Set<TrackedSocket>>();
  private readonly heartbeatTimer: NodeJS.Timeout;

  constructor(private readonly config: AppConfig) {
    this.heartbeatTimer = setInterval(() => {
      this.socketsByUserId.forEach((sockets) => {
        sockets.forEach((socket) => {
          if (!socket.isAlive) {
            socket.terminate();
            return;
          }

          socket.isAlive = false;
          socket.ping();
        });
      });
    }, 30_000);
  }

  public attachSocket(socket: WebSocket): void {
    const trackedSocket = socket as TrackedSocket;
    trackedSocket.isAlive = true;

    socket.on('pong', () => {
      trackedSocket.isAlive = true;
    });

    socket.on('close', () => {
      this.unregisterSocket(trackedSocket);
      if (trackedSocket.expiryTimer) {
        clearTimeout(trackedSocket.expiryTimer);
      }
    });

    socket.on('message', (raw) => {
      const rawMessage = this.normalizeRawMessage(raw);

      if (!rawMessage) {
        this.sendError(trackedSocket, 'INVALID_EVENT', 'WebSocket message must be text.');
        return;
      }

      this.handleMessage(trackedSocket, rawMessage);
    });
  }

  public broadcastToUsers(userIds: string[], event: ServerEvent): void {
    const serialized = JSON.stringify(event);

    userIds.forEach((userId) => {
      this.socketsByUserId.get(userId)?.forEach((socket) => {
        socket.send(serialized);
      });
    });
  }

  public close(): void {
    clearInterval(this.heartbeatTimer);
    this.socketsByUserId.forEach((sockets) => {
      sockets.forEach((socket) => socket.close());
    });
    this.socketsByUserId.clear();
  }

  private handleMessage(socket: TrackedSocket, rawMessage: string): void {
    let parsedMessage: unknown;

    try {
      parsedMessage = JSON.parse(rawMessage);
    } catch {
      this.sendError(socket, 'INVALID_EVENT', 'WebSocket message must be valid JSON.');
      return;
    }

    const result = clientEventSchema.safeParse(parsedMessage);

    if (!result.success) {
      this.sendError(socket, 'INVALID_EVENT', 'WebSocket event payload is invalid.');
      return;
    }

    switch (result.data.type) {
      case 'auth.authenticate': {
        try {
          const payload = verifyAccessToken(result.data.payload.accessToken, this.config);
          this.registerSocket(socket, payload.sub, payload.exp);
          this.send(socket, {
            type: 'connection.ready',
            payload: {
              userId: payload.sub,
            },
          });
        } catch {
          this.sendError(socket, 'UNAUTHORIZED', 'WebSocket authentication failed.');
          socket.close(4401, 'UNAUTHORIZED');
        }
        break;
      }
    }
  }

  private normalizeRawMessage(raw: unknown): string | null {
    if (typeof raw === 'string') {
      return raw;
    }

    if (raw instanceof ArrayBuffer) {
      return Buffer.from(raw).toString('utf8');
    }

    if (Array.isArray(raw)) {
      return Buffer.concat(raw.map((item) => Buffer.from(item))).toString('utf8');
    }

    if (Buffer.isBuffer(raw)) {
      return raw.toString('utf8');
    }

    return null;
  }

  private registerSocket(socket: TrackedSocket, userId: string, exp: number): void {
    this.unregisterSocket(socket);

    const sockets = this.socketsByUserId.get(userId) ?? new Set<TrackedSocket>();
    sockets.add(socket);
    socket.userId = userId;
    this.socketsByUserId.set(userId, sockets);

    const ttlMilliseconds = Math.max(exp * 1000 - Date.now(), 1_000);
    socket.expiryTimer = setTimeout(() => {
      this.sendError(socket, 'TOKEN_EXPIRED', 'Access token expired.');
      socket.close(4401, 'TOKEN_EXPIRED');
    }, ttlMilliseconds);
  }

  private unregisterSocket(socket: TrackedSocket): void {
    if (!socket.userId) {
      return;
    }

    const sockets = this.socketsByUserId.get(socket.userId);
    sockets?.delete(socket);

    if (sockets && sockets.size === 0) {
      this.socketsByUserId.delete(socket.userId);
    }

    socket.userId = undefined;
  }

  private send(socket: TrackedSocket, event: ServerEvent): void {
    socket.send(JSON.stringify(event));
  }

  private sendError(socket: TrackedSocket, code: string, message: string): void {
    this.send(socket, {
      type: serverEventSchemas.error.shape.type.value,
      payload: {
        code,
        message,
      },
    });
  }
}
