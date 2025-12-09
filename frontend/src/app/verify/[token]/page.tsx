"use client";

import { use, useEffect, useState } from "react";

export default function VerifyPage(props: { params: Promise<{ token: string }> }) {
    const { token } = use(props.params);

    const [status, setStatus] = useState("Verifying...");

    useEffect(() => {
        async function verify() {
            try {
                const res = await fetch(`http://127.0.0.1:8000/auth/verify/${token}`);
                if (!res.ok) {
                    setStatus("❌ Invalid or expired verification link.");
                    return;
                }
                setStatus("✅ Email verified! You may now log in.");
            } catch {
                setStatus("⚠️ Verification failed.");
            }
        }

        verify();
    }, [token]);

    return (
        <div className="flex justify-center items-center min-h-screen">
            <p className="text-xl dark:text-white text-black">{status}</p>
        </div>
    );
}
