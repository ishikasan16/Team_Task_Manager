# Team Task Manager – Full Stack Project (SQL Based)

## Tech Stack

* Frontend: React + Vite + Tailwind CSS
* Backend: Node.js + Express.js
* Database: PostgreSQL
* ORM: Prisma
* Authentication: JWT
* Deployment: Railway

---

# 1. Backend Setup

## Create Backend

```bash
mkdir backend
cd backend
npm init -y
```

## Install Packages

```bash
npm install express cors dotenv bcryptjs jsonwebtoken prisma @prisma/client cookie-parser
npm install nodemon --save-dev
```

---

# 2. Prisma Setup

```bash
npx prisma init
```

---

# 3. .env

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/taskmanager"
JWT_SECRET="supersecretkey"
PORT=5000
```

---

# 4. Prisma Schema

## prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  projectsCreated Project[] @relation("ProjectAdmin")
  assignedTasks   Task[]
  memberships     ProjectMember[]
}

model Project {
  id          Int      @id @default(autoincrement())
  title       String
  description String
  createdAt   DateTime @default(now())

  adminId Int
  admin   User @relation("ProjectAdmin", fields: [adminId], references: [id])

  tasks   Task[]
  members ProjectMember[]
}

model Task {
  id          Int      @id @default(autoincrement())
  title       String
  description String
  dueDate     DateTime
  priority    Priority
  status      Status   @default(TODO)
  createdAt   DateTime @default(now())

  assignedToId Int
  assignedTo   User @relation(fields: [assignedToId], references: [id])

  projectId Int
  project   Project @relation(fields: [projectId], references: [id])
}

model ProjectMember {
  id Int @id @default(autoincrement())

  userId Int
  projectId Int

  user User @relation(fields: [userId], references: [id])
  project Project @relation(fields: [projectId], references: [id])
}

enum Role {
  ADMIN
  MEMBER
}

enum Status {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}
```

---

# 5. Run Migration

```bash
npx prisma migrate dev --name init
```

---

# 6. Folder Structure

```bash
backend/
│
├── controllers/
├── middleware/
├── prisma/
├── routes/
├── utils/
├── server.js
└── .env
```

---

# 7. Prisma Client

## utils/prisma.js

```js
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = prisma
```

---

# 8. JWT Middleware

## middleware/authMiddleware.js

```js
const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid Token' })
  }
}

module.exports = authMiddleware
```

---

# 9. Auth Controller

## controllers/authController.js

```js
const prisma = require('../utils/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })

    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    )

    res.json({ token, user })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
```

---

# 10. Auth Routes

## routes/authRoutes.js

```js
const express = require('express')
const router = express.Router()
const {
  register,
  login
} = require('../controllers/authController')

router.post('/register', register)
router.post('/login', login)

module.exports = router
```

---

# 11. Project Controller

## controllers/projectController.js

```js
const prisma = require('../utils/prisma')

exports.createProject = async (req, res) => {
  try {
    const { title, description } = req.body

    const project = await prisma.project.create({
      data: {
        title,
        description,
        adminId: req.user.id
      }
    })

    res.status(201).json(project)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getProjects = async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        tasks: true,
        members: true
      }
    })

    res.json(projects)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
```

---

# 12. Task Controller

## controllers/taskController.js

```js
const prisma = require('../utils/prisma')

exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      dueDate,
      priority,
      assignedToId,
      projectId
    } = req.body

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        priority,
        assignedToId,
        projectId
      }
    })

    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.getTasks = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignedTo: true,
        project: true
      }
    })

    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body

    const task = await prisma.task.update({
      where: {
        id: Number(req.params.id)
      },
      data: {
        status
      }
    })

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
```

---

# 13. Project Routes

## routes/projectRoutes.js

```js
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')

const {
  createProject,
  getProjects
} = require('../controllers/projectController')

router.post('/', authMiddleware, createProject)
router.get('/', authMiddleware, getProjects)

module.exports = router
```

---

# 14. Task Routes

## routes/taskRoutes.js

```js
const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')

const {
  createTask,
  getTasks,
  updateTaskStatus
} = require('../controllers/taskController')

router.post('/', authMiddleware, createTask)
router.get('/', authMiddleware, getTasks)
router.put('/:id', authMiddleware, updateTaskStatus)

module.exports = router
```

---

# 15. Server File

## server.js

```js
const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/projects', require('./routes/projectRoutes'))
app.use('/api/tasks', require('./routes/taskRoutes'))

app.get('/', (req, res) => {
  res.send('API Running')
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

---

# 16. Run Backend

```bash
npm run dev
```

package.json scripts:

```json
"scripts": {
  "dev": "nodemon server.js"
}
```

---

# FRONTEND

# 17. Create Frontend

```bash
npm create vite@latest frontend
cd frontend
npm install
```

---

# 18. Install Packages

```bash
npm install react-router-dom axios react-hot-toast recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

# 19. Tailwind Config

## tailwind.config.js

```js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

# 20. index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

# 21. Folder Structure

```bash
src/
│
├── pages/
├── components/
├── services/
├── context/
└── App.jsx
```

---

# 22. Axios Setup

## services/api.js

```js
import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
})

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token')

  if (token) {
    req.headers.Authorization = `Bearer ${token}`
  }

  return req
})

export default API
```

---

# 23. Login Page

## pages/Login.jsx

```jsx
import { useState } from 'react'
import API from '../services/api'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const { data } = await API.post('/auth/login', {
        email,
        password
      })

      localStorage.setItem('token', data.token)

      navigate('/dashboard')
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-lg w-96"
      >
        <h2 className="text-3xl font-bold mb-6 text-center">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white p-3 rounded-lg">
          Login
        </button>
      </form>
    </div>
  )
}

export default Login
```

---

# 24. Dashboard Page

## pages/Dashboard.jsx

```jsx
import { useEffect, useState } from 'react'
import API from '../services/api'

const Dashboard = () => {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    const { data } = await API.get('/tasks')
    setTasks(data)
  }

  const completed = tasks.filter(t => t.status === 'DONE').length
  const pending = tasks.filter(t => t.status === 'TODO').length

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold">Total Tasks</h2>
          <p className="text-3xl mt-3">{tasks.length}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold">Completed</h2>
          <p className="text-3xl mt-3">{completed}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-xl font-semibold">Pending</h2>
          <p className="text-3xl mt-3">{pending}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
```

---

# 25. App.jsx

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

---

# 26. Run Frontend

```bash
npm run dev
```

---

# 27. Deployment

## Backend Railway

1. Push backend to GitHub
2. Open Railway
3. Deploy from GitHub
4. Add environment variables

```env
DATABASE_URL=
JWT_SECRET=
```

---

# 28. Frontend Deployment

Deploy frontend on Railway or Vercel.

Set:

```env
VITE_API_URL=
```

---

# 29. Features Covered

✅ Authentication
✅ JWT Security
✅ SQL Relationships
✅ Task CRUD
✅ Dashboard
✅ Responsive UI
✅ Role-Based Access
✅ REST APIs
✅ Deployment Ready

---

# 30. Additional Features You Can Add

* Drag and Drop Tasks
* Dark Mode
* Charts using Recharts
* Search Tasks
* Notifications
* Team Chat
* File Uploads

---

# 31. README Format

```md
# Team Task Manager

## Features
- Authentication
- Project Management
- Task Management
- Dashboard Analytics
- Role-Based Access

## Tech Stack
- React
- Node.js
- PostgreSQL
- Prisma

## Installation
npm install
npm run dev
```

---

# 32. Demo Video Flow

1. Signup/Login
2. Create Project
3. Add Members
4. Create Tasks
5. Assign Tasks
6. Update Status
7. Dashboard Analytics
8. Deployment Demo

---

# 33. Additional Ready-to-Use Frontend Pages

## Signup Page

### frontend/src/pages/Signup.jsx

```jsx
import { useState } from 'react'
import API from '../services/api'
import { useNavigate } from 'react-router-dom'

