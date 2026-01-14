// Simple role check middleware
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists (from auth middleware)
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            // Check if user has required role
            const userRole = req.user.role;
            
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                });
            }
            
            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };
};

module.exports = { requireRole };