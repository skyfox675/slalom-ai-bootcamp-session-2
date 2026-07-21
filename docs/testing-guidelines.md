# Testing Guidelines

These testing principles define how to validate backend and frontend behavior for the TODO app.

## Unit Tests

- Use Jest to test individual functions and React components in isolation.
- Use the file naming convention `*.test.js` or `*.test.ts`.
- Place backend unit tests in `packages/backend/__tests__/`.
- Place frontend unit tests in `packages/frontend/src/__tests__/`.
- Name test files to match what they test (for example, `app.test.js` for `app.js`).

## Integration Tests

- Use Jest with Supertest to test backend API endpoints using real HTTP requests.
- Place integration tests in `packages/backend/__tests__/integration/`.
- Use the file naming convention `*.test.js` or `*.test.ts`.
- Name integration test files based on the target behavior (for example, `todos-api.test.js`).

## End-to-End (E2E) Tests

- Use Playwright as the required framework to test complete UI workflows through browser automation.
- Place E2E tests in `tests/e2e/`.
- Use the file naming convention `*.spec.js` or `*.spec.ts`.
- Name E2E test files based on the user journey they test (for example, `todo-workflow.spec.js`).
- Use one browser only for Playwright tests.
- Use the Page Object Model (POM) pattern for maintainability.
- Limit E2E coverage to 5-8 critical user journeys focused on happy paths and key edge cases.

## Port Configuration

- Always use environment variables with sensible defaults for port configuration.
- Backend convention:

  ```js
  const PORT = process.env.PORT || 3030;
  ```

- Frontend convention:
  React defaults to port 3000, but it can be overridden with the `PORT` environment variable.
- This approach supports CI/CD workflows that dynamically detect ports.

## Reliability and Maintainability

- All tests must be isolated and independent.
- Each test must set up its own data and avoid dependency on other tests.
- Setup and teardown hooks are required so tests pass reliably across repeated runs.
- All new features must include appropriate tests.
- Tests should remain maintainable and follow testing best practices.
