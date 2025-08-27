"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatComposer } from "@/components/chat/chat-composer";

export default function ChatPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);
  const conversationId = parseInt(params.conversationId as string);

  const {
    selectedProjectId,
    selectedConversationId,
    selectProject,
    selectConversation,
  } = useAppStore();

  useEffect(() => {
    if (!isNaN(projectId) && selectedProjectId !== projectId) {
      selectProject(projectId);
    }
  }, [projectId, selectedProjectId, selectProject]);

  useEffect(() => {
    if (!isNaN(conversationId) && selectedConversationId !== conversationId) {
      selectConversation(conversationId);
    }
  }, [conversationId, selectedConversationId, selectConversation]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <ChatWindow />
      </div>
      <ChatComposer />
    </div>
  );
}
