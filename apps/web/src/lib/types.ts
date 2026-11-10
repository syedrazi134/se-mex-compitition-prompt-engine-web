type ListingCategory = 'image' | 'video' | 'text';

export interface CreatorSummary {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
  followers?: number;
}

export interface CreatorStorefrontData {
  creator: CreatorSummary;
  coverImage: string;
  bio: string;
  socialLinks: Array<{ platform: 'Instagram' | 'TikTok' | 'YouTube'; url: string }>;
  listings: ListingCardData[];
  bundle: { title: string; promptCount: number; priceMinor: number; savingsPercent: number };
  subscriptionPriceMinor: number | null;
}

export interface ListingCardData {
  id: string;
  title: string;
  category: ListingCategory;
  coverImage: string;
  priceMinor: number;
  currency: 'USD';
  rating: number;
  reviewCount: number;
  creator: CreatorSummary;
  tools: string[];
  badge?: 'Bestseller' | 'New' | 'Trending';
  sampleCount: number;
  saved?: boolean;
}

export interface ListingDetailData extends ListingCardData {
  description: string;
  gallery: Array<{ imageUrl: string; tool: string; kind: 'image' | 'video' }>;
  licenses: Array<{ type: 'personal' | 'commercial' | 'extended'; priceMinor: number; currency: 'USD' }>;
  lockedPreview: Array<{ label: string; placeholder: string }>;
  included: string[];
  reviews: Array<{
    id: string;
    name: string;
    avatarUrl: string;
    rating: number;
    text: string;
    date: string;
    verifiedBuyer: boolean;
  }>;
}

export interface LibraryItem {
  id: string;
  listingId: string;
  promptId: string;
  title: string;
  category: ListingCategory;
  coverImage: string;
  creator: CreatorSummary;
  purchasedAt: string;
  license: string;
  version: string;
  promptFields: Array<{ label: string; value: string }>;
  variables: string[];
  tools: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export interface CreatorDashboardData {
  views: number;
  conversionRate: number;
  sales: number;
  earningsMinor: number;
  currency: 'USD';
  followers: number;
  earningsSeries: number[];
  topListings: Array<{
    id: string;
    title: string;
    image: string;
    views: number;
    sales: number;
    revenueMinor: number;
    rating: number;
    status: 'Live' | 'In review' | 'Draft' | 'Rejected';
  }>;
  traffic: Array<{ source: string; percent: number }>;
}
