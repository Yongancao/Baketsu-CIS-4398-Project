"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "@/components/ProtectedPage";

export default function DashboardPage() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [message, setMessage] = useState("");
  const [totalFiles, setTotalFiles] = useState<number | null>(null);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const [actualCost, setActualCost] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);

  // Convert raw bytes → human-readable string
  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // 1️⃣ Fetch user info
    fetch("http://127.0.0.1:8000/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setUser(data);
        else setMessage("❌ Invalid or expired token.");
      })
      .catch(() => setMessage("⚠️ Error fetching user info."));

    // 2️⃣ Fetch storage stats
    fetch("http://127.0.0.1:8000/storage", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((stats) => {
        setTotalFiles(stats.total_files);
        setTotalBytes(stats.total_bytes);
      })
      .catch(() => setMessage("⚠️ Error loading storage statistics."));

    fetch("http://127.0.0.1:8000/files/billing", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("BILLING RESPONSE:", data);

        setActualCost(data.actual_cost ?? 0);
        setEstimatedCost(data.estimated_cost ?? 0);
      })
      .catch(() => setMessage("⚠️ Error loading billing statistics."));

  }, []);

  return (
    <ProtectedPage>
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-[#151516] text-black dark:text-white">

        {/* Loading + Errors */}
        {message ? (
          <p className="text-center mt-20">{message}</p>
        ) : !user ? (
          <p className="text-center mt-20">Loading...</p>
        ) : (
          <>
            {/* Header */}
            <h1 className="text-3xl font-semibold mb-4">
              Welcome, {user.name}!
            </h1>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              <div className="p-6 rounded-xl border shadow dark:border-gray-700 dark:bg-[#1d1d1d]">
                <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  Total Files
                </h2>
                <p className="text-4xl font-bold mt-2">
                  {totalFiles !== null ? totalFiles : "—"}
                </p>
              </div>

              <div className="p-6 rounded-xl border shadow dark:border-gray-700 dark:bg-[#1d1d1d]">
                <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  Storage Used
                </h2>
                <p className="text-4xl font-bold mt-2">
                  {totalBytes !== null ? formatBytes(totalBytes) : "—"}
                </p>
              </div>

              <div className="p-6 rounded-xl border shadow dark:border-gray-700 dark:bg-[#1d1d1d]">
                <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  Actual Cost
                </h2>
                <p className="text-4xl font-bold mt-2">
                  {typeof actualCost === "number"
                    ? `$${actualCost.toFixed(10)}`
                    : "—"}
                </p>
              </div>

              <div className="p-6 rounded-xl border shadow dark:border-gray-700 dark:bg-[#1d1d1d]">
                <h2 className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  Estimated Pricing
                </h2>
                <p className="text-4xl font-bold mt-2">
                  {typeof estimatedCost === "number"
                    ? `$${estimatedCost.toFixed(10)}`
                    : "—"}
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-4 items-center mt-10">
              <Link
                href="/upload"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Go to Uploads
              </Link>

              <Link
                href="/files"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Manage Your Files
              </Link>
            </div>

          </>
        )}
      </div>
    </ProtectedPage>
  );
}
