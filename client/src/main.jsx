import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react';
import './styles.css';

const API = '/api';
const emptyTask = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'Medium',
  assignedTo: ''
};

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [memberForm, setMemberForm] = useState({ email: '', role: 'Member' });
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedProject = projects.find((project) => project._id === selectedProjectId);
  const currentRole = selectedProject?.members.find((member) => member.user._id === user?.id)?.role;
  const isAdmin = currentRole === 'Admin';

  const stats = useMemo(() => {
    const source = dashboard || { totalTasks: 0, byStatus: {}, perUser: {}, overdueTasks: 0 };
    return [
      { label: 'Total tasks', value: source.totalTasks, icon: ClipboardList },
      { label: 'To Do', value: source.byStatus?.['To Do'] || 0, icon: CalendarClock },
      { label: 'In Progress', value: source.byStatus?.['In Progress'] || 0, icon: RefreshCw },
      { label: 'Done', value: source.byStatus?.Done || 0, icon: CheckCircle2 },
      { label: 'Overdue', value: source.overdueTasks, icon: BarChart3 }
    ];
  }, [dashboard]);

  useEffect(() => {
    if (token) loadProjects();
  }, [token]);

  useEffect(() => {
    if (selectedProjectId) {
      loadWorkspace(selectedProjectId);
    }
  }, [selectedProjectId]);

  async function run(action) {
    try {
      setLoading(true);
      setMessage('');
      await action();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    await run(async () => {
      const path = authMode === 'signup' ? '/auth/signup' : '/auth/login';
      const body = authMode === 'signup' ? authForm : { email: authForm.email, password: authForm.password };
      const data = await request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    });
  }

  async function loadProjects() {
    await run(async () => {
      const data = await request('/projects', { headers: authHeaders(token) });
      setProjects(data.projects);
      if (!selectedProjectId && data.projects.length) setSelectedProjectId(data.projects[0]._id);
    });
  }

  async function loadWorkspace(projectId) {
    await run(async () => {
      const [taskData, dashData] = await Promise.all([
        request(`/tasks?projectId=${projectId}`, { headers: authHeaders(token) }),
        request(`/dashboard/${projectId}`, { headers: authHeaders(token) })
      ]);
      setTasks(taskData.tasks);
      setDashboard(dashData);
    });
  }

  async function createProject(event) {
    event.preventDefault();
    await run(async () => {
      const data = await request('/projects', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(projectForm)
      });
      setProjectForm({ name: '', description: '' });
      setProjects([data.project, ...projects]);
      setSelectedProjectId(data.project._id);
    });
  }

  async function addMember(event) {
    event.preventDefault();
    await run(async () => {
      const data = await request(`/projects/${selectedProjectId}/members`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(memberForm)
      });
      setMemberForm({ email: '', role: 'Member' });
      setProjects(projects.map((project) => (project._id === data.project._id ? data.project : project)));
    });
  }

  async function removeMember(userId) {
    await run(async () => {
      const data = await request(`/projects/${selectedProjectId}/members/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(token)
      });
      setProjects(projects.map((project) => (project._id === data.project._id ? data.project : project)));
      await loadWorkspace(selectedProjectId);
    });
  }

  async function createTask(event) {
    event.preventDefault();
    await run(async () => {
      await request('/tasks', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ ...taskForm, projectId: selectedProjectId })
      });
      setTaskForm(emptyTask);
      await loadWorkspace(selectedProjectId);
    });
  }

  async function updateTask(taskId, patch) {
    await run(async () => {
      await request(`/tasks/${taskId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
        body: JSON.stringify(patch)
      });
      await loadWorkspace(selectedProjectId);
    });
  }

  async function deleteTask(taskId) {
    await run(async () => {
      await request(`/tasks/${taskId}`, { method: 'DELETE', headers: authHeaders(token) });
      await loadWorkspace(selectedProjectId);
    });
  }

  function logout() {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setProjects([]);
    setTasks([]);
    setDashboard(null);
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <div>
            <p className="eyebrow">Team Task Manager</p>
            <h1>Plan projects, assign work, and track progress.</h1>
          </div>
          <form onSubmit={handleAuth} className="form">
            <div className="segmented" role="tablist">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
                Signup
              </button>
            </div>
            {authMode === 'signup' && (
              <label>
                Name
                <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} required />
              </label>
            )}
            <label>
              Email
              <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} required />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength="6"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </label>
            <button className="primary" disabled={loading}>{authMode === 'signup' ? 'Create account' : 'Login'}</button>
            {message && <p className="message">{message}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ClipboardList size={24} />
          <div>
            <strong>Task Manager</strong>
            <span>{user?.name}</span>
          </div>
        </div>
        <form onSubmit={createProject} className="compact-form">
          <input placeholder="Project name" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
          <textarea placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
          <button className="icon-text"><Plus size={16} /> Project</button>
        </form>
        <nav className="project-list">
          {projects.map((project) => (
            <button key={project._id} className={project._id === selectedProjectId ? 'selected' : ''} onClick={() => setSelectedProjectId(project._id)}>
              <span>{project.name}</span>
              <small>{project.members.length} members</small>
            </button>
          ))}
        </nav>
        <button className="ghost icon-text" onClick={logout}><LogOut size={16} /> Logout</button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentRole || 'Member'}</p>
            <h1>{selectedProject?.name || 'Create your first project'}</h1>
          </div>
          <button className="ghost icon-text" onClick={() => selectedProjectId && loadWorkspace(selectedProjectId)} disabled={!selectedProjectId || loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {message && <p className="message">{message}</p>}

        {selectedProject ? (
          <>
            <section className="stats-grid">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <article className="stat" key={item.label}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                );
              })}
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <h2><Users size={18} /> Members</h2>
                </div>
                {isAdmin && (
                  <form onSubmit={addMember} className="member-form">
                    <input placeholder="Email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} required />
                    <select value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
                      <option>Member</option>
                      <option>Admin</option>
                    </select>
                    <button title="Add member"><UserPlus size={17} /></button>
                  </form>
                )}
                <div className="member-list">
                  {selectedProject.members.map((member) => (
                    <div className="member" key={member.user._id}>
                      <div>
                        <strong>{member.user.name}</strong>
                        <span>{member.user.email}</span>
                      </div>
                      <em>{member.role}</em>
                      {isAdmin && member.user._id !== user.id && (
                        <button className="icon danger" title="Remove member" onClick={() => removeMember(member.user._id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h2><BarChart3 size={18} /> Tasks per user</h2>
                </div>
                <div className="bar-list">
                  {Object.entries(dashboard?.perUser || {}).map(([name, count]) => (
                    <div className="bar-row" key={name}>
                      <span>{name}</span>
                      <div><i style={{ width: `${Math.max(8, count * 18)}%` }} /></div>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {isAdmin && (
              <section className="panel">
                <div className="panel-heading">
                  <h2><Plus size={18} /> New task</h2>
                </div>
                <form onSubmit={createTask} className="task-form">
                  <input placeholder="Title" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
                  <input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required />
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })} required>
                    <option value="">Assignee</option>
                    {selectedProject.members.map((member) => (
                      <option value={member.user._id} key={member.user._id}>{member.user.name}</option>
                    ))}
                  </select>
                  <textarea placeholder="Description" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                  <button className="primary">Create task</button>
                </form>
              </section>
            )}

            <section className="task-board">
              {['To Do', 'In Progress', 'Done'].map((status) => (
                <div className="column" key={status}>
                  <h2>{status}</h2>
                  {tasks.filter((task) => task.status === status).map((task) => (
                    <article className={`task priority-${task.priority.toLowerCase()}`} key={task._id}>
                      <div className="task-title">
                        <h3>{task.title}</h3>
                        {isAdmin && (
                          <button className="icon danger" title="Delete task" onClick={() => deleteTask(task._id)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <p>{task.description || 'No description'}</p>
                      <div className="task-meta">
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                        <strong>{task.priority}</strong>
                      </div>
                      <div className="assignee">{task.assignedTo?.name}</div>
                      <select value={task.status} onChange={(e) => updateTask(task._id, { status: e.target.value })}>
                        <option>To Do</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    </article>
                  ))}
                </div>
              ))}
            </section>
          </>
        ) : (
          <section className="empty-state">
            <ClipboardList size={48} />
            <h2>No projects yet</h2>
          </section>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
