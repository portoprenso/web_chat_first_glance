import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoginForm } from './login-form';
import { renderWithProviders } from '../../../test/render';

describe('LoginForm', () => {
  it('shows validation messages before submission', async () => {
    renderWithProviders(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });
});
