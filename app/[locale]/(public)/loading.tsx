export default function Loading() {
  return (
    <div className="container-app w-full py-16">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
