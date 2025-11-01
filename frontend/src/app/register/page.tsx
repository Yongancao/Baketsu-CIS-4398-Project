// app/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Invalid credentials");
      return;
    }

    const data = await res.json();
    console.log("✅ Login successful:", data);

    localStorage.setItem("token", data.access_token);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-[#151516] p-8 rounded-2xl shadow-md"
      >
        <h1 className="text-2xl font-bold mb-4">Register</h1>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2 w-64 mb-3 rounded"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border p-2 w-64 mb-3 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Register
        </button>

        {error && <p className="text-red-500 mt-2">{error}</p>}
      </form>
    </div>
  );
}
