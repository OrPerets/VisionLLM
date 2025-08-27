"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MessageItem } from "./message-item";
import { MessageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ArrowDown } from "lucide-react";
import { isScrolledToBottom, scrollToBottom } from "@/lib/utils";

export function ChatWindow() {
  const {
    selectedConversationId,
    getCurrentMessages,
    getCurrentConversation,
    loadMessages,
  } = useAppStore();

  const messages = getCurrentMessages();
  const conversation = getCurrentConversation();
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  // Auto-scroll when new messages arrive if user is at bottom
  useEffect(() => {
    const currentMessageCount = messages.length;
    const hasNewMessages = currentMessageCount > prevMessageCount.current;
    
    if (hasNewMessages && isAutoScrolling && scrollAreaRef.current) {
      setTimeout(() => {
        scrollToBottom(scrollAreaRef.current!, true);
      }, 50);
    }
    
    prevMessageCount.current = currentMessageCount;
  }, [messages.length, isAutoScrolling]);

  // Handle scroll events to detect if user scrolled away from bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const atBottom = isScrolledToBottom(target, 100);
    
    setIsAutoScrolling(atBottom);
    setShowScrollToBottom(!atBottom && messages.length > 0);
  };

  const handleScrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollToBottom(scrollAreaRef.current, true);
      setIsAutoScrolling(true);
      setShowScrollToBottom(false);
    }
  };

  if (!selectedConversationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
          <p className="text-sm">
            Select a conversation from the sidebar or create a new one to start chatting.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground max-w-md">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
          <p className="text-sm">
            {conversation?.title ? `This is the beginning of your conversation "${conversation.title}".` : "This is the beginning of your conversation."}
          </p>
          <p className="text-sm mt-2">
            Type a message below to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <ScrollArea 
        className="h-full"
        onScrollCapture={handleScroll}
      >
        <div ref={scrollAreaRef} className="divide-y divide-border">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
            />
          ))}
          
          {/* Loading indicator for streaming */}
          {messages.length > 0 && messages[messages.length - 1]?.content === "" && (
            <div className="p-4">
              <MessageSkeleton />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollToBottom}
            className="h-10 w-10 rounded-full shadow-lg bg-background border-2"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
