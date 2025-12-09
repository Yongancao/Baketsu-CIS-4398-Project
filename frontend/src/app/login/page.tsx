"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStatus } from "@/hooks/useAuthStatus";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthStatus();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      });

      if (!res.ok) {
        const errData = await res.json();

        if (res.status === 403) {
          setError(
            "Your email is not verified. Please check your inbox for a verification link."
          );
        } else {
          setError(errData.detail || "Invalid credentials");
        }
        return;
      }

      const data = await res.json();

      // Store JWT (MVP)
      login(data.access_token);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black dark:text-white">
      <form
        onSubmit={handleLogin}
        className="flex flex-col bg-white dark:bg-[#151516] p-8 rounded-2xl shadow-md border"
      >
        <h1 className="text-2xl font-bold mb-4">Login</h1>

        {/* Email */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2 m-2 w-64 mb-3 rounded-lg"
        />

        {/* Password */}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border p-2 m-2 w-64 mb-3 rounded-lg"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-[#4267B2] text-white px-4 py-2 m-2 rounded-lg hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
    </div>
  );
}
