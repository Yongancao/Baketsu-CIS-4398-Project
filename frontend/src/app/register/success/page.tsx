"use client";

import Link from "next/link";

export default function RegistrationSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-black dark:text-white">
      <div className="bg-white dark:bg-[#151516] p-8 rounded-2xl shadow-md border max-w-md text-center">
        
        <h1 className="text-3xl font-bold mb-4">Registration Successful 🎉</h1>

        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Your account has been created.  
          <br />
          Please check your email for the verification link to activate your account.
        </p>

        <Link
          href="/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}