'use client';

import { useAuditContext } from '../api/AuditProvider';

interface AuditLogProps {
  tableName: string;
  recordId: string;
}

export function AuditLog({ tableName, recordId }: AuditLogProps) {
  const { changeLogService } = useAuditContext();

  return (
    <div data-testid="audit-log" data-table={tableName} data-record={recordId}>
      <h3>Change Log</h3>
      <p>Audit trail for {tableName} / {recordId}</p>
    </div>
  );
}
