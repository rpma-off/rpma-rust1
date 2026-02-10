'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Material, MaterialType, UnitOfMeasure } from '@/lib/inventory';
import { useInventory } from '@/hooks/useInventory';
import { Loader2, Package, AlertTriangle } from 'lucide-react';

const materialFormSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Material name is required'),
  description: z.string().optional(),
  material_type: z.enum(['ppf_film', 'adhesive', 'cleaning_solution', 'tool', 'consumable']),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  unit_of_measure: z.enum(['piece', 'meter', 'liter', 'gram', 'roll']),
  current_stock: z.number().min(0, 'Stock must be positive'),
  minimum_stock: z.number().min(0, 'Minimum stock must be positive').optional(),
  maximum_stock: z.number().min(0, 'Maximum stock must be positive').optional(),
  reorder_point: z.number().min(0, 'Reorder point must be positive').optional(),
  unit_cost: z.number().min(0, 'Unit cost must be positive').optional(),
  currency: z.string().default('EUR'),
  supplier_id: z.string().optional(),
  supplier_name: z.string().optional(),
  supplier_sku: z.string().optional(),
  quality_grade: z.string().optional(),
  certification: z.string().optional(),
  expiry_date: z.string().optional(),
  batch_number: z.string().optional(),
  storage_location: z.string().optional(),
  warehouse_id: z.string().optional(),
});

type MaterialFormData = z.infer<typeof materialFormSchema>;

interface MaterialFormProps {
  material?: Material;
  onSuccess?: (material: Material) => void;
  onCancel?: () => void;
  userId: string;
}

export function MaterialForm({ material, onSuccess, onCancel, userId }: MaterialFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createMaterial, updateMaterial } = useInventory();

  const form = useForm<MaterialFormData>({
    resolver: zodResolver(materialFormSchema) as any,
    defaultValues: {
      sku: material?.sku || '',
      name: material?.name || '',
      description: material?.description || '',
      material_type: material?.material_type || 'ppf_film',
      category: material?.category || '',
      subcategory: material?.subcategory || '',
      brand: material?.brand || '',
      model: material?.model || '',
      unit_of_measure: material?.unit_of_measure || 'piece',
      current_stock: material?.current_stock || 0,
      minimum_stock: material?.minimum_stock || undefined,
      maximum_stock: material?.maximum_stock || undefined,
      reorder_point: material?.reorder_point || undefined,
      unit_cost: material?.unit_cost || undefined,
      currency: material?.currency || 'EUR',
      supplier_id: material?.supplier_id || '',
      supplier_name: material?.supplier_name || '',
      supplier_sku: material?.supplier_sku || '',
      quality_grade: material?.quality_grade || '',
      certification: material?.certification || '',
      expiry_date: material?.expiry_date ? new Date(material.expiry_date).toISOString().split('T')[0] : '',
      batch_number: material?.batch_number || '',
      storage_location: material?.storage_location || '',
      warehouse_id: material?.warehouse_id || '',
    },
  });

  const watchedMaterialType = form.watch('material_type');
  const watchedUnitOfMeasure = form.watch('unit_of_measure');

  const onSubmit = async (data: MaterialFormData) => {
    try {
      setLoading(true);
      setError(null);

      const transformedData = {
        ...data,
        expiry_date: data.expiry_date ? new Date(data.expiry_date).toISOString() : undefined,
        specifications: undefined, // Could be added as a separate field
        serial_numbers: undefined, // Could be added as a separate field
      };

      let result: Material;
      if (material) {
        result = await updateMaterial(material.id, transformedData, userId);
      } else {
        result = await createMaterial(transformedData, userId);
      }

      onSuccess?.(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const materialTypeOptions = [
    { value: 'ppf_film', label: 'PPF Film' },
    { value: 'adhesive', label: 'Adhesive' },
    { value: 'cleaning_solution', label: 'Cleaning Solution' },
    { value: 'tool', label: 'Tool' },
    { value: 'consumable', label: 'Consumable' },
  ];

  const unitOfMeasureOptions = [
    { value: 'piece', label: 'Piece' },
    { value: 'meter', label: 'Meter' },
    { value: 'liter', label: 'Liter' },
    { value: 'gram', label: 'Gram' },
    { value: 'roll', label: 'Roll' },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {material ? 'Edit Material' : 'Add New Material'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter material name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="material_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materialTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Specifications</h3>
                
                <FormField
                  control={form.control}
                  name="unit_of_measure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit of measure" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitOfMeasureOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter brand" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter model" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quality_grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quality Grade</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quality grade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="certification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certification</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter certification" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Inventory Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Inventory Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="current_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimum_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorder_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Point</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pricing Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pricing Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="EUR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Supplier Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplier_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplier_sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier SKU" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Storage Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Storage Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="batch_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter batch number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storage_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter storage location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter warehouse ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {material ? 'Update Material' : 'Create Material'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
