import { render, screen } from '@testing-library/react';
import type { UserSession } from '@/lib/backend';
import { PreferencesTab } from '../PreferencesTab';

describe('PreferencesTab payload shape', () => {
  const user = {
    user_id: 'u1',
    token: 'token-1',
  } as UserSession;

  it('renders the preferences placeholder', () => {
    render(<PreferencesTab user={user} />);
    expect(screen.getByText(/Préférences générales/i)).toBeInTheDocument();
  });
});
