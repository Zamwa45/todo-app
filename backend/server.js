const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'tasks.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
    dueDate TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

app.use(cors());
app.use(express.json());
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

const normalizeTask = (task) => ({
  ...task,
  completed: Boolean(task.completed),
});

const validateTaskInput = (input, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || Object.hasOwn(input, 'title')) {
    if (typeof input.title !== 'string' || !input.title.trim()) {
      errors.push('title is required');
    }
  }

  if (Object.hasOwn(input, 'description') && typeof input.description !== 'string') {
    errors.push('description must be a string');
  }

  if (!isUpdate || Object.hasOwn(input, 'priority')) {
    if (!['low', 'medium', 'high'].includes(input.priority)) {
      errors.push('priority must be one of: low, medium, high');
    }
  }

  if (Object.hasOwn(input, 'dueDate') && input.dueDate !== null && input.dueDate !== '') {
    if (typeof input.dueDate !== 'string' || Number.isNaN(Date.parse(input.dueDate))) {
      errors.push('dueDate must be a valid date');
    }
  }

  if (Object.hasOwn(input, 'completed') && typeof input.completed !== 'boolean') {
    errors.push('completed must be a boolean');
  }

  return errors;
};

app.get('/api/tasks', (req, res) => {
  const { status = 'all', search = '', priority } = req.query;
  const where = [];
  const params = {};

  if (status === 'active') {
    where.push('completed = 0');
  } else if (status === 'completed') {
    where.push('completed = 1');
  }

  if (typeof search === 'string' && search.trim()) {
    where.push('(title LIKE @search OR description LIKE @search)');
    params.search = `%${search.trim()}%`;
  }

  if (['low', 'medium', 'high'].includes(priority)) {
    where.push('priority = @priority');
    params.priority = priority;
  }

  const query = `
    SELECT id, title, description, priority, dueDate, completed, createdAt, updatedAt
    FROM tasks
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY completed ASC, dueDate IS NULL ASC, dueDate ASC, updatedAt DESC
  `;

  const tasks = db.prepare(query).all(params).map(normalizeTask);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const errors = validateTaskInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO tasks (title, description, priority, dueDate, completed, createdAt, updatedAt)
    VALUES (@title, @description, @priority, @dueDate, @completed, @createdAt, @updatedAt)
  `);

  const result = insert.run({
    title: req.body.title.trim(),
    description: req.body.description?.trim() || '',
    priority: req.body.priority,
    dueDate: req.body.dueDate || null,
    completed: req.body.completed ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(normalizeTask(task));
});

app.put('/api/tasks/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid task id' });
  }

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'task not found' });
  }

  const errors = validateTaskInput(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const updated = {
    title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
    description: typeof req.body.description === 'string' ? req.body.description.trim() : existing.description,
    priority: req.body.priority || existing.priority,
    dueDate: Object.hasOwn(req.body, 'dueDate') ? (req.body.dueDate || null) : existing.dueDate,
    completed: typeof req.body.completed === 'boolean' ? (req.body.completed ? 1 : 0) : existing.completed,
    updatedAt: new Date().toISOString(),
    id,
  };

  db.prepare(`
    UPDATE tasks
    SET title = @title,
        description = @description,
        priority = @priority,
        dueDate = @dueDate,
        completed = @completed,
        updatedAt = @updatedAt
    WHERE id = @id
  `).run(updated);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  return res.json(normalizeTask(task));
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid task id' });
  }

  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'task not found' });
  }

  return res.status(204).send();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const startServer = (port = PORT) =>
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
  });

if (require.main === module) {
  startServer();
}

module.exports = { app, db, startServer };
