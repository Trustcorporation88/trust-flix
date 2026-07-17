import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, requireAuth } from '@/lib/auth/requireAuth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (isAuthError(auth)) return auth;

  try {
    return NextResponse.json({
      success: true,
      data: {
        followerCount: 0,
        profileViews: 0,
        reach: 0,
        impressions: 0,
        topPosts: [],
        dailyFollowerGrowth: [],
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch insights' }, { status: 500 });
  }
}
