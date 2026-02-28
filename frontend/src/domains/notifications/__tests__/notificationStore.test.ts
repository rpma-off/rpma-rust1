import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { useNotificationStore } from '../stores/notificationStore';
import type { Notification } from '@/lib/backend/notifications';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isConnected: false,
      isPanelOpen: false,
    });
  });

  it('should initialize with empty state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.isConnected).toBe(false);
    expect(state.isPanelOpen).toBe(false);
  });

  it('should set notifications', () => {
    const notifications: Notification[] = [
      {
        id: '1',
        type: 'TaskAssignment',
        title: 'New Task',
        message: 'You have a new task',
        entity_type: 'task',
        entity_id: 'task-1',
        entity_url: '/tasks/task-1',
        read: false,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      },
    ];

    useNotificationStore.getState().setNotifications(notifications, 1);

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual(notifications);
    expect(state.unreadCount).toBe(1);
  });

  it('should add notification', () => {
    const notification: Notification = {
      id: '2',
      type: 'TaskUpdate',
      title: 'Task Updated',
      message: 'Your task has been updated',
      entity_type: 'task',
      entity_id: 'task-2',
      entity_url: '/tasks/task-2',
      read: false,
      user_id: 'user-1',
      created_at: new Date().toISOString(),
    };

    useNotificationStore.getState().addNotification(notification);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('2');
    expect(state.unreadCount).toBe(1);
  });

  it('should mark notification as read', () => {
    const notifications: Notification[] = [
      {
        id: '3',
        type: 'TaskAssignment',
        title: 'New Task',
        message: 'You have a new task',
        entity_type: 'task',
        entity_id: 'task-3',
        entity_url: '/tasks/task-3',
        read: false,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      },
    ];

    useNotificationStore.getState().setNotifications(notifications, 1);

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(1);

    useNotificationStore.getState().markRead('3');

    const updatedState = useNotificationStore.getState();
    expect(updatedState.notifications[0].read).toBe(true);
    expect(updatedState.unreadCount).toBe(0);
  });

  it('should mark all notifications as read', () => {
    const notifications: Notification[] = [
      {
        id: '4',
        type: 'TaskAssignment',
        title: 'New Task 1',
        message: 'Task 1',
        entity_type: 'task',
        entity_id: 'task-4',
        entity_url: '/tasks/task-4',
        read: false,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      },
      {
        id: '5',
        type: 'TaskAssignment',
        title: 'New Task 2',
        message: 'Task 2',
        entity_type: 'task',
        entity_id: 'task-5',
        entity_url: '/tasks/task-5',
        read: false,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      },
    ];

    useNotificationStore.getState().setNotifications(notifications, 2);

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(2);

    useNotificationStore.getState().markAllRead();

    const updatedState = useNotificationStore.getState();
    expect(updatedState.notifications.every((n) => n.read)).toBe(true);
    expect(updatedState.unreadCount).toBe(0);
  });

  it('should remove notification', () => {
    const notifications: Notification[] = [
      {
        id: '6',
        type: 'TaskAssignment',
        title: 'New Task',
        message: 'You have a new task',
        entity_type: 'task',
        entity_id: 'task-6',
        entity_url: '/tasks/task-6',
        read: true,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      },
    ];

    useNotificationStore.getState().setNotifications(notifications, 0);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);

    useNotificationStore.getState().removeNotification('6');

    const updatedState = useNotificationStore.getState();
    expect(updatedState.notifications).toHaveLength(0);
  });

  it('should limit notifications to 50', () => {
    for (let i = 0; i < 60; i++) {
      useNotificationStore.getState().addNotification({
        id: `${i}`,
        type: 'TaskAssignment',
        title: `Task ${i}`,
        message: `Task message ${i}`,
        entity_type: 'task',
        entity_id: `task-${i}`,
        entity_url: `/tasks/task-${i}`,
        read: false,
        user_id: 'user-1',
        created_at: new Date().toISOString(),
      });
    }

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(50);
  });

  it('should set connected state', () => {
    useNotificationStore.getState().setConnected(true);

    const state = useNotificationStore.getState();
    expect(state.isConnected).toBe(true);
  });

  it('should set panel open state', () => {
    useNotificationStore.getState().setPanelOpen(true);

    const state = useNotificationStore.getState();
    expect(state.isPanelOpen).toBe(true);
  });
});
