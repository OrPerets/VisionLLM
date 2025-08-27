"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useUIStore } from "@/lib/ui";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  FolderOpen, 
  MessageSquare, 
  Plus,
  Settings,
  Database,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
  badge?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { projects, conversationsByProject, selectProject, createNewProject, createNewConversation } = useAppStore();
  
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-projects",
      title: "Go to Projects",
      description: "View all projects",
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => router.push("/projects"),
      keywords: ["projects", "navigate", "go"],
    },
    {
      id: "nav-admin",
      title: "Go to Admin",
      description: "System status and administration",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => router.push("/admin"),
      keywords: ["admin", "status", "system", "health"],
    },
    {
      id: "nav-sql",
      title: "Go to SQL Tools",
      description: "Transpile and lint SQL",
      icon: <Database className="h-4 w-4" />,
      action: () => router.push("/sql"),
      keywords: ["sql", "tools", "transpile", "lint"],
    },

    // Actions
    {
      id: "create-project",
      title: "Create New Project",
      description: "Start a new project",
      icon: <Plus className="h-4 w-4" />,
      action: async () => {
        try {
          const project = await createNewProject({
            name: `Project ${projects.length + 1}`,
            system_instructions: "",
            defaults: { temperature: 0.7, max_tokens: 2048 },
          });
          router.push(`/projects/${project.id}`);
        } catch (error) {
          console.error("Failed to create project:", error);
        }
      },
      keywords: ["create", "new", "project", "add"],
    },

    // Projects
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      description: "Switch to project",
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => {
        selectProject(project.id);
        const conversations = conversationsByProject[project.id] || [];
        if (conversations.length > 0) {
          router.push(`/projects/${project.id}/conversations/${conversations[0].id}`);
        } else {
          router.push(`/projects/${project.id}`);
        }
      },
      keywords: ["project", project.name.toLowerCase(), "switch"],
      badge: `${conversationsByProject[project.id]?.length || 0} chats`,
    })),

    // Conversations
    ...Object.entries(conversationsByProject).flatMap(([projectId, conversations]) =>
      conversations.map((conversation) => ({
        id: `conversation-${conversation.id}`,
        title: conversation.title,
        description: `In ${projects.find(p => p.id === parseInt(projectId))?.name}`,
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => {
          router.push(`/projects/${projectId}/conversations/${conversation.id}`);
        },
        keywords: ["conversation", "chat", conversation.title.toLowerCase()],
      }))
    ),
  ];

  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    const searchText = query.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchText) ||
      command.description?.toLowerCase().includes(searchText) ||
      command.keywords.some(keyword => keyword.includes(searchText))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandPaletteOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => prev === 0 ? filteredCommands.length - 1 : prev - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setCommandPaletteOpen(false);
            setQuery("");
          }
          break;
        case "Escape":
          setCommandPaletteOpen(false);
          setQuery("");
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, setCommandPaletteOpen]);

  const handleSelect = (command: CommandItem) => {
    command.action();
    setCommandPaletteOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 mr-2 text-muted-foreground" />
          <Input
            placeholder="Search for commands, projects, conversations..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-12"
            autoFocus
          />
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <div
                  key={command.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                    index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => handleSelect(command)}
                >
                  <div className="flex-shrink-0 text-muted-foreground">
                    {command.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{command.title}</div>
                    {command.description && (
                      <div className="text-sm text-muted-foreground truncate">
                        {command.description}
                      </div>
                    )}
                  </div>
                  {command.badge && (
                    <Badge variant="outline" className="text-xs">
                      {command.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </DialogContent>
    </Dialog>
  );
}
