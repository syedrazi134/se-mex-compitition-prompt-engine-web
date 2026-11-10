'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { formatPrice } from '@/components/listing-card';
import { useAuth } from '@/lib/auth-context';
import { getCreatorDashboard } from '@/lib/api';
import type { CreatorDashboardData } from '@/lib/types';

export default function CreatorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getCreatorDashboard());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Creator analytics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  if (authLoading || loading) return <div className="page-loading"><span className="spinner" /> Loading creator dashboard…</div>;
  if (error && !user) return <div className="empty-state"><span className="state-icon"><Icon name="user" size={22} /></span><h2>Sign in to manage your shop</h2><p>Creator stats and earnings are visible only to you.</p><Link className="button button-small" href="/sign-in?next=%2Fcreator%2Fdashboard">Sign in</Link></div>;
  if (error || !data) return <div className="error-state"><span className="state-icon"><Icon name="clock" size={22} /></span><h2>Dashboard isn’t available</h2><p>{error || 'No creator data was returned.'}</p><button className="button button-outline button-small" onClick={() => void load()} type="button">Try again</button></div>;

  const stats = [
    { label: 'Views', value: data.views.toLocaleString(), change: '+18.2%', icon: 'image' as const },
    { label: 'Conversion rate', value: `${data.conversionRate.toFixed(1)}%`, change: '+0.8%', icon: 'arrow' as const },
    { label: 'Sales', value: data.sales.toLocaleString(), change: '+12.4%', icon: 'cart' as const },
    { label: 'Earnings', value: formatPrice(data.earningsMinor), change: '≈ Rs 611,660', icon: 'sparkle' as const },
  ];

  return (
    <div className="creator-layout">
      <aside className="creator-sidebar" aria-label="Creator menu">
        <Link className="active" href="/creator/dashboard"><Icon name="grid" size={16} />Overview</Link>
        <Link href="/creator/onboarding"><Icon name="user" size={16} />Shop profile</Link>
        <Link href="/creator/listings/new"><Icon name="image" size={16} />Listings</Link>
        <Link href="/creator/dashboard#earnings"><Icon name="arrow" size={16} />Earnings</Link>
        <Link href="/creator/dashboard#orders"><Icon name="cart" size={16} />Orders</Link>
        <Link href="/creator/dashboard#settings"><Icon name="user" size={16} />Shop settings</Link>
      </aside>
      <div className="creator-main">
        <div className="creator-welcome">
          <div><p className="eyebrow">Creator studio</p><h1>Good morning, {user?.name.split(' ')[0] ?? 'Ayesha'} <span aria-hidden="true">✦</span></h1><p>Here’s how your shop is doing over the last 30 days.</p></div>
          <Link className="button button-small" href="/creator/listings/new"><Icon name="plus" size={16} />New listing</Link>
        </div>
        <div className="stat-grid">
          {stats.map((stat) => <article className="stat-card" key={stat.label}><div className="stat-card-heading"><span>{stat.label}</span><span className="stat-icon"><Icon name={stat.icon} size={15} /></span></div><strong className="stat-value">{stat.value}</strong><span className="stat-change">{stat.change} vs previous period</span></article>)}
        </div>
        <div className="creator-charts">
          <section className="panel-card"><div className="panel-title-row"><h2>Earnings over time</h2><span>Last 30 days</span></div><EarningsChart values={data.earningsSeries} /><div className="chart-axis"><span>Nov 1</span><span>Nov 8</span><span>Nov 15</span><span>Nov 30</span></div></section>
          <section className="panel-card"><div className="panel-title-row"><h2>Traffic sources</h2><span>By visits</span></div><div className="traffic-list">{data.traffic.map((entry) => <div className="traffic-row" key={entry.source}><span>{entry.source}</span><span className="traffic-track"><span style={{ width: `${entry.percent}%` }} /></span><strong>{entry.percent}%</strong></div>)}</div><div className="traffic-callout"><Icon name="sparkle" size={15} />Instagram drives your biggest discovery channel</div></section>
        </div>
        <section className="panel-card creator-table-panel" id="listings">
          <div className="panel-title-row"><div><h2>Your top listings</h2><span className="panel-subtitle">Performance and review status</span></div><Link className="text-link" href="/creator/listings/new">Manage listings <Icon name="arrow" size={15} /></Link></div>
          <div className="table-wrap"><table className="creator-table"><thead><tr><th>LISTING</th><th>VIEWS</th><th>SALES</th><th>REVENUE</th><th>RATING</th><th>STATUS</th></tr></thead><tbody>{data.topListings.map((item) => <tr key={item.id}><td><Link className="table-listing" href={`/listing/${item.id}`}><Image alt="" height={40} src={item.image} unoptimized width={38} /><span>{item.title}</span></Link></td><td>{item.views.toLocaleString()}</td><td>{item.sales}</td><td>{formatPrice(item.revenueMinor)}</td><td><span className="rating"><span>★</span> {item.rating.toFixed(1)}</span></td><td><span className={`status-pill ${item.status === 'In review' ? 'review' : ''}`}>{item.status}</span></td></tr>)}</tbody></table></div>
        </section>
        <section className="creator-shortcuts" id="earnings"><div><span className="category-icon"><Icon name="arrow" size={16} /></span><div><strong>Available balance</strong><span>Request a payout when you’re ready.</span></div><strong className="shortcut-amount">{formatPrice(Math.round(data.earningsMinor * 0.6))}</strong><button className="button button-outline button-small" type="button" disabled title="Payout setup will be connected when the payouts API is available">Payout setup</button></div></section>
      </div>
    </div>
  );
}

function EarningsChart({ values }: Readonly<{ values: number[] }>) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 600;
    const y = 110 - (value / max) * 92;
    return `${x},${y}`;
  });
  const line = `M ${points.join(' L ')}`;
  return <svg aria-label="Earnings trend rising over the last month" className="sparkline-chart" role="img" viewBox="0 0 600 125"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".2" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs><path className="area" d={`${line} L 600,124 L 0,124 Z`} /><path className="line" d={line} /></svg>;
}
