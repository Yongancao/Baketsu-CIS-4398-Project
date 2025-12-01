"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthStatus() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLoggedIn(!!token);

    const handleStorage = () => {
      const token = localStorage.getItem("access_token");
      setIsLoggedIn(!!token);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = (token: string) => {
    localStorage.setItem("access_token", token);
    setIsLoggedIn(true);
    window.dispatchEvent(new Event("storage"));
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("storage"));
    router.push("/");
  };

  return { isLoggedIn, login, logout };
}
