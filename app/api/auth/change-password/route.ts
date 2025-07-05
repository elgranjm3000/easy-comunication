import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, changePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validation
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Current password and new password are required' 
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'New password must be at least 6 characters long' 
        },
        { status: 400 }
      );
    }

    // Change password
    const success = await changePassword(tokenData.id, currentPassword, newPassword);

    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Current password is incorrect' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}