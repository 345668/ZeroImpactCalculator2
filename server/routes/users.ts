import express, { Router } from 'express';
import { storage } from '../storage.js';
import { z } from 'zod';
import { insertUserSchema } from '../../shared/schema.js';

const router = Router();

// Only allow admin users to access these routes
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await storage.getUserByEmail(req.session.user.email);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error in admin middleware:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    // Remove sensitive data before sending
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get a specific user by ID (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await storage.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data before sending
    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate role
    const updateSchema = z.object({
      role: z.enum(['user', 'admin', 'consultant'])
    });
    
    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    // Prevent self-demotion for admins
    if (req.session.user?.id === id && validation.data.role !== 'admin') {
      return res.status(403).json({ 
        error: 'You cannot demote yourself from admin role' 
      });
    }

    const updatedUser = await storage.updateUserRole(id, validation.data.role);
    
    // Remove sensitive data before sending
    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt
    };
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Create a new user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    // Extend the insertUserSchema to include password verification
    const createUserSchema = insertUserSchema.extend({
      confirmPassword: z.string()
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"]
    });
    
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validation.error.errors 
      });
    }

    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(validation.data.email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(validation.data.username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const newUser = await storage.createUser({
      email: validation.data.email,
      username: validation.data.username,
      password: validation.data.password,
      role: validation.data.role || 'user'
    });

    // Remove sensitive data before sending
    const safeUser = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt
    };
    
    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;