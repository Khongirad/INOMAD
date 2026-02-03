'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PinPadProps {
  description?: string;
  error?: string;
  onChange?: (pin: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  value?: string; // Allow external control
}

export function PinPad({ 
  description = "Enter your 6-digit PIN",
  error, 
  onChange, 
  onComplete,
  disabled = false,
  value: externalValue
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state with external value
  useEffect(() => {
    if (externalValue !== undefined) {
      setPin(externalValue);
    }
  }, [externalValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(value);
    
    if (onChange) {
      onChange(value);
    }

    if (value.length === 6 && onComplete) {
      onComplete(value);
    }
  };

  const focusInput = () => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 w-full">
      <div className="text-center space-y-2">
        <Label htmlFor="pin-input" className="text-sm font-medium text-muted-foreground">
          {description}
        </Label>
      </div>

      <div 
        className="relative flex gap-3 cursor-text"
        onClick={focusInput}
      >
        {/* Hidden input for handling focus and typing */}
        <Input
          id="pin-input"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          disabled={disabled}
          value={pin}
          onChange={handleInputChange}
          className="absolute opacity-0 inset-0 w-full h-full cursor-pointer z-10"
          autoComplete="off"
        />

        {/* Visual representation of PIN digits */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-10 h-12 border-2 rounded-md flex items-center justify-center text-xl font-bold transition-all",
              // Active state
              index === pin.length && !disabled ? "border-primary ring-2 ring-primary/20" : "border-border",
              // Filled state
              index < pin.length ? "border-primary bg-primary/5 text-primary" : "bg-muted/10",
              // Error state
              error ? "border-destructive text-destuctive" : "",
              disabled ? "opacity-50 cursor-not-allowed" : ""
            )}
          >
            {index < pin.length ? "•" : ""}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
