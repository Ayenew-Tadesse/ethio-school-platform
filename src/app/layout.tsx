import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "School Platform · Addis Future Academy (demo)", template: "%s · School Platform" },
  description: "One platform for the entire school: attendance, assignments, grades, library, messages and parent visibility.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f6b4c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
