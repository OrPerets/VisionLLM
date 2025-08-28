"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/common/status-indicator";
import { getHealth, getMeta, API_BASE, getRecentActivity, searchAll, listUsers, updateUserRole, getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember, getProjects, adminCleanupDB } from "@/lib/api";
import { Health, Meta, ActivityLog, UserRead, ProjectMemberRead, ProjectRead } from "@/lib/types";
import { RefreshCw, Server, Database, Cpu, Clock, ShieldAlert, Users, Search, Shield, AlertTriangle, Activity, BarChart3, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user } = useAppStore();
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
            <p className="text-muted-foreground">You need administrator privileges to view this page.</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto p-6 space-y-8 relative z-10">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="space-y-2">
            <motion.h1 
              className="text-3xl font-bold text-gradient"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <BarChart3 className="inline-block w-8 h-8 mr-3 text-app-blue" />
              System Dashboard
            </motion.h1>
            <motion.p 
              className="text-muted-foreground text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Monitor and manage your VisionBI Assistant infrastructure
            </motion.p>
          </div>
          
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Button
              variant="glass"
              size="lg"
              onClick={fetchStatus}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh Status
            </Button>
          </motion.div>
        </motion.div>

        {/* Status Overview Cards */}
        <motion.div
          className="grid gap-6 md:grid-cols-3"
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
            <Card variant="glass" className="relative overflow-hidden">
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
                    <p className="text-xs text-muted-foreground">
                      Updated {lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-app-blue">
                        {projects.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Projects</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-app-cyan">
                        {users.length}
                      </div>
                      <div className="text-xs text-muted-foreground">Users</div>
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
            <Card variant="glass" className="relative overflow-hidden">
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
                        <span className="text-xs text-muted-foreground">Version</span>
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
            <Card variant="glass" className="relative overflow-hidden">
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
                        <span className="text-xs text-muted-foreground">Model</span>
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
          <Card variant="glass" className="relative overflow-hidden">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <motion.div
                  className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Settings2 className="h-6 w-6 text-white" />
                </motion.div>
                Administration Center
              </CardTitle>
              <CardDescription className="text-base">
                System management, user controls, and activity monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Global Search */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-app-blue to-app-cyan rounded-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Global Search</div>
                    <div className="text-sm text-muted-foreground">Find projects and conversations across the system</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    variant="glass"
                    inputSize="lg"
                    placeholder="Search projects and conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button variant="gradient" size="lg" onClick={handleSearch}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
                {(searchResults.projects.length > 0 || searchResults.conversations.length > 0) && (
                  <motion.div
                    className="grid md:grid-cols-2 gap-6 p-4 bg-white/5 rounded-lg border border-white/10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-app-blue">Projects</div>
                      <div className="space-y-2">
                        {searchResults.projects.map((p) => (
                          <motion.div
                            key={p.id}
                            className="flex items-center justify-between p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-sm font-medium">{p.name}</span>
                            <Badge variant="outline" className="text-xs">#{p.id}</Badge>
                          </motion.div>
                        ))}
                        {searchResults.projects.length === 0 && (
                          <div className="text-sm text-muted-foreground italic">No matches</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-app-cyan">Conversations</div>
                      <div className="space-y-2">
                        {searchResults.conversations.map((c) => (
                          <motion.div
                            key={c.id}
                            className="flex items-center justify-between p-2 bg-white/5 rounded-md hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <span className="text-sm font-medium truncate">{c.title}</span>
                            <Badge variant="outline" className="text-xs">#{c.id}</Badge>
                          </motion.div>
                        ))}
                        {searchResults.conversations.length === 0 && (
                          <div className="text-sm text-muted-foreground italic">No matches</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
          </div>

              <Separator className="bg-white/10" />

              {/* Recent Activity */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Recent Activity</div>
                    <div className="text-sm text-muted-foreground">Latest 25 system events</div>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto bg-white/5 rounded-lg border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/10 backdrop-blur-sm">
                      <tr className="text-left border-b border-white/10">
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
                          className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
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
                          <td className="p-6 text-muted-foreground text-center italic" colSpan={4}>
                            No recent activity
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
          </div>

          <Separator />

          {/* Users and Roles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="font-medium">Users and Roles</div>
            </div>
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
                      <td className="p-2 text-muted-foreground" colSpan={3}>No users</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Separator />

          {/* Project Members */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="font-medium">Project Membership</div>
            </div>
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
                          <td className="p-2 text-muted-foreground" colSpan={3}>No members</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Maintenance (Danger Zone) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div className="font-medium text-amber-700 dark:text-amber-300">Maintenance (Danger Zone)</div>
            </div>
            <div className="text-sm text-muted-foreground">
              These actions will permanently delete data. Use with caution.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
