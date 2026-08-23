export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          Track 01 — AI Growth & Agentic Commerce
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Agentic Commerce
        </h1>
        <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-300">
          Phase 0 foundation ready. Next.js App Router with TypeScript, Tailwind
          CSS, and ESLint. No business logic yet — ready for phased
          development.
        </p>
        <div className="mt-8 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
            Build passing
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            src/app/page.tsx
          </span>
        </div>
      </div>
    </main>
  );
}
