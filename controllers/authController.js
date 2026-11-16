import pool from "../config/database.js";
import bcrypt from "bcrypt";
import jwt from"jsonwebtoken";
import { hashToken } from "../utils/tokenUtils.js";


export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email and password are required.",
      });
    }

    // 2. Normalize input
    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail) {
      return res.status(400).json({
        message: "Username and email cannot be empty.",
      });
    }

    if (normalizedUsername.length > 50) {
      return res.status(400).json({
        message: "Username cannot exceed 50 characters.",
      });
    }

    if (normalizedEmail.length > 255) {
      return res.status(400).json({
        message: "Email cannot exceed 255 characters.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    // 3. Check whether the email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    // 4. Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. Save the user in PostgreSQL
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, role, created_at`,
      [normalizedUsername, normalizedEmail, passwordHash]
    );

    // 6. Return successful registration
    return res.status(201).json({
      message: "User registered successfully!",
      user: result.rows[0],
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Username or email is already registered.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "An internal server error occurred.",
    });
  }
};

export const loginUser = async (req, res) => {

    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }
        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            return res.status(400).json({
                message: "Email cannot be empty.",
            });
        }

        // Find user in PostgreSQL
        const result = await pool.query(`
            SELECT id, username, email, password_hash, role, created_at
            FROM users
            WHERE email = $1`,
            [normalizedEmail]
        );

        // Check whether user exists
        if (result.rows.length === 0) {
            return res.status(401).json({
                message:"Invalid email or password.",
            });
        }

        const user = result.rows[0];

        // Compare submitted password with stored hash
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        const accessToken = jwt.sign(
            {
                userid: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "15m",
            }
        );
        // Return successful login
        return res.status(200).json({
            message:"Login successful!",
            accessToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            message: "An internal server error occurred.",
        });
    }
} ;

export const logoutUser = async (req,res) => {
  try {
    // 1. Hash the authenticated JWT
    const tokenHash = hashToken(req.token);

    // 2. Store the hashed token in PostgreSQL
    await pool.query(`
      INSERT INTO token_blacklist (token_hash, expires_at)
      VALUES ($1, $2)
      ON CONFLICT (token_hash) DO NOTHING`,
  [tokenHash, req.tokenExpiresAt]
);

    // 3. Confirm successful logout
    return res.status(200).json({
      message:"Logout successful. Token has been revoked.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      message: "An internal server error occurred.",
    });
  }
};