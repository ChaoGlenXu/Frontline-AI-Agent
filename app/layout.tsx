import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Frontline AI Agent",
  description: "Hackathon MVP dashboard for AI phone and SMS workflows"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
