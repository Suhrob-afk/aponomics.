import type { Metadata } from "next";
import { AdminPractice } from "@/components/practice/admin/AdminPractice";

export const metadata: Metadata = {
  title: "Practice admin | aponomics",
  robots: { index: false, follow: false },
};

export default function AdminPracticePage() {
  return <AdminPractice />;
}
