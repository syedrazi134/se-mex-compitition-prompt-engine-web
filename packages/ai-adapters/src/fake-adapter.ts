import type {
  AiAdapter,
  GenerationKind,
  PollResult,
  PromptVersionInput,
  ProviderCredentials,
  ProviderPayload,
  StartResult,
} from './types.js';

/** Replaces {{name}} placeholders with variable values; unknown names are left as written. */
export function fillVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, name: string) =>
    Object.hasOwn(variables, name) ? (variables[name] ?? match) : match,
  );
}

/**
 * Deterministic in-memory adapter for tests and local development. No network, no real provider.
 * Jobs finish on the first poll; costs are fixed per kind.
 */
export class FakeAiAdapter implements AiAdapter {
  readonly id = 'fake';
  readonly kinds = ['text', 'image', 'video'] as const satisfies readonly GenerationKind[];

  private readonly costMinor: Record<GenerationKind, number> = { text: 1, image: 10, video: 100 };
  private readonly jobs = new Map<string, ProviderPayload>();
  private nextJob = 1;

  formatPrompt(version: PromptVersionInput, kind: GenerationKind): ProviderPayload {
    const base = version.toolVariants?.[this.id] ?? version.body;
    return {
      adapterId: this.id,
      kind,
      prompt: fillVariables(base, version.variables),
      params: { ...version.mediaFields, ...version.modelSettings },
    };
  }

  async start(payload: ProviderPayload, creds: ProviderCredentials): Promise<StartResult> {
    if (!creds.apiKey) throw new Error('fake adapter: missing api key');
    const jobRef = `fake-job-${this.nextJob++}`;
    this.jobs.set(jobRef, payload);
    return { jobRef, done: false };
  }

  async poll(jobRef: string, _creds: ProviderCredentials): Promise<PollResult> {
    const payload = this.jobs.get(jobRef);
    if (!payload) return { status: 'failed' };
    return payload.kind === 'text'
      ? {
          status: 'succeeded',
          output: { kind: 'text', text: `fake output for: ${payload.prompt}` },
        }
      : {
          status: 'succeeded',
          output: { kind: payload.kind, mediaUrl: `https://fake.invalid/${jobRef}` },
        };
  }

  estimateCost(payload: ProviderPayload): number {
    return this.costMinor[payload.kind];
  }
}
