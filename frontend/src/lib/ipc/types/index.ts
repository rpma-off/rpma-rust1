// Re-export all domain-specific types for convenience
export * from "./auth.types";
export * from "./task.types";
export * from "./client.types";
export * from "./intervention.types";
export * from "./photo.types";
export * from "./notification.types";
export * from "./settings.types";
export * from "./user.types";
export * from "./calendar.types";
export * from "./dashboard.types";

// Additional generated backend types routed through the shared IPC type facade
export type {
  GlobalSearchResult,
  OnboardingStatus,
  Organization,
  OnboardingData,
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
  SessionTimeoutConfig,
  UserAccount,
  UserRole,
} from "@/lib/backend";
