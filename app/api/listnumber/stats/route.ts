import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// GET - Get listnumber statistics
export async function GET(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    // Get total count
    const [totalResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM listnumber
    `);
    const totalRecords = (totalResult as RowDataPacket[])[0].total;

    // Get status distribution
    const [statusDistribution] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM listnumber 
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get batch distribution
    const [batchDistribution] = await connection.execute(`
      SELECT batch_id, COUNT(*) as count 
      FROM listnumber 
      GROUP BY batch_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get user distribution
    const [userDistribution] = await connection.execute(`
      SELECT users_id, COUNT(*) as count 
      FROM listnumber 
      GROUP BY users_id
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get recent activity (last 7 days)
    const [recentActivity] = await connection.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM listnumber 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get port distribution
    const [portDistribution] = await connection.execute(`
      SELECT port, COUNT(*) as count 
      FROM listnumber 
      GROUP BY port
      ORDER BY count DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalRecords,
        distributions: {
          status: statusDistribution,
          batch: batchDistribution,
          user: userDistribution,
          port: portDistribution
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching listnumber stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}