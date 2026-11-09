"use client";
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold">Workspace unavailable</h1>
        <p className="mt-4 text-slate-600">
          An unexpected error interrupted this screen. Your backend session has
          not been replaced.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
