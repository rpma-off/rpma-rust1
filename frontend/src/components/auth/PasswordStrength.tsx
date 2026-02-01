'use client';

import React from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  onPasswordChange: (password: string) => void;
  className?: string;
}

interface Requirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

export function PasswordStrength({ 
  password, 
  showPassword, 
  onTogglePassword, 
  onPasswordChange,
  className = ""
}: PasswordStrengthProps) {
  
  const requirements: Requirement[] = [
    {
      regex: /.{8,}/,
      text: 'Au moins 8 caractères',
      met: password.length >= 8
    },
    {
      regex: /[A-Z]/,
      text: 'Une lettre majuscule',
      met: /[A-Z]/.test(password)
    },
    {
      regex: /[a-z]/,
      text: 'Une lettre minuscule',
      met: /[a-z]/.test(password)
    },
    {
      regex: /[0-9]/,
      text: 'Un chiffre',
      met: /[0-9]/.test(password)
    },
    {
      regex: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
      text: 'Un caractère spécial',
      met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    }
  ];

  const metRequirements = requirements.filter(req => req.met).length;
  const strengthPercentage = (metRequirements / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage <= 20) return 'bg-red-500';
    if (strengthPercentage <= 40) return 'bg-orange-500';
    if (strengthPercentage <= 60) return 'bg-yellow-500';
    if (strengthPercentage <= 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercentage <= 20) return 'Très faible';
    if (strengthPercentage <= 40) return 'Faible';
    if (strengthPercentage <= 60) return 'Moyen';
    if (strengthPercentage <= 80) return 'Fort';
    return 'Très fort';
  };

  const getStrengthTextColor = () => {
    if (strengthPercentage <= 40) return 'text-red-600';
    if (strengthPercentage <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const checkCommonPatterns = (pwd: string): string[] => {
    const patterns = [];
    const lowerPwd = pwd.toLowerCase();

    if (lowerPwd.includes('password')) patterns.push('contient "password"');
    if (lowerPwd.includes('123456')) patterns.push('contient une séquence commune');
    if (lowerPwd.includes('qwerty')) patterns.push('contient "qwerty"');
    if (lowerPwd.includes('admin')) patterns.push('contient "admin"');
    
    // Check for sequential characters
    for (let i = 0; i < pwd.length - 2; i++) {
      const char1 = pwd.charCodeAt(i);
      const char2 = pwd.charCodeAt(i + 1);
      const char3 = pwd.charCodeAt(i + 2);
      
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        patterns.push('contient des caractères séquentiels');
        break;
      }
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        patterns.push('contient des caractères séquentiels');
        break;
      }
    }

    // Check for repeated characters
    let repeatCount = 1;
    for (let i = 1; i < pwd.length; i++) {
      if (pwd[i] === pwd[i - 1]) {
        repeatCount++;
        if (repeatCount >= 3) {
          patterns.push('contient trop de caractères répétés');
          break;
        }
      } else {
        repeatCount = 1;
      }
    }

    return patterns;
  };

  const commonPatterns = checkCommonPatterns(password);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Votre mot de passe"
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5 text-gray-400" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {password && (
        <div className="space-y-2">
          {/* Strength indicator */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Force du mot de passe</span>
              <span className={`text-sm font-medium ${getStrengthTextColor()}`}>
                {getStrengthText()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>
          </div>

          {/* Requirements checklist */}
          <div className="space-y-1">
            <p className="text-sm text-gray-600 font-medium">Exigences:</p>
            <div className="space-y-1">
              {requirements.map((requirement, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {requirement.met ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${requirement.met ? 'text-green-600' : 'text-gray-600'}`}>
                    {requirement.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Common patterns warnings */}
          {commonPatterns.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="text-sm text-yellow-800 font-medium mb-1">⚠️ Avertissements:</p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {commonPatterns.map((pattern, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Password tips */}
          {metRequirements < requirements.length && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2">
              <p className="text-sm text-blue-800">
                <strong>Conseil:</strong> Utilisez une combinaison de lettres, chiffres et symboles. 
                Évitez les informations personnelles comme les dates de naissance ou les noms.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}