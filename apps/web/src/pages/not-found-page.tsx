export function NotFoundPage(): JSX.Element {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
      <div className="text-center">
        <p className="text-brand-400 font-mono text-sm font-bold">404 / ROUTE_NOT_FOUND</p>
        <h1 className="mt-4 text-4xl font-bold">That workspace view doesn’t exist.</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-400">
          The link may be outdated, or the resource may have moved.
        </p>
        <a
          href="/dashboard"
          className="bg-brand-500 mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-semibold"
        >
          Return to dashboard
        </a>
      </div>
    </main>
  );
}
