import express from "express";
import { fromZodError } from "zod-validation-error";
import { insertUserSchema } from "@shared/schema";
import { storage } from "../storage";

const router = express.Router();

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
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === "ZodError") {
      const validationError = fromZodError(error);
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

    // Try to find user by email or username
    let user = await storage.getUserByEmail(login);
    if (!user) {
      user = await storage.getUserByUsername(login);
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValid = await storage.verifyPassword(user.email, password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Override user role to admin for all successful logins
    user.role = "admin";

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: "Error during login",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;