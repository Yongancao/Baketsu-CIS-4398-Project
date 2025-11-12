import React from "react";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start bg-white py-24 px-6 sm:px-16 dark:bg-black sm:items-start">
        {/* top */}
        <header className="w-full border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Overview of your Baketsu cloud storage. Some features are coming
            soon.
          </p>
        </header>

        {/* storage */}
        <section className="mt-6 w-full">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Storage usage</span>
            <span>3.5 GB / 10 GB</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-1/3 bg-black dark:bg-zinc-200" />
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            Actual usage integration with S3 coming soon.
          </p>
        </section>

        {/* upload */}
        <section className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className="w-full rounded-full border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-400 outline-none dark:border-zinc-700 dark:bg-black dark:text-zinc-500"
            placeholder="Search files (coming soon)…"
            disabled
          />

          <a
            href="/upload"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            Go to Upload
          </a>
        </section>

        {/* file */}
        <section className="mt-8 w-full rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-100">
              File list
            </span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Coming soon
            </span>
          </div>
          <p className="text-xs leading-5">
            Here you will see files stored in your S3 bucket: name, size, last
            modified, and actions (preview / delete / share).
          </p>
          <div className="mt-4 grid gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </section>

        {/* recent */}
        <section className="mt-8 w-full rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-100">
              Recent activity
            </span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Placeholder
            </span>
          </div>
          <p className="text-xs leading-5">
            This section will show recent uploads, deletions, or other activity
            in your account.
          </p>
          <div className="mt-4 space-y-2 text-xs text-zinc-400 dark:text-zinc-500">
            <div className="h-4 w-3/4 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-1/2 rounded-full bg-zinc-100 dark:bg-zinc-900" />
            <div className="h-4 w-2/3 rounded-full bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </section>
      </main>
    </div>
  );
}
