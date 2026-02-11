'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Material } from '@/lib/inventory';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface StockLevelIndicatorProps {
  material: Material;
  showDetails?: boolean;
  className?: string;
}

export function StockLevelIndicator({ 
  material, 
  showDetails = false,
  className = '' 
}: StockLevelIndicatorProps) {
  const getStockStatus = () => {
    if (material.current_stock <= 0) {
      return { status: 'out', color: 'destructive', icon: XCircle, label: 'Out of Stock' };
    }
    
    if (material.is_expired) {
      return { status: 'expired', color: 'destructive', icon: XCircle, label: 'Expired' };
    }
    
    if (material.is_discontinued) {
      return { status: 'discontinued', color: 'secondary', icon: Minus, label: 'Discontinued' };
    }
    
    if (material.is_low_stock) {
      return { status: 'low', color: 'warning', icon: AlertTriangle, label: 'Low Stock' };
    }
    
    if (material.maximum_stock && material.current_stock >= material.maximum_stock * 0.9) {
      return { status: 'high', color: 'secondary', icon: TrendingUp, label: 'High Stock' };
    }
    
    return { status: 'optimal', color: 'success', icon: CheckCircle, label: 'Optimal' };
  };

  const getProgressPercentage = () => {
    if (material.minimum_stock == null && material.maximum_stock == null) {
      return material.current_stock > 0 ? 100 : 0;
    }
    
    if (material.maximum_stock) {
      return Math.min((material.current_stock / material.maximum_stock) * 100, 100);
    }
    
    // When only minimum stock is set, consider 3x minimum as optimal
    const minimumStock = material.minimum_stock ?? 0;
    const optimalLevel = Math.max(minimumStock * 3, 1);
    return Math.min((material.current_stock / optimalLevel) * 100, 100);
  };

  const getProgressColor = () => {
    const stockStatus = getStockStatus();
    switch (stockStatus.status) {
      case 'out':
      case 'expired':
      case 'critical':
        return 'bg-destructive';
      case 'low':
        return 'bg-yellow-500';
      case 'high':
        return 'bg-blue-500';
      default:
        return 'bg-green-500';
    }
  };

  const stockStatus = getStockStatus();
  const progressPercentage = getProgressPercentage();
  const StatusIcon = stockStatus.icon;

  const formatStockValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(value % 1 === 0 ? 0 : 2);
  };

  const getDaysUntilExpiry = () => {
    if (!material.expiry_date) return null;
    
    const now = new Date();
    const expiry = new Date(material.expiry_date);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  if (showDetails) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Stock Status: {material.name}</span>
            <Badge variant={stockStatus.color as any} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {stockStatus.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Min</span>
                  <span>{material.minimum_stock ? 
                    (material.minimum_stock >= 1000 
                      ? `${(material.minimum_stock / 1000).toFixed(1)}k` 
                      : material.minimum_stock.toFixed(2)
                  ) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Max</span>
                  <span>{material.maximum_stock ? 
                    (material.maximum_stock >= 1000 
                      ? `${(material.maximum_stock / 1000).toFixed(1)}k` 
                      : material.maximum_stock.toFixed(2)
                  ) : 'N/A'}
                  </span>
                </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-2"
              // Custom color handling is not directly supported, so we use a visual indicator
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              {material.minimum_stock && (
                <span>Min: {formatStockValue(material.minimum_stock)}</span>
              )}
              {material.maximum_stock && (
                <span>Max: {formatStockValue(material.maximum_stock)}</span>
              )}
              {material.reorder_point && (
                  <span>Reorder: {material.reorder_point ? 
                    (material.reorder_point >= 1000 
                      ? `${(material.reorder_point / 1000).toFixed(1)}k` 
                      : material.reorder_point.toFixed(2)
                  ) : 'N/A'}
                  </span>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Material Type:</span>
              <div className="font-medium capitalize">{material.material_type.replace('_', ' ')}</div>
            </div>
            
            <div>
              <span className="text-muted-foreground">Unit Cost:</span>
              <div className="font-medium">
                {material.unit_cost ? `${material.unit_cost.toFixed(2)} ${material.currency}` : 'N/A'}
              </div>
            </div>

            {material.supplier_name && (
              <div>
                <span className="text-muted-foreground">Supplier:</span>
                <div className="font-medium">{material.supplier_name}</div>
              </div>
            )}

            {material.storage_location && (
              <div>
                <span className="text-muted-foreground">Location:</span>
                <div className="font-medium">{material.storage_location}</div>
              </div>
            )}

            {material.expiry_date && (
              <div>
                <span className="text-muted-foreground">Expiry Date:</span>
                <div className={`font-medium ${isExpiringSoon ? 'text-yellow-600' : ''}`}>
                  {new Date(material.expiry_date).toLocaleDateString()}
                  {isExpiringSoon && ` (${daysUntilExpiry} days)`}
                </div>
              </div>
            )}

            {material.batch_number && (
              <div>
                <span className="text-muted-foreground">Batch:</span>
                <div className="font-medium">{material.batch_number}</div>
              </div>
            )}
          </div>

          {/* Quality Information */}
          {(material.quality_grade || material.certification) && (
            <div className="pt-2 border-t">
              <div className="text-sm text-muted-foreground mb-1">Quality Information</div>
              <div className="flex flex-wrap gap-2">
                {material.quality_grade && (
                  <Badge variant="outline" className="text-xs">
                    Grade: {material.quality_grade}
                  </Badge>
                )}
                {material.certification && (
                  <Badge variant="outline" className="text-xs">
                    {material.certification}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {material.is_expired && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="h-4 w-4" />
                <span>This material has expired and should not be used</span>
              </div>
            </div>
          )}

          {material.is_discontinued && (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <Minus className="h-4 w-4" />
                <span>This material is discontinued</span>
              </div>
            </div>
          )}

          {material.is_low_stock && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 text-yellow-700 text-sm">
                <AlertTriangle className="h-4 w-4" />
                  <span>
                    Low stock: {material.current_stock >= 1000 
                      ? `${(material.current_stock / 1000).toFixed(1)}k` 
                      : material.current_stock.toFixed(2)
                    } {material.unit_of_measure}
                  </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Compact version
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute top-0 left-0 h-full transition-all ${getProgressColor()}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {formatStockValue(material.current_stock)}
            </span>
            <Badge variant={stockStatus.color as any} className="text-xs px-2 py-0.5">
              <StatusIcon className="h-3 w-3" />
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{material.name}</div>
              <div>Stock: {material.current_stock >= 1000 
                    ? `${(material.current_stock / 1000).toFixed(1)}k` 
                    : material.current_stock.toFixed(2)
                  } {material.unit_of_measure}</div>
            <div>Status: {stockStatus.label}</div>
            {material.minimum_stock && (
              <div>Min: {formatStockValue(material.minimum_stock)}</div>
            )}
            {material.reorder_point && (
              <div>Reorder at: {formatStockValue(material.reorder_point)}</div>
            )}
            {material.expiry_date && (
              <div>Expires: {new Date(material.expiry_date).toLocaleDateString()}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
