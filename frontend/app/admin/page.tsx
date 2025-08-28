"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/common/status-indicator";
import { getHealth, getMeta, API_BASE, getRecentActivity, searchAll, listUsers, updateUserRole, getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember, getProjects, adminCleanupDB, getModels, pullModel, deleteModel, listLLMProviders, createLLMProvider, updateLLMProvider, deleteLLMProvider, adminListAgents, adminCreateAgent, adminUpdateAgent, adminDeleteAgent } from "@/lib/api";
import { Health, Meta, ActivityLog, UserRead, ProjectMemberRead, ProjectRead, ModelsResponse, Agent, AgentCreate } from "@/lib/types";
import { RefreshCw, Server, Database, Cpu, Clock, ShieldAlert, Users, Search, Shield, AlertTriangle, Activity, BarChart3, Settings2, LogOut, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user, logoutUser } = useAppStore();
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ projects: any[]; conversations: any[] }>({ projects: [], conversations: [] });
  const [users, setUsers] = useState<UserRead[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [members, setMembers] = useState<ProjectMemberRead[]>([]);
  const [projects, setProjects] = useState<ProjectRead[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("worker");
  const [maintenanceLoading, setMaintenanceLoading] = useState<string | null>(null);
  const [modelsInfo, setModelsInfo] = useState<ModelsResponse | null>(null);
  const [pulling, setPulling] = useState(false);
  const [modelToPull, setModelToPull] = useState("");
  const [providers, setProviders] = useState<any[]>([]);
  const [newProvider, setNewProvider] = useState<{ provider: string; name?: string; api_key?: string; base_url?: string } | null>({ provider: "openai", name: "OpenAI" });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [newAgent, setNewAgent] = useState<AgentCreate>({ name: "", product: "snowflake", system_instructions: "" });

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const [healthData, metaData] = await Promise.all([
        getHealth(),
        getMeta(),
      ]);
      setHealth(healthData);
      setMeta(metaData);
      setLastChecked(new Date());
      try {
        const [act] = await Promise.all([
          getRecentActivity(25),
        ]);
        setActivity(act);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      toast.error("Failed to fetch backend status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchStatus();
      // Load projects list
      getProjects().then(setProjects).catch(() => {});
      // Load models info
      getModels().then(setModelsInfo).catch(() => {});
      // Load providers
      listLLMProviders().then(setProviders).catch(() => {});
      // Load agents
      adminListAgents().then(setAgents).catch(() => {});
    }
  }, [user]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults({ projects: [], conversations: [] });
      return;
    }
    try {
      const res = await searchAll(searchQuery.trim());
      setSearchResults(res);
    } catch (e) {
      // ignore
    }
  };

  const loadMembers = async (projectId: number) => {
    try {
      const items = await getProjectMembers(projectId);
      setMembers(items);
    } catch (e) {}
  };

  const handleUserSearch = async () => {
    try {
      const res = await listUsers(userSearch.trim() || undefined);
      setUsers(res);
    } catch (e) {}
  };

  const getOverallStatus = () => {
    if (!health || !meta) return "offline";
    if (!health.ok) return "error";
    if (!meta.model_server_ok) return "warning";
    return "online";
  };

  const getStatusMessage = () => {
    if (!health || !meta) return "Unable to connect to backend";
    if (!health.ok) return "Backend service is not responding";
    if (!meta.model_server_ok) return "Model server is not available";
    return "All systems operational";
  };

  if (!user || user.role !== "admin") {
    return (
      <motion.div
        className="flex h-full items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <motion.div
            className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <ShieldAlert className="h-8 w-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-gradient mb-2">Admin Access Required</h1>
            <p className="text-gray-600">You need administrator privileges to view this page.</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Admin Header */}
      <motion.header
        className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-2 bg-gradient-to-br from-app-blue to-app-cyan rounded-xl shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <BarChart3 className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">VisionBI Admin</h1>
                <p className="text-sm text-gray-600">System Management Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="glass"
                size="sm"
                onClick={fetchStatus}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-sm hidden sm:block">
                    <div className="font-medium text-gray-900">{user?.name || user?.email}</div>
                    <div className="text-xs text-gray-600">Administrator</div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await logoutUser();
                    router.push('/login');
                  }}
                  className="gap-2 text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* Status Overview Cards */}
        <motion.div
          className="grid gap-8 lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, staggerChildren: 0.1 }}
        >
          {/* Overall Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-app-blue to-app-cyan rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Server className="h-5 w-5 text-white" />
                  </motion.div>
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <StatusIndicator
                    status={getOverallStatus()}
                    text={getStatusMessage()}
                    size="lg"
                  />
                  {lastChecked && (
                    <p className="text-xs text-gray-500">
                      Updated {lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-app-blue">
                        {projects.length}
                      </div>
                      <div className="text-xs text-gray-500">Projects</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-app-cyan">
                        {users.length}
                      </div>
                      <div className="text-xs text-gray-500">Users</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Backend Health */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Database className="h-5 w-5 text-white" />
                  </motion.div>
                  Backend API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <StatusIndicator
                    status={health?.ok ? "online" : "error"}
                    text={health?.ok ? "Healthy" : "Unavailable"}
                  />
                  {meta && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Version</span>
                        <Badge variant="outline" className="text-xs">
                          {meta.backend_version}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Model Server */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <motion.div
                    className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Cpu className="h-5 w-5 text-white" />
                  </motion.div>
                  AI Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <StatusIndicator
                    status={meta?.model_server_ok ? "online" : "error"}
                    text={meta?.model_server_ok ? "Available" : "Unavailable"}
                  />
                  {meta && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Model</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {meta.model_id}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Admin Console */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Card className="relative overflow-hidden bg-white border border-gray-200 shadow-lg">
            <CardHeader className="border-b border-gray-200 bg-gray-50">
              <CardTitle className="flex items-center gap-3 text-2xl text-gray-900">
                <motion.div
                  className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Settings2 className="h-7 w-7 text-white" />
                </motion.div>
                Administration Center
              </CardTitle>
              <CardDescription className="text-lg text-gray-700">
                System management, user controls, and activity monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              {/* Models Management */}
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                    <Cpu className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xl text-gray-900">Models Management</div>
                    <div className="text-gray-700">Manage available models for the selected backend</div>
                  </div>
                </motion.div>
                <div className="space-y-3">
                  <div className="text-xs text-gray-600">
                    Backend: <Badge variant="outline" className="ml-1">{modelsInfo?.backend || ""}</Badge>
                    {modelsInfo?.default_model_id && (
                      <span className="ml-3">Default model: <span className="font-mono">{modelsInfo.default_model_id}</span></span>
                    )}
                    {modelsInfo?.current_ollama_model && (
                      <span className="ml-3">Ollama current: <span className="font-mono">{modelsInfo.current_ollama_model}</span></span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="ollama model name (e.g., llama3.2:3b-instruct)"
                      value={modelToPull}
                      onChange={(e) => setModelToPull(e.target.value)}
                      className="w-96"
                    />
                    <Button
                      variant="outline"
                      disabled={pulling || !modelToPull.trim()}
                      onClick={async () => {
                        try {
                          setPulling(true);
                          const res = await pullModel(modelToPull.trim());
                          if (res.ok) {
                            toast.success(`Pulled ${modelToPull.trim()}`);
                            const info = await getModels();
                            setModelsInfo(info);
                          } else {
                            toast.error(res.status || "Failed to pull model");
                          }
                        } catch (e) {
                          toast.error("Pull failed");
                        } finally {
                          setPulling(false);
                        }
                      }}
                    >
                      {pulling ? "Pulling..." : "Pull model"}
                    </Button>
                    <Button variant="ghost" onClick={async () => { try { const info = await getModels(); setModelsInfo(info); toast.success("Refreshed"); } catch {} }}>Refresh</Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="p-2">Name</th>
                          <th className="p-2">Format</th>
                          <th className="p-2">Size</th>
                          <th className="p-2">Quant</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelsInfo?.models?.map((m, idx) => (
                          <tr key={`${m.name}-${idx}`} className="border-b last:border-0">
                            <td className="p-2 font-mono truncate max-w-md" title={m.name}>{m.name}</td>
                            <td className="p-2">{m.format || m.source || ""}</td>
                            <td className="p-2">{typeof m.size_bytes === 'number' ? `${(m.size_bytes / (1024*1024)).toFixed(1)} MB` : m.parameter_size || '—'}</td>
                            <td className="p-2">{m.quantization || '—'}</td>
                            <td className="p-2 text-right">
                              {m.source === 'ollama' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await deleteModel(m.name);
                                      toast.success('Deleted');
                                      const info = await getModels();
                                      setModelsInfo(info);
                                    } catch (e) {
                                      toast.error('Delete failed');
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {(!modelsInfo?.models || modelsInfo.models.length === 0) && (
                          <tr>
                            <td className="p-3 text-gray-600" colSpan={5}>No models found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Providers Management */}
                <div className="mt-8 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900">LLM Providers</div>
                    <Button variant="ghost" size="sm" onClick={async () => { try { const items = await listLLMProviders(); setProviders(items); } catch {} }}>Refresh</Button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {providers.map((p) => (
                        <div key={p.id} className="p-3 border rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{p.name || p.provider}</div>
                              <div className="text-xs text-gray-500">{p.provider} {p.base_url ? `(custom)` : ""}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={p.enabled ? "default" : "secondary"}>{p.enabled ? "Enabled" : "Disabled"}</Badge>
                              <Button variant="ghost" size="sm" onClick={async () => { await deleteLLMProvider(p.id); const items = await listLLMProviders(); setProviders(items); }}>Remove</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {providers.length === 0 && (
                        <div className="text-sm text-gray-600">No providers configured</div>
                      )}
                    </div>
                  </div>

                  {/* Quick add */}
                  <div className="p-3 border rounded-md space-y-2">
                    <div className="font-medium">Add Provider</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Select value={newProvider?.provider || "openai"} onValueChange={(v) => setNewProvider({ ...(newProvider || { provider: v }), provider: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="google">Google Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Name (optional)" value={newProvider?.name || ""} onChange={(e) => setNewProvider({ ...(newProvider || { provider: "openai" }), name: e.target.value })} />
                      <Input placeholder="API Key" value={newProvider?.api_key || ""} onChange={(e) => setNewProvider({ ...(newProvider || { provider: "openai" }), api_key: e.target.value })} />
                      <Input placeholder="Base URL (optional)" value={newProvider?.base_url || ""} onChange={(e) => setNewProvider({ ...(newProvider || { provider: "openai" }), base_url: e.target.value })} />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          if (!newProvider?.provider || !newProvider.api_key) { toast.error("Provider and API key required"); return; }
                          try {
                            await createLLMProvider({ provider: newProvider.provider, name: newProvider.name, api_key: newProvider.api_key, base_url: newProvider.base_url });
                            const items = await listLLMProviders();
                            setProviders(items);
                            setNewProvider({ provider: "openai", name: "OpenAI" });
                            toast.success("Provider saved");
                            const info = await getModels();
                            setModelsInfo(info);
                          } catch (e) {
                            toast.error("Failed to save provider");
                          }
                        }}
                      >Save Provider</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Global Search */}
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="p-3 bg-gradient-to-br from-app-blue to-app-cyan rounded-xl shadow-lg">
                    <Search className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xl text-gray-900">Global Search</div>
                    <div className="text-gray-700">Find projects and conversations across the system</div>
                  </div>
                </motion.div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Input
                    variant="glass"
                    inputSize="lg"
                    placeholder="Search projects and conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button variant="gradient" size="lg" onClick={handleSearch} className="sm:w-auto">
                    <Search className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </div>
                {(searchResults.projects.length > 0 || searchResults.conversations.length > 0) && (
                  <motion.div
                    className="grid md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-blue-700">Projects</div>
                      <div className="space-y-2">
                        {searchResults.projects.map((p) => (
                          <motion.div
                            key={p.id}
                            className="flex items-center justify-between p-2 bg-white rounded-md hover:bg-gray-100 transition-colors border border-gray-100"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-sm font-medium">{p.name}</span>
                            <Badge variant="outline" className="text-xs">#{p.id}</Badge>
                          </motion.div>
                        ))}
                        {searchResults.projects.length === 0 && (
                          <div className="text-sm text-gray-600 italic">No matches</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-cyan-700">Conversations</div>
                      <div className="space-y-2">
                        {searchResults.conversations.map((c) => (
                          <motion.div
                            key={c.id}
                            className="flex items-center justify-between p-2 bg-white rounded-md hover:bg-gray-100 transition-colors border border-gray-100"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-sm font-medium truncate">{c.title}</span>
                            <Badge variant="outline" className="text-xs">#{c.id}</Badge>
                          </motion.div>
                        ))}
                        {searchResults.conversations.length === 0 && (
                          <div className="text-sm text-gray-600 italic">No matches</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
          </div>

              <Separator className="bg-gray-200" />

              {/* Agents Management */}
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                >
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl shadow-lg">
                    <Menu className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xl text-gray-900">Agents</div>
                    <div className="text-gray-700">Create, update, and remove domain agents</div>
                  </div>
                </motion.div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search agents..." value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') { try { const items = await adminListAgents(agentSearch.trim() || undefined); setAgents(items); } catch {} } }} />
                  <Button variant="outline" onClick={async () => { try { const items = await adminListAgents(agentSearch.trim() || undefined); setAgents(items); } catch {} }}>Search</Button>
                  <Button variant="ghost" onClick={async () => { try { setAgentSearch(""); const items = await adminListAgents(); setAgents(items); } catch {} }}>Reset</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {agents.map((a) => (
                    <div key={a.id} className="p-3 border rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{a.name}</div>
                          <div className="text-xs text-gray-500">{a.product} • {a.tags?.join(", ") || "no tags"}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={a.is_enabled ? "default" : "secondary"}>{a.is_enabled ? "Enabled" : "Disabled"}</Badge>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            try {
                              await adminDeleteAgent(a.id);
                              const items = await adminListAgents(agentSearch.trim() || undefined);
                              setAgents(items);
                              toast.success("Deleted agent");
                            } catch { toast.error("Delete failed"); }
                          }}>Delete</Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-700 line-clamp-3">{a.description || ""}</div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <div className="text-sm text-gray-600">No agents found</div>
                  )}
                </div>

                {/* Quick create agent */}
                <div className="p-3 border rounded-md space-y-3">
                  <div className="font-medium">Create Agent</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Name" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} />
                    <Select value={newAgent.product} onValueChange={(v) => setNewAgent({ ...newAgent, product: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="snowflake">snowflake</SelectItem>
                        <SelectItem value="dbt">dbt</SelectItem>
                        <SelectItem value="tableau">tableau</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Comma tags (optional)" onChange={(e) => setNewAgent({ ...newAgent, tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  </div>
                  <Input placeholder="Description (optional)" value={newAgent.description || ""} onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })} />
                  <Input placeholder="Categories comma-separated (optional)" onChange={(e) => setNewAgent({ ...newAgent, categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  <Input placeholder="Knowledge URLs comma-separated (optional)" onChange={(e) => setNewAgent({ ...newAgent, knowledge_urls: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input placeholder="Default model_id (optional)" onChange={(e) => setNewAgent({ ...newAgent, defaults: { ...(newAgent.defaults || {}), model_id: e.target.value } })} />
                    <Input placeholder="Default temperature (optional)" type="number" onChange={(e) => setNewAgent({ ...newAgent, defaults: { ...(newAgent.defaults || {}), temperature: parseFloat(e.target.value) } })} />
                    <Input placeholder="Default max_tokens (optional)" type="number" onChange={(e) => setNewAgent({ ...newAgent, defaults: { ...(newAgent.defaults || {}), max_tokens: parseInt(e.target.value || "0") || undefined } })} />
                  </div>
                  <textarea
                    placeholder="System instructions"
                    value={newAgent.system_instructions}
                    onChange={(e) => setNewAgent({ ...newAgent, system_instructions: e.target.value })}
                    className="w-full min-h-[120px] p-2 border rounded-md text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        if (!newAgent.name.trim() || !newAgent.product || !newAgent.system_instructions.trim()) { toast.error("Name, product, and instructions are required"); return; }
                        try {
                          const created = await adminCreateAgent({ ...newAgent, is_enabled: true });
                          toast.success(`Created agent #${created.id}`);
                          setNewAgent({ name: "", product: "snowflake", system_instructions: "" });
                          const items = await adminListAgents(agentSearch.trim() || undefined);
                          setAgents(items);
                        } catch (e) {
                          toast.error("Create failed");
                        }
                      }}
                    >Create Agent</Button>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xl text-gray-900">Recent Activity</div>
                    <div className="text-gray-700">Latest 25 system events</div>
                  </div>
                </motion.div>
                <div className="max-h-80 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 backdrop-blur-sm">
                      <tr className="text-left border-b border-gray-200">
                        <th className="p-3 font-semibold">Time</th>
                        <th className="p-3 font-semibold">Action</th>
                        <th className="p-3 font-semibold">Object</th>
                        <th className="p-3 font-semibold">Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.map((a, index) => (
                        <motion.tr
                          key={a.id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-100 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.3 }}
                        >
                          <td className="p-3 whitespace-nowrap text-xs">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {a.action}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {a.object_type} #{a.object_id}
                          </td>
                          <td className="p-3 text-xs">
                            {a.project_id ? `#${a.project_id}` : "-"}
                          </td>
                        </motion.tr>
                      ))}
                      {activity.length === 0 && (
                        <tr>
                          <td className="p-6 text-gray-600 text-center italic" colSpan={4}>
                            No recent activity
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Users and Roles */}
          <div className="space-y-6">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900">Users & Roles</div>
                <div className="text-gray-700">Manage user permissions and access levels</div>
              </div>
            </motion.div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search users by name or email"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
              />
              <Button variant="outline" onClick={handleUserSearch}>Search</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">User</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="p-2">{u.name || '—'}</td>
                      <td className="p-2">{u.email || '—'}</td>
                      <td className="p-2">
                        <Select value={u.role || 'worker'} onValueChange={async (val) => {
                          const oldRole = u.role || 'worker';
                          // Optimistic update
                          const updatedUsers = users.map(user => 
                            user.id === u.id ? { ...user, role: val } : user
                          );
                          setUsers(updatedUsers);
                          
                          try {
                            await updateUserRole(u.id, val);
                            toast.success(`Updated ${u.name || u.email || `user #${u.id}`} role to ${val}`);
                          } catch (e: any) {
                            // Rollback on error
                            const rolledBackUsers = users.map(user => 
                              user.id === u.id ? { ...user, role: oldRole } : user
                            );
                            setUsers(rolledBackUsers);
                            
                            if (e.status === 429) {
                              toast.error("Too many requests. Please wait and try again.");
                            } else if (e.status === 401 || e.status === 403) {
                              toast.error("Access denied. Admin permissions required.");
                            } else {
                              toast.error('Failed to update role');
                            }
                          }
                        }}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="worker">worker</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="p-2 text-gray-600" colSpan={3}>No users</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Project Members */}
          <div className="space-y-6">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl text-gray-900">Project Membership</div>
                <div className="text-gray-700">Manage user access to specific projects</div>
              </div>
            </motion.div>
            <div className="flex items-center gap-2">
              <Select onValueChange={(val) => { const id = parseInt(val); setSelectedProjectId(id); loadMembers(id); }}>
                <SelectTrigger className="h-8 w-64">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProjectId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add member by email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-80"
                  />
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">worker</SelectItem>
                      <SelectItem value="admin">admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedProjectId || !newMemberEmail.trim()) return;
                      try {
                        await addProjectMember(selectedProjectId, { email: newMemberEmail.trim(), role_in_project: newMemberRole });
                        setNewMemberEmail("");
                        await loadMembers(selectedProjectId);
                        toast.success('Member added');
                      } catch (e) {
                        toast.error('Failed to add member');
                      }
                    }}
                  >
                    Add member
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-2">User ID</th>
                        <th className="p-2">Role</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="p-2">{m.user_id}</td>
                          <td className="p-2">
                            <Select defaultValue={m.role_in_project} onValueChange={async (val) => {
                              try {
                                if (!selectedProjectId) return;
                                await updateProjectMember(selectedProjectId, m.user_id, { role_in_project: val });
                                toast.success('Updated');
                                await loadMembers(selectedProjectId);
                              } catch (e) { toast.error('Failed'); }
                            }}>
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="worker">worker</SelectItem>
                                <SelectItem value="admin">admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  if (!selectedProjectId) return;
                                  await removeProjectMember(selectedProjectId, m.user_id);
                                  await loadMembers(selectedProjectId);
                                  toast.success('Removed');
                                } catch (e) { toast.error('Failed'); }
                              }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr>
                          <td className="p-2 text-gray-600" colSpan={3}>No members</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <Separator className="bg-gray-200" />

          {/* Maintenance (Danger Zone) */}
          <div className="space-y-6">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-xl text-red-700">Maintenance & Danger Zone</div>
                <div className="text-gray-700">Permanent data operations - use with extreme caution</div>
              </div>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Button
                variant="destructive"
                size="sm"
                disabled={maintenanceLoading !== null}
                onClick={async () => {
                  if (!confirm("This will permanently delete all chat history and activity logs. Are you sure?")) return;
                  setMaintenanceLoading("chat");
                  try {
                    const result = await adminCleanupDB("chat");
                    const counts = result.counts || {};
                    const message = Object.entries(counts)
                      .map(([table, count]) => `${table}: ${count}`)
                      .join(", ");
                    toast.success(`Cleared chat data: ${message}`);
                    // Refresh activity after cleanup
                    try {
                      const newActivity = await getRecentActivity(25);
                      setActivity(newActivity);
                    } catch (e) {}
                  } catch (e: any) {
                    if (e.status === 429) {
                      toast.error("Too many requests. Please wait and try again.");
                    } else if (e.status === 401 || e.status === 403) {
                      toast.error("Access denied. Admin permissions required.");
                    } else {
                      toast.error("Failed to clear chat data");
                    }
                  } finally {
                    setMaintenanceLoading(null);
                  }
                }}
              >
                {maintenanceLoading === "chat" ? "Clearing..." : "Clear chats & activity"}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                disabled={maintenanceLoading !== null}
                onClick={async () => {
                  if (!confirm("This will permanently delete ALL project data, including projects, conversations, messages, and memberships. Users will be preserved. Are you sure?")) return;
                  setMaintenanceLoading("all");
                  try {
                    const result = await adminCleanupDB("all");
                    const counts = result.counts || {};
                    const message = Object.entries(counts)
                      .map(([table, count]) => `${table}: ${count}`)
                      .join(", ");
                    toast.success(`Cleared all project data: ${message}`);
                    // Reset UI state after cleanup
                    setProjects([]);
                    setMembers([]);
                    setSelectedProjectId(null);
                    setActivity([]);
                    setSearchResults({ projects: [], conversations: [] });
                  } catch (e: any) {
                    if (e.status === 429) {
                      toast.error("Too many requests. Please wait and try again.");
                    } else if (e.status === 401 || e.status === 403) {
                      toast.error("Access denied. Admin permissions required.");
                    } else {
                      toast.error("Failed to clear project data");
                    }
                  } finally {
                    setMaintenanceLoading(null);
                  }
                }}
              >
                {maintenanceLoading === "all" ? "Clearing..." : "Clear all project data"}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                disabled={maintenanceLoading !== null}
                onClick={async () => {
                  if (!confirm("This will clear all project data and attempt to reseed demo data. Are you sure?")) return;
                  setMaintenanceLoading("demo");
                  try {
                    const result = await adminCleanupDB("demo");
                    const counts = result.counts || {};
                    const message = Object.entries(counts)
                      .map(([table, count]) => `${table}: ${count}`)
                      .join(", ");
                    
                    let statusMessage = `Reset demo data: ${message}`;
                    if (counts.demo_seeded) {
                      statusMessage += " (Demo project seeded successfully)";
                    } else if (counts.demo_seed_failed) {
                      statusMessage += " (Warning: Demo seeding failed)";
                    } else if (counts.demo_seed_not_found) {
                      statusMessage += " (Warning: Seed script not found)";
                    } else if (counts.demo_seed_error) {
                      statusMessage += " (Warning: Seed script error)";
                    }
                    
                    toast.success(statusMessage);
                    
                    // Refresh all UI state after demo reset
                    try {
                      const [newProjects, newActivity] = await Promise.all([
                        getProjects(),
                        getRecentActivity(25)
                      ]);
                      setProjects(newProjects);
                      setActivity(newActivity);
                      setMembers([]);
                      setSelectedProjectId(null);
                      setSearchResults({ projects: [], conversations: [] });
                    } catch (e) {}
                  } catch (e: any) {
                    if (e.status === 429) {
                      toast.error("Too many requests. Please wait and try again.");
                    } else if (e.status === 401 || e.status === 403) {
                      toast.error("Access denied. Admin permissions required.");
                    } else {
                      toast.error("Failed to reset demo data");
                    }
                  } finally {
                    setMaintenanceLoading(null);
                  }
                }}
              >
                {maintenanceLoading === "demo" ? "Resetting..." : "Reset demo data"}
              </Button>
            </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
