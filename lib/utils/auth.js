import jwt from 'jsonwebtoken';

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'shadivilla-secret-key-for-development-only';

// Generate JWT token
export const generateToken = (userId, role) => {
  const token = jwt.sign(
    { 
      userId, 
      role 
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
  
  console.log(`Generated token for user ${userId} with role ${role}`);
  return token;
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
   
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

// Parse token from request headers
export const getTokenFromHeaders = (req) => {
  // Log all headers for debugging

  const authorization = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (!authorization) {
    return null;
  }
  
  
  const parts = authorization.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

// Helper function to validate the token and get user info
export const authenticateUser = (req) => {
  const token = getTokenFromHeaders(req);
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}; 