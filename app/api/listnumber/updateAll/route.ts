import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// PUT - Update a listnumber
export async function PUT(request: NextRequest) {
    const connection = await connectToDatabase();
    
    try {
      // Update all records in listnumber table
      await connection.execute(`
        UPDATE listnumber 
        SET active_status = 0, updated_at = NOW()
      `);
  
      // Get count of updated records
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as totalUpdated FROM listnumber WHERE active_status = 0
      `);
      const totalUpdated = (countResult as RowDataPacket[])[0].totalUpdated;
  
      return NextResponse.json({
        success: true,
        data: { totalUpdated },
        message: `All ${totalUpdated} records updated successfully with active_status = 0`
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