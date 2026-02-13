import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { JsonValue } from '@/types/json';

/**
 * Security monitoring and management operations
 */
export const securityOperations = {
  /**
   * Gets security metrics
   * @param sessionToken - User's session token
   * @returns Promise resolving to security metrics
   */
  getMetrics: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_METRICS, {
      session_token: sessionToken
    }),

  /**
   * Gets security events
   * @param limit - Maximum number of events to return
   * @param sessionToken - User's session token
   * @returns Promise resolving to security events
   */
  getEvents: (limit: number, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_EVENTS, {
      limit,
      session_token: sessionToken
    }),

  /**
   * Gets security alerts
   * @param sessionToken - User's session token
   * @returns Promise resolving to security alerts
   */
  getAlerts: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SECURITY_ALERTS, {
      session_token: sessionToken
    }),

  /**
   * Acknowledges a security alert
   * @param alertId - Alert ID to acknowledge
   * @param sessionToken - User's session token
   * @returns Promise resolving when alert is acknowledged
   */
  acknowledgeAlert: (alertId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.ACKNOWLEDGE_SECURITY_ALERT, {
      alert_id: alertId,
      session_token: sessionToken
    }),

  /**
   * Resolves a security alert
   * @param alertId - Alert ID to resolve
   * @param actionsTaken - Actions taken to resolve the alert
   * @param sessionToken - User's session token
   * @returns Promise resolving when alert is resolved
   */
  resolveAlert: (alertId: string, actionsTaken: string[], sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.RESOLVE_SECURITY_ALERT, {
      alert_id: alertId,
      actions_taken: actionsTaken,
      session_token: sessionToken
    }),

  /**
   * Cleans up old security events
   * @param sessionToken - User's session token
   * @returns Promise resolving when cleanup is complete
   */
  cleanupEvents: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.CLEANUP_SECURITY_EVENTS, {
      session_token: sessionToken
    }),

  // Session management operations
  /**
   * Gets active user sessions
   * @param sessionToken - User's session token
   * @returns Promise resolving to active sessions
   */
  getActiveSessions: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {
      sessionToken
    }),

  /**
   * Revokes a specific session
   * @param sessionId - Session ID to revoke
   * @param sessionToken - User's session token
   * @returns Promise resolving when session is revoked
   */
  revokeSession: (sessionId: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REVOKE_SESSION, {
      sessionId,
      sessionToken
    }),

  /**
   * Revokes all sessions except the current one
   * @param sessionToken - Current session token
   * @returns Promise resolving when sessions are revoked
   */
  revokeAllSessionsExceptCurrent: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {
      sessionToken
    }),

  /**
   * Updates session timeout configuration
   * @param timeoutMinutes - New timeout in minutes
   * @param sessionToken - User's session token
   * @returns Promise resolving when timeout is updated
   */
  updateSessionTimeout: (timeoutMinutes: number, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeoutMinutes,
      sessionToken
    }),

  /**
   * Gets session timeout configuration
   * @param sessionToken - User's session token
   * @returns Promise resolving to timeout configuration
   */
  getSessionTimeoutConfig: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {
      sessionToken
    }),

  // IP blocking management operations
  /**
   * Blocks an IP address
   * @param ipAddress - IP address to block
   * @param reason - Reason for blocking
   * @param sessionToken - User's session token
   * @returns Promise resolving when IP is blocked
   */
  blockIpAddress: (ipAddress: string, reason: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.BLOCK_IP_ADDRESS, {
      ip_address: ipAddress,
      reason,
      session_token: sessionToken
    }),

  /**
   * Unblocks an IP address
   * @param ipAddress - IP address to unblock
   * @param sessionToken - User's session token
   * @returns Promise resolving when IP is unblocked
   */
  unblockIpAddress: (ipAddress: string, sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.UNBLOCK_IP_ADDRESS, {
      ip_address: ipAddress,
      session_token: sessionToken
    }),

  /**
   * Gets list of blocked IP addresses
   * @param sessionToken - User's session token
   * @returns Promise resolving to blocked IPs
   */
  getBlockedIps: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_BLOCKED_IPS, {
      session_token: sessionToken
    }),
};
