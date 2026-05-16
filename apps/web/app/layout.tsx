import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { DemoKeys } from "@/components/nav/demo-keys";

export const metadata: Metadata = {
  title: "NexusWallet · Adaptive Financial Intelligence",
  description:
    "Multi-agent GenAI fintech platform for SEA's gig workers, creators, freelancers, and seasonal workers. Built for the Grab/GXS hackathon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <DemoKeys />
        {children}
      </body>
    </html>
  );
}
