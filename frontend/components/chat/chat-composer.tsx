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
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, listAgents, recommendAgents, API_BASE } from "@/lib/api";
import type { Agent } from "@/lib/types";
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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);
  const [agentSearch, setAgentSearch] = useState("");
  const [isSearchingAgents, setIsSearchingAgents] = useState(false);
  
  // Curated OpenAI models for selection
  const OPENAI_MODELS = [
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ];
  
  const labelForProvider = useCallback((key: string) => {
    const k = (key || "").toLowerCase();
    if (k === "local") return "Localhost";
    if (k === "openai") return "OpenAI";
    if (k === "google") return "Google";
    return key?.charAt(0).toUpperCase() + key?.slice(1);
  }, []);
  
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

        // Determine if local models are available (ollama/gguf)
        const hasLocal = list.some((m) => {
          const p = (m.provider || "").toLowerCase();
          return p === "ollama" || p === "gguf";
        });

        // Providers from backend (admin-defined)
        let providersFromApi = Array.from(new Set((info.providers || []).map((p) => (p || "").toLowerCase())));
        // Defensive fallback: when public models endpoint returns none but admin configured providers exist
        if (providersFromApi.length === 0) {
          try {
            const adminProviders = await (await fetch(`${API_BASE}/admin/llm/providers`, { credentials: "include"})).json();
            if (Array.isArray(adminProviders)) {
              providersFromApi = Array.from(new Set(adminProviders.filter((p: any) => p?.enabled).map((p: any) => String(p.provider || "").toLowerCase())));
            }
          } catch (err) {
            // ignore
          }
        }

        // Compose provider list: include Localhost when local models exist
        const combined = new Set<string>();
        if (hasLocal) combined.add("local");
        providersFromApi.forEach((p) => combined.add(p));

        // Fallbacks if backend returned nothing and no local
        if (combined.size === 0) {
          // Try to derive from model name prefixes like "openai:gpt-4o"
          const derived = Array.from(new Set(list
            .map((m) => (m.name.includes(":") ? m.name.split(":")[0].toLowerCase() : null))
            .filter((x): x is string => Boolean(x))
          ));
          derived.forEach((p) => combined.add(p));
        }

        setProviders(Array.from(combined));
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

        const hasLocal = list.some((m) => {
          const p = (m.provider || "").toLowerCase();
          return p === "ollama" || p === "gguf";
        });

        let providersFromApi = Array.from(new Set((info.providers || []).map((p) => (p || "").toLowerCase())));
        if (providersFromApi.length === 0) {
          try {
            const adminProviders = await (await fetch(`${API_BASE}/admin/llm/providers`, { credentials: "include"})).json();
            if (Array.isArray(adminProviders)) {
              providersFromApi = Array.from(new Set(adminProviders.filter((p: any) => p?.enabled).map((p: any) => String(p.provider || "").toLowerCase())));
            }
          } catch (err) {
            // ignore
          }
        }

        const combined = new Set<string>();
        if (hasLocal) combined.add("local");
        providersFromApi.forEach((p) => combined.add(p));

        if (combined.size === 0) {
          const derived = Array.from(new Set(list
            .map((m) => (m.name.includes(":") ? m.name.split(":")[0].toLowerCase() : null))
            .filter((x): x is string => Boolean(x))
          ));
          derived.forEach((p) => combined.add(p));
        }

        setProviders(Array.from(combined));
      } catch (e) {
        // ignore
      }
    })();
  }, [selectedConversationId]);

  // Keep provider selection aligned with selected model prefix
  useEffect(() => {
    if (!selectedModel) return;
    if (selectedModel.includes(":")) {
      const prefix = selectedModel.split(":")[0].toLowerCase();
      const mapped = prefix === "ollama" || prefix === "gguf" ? "local" : prefix;
      if (!selectedProvider || selectedProvider !== mapped) setSelectedProvider(mapped);
    }
  }, [selectedModel, selectedProvider]);

  // Load initial agents list
  useEffect(() => {
    (async () => {
      try {
        const items = await listAgents({ limit: 50 });
        setAgents(items);
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
          setAgents(recs.map((r) => r.agent));
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

  // When agent selection changes, apply its defaults to UI controls
  useEffect(() => {
    if (!selectedAgent) return;
    const d = selectedAgent.defaults || {} as any;
    if (typeof d.temperature === "number") setTemperature([Number(d.temperature)]);
    if (typeof d.max_tokens === "number") setMaxTokens([Number(d.max_tokens)]);
    if (typeof d.model_id === "string" && d.model_id) setSelectedModel(String(d.model_id));
    if (typeof d.use_rag === "boolean") setUseRag(Boolean(d.use_rag));
  }, [selectedAgentId]);

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
      className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Centered Composer Container */}
      <div className="mx-auto max-w-4xl w-full">
        {/* Advanced Settings */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              className="border-b border-border/50 bg-muted/30 backdrop-blur-sm"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="p-4 space-y-4">
                {/* Conversation Starters (from selected agent) */}
                {selectedAgent?.starters && selectedAgent.starters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedAgent.starters.slice(0, 6).map((s, idx) => (
                      <Button
                        key={`${idx}-${s}`}
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setMessage(s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="temp-slider" className="text-xs font-medium flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-orange-500" />
                        Temperature
                      </Label>
                      <Badge variant="secondary" className="h-5 px-2 font-mono text-xs">
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
                  </motion.div>

                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tokens-slider" className="text-xs font-medium flex items-center gap-1">
                        <Hash className="h-3 w-3 text-purple-500" />
                        Max Tokens
                      </Label>
                      <Badge variant="secondary" className="h-5 px-2 font-mono text-xs">
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
                  </motion.div>

                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Use RAG</Label>
                      <Badge variant={useRag ? "default" : "secondary"} className="h-5 px-2 text-xs">
                        {useRag ? "On" : "Off"}
                      </Badge>
                    </div>
                    <Button
                      variant={useRag ? "default" : "secondary"}
                      onClick={() => setUseRag(!useRag)}
                      className="w-full h-8 text-xs"
                    >
                      {useRag ? "Disable RAG" : "Enable RAG"}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Composer */}
        <div className="p-4">
          {/* Textarea Container */}
          <motion.div 
            className="relative mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <motion.div
              className="relative chat-input"
              whileFocus={{ scale: 1.002 }}
              transition={{ duration: 0.2 }}
            >
              <Textarea
                ref={textareaRef}
                placeholder={isStreaming ? "AI is responding..." : "Message VisionLLM..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                className={cn(
                  "min-h-[44px] max-h-[160px] resize-none border-2 bg-background",
                  "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
                  "transition-all duration-200 pr-12 text-sm leading-relaxed rounded-xl",
                  isStreaming && "opacity-75"
                )}
                rows={1}
              />
              
              {/* Send/Stop Button */}
              <div className="absolute right-2 bottom-2">
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
                        className="h-8 w-8 rounded-lg"
                      >
                        <Square className="h-3.5 w-3.5" />
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
                        className={cn(
                          "h-8 w-8 rounded-lg transition-all duration-200",
                          canSend 
                            ? "bg-primary hover:bg-primary/90" 
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom Controls */}
          <motion.div 
            className="flex items-center justify-between text-xs"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Left side - Status */}
            <div className="flex items-center gap-2">
              {/* Agent Selector */}
              <Select value={selectedAgentId ? String(selectedAgentId) : undefined} onValueChange={(v) => setSelectedAgentId(v ? parseInt(v) : undefined)}>
                <SelectTrigger className="h-7 w-40 text-xs border-border/50">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear agent */}
              {selectedAgentId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAgentId(undefined)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-2 text-orange-600"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full"
                    />
                    <span className="font-medium">Generating...</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="text-muted-foreground hidden sm:block"
                  >
                    {selectedModel ? `Using ${selectedModel.split(':').pop()}` : "Ready to chat"}
                    {providers.length > 1 && !selectedModel?.includes(':') && (
                      <span className="text-orange-600 ml-2">⚠️ Select a provider model</span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-2">
              {/* Provider Selector */}
              <Select value={selectedProvider} onValueChange={(v) => {
                setSelectedProvider(v);
                if (v === "openai") {
                  // Try to find an existing OpenAI model first
                  const existingOpenaiModel = models.find((m) => m.name.startsWith("openai:"));
                  if (existingOpenaiModel) {
                    setSelectedModel(existingOpenaiModel.name);
                  } else {
                    // Fallback to hardcoded list
                    const def = OPENAI_MODELS[0] || "gpt-4o-mini";
                    setSelectedModel(`openai:${def}`);
                  }
                } else if (v === "local") {
                  const localModel = models.find((m) => {
                    const p = (m.provider || "").toLowerCase();
                    return p === "ollama" || p === "gguf";
                  });
                  setSelectedModel(localModel ? localModel.name : undefined);
                } else {
                  const first = models.find((m) => m.name.startsWith(`${v}:`));
                  setSelectedModel(first ? first.name : undefined);
                }
              }}>
                <SelectTrigger className="h-7 w-16 text-xs border-border/50">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {(providers && providers.length > 0 ? Array.from(new Set(providers)) : ["local"]).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">{labelForProvider(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Model Selector */}
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-7 w-24 text-xs border-border/50">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // For OpenAI, if no models are returned from backend, use hardcoded list
                    if (selectedProvider === "openai") {
                      const openaiModels = models.filter((m) => m.name.startsWith("openai:"));
                      if (openaiModels.length === 0) {
                        // Fallback to hardcoded OpenAI models
                        return OPENAI_MODELS.map((model) => (
                          <SelectItem key={`openai:${model}`} value={`openai:${model}`} className="text-xs">
                            {model}
                          </SelectItem>
                        ));
                      }
                    }
                    
                    return models
                      .filter((m) => {
                        if (!selectedProvider) return true;
                        if (selectedProvider === "local") {
                          const p = (m.provider || "").toLowerCase();
                          return p === "ollama" || p === "gguf";
                        }
                        return m.name.startsWith(`${selectedProvider}:`);
                      })
                      .map((m) => (
                        <SelectItem key={m.name} value={m.name} className="text-xs">
                          {m.name.includes(":") ? m.name.split(":")[1] : m.name}
                        </SelectItem>
                      ));
                  })()}
                </SelectContent>
              </Select>

              {/* Settings Button */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <motion.div
                    animate={{ rotate: showAdvanced ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </motion.div>
                </Button>
              </motion.div>

              {/* Keyboard shortcut hint */}
              <motion.kbd 
                className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-muted/60 px-2 font-mono text-[10px] font-medium opacity-70 sm:flex"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-xs">⌘</span>↵
              </motion.kbd>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
