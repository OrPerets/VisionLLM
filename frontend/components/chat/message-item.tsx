"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { MessageRead } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  User,
  Bot,
  Copy,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Hash,
} from "lucide-react";
import { formatTimestamp, formatElapsedTime, formatTokensPerSecond, formatTokenCount, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface MessageItemProps {
  message: MessageRead;
  isLatest?: boolean;
}

export function MessageItem({ message, isLatest }: MessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMeta, setShowMeta] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";

  const meta = message.meta_json;
  const isLongMessage = message.content.length > 1000;

  const handleCopy = async () => {
    try {
      await copyToClipboard(message.content);
      toast.success("Message copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const renderRole = () => {
    if (isUser) {
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">You</span>
        </div>
      );
    }

    if (isAssistant) {
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-green-100 text-green-600">
              <Bot className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">Assistant</span>
          {meta && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs"
              onClick={() => setShowMeta(!showMeta)}
            >
              {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs bg-orange-100 text-orange-600">
            S
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">System</span>
      </div>
    );
  };

  const renderMetadata = () => {
    if (!meta || !isAssistant) return null;

    return (
      <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs space-y-1">
        <div className="flex flex-wrap gap-2">
          {meta.elapsed_sec && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-5 gap-1">
                  <Clock className="h-3 w-3" />
                  {formatElapsedTime(meta.elapsed_sec)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Response time</TooltipContent>
            </Tooltip>
          )}
          
          {meta.tokens_per_sec && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-5 gap-1">
                  <Zap className="h-3 w-3" />
                  {formatTokensPerSecond(meta.tokens_per_sec)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Tokens per second</TooltipContent>
            </Tooltip>
          )}

          {meta.usage?.total_tokens && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="h-5 gap-1">
                  <Hash className="h-3 w-3" />
                  {formatTokenCount(meta.usage.total_tokens)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p>Total: {meta.usage.total_tokens}</p>
                  {meta.usage.prompt_tokens && <p>Prompt: {meta.usage.prompt_tokens}</p>}
                  {meta.usage.completion_tokens && <p>Completion: {meta.usage.completion_tokens}</p>}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {showMeta && (
          <div className="text-muted-foreground space-y-1 pt-1 border-t">
            <p>Model: {meta.model_id}</p>
            <p>Temperature: {meta.temperature}</p>
            <p>Max tokens: {meta.max_tokens}</p>
            <p>Backend: {meta.backend}</p>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!message.content) {
      return (
        <div className="text-muted-foreground italic">
          {isAssistant ? "Thinking..." : "Empty message"}
        </div>
      );
    }

    const shouldTruncate = isLongMessage && !isExpanded;
    const content = shouldTruncate 
      ? message.content.slice(0, 1000) + "..." 
      : message.content;

    return (
      <div className="space-y-2">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              code: (codeProps: any) => {
                const { inline, className, children, ...props } = codeProps as any;
                const match = /language-(\w+)/.exec(className || "");
                return !inline ? (
                  <div className="relative">
                    <pre className={className} {...props}>
                      <code>{children}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                      onClick={() => copyToClipboard(String(children))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {isLongMessage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show more
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`group relative p-4 hover:bg-muted/30 transition-colors ${isLatest ? "bg-muted/20" : ""}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {renderRole()}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTimestamp(message.created_at)}</span>
            {isSystem && <Badge variant="secondary" className="h-4">System</Badge>}
          </div>
          
          {renderContent()}
          {renderMetadata()}
        </div>

        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
