import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, generateUUID } from '@/lib/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - Fetch all numbers with optional filtering
export async function GET(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT 
        n.*,
        COUNT(c.id) as comment_count,
        COUNT(t.id) as timeline_count
      FROM numbers n
      LEFT JOIN comments c ON n.id = c.number_id
      LEFT JOIN timeline t ON n.id = t.number_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Add search filter
    if (search) {
      query += ` AND (n.number_ref LIKE ? OR n.assigned_to LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add status filter
    if (status && status !== 'all') {
      query += ` AND n.status = ?`;
      params.push(status);
    }

    // Add priority filter
    if (priority && priority !== 'all') {
      query += ` AND n.priority = ?`;
      params.push(priority);
    }

    query += ` 
      GROUP BY n.id 
      ORDER BY n.last_updated DESC 
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);

    const [rows] = await connection.execute(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(DISTINCT n.id) as total FROM numbers n WHERE 1=1`;
    const countParams: any[] = [];
    
    if (search) {
      countQuery += ` AND (n.number_ref LIKE ? OR n.assigned_to LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (status && status !== 'all') {
      countQuery += ` AND n.status = ?`;
      countParams.push(status);
    }
    if (priority && priority !== 'all') {
      countQuery += ` AND n.priority = ?`;
      countParams.push(priority);
    }

    const [countResult] = await connection.execute(countQuery, countParams);
    const total = (countResult as RowDataPacket[])[0].total;

    return NextResponse.json({
      success: true,
      data: rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching numbers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch numbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// POST - Create a new number
export async function POST(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const body = await request.json();
    const { 
      numberRef, 
      processStage = 'initial', 
      status = 'active', 
      priority = 'medium', 
      assignedTo 
    } = body;

    // Validation
    if (!numberRef || !assignedTo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Number reference and assigned user are required' 
        },
        { status: 400 }
      );
    }

    const numberId = generateUUID();
    const timelineId = generateUUID();
    const now = new Date();

    // Start transaction
    await connection.beginTransaction();

    try {
      // Insert number
      await connection.execute(`
        INSERT INTO numbers (
          id, number_ref, process_stage, status, priority, assigned_to, 
          start_date, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [numberId, numberRef, processStage, status, priority, assignedTo, now, now]);

      // Insert initial timeline event
      await connection.execute(`
        INSERT INTO timeline (
          id, number_id, stage, timestamp, user, description
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [timelineId, numberId, processStage, now, 'System', 'Entry created']);

      await connection.commit();

      // Fetch the created number with related data
      const [result] = await connection.execute(`
        SELECT n.*, 
               COUNT(c.id) as comment_count,
               COUNT(t.id) as timeline_count
        FROM numbers n
        LEFT JOIN comments c ON n.id = c.number_id
        LEFT JOIN timeline t ON n.id = t.number_id
        WHERE n.id = ?
        GROUP BY n.id
      `, [numberId]);

      return NextResponse.json({
        success: true,
        data: (result as RowDataPacket[])[0],
        message: 'Number created successfully'
      }, { status: 201 });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating number:', error);
    
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Number reference already exists' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}