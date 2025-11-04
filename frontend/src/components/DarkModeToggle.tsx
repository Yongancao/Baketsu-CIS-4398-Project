'use client';
import { useTheme } from '@/app/context/ThemeContext';
import Image from "next/image";

export default function DarkModeToggle() {

  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <label className="relative flex items-center justify-between w-16 h-8 px-2 bg-gray-300 dark:bg-gray-700 rounded-full cursor-pointer">
      {/* Light mode icon */}
      <Image
        src="/home/lightmode.svg"
        alt="Light mode"
        width={20}
        height={20}
      />
      {/* Hidden checkbox (control) */}
      <input
        type="checkbox"
        className="sr-only peer"
        onClick={toggleTheme}
        checked={isDark}
        onChange={() => {}}
      />
    {/* Dark mode icon */}
      <Image
        src="/home/darkmode.svg"
        alt="Dark mode"
        width={20}
        height={20}
      />
      {/* Toggle circle */}
      <span className="absolute top-1 left-1 w-6 h-6 bg-white dark:bg-black rounded-full shadow-md transform transition-transform duration-300 peer-checked:translate-x-8" />
    </label>
  );
}
