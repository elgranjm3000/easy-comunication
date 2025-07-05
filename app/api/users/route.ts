import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getAllUsers } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No authentication token found' 
        },
        { status: 401 }
      );
    }

    // Verify token
    const tokenData = verifyToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (tokenData.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access denied. Admin role required.' 
        },
        { status: 403 }
      );
    }

    // Get all users
    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}