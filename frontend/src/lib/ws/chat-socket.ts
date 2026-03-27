import type { ServerEvent } from '../../generated/ws-contracts';

type ChatSocketClientOptions = {
  getAccessToken: () => string | null;
  onAuthExpired: () => Promise<boolean>;
  onEvent: (event: ServerEvent) => void;
  onStatusChange: (
    status: 'connecting' | 'connected' | 'disconnected' | 'error',
    error?: string,
  ) => void;
  url: string;
};

export class ChatSocketClient {
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private socket: WebSocket | null = null;
  private disposed = false;
  private refreshing = false;

  constructor(private readonly options: ChatSocketClientOptions) {}

  public connect(): void {
    if (this.disposed || this.socket) {
      return;
    }

    const accessToken = this.options.getAccessToken();

    if (!accessToken) {
      this.options.onStatusChange('disconnected');
      return;
    }

    this.options.onStatusChange('connecting');
    this.socket = new WebSocket(this.options.url);

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.socket?.send(
        JSON.stringify({
          type: 'auth.authenticate',
          payload: {
            accessToken,
          },
        }),
      );
    });

    this.socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        this.options.onStatusChange('error', 'Unsupported realtime frame.');
        return;
      }

      try {
        const payload = JSON.parse(event.data) as ServerEvent;

        if (
          payload.type === 'error' &&
          (payload.payload.code === 'TOKEN_EXPIRED' || payload.payload.code === 'UNAUTHORIZED')
        ) {
          void this.handleExpiredAuth(payload.payload.message);
          return;
        }

        if (payload.type === 'connection.ready') {
          this.options.onStatusChange('connected');
        }

        this.options.onEvent(payload);
      } catch {
        this.options.onStatusChange('error', 'Invalid realtime payload received.');
      }
    });

    this.socket.addEventListener('close', (event) => {
      this.socket = null;

      if (this.disposed) {
        return;
      }

      this.options.onStatusChange('disconnected');

      if (event.code === 4401) {
        void this.handleExpiredAuth('Realtime authentication expired.');
        return;
      }

      this.scheduleReconnect();
    });

    this.socket.addEventListener('error', () => {
      this.options.onStatusChange('error', 'Realtime connection error.');
    });
  }

  public disconnect(): void {
    this.disposed = true;

    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(1_000 * 2 ** this.reconnectAttempts, 10_000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private async handleExpiredAuth(errorMessage: string): Promise<void> {
    if (this.refreshing) {
      return;
    }

    this.refreshing = true;

    try {
      const restored = await this.options.onAuthExpired();

      if (!restored) {
        this.options.onStatusChange('error', errorMessage);
        return;
      }

      this.socket?.close();
      this.socket = null;
      this.connect();
    } finally {
      this.refreshing = false;
    }
  }
}
