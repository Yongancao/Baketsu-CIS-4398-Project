"use client";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStatus();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for initial localStorage check
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [router]);

  // While checking, show a loader or message
  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        Checking authentication...
      </div>
    );
  }

  // If logged in, show content
  return <>{children}</>;
}
