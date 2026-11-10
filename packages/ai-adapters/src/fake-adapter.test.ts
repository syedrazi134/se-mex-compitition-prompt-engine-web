import { describe, expect, it } from 'vitest';
import { FakeAiAdapter, fillVariables } from './index.js';

const creds = { apiKey: 'test-key' };

describe('fillVariables', () => {
  it('fills known variables and leaves unknown ones', () => {
    expect(fillVariables('a {{x}} and {{ y }} and {{z}}', { x: '1', y: '2' })).toBe(
      'a 1 and 2 and {{z}}',
    );
  });

  it('does not read inherited properties', () => {
    expect(fillVariables('{{toString}}', {})).toBe('{{toString}}');
  });
});

describe('FakeAiAdapter', () => {
  it('prefers its own tool variant over the base body', () => {
    const adapter = new FakeAiAdapter();
    const payload = adapter.formatPrompt(
      { body: 'base {{s}}', variables: { s: 'cat' }, toolVariants: { fake: 'tuned {{s}}' } },
      'image',
    );
    expect(payload.prompt).toBe('tuned cat');
    expect(payload.kind).toBe('image');
  });

  it('runs a job to completion', async () => {
    const adapter = new FakeAiAdapter();
    const payload = adapter.formatPrompt({ body: 'hello', variables: {} }, 'text');
    const started = await adapter.start(payload, creds);
    expect(started.done).toBe(false);
    const polled = await adapter.poll(started.jobRef, creds);
    expect(polled).toEqual({
      status: 'succeeded',
      output: { kind: 'text', text: 'fake output for: hello' },
    });
  });

  it('fails unknown jobs and refuses missing keys', async () => {
    const adapter = new FakeAiAdapter();
    expect((await adapter.poll('nope', creds)).status).toBe('failed');
    const payload = adapter.formatPrompt({ body: 'x', variables: {} }, 'video');
    await expect(adapter.start(payload, { apiKey: '' })).rejects.toThrow('missing api key');
  });

  it('estimates cost as an integer in minor units', () => {
    const adapter = new FakeAiAdapter();
    const cost = adapter.estimateCost(adapter.formatPrompt({ body: 'x', variables: {} }, 'video'));
    expect(Number.isInteger(cost)).toBe(true);
    expect(cost).toBe(100);
  });
});
