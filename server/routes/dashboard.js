import express from 'express';
import { Task } from '../models/Task.js';
import { requireAuth } from '../middleware/auth.js';
import { getProjectForUser } from '../lib/access.js';
import { httpError } from '../lib/httpError.js';

const router = express.Router();
router.use(requireAuth);

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getProjectForUser(req.params.projectId, req.user._id);
    await project.populate('members.user', 'name email');

    const isAdmin = project.members.some(
      (member) => member.user._id.toString() === req.user._id.toString() && member.role === 'Admin'
    );
    if (!isAdmin && !project.members.some((member) => member.user._id.toString() === req.user._id.toString())) {
      throw httpError(403, 'Project access required');
    }

    const baseFilter = isAdmin
      ? { project: project._id }
      : { project: project._id, assignedTo: req.user._id };
    const tasks = await Task.find(baseFilter).populate('assignedTo', 'name email');
    const now = new Date();
    const byStatus = { 'To Do': 0, 'In Progress': 0, Done: 0 };
    const perUser = {};

    for (const task of tasks) {
      byStatus[task.status] += 1;
      const userName = task.assignedTo?.name || 'Unassigned';
      perUser[userName] = (perUser[userName] || 0) + 1;
    }

    res.json({
      totalTasks: tasks.length,
      byStatus,
      perUser,
      overdueTasks: tasks.filter((task) => task.status !== 'Done' && task.dueDate < now).length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
