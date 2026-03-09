﻿# PATCH MODE — Fix Jest tests failing with AuthProvider error

You are a senior TypeScript + Next.js test engineer.

The project has failing tests with the error:

Error: useAuth must be used within an AuthProvider

This happens because components use the `useAuth()` hook without being wrapped by `AuthProvider` in tests.

Your mission is to fix the test environment globally.

CONTEXT

Stack:
- Next.js
- TypeScript
- Jest
- React Testing Library
- Domain architecture
- Auth context using `useAuth()`

There are many failing tests because the Auth context is missing.

GOALS

1. Create a global Jest setup file.
2. Mock the `useAuth` hook globally.
3. Ensure Jest loads the setup automatically.
4. Do NOT change application logic.
5. Apply minimal patches.

TASKS

1. Create the file:

tests/jest.setup.ts

with the following behavior:

- import "@testing-library/jest-dom"
- mock the auth hook
- provide a default authenticated user
- mock login/logout functions

Example implementation:

jest.mock("@/domains/auth", () => ({
  useAuth: () => ({
    user: { id: "test-user", name: "Test User" },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

2. Ensure the project has Jest configured to load this file.

Update or create `jest.config.ts` and ensure it includes:

setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"]

3. Ensure alias support exists:

moduleNameMapper: {
  "^@/(.*)$": "<rootDir>/src/$1"
}

4. Do not modify existing tests unless absolutely required.

5. Output patches in this format:

PATCH
<file path>

CHANGE
<diff>

REASON
Explain why this fix resolves multiple failing tests.

EXPECTED RESULT

Tests using `useAuth()` should no longer crash with:

useAuth must be used within an AuthProvider

Many failing tests should now pass automatically.