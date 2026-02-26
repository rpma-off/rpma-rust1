import { render, screen, waitFor } from '@testing-library/react';
import { AppShell } from '@/components/layout/AppShell';

jest.mock('@/components/layout/Topbar', () => ({
  Topbar: ({ isSidebarOpen }: { isSidebarOpen: boolean }) => (
    <div data-testid="topbar-state">{isSidebarOpen ? 'open' : 'closed'}</div>
  ),
}));

jest.mock('@/components/layout/DrawerSidebar', () => ({
  DrawerSidebar: () => <div data-testid="drawer-sidebar" />,
  DrawerSidebarMobile: () => <div data-testid="drawer-sidebar-mobile" />,
}));

describe('AppShell', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders with deterministic default then applies stored sidebar preference after mount', async () => {
    window.localStorage.setItem('rpma-sidebar-open', 'false');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <AppShell>
        <div>content</div>
      </AppShell>
    );

    await waitFor(() => {
      expect(screen.getByTestId('topbar-state')).toHaveTextContent('closed');
    });

    expect(setItemSpy).not.toHaveBeenCalledWith('rpma-sidebar-open', 'true');
  });
});
