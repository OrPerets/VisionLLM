"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSettings } from "@/components/tools/project-settings";
import { SQLToolsCard } from "@/components/tools/sql-tools-card";

export function RightSidebar() {
  return (
    <div className="flex h-full flex-col bg-background">
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
  );
}
