import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BABFT Admin Console",
  description: "Admin panel for BABFT Learning",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
