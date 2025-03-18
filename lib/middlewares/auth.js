import { authenticateUser } from '../utils/auth';

// Middleware to protect routes - requires authentication
export const requireAuth = async (req, res, next) => {
  try {
    const user = authenticateUser(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Add user info to request object
    req.user = user;
    
    return next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Middleware to restrict access based on user role
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to perform this action' 
      });
    }
    
    next();
  };
}; 