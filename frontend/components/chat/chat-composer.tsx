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
import { Send, Square, Settings2, Thermometer, Hash, Loader2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, listAgents, recommendAgents } from "@/lib/api";
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
  const [useRag, setUseRag] = useState(true);
  const [currentMessageId, setCurrentMessageId] = useState<number | null>(null);
  const [models, setModels] = useState<{ name: string; provider?: string | null }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const [agents, setAgents] = useState<{ id: number; name: string; product: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);
  const [agentSearch, setAgentSearch] = useState("");
  const [isSearchingAgents, setIsSearchingAgents] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentProject = getCurrentProject();
  const canSend = message.trim() && selectedProjectId && selectedConversationId && !isStreaming;
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Load defaults from project settings
  useEffect(() => {
    if (currentProject?.defaults) {
      setTemperature([currentProject.defaults.temperature || 0.7]);
      setMaxTokens([currentProject.defaults.max_tokens || 2048]);
      if (currentProject.defaults.model_id) {
        setSelectedModel(currentProject.defaults.model_id);
      }
    }
  }, [currentProject]);

  // Load available models and providers for dropdowns
  useEffect(() => {
    (async () => {
      try {
        const info = await getModels();
        const list = (info.models || []).map((m) => ({ name: m.name, provider: (m as any).provider || (m as any).format || null }));
        setModels(list);
        const providersFromApi = (info.providers || []).map((p) => p);
        if (providersFromApi.length > 0) {
          setProviders(providersFromApi);
        } else {
          // Derive providers from model name prefixes like "openai:gpt-4o"
          const derived = Array.from(new Set(list
            .map((m) => (m.name.includes(":") ? m.name.split(":")[0] : null))
            .filter((x): x is string => Boolean(x))
          ));
          setProviders(derived);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Refetch models/providers when conversation changes (e.g., after creating a new chat)
  useEffect(() => {
    if (!selectedConversationId) return;
    (async () => {
      try {
        const info = await getModels();
        const list = (info.models || []).map((m) => ({ name: m.name, provider: (m as any).provider || (m as any).format || null }));
        setModels(list);
        const providersFromApi = (info.providers || []).map((p) => p);
        const derived = Array.from(new Set(list
          .map((m) => (m.name.includes(":") ? m.name.split(":")[0] : null))
          .filter((x): x is string => Boolean(x))
        ));
        setProviders(providersFromApi.length > 0 ? providersFromApi : derived);
      } catch (e) {
        // ignore
      }
    })();
  }, [selectedConversationId]);

  // Keep provider selection aligned with selected model prefix
  useEffect(() => {
    if (!selectedModel) return;
    if (selectedModel.includes(":")) {
      const prefix = selectedModel.split(":")[0];
      if (!selectedProvider) setSelectedProvider(prefix);
    }
  }, [selectedModel, selectedProvider]);

  // Load initial agents list
  useEffect(() => {
    (async () => {
      try {
        const items = await listAgents({ limit: 50 });
        setAgents(items.map((a) => ({ id: a.id, name: a.name, product: a.product })));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Recommend agents when user types in agent search
  useEffect(() => {
    const q = agentSearch.trim();
    if (!q) return;
    let cancelled = false;
    (async () => {
      setIsSearchingAgents(true);
      try {
        const recs = await recommendAgents({ q, top_k: 8 });
        if (!cancelled) {
          setAgents(recs.map((r) => ({ id: r.agent.id, name: r.agent.name, product: r.agent.product })));
        }
      } catch (e) {
        // ignore
      } finally {
        if (!cancelled) setIsSearchingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentSearch]);

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
          use_rag: useRag,
          model_id: selectedModel,
          agent_id: selectedAgentId,
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

                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Use RAG</Label>
                    <Badge variant={useRag ? "default" : "secondary"} className="h-6 px-3">
                      {useRag ? "On" : "Off"}
                    </Badge>
                  </div>
                  <Button
                    variant={useRag ? "default" : "secondary"}
                    onClick={() => setUseRag(!useRag)}
                    className="w-full"
                  >
                    {useRag ? "Disable RAG" : "Enable RAG"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Retrieve docs and cite sources.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Composer */}
      <div className="p-4 sm:p-5">
        <motion.div 
          className="flex gap-3 items-end"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Message Input Area */}
          <div className="flex-1 min-w-0">
            <motion.div
              className="relative chat-input"
              whileFocus={{ scale: 1.005 }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                ref={textareaRef}
                placeholder={isStreaming ? "AI is thinking..." : "Type your message here..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className={`min-h-[48px] max-h-[200px] resize-none border-2 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200 pr-10 ${
                  isStreaming ? "opacity-75" : ""
                } text-sm leading-relaxed`}
                rows={1}
              />
              {isStreaming && (
                <motion.div
                  className="absolute top-3 right-3 z-10"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="bg-background/80 backdrop-blur-sm rounded-full p-1">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            {/* Provider + Model Selector */}
            <div className="min-w-[140px]">
              <Select value={selectedProvider} onValueChange={(v) => {
                setSelectedProvider(v);
                // Reset model when provider changes
                setSelectedModel(undefined);
              }}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.length > 0 ? (
                    providers.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="local">local</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models
                    .filter((m) => {
                      if (!selectedProvider) return true;
                      const providerPrefix = `${selectedProvider}:`;
                      return m.name.startsWith(providerPrefix);
                    })
                    .map((m) => (
                      <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agent Picker */}
            <div className="min-w-[220px]">
              <div className="relative">
                <input
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder={selectedAgentId ? `Agent: ${agents.find(a=>a.id===selectedAgentId)?.name}` : "Search agents (optional)"}
                  className="h-12 w-full rounded-md border bg-background/50 px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50"
                />
                {isSearchingAgents && (
                  <div className="absolute right-2 top-3.5 opacity-70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
              {agentSearch.trim() && agents.length > 0 && (
                <div className="mt-1 max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${selectedAgentId===a.id ? "bg-muted" : ""}`}
                      onClick={() => {
                        setSelectedAgentId(a.id);
                        setAgentSearch("");
                        toast.success(`Selected agent: ${a.name}`);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{a.name}</span>
                        <Badge variant="outline" className="ml-2 capitalize">{a.product}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant={showAdvanced ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="h-12 w-12 transition-all duration-200 border border-border/50 hover:border-border chat-hover"
              >
                <motion.div
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Settings2 className="h-4 w-4" />
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleStop}
                    className="h-12 w-12 shadow-md"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: canSend ? 1.02 : 1 }}
                  whileTap={{ scale: canSend ? 0.98 : 1 }}
                >
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`h-12 w-12 transition-all duration-200 chat-hover ${
                      canSend 
                        ? "bg-primary hover:bg-primary/90 shadow-lg border-primary/20" 
                        : "bg-muted border border-border/50"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-3 text-xs"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Status Message */}
          <div className="flex items-center gap-2 min-w-0">
            <AnimatePresence mode="wait">
              <motion.span
                key={isStreaming ? "generating" : "ready"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`flex items-center gap-2 ${isStreaming ? "text-orange-600 font-medium" : "text-muted-foreground"} truncate`}
              >
                {isStreaming ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full flex-shrink-0"
                    />
                    <span className="truncate">Generating response...</span>
                  </>
                ) : (
                  <span className="hidden sm:inline">Press Enter to send, Shift+Enter for new line</span>
                )}
              </motion.span>
            </AnimatePresence>
          </div>
          
          {/* Controls and Settings */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedAgent && (
              <motion.div 
                className="flex items-center gap-1"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <Badge variant="secondary" className="h-6 px-2 truncate max-w-[220px]">
                  <span className="opacity-70 mr-1">Agent:</span>
                  <span className="font-medium truncate">{selectedAgent.name}</span>
                  <span className="ml-1 opacity-60 capitalize">({selectedAgent.product})</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedAgentId(undefined);
                    toast.info("Cleared agent selection");
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Badge variant="outline" className="h-6 px-2 font-mono text-xs bg-background/50">
                    T: {temperature[0]}
                  </Badge>
                  <Badge variant="outline" className="h-6 px-2 font-mono text-xs bg-background/50">
                    Max: {maxTokens[0]}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.kbd 
              className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted/60 px-2 font-mono text-[10px] font-medium opacity-100 sm:flex backdrop-blur-sm"
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
