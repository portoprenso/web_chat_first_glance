import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-10 text-center shadow-panel">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-300">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-sm text-slate-300">
          The route does not exist or your session has moved elsewhere.
        </p>
        <Link
          className="mt-6 inline-flex rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-slate-950"
          to="/"
        >
          Back to chat
        </Link>
      </div>
    </div>
  );
}
