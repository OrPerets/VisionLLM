"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Save, Settings } from "lucide-react";
import { toast } from "sonner";

export function ProjectSettings() {
  const {
    selectedProjectId,
    updateProjectData,
    getCurrentProject,
  } = useAppStore();

  const currentProject = getCurrentProject();
  
  const [systemInstructions, setSystemInstructions] = useState("");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setSystemInstructions(currentProject.system_instructions || "");
      const defaults = currentProject.defaults || {};
      setTemperature([defaults.temperature || 0.7]);
      setMaxTokens([defaults.max_tokens || 2048]);
      setHasChanges(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      const currentDefaults = currentProject.defaults || {};
      const hasSystemChanges = systemInstructions !== (currentProject.system_instructions || "");
      const hasTempChanges = temperature[0] !== (currentDefaults.temperature || 0.7);
      const hasTokenChanges = maxTokens[0] !== (currentDefaults.max_tokens || 2048);
      
      setHasChanges(hasSystemChanges || hasTempChanges || hasTokenChanges);
    }
  }, [systemInstructions, temperature, maxTokens, currentProject]);

  const handleSave = async () => {
    if (!selectedProjectId || !currentProject) return;

    setIsSaving(true);
    try {
      await updateProjectData(selectedProjectId, {
        system_instructions: systemInstructions || null,
        defaults: {
          temperature: temperature[0],
          max_tokens: maxTokens[0],
        },
      });
      
      setHasChanges(false);
      toast.success("Project settings saved successfully");
    } catch (error) {
      toast.error("Failed to save project settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <div>
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No project selected</p>
          <p className="text-xs mt-1">Select a project to configure settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Project Settings</h3>
          <p className="text-sm text-muted-foreground truncate">
            {currentProject.name}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="shrink-0"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* System Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Instructions</CardTitle>
            <CardDescription>
              Define how the AI assistant should behave and respond in this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter system instructions..."
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              These instructions will be included in every conversation in this project.
            </p>
          </CardContent>
        </Card>

        {/* Model Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model Defaults</CardTitle>
            <CardDescription>
              Configure default parameters for AI responses in this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <Badge variant="outline">{temperature[0]}</Badge>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onValueChange={setTemperature}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness. Lower values make responses more focused and deterministic.
              </p>
            </div>

            <Separator />

            {/* Max Tokens */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Badge variant="outline">{maxTokens[0]}</Badge>
              </div>
              <Slider
                id="max-tokens"
                min={50}
                max={4096}
                step={50}
                value={maxTokens}
                onValueChange={setMaxTokens}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum length of AI responses. Higher values allow longer responses.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Project ID</span>
              <span className="font-mono">{currentProject.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(currentProject.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{new Date(currentProject.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
