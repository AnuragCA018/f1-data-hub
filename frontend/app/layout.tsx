import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "F1 Data Hub | Formula 1 Analytics Platform",
  description:
    "Professional Formula 1 analytics dashboard powered by FastF1 — race data, telemetry, driver comparisons and more.",
  icons: {
    icon: "/fdh-logo.png",
    apple: "/fdh-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0D12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className="flex h-screen overflow-hidden"
        style={{ background: "#0B0D12", color: "#FFFFFF" }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
