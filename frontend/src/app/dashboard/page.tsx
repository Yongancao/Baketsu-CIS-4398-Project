"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import ProtectedPage from "@/components/ProtectedPage";


export default function DashboardPage() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.username) setUser(data);
        else setMessage("❌ Invalid or expired token.");
      })
      .catch(() => setMessage("⚠️ Error fetching user info."));
    }, []);

  return (
    <ProtectedPage>
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-[#151516] text-black dark:text-white">
        {/* Status messages and loading logic inside ProtectedPage */}
        {message ? (
          <p className="text-center mt-20">{message}</p>
        ) : !user ? (
          <p className="text-center mt-20">Loading...</p>
        ) : (
          <>
            <h1 className="text-3xl font-semibold mb-4">
              Welcome, {user.username}!
            </h1>
            <div className="flex flex-col space-y-4 items-center">
              <Link
                href="/upload"
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Go to Uploads
              </Link>
            </div>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
