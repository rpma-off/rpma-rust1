// Task number generator utilities

export const generateTaskNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TASK-${timestamp}-${random}`;
};

export const validateTaskNumber = (taskNumber: string): boolean => {
  const pattern = /^TASK-\d+-\d{3}$/;
  return pattern.test(taskNumber);
};

export const generateUniqueTaskNumber = (_options: { maxRetries: number }, _supabase: unknown): { success: boolean; taskNumber?: string; attemptsUsed?: number; error?: string } => {
  // Mock implementation - in real app would check database for uniqueness
  const taskNumber = generateTaskNumber();
  return { success: true, taskNumber, attemptsUsed: 1 };
};

export const generateFallbackTaskNumber = (): string => {
  return generateTaskNumber();
};

export const isValidTaskNumberFormat = (taskNumber: string): boolean => {
  return validateTaskNumber(taskNumber);
};

export const parseTaskNumber = (taskNumber: string): { timestamp: number; random: number } | null => {
  const match = taskNumber.match(/^TASK-(\d+)-(\d{3})$/);
  if (!match) return null;

  return {
    timestamp: parseInt(match[1]),
    random: parseInt(match[2]),
  };
};
