"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // ⬅️ NEW

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        confirm_password: confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.detail || "Registration failed. Please try again.");
      setLoading(false);
      return;
    }

    console.log("✅ Registration Successful:", data);

    setTimeout(() => {
      router.push("/register/success");
    }, 300);

  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black dark:text-white">

      {loading ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 flex justify-center">
            Creating your account
            <span className="ellipsis ml-1"></span>
          </h1>
          <p className="text-gray-500">Please wait</p>

          {/* Inline CSS animation */}
          <style jsx>{`
            @keyframes dots {
              0% { content: "."; }
              33% { content: ".."; }
              66% { content: "..."; }
            }

            .ellipsis::after {
              content: ".";
              animation: dots 1s infinite steps(1);
            }
          `}</style>
        </div>
      ) : (
        // Normal form
        <form
          onSubmit={handleRegister}
          className="flex flex-col bg-white dark:bg-[#151516] p-8 rounded-2xl shadow-md border"
        >
          <h1 className="text-2xl font-bold mb-4">Register</h1>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="border p-2 m-2 w-64 mb-3 rounded-lg"
          />

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="border p-2 m-2 w-64 mb-3 rounded-lg"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="border p-2 m-2 w-64 mb-3 rounded-lg"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="border p-2 m-2 w-64 mb-3 rounded-lg"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-[#4267B2] text-white px-4 py-2 m-2 rounded-lg hover:bg-gray-800 hover:cursor-pointer disabled:opacity-50"
          >
            Register
          </button>

          {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
      )}

    </div>
  );
}
