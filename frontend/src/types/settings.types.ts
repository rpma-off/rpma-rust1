export interface UserSettings {
  preferences?: UserPreferences;
  notifications?: NotificationSettings;
  accessibility?: AccessibilitySettings;
  performance?: PerformanceSettings;
  profile?: UserProfile;
  updated_at?: string;
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  profile_picture?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  dashboard?: {
    layout?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
    chartAnimations?: boolean;
  };
  defaultValues?: {
    taskDuration?: number;
    defaultPPFZone?: string;
    defaultTechnician?: string;
    defaultQualityScore?: number;
  };
}

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  frequency?: string;
  events?: {
    taskUpdates?: boolean;
    statusChanges?: boolean;
    overdueWarnings?: boolean;
    systemAlerts?: boolean;
    newAssignments?: boolean;
    deadlineReminders?: boolean;
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    days?: number[];
  };
}

export interface AccessibilitySettings {
  fontSize?: 'small' | 'medium' | 'large';
  highContrast?: boolean;
  screenReader?: boolean;
  largeText?: boolean;
  reducedMotion?: boolean;
  keyboardNavigation?: boolean;
  colorBlindness?: string;
  focusIndicators?: boolean;
}

export interface PerformanceSettings {
  animationsEnabled?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  lazyLoading?: boolean;
  virtualScrolling?: boolean;
  chartAnimations?: boolean;
  realTimeUpdates?: boolean;
  dataCaching?: boolean;
  lowBandwidthMode?: boolean;
}

export interface UpdateAccessibilityRequest {
  highContrast?: boolean;
  largeText?: boolean;
  reducedMotion?: boolean;
  screenReader?: boolean;
  keyboardNavigation?: boolean;
  colorBlindness?: string;
  focusIndicators?: boolean;
}

export interface UpdateNotificationsRequest {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  frequency?: string;
  events?: {
    taskUpdates?: boolean;
    statusChanges?: boolean;
    overdueWarnings?: boolean;
    systemAlerts?: boolean;
    newAssignments?: boolean;
    deadlineReminders?: boolean;
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    days?: number[];
  };
}

export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  dashboard?: {
    layout?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
    chartAnimations?: boolean;
  };
  defaultValues?: {
    taskDuration?: number;
    defaultPPFZone?: string;
    defaultTechnician?: string;
    defaultQualityScore?: number;
  };
}

export interface UpdatePerformanceRequest {
  autoRefresh?: boolean;
  refreshInterval?: number;
  lazyLoading?: boolean;
  virtualScrolling?: boolean;
  chartAnimations?: boolean;
  realTimeUpdates?: boolean;
  dataCaching?: boolean;
  lowBandwidthMode?: boolean;
}

export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  profile_picture?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}