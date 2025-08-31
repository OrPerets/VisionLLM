"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Inter } from "next/font/google";
import { AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/common/command-palette";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useUIStore } from "@/lib/ui";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsMobile } = useUIStore();

  useEffect(() => {
    // Initialize theme - default to dark for Vision.bi aesthetic
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || !theme) {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else if (theme === "system") {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
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

  // Check if current route is login page
  const isLoginPage = pathname === "/login";
  
  // Check if current route requires admin access
  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/maintenance");

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>VisionBI Assistant</title>
        <meta name="description" content="Enterprise AI assistant powered by Vision.bi" />
      </head>
      <body className={inter.className}>
        <TooltipProvider>
          <AnimatePresence mode="wait" initial={false}>
            {isLoginPage ? (
              // Login page - no auth required, no shell
              <ProtectedRoute requireAuth={false} key="login">
                {children}
              </ProtectedRoute>
            ) : isAdminRoute ? (
              // Admin routes - full page without AppShell
              <ProtectedRoute 
                requireAuth={true} 
                adminOnly={true}
                key="admin"
              >
                {children}
                <CommandPalette />
              </ProtectedRoute>
            ) : (
              // Protected routes with AppShell
              <ProtectedRoute 
                requireAuth={true} 
                adminOnly={false}
                key="protected"
              >
                <AppShell>
                  {children}
                </AppShell>
                <CommandPalette />
              </ProtectedRoute>
            )}
          </AnimatePresence>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}


