import React from "react";
import { Skeleton } from "@/components/common/loading-skeleton";

export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <div className="text-sm text-muted-foreground">
          Loading...
        </div>
      </div>
    </div>
  );
}
