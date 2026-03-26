import { applyMutationEffects, runWithMutationEffects } from '../mutation-effects';

jest.mock('../../core', () => ({
  invalidatePattern: jest.fn(),
}));

jest.mock('@/lib/data-freshness', () => ({
  signalMutation: jest.fn(),
}));

const { invalidatePattern } = jest.requireMock('../../core') as {
  invalidatePattern: jest.Mock;
};

const { signalMutation } = jest.requireMock('@/lib/data-freshness') as {
  signalMutation: jest.Mock;
};

describe('mutation IPC effects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies cache invalidation and mutation signaling in order', () => {
    applyMutationEffects({
      invalidate: ['quote:', 'task:'],
      signal: ['quotes', 'tasks'],
    });

    expect(invalidatePattern).toHaveBeenNthCalledWith(1, 'quote:');
    expect(invalidatePattern).toHaveBeenNthCalledWith(2, 'task:');
    expect(signalMutation).toHaveBeenNthCalledWith(1, 'quotes');
    expect(signalMutation).toHaveBeenNthCalledWith(2, 'tasks');
  });

  it('runs effects only after the wrapped operation resolves', async () => {
    const calls: string[] = [];

    const result = await runWithMutationEffects(
      async () => {
        calls.push('operation');
        return 'ok';
      },
      {
        invalidate: ['materials:*'],
      },
    );

    calls.push('effects-finished');

    expect(result).toBe('ok');
    expect(calls).toEqual(['operation', 'effects-finished']);
    expect(invalidatePattern).toHaveBeenCalledWith('materials:*');
  });
});
