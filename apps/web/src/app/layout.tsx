import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { cn } from "@/lib/utils";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Service Desk",
  description: "Customer service request tracking workspace",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("font-sans", manrope.variable, ibmPlexMono.variable)}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
