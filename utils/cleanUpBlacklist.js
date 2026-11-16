import pool from "../config/database.js";

// Remove expired tokens from the token_blacklist
export const cleanUpBlacklist = async () => {
    try {
        const result = await pool.query(
            `DELETE FROM token_blacklist
            WHERE expires_at <= CURRENT_TIMESTAMP`
        );

        console.log(
            `Blacklist cleanup completed. ${result.rowCount} expired tokens removed.`
        );
    } catch (error) {
        console.error("Blacklist cleanup failed:", error.message);
    }
};