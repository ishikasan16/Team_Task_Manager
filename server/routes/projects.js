import express from 'express';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { getProjectForUser, requireProjectAdmin } from '../lib/access.js';
import { httpError } from '../lib/httpError.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      throw httpError(400, 'Project name is required');
    }

    const project = await Project.create({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });
    await project.populate('members.user', 'name email');
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await getProjectForUser(req.params.projectId, req.user._id);
    await project.populate('members.user', 'name email');
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

router.post('/:projectId/members', async (req, res, next) => {
  try {
    const { email, role = 'Member' } = req.body;
    if (!email) {
      throw httpError(400, 'Member email is required');
    }

    const project = await getProjectForUser(req.params.projectId, req.user._id);
    requireProjectAdmin(project, req.user._id);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw httpError(404, 'No user exists with that email');
    }
    if (project.members.some((member) => member.user.toString() === user._id.toString())) {
      throw httpError(409, 'User is already a project member');
    }

    project.members.push({ user: user._id, role: role === 'Admin' ? 'Admin' : 'Member' });
    await project.save();
    await project.populate('members.user', 'name email');
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

router.delete('/:projectId/members/:userId', async (req, res, next) => {
  try {
    const project = await getProjectForUser(req.params.projectId, req.user._id);
    requireProjectAdmin(project, req.user._id);

    const admins = project.members.filter((member) => member.role === 'Admin');
    const removedMember = project.members.find((member) => member.user.toString() === req.params.userId);
    if (!removedMember) {
      throw httpError(404, 'Member not found');
    }
    if (removedMember.role === 'Admin' && admins.length === 1) {
      throw httpError(400, 'A project must keep at least one admin');
    }

    project.members = project.members.filter((member) => member.user.toString() !== req.params.userId);
    await project.save();
    await Task.updateMany(
      { project: project._id, assignedTo: req.params.userId, status: { $ne: 'Done' } },
      { assignedTo: req.user._id }
    );
    await project.populate('members.user', 'name email');
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

export default router;
