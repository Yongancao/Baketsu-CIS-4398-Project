"use client";
import Link from "next/link";

import Logo from "./logo";
import DarkModeToggle from "./DarkModeToggle";

export default function Navbar() {
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
                <Link href="/about-us" className="hover:underline"> About </Link>
                <Link href="/pricing" className="hover:underline"> Pricing </Link>
            </div> 
            <div className="flex">
                <Link href="/register" className="hover:underline"> Register </Link>
                <p> / </p>
                <Link href="/login" className="hover:underline"> Login </Link>
            </div>
            <DarkModeToggle/>
        </nav>
    )
}