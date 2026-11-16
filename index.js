import express from "express";
import dotenv from "dotenv";
import pool from "./config/database.js";
import cron from "node-cron";
import { cleanUpBlacklist } from "./utils/cleanUpBlacklist.js";
import authRoutes from "./routes/authRoutes.js";
import { authenticateToken } from "./middleware/authMiddleware.js";
import { authorizeRole } from "./middleware/authorizeRole.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());


// Authentication routes
app.use("/api/auth", authRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("JWT Authentication System is running!");
});

app.get("/api/protected", authenticateToken, (req, res) => {
    res.status(200).json({
        message: "Welcome! You have accessed a protected route.",
        user: req.user,
    });
});


// Admin-only route
app.get("/api/admin", authenticateToken, authorizeRole("admin"), 
(req, res) => {
   res.json({
    message: "Welcome Admin! You have administrative access.",
   });
});


// User-only route
app.get("/api/user", authenticateToken, authorizeRole("user"),
(req, res) => {
  res.json({
    message: "Welcome user! You have user access.",
  });
});

// Database connection test 
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      message: "PostgreSQL connection successful!",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

// Schedule automatic blacklist cleanup every hour
cron.schedule("0 * * * *", async () => {
  console.log("Running scheduled blacklist cleanup...");
  await cleanUpBlacklist();
});


// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});