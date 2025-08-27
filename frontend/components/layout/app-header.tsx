"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/common/status-indicator";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/lib/ui";
import { getMeta, getHealth } from "@/lib/api";
import { Meta, Health } from "@/lib/types";
import {
  Menu,
  X,
  Search,
  Settings,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export function AppHeader() {
  const { leftSidebarOpen, rightSidebarOpen, setLeftSidebarOpen, setRightSidebarOpen } = useAppStore();
  const { setCommandPaletteOpen } = useUIStore();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [metaData, healthData] = await Promise.all([
        getMeta(),
        getHealth(),
      ]);
      setMeta(metaData);
      setHealth(healthData);
    } catch (error) {
      console.error("Failed to fetch status:", error);
      toast.error("Failed to fetch backend status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getServerStatus = () => {
    if (!health || !meta) return "offline";
    if (!health.ok) return "error";
    if (!meta.model_server_ok) return "warning";
    return "online";
  };

  const getStatusTooltip = () => {
    if (!health || !meta) return "Backend status unknown";
    if (!health.ok) return "Backend is not responding";
    if (!meta.model_server_ok) return "Model server is not available";
    return `Backend v${meta.backend_version} | Model: ${meta.model_id}`;
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-4">
        {/* Left Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="h-8 w-8"
        >
          {leftSidebarOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">VisionBI Assistant</h1>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={getServerStatus()}
            tooltip={getStatusTooltip()}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchStatus}
            disabled={isLoading}
            className="h-6 w-6"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search/Command Palette */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Git Info */}
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>

        {/* Right Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="h-8 w-8"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
