import { Project } from '../models/Project.js';
import { httpError } from './httpError.js';

export async function getProjectForUser(projectId, userId) {
  const project = await Project.findOne({ _id: projectId, 'members.user': userId });
  if (!project) {
    throw httpError(404, 'Project not found');
  }
  return project;
}

export function memberRole(project, userId) {
  const member = project.members.find((entry) => entry.user.toString() === userId.toString());
  return member?.role;
}

export function requireProjectAdmin(project, userId) {
  if (memberRole(project, userId) !== 'Admin') {
    throw httpError(403, 'Admin access required');
  }
}

export function isProjectMember(project, userId) {
  return project.members.some((entry) => entry.user.toString() === userId.toString());
}
