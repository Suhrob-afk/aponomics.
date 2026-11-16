import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Dashboard } from "@/components/practice/Dashboard";

export const metadata: Metadata = {
  title: "Your practice progress | aponomics",
  description: "Accuracy by unit, weakest topics, mock scores over time, and your practice streak.",
  robots: { index: false, follow: true },
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <nav aria-label="Breadcrumb" className="text-[14px] text-[#5F5A4E]">
        <Link href="/practice" className="hover:text-[#1A1A1A]">Practice</Link>
        <ChevronRight className="mx-1 inline h-3.5 w-3.5" aria-hidden />
        <span aria-current="page">Your progress</span>
      </nav>
      <h1 className="mt-4 font-serif text-4xl tracking-tight md:text-5xl">Your progress</h1>
      <Dashboard />
    </main>
  );
}
