import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key_wikipreta_2024';

// Helpers
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        SECRET_KEY,
        { expiresIn: '24h' }
    );
};

// Middleware
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Expecting "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied: No token provided' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Access denied: Invalid token' });
        req.user = user;
        next();
    });
};

// Role-based authorization middleware
export const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && (req.user.role === role || req.user.role === 'admin')) {
            next();
        } else {
            res.status(403).json({ error: `Access denied: Requires ${role} role` });
        }
    };
};
