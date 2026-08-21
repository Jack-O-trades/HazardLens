import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Droplets, Wind, Flame, Activity, ShieldCheck,
  Landmark, ClipboardCheck, Home, Cloud, Users, Info, FileText,
  Link2, ChevronRight, Download, Phone, CloudRain, HeartPulse,
  MessageSquare, ExternalLink, AlertCircle
} from 'lucide-react'
import './ResourcesPage.css'

// ── Category filter pills across the top of the page ──
const CATEGORY_FILTERS = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'flood', label: 'Flood', icon: Droplets },
  { id: 'cyclone', label: 'Cyclone', icon: Wind },
  { id: 'fire', label: 'Fire', icon: Flame },
  { id: 'seismic', label: 'Seismic', icon: Activity },
  { id: 'preparedness', label: 'Preparedness', icon: ShieldCheck },
  { id: 'official', label: 'Official Sources', icon: Landmark },
]

// ── Resource cards shown in the grid ──
const RESOURCE_CARDS = [
  {
    id: 'flood-checklist',
    icon: ClipboardCheck,
    iconTone: 'mint',
    title: 'Flood Preparedness Checklist',
    desc: 'Step-by-step checklist to help you and your household prepare for flooding.',
    tag: { label: 'Checklist', icon: ClipboardCheck, tone: 'blue' },
    action: 'View',
    route: '/dashboard/resources/flood-checklist',
    categories: ['flood', 'preparedness'],
  },
  {
    id: 'confidence-scores',
    icon: ShieldCheck,
    iconTone: 'blue',
    title: 'What Confidence Scores Mean',
    desc: 'Understanding alert confidence scores and how they help you make informed decisions.',
    tag: { label: 'Guide', icon: Info, tone: 'blue' },
    action: 'View',
    route: '/dashboard/resources/confidence-scores',
    categories: ['preparedness', 'official'],
  },
  {
    id: 'emergency-kit',
    icon: Home,
    iconTone: 'peach',
    title: 'Home Emergency Kit Guide',
    desc: 'A practical guide to building and maintaining an emergency kit at home.',
    tag: { label: 'Guide', icon: FileText, tone: 'red' },
    action: 'View',
    route: '/dashboard/resources/emergency-kit',
    categories: ['preparedness'],
  },
  {
    id: 'weather-sources',
    icon: Cloud,
    iconTone: 'blue',
    title: 'Official Weather Sources',
    desc: 'Trusted agencies and websites for weather forecasts and warnings.',
    tag: { label: 'Link', icon: Link2, tone: 'blue' },
    action: 'View',
    route: '/dashboard/resources/weather-sources',
    categories: ['official'],
  },
  {
    id: 'community-reporting',
    icon: Users,
    iconTone: 'green',
    title: 'Community Reporting Guidelines',
    desc: 'How to report hazards and incidents effectively in community.',
    tag: { label: 'Guide', icon: Info, tone: 'yellow' },
    action: 'View',
    route: '/dashboard/resources/community-reporting',
    categories: ['official', 'preparedness'],
  },
]

// ── Emergency contacts sidebar ──
const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', sub: '(Police, Fire,)', number: '000', icon: Phone, tone: 'red' },
  { name: 'Weather Warnings', number: '13 22 33', icon: CloudRain, tone: 'blue' },
  { name: 'Lifeline Australia', number: '13 11 14', icon: HeartPulse, tone: 'purple' },
  { name: 'Text Emergency Alerts', detail: 'Text "SAFE" to 0400 000 000', icon: MessageSquare, tone: 'orange' },
]

function ResourceCard({ card, onView }) {
  const CardIcon = card.icon
  const TagIcon = card.tag.icon

  return (
    <div className="rp2-card">
      <span className={`rp2-card-icon rp2-card-icon--${card.iconTone}`}>
        <CardIcon size={20} />
      </span>
      <h3 className="rp2-card-title">{card.title}</h3>
      <p className="rp2-card-desc">{card.desc}</p>
      <div className="rp2-card-footer">
        <span className={`rp2-tag rp2-tag--${card.tag.tone}`}>
          <TagIcon size={13} />
          {card.tag.label}
        </span>
        <button
          type="button"
          className="rp2-card-action"
          onClick={() => onView(card)}
        >
          {card.action}
          {card.action === 'Download' ? <Download size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  )
}

function EmergencyRow({ contact }) {
  const Icon = contact.icon

  return (
    <div className="rp2-emergency-row">
      <span className={`rp2-emergency-row-icon rp2-emergency-row-icon--${contact.tone}`}>
        <Icon size={16} />
      </span>
      {contact.number ? (
        <>
          <span className="rp2-emergency-row-name">
            {contact.name}
            {contact.sub ? <span className="rp2-emergency-row-sub"> {contact.sub}</span> : null}
          </span>
          <span className="rp2-emergency-row-number">{contact.number}</span>
        </>
      ) : (
        <span className="rp2-emergency-row-stack">
          <span className="rp2-emergency-row-name">{contact.name}</span>
          <span className="rp2-emergency-row-detail">{contact.detail}</span>
        </span>
      )}
    </div>
  )
}

export default function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const navigate = useNavigate()

  const visibleCards = activeFilter === 'all'
    ? RESOURCE_CARDS
    : RESOURCE_CARDS.filter(c => c.categories.includes(activeFilter))

  const handleCardAction = (card) => {
    if (card.route) {
      navigate(card.route)
    } else if (card.action === 'Download') {
      window.print()
    }
  }

  return (
    <div className="resources-page-v2 animate-fade-in">
      <div className="rp2-header">
        <h1 className="rp2-title">Resources</h1>
        <p className="rp2-subtitle">Guides, checklists, and trusted information to help you stay prepared.</p>
      </div>

      <div className="rp2-filters" role="tablist" aria-label="Resource categories">
        {CATEGORY_FILTERS.map(f => {
          const Icon = f.icon
          const isActive = activeFilter === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`rp2-filter-pill ${isActive ? 'rp2-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              <Icon size={15} />
              <span>{f.label}</span>
            </button>
          )
        })}
      </div>

      <div className="rp2-layout">
        <div className="rp2-cards-grid">
          {visibleCards.map(card => <ResourceCard key={card.id} card={card} onView={handleCardAction} />)}
          {visibleCards.length === 0 && (
            <p className="rp2-empty">No resources in this category yet.</p>
          )}
        </div>

        <aside className="rp2-sidebar">
          <div className="rp2-emergency-card">
            <div className="rp2-emergency-header">
              <span className="rp2-emergency-icon"><AlertCircle size={18} /></span>
              <h2>Emergency Contacts</h2>
            </div>

            <div className="rp2-emergency-list">
              {EMERGENCY_CONTACTS.map(c => <EmergencyRow key={c.name} contact={c} />)}
            </div>

            <div className="rp2-nonemergency-box">
              <ShieldCheck size={18} />
              <p>For non-emergency assistance, contact your local authorities.</p>
            </div>

            <a href="#" className="rp2-find-local">
              Find local contacts <ExternalLink size={13} />
            </a>
          </div>
        </aside>
      </div>

      <div className="rp2-footer">
        <span>Trusted information. Stronger communities. Better prepared.</span>
        <span>Last updated: 20 May 2025, 10:00 AM AEST</span>
      </div>
    </div>
  )
}