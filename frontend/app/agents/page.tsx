"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bot, Star, Sparkles, ArrowRight } from "lucide-react";
import { recommendAgents } from "@/lib/api";
import type { AgentRecommendation } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const [taskDescription, setTaskDescription] = useState("");
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGetRecommendations = async () => {
    if (!taskDescription.trim()) {
      toast.error("Please describe your task first");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const results = await recommendAgents({
        q: taskDescription.trim(),
        top_k: 6
      });
      setRecommendations(results);
      
      if (results.length === 0) {
        toast.info("No agents found for your task. Try a different description.");
      } else {
        toast.success(`Found ${results.length} agent recommendations`);
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      toast.error("Failed to get agent recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAgent = (agentId: number) => {
    // Navigate to a conversation with this agent
    window.location.href = `/projects/1/conversations/new?agent=${agentId}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3">
            <motion.div
              className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Bot className="h-6 w-6 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Agent Recommendations
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Describe your task and get AI-powered recommendations for the best agents to help you
          </p>
        </motion.div>

        {/* Task Input Section */}
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Describe Your Task
              </CardTitle>
              <CardDescription>
                Be specific about what you want to accomplish. The more details you provide, the better our recommendations will be.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g., I need to analyze sales data from our Snowflake database, create visualizations, and generate insights for the quarterly report..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="min-h-[120px] resize-none text-base leading-relaxed"
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleGetRecommendations}
                  disabled={isLoading || !taskDescription.trim()}
                  className="px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get Recommendations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Recommended Agents</h2>
                <p className="text-muted-foreground">
                  {isLoading 
                    ? "Analyzing your task..." 
                    : recommendations.length > 0 
                      ? `Found ${recommendations.length} agents that match your needs`
                      : "No agents found for your task"
                  }
                </p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Analyzing your task and finding the best agents...</p>
                  </div>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {recommendations.map((rec, index) => (
                    <motion.div
                      key={rec.agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <Card className="h-full border-2 border-border/50 bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-200 hover:shadow-lg">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Bot className="h-4 w-4 text-blue-500" />
                                {rec.agent.name}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {rec.agent.description || "Specialized agent for your task"}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-sm font-medium">
                                {rec.score.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {/* Categories and Tags */}
                          <div className="flex flex-wrap gap-2">
                            {rec.agent.categories?.map((category) => (
                              <Badge key={category} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                            {rec.agent.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Product Badge */}
                          {rec.agent.product && (
                            <Badge variant="default" className="text-xs">
                              {rec.agent.product}
                            </Badge>
                          )}

                          <Separator />

                          {/* Reason */}
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Why this agent?</p>
                            <p className="text-sm leading-relaxed">{rec.reason}</p>
                          </div>

                          {/* Action Button */}
                          <Button
                            onClick={() => handleUseAgent(rec.agent.id)}
                            className="w-full mt-4"
                            size="sm"
                          >
                            Use This Agent
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm">
                  <CardContent className="py-12 text-center">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Agents Found</h3>
                    <p className="text-muted-foreground mb-4">
                      We couldn't find any agents that match your task description.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Try:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Using more specific keywords</li>
                        <li>Describing the tools or platforms you need</li>
                        <li>Mentioning the type of analysis or task</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tips Section */}
        {!hasSearched && (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Tips for Better Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Be Specific</h4>
                    <p className="text-sm text-muted-foreground">
                      Mention specific tools, platforms, or data sources you're working with.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Include Context</h4>
                    <p className="text-sm text-muted-foreground">
                      Describe your role, industry, and the type of analysis you need.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Mention Goals</h4>
                    <p className="text-sm text-muted-foreground">
                      Explain what you want to achieve or what problem you're solving.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Specify Output</h4>
                    <p className="text-sm text-muted-foreground">
                      Tell us what kind of output you need: reports, visualizations, code, etc.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
