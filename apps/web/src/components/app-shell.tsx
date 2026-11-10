'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { readCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Icon } from './icon';

const navigation = [
  { label: 'Explore', href: '/explore', icon: 'search' as const },
  { label: 'Library', href: '/library', icon: 'grid' as const },
  { label: 'Sell', href: '/creator/onboarding', icon: 'sparkle' as const },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCart = () => setCartCount(readCart().length);
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('prompt-engine-cart-change', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('prompt-engine-cart-change', updateCart);
    };
  }, []);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/explore?q=${encodeURIComponent(value)}` : '/explore');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="Prompt Engine home">
            <span className="brand-mark"><Icon name="sparkle" size={20} /></span>
            <span>prompt<span className="brand-engine">engine</span></span>
          </Link>
          <form className="top-search" onSubmit={search} role="search">
            <Icon name="search" size={18} />
            <input
              aria-label="Search prompts, styles, creators"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts, styles, creators"
              value={query}
            />
            <kbd>⌘ K</kbd>
          </form>
          <nav className="desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                aria-current={pathname === item.href ? 'page' : undefined}
                className={pathname.startsWith(item.href) ? 'nav-link active' : 'nav-link'}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="topbar-actions">
            <button
              aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              type="button"
            >
              <Icon name={resolvedTheme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <Link aria-label={`Cart${cartCount ? `, ${cartCount} items` : ''}`} className="icon-button cart-button" href="/checkout">
              <Icon name="cart" size={19} />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </Link>
            {user ? (
              <Link className="avatar avatar-user" href="/library" aria-label={`Account: ${user.name}`}>
                {user.name.slice(0, 1).toUpperCase()}
              </Link>
            ) : (
              <Link className="button button-small button-outline signin-link" href="/sign-in">
                {loading ? '…' : 'Sign in'}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="page-shell">{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <Link className="brand" href="/">
              <span className="brand-mark"><Icon name="sparkle" size={18} /></span>
              <span>prompt<span className="brand-engine">engine</span></span>
            </Link>
            <p>Write, test, and sell AI prompts.<br />Built for the people behind the picture.</p>
            <span className="footer-market-note">Prices in USD · PKR shown at checkout</span>
          </div>
          <div className="footer-links">
            <div><strong>Marketplace</strong><Link href="/explore">Explore</Link><Link href="/explore?category=image">Image prompts</Link><Link href="/explore?category=video">Video prompts</Link></div>
            <div><strong>Creators</strong><Link href="/creator/onboarding">Start selling</Link><Link href="/creator/dashboard">Dashboard</Link><Link href="/creator/listings/new">New listing</Link></div>
            <div><strong>Your workspace</strong><Link href="/library">Library</Link><Link href="/checkout">Cart</Link><Link href="/sign-in">Sign in</Link></div>
          </div>
          <div className="footer-bottom"><span>© 2026 Prompt Engine</span><span>Terms&nbsp;&nbsp; Privacy&nbsp;&nbsp; Content rules</span></div>
        </div>
      </footer>
      <nav className="mobile-tabs" aria-label="Mobile navigation">
        <Link className={pathname === '/' ? 'mobile-tab active' : 'mobile-tab'} href="/">
          <Icon name="sparkle" size={19} /><span>Home</span>
        </Link>
        <Link className={pathname.startsWith('/explore') ? 'mobile-tab active' : 'mobile-tab'} href="/explore">
          <Icon name="search" size={19} /><span>Explore</span>
        </Link>
        <Link className={pathname.startsWith('/creator') ? 'mobile-tab active' : 'mobile-tab'} href="/creator/onboarding">
          <Icon name="plus" size={20} /><span>Create</span>
        </Link>
        <Link className={pathname.startsWith('/library') ? 'mobile-tab active' : 'mobile-tab'} href="/library">
          <Icon name="grid" size={19} /><span>Library</span>
        </Link>
        <Link className="mobile-tab" href={user ? '/library' : '/sign-in'}>
          <Icon name="user" size={19} /><span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
