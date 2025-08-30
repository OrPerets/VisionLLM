"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/common/status-indicator";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/lib/ui";
import { getMeta, getHealth, API_BASE } from "@/lib/api";
import { Meta, Health } from "@/lib/types";
import {
  Menu,
  X,
  Search,
  Settings,
  RefreshCw,
  LogOut,
  Brain,
  Database,
  Bot,
  FolderOpen,
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
    <motion.header 
      className="flex h-16 items-center justify-between border-b border-border/50 px-6 bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-6">
        {/* Left Sidebar Toggle */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="h-9 w-9 hover:bg-muted/50"
          >
            <AnimatePresence mode="wait">
              {leftSidebarOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="h-4 w-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="h-4 w-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        {/* Brand */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="relative">
            <motion.div
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Brain className="h-4 w-4 text-white" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              VisionBI Assistant
            </h1>
          </div>
        </motion.div>

        {/* Status */}
        <motion.div 
          className="flex items-center gap-3 pl-4 border-l border-border/50"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <StatusIndicator
            status={getServerStatus()}
            tooltip={getStatusTooltip()}
          />
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchStatus}
              disabled={isLoading}
              className="h-7 w-7 hover:bg-muted/50"
            >
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ 
                  duration: isLoading ? 1 : 0, 
                  repeat: isLoading ? Infinity : 0,
                  ease: "linear"
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Search/Command Palette */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-3 h-9 px-4 bg-background/50 border-border/50 hover:bg-background/80 hover:border-border"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Search</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-80 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </motion.div>

        {/* SQL Tools Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/sql"}
            className="flex items-center gap-3 h-9 px-4 bg-background/50 border-border/50 hover:bg-background/80 hover:border-border"
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">SQL Tools</span>
          </Button>
        </motion.div>

        {/* Agents Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/agents"}
            className="flex items-center gap-3 h-9 px-4 bg-background/50 border-border/50 hover:bg-background/80 hover:border-border"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Agents</span>
          </Button>
        </motion.div>

        {/* Projects Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/projects"}
            className="flex items-center gap-3 h-9 px-4 bg-background/50 border-border/50 hover:bg-background/80 hover:border-border"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Projects</span>
          </Button>
        </motion.div>

        {/* Right Sidebar Toggle */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant={rightSidebarOpen ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="h-9 w-9 hover:bg-muted/50"
          >
            <motion.div
              animate={{ rotate: rightSidebarOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Settings className="h-4 w-4" />
            </motion.div>
          </Button>
        </motion.div>

        {/* Logout */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetch(`${API_BASE}/auth/logout`, { credentials: "include" }).finally(() => {
                window.location.href = "/";
              });
            }}
            className="h-9 px-4 bg-background/50 border-border/50 hover:bg-background/80 hover:border-border text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </motion.div>
      </motion.div>
    </motion.header>
  );
}
