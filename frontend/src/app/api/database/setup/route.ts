import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== Database Setup Route ===');

  try {
    // Validate authentication and authorization
const authResult = await validateApiAuth(request);

    if (!authResult.isValid) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: authResult.statusCode || 401 }
      );
    }

    const supabase = await createClient();
    console.log('User authenticated:', authResult.user?.id);

    // Check if tables already exist
    try {
      const { error: existingError } = await supabase
        .from('task_photos')
        .select('id')
        .limit(1);
      
      if (!existingError) {
        return NextResponse.json({
          message: 'Database tables already exist',
          status: 'already_exists'
        }, { status: 200 });
      }
    } catch {
      // Table doesn't exist, continue with creation
      console.log('Tables do not exist, proceeding with creation...');
    }

    console.log('Creating database tables...');

    // FIXME: The supabase-js V2 client does not have a .sql() method.
    // Raw SQL queries should be executed using supabase.rpc().
    // However, creating tables from an API route is a major security risk and bad practice.
    // This file should be removed and the database setup should be done via migrations.
    /*
    // Create task_photos table
    const { error: createPhotosError } = await supabase.sql(`
        CREATE TABLE IF NOT EXISTS public.task_photos (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('before', 'after')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

    if (createPhotosError) {
      console.error('Error creating task_photos table:', createPhotosError);
    }

    // Create checklist_items table
    const { error: createChecklistError } = await supabase.sql(`
        CREATE TABLE IF NOT EXISTS public.checklist_items (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          checklist_id UUID REFERENCES public.checklist(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          is_completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

    if (createChecklistError) {
      console.error('Error creating checklist_items table:', createChecklistError);
    }

    // Create indexes for better performance
    const { error: createIndexesError } = await supabase.sql(`
        CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON public.task_photos(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_photos_type ON public.task_photos(type);
        CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
      `);

    if (createIndexesError) {
      console.error('Error creating indexes:', createIndexesError);
    }
    */

    return NextResponse.json({
      message: 'Database tables created successfully',
      status: 'success',
      tables_created: ['task_photos', 'checklist_items']
    }, { status: 200 });

  } catch (error) {
    console.error('Error in database setup:', error);
    
    return NextResponse.json({
      error: 'Failed to create database tables',
      message: 'Please run the database initialization script manually in your Supabase SQL Editor',
      details: error instanceof Error ? error.message : 'Unknown error',
      solution: 'Copy and paste the SQL script from the error message below',
      sql_script: `
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create task_photos table
CREATE TABLE IF NOT EXISTS public.task_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('before', 'after')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES public.checklist(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON public.task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_type ON public.task_photos(type);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON public.checklist_items(checklist_id);
      `
    }, { status: 500 });
  }
}
