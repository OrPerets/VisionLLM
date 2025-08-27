"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProjectSkeleton } from "@/components/common/loading-skeleton";
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
  FolderOpen,
  MoreHorizontal,
  Edit,
  Trash2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ProjectsSidebar() {
  const router = useRouter();
  const {
    projects,
    selectedProjectId,
    conversationsByProject,
    isLoading,
    loadProjects,
    selectProject,
    createNewProject,
    updateProjectData,
    deleteProjectData,
  } = useAppStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [editProjectName, setEditProjectName] = useState("");

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await createNewProject({
        name: newProjectName.trim(),
        system_instructions: "",
        defaults: {
          temperature: 0.7,
          max_tokens: 2048,
        },
      });
      
      setCreateDialogOpen(false);
      setNewProjectName("");
      selectProject(project.id);
      // Create an initial conversation and navigate to it
      try {
        const conversation = await useAppStore.getState().createNewConversation(project.id, {
          title: "New Conversation",
        });
        router.push(`/projects/${project.id}/conversations/${conversation.id}`);
      } catch {
        router.push(`/projects/${project.id}`);
      }
      toast.success(`Project "${project.name}" created successfully`);
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  const handleEditProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;

    try {
      await updateProjectData(editingProject, {
        name: editProjectName.trim(),
      });
      
      setEditDialogOpen(false);
      setEditingProject(null);
      setEditProjectName("");
      toast.success("Project renamed successfully");
    } catch (error) {
      toast.error("Failed to rename project");
    }
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;

    try {
      await deleteProjectData(editingProject);
      setDeleteDialogOpen(false);
      setEditingProject(null);
      toast.success("Project deleted successfully");
      
      // Redirect to home if we deleted the current project
      if (selectedProjectId === editingProject) {
        router.push("/");
      }
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  const openEditDialog = (projectId: number, currentName: string) => {
    setEditingProject(projectId);
    setEditProjectName(currentName);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (projectId: number) => {
    setEditingProject(projectId);
    setDeleteDialogOpen(true);
  };

  const getConversationCount = (projectId: number) => {
    return conversationsByProject[projectId]?.length || 0;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Projects</h2>
        </div>
        <ProjectSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Projects</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your conversations and settings.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateProject();
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
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center justify-between rounded-md p-2 cursor-pointer hover:bg-accent transition-colors",
                  selectedProjectId === project.id && "bg-accent"
                )}
                onClick={() => selectProject(project.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium truncate">{project.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="h-5">
                      {getConversationCount(project.id)} chats
                    </Badge>
                  </div>
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
                        openEditDialog(project.id, project.name);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        selectProject(project.id);
                        // Open right sidebar settings
                        useAppStore.getState().setRightSidebarOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(project.id);
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for this project.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleEditProject();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProject} disabled={!editProjectName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All conversations in this project will be permanently deleted.
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
              onClick={handleDeleteProject}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
