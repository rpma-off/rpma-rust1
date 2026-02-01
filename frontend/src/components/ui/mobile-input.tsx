import * as React from "react"
import { cn } from "@/lib/utils"
import { createInputClass } from "@/lib/component-standards"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  state?: 'error' | 'success';
  touchOptimized?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, state, touchOptimized = false, ...props }, ref) => {
    const baseClasses = createInputClass(state);

    // Add touch optimizations for mobile
    const touchClasses = touchOptimized
      ? "min-h-[44px] text-base" // Larger touch target and better mobile text size
      : "";

    // Optimize input types for mobile keyboards
    const getInputMode = (inputType: string) => {
      switch (inputType) {
        case 'email':
          return 'email';
        case 'tel':
        case 'phone':
          return 'tel';
        case 'number':
        case 'numeric':
          return 'numeric';
        case 'url':
          return 'url';
        case 'search':
          return 'search';
        default:
          return 'text';
      }
    };

    return (
      <input
        type={type}
        className={cn(baseClasses, touchClasses, className)}
        ref={ref}
        inputMode={getInputMode(type || 'text')}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'off'}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoCorrect={type === 'email' ? 'off' : 'on'}
        spellCheck={type === 'email' ? false : true}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }