const { test, expect } = require('@playwright/test');
const { TodoPage } = require('./pages/todo-page');

test.describe('Todo critical workflows', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.clearNonSeedTasks();
  });

  test.afterEach(async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.clearNonSeedTasks();
  });

  test('creates a task with a due date', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const title = `E2E due-date ${Date.now()}`;

    await todoPage.createTask(title, '2026-08-15');

    await expect(todoPage.taskRow(title)).toBeVisible();
    await expect(todoPage.taskDueText(title)).toContainText('Due:');
    await expect(todoPage.taskDueText(title)).toContainText('2026');
  });

  test('edits a task title and due date', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const initialTitle = `E2E editable ${Date.now()}`;
    const updatedTitle = `${initialTitle} updated`;

    await todoPage.createTask(initialTitle, '2026-09-20');
    await todoPage.openEditTask(initialTitle);
    await todoPage.saveTaskEdit(updatedTitle, '2026-09-25');

    await expect(todoPage.taskRow(updatedTitle)).toBeVisible();
    await expect(todoPage.taskDueText(updatedTitle)).toContainText('Due:');
    await expect(todoPage.taskDueText(updatedTitle)).toContainText('2026');
  });

  test('keeps sorted order with dated tasks before undated tasks', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const earlier = `E2E sort early ${Date.now()}`;
    const later = `E2E sort late ${Date.now()}`;
    const undated = `E2E sort none ${Date.now()}`;

    await todoPage.createTask(later, '2026-11-10');
    await todoPage.createTask(undated, '');
    await todoPage.createTask(earlier, '2026-10-05');

    const titles = await todoPage.taskTitlesInOrder();
    const earlierIndex = titles.indexOf(earlier);
    const laterIndex = titles.indexOf(later);
    const undatedIndex = titles.indexOf(undated);

    expect(earlierIndex).toBeGreaterThanOrEqual(0);
    expect(laterIndex).toBeGreaterThanOrEqual(0);
    expect(undatedIndex).toBeGreaterThanOrEqual(0);
    expect(earlierIndex).toBeLessThan(laterIndex);
    expect(laterIndex).toBeLessThan(undatedIndex);
  });

  test('deletes a task from the list', async ({ page }) => {
    const todoPage = new TodoPage(page);
    const title = `E2E delete ${Date.now()}`;

    await todoPage.createTask(title, '2026-10-01');
    await expect(todoPage.taskRow(title)).toBeVisible();

    await todoPage.deleteTask(title);
    await expect(todoPage.taskRow(title)).toHaveCount(0);
  });

  test('prevents creating empty task titles', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await expect(todoPage.addTaskButton).toBeDisabled();
    await todoPage.titleInput.fill('   ');
    await expect(todoPage.addTaskButton).toBeDisabled();
  });
});
