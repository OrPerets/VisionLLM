"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationSkeleton } from "@/components/common/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Edit,
  Trash2,
  Search,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, cn } from "@/lib/utils";

export function ConversationsSidebar() {
  const router = useRouter();
  const {
    selectedProjectId,
    selectedConversationId,
    conversationsByProject,
    loadConversations,
    selectConversation,
    createNewConversation,
    deleteConversationData,
    getCurrentProject,
    renameConversation,
  } = useAppStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<number | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [search, setSearch] = useState("");

  const currentProject = getCurrentProject();
  const conversations = selectedProjectId ? conversationsByProject[selectedProjectId] || [] : [];

  // Debounce search
  const debouncedSearch = useMemo(() => {
    return search.trim();
  }, [search]);

  useEffect(() => {
    if (selectedProjectId) {
      const handle = setTimeout(() => {
        loadConversations(selectedProjectId, debouncedSearch || undefined);
      }, 250);
      return () => clearTimeout(handle);
    }
  }, [selectedProjectId, debouncedSearch, loadConversations]);

  const handleCreateConversation = async () => {
    if (!selectedProjectId) return;

    try {
      const conversation = await createNewConversation(selectedProjectId, {
        title: newConversationTitle.trim() || "New Conversation",
      });
      
      setCreateDialogOpen(false);
      setNewConversationTitle("");
      selectConversation(conversation.id);
      router.push(`/projects/${selectedProjectId}/conversations/${conversation.id}`);
      toast.success("New conversation created");
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConversation) return;

    try {
      await deleteConversationData(deletingConversation);
      setDeleteDialogOpen(false);
      setDeletingConversation(null);
      toast.success("Conversation deleted");
      
      // Redirect if we deleted the current conversation
      if (selectedConversationId === deletingConversation) {
        router.push(selectedProjectId ? `/projects/${selectedProjectId}` : "/");
      }
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const handleRenameConversation = async () => {
    if (!renamingConversationId) return;
    try {
      const title = renameTitle.trim();
      await renameConversation(renamingConversationId, { title });
      setRenameDialogOpen(false);
      setRenamingConversationId(null);
      setRenameTitle("");
      toast.success("Conversation renamed");
    } catch (error) {
      toast.error("Failed to rename conversation");
    }
  };

  const openDeleteDialog = (conversationId: number) => {
    setDeletingConversation(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConversationClick = (conversationId: number) => {
    selectConversation(conversationId);
    if (selectedProjectId) {
      router.push(`/projects/${selectedProjectId}/conversations/${conversationId}`);
    }
  };

  if (!selectedProjectId) {
    return (
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
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40" />
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
              <Sparkles className="h-4 w-4 text-blue-400" />
            </motion.div>
          </motion.div>
          <motion.p 
            className="text-sm font-medium text-foreground mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Select a Project
          </motion.p>
          <motion.p 
            className="text-xs leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Choose a project from the sidebar to view and manage conversations
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="flex h-full flex-col bg-background"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div 
        className="p-5 border-b border-border/50 bg-muted/20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Conversations</h2>
            {currentProject && (
              <p className="text-sm text-muted-foreground truncate">
                in <span className="font-medium">{currentProject.name}</span>
              </p>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 bg-background/50 border-border/50 focus:border-border"
            />
          </div>
          
          {/* New Conversation Button */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button size="sm" className="w-full h-9 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Conversation
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Conversation</DialogTitle>
                <DialogDescription>
                  Start a new conversation in <span className="font-medium">{currentProject?.name}</span>.
                </DialogDescription>
              </DialogHeader>
              <Input
                autoFocus
                placeholder="Enter conversation title (optional)"
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateConversation();
                  }
                }}
                className="mt-2"
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateConversation}>
                  Create Conversation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {conversations.length === 0 ? (
            <motion.div 
              className="p-6 text-center text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <motion.div
                className="relative mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/5 to-purple-500/5"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
              <motion.p 
                className="text-sm font-medium text-foreground mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                No conversations yet
              </motion.p>
              <motion.p 
                className="text-xs leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Create your first conversation to start chatting with the AI assistant
              </motion.p>
            </motion.div>
          ) : (
            <motion.div 
              className="p-3 space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {conversations.map((conversation, index) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.2
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div
                    className={cn(
                      "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
                      "hover:bg-accent/50 hover:shadow-sm",
                      selectedConversationId === conversation.id 
                        ? "bg-primary/10 border-2 border-primary/20 shadow-sm" 
                        : "border-2 border-transparent hover:border-border/50"
                    )}
                    onClick={() => handleConversationClick(conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <motion.div
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            selectedConversationId === conversation.id
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                          )}
                          whileHover={{ scale: 1.1 }}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </motion.div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-medium truncate transition-colors",
                          selectedConversationId === conversation.id
                            ? "text-primary"
                            : "text-foreground group-hover:text-foreground"
                        )}>
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
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
                              className="h-7 w-7 hover:bg-background/80"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingConversationId(conversation.id);
                                setRenameTitle(conversation.title);
                                setRenameDialogOpen(true);
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
                                openDeleteDialog(conversation.id);
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConversation}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Set a new name for this conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Conversation title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRenameConversation();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameConversation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
