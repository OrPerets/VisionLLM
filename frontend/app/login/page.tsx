"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useMotionValue, useSpring } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Chrome, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAppStore } from "@/store/useAppStore";
import { redirectToGoogleLogin } from "@/lib/api";
import { motionVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Floating particle component
const FloatingParticle = ({ delay = 0, duration = 8 }: { delay?: number; duration?: number }) => (
  <motion.div
    className="absolute w-1 h-1 bg-app-blue/30 rounded-full"
    style={{
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
    animate={{
      y: [-20, 20, -20],
      x: [-10, 10, -10],
      opacity: [0.3, 0.8, 0.3],
      scale: [1, 1.2, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated grid background
const AnimatedGrid = () => (
  <div className="absolute inset-0 opacity-30">
    <motion.div
      className="grid-pattern w-full h-full"
      animate={{
        backgroundPosition: ["0px 0px", "20px 20px"],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </div>
);

// Gradient orb component
const GradientOrb = ({ className }: { className?: string }) => (
  <motion.div
    className={cn(
      "absolute rounded-full blur-3xl opacity-20",
      "bg-gradient-radial from-app-blue/40 via-app-cyan/20 to-transparent",
      className
    )}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.2, 0.4, 0.2],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, isAuthenticating, checkAuth, isAuthenticated } = useAppStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  // Smoother, more damped spring for gentler movement
  const springX = useSpring(mouseX, { stiffness: 100, damping: 40 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 40 });

  const controls = useAnimation();

  // Check auth on mount
  useEffect(() => {
    checkAuth().then(() => {
      if (isAuthenticated()) {
        router.replace("/");
      }
    });
  }, [checkAuth, isAuthenticated, router]);

  // Magnetic card effect (subtle)
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Reduced sensitivity from 0.1 to 0.03 for subtler movement
    const deltaX = (event.clientX - centerX) * 0.03;
    const deltaY = (event.clientY - centerY) * 0.03;
    
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Form validation
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      controls.start({
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
      });
      return;
    }

    try {
      await loginUser(email, password);
      toast.success("Welcome back!");
      router.replace("/");
    } catch (error: any) {
      console.error("Login failed:", error);
      setErrors({ general: error.message || "Login failed. Please try again." });
      controls.start({
        x: [-10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
      });
    }
  };

  // Particles array
  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden flex items-center justify-center">
      {/* Background elements */}
      <AnimatedGrid />
      
      {/* Gradient orbs */}
      <GradientOrb className="w-96 h-96 -top-48 -left-48" />
      <GradientOrb className="w-80 h-80 -bottom-40 -right-40" />
      <GradientOrb className="w-64 h-64 top-1/2 left-1/4 transform -translate-y-1/2" />
      
      {/* Floating particles */}
      {particles.map((i) => (
        <FloatingParticle key={i} delay={i * 0.2} duration={8 + (i % 4)} />
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md mx-auto p-6"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        variants={motionVariants.pageEnter}
        initial="initial"
        animate="animate"
      >
        {/* Logo/Brand section */}
        <motion.div
          className="text-center mb-8"
          variants={motionVariants.cardEnter}
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-app-blue to-app-cyan rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient">VisionBI</h1>
          </motion.div>
          <motion.p 
            className="text-app-slate text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Welcome back to your AI assistant
          </motion.p>
        </motion.div>

        {/* Login card */}
        <motion.div
          ref={cardRef}
          style={{ x: springX, y: springY }}
          animate={controls}
        >
          <Card className="glass-surface border-0 shadow-2xl">
            <CardHeader className="space-y-1 pb-4">
              <motion.div
                className="text-center"
                variants={motionVariants.staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.h2 
                  className="text-xl font-semibold text-foreground mb-2"
                  variants={motionVariants.formField}
                >
                  Sign in to continue
                </motion.h2>
                <motion.p 
                  className="text-sm text-muted-foreground"
                  variants={motionVariants.formField}
                >
                  Enter your credentials to access your workspace
                </motion.p>
              </motion.div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* General error */}
                {errors.general && (
                  <motion.div
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errors.general}
                  </motion.div>
                )}

                {/* Email field */}
                <motion.div 
                  className="space-y-2"
                  variants={motionVariants.formField}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.1 }}
                >
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors(prev => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={cn(
                        "pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background/70 transition-all duration-200",
                        errors.email && "border-destructive focus:border-destructive"
                      )}
                      placeholder="your@email.com"
                      autoComplete="email"
                      disabled={isAuthenticating}
                    />
                  </div>
                  {errors.email && (
                    <motion.p
                      className="text-sm text-destructive"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </motion.div>

                {/* Password field */}
                <motion.div 
                  className="space-y-2"
                  variants={motionVariants.formField}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.2 }}
                >
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: undefined }));
                        }
                      }}
                      className={cn(
                        "pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background/70 transition-all duration-200",
                        errors.password && "border-destructive focus:border-destructive"
                      )}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isAuthenticating}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isAuthenticating}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <motion.p
                      className="text-sm text-destructive"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </motion.div>

                {/* Submit button */}
                <motion.div
                  variants={motionVariants.formField}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-app-blue to-app-cyan hover:from-app-blue/90 hover:to-app-cyan/90 text-white font-medium sheen-effect magnetic-button group relative overflow-hidden rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    disabled={isAuthenticating}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isAuthenticating ? (
                        <>
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div
                className="relative my-6"
                variants={motionVariants.formField}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.4 }}
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </motion.div>

              {/* Google sign in */}
              <motion.div
                variants={motionVariants.formField}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  type="button"
                  className="w-full h-12 border border-border/50 hover:border-border hover:bg-accent/50 transition-all duration-200 bg-background rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 inline-flex items-center justify-center whitespace-nowrap"
                  onClick={redirectToGoogleLogin}
                  disabled={isAuthenticating}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Continue with Google
                </motion.button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="text-center mt-8 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>
            Protected by enterprise-grade security
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
