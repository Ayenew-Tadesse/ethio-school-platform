"use client";
import { useApp } from "@/lib/data/app-context";
import { AdminDashboard } from "@/components/dash/admin";
import { TeacherDashboard } from "@/components/dash/teacher";
import { StudentDashboard } from "@/components/dash/student";
import { ParentDashboard } from "@/components/dash/parent";

export default function Dashboard() {
  const { data } = useApp();
  switch (data.me.role) {
    case "admin": return <AdminDashboard />;
    case "teacher": return <TeacherDashboard />;
    case "student": return <StudentDashboard />;
    case "parent": return <ParentDashboard />;
  }
}
