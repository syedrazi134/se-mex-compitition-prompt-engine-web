'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ListingDetailData } from './types.js';

export interface CartItem {
  id: string; // unique item id: `${listingId}-${license}`
  listingId: string;
  title: string;
  coverImage: string;
  creatorHandle: string;
  creatorName: string;
  license: 'personal' | 'commercial' | 'extended';
  priceMinor: number;
  currency: 'USD';
}

export interface PlacedOrder {
  orderId: string;
  items: CartItem[];
  totalMinor: number;
  currency: 'USD';
  paymentMethod: 'JazzCash' | 'Easypaisa' | 'Debit/Credit Card' | 'International Card';
  paidPkr: number;
  email: string;
  date: string;
  status: 'paid' | 'failed';
}

interface CartContextType {
  items: CartItem[];
  addItem: (listing: ListingDetailData, license?: 'personal' | 'commercial' | 'extended') => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  promoCode: string | null;
  promoDiscountPercent: number;
  applyPromo: (code: string) => boolean;
  removePromo: () => void;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  totalPKR: number;
  credits: number;
  useCredits: (amount: number) => boolean;
  orders: PlacedOrder[];
  recordOrder: (order: PlacedOrder) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const USD_TO_PKR_RATE = 280;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>('LAUNCH10');
  const [promoDiscountPercent, setPromoDiscountPercent] = useState<number>(10);
  const [credits, setCredits] = useState<number>(1240);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('pe_cart_items');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      } else {
        // Pre-populate with design mock defaults so Cart/Checkout page opens with 3 prompts as shown in design!
        setItems([
          {
            id: 'golden-hour-street-portrait-personal',
            listingId: 'golden-hour-street-portrait',
            title: 'Golden Hour Street Portrait – 12 variations',
            coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            creatorHandle: '@lensbyayesha',
            creatorName: 'Ayesha Siddiqui',
            license: 'personal',
            priceMinor: 699,
            currency: 'USD',
          },
          {
            id: 'soft-clay-product-shots-commercial',
            listingId: 'soft-clay-product-shots',
            title: 'Soft Clay Product Shots',
            coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
            creatorHandle: '@studiotalha',
            creatorName: 'Talha Rauf',
            license: 'commercial',
            priceMinor: 1999,
            currency: 'USD',
          },
          {
            id: 'neon-rain-cinematic-personal',
            listingId: 'neon-rain-cinematic',
            title: 'Neon Rain Cinematic Close-ups',
            coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
            creatorHandle: '@hamza.frames',
            creatorName: 'Hamza Malik',
            license: 'personal',
            priceMinor: 499,
            currency: 'USD',
          },
        ]);
      }

      const savedCredits = localStorage.getItem('pe_credits');
      if (savedCredits) setCredits(Number(savedCredits));

      const savedOrders = localStorage.getItem('pe_orders');
      if (savedOrders) setOrders(JSON.parse(savedOrders));
    } catch {
      // Fallback gracefully
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem('pe_cart_items', JSON.stringify(items));
      localStorage.setItem('pe_credits', credits.toString());
      localStorage.setItem('pe_orders', JSON.stringify(orders));
    } catch {
      // Ignore storage errors
    }
  }, [items, credits, orders, mounted]);

  const addItem = (listing: ListingDetailData, license: 'personal' | 'commercial' | 'extended' = 'personal') => {
    const selectedLicense = listing.licenses.find((l) => l.type === license) ?? listing.licenses[0];
    const priceMinor = selectedLicense?.priceMinor ?? listing.priceMinor;
    const itemId = `${listing.id}-${license}`;

    setItems((prev) => {
      const exists = prev.find((item) => item.id === itemId);
      if (exists) return prev;
      return [
        ...prev,
        {
          id: itemId,
          listingId: listing.id,
          title: listing.title,
          coverImage: listing.coverImage,
          creatorHandle: `@${listing.creator.handle}`,
          creatorName: listing.creator.displayName,
          license,
          priceMinor,
          currency: 'USD',
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const applyPromo = (code: string): boolean => {
    const clean = code.trim().toUpperCase();
    if (clean === 'LAUNCH10') {
      setPromoCode('LAUNCH10');
      setPromoDiscountPercent(10);
      return true;
    }
    if (clean === 'SAVE20') {
      setPromoCode('SAVE20');
      setPromoDiscountPercent(20);
      return true;
    }
    return false;
  };

  const removePromo = () => {
    setPromoCode(null);
    setPromoDiscountPercent(0);
  };

  const subtotalMinor = items.reduce((sum, item) => sum + item.priceMinor, 0);
  const discountMinor = promoCode ? Math.round((subtotalMinor * promoDiscountPercent) / 100) : 0;
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const totalPKR = Math.round((totalMinor / 100) * USD_TO_PKR_RATE);

  const useCredits = (amount: number): boolean => {
    if (credits < amount) return false;
    setCredits((prev) => prev - amount);
    return true;
  };

  const recordOrder = (order: PlacedOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        promoCode,
        promoDiscountPercent,
        applyPromo,
        removePromo,
        subtotalMinor,
        discountMinor,
        totalMinor,
        totalPKR,
        credits,
        useCredits,
        orders,
        recordOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

