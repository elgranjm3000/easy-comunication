import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import { RowDataPacket } from 'mysql2';

// GET - Fetch dashboard metrics
export async function GET(request: NextRequest) {
  const connection = await connectToDatabase();
  
  try {
    // Get total numbers
    const [totalResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM numbers
    `);
    const totalNumbers = (totalResult as RowDataPacket[])[0].total;

    // Get completed numbers
    const [completedResult] = await connection.execute(`
      SELECT COUNT(*) as completed FROM numbers WHERE status = 'completed'
    `);
    const completedNumbers = (completedResult as RowDataPacket[])[0].completed;

    // Get pending numbers
    const [pendingResult] = await connection.execute(`
      SELECT COUNT(*) as pending FROM numbers WHERE status = 'pending'
    `);
    const pendingNumbers = (pendingResult as RowDataPacket[])[0].pending;

    // Get average processing time (in days)
    const [avgTimeResult] = await connection.execute(`
      SELECT 
        AVG(DATEDIFF(COALESCE(
          (SELECT MAX(timestamp) FROM timeline WHERE number_id = n.id AND stage = 'completed'),
          NOW()
        ), n.start_date)) as avg_time
      FROM numbers n
      WHERE n.status = 'completed'
    `);
    const avgProcessingTime = Math.round((avgTimeResult as RowDataPacket[])[0].avg_time || 0);

    // Get status distribution
    const [statusDistribution] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM numbers 
      GROUP BY status
    `);

    // Get priority distribution
    const [priorityDistribution] = await connection.execute(`
      SELECT priority, COUNT(*) as count 
      FROM numbers 
      GROUP BY priority
    `);

    // Get stage distribution
    const [stageDistribution] = await connection.execute(`
      SELECT process_stage, COUNT(*) as count 
      FROM numbers 
      GROUP BY process_stage
    `);

    // Get recent activity (last 7 days)
    const [recentActivity] = await connection.execute(`
      SELECT 
        DATE(last_updated) as date,
        COUNT(*) as count
      FROM numbers 
      WHERE last_updated >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(last_updated)
      ORDER BY date DESC
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalNumbers,
        completedNumbers,
        pendingNumbers,
        avgProcessingTime,
        distributions: {
          status: statusDistribution,
          priority: priorityDistribution,
          stage: stageDistribution
        },
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}