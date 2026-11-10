import {
  demoCreatorStorefront,
  demoCreators,
  demoDashboard,
  demoLibrary,
  demoListings,
  demoListingDetail,
} from './demo-data';
import type {
  AuthSession,
  CreatorDashboardData,
  CreatorStorefrontData,
  LibraryItem,
  ListingCardData,
  ListingDetailData,
} from './types';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(
  /\/$/,
  '',
);
let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrap<T>(value: unknown): T {
  if (isRecord(value) && Object.hasOwn(value, 'data')) {
    return value.data as T;
  }
  return value as T;
}

function extractItems<T>(value: unknown, label: string): T[] {
  const data = unwrap<unknown>(value);
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray(data.items)) return data.items as T[];
  throw new ApiError(`The API returned an invalid ${label} response.`, 502, 'INVALID_RESPONSE');
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  try {
    return await response.json();
  } catch {
    throw new ApiError('The API returned an unreadable response.', 502, 'INVALID_RESPONSE');
  }
}

function responseError(payload: unknown, status: number): ApiError {
  const root = isRecord(payload) ? payload : {};
  const error = isRecord(root.error) ? root.error : root;
  const message =
    typeof error.message === 'string' ? error.message : `The request failed (${status}).`;
  const code = typeof error.code === 'string' ? error.code : undefined;
  return new ApiError(message, status, code);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Could not reach the Prompt Engine API.', 0, 'NETWORK_ERROR');
  }

  const payload = await readJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  return unwrap<T>(payload);
}

