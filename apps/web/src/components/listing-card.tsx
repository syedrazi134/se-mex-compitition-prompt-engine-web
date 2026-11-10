'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Icon } from './icon';
import type { ListingCardData } from '@/lib/types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(minor: number): string {
  return money.format(minor / 100);
}

export function ListingCard({
  listing,
  preload = false,
}: Readonly<{ listing: ListingCardData; preload?: boolean }>) {
  const [saved, setSaved] = useState(listing.saved ?? false);
  return (
    <article className="listing-card">
      <Link
        aria-label={`View ${listing.title}`}
        className="listing-image-link"
        href={`/listing/${listing.id}`}
      >
        <div className="listing-image-wrap">
          <Image
            alt=""
            className="listing-image"
            fill
            preload={preload}
            sizes="(max-width: 760px) 50vw, (max-width: 1020px) 33vw, 25vw"
            src={listing.coverImage}
            unoptimized
          />
          {listing.badge && (
            <span className={`badge badge-${listing.badge.toLowerCase()}`}>{listing.badge}</span>
          )}
          {listing.category === 'video' && (
            <span className="video-indicator">
              <Icon name="play" size={14} /> Preview
            </span>
          )}
        </div>
      </Link>
      <button
        aria-label={saved ? 'Remove from saved prompts' : 'Save prompt'}
        aria-pressed={saved}
        className={`save-button ${saved ? 'is-saved' : ''}`}
        onClick={() => setSaved(!saved)}
        type="button"
      >
        <Icon name="heart" size={17} />
      </button>
      <div className="listing-card-body">
        <div className="listing-card-title-row">
          <Link className="listing-title" href={`/listing/${listing.id}`}>
            {listing.title}
          </Link>
          <span className="listing-price">{formatPrice(listing.priceMinor)}</span>
        </div>
        <Link className="creator-inline" href={`/creators/${listing.creator.handle}`}>
          <Image
            alt=""
            className="creator-avatar"
            height={22}
            src={listing.creator.avatarUrl}
            unoptimized
            width={22}
          />
          <span>@{listing.creator.handle}</span>
          {listing.creator.verified && (
            <span className="verified-mark" title="Verified creator">
              <Icon name="check" size={10} />
            </span>
          )}
        </Link>
        <div className="listing-meta">
          <span className="rating">
            <span aria-hidden="true">★</span> {listing.rating.toFixed(1)}{' '}
            <span className="review-count">({listing.reviewCount})</span>
          </span>
          <span className="tool-list">
            {listing.tools.slice(0, 3).map((tool) => (
              <span key={tool}>{toolTag(tool)}</span>
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}

function toolTag(tool: string): string {
  const short: Record<string, string> = {
    Midjourney: 'MJ',
    Flux: 'FX',
    Runway: 'RW',
    'Stable Diffusion': 'SD',
    'DALL·E': 'DE',
    Kling: 'KL',
    Luma: 'LU',
  };
  return short[tool] ?? tool.slice(0, 2).toUpperCase();
}
