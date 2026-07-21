# Coding Guidelines

Our coding style emphasizes clarity, consistency, and maintainability so the TODO app stays easy to evolve as features grow. Code should be formatted consistently, with readable spacing and line lengths, and contributors should rely on automated formatting and linting tools instead of subjective manual preferences.

Imports should be organized in a predictable structure that keeps files easy to scan. Group standard library or framework imports first, then third-party packages, then local modules, with a blank line between groups. Within each group, keep ordering stable (for example, alphabetical) to reduce noisy diffs and merge conflicts.

Linting is a required quality gate, not an optional cleanup step. Developers should run the linter locally and resolve warnings or errors before committing changes. Lint rules should reflect team conventions and catch common defects early, such as unused variables, unreachable branches, and inconsistent patterns.

Code quality should prioritize simple, focused units of behavior. Keep functions and components small, use meaningful names, and avoid deeply nested logic when guard clauses or helper functions improve readability. Prefer explicit behavior over clever shortcuts that are harder to maintain.

Follow DRY (Don’t Repeat Yourself) principles by extracting duplicated logic into reusable functions, utilities, or shared components when duplication becomes meaningful. At the same time, avoid over-abstraction too early; small, intentional duplication can be acceptable until stable patterns emerge.

Write code with testing in mind. Design modules so they are easy to test in isolation, avoid hidden side effects, and keep dependencies injectable where practical. Every new feature or behavior change should include appropriate tests aligned with the project testing guidelines.

When reviewing changes, prioritize correctness, readability, and long-term maintainability over short-term speed. The standard is production-quality code that future contributors can understand quickly and modify safely.