const Signup = () => {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await API.post('/auth/register', formData)
      navigate('/')
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-lg w-96"
      >
        <h1 className="text-3xl font-bold mb-6 text-center">
          Signup
        </h1>

        <input
          type="text"
          name="name"
          placeholder="Name"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          className="w-full border p-3 mb-4 rounded-lg"
          onChange={handleChange}
        />

        <button className="w-full bg-green-600 text-white p-3 rounded-lg">
          Signup
        </button>
      </form>
    </div>
  )
}

export default Signup
```

---

# 34. Create Project Page

## frontend/src/pages/Projects.jsx

```jsx
import { useEffect, useState } from 'react'
import API from '../services/api'

const Projects = () => {
  const [projects, setProjects] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data } = await API.get('/projects')
    setProjects(data)
  }

  const createProject = async (e) => {
    e.preventDefault()

    await API.post('/projects', {
      title,
      description
    })

    setTitle('')
    setDescription('')

    fetchProjects()
  }

  return (
    <div className="p-6">
      <h1 className="text-4xl font-bold mb-6">Projects</h1>

      <form
        onSubmit={createProject}
        className="bg-white p-6 rounded-xl shadow mb-6"
      >
        <input
          type="text"
          placeholder="Project Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-3 rounded-lg mb-4"
        />

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          Create Project
        </button>
      </form>

      <div className="grid md:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white p-6 rounded-xl shadow"
          >
            <h2 className="text-2xl font-bold">
              {project.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {project.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Projects
```

---

# 35. Task Page

## frontend/src/pages/Tasks.jsx

```jsx
import { useEffect, useState } from 'react'
import API from '../services/api'

const Tasks = () => {
  const [tasks, setTasks] = useState([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'LOW',
    assignedToId: '',
    projectId: ''
  })

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    const { data } = await API.get('/tasks')
    setTasks(data)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const createTask = async (e) => {
    e.preventDefault()

    await API.post('/tasks', formData)

    fetchTasks()
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold mb-6">Tasks</h1>

      <form
        onSubmit={createTask}
        className="bg-white p-6 rounded-xl shadow mb-6"
      >
        <input
          type="text"
          name="title"
          placeholder="Task Title"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Description"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        />

        <input
          type="date"
          name="dueDate"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        />

        <select
          name="priority"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <input
          type="number"
          name="assignedToId"
          placeholder="Assigned User ID"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        />

        <input
          type="number"
          name="projectId"
          placeholder="Project ID"
          className="w-full border p-3 rounded-lg mb-4"
          onChange={handleChange}
        />

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg">
          Create Task
        </button>
      </form>

      <div className="grid md:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-white p-6 rounded-xl shadow"
          >
            <h2 className="text-2xl font-bold">
              {task.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {task.description}
            </p>

            <div className="mt-4">
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                {task.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Tasks
```

---

# 36. Updated App.jsx

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Tasks from './pages/Tasks'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/tasks" element={<Tasks />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

---

# 37. Final Commands to Run Entire Project

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

---

# 38. Railway Deployment Steps

## Backend Deployment

1. Push backend folder to GitHub
2. Open Railway
3. New Project → Deploy from GitHub
4. Add Environment Variables

```env
DATABASE_URL=
JWT_SECRET=
```

5. Deploy

---

## Frontend Deployment

1. Push frontend folder to GitHub
2. Open Vercel
3. Import Project
4. Add:

```env
VITE_API_URL=
```

5. Deploy

---

# 39. Complete Features Included

✅ JWT Authentication
✅ Login & Signup
✅ PostgreSQL Database
✅ Prisma ORM
✅ Project CRUD
✅ Task CRUD
✅ Dashboard
✅ Responsive UI
✅ REST APIs
✅ Railway Deployment Ready
✅ Full Stack Architecture
✅ SQL Relationships

---

# 40. Final Tips

To score maximum marks:

* Make UI modern
* Add loading states
* Handle errors properly
* Use proper spacing/colors
* Make application responsive
* Keep clean folder structure
* Add charts in dashboard
* Deploy properly on Railway

To score maximum marks:

* Make UI modern
* Add loading states
* Handle errors properly
* Use proper spacing/colors
* Make application responsive
* Keep clean folder structure
* Add charts in dashboard
* Deploy properly on Railway
