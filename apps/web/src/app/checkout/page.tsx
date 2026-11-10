'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { useAuth } from '@/lib/auth-context';
import { isDemoMode, startCheckout } from '@/lib/api';
import { readCart, writeCart, type CartItem } from '@/lib/cart';

const usdToPkr = (minor: number) => Math.round((minor / 100) * 280).toLocaleString();

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoComplete, setDemoComplete] = useState(false);

  useEffect(() => {
    setItems(readCart());
    if (new URLSearchParams(window.location.search).get('status') === 'demo') setDemoComplete(true);
    const update = () => setItems(readCart());
    window.addEventListener('prompt-engine-cart-change', update);
    return () => window.removeEventListener('prompt-engine-cart-change', update);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.priceMinor, 0);
  const promoDiscount = promoCode === 'LAUNCH10' ? Math.round(subtotal * 0.1) : 0;
  const total = Math.max(0, subtotal - promoDiscount);

  const remove = (listingId: string) => {
    const next = items.filter((item) => item.listing.id !== listingId);
    writeCart(next);
    setItems(next);
  };

  const applyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'LAUNCH10') {
      setPromoCode('LAUNCH10');
      setPromoMessage('LAUNCH10 applied · 10% estimated savings');
    } else {
      setPromoCode('');
      setPromoMessage('That promo code isn’t valid.');
    }
  };

  const continueCheckout = async () => {
    if (!user && !isDemoMode()) {
      window.location.href = '/sign-in?next=%2Fcheckout';
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await startCheckout(
        items.map((item) => ({ listingId: item.listing.id, license: item.license })),
        paymentMethod,
        promoCode || undefined,
      );
      if (result.checkoutUrl.includes('status=demo')) {
        writeCart([]);
        setItems([]);
        window.history.replaceState({}, '', result.checkoutUrl);
        setDemoComplete(true);
      } else {
        window.location.assign(result.checkoutUrl);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not be started.');
    } finally {
      setLoading(false);
    }
  };

  if (demoComplete) {
    return (
      <div className="checkout-success">
        <span className="success-confetti" aria-hidden="true">✦</span>
        <span className="state-icon success-icon"><Icon name="check" size={25} /></span>
        <p className="eyebrow">Design preview</p>
        <h1>Checkout flow preview</h1>
        <p>This is a demo state only. No payment was taken and no prompts were added to your library.</p>
        <div className="success-actions"><Link className="button" href="/explore">Continue exploring</Link><Link className="button button-outline" href="/library">Open library</Link></div>
        <span className="preview-disclaimer">Live checkout will redirect to the configured hosted payment provider.</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header"><div><p className="eyebrow">Your next idea is close</p><h1>Your cart</h1><p>{items.length} {items.length === 1 ? 'prompt' : 'prompts'} · review your licences before checkout.</p></div><Link className="text-link" href="/explore">Continue browsing <Icon name="arrow" size={16} /></Link></div>
      <div className="checkout-steps"><div className="checkout-step current"><span>1</span>Cart</div><span className="step-divider" /><div className="checkout-step"><span>2</span>Payment</div><span className="step-divider" /><div className="checkout-step"><span>3</span>Done</div></div>
      {!items.length ? (
        <div className="empty-state"><span className="state-icon"><Icon name="cart" size={22} /></span><h2>Your cart is waiting for inspiration</h2><p>Explore creator-made prompts and add one when you find the right fit.</p><Link className="button button-small" href="/explore">Explore prompts</Link></div>
      ) : (
        <div className="checkout-layout">
          <div>
            <section className="cart-card">
              <h2>Cart <span className="muted-count">{items.length} prompts</span></h2>
              {items.map((item) => (
                <article className="cart-line" key={item.listing.id}>
                  <Image alt="" height={75} src={item.listing.coverImage} unoptimized width={72} />
                  <div><strong>{item.listing.title}</strong><span>@{item.listing.creator.handle}</span><span>{item.license} licence</span><button className="remove-line" onClick={() => remove(item.listing.id)} type="button">Remove</button></div>
                  <span className="cart-line-price">{formatPrice(item.priceMinor)}</span>
                </article>
              ))}
            </section>
            <section className="payment-panel">
              <div className="panel-title-row"><h2>How would you like to pay?</h2><span>Secure hosted checkout</span></div>
              {[
                ['jazzcash', 'JazzCash', 'Mobile wallet · PKR'],
                ['easypaisa', 'Easypaisa', 'Mobile wallet · PKR'],
                ['local-card', 'Debit or credit card', 'Pakistani Visa, Mastercard, UnionPay'],
                ['international', 'International card', 'Charged in USD by your bank'],
              ].map(([value, name, detail]) => <label className={`payment-option ${paymentMethod === value ? 'selected' : ''}`} key={value}><input checked={paymentMethod === value} name="payment" onChange={() => setPaymentMethod(value ?? '')} type="radio" value={value} /><span><strong>{name}</strong><span>{detail}</span></span></label>)}
                {!user && !authLoading && !isDemoMode() && <p className="muted-note">Sign in is required before a live order can be created. Your cart will be kept for you.</p>}
            </section>
          </div>
          <aside className="summary-card">
            <h2>Order summary</h2>
            <div className="promo-input"><input aria-label="Promo code" onChange={(event) => setPromoInput(event.target.value)} placeholder="Promo code" value={promoInput} /><button onClick={applyPromo} type="button">Apply</button></div>
            {promoMessage && <p className={promoCode ? 'promo-message success' : 'promo-message'} role="status">{promoMessage}</p>}
            <div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            {promoDiscount > 0 && <div className="summary-row promo-row"><span>LAUNCH10</span><strong>−{formatPrice(promoDiscount)}</strong></div>}
            <div className="summary-row"><span>Taxes</span><span>Included</span></div>
            <div className="summary-row total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
            <p className="summary-pkr">≈ Rs {usdToPkr(total)}</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-wide" disabled={loading} onClick={() => void continueCheckout()} type="button">{loading ? <><span className="spinner" /> Preparing checkout…</> : user || isDemoMode() ? 'Continue to secure payment' : 'Sign in to continue'}</button>
            <p className="trust-note"><Icon name="shield" size={15} />We never see or store your card or wallet details. Payments are handled on the provider’s secure page.</p>
            <p className="summary-disclaimer">Final pricing and any discount are validated by the server before payment.</p>
            <p className="trust-note"><Icon name="check" size={15} />Prompts are delivered to your Library once payment is confirmed.</p>
          </aside>
        </div>
      )}
    </>
  );
}
