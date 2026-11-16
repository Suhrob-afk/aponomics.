"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PracticeFooter() {
  const pathname = usePathname();
  if (/^\/practice\/(micro|macro)\/session\//.test(pathname ?? "")) return null;
  return (
    <footer className="mt-20 border-t border-[#D6D0C4]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-[13px] leading-relaxed text-[#5F5A4E] md:flex-row md:items-center md:justify-between">
        <p>
          AP® is a trademark registered by the College Board, which is not affiliated with and does not endorse this site.
        </p>
        <nav aria-label="Practice" className="flex shrink-0 gap-5">
          <Link href="/practice" className="hover:text-[#1A1A1A]">Practice home</Link>
          <Link href="/practice/dashboard" className="hover:text-[#1A1A1A]">Your progress</Link>
        </nav>
      </div>
    </footer>
  );
}
