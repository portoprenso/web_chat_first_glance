import type { InfiniteData } from '@tanstack/react-query';

import { EmptyState } from '../../../components/empty-state';
import type { MessagePage } from '../api';
import { getOrderedMessages } from '../hooks/use-chat-data';
import { MessageItem } from './message-item';

export function MessageList({
  currentUserId,
  data,
  hasNextPage,
  isFetchingNextPage,
  onLoadOlder,
}: {
  currentUserId: string;
  data: InfiniteData<MessagePage> | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadOlder: () => void;
}) {
  const messages = getOrderedMessages(data);

  if (messages.length === 0) {
    return (
      <EmptyState
        description="Say hello or share a file to start the conversation."
        title="No messages yet"
      />
    );
  }

  return (
    <div className="space-y-4">
      {hasNextPage ? (
        <button
          className="mx-auto block rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 transition hover:border-white/30"
          disabled={isFetchingNextPage}
          onClick={onLoadOlder}
          type="button"
        >
          {isFetchingNextPage ? 'Loading older messages…' : 'Load older messages'}
        </button>
      ) : null}

      {messages.map((message) => (
        <MessageItem currentUserId={currentUserId} key={message.id} message={message} />
      ))}
    </div>
  );
}
