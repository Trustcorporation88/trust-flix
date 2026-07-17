import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

interface SchedulePostRequest {
  caption: string;
  imageUrl: string;
  scheduledFor: string;
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    return NextResponse.json({
      success: true,
      data: {
        posts: [],
        stats: {
          followers: 0,
          following: 0,
          posts: 0,
          engagement: 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    const body: SchedulePostRequest = await request.json();

    if (!body.caption || !body.imageUrl || !body.scheduledFor) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        scheduledFor: body.scheduledFor,
        status: 'scheduled',
      },
      message: 'Post agendado com sucesso!',
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to schedule post' }, { status: 500 });
  }
}
