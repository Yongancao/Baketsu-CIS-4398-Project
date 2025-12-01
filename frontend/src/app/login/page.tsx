// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }
      const data = await res.json();
      // Store JWT (MVP: localStorage)
      localStorage.setItem("access_token", data.access_token);
      // Redirect to protected upload page
      router.push("/upload");
    } catch (err: any) {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black dark:text-white">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-[#151516] p-8 rounded-2xl shadow-md border"
      >
        <h1 className="text-2xl font-bold mb-4">Login</h1>

        <input
          type="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="border p-2 w-64 mb-3 rounded-lg"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border p-2 w-64 mb-3 rounded-lg"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-[#4267B2] text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

  {error && <p className="text-red-500 mt-2">{error}</p>}
  <p className="text-xs mt-4 text-gray-500"></p>
      </form>
    </div>
  );
}
