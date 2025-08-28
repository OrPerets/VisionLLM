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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels } from "@/lib/api";
import { toast } from "sonner";

// Persona templates for quick system-instruction presets
const PERSONA_TEMPLATES: Record<string, string> = {
  Analyst: [
    "You are a senior Data Analyst.",
    "- Understand the business question first; ask for missing context (entities, timeframe, grain).",
    "- Prefer clear, minimal SQL with readable CTEs, meaningful aliases, and comments when needed.",
    "- Validate assumptions explicitly; if schema/tables are unknown, ask for a quick schema sample.",
    "- When returning results, outline steps briefly and provide runnable SQL in the target dialect.",
    "- Optimize for correctness first, then performance; highlight trade-offs and caveats succinctly.",
  ].join("\n"),
  "Data Engineer": [
    "You are a senior Data Engineer for ETL/ELT and data platforms.",
    "- Design reliable, idempotent pipelines; call out SCD handling, deduping, and data quality checks.",
    "- Provide concise architectures (staging → cleansed → marts) and scheduling/orchestration guidance.",
    "- Prefer modular SQL and/or Python examples; surface partitioning, incremental loads, and backfills.",
    "- Address performance (indexes/cluster keys, pruning, predicate pushdown) and cost awareness.",
    "- If requirements are ambiguous, ask targeted questions to unblock implementation.",
  ].join("\n"),
  "BI Dev": [
    "You are a senior BI Developer focused on metrics, dashboards, and semantic modeling.",
    "- Define clear metric semantics (grain, filters, dims) and consistent naming conventions.",
    "- Propose star-schema friendly models (facts/dims) and describe joins and primary keys.",
    "- Provide performant SQL powering dashboards; avoid unnecessary cross-joins and heavy windowing.",
    "- Recommend UX best practices (filters, drilldowns, tooltips) and performant aggregation strategies.",
    "- Clarify KPIs and edge cases before finalizing queries; note data-quality risks.",
  ].join("\n"),
  Snowflake: [
    "You are a Snowflake expert.",
    "- Use Snowflake SQL; leverage warehouses, micro-partition pruning, clustering, and RESULT_SCAN prudently.",
    "- Prefer CTAS/temporary tables for heavy transforms; consider TASKS/STREAMS for incremental loads.",
    "- Call out time-travel, zero-copy cloning, and materialized views when appropriate.",
    "- Optimize for cost and performance: avoid SELECT *, limit scans, and use QUALIFY for window filters.",
    "- If schema unknown, ask for DESCRIBE or INFORMATION_SCHEMA samples before proposing specifics.",
  ].join("\n"),
  Tableau: [
    "You are a Tableau expert.",
    "- Provide precise Calculated Field and LOD expression syntax with brief explanations.",
    "- Optimize workbook performance (extracts, aggregation, context filters, reducing row-level calcs).",
    "- Recommend clear viz choices and dashboard structure; note formatting and interaction best practices.",
    "- When feasible, move heavy logic to SQL; otherwise use LOD/table calcs with rationale.",
    "- Ask for data structure (dimensions/measures, joins/blends) if unclear before prescribing a solution.",
  ].join("\n"),
  DBT: [
    "You are a senior dbt practitioner.",
    "- Provide dbt model examples with Jinja, configs (materialized, unique/cluster keys), and incremental strategies.",
    "- Include tests and documentation snippets in schema.yml; suggest sources/exposures appropriately.",
    "- Favor modular models and reusable macros; explain trade-offs (ephemeral vs table vs incremental).",
    "- Address environments, CI, and artifacts (docs generation, freshness) where relevant.",
    "- Ask for existing project structure if unknown (models/, seeds/, snapshots/, macros/).",
  ].join("\n"),
};

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
  const [models, setModels] = useState<{ name: string }[]>([]);
  const [modelId, setModelId] = useState<string | undefined>(undefined);
  const [persona, setPersona] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (currentProject) {
      setSystemInstructions(currentProject.system_instructions || "");
      const defaults = currentProject.defaults || {};
      setTemperature([defaults.temperature || 0.7]);
      setMaxTokens([defaults.max_tokens || 2048]);
      setModelId(defaults.model_id || undefined);
      setHasChanges(false);
    }
  }, [currentProject]);

  // Keep persona selection in sync with the current system instructions
  useEffect(() => {
    const trimmed = (systemInstructions || "").trim();
    const match = Object.entries(PERSONA_TEMPLATES).find(([, tpl]) => tpl.trim() === trimmed);
    setPersona(match ? match[0] : undefined);
  }, [systemInstructions]);

  useEffect(() => {
    if (currentProject) {
      const currentDefaults = currentProject.defaults || {};
      const hasSystemChanges = systemInstructions !== (currentProject.system_instructions || "");
      const hasTempChanges = temperature[0] !== (currentDefaults.temperature || 0.7);
      const hasTokenChanges = maxTokens[0] !== (currentDefaults.max_tokens || 2048);
      const hasModelChanges = (modelId || undefined) !== (currentDefaults.model_id || undefined);
      
      setHasChanges(hasSystemChanges || hasTempChanges || hasTokenChanges || hasModelChanges);
    }
  }, [systemInstructions, temperature, maxTokens, modelId, currentProject]);

  useEffect(() => {
    (async () => {
      try {
        const info = await getModels();
        const list = (info.models || []).map((m) => ({ name: m.name }));
        setModels(list);
      } catch (e) {}
    })();
  }, []);

  const handleSave = async () => {
    if (!selectedProjectId || !currentProject) return;

    setIsSaving(true);
    try {
      await updateProjectData(selectedProjectId, {
        system_instructions: systemInstructions || null,
        defaults: {
          temperature: temperature[0],
          max_tokens: maxTokens[0],
          model_id: modelId,
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
            {/* Persona selector */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="persona">Persona</Label>
                {persona ? <Badge variant="outline" className="font-mono">{persona}</Badge> : null}
              </div>
              <Select
                value={persona}
                onValueChange={(value) => {
                  setPersona(value);
                  const tpl = PERSONA_TEMPLATES[value];
                  if (tpl) setSystemInstructions(tpl);
                }}
              >
                <SelectTrigger id="persona" className="w-full">
                  <SelectValue placeholder="Choose persona" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PERSONA_TEMPLATES).map((key) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecting a persona will replace the current system instructions.</p>
            </div>

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
            {/* Model selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="model-id">Default Model</Label>
                <Badge variant="outline" className="font-mono">{modelId || "—"}</Badge>
              </div>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="model-id" className="w-full">
                  <SelectValue placeholder="Select default model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default model for chats in this project. Users can override per message.
              </p>
            </div>

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
