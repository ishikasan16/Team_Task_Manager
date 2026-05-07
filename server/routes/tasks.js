import express from 'express';
import { Task } from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';
import { getProjectForUser, isProjectMember, requireProjectAdmin } from '../lib/access.js';
import { httpError } from '../lib/httpError.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      throw httpError(400, 'projectId query parameter is required');
    }

    const project = await getProjectForUser(projectId, req.user._id);
    const isAdmin = project.members.some(
      (member) => member.user.toString() === req.user._id.toString() && member.role === 'Admin'
    );
    const filter = isAdmin ? { project: projectId } : { project: projectId, assignedTo: req.user._id };
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { projectId, title, description, dueDate, priority, assignedTo } = req.body;
    if (!projectId || !title || !dueDate || !assignedTo) {
      throw httpError(400, 'Project, title, due date, and assignee are required');
    }

    const project = await getProjectForUser(projectId, req.user._id);
    requireProjectAdmin(project, req.user._id);
    if (!isProjectMember(project, assignedTo)) {
      throw httpError(400, 'Assignee must be a project member');
    }

    const task = await Task.create({
      project: projectId,
      title,
      description,
      dueDate,
      priority,
      assignedTo,
      createdBy: req.user._id
    });
    await task.populate('assignedTo', 'name email');
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      throw httpError(404, 'Task not found');
    }

    const project = await getProjectForUser(task.project, req.user._id);
    const isAdmin = project.members.some(
      (member) => member.user.toString() === req.user._id.toString() && member.role === 'Admin'
    );
    const isAssignee = task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignee) {
      throw httpError(403, 'You can only update assigned tasks');
    }

    const { title, description, dueDate, priority, status, assignedTo } = req.body;
    if (isAdmin) {
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (priority !== undefined) task.priority = priority;
      if (assignedTo !== undefined) {
        if (!isProjectMember(project, assignedTo)) {
          throw httpError(400, 'Assignee must be a project member');
        }
        task.assignedTo = assignedTo;
      }
    }
    if (status !== undefined) {
      task.status = status;
    }

    await task.save();
    await task.populate('assignedTo', 'name email');
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete('/:taskId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      throw httpError(404, 'Task not found');
    }

    const project = await getProjectForUser(task.project, req.user._id);
    requireProjectAdmin(project, req.user._id);
    await task.deleteOne();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
