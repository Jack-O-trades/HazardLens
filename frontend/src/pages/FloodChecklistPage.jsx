import { useNavigate } from 'react-router-dom'
import {
  Download, ShieldCheck, Waves, Home, FileText, Users, ChevronRight,
  Droplets, AlertTriangle
} from 'lucide-react'
import './FloodChecklistPage.css'

const PHASES = [
  {
    id: 'before',
    label: 'Before a Flood',
    subtitle: 'Prepare now to reduce risk and stay protected.',
    color: '#1e6b8a',
    bg: 'hsla(197,80%,30%,0.08)',
    borderColor: 'hsla(197,80%,30%,0.18)',
    iconBg: 'hsla(197,80%,30%,0.10)',
    Icon: Home,
    items: [
      'Know your flood risk and sign up for alerts.',
      'Make an emergency plan with your household.',
      'Build or restock an emergency kit with essentials.',
      'Elevate or move important documents and valuables.',
      'Keep gutters and drains clear and maintain your property.',
    ],
  },
  {
    id: 'during',
    label: 'During a Flood',
    subtitle: 'Stay alert. Stay safe. Avoid unnecessary risks.',
    color: '#2563a8',
    bg: 'hsla(217,70%,40%,0.07)',
    borderColor: 'hsla(217,70%,40%,0.16)',
    iconBg: 'hsla(217,70%,40%,0.10)',
    Icon: Waves,
    items: [
      'Move to higher ground immediately if told to evacuate.',
      'Avoid walking or driving through floodwater.',
      'Turn off utilities if instructed and unplug appliances.',
      'Stay informed via radio, TV, or official alerts.',
      'Listen for updates and follow instructions from authorities.',
    ],
  },
  {
    id: 'after',
    label: 'After a Flood',
    subtitle: 'Return safely and take care of your recovery.',
    color: '#8b6914',
    bg: 'hsla(42,78%,30%,0.07)',
    borderColor: 'hsla(42,78%,30%,0.18)',
    iconBg: 'hsla(42,78%,30%,0.10)',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 1 0 20A10 10 0 0 1 12 2z" opacity="0" />
        <path d="M7 17c1-1 2-3 5-3s4 2 5 3" />
        <path d="M8 10c0 2 1.5 4 4 4s4-2 4-4" />
        <path d="M12 6v1" />
        <path d="M8 8l.5.5" />
        <path d="M16 8l-.5.5" />
        <ellipse cx="12" cy="10" rx="4" ry="3" />
        <path d="M9 20c1-2 2-3 3-3s2 1 3 3" />
      </svg>
    ),
    items: [
      'Wait for officials to say it is safe before returning home.',
      'Avoid floodwater and be cautious of contaminated water.',
      'Check your home for damage and take photos for insurance.',
      'Clean and disinfect everything that got wet.',
      'Seek support from local resources if you need help.',
    ],
  },
]

const QUICK_TIPS = [
  {
    Icon: Waves,
    text: 'Floodwater can be deeper than it looks. Turn around, don\'t drown.',
  },
  {
    Icon: Home,
    text: 'Even a few inches of water can cause major damage.',
  },
  {
    Icon: FileText,
    text: 'Document valuables and keep important papers in a waterproof container.',
  },
  {
    Icon: Users,
    text: 'Check in on neighbors, especially the elderly and those with disabilities.',
  },
]

const RELATED_RESOURCES = [
  {
    Icon: Waves,
    title: 'Flood Alerts & Maps',
    desc: 'View current alerts and flood risk maps.',
    href: '#',
  },
  {
    Icon: ShieldCheck,
    title: 'Emergency Kit Checklist',
    desc: 'Essential items to keep you prepared.',
    href: '#',
  },
  {
    Icon: FileText,
    title: 'Family Emergency Plan',
    desc: 'Create your plan in minutes.',
    href: '#',
  },
]

export default function FloodChecklistPage() {
  const navigate = useNavigate()

  return (
    <div className="fcp-page animate-fade-in">
      {/* ── Page Header ── */}
      <div className="fcp-page-header">
        <div className="fcp-header-left">
          <p className="fcp-eyebrow">
            <span className="fcp-eyebrow-dash" /> BE PREPARED. STAY SAFE.
          </p>
          <h1 className="fcp-title">Flood Preparedness Checklist</h1>
          <p className="fcp-subtitle">
            Practical steps to protect yourself, your family, and your property before,<br />
            during, and after a flood.
          </p>
        </div>
        <button className="fcp-download-btn" onClick={() => window.print()}>
          <Download size={16} />
          Download PDF
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="fcp-layout">
        {/* Main column */}
        <div className="fcp-main">
          {PHASES.map(phase => (
            <PhaseCard key={phase.id} phase={phase} />
          ))}
        </div>

        {/* Sidebar */}
        <aside className="fcp-sidebar">
          {/* Quick Tips */}
          <div className="fcp-sidebar-card">
            <div className="fcp-sidebar-section-title">
              <ShieldCheck size={15} />
              QUICK TIPS
            </div>
            <div className="fcp-quick-tips-list">
              {QUICK_TIPS.map((tip, i) => {
                const TipIcon = tip.Icon
                return (
                  <div key={i} className="fcp-quick-tip-item">
                    <span className="fcp-quick-tip-icon">
                      <TipIcon size={18} />
                    </span>
                    <p className="fcp-quick-tip-text">{tip.text}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Related Resources */}
          <div className="fcp-sidebar-card">
            <div className="fcp-sidebar-section-title fcp-sidebar-section-title--resources">
              <FileText size={15} />
              RELATED RESOURCES
            </div>
            <div className="fcp-related-list">
              {RELATED_RESOURCES.map((res, i) => {
                const ResIcon = res.Icon
                return (
                  <a key={i} href={res.href} className="fcp-related-item">
                    <span className="fcp-related-icon">
                      <ResIcon size={18} />
                    </span>
                    <div className="fcp-related-body">
                      <span className="fcp-related-title">{res.title}</span>
                      <span className="fcp-related-desc">{res.desc}</span>
                    </div>
                    <ChevronRight size={16} className="fcp-related-arrow" />
                  </a>
                )
              })}
            </div>
            <button className="fcp-view-all-btn" onClick={() => navigate(-1)}>
              View All Resources →
            </button>
          </div>
        </aside>
      </div>

      {/* ── Footer ── */}
      <div className="fcp-footer">
        <span className="fcp-footer-left">
          <ShieldCheck size={14} />
          Trusted information. Stronger communities. Safer tomorrows.
        </span>
        <span className="fcp-footer-right">
          Last updated: May 12, 2024 &nbsp;•&nbsp;
          <a href="#" className="fcp-footer-link">Learn more about flood safety →</a>
        </span>
      </div>
    </div>
  )
}

function PhaseCard({ phase }) {
  const PhaseIcon = phase.Icon
  return (
    <div className="fcp-phase-card" style={{ borderLeft: `4px solid ${phase.color}` }}>
      <div className="fcp-phase-header">
        <span
          className="fcp-phase-icon"
          style={{ background: phase.iconBg, color: phase.color }}
        >
          <PhaseIcon size={24} />
        </span>
        <div>
          <h2 className="fcp-phase-title" style={{ color: phase.color }}>{phase.label}</h2>
          <p className="fcp-phase-subtitle">{phase.subtitle}</p>
        </div>
      </div>
      <div className="fcp-phase-divider" />
      <ul className="fcp-checklist">
        {phase.items.map((item, i) => (
          <li key={i} className="fcp-checklist-item">
            <span className="fcp-checkbox" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
