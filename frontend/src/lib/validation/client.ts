import { z } from 'zod';

// Zod schemas for Tauri command inputs - matching Rust structs

// Address schema
export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

// Create client request schema
export const createClientRequestSchema = z.object({
  // Required fields
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),

  // Optional fields
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().optional(),
  customer_type: z.enum(['individual', 'business']).default('individual'),
  address: addressSchema.optional(),
  tax_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
   tags: z.string().optional(),
});

// Update client request schema
export const updateClientRequestSchema = z.object({
  id: z.string().uuid('Invalid client ID'),

  // Optional update fields
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  customer_type: z.enum(['individual', 'business']).optional(),
  address: addressSchema.optional(),
  tax_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  notes: z.string().optional(),
   tags: z.string().optional(),
});

// Client query schema for listing/searching
export const clientQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  customer_type: z.enum(['individual', 'business']).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'created_at', 'updated_at', 'customer_type']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

// Client search schema
export const clientSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().int().min(1).max(100).default(20),
});

// Comprehensive client schema for form validation
export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  customer_type: z.enum(['individual', 'business']).default('individual'),

  // Address fields
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  address_country: z.string().optional(),

  // Business fields
  tax_id: z.string().optional(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),

  // Additional fields
  notes: z.string().optional(),
   tags: z.string().optional(),

  // Metadata (read-only)
  total_tasks: z.number().int().optional(),
  active_tasks: z.number().int().optional(),
  completed_tasks: z.number().int().optional(),
  last_task_date: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().optional(),
});

// Type exports
export type CreateClientRequest = z.infer<typeof createClientRequestSchema>;
export type UpdateClientRequest = z.infer<typeof updateClientRequestSchema>;
export type ClientQuery = z.infer<typeof clientQuerySchema>;
export type ClientSearch = z.infer<typeof clientSearchSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type Address = z.infer<typeof addressSchema>;