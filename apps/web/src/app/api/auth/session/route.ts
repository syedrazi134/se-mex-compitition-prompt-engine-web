import { NextResponse, type NextRequest } from 'next/server';

interface AuthPayload {
  action?: string;
  email?: string;
  password?: string;
  name?: string;
}

interface TokenResponse {
  accessToken?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user?: unknown;
  error?: unknown;
}

const API_BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000/api/v1'
).replace(/\/+$/, '');
const REFRESH_COOKIE = 'prompt_engine_refresh';

export async function POST(request: NextRequest) {
  let input: AuthPayload;
  try {
    input = (await request.json()) as AuthPayload;
  } catch {
    return NextResponse.json({ error: { code: 'invalid_request', message: 'Invalid request body.' } }, { status: 400 });
  }

  const action = input.action;
  if (!action || !['login', 'register', 'refresh', 'logout'].includes(action)) {
    return NextResponse.json(
      { error: { code: 'invalid_action', message: 'Choose a supported authentication action.' } },
      { status: 400 },
    );
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if ((action === 'refresh' || action === 'logout') && !refreshToken) {
    if (action === 'logout') {
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Your session has expired. Sign in again.' } },
      { status: 401 },
    );
  }

  const body =
    action === 'refresh' || action === 'logout'
      ? { refreshToken }
      : { email: input.email, password: input.password, ...(input.name ? { name: input.name } : {}) };

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'api_unavailable', message: 'Could not reach the Prompt Engine API.' } },
      { status: 503 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as TokenResponse | null;
  if (!upstream.ok) {
    const response = NextResponse.json(payload ?? { error: { code: 'api_error', message: 'Authentication failed.' } }, {
      status: upstream.status,
    });
    if (action === 'logout' || upstream.status === 401) response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  const responseBody = { ...payload };
  delete responseBody.refreshToken;
  const response = NextResponse.json(responseBody);
  if (action === 'logout') {
    response.cookies.delete(REFRESH_COOKIE);
  } else if (payload?.refreshToken) {
    const expires = payload.refreshTokenExpiresAt ? new Date(payload.refreshTokenExpiresAt) : undefined;
    response.cookies.set(REFRESH_COOKIE, payload.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/session',
      ...(expires && !Number.isNaN(expires.getTime()) ? { expires } : { maxAge: 60 * 60 * 24 * 30 }),
    });
  }
  return response;
}
