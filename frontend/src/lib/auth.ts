// Auth utilities

export const getServerSession = async () => {
  // Mock implementation for NextAuth compatibility
  return null;
};

export const signIn = async (_provider: string, _options?: unknown) => {
  // Mock implementation
  return { ok: true };
};

export const signOut = async (_options?: unknown) => {
  // Mock implementation
  return { ok: true };
};

export const authOptions = {
  // Mock NextAuth options
  providers: [],
  callbacks: {},
};