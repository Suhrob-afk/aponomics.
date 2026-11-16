import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamSession } from "@/components/practice/ExamSession";
import { isCourseId } from "@/lib/practice/courses";

export const metadata: Metadata = {
  title: "Practice session | aponomics",
  robots: { index: false, follow: false },
};

export default async function SessionPage({
  params,
}: {
  params: Promise<{ course: string; sessionId: string }>;
}) {
  const { course, sessionId } = await params;
  if (!isCourseId(course) || !/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  return <ExamSession course={course} sessionId={sessionId} />;
}
