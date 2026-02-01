import { z } from 'zod';

// Base validation schemas
const emailSchema = z.string().email('Invalid email address').max(254, 'Email too long');

const phoneSchema = z.string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .max(20, 'Phone number too long')
  .optional();

const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  'Invalid timezone'
);

const languageSchema = z.string().length(2, 'Language code must be 2 characters');

const dateFormatSchema = z.enum(['MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd']);

const timeFormatSchema = z.enum(['12h', '24h']);

// User Profile Validation
export const userProfileSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: emailSchema.optional(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200, 'Full name too long').optional(),
  phone: phoneSchema,
  profile_picture: z.string().url('Invalid profile picture URL').optional(),
  role: z.enum(['admin', 'technician', 'supervisor']).optional(),
  is_active: z.boolean().optional(),
  created_at: z.string().datetime().optional(),
  last_sign_in_at: z.string().datetime().optional(),
});

// User Preferences Validation
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: languageSchema.optional(),
  timezone: timezoneSchema.optional(),
  dateFormat: dateFormatSchema.optional(),
  timeFormat: timeFormatSchema.optional(),
  dashboard: z.object({
    layout: z.enum(['grid', 'list', 'compact']).optional(),
    autoRefresh: z.boolean().optional(),
    refreshInterval: z.number().min(30, 'Refresh interval must be at least 30 seconds').max(3600, 'Refresh interval cannot exceed 1 hour').optional(),
    chartAnimations: z.boolean().optional(),
  }).optional(),
  defaultValues: z.object({
    taskDuration: z.number().min(15, 'Task duration must be at least 15 minutes').max(480, 'Task duration cannot exceed 8 hours').optional(),
    defaultPPFZone: z.string().min(1, 'PPF zone is required').max(50, 'PPF zone name too long').optional(),
    defaultTechnician: z.string().uuid('Invalid technician ID').optional(),
    defaultQualityScore: z.number().min(0, 'Quality score must be non-negative').max(100, 'Quality score cannot exceed 100').optional(),
  }).optional(),
});

// Notification Settings Validation
export const notificationSettingsSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
  events: z.object({
    taskUpdates: z.boolean().optional(),
    statusChanges: z.boolean().optional(),
    overdueWarnings: z.boolean().optional(),
    systemAlerts: z.boolean().optional(),
    newAssignments: z.boolean().optional(),
    deadlineReminders: z.boolean().optional(),
  }).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    timezone: timezoneSchema.optional(),
    days: z.array(z.number().min(0, 'Day must be 0-6').max(6, 'Day must be 0-6')).max(7, 'Cannot have more than 7 days').optional(),
  }).optional(),
});

// Accessibility Settings Validation
export const accessibilitySettingsSchema = z.object({
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  highContrast: z.boolean().optional(),
  screenReader: z.boolean().optional(),
  largeText: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  keyboardNavigation: z.boolean().optional(),
  colorBlindness: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
  focusIndicators: z.boolean().optional(),
});

// Performance Settings Validation
export const performanceSettingsSchema = z.object({
  animationsEnabled: z.boolean().optional(),
  autoRefresh: z.boolean().optional(),
  refreshInterval: z.number().min(10, 'Refresh interval must be at least 10 seconds').max(300, 'Refresh interval cannot exceed 5 minutes').optional(),
  lazyLoading: z.boolean().optional(),
  virtualScrolling: z.boolean().optional(),
  chartAnimations: z.boolean().optional(),
  realTimeUpdates: z.boolean().optional(),
  dataCaching: z.boolean().optional(),
  lowBandwidthMode: z.boolean().optional(),
});

// Complete User Settings Validation
export const userSettingsSchema = z.object({
  preferences: userPreferencesSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  accessibility: accessibilitySettingsSchema.optional(),
  performance: performanceSettingsSchema.optional(),
  profile: userProfileSchema.optional(),
  updated_at: z.string().datetime().optional(),
});

// Update Request Validation Schemas
export const updateProfileRequestSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200, 'Full name too long').optional(),
  phone: phoneSchema,
  profile_picture: z.string().url('Invalid profile picture URL').optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const updatePreferencesRequestSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: languageSchema.optional(),
  timezone: timezoneSchema.optional(),
  dateFormat: dateFormatSchema.optional(),
  timeFormat: timeFormatSchema.optional(),
  dashboard: z.object({
    layout: z.enum(['grid', 'list', 'compact']).optional(),
    autoRefresh: z.boolean().optional(),
    refreshInterval: z.number().min(30).max(3600).optional(),
    chartAnimations: z.boolean().optional(),
  }).optional(),
  defaultValues: z.object({
    taskDuration: z.number().min(15).max(480).optional(),
    defaultPPFZone: z.string().min(1).max(50).optional(),
    defaultTechnician: z.string().uuid().optional(),
    defaultQualityScore: z.number().min(0).max(100).optional(),
  }).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const updateNotificationsRequestSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  sms: z.boolean().optional(),
  frequency: z.enum(['immediate', 'hourly', 'daily', 'weekly']).optional(),
  events: z.object({
    taskUpdates: z.boolean().optional(),
    statusChanges: z.boolean().optional(),
    overdueWarnings: z.boolean().optional(),
    systemAlerts: z.boolean().optional(),
    newAssignments: z.boolean().optional(),
    deadlineReminders: z.boolean().optional(),
  }).optional(),
  quietHours: z.object({
    enabled: z.boolean().optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    timezone: timezoneSchema.optional(),
    days: z.array(z.number().min(0).max(6)).max(7).optional(),
  }).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const updateAccessibilityRequestSchema = z.object({
  highContrast: z.boolean().optional(),
  largeText: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  screenReader: z.boolean().optional(),
  keyboardNavigation: z.boolean().optional(),
  colorBlindness: z.enum(['none', 'protanopia', 'deuteranopia', 'tritanopia']).optional(),
  focusIndicators: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const updatePerformanceRequestSchema = z.object({
  autoRefresh: z.boolean().optional(),
  refreshInterval: z.number().min(10).max(300).optional(),
  lazyLoading: z.boolean().optional(),
  virtualScrolling: z.boolean().optional(),
  chartAnimations: z.boolean().optional(),
  realTimeUpdates: z.boolean().optional(),
  dataCaching: z.boolean().optional(),
  lowBandwidthMode: z.boolean().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// Type exports for use in components
export type UserProfileValidation = z.infer<typeof userProfileSchema>;
export type UserPreferencesValidation = z.infer<typeof userPreferencesSchema>;
export type NotificationSettingsValidation = z.infer<typeof notificationSettingsSchema>;
export type AccessibilitySettingsValidation = z.infer<typeof accessibilitySettingsSchema>;
export type PerformanceSettingsValidation = z.infer<typeof performanceSettingsSchema>;
export type UserSettingsValidation = z.infer<typeof userSettingsSchema>;

export type UpdateProfileRequestValidation = z.infer<typeof updateProfileRequestSchema>;
export type UpdatePreferencesRequestValidation = z.infer<typeof updatePreferencesRequestSchema>;
export type UpdateNotificationsRequestValidation = z.infer<typeof updateNotificationsRequestSchema>;
export type UpdateAccessibilityRequestValidation = z.infer<typeof updateAccessibilityRequestSchema>;
export type UpdatePerformanceRequestValidation = z.infer<typeof updatePerformanceRequestSchema>;
// export type ChangePasswordRequestValidation = z.infer<typeof changePasswordRequestSchema>;</content>
