"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIndicator } from "@/components/common/status-indicator";
import { getHealth, getMeta } from "@/lib/api";
import { Health, Meta } from "@/lib/types";
import { RefreshCw, Server, Database, Cpu, Clock } from "lucide-react";
import { toast } from "sonner";

export default function AdminPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

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
    } catch (error) {
      console.error("Failed to fetch status:", error);
      toast.error("Failed to fetch backend status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Status</h1>
          <p className="text-muted-foreground">
            Monitor the health and status of VisionBI Assistant
          </p>
        </div>
        
        <Button
          variant="outline"
          onClick={fetchStatus}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Overall Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <StatusIndicator
                status={getOverallStatus()}
                text={getStatusMessage()}
                size="lg"
              />
              {lastChecked && (
                <p className="text-sm text-muted-foreground">
                  Last checked: {lastChecked.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Backend Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backend Service
            </CardTitle>
            <CardDescription>
              Core API service status and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Service Status</span>
              <StatusIndicator
                status={health?.ok ? "online" : "error"}
                text={health?.ok ? "Healthy" : "Unavailable"}
              />
            </div>
            
            {meta && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Version</span>
                  <Badge variant="outline">{meta.backend_version}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Base</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Model Server */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Model Server
            </CardTitle>
            <CardDescription>
              AI model inference server status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Server Status</span>
              <StatusIndicator
                status={meta?.model_server_ok ? "online" : "error"}
                text={meta?.model_server_ok ? "Available" : "Unavailable"}
              />
            </div>
            
            {meta && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model ID</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {meta.model_id}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Connection Test
          </CardTitle>
          <CardDescription>
            Test connectivity and response times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={async () => {
                const start = Date.now();
                try {
                  await getHealth();
                  const latency = Date.now() - start;
                  toast.success(`Health check completed in ${latency}ms`);
                } catch (error) {
                  toast.error("Health check failed");
                }
              }}
              className="w-full"
            >
              Test Health Endpoint
            </Button>
            
            <Button
              variant="outline"
              onClick={async () => {
                const start = Date.now();
                try {
                  await getMeta();
                  const latency = Date.now() - start;
                  toast.success(`Meta endpoint responded in ${latency}ms`);
                } catch (error) {
                  toast.error("Meta endpoint failed");
                }
              }}
              className="w-full"
            >
              Test Meta Endpoint
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
