import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseHome } from "@/components/practice/CourseHome";
import { COURSES, COURSE_IDS, isCourseId } from "@/lib/practice/courses";

export function generateStaticParams() {
  return COURSE_IDS.map((course) => ({ course }));
}

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }): Promise<Metadata> {
  const { course } = await params;
  if (!isCourseId(course)) return {};
  const c = COURSES[course];
  return {
    title: `${c.title} Practice | aponomics`,
    description: `Free, original ${c.title} multiple-choice practice: by unit with explanations, a timed 60-question mock, and review of your mistakes.`,
  };
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  if (!isCourseId(course)) notFound();
  return <CourseHome course={course} />;
}
