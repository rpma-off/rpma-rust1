const MOCK_UUID = '00000000-0000-4000-8000-000000000000';

export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
export const v4 = () => MOCK_UUID;
export const v1 = () => MOCK_UUID;
export const v3 = () => MOCK_UUID;
export const v5 = () => MOCK_UUID;
export const v6 = () => MOCK_UUID;
export const v7 = () => MOCK_UUID;
export const validate = () => true;
export const version = () => 4;
export const parse = () => new Uint8Array(16);
export const stringify = () => MOCK_UUID;
