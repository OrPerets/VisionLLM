"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore, useKeyboardShortcuts } from "@/lib/ui";
import { AppHeader } from "./app-header";
import { LeftSidebar } from "./left-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { leftSidebarOpen } = useAppStore();
  const { isMobile } = useUIStore();
  const { handleKeydown } = useKeyboardShortcuts();

  useEffect(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Sidebar - ChatGPT Style */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border/50 transition-all duration-300 ease-out",
          leftSidebarOpen ? "w-[260px]" : "w-0",
          isMobile && leftSidebarOpen && "fixed inset-y-0 left-0 z-50 w-[260px]"
        )}
      >
        {leftSidebarOpen && <LeftSidebar />}
      </div>

      {/* Main Content Area - Simplified */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        
        {/* Chat Content - Centered with Max Width */}
        <main className="flex-1 overflow-hidden relative">
          <div className="h-full w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && leftSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => {
            useAppStore.getState().setLeftSidebarOpen(false);
          }}
        />
      )}
    </div>
  );
}
