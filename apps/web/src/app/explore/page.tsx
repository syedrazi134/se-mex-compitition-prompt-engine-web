'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/icon';
import { ListingCard } from '@/components/listing-card';
import { getListings } from '@/lib/api';
import type { ListingCardData } from '@/lib/types';

const categories = ['all', 'image', 'video', 'text'] as const;
const sorts = ['Trending', 'Newest', 'Top rated', 'Price low to high'];

function ExploreContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [category, setCategory] = useState<(typeof categories)[number]>(
    categories.includes(searchParams.get('category') as (typeof categories)[number])
      ? (searchParams.get('category') as (typeof categories)[number])
      : 'all',
  );
  const [sort, setSort] = useState('Trending');
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getListings({ query, category, sort, limit: 24 });
      setListings(result.items);
      setTotal(result.total ?? result.items.length);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search could not be completed.');
    } finally {
      setLoading(false);
    }
  }, [category, query, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">Marketplace</p><h1>{query ? <>Search results for <span className="query-title">“{query}”</span></> : 'Explore prompts'}</h1><p>Discover proven prompts from creators around the world.</p></div>
        <a className="button button-outline button-small" href="/creator/dashboard"><Icon name="sparkle" size={15} /> Start selling</a>
      </div>
      <div className="explore-toolbar">
        <div className="filter-chips" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={`filter-chip ${category === item ? 'active' : ''}`}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item === 'all' ? 'All prompts' : `${item[0]?.toUpperCase()}${item.slice(1)}`}
            </button>
          ))}
        </div>
        <label className="sort-label">Sort by <select className="sort-select" onChange={(event) => setSort(event.target.value)} value={sort}>
          {sorts.map((option) => <option key={option}>{option}</option>)}
        </select></label>
      </div>
      <p className="results-count">{loading ? 'Searching prompts…' : `${total.toLocaleString()} prompts`}</p>
      {error ? (
        <div className="error-state"><span className="state-icon"><Icon name="clock" size={22} /></span><h2>Search is unavailable</h2><p>{error}</p><button className="button button-outline button-small" onClick={() => void load()} type="button">Try again</button></div>
      ) : loading ? (
        <div className="listing-grid">{Array.from({ length: 8 }, (_, index) => <div className="skeleton-card" key={index}><div /><span /><span /></div>)}</div>
      ) : listings.length ? (
        <div className="listing-grid">{listings.map((listing, index) => <ListingCard key={listing.id} listing={listing} preload={index === 0} />)}</div>
      ) : (
        <div className="empty-state"><span className="state-icon"><Icon name="search" size={22} /></span><h2>No prompts match these filters</h2><p>Try another search or clear the category filter.</p><button className="button button-small" onClick={() => setCategory('all')} type="button">Clear filters</button></div>
      )}
    </>
  );
}

export default function ExplorePage() {
  return <Suspense fallback={<div className="page-loading"><span className="spinner" /> Loading marketplace…</div>}><ExploreContent /></Suspense>;
}
