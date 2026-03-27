export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
        {label}
      </div>
    </div>
  );
}
