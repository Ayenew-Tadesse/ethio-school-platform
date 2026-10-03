import { redirect } from "next/navigation";
// Older notification links point here; grades live at /app/grades.
export default function Performance() { redirect("/app/grades"); }
