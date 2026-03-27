export function ErrorState({
  description,
  onRetry,
  title = 'Something went wrong',
}: {
  description: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="rounded-3xl border border-rose-500/30 bg-rose-950/30 p-6 text-rose-100">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-rose-100/80">{description}</p>
      {onRetry ? (
        <button
          className="mt-4 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
