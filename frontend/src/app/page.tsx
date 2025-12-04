import Image from "next/image";

import CloudImage from "@/components/cloud-photo";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">

        <div className="flex gap-10">
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Your Personal Cloud Storage Solution
            </h1>
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-300">
              With Baketsu's flexible storage plan you pay for exactly how much storage you use
            </p>
          </div>
          <div>
            <CloudImage/>
          </div>
        </div>
        <div className="mt-10"> 
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50"> 
            Mission
          </h1>
          <p className="mt-3 max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Existing options like Apple iCloud make you pay for data in tiers <br/> 
            You tend to pay for more than you need <br/> 
            Baketsu revolutionizes this
          </p>
        </div>
        <div className="mt-10"> 
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50"> 
            Pricing Per Month
          </h1>
          <p className="mt-3 max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            First 50 TB $0.023 Per GB <br/> 
            Next 450 TB $0.022 Per GB <br/> 
            Over 500 TB $0.021 Per GB <br/>
          </p>
        </div>
      

      </main>
    </div>
  );
}
