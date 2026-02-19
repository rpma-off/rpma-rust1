'use client';

import { useAuditContext } from '../api/AuditProvider';

export function AuditLogViewer() {
  const { changeLogService: _changeLogService } = useAuditContext();
  return (
    <div data-testid="audit-log-viewer">
      <h2>Audit Log</h2>
    </div>
  );
}
