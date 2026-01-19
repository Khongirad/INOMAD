"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export function Dialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, children }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setUncontrolledOpen;

  // Ideally lock body scroll here, but keeping it simple for now

  return (
    <DialogContext.Provider value={{ open: !!open, onOpenChange: onOpenChange! }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild, className, ...props }: any) {
  const { onOpenChange } = React.useContext(DialogContext);
  
  return (
    <div 
      className={cn("inline-flex", className)}
      onClick={(e) => {
        e.stopPropagation();
        onOpenChange(true);
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function DialogContent({ children, className, ...props }: any) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Content */}
      <div 
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl animate-in zoom-in-95 duration-200",
          "glass-panel",
          className
        )}
        style={{
          boxShadow: "0 0 50px -10px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.02)"
        }}
        {...props}
      >
        <button
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-zinc-950 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 disabled:pointer-events-none"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4 text-zinc-400 hover:text-white" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }: any) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: any) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6", className)} {...props} />
  );
}

export function DialogTitle({ className, ...props }: any) {
  return (
    <h2 className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)} {...props} />
  );
}

export function DialogDescription({ className, ...props }: any) {
  return (
    <p className={cn("text-sm text-zinc-400", className)} {...props} />
  );
}
