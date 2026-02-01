export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          task_number: string
          title: string
          description: string | null
          vehicle_plate: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          vehicle_make: string | null
          vin: string | null
          ppf_zone: string | null
          custom_ppf_zones: string | null
          status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          technician_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          scheduled_date: string | null
          start_time: string | null
          end_time: string | null
          date_rdv: string | null
          heure_rdv: string | null
          template_id: string | null
          workflow_id: string | null
          workflow_status: string | null
          current_workflow_step_id: string | null
          started_at: string | null
          completed_at: string | null
          completed_steps: string | null
          client_id: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          customer_address: string | null
          external_id: string | null
          lot_film: string | null
          checklist_completed: boolean
          notes: string | null
          tags: string | null
          estimated_duration: number | null
          actual_duration: number | null
          created_at: string
          updated_at: string
          creator_id: string | null
          created_by: string | null
          updated_by: string | null
          synced: number
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          task_number?: string
          title: string
          description?: string | null
          vehicle_plate?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_make?: string | null
          vin?: string | null
          ppf_zone?: string | null
          custom_ppf_zones?: string | null
          status?: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          technician_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          end_time?: string | null
          date_rdv?: string | null
          heure_rdv?: string | null
          template_id?: string | null
          workflow_id?: string | null
          workflow_status?: string | null
          current_workflow_step_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_steps?: string | null
          client_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          external_id?: string | null
          lot_film?: string | null
          checklist_completed?: boolean
          notes?: string | null
          tags?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          created_at?: string
          updated_at?: string
          creator_id?: string | null
          created_by?: string | null
          updated_by?: string | null
          synced?: number
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          task_number?: string
          title?: string
          description?: string | null
          vehicle_plate?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          vehicle_make?: string | null
          vin?: string | null
          ppf_zone?: string | null
          custom_ppf_zones?: string | null
          status?: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          technician_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          end_time?: string | null
          date_rdv?: string | null
          heure_rdv?: string | null
          template_id?: string | null
          workflow_id?: string | null
          workflow_status?: string | null
          current_workflow_step_id?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_steps?: string | null
          client_id?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          external_id?: string | null
          lot_film?: string | null
          checklist_completed?: boolean
          notes?: string | null
          tags?: string | null
          estimated_duration?: number | null
          actual_duration?: number | null
          created_at?: string
          updated_at?: string
          creator_id?: string | null
          created_by?: string | null
          updated_by?: string | null
          synced?: number
          last_synced_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          full_name: string
          role: 'admin' | 'technician' | 'supervisor' | 'viewer'
          phone: string | null
          is_active: boolean
          last_login_at: number | null
          login_count: number
          preferences: Json | null
          synced: boolean
          last_synced_at: number | null
          created_at: number
          updated_at: number
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          full_name: string
          role?: 'admin' | 'technician' | 'supervisor' | 'viewer'
          phone?: string | null
          is_active?: boolean
          last_login_at?: number | null
          login_count?: number
          preferences?: Json | null
          synced?: boolean
          last_synced_at?: number | null
          created_at?: number
          updated_at?: number
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: 'admin' | 'technician' | 'supervisor' | 'viewer'
          phone?: string | null
          is_active?: boolean
          last_login_at?: number | null
          login_count?: number
          preferences?: Json | null
          synced?: boolean
          last_synced_at?: number | null
          created_at?: number
          updated_at?: number
        }
      }
      photos: {
        Row: {
          id: string
          intervention_id: string
          step_id: string | null
          step_number: number | null
          file_path: string
          file_name: string | null
          file_size: number | null
          mime_type: string
          width: number | null
          height: number | null
          photo_type: 'before' | 'during' | 'after' | null
          photo_category: 'vehicle_condition' | 'workspace' | 'step_progress' | 'qc_check' | 'final_result' | null
          photo_angle: string | null
          zone: string | null
          title: string | null
          description: string | null
          notes: string | null
          annotations: Json | null
          gps_location: Json | null
          quality_score: number | null
          blur_score: number | null
          exposure_score: number | null
          composition_score: number | null
          is_required: boolean
          is_approved: boolean
          approved_by: string | null
          approved_at: number | null
          rejection_reason: string | null
          synced: boolean
          storage_url: string | null
          upload_retry_count: number
          upload_error: string | null
          last_synced_at: number | null
          captured_at: number | null
          uploaded_at: number | null
          created_at: number
          updated_at: number
        }
        Insert: {
          id?: string
          intervention_id: string
          step_id?: string | null
          step_number?: number | null
          file_path: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string
          width?: number | null
          height?: number | null
          photo_type?: 'before' | 'during' | 'after' | null
          photo_category?: 'vehicle_condition' | 'workspace' | 'step_progress' | 'qc_check' | 'final_result' | null
          photo_angle?: string | null
          zone?: string | null
          title?: string | null
          description?: string | null
          notes?: string | null
          annotations?: Json | null
          gps_location?: Json | null
          quality_score?: number | null
          blur_score?: number | null
          exposure_score?: number | null
          composition_score?: number | null
          is_required?: boolean
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: number | null
          rejection_reason?: string | null
          synced?: boolean
          storage_url?: string | null
          upload_retry_count?: number
          upload_error?: string | null
          last_synced_at?: number | null
          captured_at?: number | null
          uploaded_at?: number | null
          created_at?: number
          updated_at?: number
        }
        Update: {
          id?: string
          intervention_id?: string
          step_id?: string | null
          step_number?: number | null
          file_path?: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string
          width?: number | null
          height?: number | null
          photo_type?: 'before' | 'during' | 'after' | null
          photo_category?: 'vehicle_condition' | 'workspace' | 'step_progress' | 'qc_check' | 'final_result' | null
          photo_angle?: string | null
          zone?: string | null
          title?: string | null
          description?: string | null
          notes?: string | null
          annotations?: Json | null
          gps_location?: Json | null
          quality_score?: number | null
          blur_score?: number | null
          exposure_score?: number | null
          composition_score?: number | null
          is_required?: boolean
          is_approved?: boolean
          approved_by?: string | null
          approved_at?: number | null
          rejection_reason?: string | null
          synced?: boolean
          storage_url?: string | null
          upload_retry_count?: number
          upload_error?: string | null
          last_synced_at?: number | null
          captured_at?: number | null
          uploaded_at?: number | null
          created_at?: number
          updated_at?: number
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          customer_type: 'individual' | 'business'
          address_street: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          address_country: string | null
          tax_id: string | null
          company_name: string | null
          contact_person: string | null
          notes: string | null
          tags: string | null
          total_tasks: number
          active_tasks: number
          completed_tasks: number
          last_task_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          synced: boolean
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          customer_type?: 'individual' | 'business'
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          address_country?: string | null
          tax_id?: string | null
          company_name?: string | null
          contact_person?: string | null
          notes?: string | null
          tags?: string | null
          total_tasks?: number
          active_tasks?: number
          completed_tasks?: number
          last_task_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          synced?: boolean
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          customer_type?: 'individual' | 'business'
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          address_country?: string | null
          tax_id?: string | null
          company_name?: string | null
          contact_person?: string | null
          notes?: string | null
          tags?: string | null
          total_tasks?: number
          active_tasks?: number
          completed_tasks?: number
          last_task_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          synced?: boolean
          last_synced_at?: string | null
        }
      }
      change_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          old_values: Json | null
          new_values: Json | null
          changed_fields: string[] | null
          changed_by: string | null
          resource_type: string | null
          resource_id: string | null
          user_id: string | null
          user_email: string | null
          user_name: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          old_values?: Json | null
          new_values?: Json | null
          changed_fields?: string[] | null
          changed_by?: string | null
          resource_type?: string | null
          resource_id?: string | null
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'create' | 'update' | 'delete'
          old_values?: Json | null
          new_values?: Json | null
          changed_fields?: string[] | null
          changed_by?: string | null
          resource_type?: string | null
          resource_id?: string | null
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          timestamp?: string
        }
      }
      task_photos: {
        Row: {
          id: string
          task_id: string
          photo_type: 'before' | 'after' | 'during'
          file_path: string
          file_size: number
          mime_type: string
          url: string
          description: string | null
          taken_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          photo_type: 'before' | 'after' | 'during'
          file_path: string
          file_size: number
          mime_type: string
          url: string
          description?: string | null
          taken_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          photo_type?: 'before' | 'after' | 'during'
          file_path?: string
          file_size?: number
          mime_type?: string
          url?: string
          description?: string | null
          taken_at?: string | null
          created_at?: string
        }
      }
      technicians: {
        Row: {
          id: string
          user_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          role: string | null
          specialization: string | null
          certification_level: string | null
          is_available: boolean
          current_task_id: string | null
          total_tasks_completed: number
          average_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string | null
          specialization?: string | null
          certification_level?: string | null
          is_available?: boolean
          current_task_id?: string | null
          total_tasks_completed?: number
          average_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          role?: string | null
          specialization?: string | null
          certification_level?: string | null
          is_available?: boolean
          current_task_id?: string | null
          total_tasks_completed?: number
          average_rating?: number | null
          created_at?: string
          updated_at?: string
        }
      }
       interventions: {
         Row: {
           id: string
           task_number: string
           status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
           vehicle_plate: string
           vehicle_model: string | null
           vehicle_make: string | null
           vehicle_year: number | null
           vehicle_color: string | null
           vehicle_vin: string | null
           client_id: string | null
           client_name: string | null
           client_email: string | null
           client_phone: string | null
           technician_id: string | null
           technician_name: string | null
           intervention_type: string
           current_step: number
           completion_percentage: number | null
           ppf_zones_config: string | null
           ppf_zones_extended: string | null
           film_type: 'standard' | 'premium' | 'matte' | 'colored' | null
           film_brand: string | null
           film_model: string | null
           scheduled_at: number | null
           started_at: number | null
           completed_at: number | null
           paused_at: number | null
           estimated_duration: number | null
           actual_duration: number | null
           weather_condition: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'windy' | 'other' | null
           lighting_condition: 'natural' | 'artificial' | 'mixed' | null
           work_location: 'indoor' | 'outdoor' | 'semi_covered' | null
           temperature_celsius: number | null
           humidity_percentage: number | null
           start_location_lat: number | null
           start_location_lon: number | null
           start_location_accuracy: number | null
           end_location_lat: number | null
           end_location_lon: number | null
           end_location_accuracy: number | null
           customer_satisfaction: number | null
           quality_score: number | null
           final_observations: string | null
           customer_signature: string | null
           customer_comments: string | null
           metadata: string | null
           notes: string | null
           special_instructions: string | null
           device_info: string | null
           app_version: string | null
           synced: number
           last_synced_at: number | null
           sync_error: string | null
           created_at: number
           updated_at: number
           created_by: string | null
           updated_by: string | null
         }
         Insert: {
           id?: string
           task_number: string
           status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
           vehicle_plate: string
           vehicle_model?: string | null
           vehicle_make?: string | null
           vehicle_year?: number | null
           vehicle_color?: string | null
           vehicle_vin?: string | null
           client_id?: string | null
           client_name?: string | null
           client_email?: string | null
           client_phone?: string | null
           technician_id?: string | null
           technician_name?: string | null
           intervention_type?: string
           current_step?: number
           completion_percentage?: number | null
           ppf_zones_config?: string | null
           ppf_zones_extended?: string | null
           film_type?: 'standard' | 'premium' | 'matte' | 'colored' | null
           film_brand?: string | null
           film_model?: string | null
           scheduled_at?: number | null
           started_at?: number | null
           completed_at?: number | null
           paused_at?: number | null
           estimated_duration?: number | null
           actual_duration?: number | null
           weather_condition?: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'windy' | 'other' | null
           lighting_condition?: 'natural' | 'artificial' | 'mixed' | null
           work_location?: 'indoor' | 'outdoor' | 'semi_covered' | null
           temperature_celsius?: number | null
           humidity_percentage?: number | null
           start_location_lat?: number | null
           start_location_lon?: number | null
           start_location_accuracy?: number | null
           end_location_lat?: number | null
           end_location_lon?: number | null
           end_location_accuracy?: number | null
           customer_satisfaction?: number | null
           quality_score?: number | null
           final_observations?: string | null
           customer_signature?: string | null
           customer_comments?: string | null
           metadata?: string | null
           notes?: string | null
           special_instructions?: string | null
           device_info?: string | null
           app_version?: string | null
           synced?: number
           last_synced_at?: number | null
           sync_error?: string | null
           created_at?: number
           updated_at?: number
           created_by?: string | null
           updated_by?: string | null
         }
         Update: {
           id?: string
           task_number?: string
           status?: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled'
           vehicle_plate?: string
           vehicle_model?: string | null
           vehicle_make?: string | null
           vehicle_year?: number | null
           vehicle_color?: string | null
           vehicle_vin?: string | null
           client_id?: string | null
           client_name?: string | null
           client_email?: string | null
           client_phone?: string | null
           technician_id?: string | null
           technician_name?: string | null
           intervention_type?: string
           current_step?: number
           completion_percentage?: number | null
           ppf_zones_config?: string | null
           ppf_zones_extended?: string | null
           film_type?: 'standard' | 'premium' | 'matte' | 'colored' | null
           film_brand?: string | null
           film_model?: string | null
           scheduled_at?: number | null
           started_at?: number | null
           completed_at?: number | null
           paused_at?: number | null
           estimated_duration?: number | null
           actual_duration?: number | null
           weather_condition?: 'sunny' | 'cloudy' | 'rainy' | 'foggy' | 'windy' | 'other' | null
           lighting_condition?: 'natural' | 'artificial' | 'mixed' | null
           work_location?: 'indoor' | 'outdoor' | 'semi_covered' | null
           temperature_celsius?: number | null
           humidity_percentage?: number | null
           start_location_lat?: number | null
           start_location_lon?: number | null
           start_location_accuracy?: number | null
           end_location_lat?: number | null
           end_location_lon?: number | null
           end_location_accuracy?: number | null
           customer_satisfaction?: number | null
           quality_score?: number | null
           final_observations?: string | null
           customer_signature?: string | null
           customer_comments?: string | null
           metadata?: string | null
           notes?: string | null
           special_instructions?: string | null
           device_info?: string | null
           app_version?: string | null
           synced?: number
           last_synced_at?: number | null
           sync_error?: string | null
           created_at?: number
           updated_at?: number
           created_by?: string | null
           updated_by?: string | null
         }
       }
       security_policies: {
         Row: {
           id: string
           name: string
           description: string | null
           policy_type: 'password' | 'session' | 'access' | 'data'
           rules: Json
           is_active: boolean
           applies_to: string[]
           created_at: string
           updated_at: string
           created_by: string | null
           updated_by: string | null
         }
         Insert: {
           id?: string
           name: string
           description?: string | null
           policy_type: 'password' | 'session' | 'access' | 'data'
           rules: Json
           is_active?: boolean
           applies_to: string[]
           created_at?: string
           updated_at?: string
           created_by?: string | null
           updated_by?: string | null
         }
         Update: {
           id?: string
           name?: string
           description?: string | null
           policy_type?: 'password' | 'session' | 'access' | 'data'
           rules?: Json
           is_active?: boolean
           applies_to?: string[]
           created_at?: string
           updated_at?: string
           created_by?: string | null
           updated_by?: string | null
         }
       }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      task_status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      user_role: 'admin' | 'technician' | 'supervisor' | 'viewer'
      customer_type: 'individual' | 'business'
      photo_type: 'before' | 'during' | 'after'
      photo_category: 'vehicle_condition' | 'workspace' | 'step_progress' | 'qc_check' | 'final_result'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}