import express from "express";
import { fromZodError } from "zod-validation-error";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";

const router = express.Router();

// GET /api/auth/session - Endpoint to check if user is authenticated
router.get("/session", (req, res) => {
  try {
    if (req.session.user) {
      // User is authenticated
      return res.json({
        authenticated: true,
        user: req.session.user
      });
    } else {
      // User is not authenticated
      return res.status(401).json({
        authenticated: false,
        message: "Not authenticated"
      });
    }
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({ 
      message: "Error checking session",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    console.log('Received signup request');

    // Validate request body against schema
    const validatedData = insertUserSchema.parse(req.body);

    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(validatedData.email);
    if (existingEmail) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(validatedData.username);
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }

    // Create new user with admin role
    const user = await storage.createUser({
      ...validatedData,
      role: "admin" // Force admin role for all users
    });

    // Return success response without sensitive data
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: unknown) {
    console.error('Signup error:', error);
    if (error instanceof Error && error.name === "ZodError") {
      const validationError = fromZodError(error as any);
      return res.status(400).json({ message: validationError.message });
    }
    res.status(500).json({ 
      message: "Error creating user",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    console.log('Received login request');
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ message: "Login and password are required" });
    }

    // Try to find user by username first, then by email (for backward compatibility)
    let user = await storage.getUserByUsername(login);
    if (!user) {
      user = await storage.getUserByEmail(login);
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValid = await storage.verifyPassword(user.email, password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Store user info in the session
    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    // Save the session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('User authenticated and session saved:', req.session.user);

    // Return success response without sensitive data
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: "Error during login",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/auth/logout - Endpoint to logout and clear session
router.post("/logout", (req, res) => {
  try {
    // Log who is logging out
    console.log('Logout request received from user:', req.session.user);
    
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ 
          success: false,
          message: "Error logging out" 
        });
      }
      
      // Clear the session cookie
      res.clearCookie('radical.sid');
      
      res.json({ 
        success: true,
        message: "Logged out successfully" 
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error during logout",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;