// Addis Future Academy: the demo school. Generated (deterministically) around
// "today", so dashboards always look alive: recent attendance, past and
// upcoming work, scores, a library, announcements and messages. All people
// are fictional. The same data seeds a real Supabase project (scripts/seed.ts).
import type {
  AcademicYear, Announcement, Assessment, AssessmentFile, AssessmentKind, Attendance, AttendanceStatus, ClassRow, ClassSubject, GradeLevel,
  GradingComponent, Message, Notification, Parent, ParentStudent, Profile, Resource, School, Score, Student, Subject, Submission,
  Teacher, Term,
} from "../domain/types";

export interface World {
  school: School; profiles: Profile[]; years: AcademicYear[]; terms: Term[]; gradeLevels: GradeLevel[]; subjects: Subject[];
  weights: GradingComponent[]; teachers: Teacher[]; classes: ClassRow[]; students: Student[]; parents: Parent[];
  parentStudents: ParentStudent[]; classSubjects: ClassSubject[]; attendance: Attendance[]; assessments: Assessment[]; assessmentFiles: AssessmentFile[];
  submissions: Submission[]; scores: Score[]; resources: Resource[]; announcements: Announcement[]; messages: Message[];
  notifications: Notification[];
  /** Demo logins: email → profile id (passwords are documented in README, demo only). */
  accounts: { email: string; profile_id: string; role: Profile["role"]; label: string }[];
}

/** The password for every demo account (demo only, fictional data; documented in README). */
export const DEMO_PASSWORD = "Demo@2026";

