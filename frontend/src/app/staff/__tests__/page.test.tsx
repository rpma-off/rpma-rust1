import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StaffPage from '../page';

vi.mock('@/domains/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/domains/users', () => ({
  useUsersPage: vi.fn(() => ({
    users: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    showForm: false,
    editingUser: null,
    handleCreateUser: vi.fn(),
    handleEditUser: vi.fn(),
    handleFormClose: vi.fn(),
    handleFormSuccess: vi.fn(),
  })),
  UserList: vi.fn(() => <div data-testid="user-list">User List</div>),
}));

vi.mock('@/domains/admin', () => ({
  useAdminPage: vi.fn(() => ({
    t: (key: string) => key,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
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
      setSearchQuery: vi.fn(),
      setRoleFilter: vi.fn(),
      setShowAddModal: vi.fn(),
      addUser: vi.fn(),
      updateUserStatus: vi.fn(),
    },
    handleDeleteUser: vi.fn(),
  })),
  AdminOverviewTab: vi.fn(() => <div>Overview Tab</div>),
  AdminUsersTab: vi.fn(() => <div>Users Tab</div>),
  AdminSystemTab: vi.fn(() => <div>System Tab</div>),
}));

describe('StaffPage', () => {
  it('renders without crashing', () => {
    render(<StaffPage />);
    expect(screen.getByText('Employés/Ressources')).toBeInTheDocument();
  });
});
