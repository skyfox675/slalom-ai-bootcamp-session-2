import React, { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddTaskIcon from '@mui/icons-material/AddTask';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1E3A8A',
      light: '#3B82F6',
      dark: '#0B245A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E76F51',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2A9D8F',
    },
    warning: {
      main: '#F4A261',
    },
    error: {
      main: '#C1121F',
    },
    background: {
      default: '#F4F1EA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: 'Poppins, Montserrat, Segoe UI, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '3px solid #F4A261',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
});

const emptyEditState = {
  id: null,
  title: '',
  dueDate: '',
};

const formatDueDate = (dueDate) => {
  if (!dueDate) {
    return 'No due date';
  }

  const parsed = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dueDate;
  }

  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState(emptyEditState);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const hasCreateInput = useMemo(() => newTitle.trim().length > 0, [newTitle]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const result = await response.json();
      setTodos(result);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch tasks: ${err.message}`);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newTitle.trim() || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      await fetchTodos();
      setNewTitle('');
      setNewDueDate('');
      setSnackbarMessage('Task created');
      setError(null);
    } catch (err) {
      setError(`Error adding task: ${err.message}`);
      console.error('Error adding task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (todo) => {
    setEditValues({
      id: todo.id,
      title: todo.title,
      dueDate: todo.dueDate || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editValues.title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/todos/${editValues.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editValues.title.trim(),
          dueDate: editValues.dueDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      await fetchTodos();
      setEditDialogOpen(false);
      setEditValues(emptyEditState);
      setError(null);
      setSnackbarMessage('Task updated');
    } catch (err) {
      setError(`Error updating task: ${err.message}`);
      console.error('Error updating task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (todoId) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      await fetchTodos();
      setError(null);
      setSnackbarMessage('Task deleted');
    } catch (err) {
      setError(`Error deleting task: ${err.message}`);
      console.error('Error deleting task:', err);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell">
        <AppBar position="static" elevation={0} color="transparent" className="app-topbar">
          <Toolbar className="app-toolbar">
            <Typography variant="h4" component="h1">
              Momentum Tasks
            </Typography>
            <Typography variant="body1" className="subtitle-text">
              Plan clearly, execute daily.
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ pb: 6 }}>
          <Stack spacing={3}>
            <Paper elevation={0} className="surface-card" component="section" aria-labelledby="create-task-title">
              <Typography id="create-task-title" variant="h6" sx={{ mb: 2 }}>
                Add task
              </Typography>
              <Box component="form" onSubmit={handleCreate}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}
                >
                  <TextField
                    fullWidth
                    required
                    label="Task title"
                    value={newTitle}
                    onChange={(event) => setNewTitle(event.target.value)}
                    slotProps={{
                      htmlInput: { 'aria-label': 'Task title' },
                    }}
                  />
                  <TextField
                    label="Due date"
                    type="date"
                    value={newDueDate}
                    onChange={(event) => setNewDueDate(event.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: { 'aria-label': 'Due date' },
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    startIcon={<AddTaskIcon />}
                    disabled={!hasCreateInput || submitting}
                    sx={{ minWidth: 150, height: 56 }}
                  >
                    Add task
                  </Button>
                </Stack>
              </Box>
            </Paper>

            <Paper elevation={0} className="surface-card" component="section" aria-labelledby="task-list-title">
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
              >
                <Typography id="task-list-title" variant="h6">
                  Tasks
                </Typography>
                <Chip label="Sorted by due date" color="secondary" size="small" />
              </Stack>

              {loading && (
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 2 }}>
                  <CircularProgress size={22} />
                  <Typography>Loading tasks...</Typography>
                </Stack>
              )}

              {error && !loading && (
                <Alert severity="error" role="alert" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {!loading && !error && todos.length === 0 && (
                <Alert severity="info">No tasks yet. Add one to get started.</Alert>
              )}

              {!loading && todos.length > 0 && (
                <List aria-label="Task list">
                  {todos.map((todo) => (
                    <ListItem
                      key={todo.id}
                      className="task-row"
                      secondaryAction={(
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit task">
                            <IconButton
                              edge="end"
                              color="primary"
                              aria-label={`Edit ${todo.title}`}
                              onClick={() => openEditDialog(todo)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete task">
                            <IconButton
                              edge="end"
                              color="error"
                              aria-label={`Delete ${todo.title}`}
                              onClick={() => handleDelete(todo.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    >
                      <ListItemText
                        primary={todo.title}
                        secondary={`Due: ${formatDueDate(todo.dueDate)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Stack>
        </Container>

        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Edit task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                required
                label="Task title"
                value={editValues.title}
                onChange={(event) => setEditValues((prev) => ({ ...prev, title: event.target.value }))}
                slotProps={{
                  htmlInput: { 'aria-label': 'Edit task title' },
                }}
              />
              <TextField
                label="Due date"
                type="date"
                value={editValues.dueDate}
                onChange={(event) => setEditValues((prev) => ({ ...prev, dueDate: event.target.value }))}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { 'aria-label': 'Edit due date' },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleEditSave} disabled={submitting || !editValues.title.trim()}>
              Save changes
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={Boolean(snackbarMessage)}
          autoHideDuration={2200}
          onClose={() => setSnackbarMessage('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbarMessage('')} severity="success" sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;