// Small deterministic random generator (same demo every time).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
let counter = 0;
const id = (prefix: string) => `${prefix.padEnd(8, "0").slice(0, 8)}-0000-4000-8000-${String(++counter).padStart(12, "0")}`;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => { const d = new Date(day + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const weekday = (day: string) => new Date(day + "T00:00:00Z").getUTCDay(); // 0 Sun … 6 Sat
/** School days (Mon–Fri) going back from today (exclusive of weekends), newest first. */
function schoolDaysBefore(today: string, n: number): string[] {
  const out: string[] = [];
  for (let d = today; out.length < n; d = addDays(d, -1)) if (weekday(d) >= 1 && weekday(d) <= 5) out.push(d);
  return out;
}

const FIRST_F = ["Liya", "Hanna", "Meklit", "Bethlehem", "Selam", "Ruth", "Saron", "Tsion", "Mahlet", "Eden", "Kidist", "Yordanos", "Nardos", "Hiwot", "Lidya"];
const FIRST_M = ["Abenezer", "Natnael", "Yonatan", "Kaleb", "Dawit", "Biniam", "Robel", "Henok", "Mikiyas", "Eyob", "Samuel", "Yared", "Nahom", "Fitsum", "Bereket"];
const FATHERS = ["Getachew", "Alemu", "Bekele", "Tesfaye", "Girma", "Haile", "Desta", "Mulugeta", "Abebe", "Kebede", "Tadesse", "Wolde", "Ayele", "Mekonnen", "Negash", "Asfaw", "Gebre", "Lemma", "Yohannes", "Demissie"];

export function buildWorld(today = iso(new Date())): World {
  counter = 0;
  const r = rng(20261003);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const now = new Date(today + "T09:00:00Z").toISOString();

  const school: School = {
    id: "5c400000-0000-4000-8000-000000000001", name: "Addis Future Academy", city: "Addis Ababa", region: "Addis Ababa",
    phone: "+251 11 000 0000", email: "info@addisfuture.example", address: "Bole Sub-city, Addis Ababa",
    default_language: "en", passing_score: 50, attention_threshold: 55, late_counts_as_present: true, attendance_edit_days: 7,
    messaging: { parent_teacher: true, teacher_parent: true, teacher_student: true, student_teacher: true },
  };
  const S = school.id;
  // The Ethiopian school year runs roughly September to July; terms are two semesters (configurable).
  const y0 = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 9 ? 1 : 0);
  const year: AcademicYear = { id: id("ac"), school_id: S, name: `${y0 - 7} E.C. (${y0}/${String(y0 + 1).slice(2)})`, starts_on: `${y0}-09-11`, ends_on: `${y0 + 1}-07-07`, is_current: true };
  const terms: Term[] = [
    { id: id("te"), school_id: S, academic_year_id: year.id, name: "Semester 1", ordinal: 1, starts_on: `${y0}-09-11`, ends_on: `${y0 + 1}-01-31` },
    { id: id("te"), school_id: S, academic_year_id: year.id, name: "Semester 2", ordinal: 2, starts_on: `${y0 + 1}-02-01`, ends_on: `${y0 + 1}-07-07` },
  ];
  const termFor = (day: string) => (terms.find((t) => day >= t.starts_on && day <= t.ends_on) ?? terms[0]).id;
  const gradeLevels: GradeLevel[] = Array.from({ length: 12 }, (_, i) => ({ id: id("g" + (i + 1)), school_id: S, level: i + 1, name: `Grade ${i + 1}` }));
  const grade = (n: number) => gradeLevels[n - 1];
  const subj = (name: string, name_am: string, code: string): Subject => ({ id: id("su"), school_id: S, name, name_am, code });
  const subjects = [
    subj("Mathematics", "ሂሳብ", "MATH"), subj("English", "እንግሊዝኛ", "ENG"), subj("Amharic", "አማርኛ", "AMH"), subj("General Science", "አጠቃላይ ሳይንስ", "SCI"),
    subj("Biology", "ባዮሎጂ", "BIO"), subj("Chemistry", "ኬሚስትሪ", "CHEM"), subj("Physics", "ፊዚክስ", "PHY"), subj("Social Studies", "ማህበራዊ ሳይንስ", "SOC"),
    subj("Citizenship Education", "የዜግነት ትምህርት", "CIV"), subj("ICT", "አይሲቲ", "ICT"),
  ];
  const sub = (name: string) => subjects.find((s) => s.name === name)!;
  const weights: GradingComponent[] = [
    { school_id: S, kind: "homework", weight: 10 }, { school_id: S, kind: "assignment", weight: 20 }, { school_id: S, kind: "quiz", weight: 20 },
    { school_id: S, kind: "midterm", weight: 20 }, { school_id: S, kind: "final", weight: 30 },
  ];

  const profiles: Profile[] = [];
  const accounts: World["accounts"] = [];
  const profile = (role: Profile["role"], full_name: string, email?: string, label?: string, extra: Partial<Profile> = {}) => {
    const p: Profile = { id: id("pr"), school_id: S, role, full_name, phone: null, preferred_language: "en", is_owner: false, admin_permissions: {}, ...extra };
    profiles.push(p);
    if (email) accounts.push({ email, profile_id: p.id, role, label: label ?? role });
    return p;
  };
  const admin = profile("admin", "Tigist Worku", "admin@example.com", "Administrator", { is_owner: true });

  const teacherDefs: [string, string, string[]][] = [
    ["Meron Alemu", "teacher@example.com", ["Mathematics"]],
    ["Dawit Bekele", "dawit.teacher@example.com", ["English"]],
    ["Hanna Tesfaye", "hanna.teacher@example.com", ["General Science", "Biology"]],
    ["Yonas Girma", "yonas.teacher@example.com", ["Amharic", "Citizenship Education"]],
    ["Selam Haile", "selam.teacher@example.com", ["Social Studies", "ICT"]],
  ];
  const teachers: Teacher[] = teacherDefs.map(([name, email], i) => {
    const p = profile("teacher", name, email, i === 0 ? "Teacher (Mathematics)" : undefined);
    return { id: id("tc"), school_id: S, profile_id: p.id, full_name: name, email, phone: `+251 91 100 00${String(i + 1).padStart(2, "0")}`, staff_no: `T-${101 + i}` };
  });
  const teacherFor = (subject: string) => teachers[teacherDefs.findIndex(([, , subs]) => subs.includes(subject))];

  const mkClass = (g: number, section: string, homeroom: Teacher): ClassRow =>
    ({ id: id("cl"), school_id: S, academic_year_id: year.id, grade_level_id: grade(g).id, section, homeroom_teacher_id: homeroom.id });
  const classes = [mkClass(8, "A", teachers[0]), mkClass(8, "B", teachers[1]), mkClass(5, "B", teachers[3]), mkClass(10, "A", teachers[2])];
  const [c8A, c8B, c5B, c10A] = classes;
  const curriculum: Record<string, string[]> = {
    [c8A.id]: ["Mathematics", "English", "Amharic", "General Science", "Social Studies", "Citizenship Education"],
    [c8B.id]: ["Mathematics", "English", "Amharic", "General Science", "Social Studies"],
    [c5B.id]: ["Mathematics", "English", "Amharic", "General Science"],
    [c10A.id]: ["Mathematics", "English", "Biology", "ICT", "Citizenship Education"],
  };
  const classSubjects: ClassSubject[] = classes.flatMap((c) => curriculum[c.id].map((name) =>
    ({ id: id("cs"), school_id: S, class_id: c.id, subject_id: sub(name).id, teacher_id: teacherFor(name).id })));

  // 30 students: 10 in 8A, 8 in 8B, 6 in 5B, 6 in 10A. The demo student is Liya (8A).
  const students: Student[] = [];
  const studentProfiles = new Map<string, string>();
  const plan: [ClassRow, number][] = [[c8A, 10], [c8B, 8], [c5B, 6], [c10A, 6]];
  let n = 0;
  for (const [cls, count] of plan) {
    for (let i = 0; i < count; i++) {
      n++;
      const female = n === 1 || r() < 0.5;
      const first = n === 1 ? "Liya" : n === 19 ? "Natnael" : pick(female ? FIRST_F : FIRST_M);
      const last = n === 1 || n === 19 ? "Getachew" : FATHERS[(n * 7) % FATHERS.length];
      const full = `${first} ${last}`;
      const p = n === 1 ? profile("student", full, "student@example.com", "Student (Grade 8A)")
        : r() < 0.6 ? profile("student", full) : null; // not every student has a login yet
      const st: Student = { id: id("st"), school_id: S, profile_id: p?.id ?? null, class_id: cls.id, full_name: full,
        student_no: `AFA-${String(n).padStart(4, "0")}`, gender: n === 19 ? "M" : female ? "F" : "M", date_of_birth: null };
      students.push(st);
      if (p) studentProfiles.set(st.id, p.id);
    }
  }
  // 20 parents. The demo parent has two children: Liya (8A) and Natnael (5B).
  const parents: Parent[] = [];
  const parentStudents: ParentStudent[] = [];
  const demoParent = profile("parent", "Getachew Mulugeta", "parent@example.com", "Parent (2 children)");
  parents.push({ id: id("pa"), school_id: S, profile_id: demoParent.id, full_name: demoParent.full_name, phone: "+251 91 200 0001", email: "parent@example.com" });
  parentStudents.push({ parent_id: parents[0].id, student_id: students[0].id, relationship: "father" }, { parent_id: parents[0].id, student_id: students[18].id, relationship: "father" });
  const others = students.filter((_, i) => i !== 0 && i !== 18);
  for (let i = 0; i < 19; i++) {
    const child = others[i];
    const mother = r() < 0.55;
    const name = `${pick(mother ? FIRST_F : FIRST_M)} ${child.full_name.split(" ")[1]}`;
    const p = r() < 0.7 ? profile("parent", name) : null;
    const pa: Parent = { id: id("pa"), school_id: S, profile_id: p?.id ?? null, full_name: name, phone: `+251 91 2${String(100000 + i).slice(1)}`, email: null };
    parents.push(pa);
    parentStudents.push({ parent_id: pa.id, student_id: child.id, relationship: mother ? "mother" : "father" });
    if (i < 11 && others[i + 19]) parentStudents.push({ parent_id: pa.id, student_id: others[i + 19].id, relationship: mother ? "mother" : "father" });
  }
  for (const st of students) if (!parentStudents.some((l) => l.student_id === st.id)) parentStudents.push({ parent_id: parents[1].id, student_id: st.id, relationship: "guardian" });

  // How each student tends to do (0.45–0.95), with a few needing attention and one declining.
  const ability = new Map(students.map((s, i) => [s.id, i === 0 ? 0.82 : i === 4 ? 0.48 : 0.55 + r() * 0.4]));
  const declining = students[6].id; // starts strong, falls off

  // Attendance: the last 30 school days for everyone.
  const days = schoolDaysBefore(today, 30).reverse();
  const attendance: Attendance[] = [];
  for (const st of students) for (const day of days) {
    const x = r();
    const weak = st.id === declining && day > days[18] ? 0.25 : 0;
    const status: AttendanceStatus = x < 0.04 + weak ? "absent" : x < 0.09 + weak ? "late" : x < 0.11 ? "excused" : "present";
    attendance.push({ id: id("at"), school_id: S, class_id: st.class_id!, student_id: st.id, date: day, status, note: status === "excused" ? "Family event" : null });
  }

  // Work: per class subject, past graded work and something coming up.
  const assessments: Assessment[] = [];
  const submissions: Submission[] = [];
  const scores: Score[] = [];
  const TITLES: Record<string, string[]> = {
    Mathematics: ["Fractions and decimals", "Linear equations", "Ratios and proportions", "Area and perimeter", "Integers"],
    English: ["Reading comprehension", "Paragraph writing", "Grammar: tenses", "Vocabulary in context", "Book report"],
    Amharic: ["ድርሰት መጻፍ (Essay writing)", "ሰዋስው (Grammar)", "የንባብ ግንዛቤ (Reading)", "ቃላት (Vocabulary)", "ግጥም (Poetry)"],
    "General Science": ["States of matter", "The human body", "Plants and photosynthesis", "Energy around us", "Simple machines"],
    Biology: ["Cell structure", "Genetics basics", "Ecosystems", "Human digestion", "Classification"],
    "Social Studies": ["Map reading", "Regions of Ethiopia", "Ancient Axum", "Population and resources", "Climate zones"],
    "Citizenship Education": ["Rights and responsibilities", "Democracy and participation", "Community service", "The constitution", "Tolerance"],
    ICT: ["Spreadsheets", "Internet safety", "Word processing", "Intro to programming", "Data and files"],
  };
  for (const cs of classSubjects) {
    const subject = subjects.find((s) => s.id === cs.subject_id)!.name;
    const titles = TITLES[subject] ?? ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];
    const pupils = students.filter((s) => s.class_id === cs.class_id);
    const plan: [AssessmentKind, number, number][] = [ // kind, days ago (negative = upcoming), max
      ["homework", 26, 10], ["quiz", 21, 20], ["assignment", 15, 50], ["homework", 9, 10], ["quiz", 5, 20], ["midterm", 2, 100],
    ];
    plan.forEach(([kind, ago, max], i) => {
      const day = addDays(today, -ago);
      const a: Assessment = {
        id: id("as"), school_id: S, class_subject_id: cs.id, term_id: termFor(day), kind,
        title: kind === "midterm" ? `${subject} midterm exam` : `${titles[i % titles.length]}${kind === "quiz" ? " quiz" : ""}`,
        description: kind === "midterm" ? "Covers all units so far." : `Practice on ${titles[i % titles.length].toLowerCase()}.`,
        due_at: kind === "homework" || kind === "assignment" ? `${day}T17:00:00.000Z` : null, scheduled_on: kind === "quiz" || kind === "midterm" ? day : null,
        max_score: max, published: true, published_at: `${addDays(day, -5)}T08:00:00.000Z`, takes_submissions: kind === "homework" || kind === "assignment",
        allow_resubmit: false, created_at: `${addDays(day, -5)}T08:00:00.000Z`,
      };
      assessments.push(a);
      for (const st of pupils) {
        let ab = ability.get(st.id)!;
        if (st.id === declining) ab = i < 3 ? 0.9 : 0.5;
        const skip = a.takes_submissions && r() < 0.08;
        if (a.takes_submissions && !skip) submissions.push({ id: id("sb"), assessment_id: a.id, student_id: st.id, body: "My work is attached.", files: [],
          attempt: 1, submitted_at: `${addDays(day, r() < 0.1 ? 1 : -1)}T15:00:00.000Z`, is_late: r() < 0.1 });
        if (skip) continue;
        const pct = Math.max(0.2, Math.min(1, ab + (r() - 0.5) * 0.25));
        scores.push({ id: id("sc"), assessment_id: a.id, student_id: st.id, score: Math.round(pct * max * 2) / 2, feedback: pct > 0.85 ? "Excellent work." : pct < 0.5 ? "Let's review this together." : null,
          released: true, graded_at: `${addDays(day, 1)}T12:00:00.000Z` });
      }
    });
    // Coming up: homework due in a few days (open for submissions) and a quiz next week.
    const openHw = id("as");
    assessments.push({
      id: openHw, school_id: S, class_subject_id: cs.id, term_id: termFor(today), kind: "homework",
      title: `${titles[3]}: practice set`, description: `Complete the practice set on ${titles[3].toLowerCase()}. Show your working.`,
      due_at: `${addDays(today, 3)}T17:00:00.000Z`, scheduled_on: null, max_score: 10, published: true, published_at: now, takes_submissions: true, allow_resubmit: true, created_at: now,
    }, {
      id: id("as"), school_id: S, class_subject_id: cs.id, term_id: termFor(today), kind: "quiz",
      title: `${titles[4]} quiz`, description: "Short quiz in class.", due_at: null, scheduled_on: addDays(today, 7), max_score: 20, published: true, published_at: now,
      takes_submissions: false, allow_resubmit: false, created_at: now,
    });
    // Some of the class has already handed it in (waiting to be graded); the demo student hasn't yet.
    for (const st of pupils) if (st.id !== students[0].id && r() < 0.4)
      submissions.push({ id: id("sb"), assessment_id: openHw, student_id: st.id, body: "Here is my practice set. I showed my working for each question.",
        files: [], attempt: 1, submitted_at: `${today}T07:30:00.000Z`, is_late: false });
  }

  const resources: Resource[] = [];
  const res = (title: string, subject: string, g: number, type: Resource["type"], topic: string, url: string | null, description: string) =>
    resources.push({ id: id("re"), school_id: S, title, description, subject_id: sub(subject).id, grade_level_id: grade(g).id, academic_year_id: year.id,
      topic, type, file_path: url ? null : `${S}/library/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`, url, uploaded_by: teacherFor(subject).profile_id, created_at: now });
  res("Grade 8 Mathematics: fractions notes", "Mathematics", 8, "pdf", "Fractions", null, "Summary notes with worked examples.");
  res("Linear equations practice test", "Mathematics", 8, "practice_test", "Algebra", null, "20 questions with answers at the end.");
  res("Grade 8 Mathematics past exam (Semester 1)", "Mathematics", 8, "practice_test", "Revision", null, "Last year's semester exam for practice.");
  res("English grammar study guide", "English", 8, "study_guide", "Grammar", null, "Tenses, articles and prepositions.");
  res("How plants make food (video)", "General Science", 8, "video", "Photosynthesis", "https://www.youtube.com/results?search_query=photosynthesis+for+kids", "A short explainer video.");
  res("Regions of Ethiopia: slides", "Social Studies", 8, "presentation", "Geography", null, "Slides used in class.");
  res("አማርኛ ሰዋስው መመሪያ (Amharic grammar guide)", "Amharic", 8, "study_guide", "ሰዋስው", null, "የሰዋስው መሰረታዊ ነጥቦች።");
  res("Grade 5 Mathematics textbook (extract)", "Mathematics", 5, "textbook", "Numbers", null, "Chapters 1–3 for home reading.");
  res("Grade 5 reading practice", "English", 5, "document", "Reading", null, "Short stories with questions.");
  res("Cell structure diagrams", "Biology", 10, "pdf", "Cells", null, "Labelled diagrams to revise.");
  res("Spreadsheets: getting started", "ICT", 10, "presentation", "Spreadsheets", null, "Step-by-step slides.");
  res("Grade 10 Biology revision questions", "Biology", 10, "practice_test", "Revision", null, "Mixed questions across units.");

  const announcements: Announcement[] = [
    { id: id("an"), school_id: S, title: "Parent–teacher meeting on Saturday", body: "Parents are invited to meet class teachers this Saturday from 9:00 to 12:00 in the main hall.", audience: "parents", class_id: null, author_id: admin.id, pinned: true, published_at: `${addDays(today, -1)}T07:00:00.000Z` },
    { id: id("an"), school_id: S, title: "Midterm results released", body: "Midterm results are now available on the platform. Please review them with your teachers.", audience: "everyone", class_id: null, author_id: admin.id, pinned: false, published_at: `${addDays(today, -2)}T12:00:00.000Z` },
    { id: id("an"), school_id: S, title: "Staff meeting moved to Thursday", body: "This week's staff meeting is on Thursday at 15:30.", audience: "teachers", class_id: null, author_id: admin.id, pinned: false, published_at: `${addDays(today, -3)}T07:00:00.000Z` },
    { id: id("an"), school_id: S, title: "Grade 8A: bring your geometry set", body: "Please bring a ruler, compass and protractor to Mathematics this week.", audience: "class", class_id: c8A.id, author_id: teachers[0].profile_id, pinned: false, published_at: `${addDays(today, -1)}T08:00:00.000Z` },
    { id: id("an"), school_id: S, title: "Library open after school", body: "The library is open until 17:00 Monday to Thursday for study and revision.", audience: "students", class_id: null, author_id: admin.id, pinned: false, published_at: `${addDays(today, -6)}T07:00:00.000Z` },
  ];

  const tProfile = teachers[0].profile_id!;
  const messages: Message[] = [
    { id: id("ms"), school_id: S, sender_id: demoParent.id, recipient_id: tProfile, student_id: students[0].id, body: "Good morning teacher. How is Liya doing in Mathematics this term?", read_at: `${addDays(today, -2)}T10:00:00.000Z`, created_at: `${addDays(today, -2)}T08:30:00.000Z` },
    { id: id("ms"), school_id: S, sender_id: tProfile, recipient_id: demoParent.id, student_id: students[0].id, body: "Good morning. Liya is doing well. She is strong in fractions; practising word problems at home will help.", read_at: null, created_at: `${addDays(today, -2)}T11:15:00.000Z` },
  ];

  const notifications: Notification[] = [];
  const note = (user: string | null | undefined, kind: string, title: string, body: string | null, link: string, ago: number, read = false) => {
    if (!user) return;
    notifications.push({ id: id("no"), school_id: S, user_id: user, kind, title, body, link, read_at: read ? now : null, created_at: `${addDays(today, -ago)}T09:00:00.000Z` });
  };
  const liyaHw = assessments.find((a) => a.kind === "homework" && a.published_at === now && classSubjects.find((c) => c.id === a.class_subject_id)?.class_id === c8A.id
    && classSubjects.find((c) => c.id === a.class_subject_id)?.subject_id === sub("Mathematics").id)!;
  note(studentProfiles.get(students[0].id), "new_assessment", `Mathematics: ${liyaHw.title}`, null, `/app/assignments/${liyaHw.id}`, 0);
  note(studentProfiles.get(students[0].id), "grade_released", "New grade: Mathematics midterm exam", null, "/app/grades", 1, true);
  note(demoParent.id, "grade_released", "Liya Getachew: Mathematics midterm exam", null, "/app/grades", 1);
  note(demoParent.id, "message", "New message from Meron Alemu", null, "/app/messages", 2);
  note(tProfile, "submission", "New submissions for Fractions and decimals", null, "/app/assignments", 1);
  note(admin.id, "announcement", "3 students require academic attention", "Open Reports to see who and why.", "/app/reports", 0);

  return {
    school, profiles, years: [year], terms, gradeLevels, subjects, weights, teachers, classes, students, parents, parentStudents,
    classSubjects, attendance, assessments, assessmentFiles: [], submissions, scores, resources, announcements, messages, notifications, accounts,
  };
}
