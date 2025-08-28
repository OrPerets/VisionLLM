"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import { motion, AnimatePresence } from "framer-motion";
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
  Check,
} from "lucide-react";
import { formatTimestamp, formatElapsedTime, formatTokensPerSecond, formatTokenCount, copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

interface MessageItemProps {
  message: MessageRead;
  isLatest?: boolean;
  isGrouped?: boolean;
  showAvatar?: boolean;
}

export function MessageItem({ message, isLatest, isGrouped = false, showAvatar = true }: MessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMeta, setShowMeta] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";

  const meta = message.meta_json;
  const isLongMessage = message.content.length > 1000;

  const handleCopy = async () => {
    try {
      await copyToClipboard(message.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy message");
    }
  };

  const renderRole = () => {
    if (!showAvatar && isGrouped) {
      return null;
    }

    if (isUser) {
      return (
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Avatar className="h-8 w-8 ring-2 ring-blue-100">
            <AvatarFallback className="text-xs bg-blue-50 text-blue-700 font-medium">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">You</span>
            <span className="text-xs text-muted-foreground">{formatTimestamp(message.created_at)}</span>
          </div>
        </motion.div>
      );
    }

    if (isAssistant) {
      return (
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Avatar className="h-8 w-8 ring-2 ring-emerald-100">
            <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700 font-medium">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Assistant</span>
            <span className="text-xs text-muted-foreground">{formatTimestamp(message.created_at)}</span>
            {meta && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-muted/50"
                  onClick={() => setShowMeta(!showMeta)}
                >
                  {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  <span className="ml-1">Stats</span>
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <Avatar className="h-8 w-8 ring-2 ring-amber-100">
          <AvatarFallback className="text-xs bg-amber-50 text-amber-700 font-medium">
            S
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">System</span>
          <span className="text-xs text-muted-foreground">{formatTimestamp(message.created_at)}</span>
          <Badge variant="secondary" className="h-5 text-xs">System</Badge>
        </div>
      </motion.div>
    );
  };

  const renderMetadata = () => {
    if (!meta || !isAssistant) return null;

    return (
      <AnimatePresence>
        <motion.div 
          className="mt-4 p-3 bg-muted/30 border border-muted/50 rounded-lg text-xs space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="flex flex-wrap gap-2">
            {meta.elapsed_sec && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="h-6 gap-1.5 bg-blue-50 text-blue-700 border-blue-200">
                      <Clock className="h-3 w-3" />
                      {formatElapsedTime(meta.elapsed_sec)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Response time</TooltipContent>
                </Tooltip>
              </motion.div>
            )}
            
            {meta.tokens_per_sec && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="h-6 gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Zap className="h-3 w-3" />
                      {formatTokensPerSecond(meta.tokens_per_sec)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Tokens per second</TooltipContent>
                </Tooltip>
              </motion.div>
            )}

            {meta.usage?.total_tokens && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="h-6 gap-1.5 bg-purple-50 text-purple-700 border-purple-200">
                      <Hash className="h-3 w-3" />
                      {formatTokenCount(meta.usage.total_tokens)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">Token Usage</p>
                      <p>Total: {meta.usage.total_tokens}</p>
                      {meta.usage.prompt_tokens && <p>Prompt: {meta.usage.prompt_tokens}</p>}
                      {meta.usage.completion_tokens && <p>Completion: {meta.usage.completion_tokens}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {showMeta && (
              <motion.div 
                className="text-muted-foreground space-y-2 pt-2 border-t border-muted/50"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium text-foreground">Model:</span>
                    <br />
                    <span className="font-mono">{meta.model_id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Backend:</span>
                    <br />
                    <span className="font-mono">{meta.backend}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Temperature:</span>
                    <br />
                    <span className="font-mono">{meta.temperature}</span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Max tokens:</span>
                    <br />
                    <span className="font-mono">{meta.max_tokens}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
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
                    <motion.div
                      className="absolute top-2 right-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-background/80"
                        onClick={() => copyToClipboard(String(children))}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
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
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs mt-2 hover:bg-muted/50"
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
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      className={`group relative transition-all duration-200 ${
        isLatest ? "bg-muted/20" : ""
      } ${!isGrouped ? "py-6 px-6" : "py-2 px-6 ml-11"} hover:bg-muted/40`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.2, 
        ease: [0.2, 0.8, 0.2, 1],
        delay: isLatest ? 0.1 : 0
      }}
    >
      <div className="flex gap-4">
        {!isGrouped && (
          <div className="flex-shrink-0 w-8">
            {renderRole()}
          </div>
        )}
        
        <div className={`flex-1 min-w-0 space-y-3 ${isGrouped ? "ml-0" : ""}`}>
          {renderContent()}
          {renderMetadata()}
        </div>

        <div className="flex-shrink-0">
          <motion.div
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0 hover:bg-background/60"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy message"}</TooltipContent>
            </Tooltip>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
