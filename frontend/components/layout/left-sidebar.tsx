"use client";

import React from "react";
import { ProjectsSidebar } from "@/components/sidebar/projects-sidebar";
import { ConversationsSidebar } from "@/components/sidebar/conversations-sidebar";
import { Separator } from "@/components/ui/separator";

export function LeftSidebar() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-hidden">
        <ProjectsSidebar />
      </div>
      
      <Separator />
      
      <div className="flex-1 overflow-hidden">
        <ConversationsSidebar />
      </div>
    </div>
  );
}
