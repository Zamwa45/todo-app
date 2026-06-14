import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const priorityOrder = { high: 0, medium: 1, low: 2 }

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
}

function App() {
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      const data = await res.json()
      setTasks(data)
    } catch {
      setError('Could not load tasks. Please check if backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const loadTasks = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks`)
        if (!res.ok) throw new Error('Failed to fetch tasks')
        const data = await res.json()
        if (!ignore) {
          setTasks(data)
          setError('')
        }
      } catch {
        if (!ignore) {
          setError('Could not load tasks. Please check if backend is running.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadTasks()

    return () => {
      ignore = true
    }
  }, [])

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === 'active' && task.completed) return false
      if (filter === 'completed' && !task.completed) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (search.trim()) {
        const keyword = search.trim().toLowerCase()
        const haystack = `${task.title} ${task.description ?? ''}`.toLowerCase()
        if (!haystack.includes(keyword)) return false
      }
      return true
    })
  }, [tasks, filter, priorityFilter, search])

  const sortedTasks = useMemo(
    () =>
      [...visibleTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      }),
    [visibleTasks],
  )

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const submitTask = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || null,
    }

    const isEditing = editingId !== null
    const url = isEditing
      ? `${API_BASE_URL}/api/tasks/${editingId}`
      : `${API_BASE_URL}/api/tasks`

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Could not save task')

      await fetchTasks()
      resetForm()
    } catch {
      setError('Unable to save task right now. Please try again.')
    }
  }

  const toggleComplete = async (task) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })

      if (!res.ok) throw new Error('Could not update task')
      await fetchTasks()
    } catch {
      setError('Unable to update task status right now.')
    }
  }

  const editTask = (task) => {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    })
  }

  const deleteTask = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Could not delete task')
      await fetchTasks()
    } catch {
      setError('Unable to delete task right now.')
    }
  }

  const completedCount = tasks.filter((task) => task.completed).length

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>TaskFlow</h1>
        <p>Organize your work with clarity and confidence.</p>
      </header>

      <section className="task-form-card">
        <form onSubmit={submitTask} className="task-form">
          <div className="field-group">
            <label htmlFor="title">Task title</label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="field-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add details (optional)"
              rows="3"
            />
          </div>

          <div className="inline-fields">
            <div className="field-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="field-group">
              <label htmlFor="dueDate">Due date</label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit">{editingId !== null ? 'Update Task' : 'Add Task'}</button>
            {editingId !== null && (
              <button type="button" className="ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="filters-row">
        <div className="chips" role="tablist" aria-label="Task filters">
          {['all', 'active', 'completed'].map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'chip active' : 'chip'}
              onClick={() => setFilter(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-controls">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            aria-label="Search tasks"
          />

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </section>

      <section className="status-row" aria-live="polite">
        <span>{tasks.length} total tasks</span>
        <span>{completedCount} completed</span>
      </section>

      {error && <p className="error-message">{error}</p>}

      <section className="task-list" aria-busy={loading}>
        {loading ? (
          <p className="empty-state">Loading tasks...</p>
        ) : sortedTasks.length === 0 ? (
          <p className="empty-state">No tasks found. Add one to get started.</p>
        ) : (
          sortedTasks.map((task) => (
            <article key={task.id} className={task.completed ? 'task-item done' : 'task-item'}>
              <div className="task-main">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleComplete(task)}
                  />
                  <span>{task.title}</span>
                </label>
                {task.description && <p className="task-description">{task.description}</p>}
                <div className="task-meta">
                  <span className={`priority-tag ${task.priority}`}>{task.priority}</span>
                  <span>{task.dueDate ? `Due ${task.dueDate.slice(0, 10)}` : 'No due date'}</span>
                </div>
              </div>

              <div className="task-actions">
                <button type="button" className="ghost" onClick={() => editTask(task)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => deleteTask(task.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}

export default App
