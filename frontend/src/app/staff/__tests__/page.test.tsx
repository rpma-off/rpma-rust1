import React from 'react';
import { render, screen } from '@testing-library/react';
import StaffPage from '../page';

jest.mock('@/domains/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/domains/users', () => ({
  useUsersPage: jest.fn(() => ({
    users: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    showForm: false,
    editingUser: null,
    handleCreateUser: jest.fn(),
    handleEditUser: jest.fn(),
    handleFormClose: jest.fn(),
    handleFormSuccess: jest.fn(),
  })),
  UserList: jest.fn(() => <div data-testid="user-list">User List</div>),
}));

jest.mock('@/domains/admin', () => ({
  useAdminPage: jest.fn(() => ({
    t: (key: string) => key,
    activeTab: 'overview',
    setActiveTab: jest.fn(),
    isAuthorized: true,
    adminDashboard: {
      stats: {
        totalUsers: 10,
        activeUsers: 8,
        totalTasks: 25,
        systemHealth: 'healthy',
      },
      recentActivities: [],
      dashboardStats: {},
    },
    adminUserManagement: {
      filteredUsers: [],
      isLoading: false,
      searchQuery: '',
      roleFilter: 'all',
      showAddModal: false,
      setSearchQuery: jest.fn(),
      setRoleFilter: jest.fn(),
      setShowAddModal: jest.fn(),
      addUser: jest.fn(),
      updateUserStatus: jest.fn(),
    },
    handleDeleteUser: jest.fn(),
  })),
  AdminOverviewTab: jest.fn(() => <div>Overview Tab</div>),
  AdminUsersTab: jest.fn(() => <div>Users Tab</div>),
  AdminSystemTab: jest.fn(() => <div>System Tab</div>),
}));

describe('StaffPage', () => {
  it('renders without crashing', () => {
    // @ts-expect-error - Mocking useAuth for simple render test
    require('@/domains/auth').useAuth.mockReturnValue({ user: { role: 'admin' } });
    
    render(<StaffPage />);
    expect(screen.getByText('nav.employeesResources')).toBeInTheDocument();
  });
});
