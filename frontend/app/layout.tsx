"use client";

import React, { useEffect } from "react";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/common/command-palette";
import { useUIStore } from "@/lib/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { setIsMobile } = useUIStore();

  useEffect(() => {
    // Initialize theme
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }

    // Setup media query listener for mobile detection
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleMediaChange);
    
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, [setIsMobile]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>VisionBI Assistant</title>
        <meta name="description" content="In-house AI assistant" />
      </head>
      <body className={inter.className}>
        <TooltipProvider>
          <AppShell>
            {children}
          </AppShell>
          <CommandPalette />
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}


