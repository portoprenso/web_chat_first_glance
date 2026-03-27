import { create } from 'zustand';

export type SocketStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

type SocketState = {
  lastError: string | null;
  status: SocketStatus;
  setStatus: (status: SocketStatus, lastError?: string | null) => void;
};

export const useSocketStore = create<SocketState>((set) => ({
  lastError: null,
  status: 'idle',
  setStatus: (status, lastError = null) =>
    set({
      status,
      lastError,
    }),
}));
