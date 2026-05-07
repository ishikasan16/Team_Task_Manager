import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { httpError } from '../lib/httpError.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw httpError(401, 'Authentication token required');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select('-passwordHash');

    if (!user) {
      throw httpError(401, 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.status ? error : httpError(401, 'Invalid or expired token'));
  }
}
