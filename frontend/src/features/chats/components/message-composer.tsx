import { useRef, useState, type KeyboardEvent } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../../lib/api/errors';
import { createMessageRequest, uploadAttachmentRequest, type MessagePage } from '../api';
import { upsertMessagePageData } from '../hooks/use-chat-data';
import { chatKeys } from '../query-keys';

const MAX_ATTACHMENTS = 5;

function shouldSendOnEnter(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function MessageComposer({ chatId }: { chatId: string }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const attachmentIds: string[] = [];

      for (const file of files) {
        const attachment = await uploadAttachmentRequest(file);
        attachmentIds.push(attachment.id);
      }

      return createMessageRequest(chatId, {
        body: body.trim() || undefined,
        attachmentIds,
      });
    },
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages(chatId), (current) =>
        upsertMessagePageData(current, message),
      );
      void queryClient.invalidateQueries({ queryKey: chatKeys.all });
      setBody('');
      setFiles([]);
      setErrorMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Message could not be sent.');
    },
  });

  const canSend = body.trim().length > 0 || files.length > 0;

  const handleSend = () => {
    if (!canSend || sendMutation.isPending) {
      return;
    }

    sendMutation.mutate();
  };

  const handleBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.repeat ||
      event.nativeEvent.isComposing ||
      !shouldSendOnEnter()
    ) {
      return;
    }

    event.preventDefault();
    handleSend();
  };

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-4 shadow-panel">
      {files.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file) => (
            <button
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
              key={`${file.name}-${file.size}`}
              onClick={() => setFiles((current) => current.filter((item) => item !== file))}
              type="button"
            >
              {file.name} ×
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        className="min-h-[96px] w-full resize-none rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400"
        maxLength={2000}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleBodyKeyDown}
        placeholder="Write a message…"
        value={body}
      />

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <input
            className="hidden"
            multiple
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []).slice(0, MAX_ATTACHMENTS);
              setFiles(selectedFiles);
            }}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            Add file
          </button>
          <span className="text-xs text-slate-500">Up to 5 files, 10 MB each.</span>
        </div>

        <button
          className="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canSend || sendMutation.isPending}
          onClick={handleSend}
          type="button"
        >
          {sendMutation.isPending ? 'Sending…' : 'Send message'}
        </button>
      </div>

      {errorMessage ? <p className="mt-3 text-sm text-rose-300">{errorMessage}</p> : null}
    </div>
  );
}
