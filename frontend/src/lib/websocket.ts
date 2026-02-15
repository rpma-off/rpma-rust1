//! Frontend WebSocket client for real-time updates
//!
//! This module provides a WebSocket client that connects to the backend
//! WebSocket server and handles real-time updates.

import { logger } from './logging';
import { LogDomain } from './logging/types';
import React from 'react';

export interface WSMessage {
  type: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface WSEventHandlers {
  onTaskCreated?: (task: Record<string, unknown>) => void;
  onTaskUpdated?: (taskId: string, updates: Record<string, unknown>) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskStatusChanged?: (taskId: string, oldStatus: string, newStatus: string) => void;
  onInterventionStarted?: (interventionId: string, taskId: string) => void;
  onInterventionUpdated?: (interventionId: string, updates: Record<string, unknown>) => void;
  onInterventionCompleted?: (interventionId: string) => void;
  onInterventionStepAdvanced?: (interventionId: string, stepNumber: number) => void;
  onClientCreated?: (client: Record<string, unknown>) => void;
  onClientUpdated?: (clientId: string, updates: Record<string, unknown>) => void;
  onClientDeleted?: (clientId: string) => void;
  onNotification?: (title: string, message: string, level: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private handlers: WSEventHandlers = {};
  private clientId: string;
  private isConnecting = false;

  constructor(private url: string, handlers: WSEventHandlers = {}) {
    this.clientId = this.generateClientId();
    this.handlers = handlers;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    logger.info(LogDomain.SYSTEM, 'WebSocketClient: Connecting to', { url: this.url });

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        logger.info(LogDomain.SYSTEM, 'WebSocketClient: Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        this.handlers.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          logger.error(LogDomain.SYSTEM, 'WebSocketClient: Failed to parse message', error);
        }
      };

      this.ws.onclose = () => {
        logger.info(LogDomain.SYSTEM, 'WebSocketClient: Disconnected');
        this.isConnecting = false;
        this.handlers.onDisconnected?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error(LogDomain.SYSTEM, 'WebSocketClient: Error', error);
        this.handlers.onError?.(error);
      };

    } catch (error) {
      logger.error(LogDomain.SYSTEM, 'WebSocketClient: Failed to create WebSocket connection', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn(LogDomain.SYSTEM, 'WebSocketClient: Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    logger.info(LogDomain.SYSTEM, 'WebSocketClient: Attempting reconnection', { attempts: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts, interval: this.reconnectInterval });

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);

    // Exponential backoff
    this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000);
  }

  private handleMessage(message: WSMessage): void {
    logger.debug(LogDomain.SYSTEM, 'WebSocketClient: Received message', { type: message.type, hasData: !!message.data });
    const data = message.data ?? {};

    switch (message.type) {
      case 'TaskCreated':
        this.handlers.onTaskCreated?.((data.task ?? {}) as Record<string, unknown>);
        break;
      case 'TaskUpdated':
        this.handlers.onTaskUpdated?.(data.task_id as string, (data.updates ?? {}) as Record<string, unknown>);
        break;
      case 'TaskDeleted':
        this.handlers.onTaskDeleted?.(data.task_id as string);
        break;
      case 'TaskStatusChanged':
        this.handlers.onTaskStatusChanged?.(data.task_id as string, data.old_status as string, data.new_status as string);
        break;
      case 'InterventionStarted':
        this.handlers.onInterventionStarted?.(data.intervention_id as string, data.task_id as string);
        break;
      case 'InterventionUpdated':
        this.handlers.onInterventionUpdated?.(data.intervention_id as string, (data.updates ?? {}) as Record<string, unknown>);
        break;
      case 'InterventionCompleted':
        this.handlers.onInterventionCompleted?.(data.intervention_id as string);
        break;
      case 'InterventionStepAdvanced':
        this.handlers.onInterventionStepAdvanced?.(data.intervention_id as string, data.step_number as number);
        break;
      case 'ClientCreated':
        this.handlers.onClientCreated?.((data.client ?? {}) as Record<string, unknown>);
        break;
      case 'ClientUpdated':
        this.handlers.onClientUpdated?.(data.client_id as string, (data.updates ?? {}) as Record<string, unknown>);
        break;
      case 'ClientDeleted':
        this.handlers.onClientDeleted?.(data.client_id as string);
        break;
      case 'Notification':
        this.handlers.onNotification?.(data.title as string, data.message as string, data.level as string);
        break;
      default:
        logger.warn(LogDomain.SYSTEM, 'WebSocketClient: Unknown message type', { type: message.type });
    }
  }

  sendMessage(message: Omit<WSMessage, 'timestamp'>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WSMessage = {
        ...message,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(fullMessage));
      return true;
    }
    return false;
  }

  updateHandlers(handlers: Partial<WSEventHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  getClientId(): string {
    return this.clientId;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket client instance
let wsClient: WebSocketClient | null = null;

export function initWebSocketClient(handlers: WSEventHandlers = {}): WebSocketClient {
  if (!wsClient) {
    // Connect to localhost WebSocket server (default port 8080)
    const wsUrl = 'ws://127.0.0.1:8080';
    wsClient = new WebSocketClient(wsUrl, handlers);
  } else {
    wsClient.updateHandlers(handlers);
  }

  wsClient.connect();
  return wsClient;
}

export function getWebSocketClient(): WebSocketClient | null {
  return wsClient;
}

export function disconnectWebSocketClient(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}

// React hook for using WebSocket client
export function useWebSocket(handlers: WSEventHandlers = {}) {
  React.useEffect(() => {
    initWebSocketClient(handlers);

    return () => {
      // Don't disconnect on unmount, let it persist for the app
      // disconnectWebSocketClient();
    };
  }, [handlers]);

  return {
    client: wsClient,
    isConnected: wsClient?.isConnected() ?? false,
  };
}
