import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { hashToken } from "../utils/tokenUtils.js";

export const authenticateToken = async (req, res, next) => {
    try {
        // 1. Get the authorization header
        const authHeader = req.headers.authorization;

        // 2. Check whether the header exists
        if (!authHeader) {
            return res.status(401).json({
                message: "Access denied. No token provided.",
            });
        }

        // 3. Extract the token from the bearer <token>
        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                message: "Invalid authorization format.",
            });
        }

        // 4. Verify the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach token information for the logout controller
        req.token = token;
        req.tokenExpiresAt = new Date(decoded.exp * 1000);

        // 5. Check whether the token has been revoked
        const tokenHash = hashToken(token);

        const blacklistedToken = await pool.query(
            `SELECT id FROM token_blacklist
            WHERE token_hash = $1`,
            [tokenHash]
        );

        if (blacklistedToken.rows.length > 0) {
            return res.status(401).json({
                message: "Token has been revoked. Please log in again.",
            });
        }

        // 6. Retrieve the current user from PostgreSQL 
        const result = await pool.query(
          `
            SELECT id, username, email, role
            FROM users
            WHERE id = $1`,
          [decoded.userid],
        );

        // 7. Check whether the user still exists
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: " User account no longer exists.",
            });
        }

        // 8. Attach current database information to the request
        req.user = result.rows[0];

        // 9. Allow the request to continue 
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token.",
            });
        }

        console.error("Authentication error: ", error.message);
        return res.status(500).json({
            message: "Internal server error.",
        });
    }
};
