"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Skeleton } from "@/components/common/loading-skeleton";
import { motionVariants } from "@/lib/motion";

export default function HomePage() {
  const router = useRouter();
  const bootstrappedRef = useRef(false);
  const {
    user,
    projects,
    selectedProjectId,
    loadProjects,
    createNewProject,
    selectProject,
    createNewConversation,
    loadConversations,
    isLoading,
  } = useAppStore();

  useEffect(() => {
    // Load projects when user is authenticated
    if (user) {
      loadProjects();
    }
  }, [user, loadProjects]);

  useEffect(() => {
    async function bootstrap() {
      if (isLoading || bootstrappedRef.current || !user) return;
      bootstrappedRef.current = true;

      try {
        let projectId = selectedProjectId;

        // If no projects exist, try to create a demo project or redirect to projects page
        if (projects.length === 0) {
          console.log("No projects found, redirecting to projects page");
          router.push("/projects");
          return;
        } else {
          // Use first project if none selected
          projectId = selectedProjectId || projects[0].id;
        }

        // Select the project (this also loads conversations internally)
        selectProject(projectId);

        // Ensure conversations are loaded before deciding
        await loadConversations(projectId);
        const conversations = useAppStore.getState().getProjectConversations(projectId);

        if (!conversations || conversations.length === 0) {
          // Create a new conversation only when none exist
          const conversation = await createNewConversation(projectId, {
            title: "New Conversation",
          });
          router.push(`/projects/${projectId}/conversations/${conversation.id}`);
        } else {
          // Navigate to most recent conversation returned by API (already sorted desc)
          const first = conversations[0];
          router.push(`/projects/${projectId}/conversations/${first.id}`);
        }
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
    loadConversations,
    router,
    user,
  ]);

  return (
    <motion.div
      className="flex h-full items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, staggerChildren: 0.1 }}
      >
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </motion.div>
        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Setting up your workspace...
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

