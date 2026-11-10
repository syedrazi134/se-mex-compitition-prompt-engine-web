'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { ListingCard, formatPrice } from '@/components/listing-card';
import { getCreatorStorefront } from '@/lib/api';
import { isLive } from '@/lib/features';
import type { CreatorStorefrontData } from '@/lib/types';

type StoreTab = 'Prompts' | 'Bundles' | 'Subscription' | 'Reviews';
const tabs: StoreTab[] = ['Prompts', 'Bundles', 'Subscription', 'Reviews'];

export default function CreatorStorefrontPage() {
  const { handle } = useParams<{ handle: string }>();
  const [store, setStore] = useState<CreatorStorefrontData | null>(null);
  const [tab, setTab] = useState<StoreTab>('Prompts');
  const [following, setFollowing] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void getCreatorStorefront(handle)
      .then((result) => {
        if (active) setStore(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Creator storefront could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [handle]);

  const copyShopLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/creators/${handle}`);
      setMessage('Shop link copied.');
    } catch {
      setMessage('Clipboard access was denied by your browser.');
    }
  };

  const follow = () => {
    if (isLive('marketplace')) {
      setMessage('Following will be available when the social follow API is connected.');
      return;
    }
    setFollowing(!following);
  };

  if (loading) return <div className="page-loading"><span className="spinner" /> Loading creator shop…</div>;
  if (error || !store) {
    return <div className="error-state"><span className="state-icon"><Icon name="user" size={22} /></span><h2>Creator shop not found</h2><p>{error || 'This shop may have moved or is not available.'}</p><Link className="button button-small" href="/explore">Explore prompts</Link></div>;
  }

  return (
    <div className="storefront">
      <div className="storefront-cover"><Image alt="" fill preload sizes="100vw" src={store.coverImage} unoptimized /></div>
      <section className="storefront-profile">
        <div className="storefront-avatar"><Image alt={`${store.creator.displayName} profile`} fill sizes="112px" src={store.creator.avatarUrl} unoptimized /></div>
        <div className="storefront-profile-copy">
          <h1>{store.creator.displayName} {store.creator.verified && <span className="verified-mark" title="Verified creator"><Icon name="check" size={11} /></span>}</h1>
          <p>@{store.creator.handle} · {store.creator.followers ? `${(store.creator.followers / 1000).toFixed(1)}K followers` : 'Prompt creator'}</p>
        </div>
        <div className="storefront-actions">
          <button className="button button-outline button-small" onClick={follow} type="button">{following ? 'Following' : 'Follow'}</button>
          {store.subscriptionPriceMinor ? <button className="button button-small" disabled title="Subscriptions are not connected yet">Subscribe</button> : <button className="button button-outline button-small" disabled title="This creator has no subscription tier">Subscribe</button>}
        </div>
      </section>
      <div className="storefront-bio-row">
        <p className="storefront-bio">{store.bio}</p>
        <div className="storefront-socials">
          {store.socialLinks.filter((social) => {
            try {
              return new URL(social.url).protocol === 'https:';
            } catch {
              return false;
            }
          }).map((social) => <a href={social.url} key={social.platform} rel="noreferrer" target="_blank">{social.platform}<Icon name="external" size={12} /></a>)}
          <button className="copy-shop-link" onClick={() => void copyShopLink()} type="button"><Icon name="copy" size={13} />Copy shop link</button>
        </div>
      </div>
      {message && <p className="storefront-message" role="status">{message}</p>}
      <nav className="storefront-tabs" aria-label="Creator shop sections">
        {tabs.map((item) => <button aria-pressed={tab === item} className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}
      </nav>
      <div className="storefront-body">
        {tab === 'Prompts' && (
          <>
            <section className="storefront-bundle"><div><p className="eyebrow">Featured bundle</p><h2>{store.bundle.title}</h2><p>{store.bundle.promptCount} creator-selected prompts · save {store.bundle.savingsPercent}%</p></div><div className="storefront-bundle-price"><strong>{formatPrice(store.bundle.priceMinor)}</strong><span>one-time purchase</span></div><button className="button button-cream button-small" disabled title="Bundle checkout will be connected after the bundles API">View bundle <Icon name="arrow" size={14} /></button></section>
            <div className="listing-grid">{store.listings.map((listing, index) => <ListingCard key={listing.id} listing={listing} preload={index === 0} />)}</div>
          </>
        )}
        {tab === 'Bundles' && <div className="empty-state"><span className="state-icon"><Icon name="sparkle" size={22} /></span><h2>{store.bundle.title}</h2><p>{store.bundle.promptCount} prompts for {formatPrice(store.bundle.priceMinor)}. Bundle purchase will be connected when the bundles API is ready.</p></div>}
        {tab === 'Subscription' && <div className="empty-state"><span className="state-icon"><Icon name="clock" size={22} /></span><h2>{store.subscriptionPriceMinor ? `Membership · ${formatPrice(store.subscriptionPriceMinor)} / month` : 'No subscription tier yet'}</h2><p>Creator subscriptions and recurring billing are not connected in this release.</p></div>}
        {tab === 'Reviews' && <div className="empty-state"><span className="state-icon"><Icon name="check" size={22} /></span><h2>Buyer reviews</h2><p>Reviews are shown on each listing and will be grouped here when the creator review endpoint is available.</p>{store.listings[0] && <Link className="button button-outline button-small" href={`/listing/${store.listings[0].id}`}>Browse this creator’s prompts</Link>}</div>}
      </div>
    </div>
  );
}
