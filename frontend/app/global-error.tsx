"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <div className="text-center space-y-6 max-w-md">
            <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Application Error</h1>
              <p className="text-muted-foreground">
                A critical error occurred that prevented the application from loading.
              </p>
            </div>

            {error.message && (
              <div className="rounded-lg bg-muted p-4 text-left">
                <h3 className="font-medium text-sm mb-2">Error Details:</h3>
                <p className="text-sm font-mono break-words">{error.message}</p>
                {error.digest && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button onClick={() => reset()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = "/"}>
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
