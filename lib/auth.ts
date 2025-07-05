import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase, generateUUID } from './database';
import { RowDataPacket } from 'mysql2';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  lastLogin?: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'user';
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    return null;
  }
}

// Authenticate user
export async function authenticateUser(credentials: LoginCredentials): Promise<{ user: AuthUser; token: string } | null> {
  const connection = await connectToDatabase();
  
  try {
    const [users] = await connection.execute(`
      SELECT id, username, email, password_hash, role, last_login
      FROM users 
      WHERE username = ? OR email = ?
    `, [credentials.username, credentials.username]);

    const userRows = users as RowDataPacket[];
    
    if (userRows.length === 0) {
      return null;
    }

    const user = userRows[0];
    
    const isValidPassword = await verifyPassword(credentials.password, user.password_hash);
    console.log(isValidPassword);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await connection.execute(`
      UPDATE users SET last_login = NOW() WHERE id = ?
    `, [user.id]);

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: new Date()
    };

    const token = generateToken(authUser);

    return { user: authUser, token };

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  } finally {
    connection.release();
  }
}

// Register new user
export async function registerUser(userData: RegisterData): Promise<{ user: AuthUser; token: string } | { error: string }> {
  const connection = await connectToDatabase();
  
  try {
    // Check if username or email already exists
    const [existingUsers] = await connection.execute(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `, [userData.username, userData.email]);

    if ((existingUsers as RowDataPacket[]).length > 0) {
      return { error: 'Username or email already exists' };
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);
    const userId = generateUUID();

    // Insert new user
    await connection.execute(`
      INSERT INTO users (id, username, email, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [userId, userData.username, userData.email, hashedPassword, userData.role || 'user']);

    const authUser: AuthUser = {
      id: userId,
      username: userData.username,
      email: userData.email,
      role: userData.role || 'user'
    };

    const token = generateToken(authUser);

    return { user: authUser, token };

  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Failed to register user' };
  } finally {
    connection.release();
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<AuthUser | null> {
  const connection = await connectToDatabase();
  
  try {
    const [users] = await connection.execute(`
      SELECT id, username, email, role, last_login
      FROM users 
      WHERE id = ?
    `, [id]);

    const userRows = users as RowDataPacket[];
    
    if (userRows.length === 0) {
      return null;
    }

    const user = userRows[0];
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: user.last_login ? new Date(user.last_login) : undefined
    };

  } catch (error) {
    console.error('Get user error:', error);
    return null;
  } finally {
    connection.release();
  }
}

// Change password
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const connection = await connectToDatabase();
  
  try {
    // Get current password hash
    const [users] = await connection.execute(`
      SELECT password_hash FROM users WHERE id = ?
    `, [userId]);

    const userRows = users as RowDataPacket[];
    
    if (userRows.length === 0) {
      return false;
    }

    const user = userRows[0];
    const isValidPassword = await verifyPassword(currentPassword, user.password_hash);
    
    if (!isValidPassword) {
      return false;
    }

    // Hash new password and update
    const hashedNewPassword = await hashPassword(newPassword);
    await connection.execute(`
      UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?
    `, [hashedNewPassword, userId]);

    return true;

  } catch (error) {
    console.error('Change password error:', error);
    return false;
  } finally {
    connection.release();
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<AuthUser[]> {
  const connection = await connectToDatabase();
  
  try {
    const [users] = await connection.execute(`
      SELECT id, username, email, role, last_login, created_at
      FROM users 
      ORDER BY created_at DESC
    `);

    return (users as RowDataPacket[]).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      lastLogin: user.last_login ? new Date(user.last_login) : undefined
    }));

  } catch (error) {
    console.error('Get all users error:', error);
    return [];
  } finally {
    connection.release();
  }
}