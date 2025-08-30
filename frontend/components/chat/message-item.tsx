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
  Sparkles,
} from "lucide-react";
import { formatTimestamp, formatElapsedTime, formatTokensPerSecond, formatTokenCount, copyToClipboard, cn } from "@/lib/utils";
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
  const citations: Array<{ id?: string; title?: string; url?: string; product?: string; score?: number }>
    = (meta && (meta as any).citations) || [];
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
    if (isUser) {
      return (
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 ring-2 ring-blue-100 hover:ring-blue-200 transition-all duration-200">
                  <AvatarFallback className="text-xs bg-blue-50 text-blue-700 font-medium">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">You</p>
                  <p className="text-muted-foreground">{formatTimestamp(message.created_at)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </div>
      );
    }

    if (isAssistant) {
      return (
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 ring-2 ring-emerald-100 hover:ring-emerald-200 transition-all duration-200">
                  <AvatarFallback className="text-xs bg-emerald-50 text-emerald-700 font-medium">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">Assistant</p>
                  <p className="text-muted-foreground">{formatTimestamp(message.created_at)}</p>
                  {meta && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-muted/50 mt-1"
                      onClick={() => setShowMeta(!showMeta)}
                    >
                      {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      <span className="ml-1">Stats</span>
                    </Button>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 ring-2 ring-amber-100 hover:ring-amber-200 transition-all duration-200">
                <AvatarFallback className="text-xs bg-amber-50 text-amber-700 font-medium">
                  S
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-medium">System</p>
                <p className="text-muted-foreground">{formatTimestamp(message.created_at)}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      </div>
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
          {meta.low_confidence && (
            <motion.div
              className="p-2 rounded-md border border-amber-300/60 bg-amber-50 text-amber-800 flex items-center justify-between"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-xs">
                <span className="font-medium">Low confidence</span>
                {typeof meta.confidence_score === "number" && (
                  <span className="ml-2 opacity-80">score: {meta.confidence_score.toFixed(2)}</span>
                )}
              </div>
              <Badge variant="outline" className="h-6">
                Clarifying mode
              </Badge>
            </motion.div>
          )}
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

          {Array.isArray(citations) && citations.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium mb-1">Sources</div>
              <ul className="space-y-1">
                {citations.slice(0, 5).map((c, idx) => (
                  <li key={c.id || idx} className="text-xs truncate">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {c.title || c.url}
                    </a>
                    {c.product && <span className="ml-2 text-muted-foreground">[{c.product}]</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
      <div className="space-y-3 message-spacing">
        <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden chat-message">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
            components={{
              code: (codeProps: any) => {
                const { inline, className, children, ...props } = codeProps as any;
                const match = /language-(\w+)/.exec(className || "");
                return !inline ? (
                  <div className="relative group/code my-4">
                    <pre className={`${className} overflow-x-auto rounded-lg bg-muted/50 p-4 border border-border/50`} {...props}>
                      <code className="text-sm leading-relaxed">{children}</code>
                    </pre>
                    <motion.div
                      className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity duration-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-background/80 bg-background/60 backdrop-blur-sm border border-border/30"
                        onClick={() => copyToClipboard(String(children))}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  </div>
                ) : (
                  <code className={`${className} px-1.5 py-0.5 rounded-md bg-muted/60 text-sm font-mono border border-border/30`} {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children, ...props }) => (
                <p className="mb-3 leading-relaxed text-sm" {...props}>
                  {children}
                </p>
              ),
              h1: ({ children, ...props }) => (
                <h1 className="text-lg font-semibold mb-3 text-foreground border-b border-border/30 pb-2" {...props}>
                  {children}
                </h1>
              ),
              h2: ({ children, ...props }) => (
                <h2 className="text-base font-semibold mb-2 text-foreground" {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 className="text-sm font-semibold mb-2 text-foreground" {...props}>
                  {children}
                </h3>
              ),
              ul: ({ children, ...props }) => (
                <ul className="mb-3 ml-4 space-y-1 list-disc text-sm" {...props}>
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol className="mb-3 ml-4 space-y-1 list-decimal text-sm" {...props}>
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li className="leading-relaxed" {...props}>
                  {children}
                </li>
              ),
              blockquote: ({ children, ...props }) => (
                <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md my-3" {...props}>
                  {children}
                </blockquote>
              ),
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
      className={cn(
        "group relative transition-all duration-200 px-6",
        !isGrouped ? "py-6" : "py-3",
        // ChatGPT-style alternating background based on role
        isUser 
          ? "" // User messages on default background
          : isAssistant 
            ? "bg-muted/30" // Assistant messages on light background
            : "bg-accent/10", // System messages on accent background
        "hover:bg-opacity-60"
      )}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.2, 
        ease: [0.2, 0.8, 0.2, 1],
        delay: isLatest ? 0.1 : 0
      }}
    >
      <div className="flex gap-4 items-start">
        {/* Avatar Column - Consistent positioning */}
        <div className="flex-shrink-0 w-8 flex justify-center">
          {!isGrouped ? renderRole() : <div className="w-8 h-8" />}
        </div>
        
        {/* Content Column */}
        <div className="flex-1 space-y-3 overflow-hidden min-w-0">
          {renderContent()}
          {renderMetadata()}
        </div>

        {/* Action Column - ChatGPT style hover actions */}
        <div className="flex-shrink-0 w-12 flex justify-end">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
            {/* Copy Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8 hover:bg-background/60 rounded-md"
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
            
            {/* Additional actions for assistant messages */}
            {isAssistant && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toast.info("Regenerate coming soon")}
                      className="h-8 w-8 hover:bg-background/60 rounded-md"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Regenerate response</TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
