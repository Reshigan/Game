import { db } from './db/client';
import { auditLog } from './db/schema';
import type { User } from './db/schema';

interface AuditLogEntry {
  entityType: string;
  entityId: string;
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy?: string;
  ipAddress?: string;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      changedBy: entry.changedBy ?? null,
      changedAt: new Date(),
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit log error:', error);
  }
}

export async function logAuditBatch(entries: AuditLogEntry[]): Promise<void> {
  try {
    await db.insert(auditLog).values(
      entries.map((entry) => ({
        entityType: entry.entityType,
        entityId: entry.entityId,
        fieldName: entry.fieldName,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        changedBy: entry.changedBy ?? null,
        changedAt: new Date(),
        ipAddress: entry.ipAddress ?? null,
      }))
    );
  } catch (error) {
    console.error('Audit log batch error:', error);
  }
}