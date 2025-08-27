"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Skeleton } from "@/components/common/loading-skeleton";

export default function HomePage() {
  const router = useRouter();
  const {
    projects,
    selectedProjectId,
    loadProjects,
    createNewProject,
    selectProject,
    createNewConversation,
    isLoading,
  } = useAppStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    async function bootstrap() {
      if (isLoading) return;

      try {
        let projectId = selectedProjectId;

        // If no projects exist, create a demo project
        if (projects.length === 0) {
          const project = await createNewProject({
            name: "Demo Project",
            system_instructions: "You are a helpful AI assistant.",
            defaults: {
              temperature: 0.7,
              max_tokens: 2048,
            },
          });
          projectId = project.id;
        } else {
          // Use first project if none selected
          projectId = selectedProjectId || projects[0].id;
        }

        selectProject(projectId);

        // Create a new conversation and redirect to it
        const conversation = await createNewConversation(projectId, {
          title: "New Conversation",
        });

        router.push(`/projects/${projectId}/conversations/${conversation.id}`);
      } catch (error) {
        console.error("Failed to bootstrap app:", error);
        // Fallback: just select first project if available
        if (projects.length > 0) {
          selectProject(projects[0].id);
        }
      }
    }

    bootstrap();
  }, [
    isLoading,
    projects,
    selectedProjectId,
    selectProject,
    createNewProject,
    createNewConversation,
    router,
  ]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <div className="text-sm text-muted-foreground">
          Setting up your workspace...
        </div>
      </div>
    </div>
  );
}

