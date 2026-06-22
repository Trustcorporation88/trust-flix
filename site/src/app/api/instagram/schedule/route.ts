import { NextRequest, NextResponse } from 'next/server';

interface SchedulePostRequest {
  caption: string;
  imageUrl: string;
  scheduledFor: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        posts: [],
        stats: {
          followers: 12500,
          following: 523,
          posts: 156,
          engagement: 8.2,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body: SchedulePostRequest = await request.json();

    if (!body.caption || !body.imageUrl || !body.scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: Math.random().toString(36).substr(2, 9),
        scheduledFor: body.scheduledFor,
        status: 'scheduled',
      },
      message: 'Post agendado com sucesso!',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
}


