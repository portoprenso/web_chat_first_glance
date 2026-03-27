import { RegisterForm } from '../components/register-form';

export function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-5xl gap-10 rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-panel md:grid-cols-[0.9fr_1.1fr] md:p-10">
        <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Create account</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Stand up your workspace in minutes
          </h1>
          <div className="mt-8">
            <RegisterForm />
          </div>
        </section>

        <section className="rounded-[1.75rem] bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 p-8 text-slate-950">
          <p className="text-sm uppercase tracking-[0.3em]">MVP foundation</p>
          <h2 className="mt-6 text-4xl font-bold">
            Backend-owned contracts with frontend-local generation.
          </h2>
          <p className="mt-4 max-w-xl text-base/7 text-slate-950/80">
            REST schemas flow through OpenAPI, WebSocket events are generated from backend Zod
            schemas, and both clients stay aligned without a shared workspace package.
          </p>
        </section>
      </div>
    </div>
  );
}
