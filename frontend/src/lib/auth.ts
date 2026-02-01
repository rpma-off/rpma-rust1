// Auth utilities

export const getServerSession = async () => {
  // Mock implementation for NextAuth compatibility
  return null;
};

export const signIn = async (provider: string, options?: unknown) => {
  // Mock implementation
  return { ok: true };
};

export const signOut = async (options?: unknown) => {
  // Mock implementation
  return { ok: true };
};

export const authOptions = {
  // Mock NextAuth options
  providers: [],
  callbacks: {},
};