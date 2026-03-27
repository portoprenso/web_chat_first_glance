import { useParams } from 'react-router-dom';

import { EmptyState } from '../../../components/empty-state';
import { ErrorState } from '../../../components/error-state';
import { Loader } from '../../../components/loader';
import { formatTimestamp } from '../../../lib/format';
import { useAuthStore } from '../../../store/auth-store';
import { MessageComposer } from '../components/message-composer';
import { MessageList } from '../components/message-list';
import { useChatMessagesQuery, useChatsQuery } from '../hooks/use-chat-data';

export function ChatPage() {
  const { chatId } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const chatsQuery = useChatsQuery();
  const messagesQuery = useChatMessagesQuery(chatId);

  const activeChat = chatsQuery.data?.items.find((chat) => chat.id === chatId) ?? null;

  if (!chatId) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          description="Choose an existing chat or open a new one from the sidebar."
          title="Select a conversation"
        />
      </div>
    );
  }

  if (chatsQuery.isLoading) {
    return <Loader label="Loading conversation…" />;
  }

  if (chatsQuery.isError || !activeChat) {
    return (
      <ErrorState
        description="The requested conversation is unavailable or you no longer have access."
        onRetry={() => {
          void chatsQuery.refetch();
        }}
        title="Conversation unavailable"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Direct chat</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {activeChat.participant.displayName}
            </h1>
            <p className="text-sm text-slate-400">{activeChat.participant.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Last activity</p>
            <p className="mt-2 text-sm text-slate-300">
              {formatTimestamp(activeChat.lastMessage?.createdAt ?? activeChat.updatedAt)}
            </p>
          </div>
        </div>
      </header>

      <section className="mt-4 flex-1 overflow-y-auto pr-2">
        {messagesQuery.isLoading ? <Loader label="Loading messages…" /> : null}
        {messagesQuery.isError ? (
          <ErrorState
            description="Message history could not be loaded."
            onRetry={() => {
              void messagesQuery.refetch();
            }}
            title="Unable to load messages"
          />
        ) : null}
        {!messagesQuery.isLoading && !messagesQuery.isError ? (
          <MessageList
            currentUserId={currentUser!.id}
            data={messagesQuery.data}
            hasNextPage={Boolean(messagesQuery.hasNextPage)}
            isFetchingNextPage={messagesQuery.isFetchingNextPage}
            onLoadOlder={() => {
              void messagesQuery.fetchNextPage();
            }}
          />
        ) : null}
      </section>

      <div className="mt-4">
        <MessageComposer chatId={chatId} />
      </div>
    </div>
  );
}
