"use client";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="fixed z-50 w-full flex items-center gap-10 pb-2 pt-2 bg-white dark:bg-[#151516] text-black dark:text-white">

            <div className="flex pl-15 pr-15 pt-2 pb-2 text-3xl font-semibold tracking-tight">
                <p> Baketsu </p>
            </div>
            <div className="flex gap-10">
                <Link href="/"> Home </Link>
                <Link href="/about-us"> About Us </Link>
            </div> 
            <div>
                <Link href="/"> Login </Link>
            </div>
        </nav>
    )
}