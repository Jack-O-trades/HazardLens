import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutGrid, Droplets, Wind, Flame, Activity, ShieldCheck,
  Landmark, ClipboardCheck, Home, Cloud, Users, Info, FileText,
  Link2, ChevronRight, Download, Phone, CloudRain, HeartPulse,
  MessageSquare, ExternalLink, AlertCircle, BookOpen, Clock
} from 'lucide-react'
import './ResourcesPage.css'

/* ── Category filter pills ── */
const CATEGORY_FILTERS = [
  { id: 'all',           label: 'All Resources', icon: LayoutGrid },
  { id: 'flood',         label: 'Flood',         icon: Droplets },
  { id: 'cyclone',       label: 'Cyclone',       icon: Wind },
  { id: 'fire',          label: 'Fire',           icon: Flame },
  { id: 'seismic',       label: 'Seismic',       icon: Activity },
  { id: 'preparedness',  label: 'Preparedness',  icon: ShieldCheck },
  { id: 'official',      label: 'Official Sources', icon: Landmark },
]

/* ── Resource cards ── */
const RESOURCE_CARDS = [
  {
    id: 'flood-checklist',
    icon: ClipboardCheck,
    iconTone: 'mint',
    title: 'Flood Preparedness Checklist',
    desc: 'Step-by-step checklist to help you and your household prepare for flooding events.',
    tag: { label: 'Checklist', icon: ClipboardCheck, tone: 'blue' },
    format: 'Checklist',
    readTime: '5 min',
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
    format: 'Guide',
    readTime: '8 min',
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
    format: 'Guide',
    readTime: '12 min',
    action: 'View',
    route: '/dashboard/resources/emergency-kit',
    categories: ['preparedness'],
  },
  {
    id: 'weather-sources',
    icon: Cloud,
    iconTone: 'blue',
    title: 'Official Weather Sources',
    desc: 'Trusted agencies and websites for weather forecasts and severe weather warnings.',
    tag: { label: 'Directory', icon: Link2, tone: 'blue' },
    format: 'Hotline Directory',
    readTime: '3 min',
    action: 'View',
    route: '/dashboard/resources/weather-sources',
    categories: ['official'],
  },
  {
    id: 'community-reporting',
    icon: Users,
    iconTone: 'green',
    title: 'Community Reporting Guidelines',
    desc: 'How to report hazards and incidents effectively in community channels.',
    tag: { label: 'Guide', icon: Info, tone: 'yellow' },
    format: 'Guide',
    readTime: '6 min',
    action: 'View',
    route: '/dashboard/resources/community-reporting',
    categories: ['official', 'preparedness'],
  },
]

/* ── Emergency contacts ── */
const EMERGENCY_CONTACTS = [
  { name: 'Emergency Services', sub: '(Police, Fire, Ambulance)', number: '000', icon: Phone, tone: 'red' },
  { name: 'Weather Warnings',   number: '13 22 33',              icon: CloudRain, tone: 'blue' },
  { name: 'Lifeline Australia',  number: '13 11 14',              icon: HeartPulse, tone: 'purple' },
  { name: 'Text Emergency Alerts', detail: 'Text "SAFE" to 0400 000 000', icon: MessageSquare, tone: 'orange' },
]

/* ── Format badge color helper ── */
function formatTone(format) {
  if (format === 'Checklist') return 'green'
  if (format === 'Guide') return 'blue'
  if (format === 'Hotline Directory') return 'orange'
  return 'gray'
}

