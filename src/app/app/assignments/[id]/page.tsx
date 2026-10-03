"use client";
import { useParams } from "next/navigation";
import { AssessmentDetail } from "@/components/work/assessment-detail";

export default function AssessmentPage() {
  const { id } = useParams<{ id: string }>();
  return <AssessmentDetail key={id} id={id} />;
}
