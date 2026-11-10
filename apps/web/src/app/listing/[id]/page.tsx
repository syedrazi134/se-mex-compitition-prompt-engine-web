'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { ListingCard, formatPrice } from '@/components/listing-card';
import { addToCart } from '@/lib/cart';
import { getListing, getListings } from '@/lib/api';
import type { ListingCardData, ListingDetailData } from '@/lib/types';

const licenseCopy = {
  personal: { title: 'Personal', detail: 'Your own posts and projects' },
  commercial: { title: 'Commercial', detail: 'Client work, ads and brand content' },
  extended: { title: 'Extended', detail: 'Products for resale, unlimited reach' },
} as const;

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetailData | null>(null);
  const [more, setMore] = useState<ListingCardData[]>([]);
  const [license, setLicense] = useState<'personal' | 'commercial' | 'extended'>('personal');
  const [activeImage, setActiveImage] = useState(0);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void Promise.all([getListing(params.id), getListings({ limit: 4 })])
      .then(([details, result]) => {
        if (!active) return;
        setListing(details);
        setMore(result.items.filter((item) => item.id !== details.id).slice(0, 4));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load this listing.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <div className="page-loading"><span className="spinner" /> Loading listing…</div>;
  if (error || !listing) {
    return (
      <div className="error-state listing-error">
        <span className="state-icon"><Icon name="image" size={22} /></span>
        <h2>This listing isn’t available</h2><p>{error || 'The prompt may have been removed or is temporarily unavailable.'}</p>
        <Link className="button button-small" href="/explore">Back to Explore</Link>
      </div>
    );
  }

  const selectedLicense = listing.licenses.find((item) => item.type === license);
  if (!selectedLicense) {
    return <div className="error-state"><h2>Licence options are unavailable</h2><p>Please try again later.</p><Link className="button button-small" href="/explore">Back to Explore</Link></div>;
  }
  const buy = () => {
    addToCart(listing, license, selectedLicense.priceMinor);
    router.push('/checkout');
  };
  const add = () => addToCart(listing, license, selectedLicense.priceMinor);

  return (
    <>
      <div className="breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/explore">Explore</Link><span>/</span><span>{listing.category}</span><span>/</span><strong>{listing.title}</strong></div>
      <div className="detail-layout">
        <div>
          <div className="detail-gallery">
            {listing.gallery.slice(0, 3).map((sample, index) => (
              <button
                aria-label={`Show ${sample.tool} sample ${index + 1}`}
                aria-pressed={activeImage === index}
                className="gallery-image"
                key={`${sample.imageUrl}-${index}`}
                onClick={() => setActiveImage(index)}
                type="button"
              >
                <Image alt={`Prompt sample generated with ${sample.tool}`} fill preload={index === 0} sizes="(max-width: 600px) 100vw, 700px" src={sample.imageUrl} unoptimized />
                <span>{sample.tool}{sample.kind === 'video' ? ' · video' : ''}</span>
              </button>
            ))}
            <span className="gallery-count">{listing.gallery.length} samples</span>
          </div>
          <div className="detail-section">
            <h2>Preview the structure</h2>
            <div className="locked-preview">
              {listing.lockedPreview.map((field) => (
                <div className="locked-row" key={field.label}><strong>{field.label}</strong><span>{field.placeholder}</span></div>
              ))}
              <div className="locked-overlay"><Icon name="shield" size={19} /> Unlocks after purchase</div>
            </div>
            <p className="muted-note">The complete prompt stays protected until you buy it. Sample images are outputs, not the prompt text.</p>
          </div>
          <div className="detail-section">
            <h2>What you get</h2>
            <ul className="included-list">
              {listing.included.map((item) => <li key={item}><Icon name="check" size={15} />{item}</li>)}
            </ul>
          </div>
        </div>

        <aside className="detail-buy-panel">
          <div className="detail-copy">
            {listing.badge && <span className={`badge detail-badge badge-${listing.badge.toLowerCase()}`}>{listing.badge}</span>}
            <p className="eyebrow">{listing.category} · {listing.sampleCount} variations</p>
            <h1>{listing.title}</h1>
            <p>{listing.description}</p>
            <div className="creator-profile-inline">
              <Image alt="" height={43} src={listing.creator.avatarUrl} unoptimized width={43} />
              <Link href={`/creators/${listing.creator.handle}`}><strong>{listing.creator.displayName}</strong><span>@{listing.creator.handle} · {listing.creator.followers ? `${(listing.creator.followers / 1000).toFixed(0)}K followers` : 'Creator'}</span></Link>
              <button className="button button-outline button-small" onClick={() => setFollowing(!following)} type="button">{following ? 'Following' : 'Follow'}</button>
            </div>
            <div className="detail-rating-line"><span className="rating"><span aria-hidden="true">★</span> <strong>{listing.rating.toFixed(1)}</strong></span><span>{listing.reviewCount} ratings</span><span>·</span><span>1,860 sold</span></div>
            <div className="detail-price-line"><strong>{formatPrice(selectedLicense.priceMinor)}</strong><span>≈ Rs {Math.round(selectedLicense.priceMinor * 2.8).toLocaleString()}</span></div>
          </div>

          <fieldset className="license-picker">
            <legend className="eyebrow">Licence</legend>
            {listing.licenses.map((option) => (
              <label className={`license-option ${license === option.type ? 'selected' : ''}`} key={option.type}>
                <input checked={license === option.type} name="license" onChange={() => setLicense(option.type)} type="radio" value={option.type} />
                <span className="license-option-copy"><strong>{licenseCopy[option.type].title}</strong><span>{licenseCopy[option.type].detail}</span></span>
                <b>{formatPrice(option.priceMinor)}</b>
              </label>
            ))}
          </fieldset>

          <div className="purchase-actions">
            <button className="button" onClick={buy} type="button">Buy now · {formatPrice(selectedLicense.priceMinor)}</button>
            <button aria-label="Add to cart" className="button button-outline" onClick={add} type="button"><Icon name="cart" size={18} /> Add to cart</button>
          </div>
          <p className="purchase-note"><Icon name="shield" size={15} />Delivered to your Library instantly after payment. Refunds within 48 hours if unused.</p>
          <div className="bundle-callout"><span className="bundle-icon"><Icon name="sparkle" size={17} /></span><div><strong>Included in “Golden Hour Complete”</strong><span>4 packs for $19.99 · save 28%</span></div></div>
          <div className="detail-section">
            <h2>Works with</h2>
            <div className="tool-pills">{listing.tools.map((tool) => <span className="tool-pill" key={tool}>{tool}</span>)}</div>
            <Link className="report-link" href="/sign-in">Report listing</Link>
          </div>
        </aside>
      </div>

      <section className="detail-section">
        <div className="section-heading"><div><p className="eyebrow">Verified buyers</p><h2>Reviews</h2></div><Link className="text-link" href="/sign-in">Leave a review <Icon name="arrow" size={16} /></Link></div>
        <div className="reviews-layout">
          <div className="rating-summary"><strong>{listing.rating.toFixed(1)}</strong><span>from {listing.reviewCount} verified buyers</span><div className="rating-breakdown">{[91, 7, 1, 1, 0].map((percent, index) => <div className="rating-bar-row" key={5 - index}><span>{5 - index}</span><span className="rating-bar"><span style={{ width: `${percent}%` }} /></span><span>{percent}%</span></div>)}</div></div>
          <div className="review-list">{listing.reviews.map((review) => <article className="review-card" key={review.id}><div className="review-header"><Image alt="" height={35} src={review.avatarUrl} unoptimized width={35} /><div><strong>{review.name}</strong><span>{review.verifiedBuyer ? 'Verified buyer' : 'Buyer'} · {review.date}</span></div><span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}</span></div><p>{review.text}</p></article>)}</div>
        </div>
      </section>

      {!!more.length && <section className="section"><div className="section-heading"><div><p className="eyebrow">Keep exploring</p><h2>Similar prompts</h2></div><Link className="text-link" href="/explore">See all <Icon name="arrow" size={16} /></Link></div><div className="listing-grid">{more.map((item) => <ListingCard key={item.id} listing={item} />)}</div></section>}
    </>
  );
}
