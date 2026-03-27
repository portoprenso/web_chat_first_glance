import { LoginForm } from '../components/login-form';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-5xl gap-10 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <section className="rounded-[1.75rem] bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-8 text-slate-950">
          <p className="text-sm uppercase tracking-[0.3em]">First Glance</p>
          <h1 className="mt-6 text-4xl font-bold">
            Secure chat, tight feedback, no extra ceremony.
          </h1>
          <p className="mt-4 max-w-xl text-base/7 text-slate-950/80">
            Access tokens stay in memory, refresh lives in an HTTP-only cookie, and live delivery is
            native WebSocket all the way through.
          </p>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Sign in</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Continue your conversations</h2>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
      </div>
    </div>
  );
}
