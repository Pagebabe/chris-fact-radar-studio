import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";
import "./unified-ui.css";

export const metadata: Metadata = {
  title: "Chris Fact Radar",
  description: "Claim-Radar für deutsche Fitness-, Ernährungs- und Gesundheitsmythen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <WorkspaceShell />
        {children}
      </body>
    </html>
  );
}
