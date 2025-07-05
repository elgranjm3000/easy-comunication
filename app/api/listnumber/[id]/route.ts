import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// GET - Fetch a specific listnumber
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;

    const [result] = await connection.execute(`
      SELECT * FROM listnumber WHERE id = ?
    `, [id]);

    if ((result as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'ListNumber not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: (result as RowDataPacket[])[0]
    });

  } catch (error) {
    console.error('Error fetching listnumber:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listnumber',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// PUT - Update a listnumber
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;
    const body = await request.json();
    const { 
      port, 
      iccid, 
      imei, 
      imsi, 
      sn, 
      status, 
      batch_id, 
      users_id 
    } = body;

    // Check if listnumber exists
    const [existingRecord] = await connection.execute(`
      SELECT * FROM listnumber WHERE id = ?
    `, [id]);

    if ((existingRecord as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'ListNumber not found' },
        { status: 404 }
      );
    }

    // Check for duplicates (excluding current record)
    if (iccid || imei || imsi || sn) {
      const [duplicates] = await connection.execute(`
        SELECT id FROM listnumber 
        WHERE (iccid = ? OR imei = ? OR imsi = ? OR sn = ?) AND id != ?
      `, [iccid, imei, imsi, sn, id]);

      if ((duplicates as RowDataPacket[]).length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Duplicate entry: ICCID, IMEI, IMSI, or SN already exists' 
          },
          { status: 409 }
        );
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (port !== undefined) {
      updateFields.push('port = ?');
      updateValues.push(port);
    }
    if (iccid !== undefined) {
      updateFields.push('iccid = ?');
      updateValues.push(iccid);
    }
    if (imei !== undefined) {
      updateFields.push('imei = ?');
      updateValues.push(imei);
    }
    if (imsi !== undefined) {
      updateFields.push('imsi = ?');
      updateValues.push(imsi);
    }
    if (sn !== undefined) {
      updateFields.push('sn = ?');
      updateValues.push(sn);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (batch_id !== undefined) {
      updateFields.push('batch_id = ?');
      updateValues.push(batch_id);
    }
    if (users_id !== undefined) {
      updateFields.push('users_id = ?');
      updateValues.push(users_id);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    // Update listnumber
    await connection.execute(`
      UPDATE listnumber 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    // Fetch updated record
    const [updatedRecord] = await connection.execute(`
      SELECT * FROM listnumber WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      data: (updatedRecord as RowDataPacket[])[0],
      message: 'ListNumber updated successfully'
    });

  } catch (error) {
    console.error('Error updating listnumber:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update listnumber',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// DELETE - Delete a listnumber
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await connectToDatabase();
  
  try {
    const { id } = params;

    // Check if listnumber exists
    const [existingRecord] = await connection.execute(`
      SELECT id FROM listnumber WHERE id = ?
    `, [id]);

    if ((existingRecord as RowDataPacket[]).length === 0) {
      return NextResponse.json(
        { success: false, error: 'ListNumber not found' },
        { status: 404 }
      );
    }

    // Delete listnumber
    await connection.execute(`
      DELETE FROM listnumber WHERE id = ?
    `, [id]);

    return NextResponse.json({
      success: true,
      message: 'ListNumber deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting listnumber:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete listnumber',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}