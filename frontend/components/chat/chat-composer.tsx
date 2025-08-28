"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { streamChat } from "@/lib/stream";
import { Send, Square, Settings2, Thermometer, Hash, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatComposerProps {
  onSend?: () => void;
}

export function ChatComposer({ onSend }: ChatComposerProps) {
  const {
    selectedProjectId,
    selectedConversationId,
    getCurrentProject,
    addUserMessage,
    addAssistantMessage,
    appendToAssistantMessage,
    updateAssistantMessage,
  } = useAppStore();

  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentProject = getCurrentProject();
  const canSend = message.trim() && selectedProjectId && selectedConversationId && !isStreaming;

  // Load defaults from project settings
  useEffect(() => {
    if (currentProject?.defaults) {
      setTemperature([currentProject.defaults.temperature || 0.7]);
      setMaxTokens([currentProject.defaults.max_tokens || 2048]);
    }
  }, [currentProject]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  }, [message]);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const userText = message.trim();
    setMessage("");
    setIsStreaming(true);

    try {
      // Add user message
      const userMessage = addUserMessage(selectedConversationId!, userText);
      
      // Add empty assistant message for streaming
      const assistantMessage = addAssistantMessage(selectedConversationId!, "");
      setCurrentMessageId(assistantMessage.id);

      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Start streaming
      await streamChat(
        {
          project_id: selectedProjectId!,
          conversation_id: selectedConversationId!,
          user_text: userText,
          temperature: temperature[0],
          max_tokens: maxTokens[0],
        },
        {
          onDelta: (delta) => {
            appendToAssistantMessage(assistantMessage.id, delta.text);
          },
          onDone: (data) => {
            // Preserve content and attach meta
            updateAssistantMessage(assistantMessage.id, useAppStore.getState().getCurrentMessages().slice(-1)[0]?.content || "", data.meta);
            setCurrentMessageId(null);
            toast.success("Response completed");
          },
          onError: (error) => {
            console.error("Streaming error:", error);
            if (error.name !== "AbortError") {
              toast.error("Failed to get response");
            }
          },
          signal: abortController.signal,
        }
      );
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    } finally {
      setIsStreaming(false);
      setCurrentMessageId(null);
      abortControllerRef.current = null;
      onSend?.();
    }
  }, [
    canSend,
    message,
    selectedProjectId,
    selectedConversationId,
    temperature,
    maxTokens,
    addUserMessage,
    addAssistantMessage,
    appendToAssistantMessage,
    updateAssistantMessage,
    onSend,
  ]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      toast.info("Generation stopped");
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          handleSend();
        } else if (!e.shiftKey) {
          // Allow Shift+Enter for new lines
          e.preventDefault();
          handleSend();
        }
      }
    },
    [handleSend]
  );

  if (!selectedProjectId || !selectedConversationId) {
    return (
      <motion.div 
        className="p-6 text-center text-muted-foreground border-t border-border bg-muted/20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm">Select a conversation to start chatting</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="border-t border-border bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div 
            className="border-b border-border bg-muted/30 backdrop-blur-sm"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temp-slider" className="text-sm font-medium flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      Temperature
                    </Label>
                    <Badge variant="secondary" className="h-6 px-3 font-mono">
                      {temperature[0]}
                    </Badge>
                  </div>
                  <Slider
                    id="temp-slider"
                    min={0}
                    max={2}
                    step={0.1}
                    value={temperature}
                    onValueChange={setTemperature}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls randomness (0=deterministic, 2=very creative)
                  </p>
                </motion.div>

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tokens-slider" className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4 text-purple-500" />
                      Max Tokens
                    </Label>
                    <Badge variant="secondary" className="h-6 px-3 font-mono">
                      {maxTokens[0]}
                    </Badge>
                  </div>
                  <Slider
                    id="tokens-slider"
                    min={50}
                    max={4096}
                    step={50}
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum response length (higher=longer responses)
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Composer */}
      <div className="p-5">
        <motion.div 
          className="flex gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex-1">
            <motion.div
              className="relative"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                ref={textareaRef}
                placeholder={isStreaming ? "AI is thinking..." : "Type your message here..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className={`min-h-[48px] max-h-[200px] resize-none border-2 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200 ${
                  isStreaming ? "opacity-75" : ""
                }`}
                rows={1}
              />
              {isStreaming && (
                <motion.div
                  className="absolute top-3 right-3"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </motion.div>
              )}
            </motion.div>
          </div>
          
          <div className="flex flex-col gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant={showAdvanced ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-12 w-12 transition-all duration-200"
              >
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Settings2 className="h-5 w-5" />
                </motion.div>
              </Button>
            </motion.div>
            
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleStop}
                    className="h-12 w-12"
                  >
                    <Square className="h-5 w-5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: canSend ? 1.05 : 1 }}
                  whileTap={{ scale: canSend ? 0.95 : 1 }}
                >
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`h-12 w-12 transition-all duration-200 ${
                      canSend 
                        ? "bg-primary hover:bg-primary/90 shadow-lg" 
                        : "bg-muted"
                    }`}
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div 
          className="flex items-center justify-between mt-4 text-xs"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              <motion.span
                key={isStreaming ? "generating" : "ready"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={isStreaming ? "text-orange-600 font-medium" : "text-muted-foreground"}
              >
                {isStreaming ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full"
                    />
                    Generating response...
                  </span>
                ) : (
                  "Press Enter to send, Shift+Enter for new line"
                )}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="outline" className="h-6 px-2 font-mono text-xs">
                    T: {temperature[0]}
                  </Badge>
                  <Badge variant="outline" className="h-6 px-2 font-mono text-xs">
                    Max: {maxTokens[0]}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.kbd 
              className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium opacity-100 sm:flex"
              whileHover={{ scale: 1.05 }}
            >
              <span className="text-xs">⌘</span>↵
            </motion.kbd>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
