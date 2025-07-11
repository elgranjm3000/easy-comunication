import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, generateUUID } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// GET - Fetch all listnumbers with optional filtering and pagination
export async function GET(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const sn = searchParams.get('sn') || '';
    const id = searchParams.get('id') || '';
    const status = searchParams.get('status') || '';
    const batch_id = searchParams.get('batch_id') || '';
    const users_id = searchParams.get('users_id') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT * FROM listnumber
      WHERE 1=1
    `;
    
    const params: any[] = [];

    // Add search filter (searches across multiple fields)
    if (search) {
      query += ` AND (
        id = ? OR
        port LIKE ? OR 
        iccid LIKE ? OR 
        imei LIKE ? OR 
        imsi LIKE ? OR 
        sn LIKE ? OR
        batch_id LIKE ? OR
        users_id LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add status filter

    if (id && id !== 'all') {
      query += ` AND id = ?`;
      params.push(id);
    }

    if (status && status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    // Add batch_id filter
    if (batch_id && batch_id !== 'all') {
      query += ` AND batch_id = ?`;
      params.push(batch_id);
    }

    if (sn && sn !== 'all') {
        query += ` AND sn like ?`;
        params.push(`%${sn}%`);
    }

    // Add users_id filter
    if (users_id && users_id !== 'all') {
      query += ` AND users_id = ?`;
      params.push(users_id);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await connection.execute(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM listnumber WHERE 1=1`;
    const countParams: any[] = [];
    
    if (search) {
      countQuery += ` AND (
        id = ? OR
        port LIKE ? OR 
        iccid LIKE ? OR 
        imei LIKE ? OR 
        imsi LIKE ? OR 
        sn LIKE ? OR
        batch_id LIKE ? OR
        users_id LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (id && id !== 'all') {
      countQuery += ` AND id = ?`;
      params.push(id);
    }


    if (status && status !== 'all') {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }
    if (batch_id && batch_id !== 'all') {
      countQuery += ` AND batch_id = ?`;
      countParams.push(batch_id);
    }
    if (users_id && users_id !== 'all') {
      countQuery += ` AND users_id = ?`;
      countParams.push(users_id);
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
    console.error('Error fetching listnumbers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listnumbers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// POST - Create a new listnumber
export async function POST(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    const body = await request.json();
    const { 
      port = 'N/A', 
      iccid = 'N/A', 
      imei = 'N/A', 
      imsi = 'N/A', 
      sn, 
      st,
      active,
      slot_active,
      status = '0'  
       
    } = body;

    console.log("body: ", body);
    // Validation
    if (!sn ) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required: sn' 
        },
        { status: 400 }
      );
    }

    // Check for duplicates
    const [existingRecords] = await connection.execute(`
      SELECT id FROM listnumber 
      WHERE sn = ?
    `, [sn]);

    if ((existingRecords as RowDataPacket[]).length > 0) {
            await connection.execute(`
            UPDATE listnumber 
            SET 
              st_status = ?,
              active_status = ?,
              slot_active_status = ?
            WHERE sn = ?
          `, [st, active, slot_active, sn]); // Asegúrate de que estas variables estén definidas
        
          return NextResponse.json(
            { 
              success: true, 
              message: 'Registro actualizado correctamente' 
            },
            { status: 200 }
          );
    }

    const listNumberId = generateUUID();

    // Insert listnumber
    await connection.execute(`
      INSERT INTO listnumber (
        id, port, iccid, imei, imsi, sn, status, st_status, active_status, slot_active_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?)
    `, [listNumberId, port, iccid, imei, imsi, sn, status, st, active, slot_active]);

    // Fetch the created record
    const [result] = await connection.execute(`
      SELECT * FROM listnumber WHERE id = ?
    `, [listNumberId]);

    return NextResponse.json({
      success: true,
      data: (result as RowDataPacket[])[0],
      message: 'ListNumber created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating listnumber:', error);
    
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate entry detected' 
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create listnumber',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}