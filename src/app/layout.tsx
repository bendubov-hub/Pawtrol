import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LangProvider } from "@/lib/lang-context";
import PermissionsGate from "@/components/PermissionsGate";

export const metadata: Metadata = {
  title: "Pawtrol",
  description: "דווח על בעלי חיים במצוקה ותקבל עזרה דחוף",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pawtrol",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#EF4444" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-gray-50">
        <LangProvider><AuthProvider><PermissionsGate>{children}</PermissionsGate></AuthProvider></LangProvider>
      </body>
    </html>
  );
}