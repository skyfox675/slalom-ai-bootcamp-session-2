class TodoPage {
  constructor(page) {
    this.page = page;
    this.header = page.getByRole('heading', { name: 'Momentum Tasks' });
    this.titleInput = page.getByRole('textbox', { name: 'Task title' });
    this.dueDateInput = page.getByLabel('Due date', { exact: true });
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.emptyState = page.getByText('No tasks yet. Add one to get started.');
    this.loadingIndicator = page.getByText('Loading tasks...');
    this.errorAlert = page.getByRole('alert');
    this.editDialog = page.getByRole('dialog');
    this.editTitleInput = page.getByRole('textbox', { name: 'Edit task title' });
    this.editDueDateInput = page.getByLabel('Edit due date', { exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelEditButton = page.getByRole('button', { name: 'Cancel' });
  }

  async goto() {
    await this.page.goto('/');
    await this.header.waitFor();
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    await this.loadingIndicator.waitFor({ state: 'hidden' });
  }

  taskRow(title) {
    return this.page.locator('.task-row').filter({ hasText: title }).first();
  }

  taskDueText(title) {
    return this.taskRow(title).locator('.MuiListItemText-secondary');
  }

  async createTask(title, dueDate) {
    await this.titleInput.fill(title);
    if (dueDate) {
      await this.dueDateInput.fill(dueDate);
    }
    await this.addTaskButton.click();
    await this.waitForLoad();
  }

  async openEditTask(title) {
    await this.page.getByRole('button', { name: `Edit ${title}` }).click();
    await this.editDialog.waitFor();
  }

  async saveTaskEdit(nextTitle, nextDueDate) {
    await this.editTitleInput.fill(nextTitle);
    await this.editDueDateInput.fill(nextDueDate || '');
    await this.saveChangesButton.click();
    await this.editDialog.waitFor({ state: 'hidden' });
    await this.waitForLoad();
  }

  async getEditDueDateValue(title) {
    await this.openEditTask(title);
    const value = await this.editDueDateInput.inputValue();
    await this.cancelEditButton.click();
    await this.editDialog.waitFor({ state: 'hidden' });
    return value;
  }

  async deleteTask(title) {
    await this.page.getByRole('button', { name: `Delete ${title}` }).click();
    await this.waitForLoad();
  }

  async clearNonSeedTasks() {
    while (true) {
      const labels = await this.page
        .locator('button[aria-label^="Delete E2E "]')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')).filter(Boolean));

      if (labels.length === 0) {
        break;
      }

      for (const label of labels) {
        const button = this.page.getByRole('button', { name: label });
        if ((await button.count()) === 0) {
          continue;
        }

        await button.first().click();
        await this.waitForLoad();
      }
    }
  }

  async taskTitlesInOrder() {
    const rows = this.page.locator('.task-row .MuiListItemText-primary');
    return rows.allTextContents();
  }
}

module.exports = { TodoPage };
