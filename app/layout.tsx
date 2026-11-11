import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Step Forward · Online Exam",
  description: "Step Forward English Teacher — online exam platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
