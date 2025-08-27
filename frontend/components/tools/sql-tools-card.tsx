"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sqlTranspile, sqlLint } from "@/lib/api";
import { SQL_DIALECTS, SQLDialect } from "@/lib/types";
import { 
  Copy, 
  Database, 
  ArrowRightLeft, 
  CheckCircle, 
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

export function SQLToolsCard() {
  // Transpile state
  const [transpileInput, setTranspileInput] = useState("");
  const [transpileSource, setTranspileSource] = useState<SQLDialect>("postgres");
  const [transpileTarget, setTranspileTarget] = useState<SQLDialect>("snowflake");
  const [transpileResult, setTranspileResult] = useState("");
  const [transpileLoading, setTranspileLoading] = useState(false);

  // Lint state
  const [lintInput, setLintInput] = useState("");
  const [lintDialect, setLintDialect] = useState<SQLDialect>("postgres");
  const [lintReport, setLintReport] = useState("");
  const [lintFixed, setLintFixed] = useState("");
  const [lintLoading, setLintLoading] = useState(false);

  const handleTranspile = async () => {
    if (!transpileInput.trim()) {
      toast.error("Please enter SQL to transpile");
      return;
    }

    setTranspileLoading(true);
    try {
      const result = await sqlTranspile({
        sql: transpileInput,
        source: transpileSource,
        target: transpileTarget,
      });
      setTranspileResult(result.result);
      toast.success("SQL transpiled successfully");
    } catch (error) {
      toast.error("Failed to transpile SQL");
      setTranspileResult("");
    } finally {
      setTranspileLoading(false);
    }
  };

  const handleLint = async () => {
    if (!lintInput.trim()) {
      toast.error("Please enter SQL to lint");
      return;
    }

    setLintLoading(true);
    try {
      const result = await sqlLint({
        sql: lintInput,
        dialect: lintDialect,
      });
      setLintReport(result.report);
      setLintFixed(result.fixed);
      toast.success("SQL linting completed");
    } catch (error) {
      toast.error("Failed to lint SQL");
      setLintReport("");
      setLintFixed("");
    } finally {
      setLintLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await copyToClipboard(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleApplyFix = () => {
    if (lintFixed) {
      setLintInput(lintFixed);
      toast.success("Fixed SQL applied to input");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <h3 className="font-semibold">SQL Tools</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Transpile and lint SQL queries across different dialects
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <Tabs defaultValue="transpile" className="h-full">
          <div className="p-4 pb-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transpile" className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Transpile
              </TabsTrigger>
              <TabsTrigger value="lint" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Lint & Fix
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 pt-2">
            <TabsContent value="transpile" className="mt-0 space-y-4">
              {/* Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Input SQL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Source</label>
                      <Select value={transpileSource} onValueChange={(value: SQLDialect) => setTranspileSource(value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SQL_DIALECTS.map((dialect) => (
                            <SelectItem key={dialect} value={dialect}>
                              {dialect}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Target</label>
                      <Select value={transpileTarget} onValueChange={(value: SQLDialect) => setTranspileTarget(value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SQL_DIALECTS.map((dialect) => (
                            <SelectItem key={dialect} value={dialect}>
                              {dialect}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Enter SQL query to transpile..."
                    value={transpileInput}
                    onChange={(e) => setTranspileInput(e.target.value)}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button 
                    onClick={handleTranspile} 
                    disabled={transpileLoading || !transpileInput.trim()}
                    className="w-full"
                  >
                    {transpileLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Transpile
                  </Button>
                </CardContent>
              </Card>

              {/* Result */}
              {transpileResult && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Result</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(transpileResult, "Transpiled SQL")}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md p-3">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        {transpileResult}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="lint" className="mt-0 space-y-4">
              {/* Input */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Input SQL</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Dialect</label>
                    <Select value={lintDialect} onValueChange={(value: SQLDialect) => setLintDialect(value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SQL_DIALECTS.map((dialect) => (
                          <SelectItem key={dialect} value={dialect}>
                            {dialect}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Enter SQL query to lint..."
                    value={lintInput}
                    onChange={(e) => setLintInput(e.target.value)}
                    className="min-h-[100px] font-mono text-sm"
                  />
                  <Button 
                    onClick={handleLint} 
                    disabled={lintLoading || !lintInput.trim()}
                    className="w-full"
                  >
                    {lintLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Lint & Fix
                  </Button>
                </CardContent>
              </Card>

              {/* Report */}
              {lintReport && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Lint Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md p-3">
                      <pre className="text-sm whitespace-pre-wrap break-words">
                        {lintReport}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fixed SQL */}
              {lintFixed && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Fixed SQL
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleApplyFix}
                        >
                          Apply
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(lintFixed, "Fixed SQL")}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-md p-3">
                      <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                        {lintFixed}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
