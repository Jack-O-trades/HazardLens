export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 2rem', gap: '0.75rem', textAlign: 'center'
    }}>
      {icon && (
        <div style={{
          fontSize: '2.5rem', marginBottom: '0.5rem',
          opacity: 0.5
        }}>{icon}</div>
      )}
      <p style={{
        fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600,
        color: 'var(--text-secondary)'
      }}>{title}</p>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  )
}
