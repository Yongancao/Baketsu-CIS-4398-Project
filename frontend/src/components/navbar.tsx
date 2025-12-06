"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import Logo from "./logo";
import DarkModeToggle from "./DarkModeToggle";
import { useAuthStatus } from "@/hooks/useAuthStatus";

export default function Navbar() {
    const {isLoggedIn, logout} = useAuthStatus();

    return (
        <nav className="fixed z-50 w-full flex items-center gap-10 pb-2 pt-2 bg-white dark:bg-[#151516] text-black dark:text-white">

            <div className="flex pl-15 pr-15 pt-2 pb-2 text-3xl font-semibold tracking-tight">
                
                <Link href="/" className="flex items-center">
                    <Logo/>
                    Baketsu 
                </Link>
            </div>
            <div className="flex gap-10">
                <Link href="/" className="hover:underline"> Home </Link>                
            </div> 
            {isLoggedIn ? (
                <>
                    <Link href="/upload" className="hover:underline"> Upload </Link>
                    <Link href="/dashboard" className="hover:underline"> Dashboard </Link>
                    <Link href="/files" className="hover:underline"> Files </Link>
                    <button onClick={logout} className="hover:text-red-500">
                        Logout
                    </button>
                </>
            ) : (
                <>
                    <div className="flex">
                        <Link href="/register" className="hover:underline"> Register </Link>
                        <p> / </p>
                        <Link href="/login" className="hover:underline"> Login </Link>
                    </div>
                </>
            )}
            <DarkModeToggle/>
        </nav>
    )
}