"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = parseInt(params.projectId as string);

  const {
    selectedProjectId,
    conversationsByProject,
    selectProject,
    loadConversations,
  } = useAppStore();

  useEffect(() => {
    if (!isNaN(projectId) && selectedProjectId !== projectId) {
      selectProject(projectId);
    }
  }, [projectId, selectedProjectId, selectProject]);

  useEffect(() => {
    if (!isNaN(projectId)) {
      loadConversations(projectId);
    }
  }, [projectId, loadConversations]);

  const conversations = conversationsByProject[projectId] || [];

  useEffect(() => {
    if (conversations.length > 0) {
      // Auto-navigate to the most recent conversation for better UX
      const first = conversations[0];
      router.replace(`/projects/${projectId}/conversations/${first.id}`);
    }
  }, [conversations, projectId, router]);

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center space-y-2 p-6">
        <div className="text-xl font-semibold">No conversations yet</div>
        <div className="text-sm">Create your first conversation from the left sidebar.</div>
      </div>
    </div>
  );
}


