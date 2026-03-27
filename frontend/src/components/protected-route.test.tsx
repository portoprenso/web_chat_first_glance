import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAuthStore } from '../store/auth-store';
import { ProtectedRoute } from './protected-route';
import { renderWithProviders } from '../test/render';

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    useAuthStore.getState().clearAuth();

    renderWithProviders(
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <div>Secret area</div>
            </ProtectedRoute>
          }
          path="/"
        />
        <Route element={<div>Login page</div>} path="/login" />
      </Routes>,
      {
        initialEntries: ['/'],
      },
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});
