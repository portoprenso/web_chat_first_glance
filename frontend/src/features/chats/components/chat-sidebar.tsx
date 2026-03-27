import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';

import { ErrorState } from '../../../components/error-state';
import { Loader } from '../../../components/loader';
import { formatTimestamp } from '../../../lib/format';
import { logoutRequest } from '../../auth/api';
import { useAuthStore } from '../../../store/auth-store';
import { useSocketStore } from '../../../store/socket-store';
import { useChatsQuery } from '../hooks/use-chat-data';
import { chatKeys } from '../query-keys';
import { NewChatForm } from './new-chat-form';

export function ChatSidebar() {
  const user = useAuthStore((state) => state.user);
  const socketStatus = useSocketStore((state) => state.status);
  const location = useLocation();
  const queryClient = useQueryClient();
  const chatsQuery = useChatsQuery();

  const logoutMutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return (
    <aside className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">First Glance</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">{user?.displayName}</h1>
          <p className="text-sm text-slate-400">{user?.email}</p>
        </div>
        <button
          className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-rose-400 hover:text-rose-200"
          onClick={() => {
            logoutMutation.mutate();
          }}
          type="button"
        >
          Logout
        </button>
      </div>

      <div className="mt-4 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Realtime: {socketStatus}
      </div>

      <div className="mt-6">
        <NewChatForm />
      </div>

      <div className="mt-6 flex-1 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.3em] text-slate-500">Chats</h2>
          <button
            className="text-xs text-slate-400 transition hover:text-white"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: chatKeys.all });
            }}
            type="button"
          >
            Refresh
          </button>
        </div>

        <div className="h-full overflow-y-auto pr-2">
          {chatsQuery.isLoading ? <Loader label="Loading chats…" /> : null}
          {chatsQuery.isError ? (
            <ErrorState
              description="Chat list could not be loaded."
              onRetry={() => {
                void chatsQuery.refetch();
              }}
              title="Unable to load chats"
            />
          ) : null}

          {chatsQuery.data?.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
              Start a direct chat by entering another user&apos;s email above.
            </div>
          ) : null}

          <div className="space-y-2">
            {chatsQuery.data?.items.map((chat) => {
              const active = location.pathname === `/chats/${chat.id}`;

              return (
                <Link
                  className={`block rounded-3xl border px-4 py-3 transition ${
                    active
                      ? 'border-cyan-400/60 bg-cyan-400/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  key={chat.id}
                  to={`/chats/${chat.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{chat.participant.displayName}</p>
                      <p className="text-sm text-slate-400">{chat.participant.email}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatTimestamp(chat.lastMessage?.createdAt ?? chat.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300">
                    {chat.lastMessage?.body ??
                      (chat.lastMessage?.attachmentCount
                        ? `${chat.lastMessage.attachmentCount} attachment(s)`
                        : 'No messages yet')}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
