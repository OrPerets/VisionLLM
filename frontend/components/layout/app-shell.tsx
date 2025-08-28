"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore, useKeyboardShortcuts } from "@/lib/ui";
import { AppHeader } from "./app-header";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { leftSidebarOpen, rightSidebarOpen, rightSidebarWidth } = useAppStore();
  const { isMobile } = useUIStore();
  const { handleKeydown } = useKeyboardShortcuts();

  useEffect(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <div
        className={cn(
          "flex-shrink-0 border-r border-border transition-all duration-300",
          leftSidebarOpen ? "w-80" : "w-0",
          isMobile && leftSidebarOpen && "fixed inset-y-0 left-0 z-50 w-80"
        )}
      >
        {leftSidebarOpen && <LeftSidebar />}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex flex-1 overflow-hidden">
          {/* Page Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {/* Right Sidebar */}
          <div
            className={cn(
              "flex-shrink-0 border-l border-border transition-all duration-300",
              rightSidebarOpen ? "" : "w-0",
              isMobile && rightSidebarOpen && "fixed inset-y-0 right-0 z-50"
            )}
            style={{
              width: rightSidebarOpen ? `${rightSidebarWidth}px` : '0px',
              ...(isMobile && rightSidebarOpen && { width: `${rightSidebarWidth}px` })
            }}
          >
            {rightSidebarOpen && <RightSidebar />}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && (leftSidebarOpen || rightSidebarOpen) && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => {
            useAppStore.getState().setLeftSidebarOpen(false);
            useAppStore.getState().setRightSidebarOpen(false);
          }}
        />
      )}
    </div>
  );
}
