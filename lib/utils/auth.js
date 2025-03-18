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
    console.log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully for user:', decoded.userId);
    return { userId: decoded.userId, role: decoded.role };
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

// Parse token from request headers
export const getTokenFromHeaders = (req) => {
  // Log all headers for debugging
  console.log('Request headers:', Object.fromEntries([...req.headers.entries()]));
  
  const authorization = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (!authorization) {
    console.log('No authorization header found');
    return null;
  }
  
  console.log('Authorization header:', authorization);
  
  const parts = authorization.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('Invalid authorization format');
    return null;
  }
  
  console.log('Token found in headers, length:', parts[1].length);
  return parts[1];
};

// Helper function to validate the token and get user info
export const authenticateUser = (req) => {
  const token = getTokenFromHeaders(req);
  if (!token) {
    console.log('No token found in request headers');
    return null;
  }
  
  return verifyToken(token);
}; 