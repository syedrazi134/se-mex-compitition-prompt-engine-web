import type { ClientSession } from 'mongoose';
import { AuditLog } from './audit-log.model.js';

export type AuditAction =
  | 'workspace.deleted'
  | 'workspace.restored'
  | 'workspace.purged'
  | 'workspace.member_added'
  | 'workspace.member_role_changed'
  | 'workspace.member_removed'
  | 'workspace.member_left';

export const SYSTEM_ACTOR = 'system';

export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  target: { kind: string; id: string };
  workspaceId?: string;
  meta?: Record<string, unknown>;
}

export interface AuditRecord extends Required<Omit<AuditEntry, 'workspaceId'>> {
  workspaceId: string | null;
  at: Date;
}

/** Writes one audit entry. Pass the caller's session so it commits with the change it records. */
export async function recordAudit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  await AuditLog.create(
    [
      {
        actorId: entry.actorId,
        action: entry.action,
        target: entry.target,
        workspaceId: entry.workspaceId ?? null,
        meta: entry.meta ?? {},
      },
    ],
    { session },
  );
}

/** Newest first. Used by admin tooling (Sprint 4) and tests. */
export async function listAuditForWorkspace(workspaceId: string): Promise<AuditRecord[]> {
  const docs = await AuditLog.find({ workspaceId }).sort({ at: -1, _id: -1 }).lean();
  return docs.map((d) => ({
    actorId: d.actorId,
    action: d.action as AuditAction,
    target: { kind: d.target.kind, id: d.target.id },
    workspaceId: d.workspaceId ?? null,
    meta: (d.meta ?? {}) as Record<string, unknown>,
    at: d.at,
  }));
}
