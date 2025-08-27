"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { streamChat } from "@/lib/stream";
import { Send, Square, Settings2, Thermometer, Hash } from "lucide-react";
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
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background">
      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="p-4 border-b border-border bg-muted/20 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temp-slider" className="text-xs flex items-center gap-1">
                  <Thermometer className="h-3 w-3" />
                  Temperature
                </Label>
                <Badge variant="outline" className="h-5">
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tokens-slider" className="text-xs flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Max Tokens
                </Label>
                <Badge variant="outline" className="h-5">
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
            </div>
          </div>
        </div>
      )}

      {/* Main Composer */}
      <div className="p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              placeholder={isStreaming ? "Generating response..." : "Type your message..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              className="min-h-[44px] max-h-[200px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
              rows={1}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-10 w-10"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            
            {isStreaming ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={handleStop}
                className="h-10 w-10"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!canSend}
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              {isStreaming ? "Generating..." : "Press Enter to send, Shift+Enter for new line"}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {showAdvanced && (
              <>
                <Badge variant="outline" className="h-5">
                  T: {temperature[0]}
                </Badge>
                <Badge variant="outline" className="h-5">
                  Max: {maxTokens[0]}
                </Badge>
              </>
            )}
            
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>↵
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
