export const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {

        // Check whether the user is authenticated
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

        // Check whether the user's role is permitted
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access forbidden. Insufficient permissions."
            });
        }

        // Allow the request to continue
        next();
    };
};