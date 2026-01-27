import * as React from "react"
import { cn } from "@/lib/utils"

// Note: If you don't have cva or radix-slot installed, I will install them next.
// For now I'll assume standard Shadcn-like structure or just use standard props if I can't install more deps efficiently.
// actually, I'll stick to simple props for now to avoid installing too many heavy libs if not needed, 
// BUT standard in modern Next.js is usually cva. 
// Let's use simple clsx for now to be fast and lightweight unless requested otherwise.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/50 disabled:pointer-events-none disabled:opacity-50",
          // Variants
          variant === "primary" && 
            "bg-gradient-to-r from-amber-200 to-yellow-500 text-zinc-950 shadow-lg shadow-gold-glow/20 hover:scale-[1.02] hover:shadow-gold-glow/40 active:scale-[0.98]",
          variant === "secondary" && 
            "border border-gold-border bg-gold-surface text-gold hover:bg-gold-surface/20 hover:border-gold-primary/50",
          variant === "ghost" && 
            "text-zinc-400 hover:text-zinc-100 hover:bg-white/5",
          variant === "destructive" &&
             "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
          variant === "outline" &&
             "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600",
          // Sizes
          size === "sm" && "h-8 px-3 text-xs",
          size === "md" && "h-10 px-4 py-2 text-sm",
          size === "lg" && "h-12 px-8 text-base",
          size === "icon" && "h-9 w-9",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
