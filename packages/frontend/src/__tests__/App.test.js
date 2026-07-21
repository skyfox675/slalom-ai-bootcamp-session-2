import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from '../App';

let todos = [];
let nextId = 3;

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(todos));
  }),

  rest.post('/api/todos', async (req, res, ctx) => {
    const { title, dueDate } = await req.json();

    if (!title || title.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    const todo = {
      id: nextId,
      title,
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    nextId += 1;
    todos = [todo, ...todos];
    return res(ctx.status(201), ctx.json(todo));
  }),

  rest.put('/api/todos/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const payload = await req.json();
    const index = todos.findIndex((todo) => todo.id === Number(id));

    if (index === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Todo not found' }));
    }

    if (!payload.title || payload.title.trim() === '') {
      return res(ctx.status(400), ctx.json({ error: 'Task title is required' }));
    }

    if (payload.dueDate && Number.isNaN(new Date(payload.dueDate).getTime())) {
      return res(ctx.status(400), ctx.json({ error: 'Due date must be a valid date string' }));
    }

    const updated = {
      ...todos[index],
      title: payload.title,
      dueDate: payload.dueDate,
      updatedAt: new Date().toISOString(),
    };

    todos[index] = updated;
    return res(ctx.status(200), ctx.json(updated));
  }),

  rest.delete('/api/todos/:id', (req, res, ctx) => {
    const { id } = req.params;
    todos = todos.filter((todo) => todo.id !== Number(id));
    return res(ctx.status(200), ctx.json({ message: 'Todo deleted successfully', id: Number(id) }));
  })
);

beforeAll(() => server.listen());
beforeEach(() => {
  todos = [
    { id: 1, title: 'Alpha task', dueDate: '2026-08-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
    { id: 2, title: 'Bravo task', dueDate: null, createdAt: '2026-07-02T00:00:00.000Z', updatedAt: '2026-07-02T00:00:00.000Z' },
  ];
  nextId = 3;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('App Component', () => {
  test('renders the header', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Momentum Tasks')).toBeInTheDocument();
    expect(screen.getByText('Plan clearly, execute daily.')).toBeInTheDocument();
  });

  test('loads and displays tasks', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alpha task')).toBeInTheDocument();
      expect(screen.getByText('Bravo task')).toBeInTheDocument();
    });
  });

  test('adds a new task with due date', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
    });

    const titleInput = screen.getByRole('textbox', { name: 'Task title' });
    const dueDateInput = screen.getByLabelText('Due date');

    await act(async () => {
      await user.type(titleInput, 'New sprint task');
      await user.type(dueDateInput, '2026-08-05');
    });

    const submitButton = screen.getByRole('button', { name: 'Add task' });
    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('New sprint task')).toBeInTheDocument();
    });
  });

  test('edits an existing task', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha task')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Edit Alpha task'));
    });

    const editTitleInput = screen.getByRole('textbox', { name: 'Edit task title' });
    await act(async () => {
      await user.clear(editTitleInput);
      await user.type(editTitleInput, 'Alpha task updated');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha task updated')).toBeInTheDocument();
    });
  });

  test('disables save when edit title is emptied', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Alpha task')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Edit Alpha task'));
    });

    const editTitleInput = screen.getByRole('textbox', { name: 'Edit task title' });
    const saveButton = screen.getByRole('button', { name: 'Save changes' });

    expect(saveButton).toBeEnabled();

    await act(async () => {
      await user.clear(editTitleInput);
    });

    expect(saveButton).toBeDisabled();
  });

  test('deletes an existing task', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('Bravo task')).toBeInTheDocument();
    });

    await act(async () => {
      await user.click(screen.getByLabelText('Delete Bravo task'));
    });

    await waitFor(() => {
      expect(screen.queryByText('Bravo task')).not.toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch tasks/)).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks', async () => {
    server.use(
      rest.get('/api/todos', (req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText('No tasks yet. Add one to get started.')).toBeInTheDocument();
    });
  });
});