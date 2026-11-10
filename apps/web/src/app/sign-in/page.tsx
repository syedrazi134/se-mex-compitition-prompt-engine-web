'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon } from '@/components/icon';

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await logIn(email, password);
      const next = search.get('next');
      router.replace(next?.startsWith('/') ? next : '/library');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Sign in could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-aside"><p className="eyebrow">Prompt Engine marketplace</p><h2>Your next great idea starts with a prompt.</h2><p>Get the building blocks behind the images you love, made by creators who know their tools.</p></aside>
      <div className="auth-form-wrap">
        <p className="eyebrow">Welcome back</p><h1>Sign in to Prompt Engine</h1><p>Pick up where you left off in your prompt workspace.</p>
        <form onSubmit={(event) => void submit(event)}>
          <div className="field-group"><label htmlFor="email">Email address</label><input autoComplete="email" className="field-input" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></div>
          <div className="field-group"><label htmlFor="password">Password</label><input autoComplete="current-password" className="field-input" id="password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required type="password" value={password} /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-wide" disabled={busy} type="submit">{busy ? <><span className="spinner" /> Signing in…</> : <>Sign in <Icon name="arrow" size={16} /></>}</button>
        </form>
        <p className="auth-footnote">New to Prompt Engine? <Link href="/sign-up">Create an account</Link></p>
        <p className="secure-footnote"><Icon name="shield" size={13} />Refresh tokens are held in a secure, HTTP-only cookie.</p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<div className="page-loading"><span className="spinner" /> Loading sign in…</div>}><SignInForm /></Suspense>;
}
