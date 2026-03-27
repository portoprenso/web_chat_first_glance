import { create } from 'zustand';

export type AuthUser = {
  createdAt: string;
  displayName: string;
  email: string;
  id: string;
};

type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous';

type AuthState = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  status: AuthStatus;
  user: AuthUser | null;
  setAuthenticated: (payload: {
    accessToken: string;
    accessTokenExpiresAt: string;
    user: AuthUser;
  }) => void;
  setBootstrapping: () => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  status: 'bootstrapping',
  user: null,
  setAuthenticated: (payload) =>
    set({
      status: 'authenticated',
      accessToken: payload.accessToken,
      accessTokenExpiresAt: payload.accessTokenExpiresAt,
      user: payload.user,
    }),
  setBootstrapping: () =>
    set((state) => ({
      ...state,
      status: 'bootstrapping',
    })),
  clearAuth: () =>
    set({
      status: 'anonymous',
      accessToken: null,
      accessTokenExpiresAt: null,
      user: null,
    }),
}));
