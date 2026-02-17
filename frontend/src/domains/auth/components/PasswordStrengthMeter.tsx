'use client';

import React, { useState, useEffect } from 'react';
import {
  validatePassword,
  PasswordValidationResult
} from '@/lib/auth/password-validator';

interface PasswordStrengthMeterProps {
  password: string;
  onValidationChange?: (validation: PasswordValidationResult) => void;
  showFeedback?: boolean;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  onValidationChange,
  showFeedback = true
}) => {
  const [validation, setValidation] = useState<PasswordValidationResult>({
    isValid: false,
    strength: 'weak',
    score: 0,
    issues: [],
    feedback: { suggestions: [] }
  });

  // Validate password on change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validatePassword(password);
      setValidation(result);
      if (onValidationChange) {
        onValidationChange(result);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [password, onValidationChange]);

  // Get color based on strength
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      case 'very-strong':
        return 'bg-green-600';
      default:
        return 'bg-gray-300';
    }
  };

  // Calculate width percentage based on score
  const getWidthPercentage = (score: number) => {
    return `${score}%`;
  };

  return (
    <div className="w-full mt-2">
      {/* Strength meter bar */}
      <div className="w-full bg-border rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${getStrengthColor(validation.strength)}`}
          style={{ width: getWidthPercentage(validation.score) }}
        ></div>
      </div>

      {/* Strength label */}
      <p className="text-sm mt-1 flex justify-between">
        <span>Strength:</span>
        <span className={`font-medium capitalize ${
          validation.strength === 'weak' ? 'text-red-500' :
          validation.strength === 'medium' ? 'text-yellow-500' :
          validation.strength === 'strong' ? 'text-green-500' :
          'text-green-600'
        }`}>
          {validation.strength}
        </span>
      </p>

      {/* Feedback section */}
      {showFeedback && password && (
        <div className="mt-2">
          {validation.feedback.warning && (
            <p className="text-sm text-red-500 mt-1">{validation.feedback.warning}</p>
          )}

          {validation.issues.length > 0 && (
            <ul className="text-sm text-red-500 mt-1 list-disc pl-5">
              {validation.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          )}

          {validation.feedback.suggestions.length > 0 && !validation.isValid && (
            <div className="mt-2">
              <p className="text-sm font-medium">Suggestions:</p>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {validation.feedback.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
