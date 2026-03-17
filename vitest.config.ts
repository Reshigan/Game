// Test Suite: Vitest Configuration
// Requirement Coverage: REQ-001, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009
// Author: Pablo AI Pipeline — QA Automation Architect
// Date: 2026-03-17
// Sprint: 1

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/node_modules/**'],
    },
  },
});