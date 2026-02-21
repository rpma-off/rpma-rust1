/**
 * Signature Capture Component
 */

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Trash2 } from 'lucide-react';

interface SignatureCaptureProps {
  onSignatureCapture: (signatureData: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureCapture,
  width = 400,
  height = 200,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const captureSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');
    onSignatureCapture(signatureData);
  }, [onSignatureCapture]);

  return (
    <div className={`signature-capture ${className}`}>
      <div className="border border-border/20 rounded-lg p-4 bg-border/5">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-foreground mb-2">
            Signature
          </h3>
          <p className="text-sm text-muted-foreground">
            Signez dans la zone ci-dessous
          </p>
        </div>

        <div className="border-2 border-border/20 rounded-lg p-2 mb-4 bg-border/10">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="border border-border/30 rounded cursor-crosshair bg-white"
            style={{ width: '100%', height: 'auto' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature}
            className="border-border/20 text-foreground hover:bg-border/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Effacer
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={captureSignature}
            disabled={!hasSignature}
            className="bg-[hsl(var(--rpma-teal))] hover:bg-[hsl(var(--rpma-teal))]/80"
          >
            <Pen className="h-4 w-4 mr-2" />
            Capturer
          </Button>
        </div>
      </div>
    </div>
  );
};