function demoListingPage(
  query: string,
  category: string,
  sort: string,
  limit: number,
): { items: ListingCardData[]; total: number } {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = demoListings.filter((listing) => {
    const matchesQuery =
      !normalizedQuery ||
      `${listing.title} ${listing.creator.displayName} ${listing.creator.handle} ${listing.tools.join(' ')}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesQuery && (category === 'all' || listing.category === category);
  });
  const sorted = [...filtered];

  if (sort === 'Newest') sorted.reverse();
  if (sort === 'Top rated') sorted.sort((a, b) => b.rating - a.rating);
  if (sort === 'Price low to high') sorted.sort((a, b) => a.priceMinor - b.priceMinor);

  return { items: sorted.slice(0, limit), total: sorted.length };
}

export async function getListings(
  options: {
    query?: string;
    category?: string;
    sort?: string;
    limit?: number;
  } = {},
): Promise<{ items: ListingCardData[]; total: number }> {
  const { query = '', category = 'all', sort = 'Trending', limit = 24 } = options;
  if (isDemoMode()) return demoListingPage(query, category, sort, limit);

  const params = new URLSearchParams({ limit: String(limit) });
  if (query.trim()) params.set('q', query.trim());
  if (category !== 'all') params.set('category', category);
  if (sort !== 'Trending') {
    params.set(
      'sort',
      sort === 'Top rated'
        ? 'top-rated'
        : sort === 'Price low to high'
          ? 'price-low-to-high'
          : sort.toLowerCase(),
    );
  }

  const result = await request<unknown>(`/listings?${params.toString()}`);
  const data = unwrap<unknown>(result);
  if (Array.isArray(data)) return { items: data as ListingCardData[], total: data.length };
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new ApiError('The API returned an invalid listings response.', 502, 'INVALID_RESPONSE');
  }
  return {
    items: data.items as ListingCardData[],
    total: typeof data.total === 'number' ? data.total : data.items.length,
  };
}

export async function getFeaturedCreators(): Promise<CreatorStorefrontData['creator'][]> {
  if (isDemoMode()) return demoCreators;
  return extractItems(await request<unknown>('/creators/featured'), 'featured creators');
}

export async function getCreatorStorefront(handle: string): Promise<CreatorStorefrontData> {
  if (isDemoMode()) {
    const creator = demoCreators.find((item) => item.handle === handle);
    if (!creator)
      throw new ApiError('This sample creator shop is not available.', 404, 'NOT_FOUND');
    return {
      ...demoCreatorStorefront,
      creator,
      listings: demoListings.filter((listing) => listing.creator.id === creator.id),
    };
  }
  return request<CreatorStorefrontData>(`/creators/${encodeURIComponent(handle)}`);
}

function demoDetailFor(id: string): ListingDetailData {
  const listing = demoListings.find((item) => item.id === id);
  if (!listing) throw new ApiError('This sample listing is not available.', 404, 'NOT_FOUND');
  if (listing.id === demoListingDetail.id) return demoListingDetail;
  return {
    ...listing,
    description: `Explore ${listing.sampleCount} tested variations for ${listing.title}.`,
    gallery: demoListingDetail.gallery.slice(0, 3),
    licenses: demoListingDetail.licenses.map((license) => ({
      ...license,
      priceMinor: Math.round(
        (listing.priceMinor * license.priceMinor) / demoListingDetail.priceMinor,
      ),
    })),
    lockedPreview: demoListingDetail.lockedPreview,
    included: demoListingDetail.included,
    reviews: demoListingDetail.reviews,
  };
}

export async function getListing(id: string): Promise<ListingDetailData> {
  if (isDemoMode()) return demoDetailFor(id);
  return request<ListingDetailData>(`/listings/${encodeURIComponent(id)}`);
}

export async function getLibrary(): Promise<LibraryItem[]> {
  if (isDemoMode()) return demoLibrary;
  return extractItems(await request<unknown>('/entitlements'), 'library');
}

export async function startGeneration(input: {
  promptId: string;
  tool: string;
  variables: Record<string, string>;
  settings: Record<string, unknown>;
}): Promise<{ id: string; status: string }> {
  if (isDemoMode()) {
    throw new ApiError(
      'Generation is unavailable in design preview mode.',
      501,
      'PREVIEW_UNAVAILABLE',
    );
  }
  return request<{ id: string; status: string }>('/generations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getCreatorDashboard(): Promise<CreatorDashboardData> {
  if (isDemoMode()) return demoDashboard;
  return request<CreatorDashboardData>('/creator/stats');
}

export async function createCreatorProfile(input: {
  handle: string;
  displayName: string;
  bio: string;
  agreementAccepted: true;
}): Promise<{ handle: string; status: string }> {
  if (isDemoMode()) {
    throw new ApiError(
      'Creator profiles are not submitted in design preview mode.',
      501,
      'PREVIEW_UNAVAILABLE',
    );
  }
  return request<{ handle: string; status: string }>('/creator/profile', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createListing(input: {
  title: string;
  category: 'image' | 'video' | 'text';
  description: string;
  priceMinor: number;
  currency: 'USD';
  tools: string[];
  tags: string[];
}): Promise<{ id: string; title: string }> {
  if (isDemoMode()) {
    throw new ApiError(
      'Listings are not saved in design preview mode.',
      501,
      'PREVIEW_UNAVAILABLE',
    );
  }
  const result = await request<unknown>('/creator/listings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = unwrap<unknown>(result);
  const listing = isRecord(data) && isRecord(data.listing) ? data.listing : data;
  if (!isRecord(listing) || typeof listing.title !== 'string') {
    throw new ApiError(
      'The API returned an invalid listing draft response.',
      502,
      'INVALID_RESPONSE',
    );
  }
  return { id: typeof listing.id === 'string' ? listing.id : '', title: listing.title };
}

export async function startCheckout(
  items: Array<{ listingId: string; license: string }>,
  paymentMethod: string,
  promoCode?: string,
): Promise<{ checkoutUrl: string }> {
  if (isDemoMode()) {
    return { checkoutUrl: `${window.location.origin}/checkout?status=demo` };
  }

  const result = await request<{ checkoutUrl: string }>('/checkout', {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ items, paymentMethod, ...(promoCode ? { promoCode } : {}) }),
  });
  if (typeof result.checkoutUrl !== 'string') {
    throw new ApiError('The API did not return a checkout URL.', 502, 'INVALID_RESPONSE');
  }
  const checkoutUrl = new URL(result.checkoutUrl, window.location.origin);
  if (checkoutUrl.protocol !== 'https:' && checkoutUrl.origin !== window.location.origin) {
    throw new ApiError('The API returned an unsafe checkout URL.', 502, 'INVALID_RESPONSE');
  }
  return { checkoutUrl: checkoutUrl.toString() };
}

async function submitAuth(
  action: 'login' | 'register',
  input: {
    email: string;
    password: string;
    name?: string;
  },
): Promise<AuthSession> {
  if (isDemoMode()) {
    throw new ApiError(
      'Account sign-in is unavailable in design preview mode.',
      501,
      'PREVIEW_UNAVAILABLE',
    );
  }
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...input }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  return unwrap<AuthSession>(payload);
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  return submitAuth('login', { email, password });
}

export async function signUp(email: string, password: string, name: string): Promise<AuthSession> {
  return submitAuth('register', { email, password, name });
}

export async function signOut(): Promise<void> {
  if (isDemoMode()) {
    setAccessToken(null);
    return;
  }
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action: 'logout' }),
  });
  const payload = await readJson(response);
  if (!response.ok) throw responseError(payload, response.status);
  setAccessToken(null);
}
