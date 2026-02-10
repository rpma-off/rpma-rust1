import { installMockControls } from './mock-controls';

const useMock = process.env.NEXT_PUBLIC_IPC_MOCK === 'true' || process.env.NEXT_PUBLIC_IPC_MOCK === '1';

if (useMock && typeof window !== 'undefined') {
  installMockControls();
}
