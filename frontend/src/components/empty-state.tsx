import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-panel">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-300">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
