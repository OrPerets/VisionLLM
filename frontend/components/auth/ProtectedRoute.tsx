"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { Skeleton } from "@/components/common/loading-skeleton";
import { motionVariants } from "@/lib/motion";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  adminOnly = false 
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthChecked, checkAuth, isAuthenticated, authEnabled } = useAppStore();

  useEffect(() => {
    // Initialize auth check if not done
    if (!isAuthChecked) {
      checkAuth();
      return;
    }

    // Skip protection for auth routes
    if (pathname === "/login") {
      if (isAuthenticated()) {
        router.replace("/");
      }
      return;
    }

    // If auth is disabled, allow all routes (except admin routes)
    if (!authEnabled && !adminOnly) {
      return;
    }

    // Protect routes that require authentication
    if (requireAuth && !isAuthenticated()) {
      router.replace("/login");
      return;
    }

    // Protect admin-only routes
    if (adminOnly && (!user || user.role !== "admin")) {
      router.replace("/");
      return;
    }
  }, [
    isAuthChecked, 
    user, 
    pathname, 
    requireAuth, 
    adminOnly, 
    checkAuth, 
    isAuthenticated, 
    router
  ]);

  // Show loading skeleton while checking auth
  if (!isAuthChecked) {
    return <AuthLoadingState />;
  }

  // Redirect states - show nothing while redirecting
  if (pathname === "/login" && isAuthenticated()) {
    return <AuthLoadingState />;
  }

  // If auth is disabled, allow all routes (except admin routes)
  if (!authEnabled && !adminOnly) {
    return (
      <motion.div
        variants={motionVariants.pageEnter}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full"
      >
        {children}
      </motion.div>
    );
  }

  if (requireAuth && !isAuthenticated()) {
    return <AuthLoadingState />;
  }

  if (adminOnly && (!user || user.role !== "admin")) {
    return <AuthLoadingState />;
  }

  // Render protected content
  return (
    <motion.div
      variants={motionVariants.pageEnter}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

function AuthLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        className="text-center space-y-4"
        variants={motionVariants.cardEnter}
        initial="initial"
        animate="animate"
      >
        <div className="space-y-3">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
        <motion.div
          className="flex items-center justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0,
            }}
          />
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.2,
            }}
          />
          <motion.div
            className="w-2 h-2 bg-primary rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: 0.4,
            }}
          />
        </motion.div>
        <p className="text-sm text-muted-foreground">
          Verifying access...
        </p>
      </motion.div>
    </div>
  );
}
