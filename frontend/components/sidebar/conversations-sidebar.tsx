"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  } = useAppStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<number | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState("");

  const currentProject = getCurrentProject();
  const conversations = selectedProjectId ? conversationsByProject[selectedProjectId] || [] : [];

  useEffect(() => {
    if (selectedProjectId) {
      loadConversations(selectedProjectId);
    }
  }, [selectedProjectId, loadConversations]);

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
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a project</p>
          <p className="text-xs mt-1">Choose a project to view conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">Conversations</h2>
          {currentProject && (
            <p className="text-xs text-muted-foreground truncate">
              {currentProject.name}
            </p>
          )}
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
              <DialogDescription>
                Start a new conversation in {currentProject?.name}.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Conversation title (optional)"
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateConversation();
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateConversation}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start your first conversation</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex items-center justify-between rounded-md p-2 cursor-pointer hover:bg-accent transition-colors",
                  selectedConversationId === conversation.id && "bg-accent"
                )}
                onClick={() => handleConversationClick(conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {conversation.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(conversation.updated_at)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement conversation renaming
                        toast.info("Rename functionality coming soon");
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
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
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
