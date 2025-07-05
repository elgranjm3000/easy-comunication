import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dashboard_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database connection function
export async function connectToDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database');
    return connection;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  const connection = await connectToDatabase();
  
  try {
    // Create users table first (referenced by other tables)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
        last_login DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create listnumber table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS listnumber (
        id VARCHAR(36) PRIMARY KEY,
        port VARCHAR(100) NOT NULL,
        iccid VARCHAR(100) NOT NULL,
        imei VARCHAR(100) NOT NULL,
        imsi VARCHAR(100) NOT NULL,
        sn VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        batch_id VARCHAR(100) NOT NULL,
        users_id VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_port (port),
        INDEX idx_iccid (iccid),
        INDEX idx_imei (imei),
        INDEX idx_imsi (imsi),
        INDEX idx_sn (sn),
        INDEX idx_status (status),
        INDEX idx_batch_id (batch_id),
        INDEX idx_users_id (users_id),
        UNIQUE KEY unique_iccid (iccid),
        UNIQUE KEY unique_imei (imei),
        UNIQUE KEY unique_imsi (imsi),
        UNIQUE KEY unique_sn (sn)
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1
    `);

    // Create numbers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS numbers (
        id VARCHAR(36) PRIMARY KEY,
        number_ref VARCHAR(100) NOT NULL UNIQUE,
        process_stage ENUM('initial', 'in-progress', 'review', 'approval', 'completed', 'rejected') NOT NULL DEFAULT 'initial',
        start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status ENUM('active', 'pending', 'blocked', 'completed') NOT NULL DEFAULT 'active',
        priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        assigned_to VARCHAR(255) NOT NULL,
        created_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_number_ref (number_ref),
        INDEX idx_status (status),
        INDEX idx_priority (priority),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_process_stage (process_stage),
        INDEX idx_created_by (created_by),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create comments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id VARCHAR(36) PRIMARY KEY,
        number_id VARCHAR(36) NOT NULL,
        text TEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        author_id VARCHAR(36) NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_number_id (number_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_author_id (author_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create timeline table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS timeline (
        id VARCHAR(36) PRIMARY KEY,
        number_id VARCHAR(36) NOT NULL,
        stage ENUM('initial', 'in-progress', 'review', 'approval', 'completed', 'rejected') NOT NULL,
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user VARCHAR(255) NOT NULL,
        user_id VARCHAR(36) NULL,
        description TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (number_id) REFERENCES numbers(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_number_id (number_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_stage (stage),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Database tables initialized successfully');
    
    // Insert default admin user if not exists
    const [existingUsers] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE username = ?',
      ['admin']
    );
    
    if ((existingUsers as any)[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await connection.execute(`
        INSERT INTO users (id, username, email, password_hash, role) 
        VALUES (?, 'admin', 'admin@dashboard.com', ?, 'admin')
      `, [generateUUID(), hashedPassword]);
      console.log('✅ Default admin user created (admin/admin123)');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Helper function to generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Export the pool for direct use
export { pool };