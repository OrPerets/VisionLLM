"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-95",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
        // Vision.bi inspired variants
        glass: "glass-surface text-foreground hover:bg-white/10 border-white/10 hover:border-white/20 backdrop-blur-xl hover:scale-105 active:scale-95",
        gradient: "bg-gradient-to-r from-app-blue to-app-cyan text-white hover:from-app-blue/90 hover:to-app-cyan/90 hover:scale-105 active:scale-95 sheen-effect",
        magnetic: "bg-primary text-primary-foreground hover:bg-primary/90 magnetic-button transition-transform duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        xl: "h-12 rounded-lg px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

type MotionButtonProps = Omit<
  HTMLMotionProps<"button">,
  | "onAnimationStart"
  | "onAnimationEnd" 
  | "onAnimationIteration"
  | "onTransitionEnd"
> & {
  onAnimationStart?: React.AnimationEventHandler<HTMLButtonElement>
  onAnimationEnd?: React.AnimationEventHandler<HTMLButtonElement>
  onAnimationIteration?: React.AnimationEventHandler<HTMLButtonElement>
  onTransitionEnd?: React.TransitionEventHandler<HTMLButtonElement>
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Use motion.button for magnetic variant, regular button otherwise
    if (variant === "magnetic") {
      return (
        <motion.button
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          // Cast to motion props to avoid type conflicts
          {...(props as any)}
        />
      )
    }

    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
