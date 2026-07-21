const request = require('supertest');
const { app, resetDataForTests } = require('../../src/app');

beforeEach(() => {
  resetDataForTests();
});

describe('Todo API integration tests', () => {
  it('creates a todo with a due date', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Pay rent', dueDate: '2026-08-01' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Pay rent');
    expect(response.body.dueDate).toBe('2026-08-01');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
  });

  it('edits title and due date for an existing todo', async () => {
    const created = await request(app)
      .post('/api/todos')
      .send({ title: 'Old title', dueDate: '2026-08-10' })
      .set('Accept', 'application/json');

    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/todos/${created.body.id}`)
      .send({ title: 'New title', dueDate: '2026-07-29' });

    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('New title');
    expect(updated.body.dueDate).toBe('2026-07-29');
  });

  it('returns todos sorted by due date first and undated todos last', async () => {
    await request(app)
      .post('/api/todos')
      .send({ title: 'No due date task' })
      .set('Accept', 'application/json');

    await request(app)
      .post('/api/todos')
      .send({ title: 'Due later', dueDate: '2026-09-01' })
      .set('Accept', 'application/json');

    await request(app)
      .post('/api/todos')
      .send({ title: 'Due sooner', dueDate: '2026-08-01' })
      .set('Accept', 'application/json');

    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(200);

    const titles = response.body.map((todo) => todo.title);
    const soonerIndex = titles.indexOf('Due sooner');
    const laterIndex = titles.indexOf('Due later');
    const noDueIndex = titles.indexOf('No due date task');

    expect(soonerIndex).toBeLessThan(laterIndex);
    expect(laterIndex).toBeLessThan(noDueIndex);
  });

  it('validates required title', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: '' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Task title is required' });
  });

  it('validates due date format', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Task', dueDate: 'invalid-date' })
      .set('Accept', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Due date must be a valid date string' });
  });

  it('returns 400 for invalid todo id on update', async () => {
    const response = await request(app)
      .put('/api/todos/not-a-number')
      .send({ title: 'x' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Valid todo ID is required' });
  });

  it('returns 404 when updating non-existent todo', async () => {
    const response = await request(app)
      .put('/api/todos/999999')
      .send({ title: 'x' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Todo not found' });
  });

  it('returns 400 when update payload has no editable fields', async () => {
    const created = await request(app)
      .post('/api/todos')
      .send({ title: 'Editable task', dueDate: '2026-08-10' })
      .set('Accept', 'application/json');

    expect(created.status).toBe(201);

    const response = await request(app)
      .put(`/api/todos/${created.body.id}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'At least one editable field is required' });
  });

  it('returns 400 for invalid due date on update', async () => {
    const created = await request(app)
      .post('/api/todos')
      .send({ title: 'Editable task', dueDate: '2026-08-10' })
      .set('Accept', 'application/json');

    expect(created.status).toBe(201);

    const response = await request(app)
      .put(`/api/todos/${created.body.id}`)
      .send({ dueDate: 'not-a-date' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Due date must be a valid date string' });
  });

  it('returns 400 for invalid todo id on delete', async () => {
    const response = await request(app).delete('/api/todos/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Valid todo ID is required' });
  });

  it('returns 404 when deleting non-existent todo', async () => {
    const response = await request(app).delete('/api/todos/999999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Todo not found' });
  });
});