/* ── Resource Card ── */
function ResourceCard({ card, onView }) {
  const CardIcon = card.icon
  return (
    <div className="rsc-card">
      <div className="rsc-card-top">
        <span className={`rsc-card-icon rsc-card-icon--${card.iconTone}`}>
          <CardIcon size={20} />
        </span>
        <div className="rsc-card-badges">
          <span className={`rsc-format-pill rsc-format-pill--${formatTone(card.format)}`}>
            {card.format}
          </span>
          <span className="rsc-read-pill">
            <Clock size={11} />
            {card.readTime}
          </span>
        </div>
      </div>
      <h3 className="rsc-card-title">{card.title}</h3>
      <p className="rsc-card-desc">{card.desc}</p>
      <button
        type="button"
        className="rsc-card-action"
        onClick={() => onView(card)}
      >
        <span>{card.action} Resource</span>
        {card.action === 'Download' ? <Download size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  )
}

/* ── Emergency Contact Row ── */
function EmergencyRow({ contact }) {
  const Icon = contact.icon
  return (
    <div className="rsc-hotline-row">
      <span className={`rsc-hotline-icon rsc-hotline-icon--${contact.tone}`}>
        <Icon size={15} />
      </span>
      {contact.number ? (
        <>
          <span className="rsc-hotline-name">
            {contact.name}
            {contact.sub ? <span className="rsc-hotline-sub"> {contact.sub}</span> : null}
          </span>
          <a href={`tel:${contact.number.replace(/\s/g, '')}`} className="rsc-hotline-number">{contact.number}</a>
        </>
      ) : (
        <span className="rsc-hotline-stack">
          <span className="rsc-hotline-name">{contact.name}</span>
          <span className="rsc-hotline-detail">{contact.detail}</span>
        </span>
      )}
    </div>
  )
}

/* ── Main Component ── */
export default function ResourcesPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const visibleCards = RESOURCE_CARDS
    .filter(c => activeFilter === 'all' || c.categories.includes(activeFilter))
    .filter(c => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.format.toLowerCase().includes(q)
    })

  const handleCardAction = (card) => {
    if (card.route) navigate(card.route)
    else if (card.action === 'Download') window.print()
  }

  return (
    <div className="rsc-page">

      {/* ── Knowledge Search Hero ── */}
      <div className="rsc-search-hero">
        <div className="rsc-search-hero-content">
          <div className="rsc-search-hero-badge">
            <BookOpen size={14} />
            <span>EMERGENCY PREPAREDNESS ATLAS</span>
          </div>
          <h1 className="rsc-search-hero-title">Resources &amp; Emergency Guidance</h1>
          <p className="rsc-search-hero-sub">
            Search disaster preparedness guides, emergency checklists, and trusted reference materials.
          </p>
          <div className="rsc-search-bar">
            <Search size={16} className="rsc-search-icon" />
            <input
              type="text"
              className="rsc-search-input"
              placeholder="Search guides, checklists, protocols..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="rsc-search-clear" onClick={() => setSearchQuery('')}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Category Filters ── */}
      <div className="rsc-filters" role="tablist" aria-label="Resource categories">
        {CATEGORY_FILTERS.map(f => {
          const Icon = f.icon
          const isActive = activeFilter === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`rsc-filter-pill ${isActive ? 'rsc-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              <Icon size={14} />
              <span>{f.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Cards Grid ── */}
      <div className="rsc-cards-grid">
        {visibleCards.map(card => (
          <ResourceCard key={card.id} card={card} onView={handleCardAction} />
        ))}
        {visibleCards.length === 0 && (
          <div className="rsc-empty">
            <Search size={32} />
            <p>No resources match your search or filter.</p>
          </div>
        )}
      </div>

      {/* ── Emergency Helpline Strip ── */}
      <div className="rsc-helpline-strip">
        <div className="rsc-helpline-header">
          <AlertCircle size={18} />
          <h2>Emergency Contacts &amp; Hotlines</h2>
        </div>
        <div className="rsc-helpline-grid">
          {EMERGENCY_CONTACTS.map(c => <EmergencyRow key={c.name} contact={c} />)}
        </div>
        <div className="rsc-helpline-footer">
          <div className="rsc-helpline-notice">
            <ShieldCheck size={15} />
            <span>For non-emergency assistance, contact your local council or state authority.</span>
          </div>
          <a href="#" className="rsc-find-local">
            Find local contacts <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ── Page Footer ── */}
      <div className="rsc-page-footer">
        <span>Trusted information. Stronger communities. Better prepared.</span>
        <span>Last updated: 20 May 2025, 10:00 AM AEST</span>
      </div>

    </div>
  )
}
