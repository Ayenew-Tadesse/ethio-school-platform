"use client";
import { Suspense } from "react";
import { AssessmentForm } from "@/components/work/assessment-form";
import { TeacherOnly } from "@/components/work/teacher-only";

export default function NewPage() {
  return <TeacherOnly><Suspense><AssessmentForm mode="exam" /></Suspense></TeacherOnly>;
}
