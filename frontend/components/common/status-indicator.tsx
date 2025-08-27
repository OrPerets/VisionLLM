"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatusIndicatorProps {
  status: "online" | "offline" | "warning" | "error";
  text?: string;
  tooltip?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusIndicator({
  status,
  text,
  tooltip,
  size = "md",
}: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: "bg-green-500",
      badgeVariant: "default" as const,
      text: text || "Online",
    },
    warning: {
      color: "bg-yellow-500",
      badgeVariant: "secondary" as const,
      text: text || "Warning",
    },
    error: {
      color: "bg-red-500",
      badgeVariant: "destructive" as const,
      text: text || "Error",
    },
    offline: {
      color: "bg-gray-500",
      badgeVariant: "outline" as const,
      text: text || "Offline",
    },
  };

  const config = statusConfig[status];
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const indicator = (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full",
          config.color,
          sizeClasses[size]
        )}
      />
      <Badge variant={config.badgeVariant} className="text-xs">
        {config.text}
      </Badge>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}
