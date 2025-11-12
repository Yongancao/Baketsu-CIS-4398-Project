import Image from "next/image";
import CloudImage from "@/components/cloud-photo";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        <div className="flex gap-10">
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Your Personal Cloud Storage Solution
            </h1>
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Flexible storage options <br />
              Never pay more than you use
            </p>
          </div>
          <div>
            <CloudImage />
          </div>
        </div>

        {/* Feature Cards Section */}
        <section className="mt-20 w-full grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Secure Storage
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Files stored on AWS S3 with industry-standard encryption.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Pay Only What You Use
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Pricing scales with your actual storage consumption.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">
              Fast Uploads
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Optimized upload speeds powered by AWS infrastructure.
            </p>
          </div>
        
        </section>

      </main>
    </div>
  );
}
