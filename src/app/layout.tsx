import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pawtrol - עזור לבעלי חיים",
  description: "דווח על בעלי חיים במצוקה ותקבל עזרה דחוף",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}