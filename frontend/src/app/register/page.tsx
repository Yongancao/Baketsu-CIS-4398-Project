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
  const [loading, setLoading] = useState(false);

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
      let message = "Registration failed. Please try again.";

      if (Array.isArray(data.detail)) {
        message = data.detail[0]?.msg || message;
      }
      else if (typeof data.detail === "string") {
        message = data.detail;
      }

      setError(message);
      setLoading(false);
      return;
    }


    console.log("✅ Registration Successful:", data);

    router.push("/register/success");

  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black dark:text-white">

      {loading ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 flex justify-center">
            Creating your account
            <span className="animate-ellipsis ml-1"></span>
          </h1>
          <p className="text-gray-500">Please wait</p>
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
