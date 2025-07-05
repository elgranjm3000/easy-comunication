import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, generateUUID } from '@/lib/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET - Fetch a specific number with comments and timeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;

    // Get number details
    const [numberResult] = await connection.execute(`
      SELECT * FROM numbers WHERE id = ?
    `, [id]);

    if ((numberResult as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Number not found' },
        { status: 404 }
      );
    }

    const number = (numberResult as RowDataPacket[])[0];

    // Get comments
    const [comments] = await connection.execute(`
      SELECT * FROM comments 
      WHERE number_id = ? 
      ORDER BY timestamp DESC
    `, [id]);

    // Get timeline
    const [timeline] = await connection.execute(`
      SELECT * FROM timeline 
      WHERE number_id = ? 
      ORDER BY timestamp ASC
    `, [id]);

    return NextResponse.json({
      success: true,
      data: {
        ...number,
        comments,
        timeline
      }
    });

  } catch (error) {
    console.error('Error fetching number:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// PUT - Update a number
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      numberRef, 
      processStage, 
      status, 
      priority, 
      assignedTo 
    } = body;

    // Check if number exists
    const [existingNumber] = await connection.execute(`
      SELECT * FROM numbers WHERE id = ?
    `, [id]);

    if ((existingNumber as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Number not found' },
        { status: 404 }
      );
    }

    const currentNumber = (existingNumber as RowDataPacket[])[0];

    // Start transaction
    await connection.beginTransaction();

    try {
      // Update number
      await connection.execute(`
        UPDATE numbers 
        SET number_ref = ?, process_stage = ?, status = ?, priority = ?, assigned_to = ?, last_updated = NOW()
        WHERE id = ?
      `, [numberRef, processStage, status, priority, assignedTo, id]);

      // Add timeline event if process stage changed
      if (processStage && processStage !== currentNumber.process_stage) {
        const timelineId = generateUUID();
        await connection.execute(`
          INSERT INTO timeline (
            id, number_id, stage, timestamp, user, description
          ) VALUES (?, ?, ?, NOW(), ?, ?)
        `, [timelineId, id, processStage, 'Current User', `Stage updated to ${processStage}`]);
      }

      await connection.commit();

      // Fetch updated number
      const [updatedNumber] = await connection.execute(`
        SELECT n.*, 
               COUNT(c.id) as comment_count,
               COUNT(t.id) as timeline_count
        FROM numbers n
        LEFT JOIN comments c ON n.id = c.number_id
        LEFT JOIN timeline t ON n.id = t.number_id
        WHERE n.id = ?
        GROUP BY n.id
      `, [id]);

      return NextResponse.json({
        success: true,
        data: (updatedNumber as RowDataPacket[])[0],
        message: 'Number updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error updating number:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE - Delete a number
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;

    // Check if number exists
    const [existingNumber] = await connection.execute(`
      SELECT id FROM numbers WHERE id = ?
    `, [id]);

    if ((existingNumber as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Number not found' },
        { status: 404 }
      );
    }

    // Delete number (cascade will delete comments and timeline)
    await connection.execute(`
      DELETE FROM numbers WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'Number deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting number:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete number',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}