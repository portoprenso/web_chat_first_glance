import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../../../lib/api/errors';
import { registerRequest, storeSession } from '../api';
import { type RegisterFormValues, registerFormSchema } from '../schemas';

export function RegisterForm() {
  const navigate = useNavigate();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    },
  });

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (session) => {
      storeSession(session);
      void navigate('/');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        form.setError('root', {
          message: error.message,
        });
      }
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        void form.handleSubmit((values) => mutation.mutate(values))(event);
      }}
    >
      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Display name</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          {...form.register('displayName')}
          placeholder="Casey North"
          type="text"
        />
        <span className="mt-1 block text-sm text-rose-300">
          {form.formState.errors.displayName?.message}
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Email</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          {...form.register('email')}
          placeholder="you@example.com"
          type="email"
        />
        <span className="mt-1 block text-sm text-rose-300">
          {form.formState.errors.email?.message}
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Password</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          {...form.register('password')}
          placeholder="At least 8 characters"
          type="password"
        />
        <span className="mt-1 block text-sm text-rose-300">
          {form.formState.errors.password?.message}
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-slate-300">Confirm password</span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          {...form.register('confirmPassword')}
          placeholder="Repeat your password"
          type="password"
        />
        <span className="mt-1 block text-sm text-rose-300">
          {form.formState.errors.confirmPassword?.message}
        </span>
      </label>

      <span className="block text-sm text-rose-300">{form.formState.errors.root?.message}</span>

      <button
        className="w-full rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-sm text-slate-400">
        Already registered?{' '}
        <Link className="text-amber-300" to="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
