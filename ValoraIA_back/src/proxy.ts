import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ingest-secret, x-org-id',
  'Access-Control-Max-Age': '86400',
}

// Next.js 16: middleware is called Proxy. Handles CORS preflight for the API
// before any route handler runs (route handlers without an OPTIONS export
// would otherwise answer 405 and the browser blocks the request).
export function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
  }
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}