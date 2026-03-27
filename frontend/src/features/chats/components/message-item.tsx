import type { Message } from '../api';
import { AttachmentPill } from './attachment-pill';
import { formatTimestamp } from '../../../lib/format';

export function MessageItem({
  currentUserId,
  message,
}: {
  currentUserId: string;
  message: Message;
}) {
  const isOwnMessage = message.sender.id === currentUserId;

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl rounded-[1.75rem] px-4 py-3 ${
          isOwnMessage
            ? 'bg-amber-400 text-slate-950'
            : 'border border-white/10 bg-white/5 text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <p className={`text-sm font-medium ${isOwnMessage ? 'text-slate-900/90' : 'text-white'}`}>
            {isOwnMessage ? 'You' : message.sender.displayName}
          </p>
          <span className={`text-xs ${isOwnMessage ? 'text-slate-900/60' : 'text-slate-400'}`}>
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
        {message.body ? <p className="mt-2 whitespace-pre-wrap text-sm/6">{message.body}</p> : null}
        {message.attachments.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentPill attachment={attachment} key={attachment.id} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
