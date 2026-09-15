export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">SIP</p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight">
          Sistema de Informação de Processos
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          A fundação do monorepo está pronta. A API e o modelo de dados estão ligados para os
          próximos dias de desenvolvimento.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">API</p>
            <p className="mt-2 text-xl font-medium">Online em :3001</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Dados</p>
            <p className="mt-2 text-xl font-medium">PostgreSQL + Prisma</p>
          </div>
        </div>
      </div>
    </main>
  );
}
