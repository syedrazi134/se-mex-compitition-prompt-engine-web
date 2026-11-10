import type { ListingCardData } from './types';

export interface CartItem {
  listing: ListingCardData;
  license: string;
  priceMinor: number;
}

const CART_KEY = 'prompt-engine-cart';

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = window.localStorage.getItem(CART_KEY);
    return value ? (JSON.parse(value) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('prompt-engine-cart-change'));
}

export function addToCart(listing: ListingCardData, license: string, priceMinor: number): void {
  const cart = readCart();
  const existing = cart.findIndex((item) => item.listing.id === listing.id);
  const next = [...cart];
  const item = { listing, license, priceMinor };
  if (existing === -1) next.push(item);
  else next[existing] = item;
  writeCart(next);
}
