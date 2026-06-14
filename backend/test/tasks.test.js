const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const testDbDir = path.join('/tmp', 'todo-app-tests');
fs.mkdirSync(testDbDir, { recursive: true });
process.env.DB_PATH = path.join(testDbDir, `tasks-${Date.now()}.db`);

const { startServer, db } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  db.close();
});

test('creates, updates, and deletes a task', async () => {
  const createRes = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Ship release',
      description: 'Finalize release notes',
      priority: 'high',
      dueDate: '2026-06-20',
      completed: false,
    }),
  });

  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.title, 'Ship release');
  assert.equal(created.priority, 'high');

  const updateRes = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed: true }),
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.completed, true);

  const listRes = await fetch(`${baseUrl}/api/tasks?status=completed`);
  assert.equal(listRes.status, 200);
  const completedTasks = await listRes.json();
  assert.equal(completedTasks.length, 1);

  const deleteRes = await fetch(`${baseUrl}/api/tasks/${created.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteRes.status, 204);
});
