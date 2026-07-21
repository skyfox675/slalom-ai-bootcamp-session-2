const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize in-memory SQLite database
const db = new Database(':memory:');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    due_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

const initialItems = ['Item 1', 'Item 2', 'Item 3'];
const insertStmt = db.prepare('INSERT INTO items (name, due_date) VALUES (?, ?)');
const selectByIdStmt = db.prepare('SELECT * FROM items WHERE id = ?');
const deleteByIdStmt = db.prepare('DELETE FROM items WHERE id = ?');
const updateByIdStmt = db.prepare(`
  UPDATE items
  SET name = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);
const sortedItemsStmt = db.prepare(`
  SELECT *
  FROM items
  ORDER BY
    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
    due_date ASC,
    updated_at DESC
`);

const isValidDate = (dateValue) => {
  const parsed = new Date(dateValue);
  return !Number.isNaN(parsed.getTime());
};

const normalizeDueDate = (dueDateValue) => {
  if (dueDateValue === undefined) {
    return { dueDate: undefined };
  }

  if (dueDateValue === null || dueDateValue === '') {
    return { dueDate: null };
  }

  if (typeof dueDateValue !== 'string') {
    return { error: 'Due date must be a valid date string' };
  }

  const trimmedValue = dueDateValue.trim();
  if (trimmedValue === '') {
    return { dueDate: null };
  }

  if (!isValidDate(trimmedValue)) {
    return { error: 'Due date must be a valid date string' };
  }

  // Store as YYYY-MM-DD to keep ordering deterministic and timezone-agnostic.
  const normalized = new Date(trimmedValue).toISOString().slice(0, 10);
  return { dueDate: normalized };
};

const normalizeName = (nameValue, requiredErrorMessage) => {
  if (nameValue === undefined || nameValue === null || typeof nameValue !== 'string') {
    return { error: requiredErrorMessage };
  }

  const trimmed = nameValue.trim();
  if (!trimmed) {
    return { error: requiredErrorMessage };
  }

  return { name: trimmed };
};

const toLegacyItemResponse = (row) => ({
  id: row.id,
  name: row.name,
  due_date: row.due_date,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const toTodoResponse = (row) => ({
  id: row.id,
  title: row.name,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const seedInitialData = () => {
  initialItems.forEach((item) => {
    insertStmt.run(item, null);
  });
};

const resetDataForTests = () => {
  db.exec('DELETE FROM items');
  seedInitialData();
};

seedInitialData();

console.log('In-memory database initialized with sample data');

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend server is running' });
});

// Backward-compatible item routes used by the current frontend.
app.get('/api/items', (req, res) => {
  try {
    const items = sortedItemsStmt.all().map(toLegacyItemResponse);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

app.post('/api/items', (req, res) => {
  try {
    const nameResult = normalizeName(req.body.name, 'Item name is required');
    if (nameResult.error) {
      return res.status(400).json({ error: nameResult.error });
    }

    const dueDateResult = normalizeDueDate(req.body.due_date);
    if (dueDateResult.error) {
      return res.status(400).json({ error: dueDateResult.error });
    }

    const result = insertStmt.run(nameResult.name, dueDateResult.dueDate ?? null);
    const newItem = selectByIdStmt.get(result.lastInsertRowid);
    res.status(201).json(toLegacyItemResponse(newItem));
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number.parseInt(id, 10))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = selectByIdStmt.get(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const hasName = Object.prototype.hasOwnProperty.call(req.body, 'name');
    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body, 'due_date');
    if (!hasName && !hasDueDate) {
      return res.status(400).json({ error: 'At least one editable field is required' });
    }

    let updatedName = existingItem.name;
    if (hasName) {
      const nameResult = normalizeName(req.body.name, 'Item name is required');
      if (nameResult.error) {
        return res.status(400).json({ error: nameResult.error });
      }

      updatedName = nameResult.name;
    }

    let updatedDueDate = existingItem.due_date;
    if (hasDueDate) {
      const dueDateResult = normalizeDueDate(req.body.due_date);
      if (dueDateResult.error) {
        return res.status(400).json({ error: dueDateResult.error });
      }

      updatedDueDate = dueDateResult.dueDate;
    }

    updateByIdStmt.run(updatedName, updatedDueDate, id);
    const updatedItem = selectByIdStmt.get(id);
    res.json(toLegacyItemResponse(updatedItem));
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number.parseInt(id, 10))) {
      return res.status(400).json({ error: 'Valid item ID is required' });
    }

    const existingItem = selectByIdStmt.get(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const result = deleteByIdStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Item deleted successfully', id: Number.parseInt(id, 10) });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Todo routes used for the expanded product requirements.
app.get('/api/todos', (req, res) => {
  try {
    const todos = sortedItemsStmt.all().map(toTodoResponse);
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', (req, res) => {
  try {
    const titleResult = normalizeName(req.body.title, 'Task title is required');
    if (titleResult.error) {
      return res.status(400).json({ error: titleResult.error });
    }

    const dueDateResult = normalizeDueDate(req.body.dueDate);
    if (dueDateResult.error) {
      return res.status(400).json({ error: dueDateResult.error });
    }

    const result = insertStmt.run(titleResult.name, dueDateResult.dueDate ?? null);
    const newTodo = selectByIdStmt.get(result.lastInsertRowid);
    res.status(201).json(toTodoResponse(newTodo));
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.put('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number.parseInt(id, 10))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = selectByIdStmt.get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const hasTitle = Object.prototype.hasOwnProperty.call(req.body, 'title');
    const hasDueDate = Object.prototype.hasOwnProperty.call(req.body, 'dueDate');
    if (!hasTitle && !hasDueDate) {
      return res.status(400).json({ error: 'At least one editable field is required' });
    }

    let updatedTitle = existingTodo.name;
    if (hasTitle) {
      const titleResult = normalizeName(req.body.title, 'Task title is required');
      if (titleResult.error) {
        return res.status(400).json({ error: titleResult.error });
      }

      updatedTitle = titleResult.name;
    }

    let updatedDueDate = existingTodo.due_date;
    if (hasDueDate) {
      const dueDateResult = normalizeDueDate(req.body.dueDate);
      if (dueDateResult.error) {
        return res.status(400).json({ error: dueDateResult.error });
      }

      updatedDueDate = dueDateResult.dueDate;
    }

    updateByIdStmt.run(updatedTitle, updatedDueDate, id);
    const updatedTodo = selectByIdStmt.get(id);
    res.json(toTodoResponse(updatedTodo));
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (!id || Number.isNaN(Number.parseInt(id, 10))) {
      return res.status(400).json({ error: 'Valid todo ID is required' });
    }

    const existingTodo = selectByIdStmt.get(id);
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    const result = deleteByIdStmt.run(id);

    if (result.changes > 0) {
      res.json({ message: 'Todo deleted successfully', id: Number.parseInt(id, 10) });
    } else {
      res.status(404).json({ error: 'Todo not found' });
    }
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

module.exports = { app, db, insertStmt, resetDataForTests };