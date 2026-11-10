'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { createCreatorProfile, isDemoMode } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const steps = ['Profile', 'Shop', 'Payouts', 'Review'];

export default function CreatorOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const next = () => {
    setError('');
    if (step === 0) {
      if (displayName.trim().length < 2) {
        setError('Add a display name with at least 2 characters.');
        return;
      }
      if (!/^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/.test(handle)) {
        setError('Choose a shop handle with 3–24 lowercase letters, numbers, or hyphens.');
        return;
      }
      if (bio.trim().length < 20) {
        setError('Tell buyers a little about your creative work (at least 20 characters).');
        return;
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async () => {
    if (!agreement) {
      setError('Accept the creator terms to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (isDemoMode()) {
        setComplete(true);
        return;
      }
      await createCreatorProfile({
        handle,
        displayName: displayName.trim(),
        bio: bio.trim(),
        agreementAccepted: true,
      });
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your creator profile could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="page-loading"><span className="spinner" /> Loading account…</div>;
  if (!user && !isDemoMode()) {
    return <div className="empty-state"><span className="state-icon"><Icon name="user" size={22} /></span><h2>Sign in to start your creator shop</h2><p>Your creator profile is linked to your Prompt Engine account.</p><Link className="button button-small" href="/sign-in?next=%2Fcreator%2Fonboarding">Sign in</Link></div>;
  }

  if (complete) {
    return (
      <section className="onboarding-complete">
        <span className="state-icon"><Icon name="sparkle" size={23} /></span>
        <p className="eyebrow">{isDemoMode() ? 'Preview complete' : 'Profile submitted'}</p>
        <h1>{isDemoMode() ? 'Your shop is ready to preview.' : 'Welcome to the creator community.'}</h1>
        <p>{isDemoMode() ? 'Nothing was submitted. Turn off demo mode and connect the creator profile API to create your live shop.' : 'Your creator profile has been received. You can start preparing your first listing while it is reviewed.'}</p>
        <div className="onboarding-complete-actions">
          <Link className="button button-outline button-small" href={isDemoMode() ? '/creators/lensbyayesha' : `/creators/${handle}`}>{isDemoMode() ? 'Browse sample shop' : 'Preview creator shop'}</Link>
          <Link className="button button-small" href="/creator/listings/new">Create a listing <Icon name="arrow" size={14} /></Link>
        </div>
      </section>
    );
  }

  return (
    <div className="onboarding-page">
      <Link className="back-link" href="/creator/dashboard"><Icon className="icon-reverse" name="arrow" size={14} />Creator studio</Link>
      <div className="onboarding-heading">
        <p className="eyebrow">Creator onboarding</p>
        <h1>Make a shop for your ideas.</h1>
        <p>A few details to get your prompt shop started. You can update your profile later.</p>
      </div>
      <div className="onboarding-stepper" aria-label="Onboarding progress">
        {steps.map((label, index) => <div className={`onboarding-step ${index === step ? 'active' : ''} ${index < step ? 'complete' : ''}`} key={label}><span>{index < step ? <Icon name="check" size={13} /> : index + 1}</span><strong>{label}</strong></div>)}
      </div>
      <section className="onboarding-card">
        {step === 0 && (
          <>
            <div className="onboarding-card-heading"><span className="category-icon"><Icon name="user" size={17} /></span><div><h2>Your creator profile</h2><p>Help buyers recognize your work and find your shop.</p></div></div>
            <label className="field-label">Display name<input autoComplete="name" maxLength={60} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should buyers know you?" value={displayName} /></label>
            <label className="field-label">Shop handle<div className="handle-input"><span>promptengine.com/creators/</span><input autoCapitalize="none" autoComplete="off" maxLength={24} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="your-shop" value={handle} /></div></label>
            <label className="field-label">About your work<textarea maxLength={500} onChange={(event) => setBio(event.target.value)} placeholder="What do you create? What makes your prompt style yours?" rows={4} value={bio} /><span className="field-hint">{bio.length}/500 · A short bio helps buyers connect with your work.</span></label>
          </>
        )}
        {step === 1 && (
          <>
            <div className="onboarding-card-heading"><span className="category-icon"><Icon name="image" size={17} /></span><div><h2>Set up your shop</h2><p>Start with one great prompt pack. You can add more anytime.</p></div></div>
            <div className="onboarding-info-card"><strong>Your first listing</strong><p>Give your prompt a clear title, show example generations, and explain what buyers can customize. Drafts are saved for review before they appear in the marketplace.</p><Link className="text-link" href="/creator/listings/new">See the listing form <Icon name="arrow" size={14} /></Link></div>
            <div className="onboarding-info-card"><strong>Creator guidelines</strong><ul><li>Only list prompts and images you have the right to sell.</li><li>Do not include private data or copyrighted work you cannot license.</li><li>Describe supported tools and expected results honestly.</li></ul></div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="onboarding-card-heading"><span className="category-icon"><Icon name="shield" size={17} /></span><div><h2>Payouts, when you’re ready</h2><p>Your earnings stay yours. Add payout details through the secure account flow.</p></div></div>
            <div className="payout-notice"><Icon name="shield" size={17} /><div><strong>We won’t ask for bank details here.</strong><p>Payout setup will open a secure provider flow after the backend payout integration is available. You can finish setting up your shop without adding financial details.</p></div></div>
            <div className="onboarding-info-card"><strong>How creator earnings work</strong><p>Buyers pay securely at checkout. Your dashboard will show sales, fees, and the available payout balance once those services are connected.</p></div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="onboarding-card-heading"><span className="category-icon"><Icon name="check" size={17} /></span><div><h2>Review your shop</h2><p>Check your public profile details before continuing.</p></div></div>
            <div className="onboarding-review"><div><span>Display name</span><strong>{displayName}</strong></div><div><span>Shop URL</span><strong>promptengine.com/creators/{handle}</strong></div><div><span>About</span><p>{bio}</p></div></div>
            <label className="agreement-check"><input checked={agreement} onChange={(event) => setAgreement(event.target.checked)} type="checkbox" /><span>I agree to the <a href="/creator-guidelines" onClick={(event) => event.preventDefault()}>Creator Guidelines</a> and confirm that I have the rights to sell the content I upload.</span></label>
          </>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="onboarding-controls">
          {step > 0 ? <button className="button button-outline button-small" onClick={() => { setError(''); setStep((current) => current - 1); }} type="button"><Icon className="icon-reverse" name="arrow" size={14} />Back</button> : <span />}
          {step < steps.length - 1 ? <button className="button button-small" onClick={next} type="button">Continue <Icon name="arrow" size={14} /></button> : <button className="button button-small" disabled={busy} onClick={() => void submit()} type="button">{busy ? 'Saving…' : isDemoMode() ? 'Preview shop' : 'Create my shop'}<Icon name="arrow" size={14} /></button>}
        </div>
      </section>
      <p className="onboarding-footnote"><Icon name="shield" size={14} />Your shop profile is public. Payment and identity information are never collected on this page.</p>
    </div>
  );
}
