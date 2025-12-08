import Link from "next/link";
import CloudImage from "@/components/cloud-photo";

function PricingItem({ label, price }: { label: string, price: string }) {
  return (
    <li className="flex justify-between items-center border-b border-gray-200 dark:border-zinc-700 pb-2 last:border-0">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <div className="text-right">
        <span className="font-bold text-gray-900 dark:text-white text-lg">{price}</span>
        <span className="text-xs text-gray-500 ml-1">/ GB</span>
      </div>
    </li>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white dark:bg-black pt-32 pb-12 transition-colors">
      <main className="w-full max-w-6xl px-6 md:px-12">

        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12 mb-24">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
              Your Personal <br/>
              <span className="text-blue-600 dark:text-blue-500">Cloud Storage</span> Solution
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              With Baketsu&apos;s flexible storage plan, you pay for exactly how much storage you use. Stop paying for tiers you don&apos;t need.
            </p>
            
            {/* goto */}
            <div className="flex gap-4 mt-2">
              <Link 
                href="/register" 
                className="px-8 py-3.5 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
              >
                Get Started
              </Link>
              <Link 
                href="/login" 
                className="px-8 py-3.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition border border-transparent dark:border-zinc-700"
              >
                Login
              </Link>
            </div>
          </div>
          
          <div className="shrink-0 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/20 blur-3xl rounded-full -z-10" />
            <CloudImage/>
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-24">
          
          {/* Mission Card */}
          <div className="bg-gray-50 dark:bg-[#151516] p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 hover:border-blue-500/50 transition duration-300"> 
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-2xl">
              🚀
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white"> 
              Our Mission
            </h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>Existing options like Apple iCloud make you pay for data in fixed tiers.</p>
              <p>You tend to pay for more than you need.</p>
              <p className="font-medium text-gray-900 dark:text-gray-200 pt-2">
                Baketsu revolutionizes this by charging only for what you store.
              </p>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-gray-50 dark:bg-[#151516] p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 hover:border-green-500/50 transition duration-300"> 
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 text-2xl">
              💰
            </div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white"> 
              Pricing Per Month
            </h2>
            <ul className="space-y-4 mt-2">
              <PricingItem label="First 50 TB" price="$0.023" />
              <PricingItem label="Next 450 TB" price="$0.022" />
              <PricingItem label="Over 500 TB" price="$0.021" />
            </ul>
            <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
              * Prices are calculated per GB. No hidden fees.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
