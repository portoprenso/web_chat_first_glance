import { useMutation } from '@tanstack/react-query';

import { downloadAttachmentRequest, type Attachment } from '../api';
import { triggerBrowserDownload } from '../../../lib/download';
import { formatBytes } from '../../../lib/format';

export function AttachmentPill({ attachment }: { attachment: Attachment }) {
  const mutation = useMutation({
    mutationFn: () => downloadAttachmentRequest(attachment.downloadPath),
    onSuccess: ({ blob, fileName }) => {
      triggerBrowserDownload(blob, fileName ?? attachment.originalName);
    },
  });

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400"
      onClick={() => mutation.mutate()}
      type="button"
    >
      <span>{attachment.originalName}</span>
      <span className="text-slate-400">{formatBytes(attachment.sizeBytes)}</span>
    </button>
  );
}
