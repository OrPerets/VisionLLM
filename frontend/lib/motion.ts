/**
 * Motion configuration utilities for Vision.bi inspired animations
 * Handles reduced motion preferences and provides consistent animation configs
 */

// Check for reduced motion preference
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Base animation variants for Framer Motion
export const motionVariants = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
    animate: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      filter: 'blur(2px)',
    },
    transition: {
      duration: prefersReducedMotion() ? 0.01 : 0.3,
      ease: [0.2, 0.8, 0.2, 1] as const,
    }
  },

  // Staggered container animations
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion() ? 0 : 0.1,
        delayChildren: prefersReducedMotion() ? 0 : 0.1,
      }
    }
  },

  // Card entrance animations
  cardEnter: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
    },
    whileHover: prefersReducedMotion() ? {} : {
      scale: 1.02,
      y: -2,
    },
    transition: {
      duration: prefersReducedMotion() ? 0.01 : 0.4,
      ease: [0.2, 0.8, 0.2, 1] as const,
    }
  },

  // Button animations
  button: {
    whileHover: prefersReducedMotion() ? {} : {
      scale: 1.05,
      transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }
    },
    whileTap: prefersReducedMotion() ? {} : {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },

  // Magnetic button effect
  magneticButton: {
    initial: { x: 0, y: 0 },
    animate: { x: 0, y: 0 },
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 0.5
    }
  },

  // Floating animations
  float: {
    animate: prefersReducedMotion() ? {} : {
      y: [0, -8, 0],
      rotate: [0, 1, -1, 0],
      transition: {
        duration: 6,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  },

  // Glow effect
  glow: {
    animate: prefersReducedMotion() ? {} : {
      boxShadow: [
        "0 0 5px rgba(0, 163, 224, 0.3)",
        "0 0 20px rgba(0, 163, 224, 0.6), 0 0 30px rgba(36, 209, 231, 0.3)",
        "0 0 5px rgba(0, 163, 224, 0.3)"
      ],
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  },

  // Form field animations
  formField: {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
    },
    focus: prefersReducedMotion() ? {} : {
      scale: 1.02,
    },
    transition: {
      duration: prefersReducedMotion() ? 0.01 : 0.3,
      ease: [0.2, 0.8, 0.2, 1] as const,
    }
  },

  // Modal/overlay animations
  overlay: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: prefersReducedMotion() ? 0.01 : 0.2,
      }
    },
    exit: { 
      opacity: 0,
      transition: {
        duration: prefersReducedMotion() ? 0.01 : 0.2,
      }
    }
  },

  modal: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: prefersReducedMotion() ? 0.01 : 0.3,
        ease: [0.2, 0.8, 0.2, 1],
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 10,
      transition: {
        duration: prefersReducedMotion() ? 0.01 : 0.2,
        ease: [0.4, 0, 0.2, 1],
      }
    }
  },
};

// Preset spring configurations
export const springs = {
  gentle: { type: "spring", stiffness: 200, damping: 30 },
  bouncy: { type: "spring", stiffness: 400, damping: 25 },
  wobbly: { type: "spring", stiffness: 180, damping: 12 },
  stiff: { type: "spring", stiffness: 400, damping: 40 },
};

// Preset easing curves
export const easings = {
  gentle: [0.2, 0.8, 0.2, 1],
  smooth: [0.4, 0, 0.2, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  sharp: [0.4, 0, 1, 1],
};

// Utility function to create safe animations that respect user preferences
export const createSafeAnimation = (animation: any) => {
  return prefersReducedMotion() ? {} : animation;
};

// Magnetic button effect handler
export const handleMagneticEffect = (
  event: React.MouseEvent<HTMLElement>,
  element: HTMLElement,
  strength: number = 0.3
) => {
  if (prefersReducedMotion()) return;

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  const deltaX = (event.clientX - centerX) * strength;
  const deltaY = (event.clientY - centerY) * strength;
  
  element.style.setProperty('--mouse-x', `${deltaX}px`);
  element.style.setProperty('--mouse-y', `${deltaY}px`);
};

// Reset magnetic effect
export const resetMagneticEffect = (element: HTMLElement) => {
  element.style.setProperty('--mouse-x', '0px');
  element.style.setProperty('--mouse-y', '0px');
};

// Stagger configuration
export const stagger = (delay: number = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: prefersReducedMotion() ? 0 : delay,
    }
  }
});

export default motionVariants;
