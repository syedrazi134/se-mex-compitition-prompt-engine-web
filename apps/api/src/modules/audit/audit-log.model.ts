import { model, Schema, type InferSchemaType } from 'mongoose';

const TargetSchema = new Schema(
  {
    kind: { type: String, required: true },
    id: { type: String, required: true },
  },
  { _id: false },
);

const AuditLogSchema = new Schema(
  {
    /** A user id, or `system` for scheduled jobs such as the workspace purge. */
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: TargetSchema, required: true },
    workspaceId: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { collection: 'auditLogs', versionKey: false },
);

AuditLogSchema.index({ workspaceId: 1, at: -1 });
AuditLogSchema.index({ 'target.id': 1, at: -1 });

export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;
export const AuditLog = model('AuditLog', AuditLogSchema);
