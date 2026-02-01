// Timing-safe authentication utilities

export const addAuthDelay = async (delayMs: number = 1000): Promise<void> => {
  // Add a delay to prevent timing attacks
  await new Promise(resolve => setTimeout(resolve, delayMs));
};

export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};