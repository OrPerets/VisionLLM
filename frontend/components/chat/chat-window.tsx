"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { MessageItem } from "./message-item";
import { MessageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ArrowDown, Download, Sparkles, MessageCircle } from "lucide-react";
import { isScrolledToBottom, scrollToBottom } from "@/lib/utils";
import { exportConversationJSON, exportConversationMarkdown } from "@/lib/api";
import { toast } from "sonner";

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
      <motion.div 
        className="flex h-full items-center justify-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="text-center text-muted-foreground max-w-md">
          <motion.div
            className="relative mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/40" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <Sparkles className="h-5 w-5 text-blue-400" />
              </motion.div>
            </div>
          </motion.div>
          <motion.h3 
            className="text-xl font-semibold mb-3 text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Start a Conversation
          </motion.h3>
          <motion.p 
            className="text-sm leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Select a conversation from the sidebar or create a new one to begin chatting with your AI assistant.
          </motion.p>
        </div>
      </motion.div>
    );
  }

  if (messages.length === 0) {
    return (
      <motion.div 
        className="flex h-full items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="text-center text-muted-foreground max-w-lg px-8">
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: 0.1, 
              type: "spring", 
              stiffness: 200,
              damping: 20 
            }}
          >
            <div className="relative">
              <MessageCircle className="h-20 w-20 mx-auto text-muted-foreground/30" />
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
          
          <motion.h3 
            className="text-2xl font-semibold mb-4 text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Ready to Chat
          </motion.h3>
          
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-base leading-relaxed">
              {conversation?.title ? (
                <>You're in <span className="font-medium text-foreground">"{conversation.title}"</span></>
              ) : (
                "This is the beginning of your conversation"
              )}
            </p>
            <p className="text-sm opacity-75">
              Type your message below to start the conversation with your AI assistant.
            </p>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="relative h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Export controls */}
      <motion.div 
        className="absolute top-4 right-4 z-10 flex gap-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!selectedConversationId) return;
              try {
                const data = await exportConversationJSON(selectedConversationId);
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `conversation-${selectedConversationId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("JSON exported successfully");
              } catch (e) {
                toast.error("Export failed");
              }
            }}
            className="h-9 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80"
          >
            <Download className="h-4 w-4 mr-2" /> JSON
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!selectedConversationId) return;
              try {
                const text = await exportConversationMarkdown(selectedConversationId);
                const blob = new Blob([text], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `conversation-${selectedConversationId}.md`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Markdown exported successfully");
              } catch (e) {
                toast.error("Export failed");
              }
            }}
            className="h-9 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80"
          >
            <Download className="h-4 w-4 mr-2" /> MD
          </Button>
        </motion.div>
      </motion.div>
      <ScrollArea 
        className="h-full custom-scrollbar"
        onScrollCapture={handleScroll}
      >
        <motion.div 
          ref={scrollAreaRef} 
          className="divide-y divide-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => {
              const isGrouped = index > 0 && 
                messages[index - 1]?.role === message.role &&
                new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() < 5 * 60 * 1000; // 5 minutes
              
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1}
                  isGrouped={isGrouped}
                  showAvatar={!isGrouped}
                />
              );
            })}
          </AnimatePresence>
          
          {/* Loading indicator for streaming */}
          <AnimatePresence>
            {messages.length > 0 && messages[messages.length - 1]?.content === "" && (
              <motion.div 
                className="px-6 py-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 ring-2 ring-emerald-100 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <MessageSkeleton />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div 
            className="absolute bottom-6 right-6"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25 
            }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                size="icon"
                onClick={handleScrollToBottom}
                className="h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-2 border-border/50 hover:bg-background hover:border-border"
              >
                <motion.div
                  animate={{ y: [0, 2, 0] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <ArrowDown className="h-5 w-5" />
                </motion.div>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
