'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/icon';
import { ListingCard } from '@/components/listing-card';
import { getFeaturedCreators, getListings, isDemoMode } from '@/lib/api';
import type { CreatorSummary, ListingCardData } from '@/lib/types';

const categoryData = [
  { title: 'Portraits', count: '3,210 prompts', icon: 'user' as const, query: 'portrait' },
  { title: 'Product shots', count: '1,480 prompts', icon: 'image' as const, query: 'product' },
  { title: 'Cinematic video', count: '960 prompts', icon: 'video' as const, query: 'video' },
  { title: 'Anime & illustration', count: '2,045 prompts', icon: 'sparkle' as const, query: 'anime' },
  { title: 'Architecture', count: '720 prompts', icon: 'grid' as const, query: 'architecture' },
  { title: 'Fashion', count: '1,130 prompts', icon: 'sparkle' as const, query: 'fashion' },
  { title: 'Food & drink', count: '540 prompts', icon: 'image' as const, query: 'food' },
  { title: 'Text & copywriting', count: '2,310 prompts', icon: 'list' as const, query: 'text' },
];

export default function HomePage() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listingPage, featuredCreators] = await Promise.all([
        getListings({ category, limit: 8 }),
        getFeaturedCreators(),
      ]);
      setListings(listingPage.items);
      setCreators(featuredCreators);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the marketplace.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void load();
  }, [load]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = query.trim();
    router.push(text ? `/explore?q=${encodeURIComponent(text)}` : '/explore');
  };

  return (
    <div className="home-page">
      {isDemoMode() && <div className="demo-ribbon">Design preview · sample content</div>}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><Icon name="sparkle" size={14} /> 12,400 prompts from 1,900 creators</p>
          <h1>Find the prompt<br />behind <em>the picture.</em></h1>
          <p className="hero-description">
            Preview real outputs, buy once, and generate in your own AI tool with one click.
          </p>
          <form className="hero-search" onSubmit={search} role="search">
            <Icon name="search" size={19} />
            <input
              aria-label="Search marketplace"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “cinematic portrait” or “product on clay”"
              value={query}
            />
            <button className="button button-small" type="submit">Search</button>
          </form>
          <div className="hero-suggestions">
            {['Image', 'Video', 'Text', 'Midjourney-style', 'Cinematic', 'Product shots', 'Anime-style', 'Portraits'].map((item) => (
              <Link className="suggestion-chip" href={`/explore?q=${encodeURIComponent(item)}`} key={item}>{item}</Link>
            ))}
          </div>
          <div className="hero-stats">
            <span className="hero-stat"><strong>12.4k</strong> tested prompts</span>
            <span className="hero-stat"><strong>1.9k</strong> verified creators</span>
            <span className="hero-stat"><strong>4.9/5</strong> buyer rating</span>
          </div>
        </div>
        <div aria-hidden="true" className="hero-art">
          <div className="hero-art-orb" />
          <div className="hero-art-image">
            <Image alt="" fill priority sizes="220px" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=88" unoptimized />
          </div>
          <div className="hero-float-card">
            <div className="hero-float-avatar"><Image alt="" height={38} src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=85" unoptimized width={38} /></div>
            <div><strong>Golden Hour Portraits</strong><span>@lensbyayesha · ★ 4.9</span></div>
            <span className="hero-float-price">$6.99</span>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="trending-title">
        <div className="section-heading">
          <div><p className="eyebrow">Loved by creators</p><h2 id="trending-title">Trending this week</h2><p className="section-subtitle">Most bought across Pakistan and worldwide, last 7 days</p></div>
          <div className="segmented-tabs" aria-label="Trending category">
            {['All', 'Image', 'Video'].map((item) => (
              <button
                aria-pressed={(item.toLowerCase() === category) || (item === 'All' && category === 'all')}
                className={(item.toLowerCase() === category) || (item === 'All' && category === 'all') ? 'selected' : ''}
                key={item}
                onClick={() => setCategory(item.toLowerCase())}
                type="button"
              >{item}</button>
            ))}
          </div>
          <Link className="text-link" href="/explore">See all <Icon name="arrow" size={16} /></Link>
        </div>
        {error ? (
          <div className="error-state">
            <span className="state-icon"><Icon name="clock" size={22} /></span>
            <h2>Marketplace didn’t load</h2><p>{error}</p>
            <button className="button button-outline button-small" onClick={() => void load()} type="button">Try again</button>
          </div>
        ) : loading ? (
          <div className="listing-grid" aria-label="Loading prompts">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={index}><div /><span /><span /></div>)}</div>
        ) : listings.length ? (
          <div className="listing-grid">{listings.slice(0, 8).map((listing, index) => <ListingCard key={listing.id} listing={listing} preload={index === 0} />)}</div>
        ) : (
          <div className="empty-state"><span className="state-icon"><Icon name="search" size={22} /></span><h2>No prompts in this category yet</h2><p>Try another category or explore all prompts.</p><Link className="button button-small" href="/explore">Explore prompts</Link></div>
        )}
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Your feed</p><h2>New from creators you follow</h2><p className="section-subtitle">Fresh ideas from the people you love</p></div>
          <Link className="text-link" href="/explore">Following feed <Icon name="arrow" size={16} /></Link>
        </div>
        {!error && <div className="listing-grid">{listings.slice(4, 8).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>}
      </section>

      <section className="section">
        <div className="feature-banner">
          <div className="feature-banner-content">
            <p className="eyebrow">Featured collection</p>
            <h3>Monsoon Moods</h3>
            <p>24 rain-soaked portrait and street prompts from 9 creators.</p>
            <Link className="button button-cream button-small" href="/explore?q=monsoon">Explore collection <Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Made by people, for people</p><h2>Meet the top creators</h2><p className="section-subtitle">Original ideas from artists around the world</p></div>
          <Link className="text-link" href="/explore">All creators <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="creator-strip">
          {creators.slice(0, 6).map((creator) => (
            <Link className="creator-tile" href={`/creators/${creator.handle}`} key={creator.id}>
              <Image alt="" height={42} src={creator.avatarUrl} unoptimized width={42} />
              <div><strong>{creator.displayName}</strong><span>@{creator.handle} · {creator.followers ? `${(creator.followers / 1000).toFixed(1)}k` : 'Creator'}</span></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div><p className="eyebrow">Explore your next idea</p><h2>Browse by category</h2></div>
          <Link className="text-link" href="/explore">Browse all <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="category-row">
          {categoryData.map((item) => (
            <Link className="category-tile" href={`/explore?q=${encodeURIComponent(item.query)}`} key={item.title}>
              <span className="category-icon"><Icon name={item.icon} size={17} /></span>
              <strong>{item.title}</strong>
              <span>{item.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
