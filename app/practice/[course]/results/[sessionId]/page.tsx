import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Results } from "@/components/practice/Results";
import { isCourseId } from "@/lib/practice/courses";

export const metadata: Metadata = {
  title: "Practice results | aponomics",
  robots: { index: false, follow: false },
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ course: string; sessionId: string }>;
}) {
  const { course, sessionId } = await params;
  if (!isCourseId(course) || !/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  return <Results course={course} sessionId={sessionId} />;
}
