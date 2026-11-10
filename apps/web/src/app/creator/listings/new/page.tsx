'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/icon';
import { createListing } from '@/lib/api';
import { isLive } from '@/lib/features';
import { useAuth } from '@/lib/auth-context';

export default function NewListingPage() {
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'image' | 'video' | 'text'>('image');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('6.99');
  const [tools, setTools] = useState('Midjourney, Flux');
  const [tags, setTags] = useState('portrait, golden hour, editorial');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const priceValue = Number(price);
    if (!title.trim() || !description.trim() || !Number.isFinite(priceValue) || priceValue <= 0) {
      setError('Add a title, description, and a valid price above zero.');
      return;
    }
    setSaving(true);
    try {
      const listing = await createListing({
        title: title.trim(),
        category,
        description: description.trim(),
        priceMinor: Math.round(priceValue * 100),
        currency: 'USD',
        tools: tools.split(',').map((item) => item.trim()).filter(Boolean),
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
      });
      setSuccess(`Draft created: ${listing.title}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The listing could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !user && isLive('creator')) {
    return <div className="empty-state"><span className="state-icon"><Icon name="user" size={22} /></span><h2>Sign in to create a listing</h2><p>Your creator workspace is available after you sign in.</p><Link className="button button-small" href="/sign-in?next=%2Fcreator%2Flistings%2Fnew">Sign in</Link></div>;
  }

  return (
    <>
      <div className="page-header"><div><p className="eyebrow">Creator studio</p><h1>Create a listing</h1><p>Give buyers a clear preview while keeping the full prompt protected.</p></div><Link className="text-link" href="/creator/dashboard">← Dashboard</Link></div>
      {!isLive('creator') && <p className="preview-notice"><Icon name="sparkle" size={16} />You’re in design preview. Form submission is connected to the expected API contract, but listings are not saved until creator tools are live.</p>}
      <form className="listing-form-layout" onSubmit={(event) => void submit(event)}>
        <div>
          <section className="listing-form-card">
            <h2>Listing details</h2>
            <div className="field-group"><label htmlFor="listing-title">Title</label><input className="field-input" id="listing-title" maxLength={100} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Golden Hour Street Portraits" required value={title} /></div>
            <div className="field-group"><label htmlFor="listing-description">Description</label><textarea className="field-textarea" id="listing-description" maxLength={800} onChange={(event) => setDescription(event.target.value)} placeholder="Tell buyers what they can create with this prompt…" required value={description} /></div>
            <div className="form-grid-two">
              <div className="field-group"><label htmlFor="listing-category">Category</label><select className="field-select" id="listing-category" onChange={(event) => setCategory(event.target.value as 'image' | 'video' | 'text')} value={category}><option value="image">Image</option><option value="video">Video</option><option value="text">Text</option></select></div>
              <div className="field-group"><label htmlFor="listing-price">Price (USD)</label><input className="field-input" id="listing-price" inputMode="decimal" min="0.50" onChange={(event) => setPrice(event.target.value)} step="0.01" type="number" value={price} /></div>
            </div>
            <div className="form-grid-two">
              <div className="field-group"><label htmlFor="listing-tools">Target AI tools</label><input className="field-input" id="listing-tools" onChange={(event) => setTools(event.target.value)} value={tools} /><span className="field-hint">Separate tools with commas.</span></div>
              <div className="field-group"><label htmlFor="listing-tags">Tags</label><input className="field-input" id="listing-tags" onChange={(event) => setTags(event.target.value)} value={tags} /><span className="field-hint">Separate tags with commas.</span></div>
            </div>
          </section>
          <section className="listing-form-card">
            <div className="panel-title-row"><h2>Sample outputs</h2><span>Up to 10 images or videos</span></div>
            <div className="upload-zone"><Icon name="image" size={23} /><strong>Sample media upload isn’t connected yet</strong><span>Media storage and signed-upload API are needed before files can be published.</span></div>
            <div className="form-checkline"><input id="watermark" defaultChecked type="checkbox" /><label htmlFor="watermark">Apply a subtle watermark to preview images</label></div>
          </section>
          <div className="form-action-row"><Link className="button button-outline" href="/creator/dashboard">Cancel</Link><button className="button button-outline" disabled={saving} type="submit">Save draft</button><button aria-disabled="true" className="button button-quiet" disabled title="Submit for review will be connected with the moderation API" type="button">Submit for review</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          {success && <p className="form-success" role="status">{success}</p>}
        </div>
        <aside className="listing-form-card live-preview-card">
          <div className="panel-title-row"><div><p className="eyebrow">Buyer preview</p><h2>Listing page</h2></div><span className="preview-live-dot">Live preview</span></div>
          <div className="preview-image"><span className="preview-image-placeholder"><Icon name="image" size={29} /></span></div>
          <p className="eyebrow preview-category">{category} · 12 variations</p>
          <h3>{title || 'Your prompt title goes here'}</h3>
          <div className="preview-creator"><span className="creator-avatar-placeholder">Y</span><span>@yourshop · Verified creator</span></div>
          <div className="preview-price">{Number(price) > 0 ? `$${Number(price).toFixed(2)}` : '$0.00'} <span>USD</span></div>
          <button className="button button-wide button-small" disabled type="button">Buy now</button>
          <div className="preview-locked"><strong><Icon name="shield" size={15} />Prompt preview stays locked</strong><p>Subject: Portrait of {'{{subject}}'} in warm late-afternoon light…</p></div>
          <p className="field-hint">Your listing will enter review before it appears in the marketplace.</p>
        </aside>
      </form>
    </>
  );
}
