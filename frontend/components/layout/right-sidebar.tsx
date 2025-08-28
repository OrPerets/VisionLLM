"use client";

import React, { useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSettings } from "@/components/tools/project-settings";
import { SQLToolsCard } from "@/components/tools/sql-tools-card";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function RightSidebar() {
  const { rightSidebarWidth, setRightSidebarWidth } = useAppStore();
  const isResizing = useRef(false);
  const startWidth = useRef(0);
  const startX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startWidth.current = rightSidebarWidth;
    startX.current = e.clientX;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const deltaX = startX.current - e.clientX; // Reverse direction for right sidebar
      const newWidth = startWidth.current + deltaX;
      setRightSidebarWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [rightSidebarWidth, setRightSidebarWidth]);

  return (
    <div className="flex h-full bg-background">
      {/* Resize Handle */}
      <div
        className={cn(
          "w-1 hover:w-2 cursor-col-resize bg-transparent hover:bg-border/50 transition-all duration-150 flex-shrink-0",
          "active:bg-border group"
        )}
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      >
        <div className="w-full h-full group-hover:bg-border/30 group-active:bg-border/60 transition-colors" />
      </div>
      
      {/* Sidebar Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <Tabs defaultValue="settings" className="flex flex-col h-full">
          <div className="border-b border-border p-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="sql">SQL Tools</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TabsContent value="settings" className="h-full mt-0">
              <ProjectSettings />
            </TabsContent>
            
            <TabsContent value="sql" className="h-full mt-0">
              <SQLToolsCard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
