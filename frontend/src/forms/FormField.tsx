import React, { useId } from 'react';
import { AlertCircle, Check, AlertTriangle } from 'lucide-react';
import { FormAccessibility } from '@/lib/accessibility';

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  value: string | number | readonly string[] | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  children?: React.ReactNode;
  inputMode?: 'text' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autoComplete?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  touched = false,
  required = false,
  placeholder = '',
  className = '',
  inputClassName = '',
  children,
  inputMode,
  maxLength,
  min,
  max,
  step,
  autoComplete,
  disabled = false,
  readOnly = false,
}) => {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const fieldId = `field-${name}-${uniqueId}`;
  const labelId = `label-${name}-${uniqueId}`;
  const errorId = `error-${name}-${uniqueId}`;

  // Get ARIA attributes for the field
  const ariaProps = FormAccessibility.getFieldAriaProps({
    id: fieldId,
    label: labelId,
    error: hasError ? errorId : undefined,
    description: undefined,
    required,
  });
  
  return (
    <div className={`space-y-1 ${className}`}>
      <label
        htmlFor={fieldId}
        id={labelId}
        className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      
      <div className="relative">
        {children ? (
          children
        ) : (
          <input
            type={type}
            name={name}
            id={fieldId}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
             className={`flex h-10 w-full rounded-md border border-border bg-black-light px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-border-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''} ${inputClassName}`}
            placeholder={placeholder}
            inputMode={inputMode}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            autoComplete={autoComplete}
            disabled={disabled}
            readOnly={readOnly}
            {...ariaProps}
          />
        )}
        
        {hasError ? (
          <AlertTriangle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
        ) : isValid ? (
          <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
        ) : null}
      </div>
      
      {hasError && (
        <p
          id={errorId}
          className="text-xs text-red-500 mt-1 flex items-center"
          aria-live="assertive"
        >
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
