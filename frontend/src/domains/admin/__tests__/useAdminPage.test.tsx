import { act, renderHook, waitFor } from '@testing-library/react';
import { useAdminPage } from '../hooks/useAdminPage';
import type { UseAdminUserManagementReturn } from '../hooks/useAdminUserManagement';

const mockPush = jest.fn();
const mockUseAuth = jest.fn();
const mockUseAdminDashboard = jest.fn();
const mockUseAdminUserManagement = jest.fn();
const mockT = jest.fn((key: string) => `translated:${key}`);
const mockLoadUsers = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../hooks/useAdminDashboard', () => ({
  useAdminDashboard: () => mockUseAdminDashboard(),
}));

jest.mock('../hooks/useAdminUserManagement', () => ({
  useAdminUserManagement: () => mockUseAdminUserManagement(),
}));

jest.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

const createAdminUserManagement = (): UseAdminUserManagementReturn => ({
  users: [],
  filteredUsers: [],
  isLoading: false,
  searchQuery: '',
  roleFilter: 'all',
  showAddModal: false,
  setSearchQuery: jest.fn(),
  setRoleFilter: jest.fn(),
  setShowAddModal: jest.fn(),
  loadUsers: mockLoadUsers,
  addUser: jest.fn(),
  deleteUser: mockDeleteUser,
  updateUserStatus: jest.fn(),
});

describe('useAdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      profile: { role: 'admin' },
    });
    mockUseAdminDashboard.mockReturnValue({
      stats: {},
      recentActivities: [],
      dashboardStats: {},
    });
    mockUseAdminUserManagement.mockReturnValue(createAdminUserManagement());
  });

  it('allows supervisor access and loads users when switching to the users tab', async () => {
    mockUseAuth.mockReturnValue({
      profile: { role: 'supervisor' },
    });

    const { result } = renderHook(() => useAdminPage());

    expect(result.current.isAuthorized).toBe(true);

    act(() => {
      result.current.setActiveTab('users');
    });

    await waitFor(() => {
      expect(mockLoadUsers).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects unauthorized users to the unauthorized route', async () => {
    mockUseAuth.mockReturnValue({
      profile: { role: 'technician' },
    });

    const { result } = renderHook(() => useAdminPage());

    expect(result.current.isAuthorized).toBe(false);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/unauthorized');
    });
  });

  it('delegates deletion to the user management hook with a translated confirmation message', () => {
    const { result } = renderHook(() => useAdminPage());

    act(() => {
      result.current.handleDeleteUser('user-42');
    });

    expect(mockT).toHaveBeenCalledWith('users.confirmDelete');
    expect(mockDeleteUser).toHaveBeenCalledWith('user-42', 'translated:users.confirmDelete');
  });
});
