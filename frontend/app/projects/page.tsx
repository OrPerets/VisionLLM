"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, FolderOpen, MessageSquare, Settings } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

export default function ProjectsPage() {
  const router = useRouter();
  const {
    projects,
    conversationsByProject,
    isLoading,
    loadProjects,
    createNewProject,
    selectProject,
  } = useAppStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

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
      router.push(`/projects/${project.id}/conversations/new`);
      toast.success(`Project "${project.name}" created successfully`);
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  const handleProjectClick = (projectId: number) => {
    selectProject(projectId);
    const conversations = conversationsByProject[projectId] || [];
    if (conversations.length > 0) {
      router.push(`/projects/${projectId}/conversations/${conversations[0].id}`);
    } else {
      router.push(`/projects/${projectId}`);
    }
  };

  const getConversationCount = (projectId: number) => {
    return conversationsByProject[projectId]?.length || 0;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your AI assistant projects</p>
        </div>
        <ProjectSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your AI assistant projects</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
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

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first project to get started with the AI assistant.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleProjectClick(project.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectProject(project.id);
                      // TODO: Open project settings
                    }}
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
                <CardDescription>
                  {project.system_instructions || "No system instructions"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{getConversationCount(project.id)} conversations</span>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {formatRelativeTime(project.updated_at)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
