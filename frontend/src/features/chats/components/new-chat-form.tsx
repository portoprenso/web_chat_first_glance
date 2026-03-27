import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '../../../lib/api/errors';
import { openDirectChatRequest } from '../api';
import { chatKeys } from '../query-keys';
import { directChatSchema, type DirectChatFormValues } from '../../auth/schemas';

export function NewChatForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<DirectChatFormValues>({
    resolver: zodResolver(directChatSchema),
    defaultValues: {
      participantEmail: '',
    },
  });

  const mutation = useMutation({
    mutationFn: openDirectChatRequest,
    onSuccess: (chat) => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
      form.reset();
      void navigate(`/chats/${chat.id}`);
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
      className="space-y-3"
      onSubmit={(event) => {
        void form.handleSubmit((values) => mutation.mutate(values))(event);
      }}
    >
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-slate-500">
          Open direct chat
        </span>
        <input
          className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
          {...form.register('participantEmail')}
          placeholder="friend@example.com"
          type="email"
        />
      </label>
      <span className="block text-xs text-rose-300">
        {form.formState.errors.participantEmail?.message}
      </span>
      <span className="block text-xs text-rose-300">{form.formState.errors.root?.message}</span>
      <button
        className="w-full rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Opening…' : 'Open chat'}
      </button>
    </form>
  );
}
