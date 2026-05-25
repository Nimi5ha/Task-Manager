const STORAGE_KEY = 'tm_tasks';

let tasks = loadTasks();
let currentFilter = 'all';
let editingId = null;

// DOM refs
const form       = document.getElementById('task-form');
const titleInput = document.getElementById('task-input');
const descInput  = document.getElementById('task-desc');
const priSelect  = document.getElementById('task-priority');
const dueInput   = document.getElementById('task-due');
const list       = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const statsEl    = document.getElementById('stats');
const overlay    = document.getElementById('modal-overlay');

// --- CRUD ---

function createTask(title, desc, priority, due) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    title,
    desc,
    priority,
    due,
    completed: false,
    createdAt: Date.now(),
  };
}

function addTask(e) {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;

  tasks.unshift(createTask(title, descInput.value.trim(), priSelect.value, dueInput.value));
  saveTasks();
  render();

  titleInput.value = '';
  descInput.value = '';
  dueInput.value = '';
  priSelect.value = 'medium';
  titleInput.focus();
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.completed = !t.completed; saveTasks(); render(); }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('edit-title').value    = t.title;
  document.getElementById('edit-desc').value     = t.desc;
  document.getElementById('edit-priority').value = t.priority;
  document.getElementById('edit-due').value      = t.due;
  overlay.classList.add('show');
  document.getElementById('edit-title').focus();
}

function saveEdit() {
  const t = tasks.find(t => t.id === editingId);
  if (!t) return closeModal();
  const newTitle = document.getElementById('edit-title').value.trim();
  if (!newTitle) return;
  t.title    = newTitle;
  t.desc     = document.getElementById('edit-desc').value.trim();
  t.priority = document.getElementById('edit-priority').value;
  t.due      = document.getElementById('edit-due').value;
  saveTasks();
  render();
  closeModal();
}

function closeModal() {
  overlay.classList.remove('show');
  editingId = null;
}

// --- Render ---

function filteredTasks() {
  if (currentFilter === 'active')    return tasks.filter(t => !t.completed);
  if (currentFilter === 'completed') return tasks.filter(t => t.completed);
  return tasks;
}

function formatDue(due) {
  if (!due) return '';
  const [y, m, d] = due.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = !tasks.find(t => t.completed) ? false : date < today;
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label, overdue: date < today };
}

function buildTaskEl(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.dataset.priority = task.priority;
  li.dataset.id = task.id;

  const due = task.due ? formatDue(task.due) : null;

  li.innerHTML = `
    <input type="checkbox" class="task-check" ${task.completed ? 'checked' : ''} aria-label="Toggle complete" />
    <div class="task-body">
      <div class="task-title">${escHtml(task.title)}</div>
      ${task.desc ? `<div class="task-desc">${escHtml(task.desc)}</div>` : ''}
      <div class="task-meta">
        <span class="badge badge-${task.priority}">${task.priority}</span>
        ${due ? `<span class="due-date${due.overdue && !task.completed ? ' overdue' : ''}">
          ${due.overdue && !task.completed ? '&#9888; ' : ''}${due.label}
        </span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="icon-btn edit" title="Edit task">${iconEdit()}</button>
      <button class="icon-btn delete" title="Delete task">${iconDelete()}</button>
    </div>
  `;

  li.querySelector('.task-check').addEventListener('change', () => toggleTask(task.id));
  li.querySelector('.icon-btn.edit').addEventListener('click', () => openEdit(task.id));
  li.querySelector('.icon-btn.delete').addEventListener('click', () => deleteTask(task.id));

  return li;
}

function render() {
  list.innerHTML = '';
  const visible = filteredTasks();

  if (visible.length === 0) {
    emptyState.classList.add('show');
  } else {
    emptyState.classList.remove('show');
    visible.forEach(t => list.appendChild(buildTaskEl(t)));
  }

  const active = tasks.filter(t => !t.completed).length;
  statsEl.textContent = `${active} task${active !== 1 ? 's' : ''} remaining`;
}

// --- Filters ---

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

document.getElementById('clear-completed').addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  render();
});

// --- Modal events ---

document.getElementById('modal-save').addEventListener('click', saveEdit);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && overlay.classList.contains('show')) saveEdit();
});

// --- Persistence ---

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

// --- Helpers ---

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function iconEdit() {
  return `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14.7 3.3a1.5 1.5 0 0 1 2.1 2.1L6.5 15.7l-3 .9.9-3z"/>
  </svg>`;
}

function iconDelete() {
  return `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="5 7 5 17 15 17 15 7"/>
    <path d="M3 7h14M8 7V5h4v2"/>
  </svg>`;
}

// --- Init ---

form.addEventListener('submit', addTask);
render();
