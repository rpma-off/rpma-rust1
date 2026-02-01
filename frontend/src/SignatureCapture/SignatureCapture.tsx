'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, RotateCcw, Save, FileSignature as Signature, AlertTriangle, X, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SignatureType } from '@/types/workflow.types';

export interface SignatureData {
  signature: string;
  clientName?: string;
  technicianName?: string;
  notes?: string;
  conformityChecked?: boolean;
  signatureType?: SignatureType;
  timestamp?: string;
}

export interface SignatureCaptureProps {
  // Core functionality
  onSignatureComplete?: (signatureData: SignatureData) => void;
  onCapture?: (signatureData: SignatureData) => void;
  onCancel?: () => void;
  
  // Signature type and context
  signatureType?: SignatureType;
  title?: string;
  description?: string;
  
  // Form fields
  showClientName?: boolean;
  showTechnicianName?: boolean;
  showNotes?: boolean;
  showConformityCheck?: boolean;
  
  // Validation
  required?: boolean;
  minSignatureLength?: number;
  
  // UI options
  canvasWidth?: number;
  canvasHeight?: number;
  strokeWidth?: number;
  strokeColor?: string;
  backgroundColor?: string;
  
  // Styling
  className?: string;
  cardClassName?: string;
  
  // Pre-filled data
  initialData?: Partial<SignatureData>;
  
  // Actions
  onDownload?: (signatureData: SignatureData) => void;
  onUpload?: (file: File) => Promise<void>;
}

export function SignatureCapture({
  // Core functionality
  onSignatureComplete,
  onCapture,
  onCancel,
  
   // Signature type and context
   signatureType = 'complete' as SignatureType,
  title,
  description,
  
  // Form fields
  showClientName = true,
  showTechnicianName = true,
  showNotes = true,
  showConformityCheck = true,
  
  // Validation
  required = true,
  minSignatureLength = 50,
  
  // UI options
  canvasWidth = 400,
  canvasHeight = 200,
  strokeWidth = 2,
  strokeColor = '#000000',
  backgroundColor = '#ffffff',
  
  // Styling
  className,
  cardClassName,
  
  // Pre-filled data
  initialData = {},
  
  // Actions
  onDownload,
  onUpload,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signatureData, setSignatureData] = useState<SignatureData>({
    signature: '',
    clientName: initialData.clientName || '',
    technicianName: initialData.technicianName || '',
    notes: initialData.notes || '',
    conformityChecked: initialData.conformityChecked || false,
    signatureType,
    timestamp: new Date().toISOString(),
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Signature type configurations
  const signatureTypeConfig = {
    complete: {
      label: 'Fin de travail',
      color: 'bg-green-500',
      icon: CheckCircle,
    },
    partial: {
      label: 'Signature partielle',
      color: 'bg-yellow-500',
      icon: Signature,
    },
    initial: {
      label: 'Signature initiale',
      color: 'bg-blue-500',
      icon: Signature,
    },
  } as const;

  const currentTypeConfig = signatureTypeConfig[signatureType as keyof typeof signatureTypeConfig];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth * 2; // High DPI
    canvas.height = canvasHeight * 2;
    ctx.scale(2, 2);

    // Set drawing styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight, strokeColor, strokeWidth, backgroundColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY,
    });
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvasRef.current?.dispatchEvent(mouseEvent);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    setIsEmpty(true);
    setSignatureData(prev => ({ ...prev, signature: '' }));
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    return canvas.toDataURL('image/png');
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (required && isEmpty) {
      errors.push('La signature est requise');
    }

    if (required && !isEmpty && signatureData.signature.length < minSignatureLength) {
      errors.push(`La signature doit contenir au moins ${minSignatureLength} points`);
    }

    if (showClientName && required && !signatureData.clientName?.trim()) {
      errors.push('Le nom du client est requis');
    }

    if (showTechnicianName && required && !signatureData.technicianName?.trim()) {
      errors.push('Le nom du technicien est requis');
    }

    if (showConformityCheck && required && !signatureData.conformityChecked) {
      errors.push('La conformité doit être vérifiée');
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const finalSignatureData: SignatureData = {
        ...signatureData,
        signature: captureSignature(),
        timestamp: new Date().toISOString(),
      };

      await onSignatureComplete?.(finalSignatureData);
      await onCapture?.(finalSignatureData);
    } catch (error) {
      console.error('Error submitting signature:', error);
      setValidationErrors(['Erreur lors de la soumission de la signature']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    const signatureDataToDownload: SignatureData = {
      ...signatureData,
      signature: captureSignature(),
      timestamp: new Date().toISOString(),
    };

    if (onDownload) {
      onDownload(signatureDataToDownload);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.download = `signature-${signatureType}-${Date.now()}.png`;
      link.href = signatureDataToDownload.signature;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onUpload) return;

    try {
      await onUpload(file);
    } catch (error) {
      console.error('Error uploading signature:', error);
      setValidationErrors(['Erreur lors du téléchargement de la signature']);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <currentTypeConfig.icon className="h-5 w-5 text-gray-500" />
              <CardTitle className="text-lg">
                {title || currentTypeConfig.label}
              </CardTitle>
              <Badge className={currentTypeConfig.color}>
                {signatureType as string}
              </Badge>
            </div>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Signature Canvas */}
          <div className="space-y-4">
            <Label htmlFor="signature-canvas">Signature</Label>
            <div className="border rounded-lg p-4 bg-gray-50">
              <canvas
                ref={canvasRef}
                id="signature-canvas"
                width={canvasWidth}
                height={canvasHeight}
                className="border rounded cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                disabled={isEmpty}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Effacer
              </Button>
              {onUpload && (
                <Button variant="outline" size="sm" asChild>
                  <label>
                    <Upload className="h-4 w-4 mr-2" />
                    Importer
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </Button>
              )}
              {onDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showClientName && (
              <div className="space-y-2">
                <Label htmlFor="client-name">Nom du client</Label>
                <Input
                  id="client-name"
                  value={signatureData.clientName}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Nom du client"
                />
              </div>
            )}

            {showTechnicianName && (
              <div className="space-y-2">
                <Label htmlFor="technician-name">Nom du technicien</Label>
                <Input
                  id="technician-name"
                  value={signatureData.technicianName}
                  onChange={(e) => setSignatureData(prev => ({ ...prev, technicianName: e.target.value }))}
                  placeholder="Nom du technicien"
                />
              </div>
            )}
          </div>

          {showNotes && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={signatureData.notes}
                onChange={(e) => setSignatureData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>
          )}

          {showConformityCheck && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="conformity"
                checked={signatureData.conformityChecked}
                onCheckedChange={(checked) => 
                  setSignatureData(prev => ({ ...prev, conformityChecked: checked as boolean }))
                }
              />
              <Label htmlFor="conformity" className="text-sm">
                Je confirme que le travail a été effectué conformément aux standards de qualité
              </Label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (required && isEmpty)}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer la signature
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SignatureCapture;
