// አማርኛ (Amharic). A first pass for review by a native speaker; any key not
// here shows in English. Add keys as screens are translated.
import type { Messages } from "./en";
type Deep<T> = { [K in keyof T]?: T[K] extends object ? Deep<T[K]> : string };

export const am: Deep<Messages> = {
  app: { product: "የትምህርት ቤት መድረክ", tagline: "አንድ ትምህርት ቤት። አንድ መድረክ። የተማሪ እድገት በአንድ እይታ።" },
  nav: {
    dashboard: "ዋና ገጽ", students: "ተማሪዎች", teachers: "መምህራን", classes: "ክፍሎች", subjects: "የትምህርት ዓይነቶች", attendance: "የመገኘት መዝገብ",
    exams: "ፈተናዎች", assignments: "የቤት ሥራዎች", library: "ቤተ መጻሕፍት", messages: "መልዕክቶች", announcements: "ማስታወቂያዎች", reports: "ሪፖርቶች",
    settings: "ቅንብሮች", myClasses: "የእኔ ክፍሎች", grades: "ውጤቶች", myChildren: "ልጆቼ", performance: "አፈጻጸም", menu: "ምናሌ",
    notifications: "ማሳወቂያዎች", signOut: "ውጣ", language: "ቋንቋ", more: "ተጨማሪ",
  },
  role: { admin: "አስተዳዳሪ", teacher: "መምህር", student: "ተማሪ", parent: "ወላጅ" },
  common: {
    loading: "በመጫን ላይ…", save: "አስቀምጥ", cancel: "ሰርዝ", saved: "ተቀምጧል", add: "ጨምር", edit: "አስተካክል", delete: "አጥፋ", close: "ዝጋ",
    search: "ፈልግ", all: "ሁሉም", view: "ተመልከት", back: "ተመለስ", submit: "አስገባ", publish: "አትም", today: "ዛሬ", class: "ክፍል",
    subject: "የትምህርት ዓይነት", grade: "ክፍል ደረጃ", student: "ተማሪ", teacher: "መምህር", parent: "ወላጅ", date: "ቀን", status: "ሁኔታ",
    empty: "እስካሁን ምንም የለም።", error: "ችግር ተፈጥሯል።", retry: "እንደገና ሞክር",
  },
  att: { present: "ተገኝቷል", absent: "አልተገኘም", late: "አርፍዷል", excused: "ፈቃድ", rate: "የመገኘት መጠን", take: "መገኘት መዝግብ" },
  kind: { homework: "የቤት ሥራ", assignment: "ተግባር", quiz: "አጭር ፈተና", midterm: "የመካከለኛ ጊዜ ፈተና", final: "የማጠቃለያ ፈተና" },
  dash: {
    hello: "ሰላም፣ {name}", totalStudents: "ጠቅላላ ተማሪዎች", totalTeachers: "ጠቅላላ መምህራን", attendanceRate: "የመገኘት መጠን",
    completion: "የሥራ ማጠናቀቅ", avgPerformance: "አማካይ ውጤት", attention: "ትኩረት የሚያስፈልጋቸው ተማሪዎች",
    upcomingExams: "የሚመጡ ፈተናዎች", recentAnnouncements: "የቅርብ ጊዜ ማስታወቂያዎች", upcomingWork: "የሚመጡ ሥራዎች",
    subjectPerformance: "የትምህርት ዓይነት ውጤት", recentGrades: "የቅርብ ጊዜ ውጤቶች", myAverage: "የእኔ አማካይ", overdue: "ጊዜው ያለፈ",
    toDo: "የሚሠሩ", teacherFeedback: "የመምህር አስተያየት", overall: "አጠቃላይ", pinned: "የተሰካ", myClasses: "የእኔ ክፍሎች", myStudents: "የእኔ ተማሪዎች",
    classComparison: "የክፍሎች ንጽጽር", classAverages: "የክፍል አማካዮች", newAssignment: "አዲስ ሥራ",
  },
  shell: { account: "መለያ", markAllRead: "ሁሉንም እንደተነበበ ምልክት አድርግ", noNotifications: "አዲስ ማሳወቂያ የለም።" },
  auth: { signIn: "ግባ", email: "ኢሜይል", password: "የይለፍ ቃል", demoTitle: "ማሳያውን ይመልከቱ", demoAs: "እንደ {role} ቀጥል", signingIn: "በመግባት ላይ…" },
};
