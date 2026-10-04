"use client";
// Teachers: who teaches what, homeroom classes, and whether they can sign in.
import { useState } from "react";
import { useApp } from "@/lib/data/app-context";
import { className, subjectName } from "@/lib/domain/insights";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/icons";
import { Avatar, Empty, PageHeader } from "@/components/ui";
import { AddPerson } from "@/components/admin/people-forms";

export default function Teachers() {
  const { data } = useApp();
  const { t, locale } = useI18n();
  const [adding, setAdding] = useState(false);
  if (data.me.role !== "admin") return <Empty text={t("admin.noAccess")} />;
  const teachers = [...data.teachers].sort((a, b) => a.full_name.localeCompare(b.full_name));
  return (
    <>
      <PageHeader title={t("nav.teachers")} action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setAdding(true)} data-tour="add-teacher"><Icon name="plus" size={18} />{t("admin.addTeacher")}</button>} />
      <ul className="grid gap-3 md:grid-cols-2">
        {teachers.map((te) => {
          const cs = data.classSubjects.filter((c) => c.teacher_id === te.id);
          const subjects = [...new Set(cs.map((c) => subjectName(data, c.subject_id, locale)))];
          const classes = [...new Set(cs.map((c) => className(data, c.class_id)))];
          const homeroom = data.classes.filter((c) => c.homeroom_teacher_id === te.id);
          return (
            <li key={te.id} className="card flex min-w-0 gap-3 p-4">
              <Avatar name={te.full_name} size={42} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{te.full_name}</span>
                  <span className={`badge ${te.profile_id ? "badge-good" : "badge-muted"}`}>{te.profile_id ? t("admin.hasLogin") : t("admin.noLogin")}</span>
                </div>
                {(te.email || te.phone) && <div className="muted truncate text-xs">{[te.email, te.phone].filter(Boolean).join(" · ")}</div>}
                <div className="mt-2 text-sm"><span className="muted">{t("admin.teaches")}:</span> {subjects.join(", ") || "—"}</div>
                <div className="text-sm"><span className="muted">{t("admin.classesTaught")}:</span> {classes.join(", ") || "—"}</div>
                {homeroom.length > 0 && <div className="mt-1"><span className="badge badge-info">{t("admin.homeroomOf", { cls: homeroom.map((c) => className(data, c.id)).join(", ") })}</span></div>}
              </div>
            </li>
          );
        })}
      </ul>
      {adding && <AddPerson kind="teacher" onClose={() => setAdding(false)} />}
    </>
  );
}
