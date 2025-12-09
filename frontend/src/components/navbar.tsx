"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import Logo from "./logo";
import DarkModeToggle from "./DarkModeToggle";
import { useAuthStatus } from "@/hooks/useAuthStatus";

export default function Navbar() {
    const {isLoggedIn, logout} = useAuthStatus();

    return (
        <nav className="fixed z-50 w-full flex items-center pb-2 pt-2 bg-white dark:bg-[#151516] text-black dark:text-white justify-between">

            <div className="flex items-center gap-7 pl-10 pr-15 pt-2 pb-2 ">
                
                <Link href="/" className="flex gap-4 items-center text-3xl font-semibold tracking-tight">
                    <Logo/>
                    Baketsu 
                </Link>
                            
            </div> 
            {isLoggedIn ? (
                <>
                    <Link href="/" className="hover:underline"> Home </Link>    
                    <Link href="/upload" className="hover:underline"> Upload </Link>
                    <Link href="/dashboard" className="hover:underline"> Dashboard </Link>
                    <Link href="/files" className="hover:underline"> Files </Link>
                    <Link href="/billing" className="hover:underline"> Billing </Link>
                    <button onClick={logout} className="hover:text-red-500">
                        Logout
                    </button>
                    <div className="pl-10 pr-15"><DarkModeToggle/></div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-10">
                        <Link href="/register" className="hover:underline"> Register </Link>
                        <Link href="/login" className="hover:underline"> Login </Link>
                        <div className="pl-5 pr-15"><DarkModeToggle/></div>
                    </div>
                </>
            )}
        </nav>
    )
}