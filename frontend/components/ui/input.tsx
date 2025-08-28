"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-10 w-full rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border border-input bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        glass: "border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 focus:border-primary/50 focus:bg-white/10 focus:ring-2 focus:ring-primary/20",
        floating: "border border-input bg-background px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:shadow-md focus:shadow-lg",
        minimal: "border-0 border-b-2 border-border bg-transparent px-1 py-2 rounded-none focus:border-primary",
      },
      inputSize: {
        default: "h-10 px-3 py-2",
        sm: "h-8 px-2 py-1 text-xs",
        lg: "h-12 px-4 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Animated input for special cases
const AnimatedInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <motion.input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        whileFocus={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        // Cast to motion props to avoid type conflicts
        {...(props as any)}
      />
    )
  }
)
AnimatedInput.displayName = "AnimatedInput"

export { Input, AnimatedInput, inputVariants }
