import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/database';

// POST - Initialize database tables
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });

  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check database status
export async function GET(request: NextRequest) {
  try {
    const { connectToDatabase } = await import('@/lib/database');
    const connection = await connectToDatabase();
    
    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);
    
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tables: tables
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database connection falla',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}