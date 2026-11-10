'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { useAuth } from '@/lib/auth-context';
import { getLibrary, startGeneration } from '@/lib/api';
import type { LibraryItem } from '@/lib/types';

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await getLibrary());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your library could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const copyPrompt = async (item: LibraryItem) => {
    const text = item.promptFields.map((field) => `${field.label}: ${field.value}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Prompt copied. Keep your personal watermarked copy private.');
    } catch {
      setMessage('Clipboard access was denied by your browser.');
    }
  };

  const generate = async (item: LibraryItem) => {
    setBusy(true);
    setMessage('');
    try {
      const variables = Object.fromEntries(item.variables.map((name) => [name, `Your ${name}`]));
      const job = await startGeneration({
        promptId: item.promptId,
        tool: activeTool[item.id] ?? item.tools[0] ?? '',
        variables,
        settings: { aspectRatio: '4:5', imageCount: 4 },
      });
      setMessage(`Generation queued · job ${job.id} is ${job.status}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Generation could not be started.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">Your prompt workspace</p><h1>My Library</h1><p>Your purchased prompts, ready to copy, customise, and run.</p></div>
        <Link className="button button-outline button-small" href="/explore"><Icon name="plus" size={15} /> Find more prompts</Link>
      </div>
      <div className="library-tabs" role="tablist" aria-label="Library views">
        <button className="active" role="tab" type="button">Purchased <span className="tab-count">{items.length || ''}</span></button>
        <button aria-disabled="true" className="tab-disabled" role="tab" title="Saved prompts will be available in a later release" type="button">Saved</button>
      </div>
      {message && <p className={message.startsWith('Generation queued') || message.startsWith('Prompt copied') ? 'form-success' : 'form-error'} role="status">{message}</p>}
      {authLoading || loading ? <div className="page-loading"><span className="spinner" /> Loading your library…</div> : error && !user ? (
        <div className="empty-state"><span className="state-icon"><Icon name="user" size={22} /></span><h2>Sign in to open your library</h2><p>Your purchases are tied to your account and stay private.</p><Link className="button button-small" href="/sign-in?next=%2Flibrary">Sign in</Link></div>
      ) : error ? (
        <div className="error-state"><span className="state-icon"><Icon name="clock" size={22} /></span><h2>Couldn’t load your prompts</h2><p>{error}</p><button className="button button-outline button-small" onClick={() => void load()} type="button">Try again</button></div>
      ) : !items.length ? (
        <div className="empty-state"><span className="state-icon"><Icon name="grid" size={22} /></span><h2>Your library is ready for its first prompt</h2><p>Browse the marketplace, choose a prompt, and it will appear here after purchase.</p><Link className="button button-small" href="/explore">Explore marketplace</Link></div>
      ) : (
        <div className="library-list">
          {items.map((item) => {
            const tool = activeTool[item.id] ?? item.tools[0] ?? '';
            return (
              <article className="library-card" key={item.id}>
                <div className="library-card-image"><Image alt="" fill sizes="(max-width: 600px) 100vw, 170px" src={item.coverImage} unoptimized /></div>
                <div className="library-card-content">
                  <div className="library-card-heading"><div><h2>{item.title}</h2><p>by @{item.creator.handle} · Purchased {new Date(item.purchasedAt).toLocaleDateString()}</p></div><span className="license-pill">{item.license} licence</span></div>
                  <div className="library-meta-line"><span>{item.version} · creator update available</span><Link className="text-link" href={`/listing/${item.listingId}`}>View listing <Icon name="external" size={13} /></Link></div>
                  <div className="tool-variant-row"><span className="eyebrow">Tool variant</span><div className="variant-tabs">{item.tools.map((variant) => <button className={tool === variant ? 'active' : ''} key={variant} onClick={() => setActiveTool((current) => ({ ...current, [item.id]: variant }))} type="button">{variant}</button>)}</div></div>
                  <div className="prompt-field-preview">
                    {item.promptFields.slice(0, 4).map((field) => <div key={field.label}><strong>{field.label}</strong><span>{highlightVariables(field.value)}</span></div>)}
                  </div>
                  <div className="variable-row"><span className="eyebrow">Variables</span>{item.variables.map((variable) => <label className="variable-input" key={variable}><span>{variable}</span><input aria-label={`Value for ${variable}`} defaultValue={`Your ${variable}`} /></label>)}</div>
                  <div className="library-card-actions">
                    <button className="button button-small" disabled={busy} onClick={() => void generate(item)} type="button"><Icon name="sparkle" size={15} />{busy ? 'Starting…' : 'Generate'}</button>
                    <button className="button button-outline button-small" onClick={() => void copyPrompt(item)} type="button"><Icon name="copy" size={15} />Copy prompt</button>
                    <span className="watermark-note"><Icon name="shield" size={13} />Watermarked to your account</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function highlightVariables(value: string) {
  const parts = value.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, index) =>
    part.startsWith('{{') ? <span className="variable-inline" key={`${part}-${index}`}>{part}</span> : part,
  );
}
