'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/icon';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 10) {
      setError('Choose a password with at least 10 characters.');
      return;
    }
    setBusy(true);
    try {
      await register(email, password, name);
      router.replace('/library');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Your account could not be created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-layout">
      <aside className="auth-aside"><p className="eyebrow">Make something remarkable</p><h2>From a spark to a finished idea.</h2><p>Save your prompts, make them your own, and share what works with the creative community.</p></aside>
      <div className="auth-form-wrap">
        <p className="eyebrow">Join the community</p><h1>Create your account</h1><p>One account for your library, creator shop, and prompt workspace.</p>
        <form onSubmit={(event) => void submit(event)}>
          <div className="field-group"><label htmlFor="name">Your name</label><input autoComplete="name" className="field-input" id="name" maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Name you go by" required value={name} /></div>
          <div className="field-group"><label htmlFor="email">Email address</label><input autoComplete="email" className="field-input" id="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></div>
          <div className="field-group"><label htmlFor="password">Password</label><input autoComplete="new-password" className="field-input" id="password" minLength={10} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" required type="password" value={password} /></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-wide" disabled={busy} type="submit">{busy ? <><span className="spinner" /> Creating account…</> : <>Create account <Icon name="arrow" size={16} /></>}</button>
        </form>
        <p className="auth-footnote">Already have an account? <Link href="/sign-in">Sign in</Link></p>
      </div>
    </div>
  );
}
