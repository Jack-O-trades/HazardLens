import { useNavigate } from 'react-router-dom'
import { Download, Printer, Wrench, Calendar, Droplets, Battery, FileText, Phone } from 'lucide-react'
import './EmergencyKitPage.css'

const KIT_CATEGORIES = [
  {
    id: 'water',
    number: '1',
    label: 'WATER & HYDRATION',
    color: '#1e6b8a',
    iconBg: 'hsla(197,80%,30%,0.10)',
    Icon: Droplets,
    items: [
      { name: 'Drinking water', qty: '1 gal/person/day (3-day supply)' },
      { name: 'Water bottles or jugs', qty: '2–4' },
      { name: 'Water purification tablets', qty: '1 pack' },
    ],
  },
  {
    id: 'food',
    number: '2',
    label: 'FOOD & BASICS',
    color: '#2d7a4f',
    iconBg: 'hsla(145,60%,30%,0.10)',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a9 9 0 1 0 0 18A9 9 0 0 0 12 2z" />
        <path d="M12 8v4l3 3" />
        <circle cx="12" cy="12" r="3" />
        <path d="M9 9l-2-2M15 9l2-2M9 15l-2 2M15 15l2 2" />
      </svg>
    ),
    items: [
      { name: 'Non-perishable food', qty: '3-day supply' },
      { name: 'Manual can opener', qty: '1' },
      { name: 'Paper plates, cups, utensils', qty: '1 set' },
      { name: 'Plastic bags, trash bags', qty: '1 roll each' },
    ],
  },
  {
    id: 'light',
    number: '3',
    label: 'LIGHT & COMMUNICATION',
    color: '#5b4fa8',
    iconBg: 'hsla(245,50%,50%,0.10)',
    Icon: Battery,
    items: [
      { name: 'Flashlight', qty: '1' },
      { name: 'Extra batteries', qty: '1 set' },
      { name: 'Battery-powered radio', qty: '1' },
      { name: 'Extra phone charger', qty: '1' },
    ],
  },
  {
    id: 'health',
    number: '4',
    label: 'HEALTH & SAFETY',
    color: '#a04040',
    iconBg: 'hsla(0,60%,45%,0.10)',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
    items: [
      { name: 'First aid kit', qty: '1' },
      { name: 'Medications (3-day supply)', qty: 'As needed' },
      { name: 'Hand sanitizer', qty: '1 bottle' },
      { name: 'Moist towelettes', qty: '1 pack' },
    ],
  },
  {
    id: 'shelter',
    number: '5',
    label: 'SHELTER & WARMTH',
    color: '#8b6914',
    iconBg: 'hsla(42,78%,30%,0.10)',
    Icon: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 9l10-7 10 7v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    items: [
      { name: 'Blankets or sleeping bags', qty: '1 per person' },
      { name: 'Extra clothing', qty: '1 change' },
      { name: 'Plastic sheeting', qty: '1 roll' },
      { name: 'Duct tape', qty: '1 roll' },
    ],
  },
  {
    id: 'documents',
    number: '6',
    label: 'DOCUMENTS & CASH',
    color: '#b04010',
    iconBg: 'hsla(20,80%,40%,0.10)',
    Icon: FileText,
    items: [
      { name: 'Important documents\n(ID, insurance, bank info)', qty: '' },
      { name: 'Cash (small bills)', qty: '$100–$200' },
      { name: 'Local emergency contacts list', qty: '1' },
    ],
  },
]

const MAINTENANCE_TIPS = [
  {
    Icon: Calendar,
    text: 'Review your kit every 6 months.',
  },
  {
    Icon: Droplets,
    text: 'Check expiration dates on food, water, and meds.',
  },
  {
    Icon: Battery,
    text: 'Test flashlights, radios, and chargers.',
  },
  {
    Icon: FileText,
    text: 'Update documents and contacts as needed',
  },
]

export default function EmergencyKitPage() {
  const navigate = useNavigate()

  return (
    <div className="ekp-page animate-fade-in">
      {/* ── Top info bar ── */}
      <div className="ekp-info-bar">
        <span className="ekp-info-bar-text">
          ⓘ Be prepared. Be safe. Resources for emergencies in our community.
        </span>
        <div className="ekp-info-bar-actions">
          <button className="ekp-info-bar-link" onClick={() => {}}>Contact Us</button>
          <button className="ekp-info-bar-link" onClick={() => {}}>Report an Emergency</button>
          <span className="ekp-info-bar-divider">|</span>
          <Phone size={14} />
        </div>
      </div>

      {/* ── Branded nav header ── */}
      <div className="ekp-nav-header">
        <div className="ekp-brand">
          <div className="ekp-brand-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="6" fill="#1a3a5c" />
              <path d="M18 6l12 8v8l-12 8L6 22V14L18 6z" stroke="#fff" strokeWidth="1.5" fill="none" />
              <circle cx="18" cy="18" r="4" fill="#fff" />
              <path d="M18 10v4M18 22v4M10 18h4M22 18h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="ekp-brand-name">CITY &amp; COUNTY PREPAREDNESS</div>
            <div className="ekp-brand-tagline">Helping our community prepare, respond, and recover.</div>
          </div>
        </div>
        <div className="ekp-nav-actions">
          <button className="ekp-nav-btn ekp-nav-btn--primary" onClick={() => window.print()}>
            <Download size={16} />
            Download Full Guide (PDF)
          </button>
          <button className="ekp-nav-btn ekp-nav-btn--secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print
          </button>
        </div>
      </div>

      {/* ── Page title ── */}
      <div className="ekp-page-title-section">
        <h1 className="ekp-page-title">Home Emergency Kit Guide</h1>
        <p className="ekp-page-subtitle">
          A practical checklist to help your household prepare for emergencies<br />
          and stay safe at home.
        </p>
      </div>

      {/* ── Kit category grid ── */}
      <div className="ekp-kit-grid">
        {KIT_CATEGORIES.map(cat => (
          <KitCard key={cat.id} cat={cat} />
        ))}
      </div>

      {/* ── Maintenance tips bar ── */}
      <div className="ekp-maintenance-bar">
        <div className="ekp-maintenance-label">
          <span className="ekp-maintenance-icon-wrap">
            <Wrench size={18} />
          </span>
          <span className="ekp-maintenance-title">MAINTENANCE TIPS</span>
        </div>
        {MAINTENANCE_TIPS.map((tip, i) => {
          const TipIcon = tip.Icon
          return (
            <div key={i} className="ekp-maintenance-tip">
              <TipIcon size={22} className="ekp-maintenance-tip-icon" />
              <span className="ekp-maintenance-tip-text">{tip.text}</span>
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="ekp-footer">
        <span>Questions? Visit www.prepareyourcommunity.org or call (555) 123-4567</span>
        <span>This guide is a resource from your local government and community partners.</span>
      </div>
    </div>
  )
}

function KitCard({ cat }) {
  const CatIcon = cat.Icon
  return (
    <div className="ekp-kit-card">
      <div className="ekp-kit-card-header">
        <span
          className="ekp-kit-card-icon"
          style={{ background: cat.iconBg, color: cat.color }}
        >
          <CatIcon size={22} />
        </span>
        <h3 className="ekp-kit-card-title" style={{ color: cat.color }}>
          {cat.number}. {cat.label}
        </h3>
      </div>
      <div className="ekp-kit-items">
        {cat.items.map((item, i) => (
          <div key={i} className="ekp-kit-item-row">
            <span className="ekp-kit-item-name">{item.name}</span>
            {item.qty && <span className="ekp-kit-item-qty">{item.qty}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
