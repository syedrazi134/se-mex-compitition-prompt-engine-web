/**
 * AI provider adapter contract (docs/02-phase1-backend-plan.md, "Background jobs and AI adapters").
 * Core code only ever talks to this interface; each provider is one adapter.
 */

export type GenerationKind = 'text' | 'image' | 'video';

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** The parts of a prompt version an adapter needs. Mirrors the promptVersions collection. */
export interface PromptVersionInput {
  body: string;
  variables: Record<string, string>;
  mediaFields?: {
    subject?: string;
    style?: string;
    camera?: string;
    lighting?: string;
    aspectRatio?: string;
    durationSeconds?: number;
    negativePrompt?: string;
    seed?: number;
  };
  /** Tuned prompt text per tool id; the adapter uses its own entry when present. */
  toolVariants?: Record<string, string>;
  modelSettings?: Record<string, unknown>;
}

/** What the adapter sends to its provider. Opaque to core code. */
export interface ProviderPayload {
  adapterId: string;
  kind: GenerationKind;
  prompt: string;
  params: Record<string, unknown>;
}

/** Platform key (credits mode) or the user's decrypted key (bring-your-own-key). */
export interface ProviderCredentials {
  apiKey: string;
}

export interface GenerationOutput {
  kind: GenerationKind;
  /** Text output, or a URL to the generated media. */
  text?: string;
  mediaUrl?: string;
}

export interface StartResult {
  jobRef: string;
  done: boolean;
  output?: GenerationOutput;
}

export interface PollResult {
  status: JobStatus;
  output?: GenerationOutput;
}

export interface AiAdapter {
  readonly id: string;
  readonly kinds: readonly GenerationKind[];
  /** Applies the tool variant and variables. Copy-out tools implement only this. */
  formatPrompt(version: PromptVersionInput, kind: GenerationKind): ProviderPayload;
  /** Omitted by copy-out adapters (tools with no official API). */
  start?(payload: ProviderPayload, creds: ProviderCredentials): Promise<StartResult>;
  poll?(jobRef: string, creds: ProviderCredentials): Promise<PollResult>;
  /** Cost in minor units, for credit checks before a job starts. */
  estimateCost(payload: ProviderPayload): number;
}
