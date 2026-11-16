import express from "express";
import { 
    registerUser,
    loginUser,
    logoutUser
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";


const router = express.Router();

// User registration route
router.post("/register", registerUser);

// User login route
router.post("/login", loginUser);

// User logout route
router.post("/logout", authenticateToken, logoutUser);

export default router;