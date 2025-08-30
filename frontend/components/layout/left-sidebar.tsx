"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MessageCircle,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, cn } from "@/lib/utils";

export function LeftSidebar() {
  const router = useRouter();
  const {
    selectedProjectId,
    selectedConversationId,
    projects,
    conversationsByProject,
    loadProjects,
    loadConversations,
    selectProject,
    selectConversation,
    createNewProject,
    createNewConversation,
    deleteConversationData,
    renameConversation,
    getCurrentProject,
  } = useAppStore();

  const [search, setSearch] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const currentProject = getCurrentProject();
  const conversations = selectedProjectId ? conversationsByProject[selectedProjectId] || [] : [];

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [conversations, search]);

  // Load initial data
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load conversations when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadConversations(selectedProjectId);
    }
  }, [selectedProjectId, loadConversations]);

  const handleNewChat = async () => {
    if (!selectedProjectId) {
      // If no project selected, create a default project first
      try {
        const project = await createNewProject({
          name: "General Chat",
          system_instructions: "",
          defaults: { temperature: 0.7, max_tokens: 2048 },
        });
        selectProject(project.id);
        
        // Now create conversation
        const conversation = await createNewConversation(project.id, {
          title: "New Conversation",
        });
        selectConversation(conversation.id);
        router.push(`/projects/${project.id}/conversations/${conversation.id}`);
      } catch (error) {
        toast.error("Failed to create new chat");
      }
      return;
    }

    try {
      setIsCreatingConversation(true);
      const conversation = await createNewConversation(selectedProjectId, {
        title: "New Conversation",
      });
      selectConversation(conversation.id);
      router.push(`/projects/${selectedProjectId}/conversations/${conversation.id}`);
      toast.success("New conversation created");
    } catch (error) {
      toast.error("Failed to create conversation");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleConversationClick = (conversationId: number) => {
    selectConversation(conversationId);
    if (selectedProjectId) {
      router.push(`/projects/${selectedProjectId}/conversations/${conversationId}`);
    }
  };

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      await deleteConversationData(conversationId);
      toast.success("Conversation deleted");
      
      if (selectedConversationId === conversationId) {
        router.push(selectedProjectId ? `/projects/${selectedProjectId}` : "/");
      }
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleProjectChange = (projectId: string) => {
    const id = parseInt(projectId);
    selectProject(id);
    setSearch(""); // Clear search when switching projects
  };

  return (
    <motion.div 
      className="flex h-full flex-col bg-background border-r border-border/50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with New Chat Button */}
      <div className="p-3 border-b border-border/50">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Button 
            onClick={handleNewChat}
            disabled={isCreatingConversation}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreatingConversation ? "Creating..." : "New chat"}
          </Button>
        </motion.div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="p-3 border-b border-border/50">
          <Select 
            value={selectedProjectId?.toString() || ""} 
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full h-9 text-sm">
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="h-4 w-4 flex-shrink-0" />
                <SelectValue placeholder="Select project" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Search */}
      {selectedProjectId && (
        <div className="p-3 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background/50 border-border/50 focus:border-border text-sm"
            />
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!selectedProjectId ? (
          <motion.div 
            className="flex h-full items-center justify-center p-6 text-center text-muted-foreground"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-xs">
              <motion.div
                className="relative mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
              </motion.div>
              <motion.p 
                className="text-sm font-medium text-foreground mb-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Welcome to VisionLLM
              </motion.p>
              <motion.p 
                className="text-xs leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Click "New chat" to start your first conversation
              </motion.p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredConversations.length === 0 ? (
              <motion.div 
                className="p-6 text-center text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MessageCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground mb-1">
                  {search ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="text-xs">
                  {search ? "Try a different search term" : "Start a new conversation to get chatting"}
                </p>
              </motion.div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ 
                      delay: index * 0.05,
                      duration: 0.2
                    }}
                  >
                    <div
                      className={cn(
                        "group relative rounded-lg p-2 cursor-pointer transition-all duration-200",
                        "hover:bg-accent/50",
                        selectedConversationId === conversation.id 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => handleConversationClick(conversation.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <MessageCircle className={cn(
                            "h-4 w-4",
                            selectedConversationId === conversation.id
                              ? "text-accent-foreground"
                              : "text-muted-foreground group-hover:text-foreground"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate text-sm",
                            selectedConversationId === conversation.id
                              ? "text-accent-foreground"
                              : "text-foreground"
                          )}>
                            {conversation.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRelativeTime(conversation.updated_at)}
                          </p>
                        </div>

                        <motion.div
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 hover:bg-background/80"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement rename functionality
                                  toast.info("Rename coming soon");
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conversation.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
