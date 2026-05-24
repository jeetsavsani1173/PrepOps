import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepOps",
  description: "Local-first job tracking and interview prep system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-zinc-100">{children}</body>
    </html>
  );
}
