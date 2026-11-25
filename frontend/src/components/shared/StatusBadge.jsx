import './StatusBadge.css'

const SEV_CONFIG = {
  critical: { label: 'Critical', cls: 'badge--critical' },
  high:     { label: 'High',     cls: 'badge--high' },
  medium:   { label: 'Medium',   cls: 'badge--medium' },
  low:      { label: 'Low',      cls: 'badge--low' },
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending Verification', cls: 'badge--pending' },
  verified: { label: 'Verified',             cls: 'badge--verified' },
  approved: { label: 'Verified',             cls: 'badge--verified' },
  resolved: { label: 'Resolved',             cls: 'badge--resolved' },
  rejected: { label: 'Rejected (Fake)',      cls: 'badge--rejected' },
}

export function SeverityBadge({ severity }) {
  const cfg = SEV_CONFIG[severity] || { label: severity, cls: '' }
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: '' }
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
}
