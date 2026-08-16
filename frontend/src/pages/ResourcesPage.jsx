import { useState } from 'react'
import {
  ShieldCheck, Phone, Home, ClipboardCheck, HelpCircle,
  ChevronDown, MapPin
} from 'lucide-react'
import { MOCK_SHELTERS } from '../data/mockData'
import './ResourcesPage.css'

const EMERGENCY_CONTACTS = [
  { name: 'City Emergency Hotline', number: '311', desc: 'Non-life-threatening hazard reports & general assistance' },
  { name: 'Police', number: '100', desc: 'Immediate danger, crime in progress' },
  { name: 'Fire Department', number: '101', desc: 'Fire, gas leaks, rescue' },
  { name: 'Ambulance', number: '102', desc: 'Medical emergencies' },
  { name: 'Poison Control', number: '1800-222-1222', desc: '24/7 poisoning & chemical exposure help' },
  { name: 'Utility Emergency', number: '1800-233-3131', desc: 'Downed power lines, gas smell, water main breaks' },
]

const PREPAREDNESS_TIPS = [
  'Keep a 72-hour emergency kit: water, non-perishable food, flashlight, batteries, first aid.',
  'Agree on a family meeting point and an out-of-area emergency contact.',
  'Keep copies of important documents (ID, insurance, medical records) in a waterproof bag.',
  'Know your evacuation route and the nearest shelter before an emergency happens.',
  'Sign up for local alert notifications and keep your phone charged during hazard season.',
  'Store a battery- or hand-crank radio in case cell networks go down.',
]

const SAFETY_GUIDELINES = [
  { phase: 'Before', tips: [
    'Identify safe rooms and evacuation routes in your home.',
    'Assemble an emergency kit and keep it accessible.',
    'Review your family communication plan.',
  ]},
  { phase: 'During', tips: [
    "Follow official evacuation orders immediately — don't wait to see how bad it gets.",
    'Avoid low-lying areas and river paths during flood warnings.',
    'Stay off downed power lines and flooded roads.',
  ]},
  { phase: 'After', tips: [
    'Wait for an official all-clear before returning home.',
    'Document damage with photos before cleanup for insurance.',
    'Check in with your emergency contact.',
  ]},
]

const FAQS = [
  { q: 'How is alert confidence calculated?', a: 'Confidence combines sensor readings, official feeds (USGS, NWS), and crowdsourced reports — more independent sources agreeing raises the score.' },
  { q: 'Can I report a hazard anonymously?', a: 'Yes — community members can submit reports without an account, though verified accounts help responders follow up faster.' },
  { q: 'What happens after I submit a report?', a: 'It enters the verification queue, where a verifier confirms it against other sources before it becomes a public alert.' },
  { q: 'How often is shelter capacity updated?', a: 'Shelter status is refreshed by on-site coordinators — treat it as a strong estimate, not a live headcount.' },
]

const CATEGORIES = [
  { id: 'safety', icon: ShieldCheck, title: 'Safety Guidelines', desc: 'What to do before, during, and after a hazard' },
  { id: 'contacts', icon: Phone, title: 'Emergency Contacts', desc: 'Helplines & support numbers' },
  { id: 'shelters', icon: Home, title: 'Shelter Locations', desc: 'Nearest safe places and current capacity' },
  { id: 'prep', icon: ClipboardCheck, title: 'Preparedness Tips', desc: 'Stay ready, stay safe' },
  { id: 'faq', icon: HelpCircle, title: 'FAQs', desc: 'Get your answers' },
]

function ShelterCard({ shelter }) {
  const pct = Math.round((shelter.capacity / shelter.maxCapacity) * 100)

  return (
    <div className="res-shelter-card">
      <div className="res-shelter-header">
        <div>
          <p className="res-shelter-name">{shelter.name}</p>
          <p className="res-shelter-type">{shelter.type}</p>
        </div>
        <span className={`res-shelter-status res-shelter-status--${shelter.status}`}>
          {shelter.status === 'open' ? 'Open' : 'Full'}
        </span>
      </div>
      <p className="res-shelter-address"><MapPin size={12} /> {shelter.address}</p>
      <div className="res-shelter-capacity">
        <div className="res-shelter-capacity-bar">
          <div className="res-shelter-capacity-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="res-shelter-capacity-label">{shelter.capacity} / {shelter.maxCapacity} occupied</span>
      </div>
    </div>
  )
}

export default function ResourcesPage() {
  const [openId, setOpenId] = useState('safety')
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="resources-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resources &amp; Guidance</h1>
          <p className="page-subtitle">Preparedness information, contacts, and shelters for Riverdale</p>
        </div>
      </div>

      <div className="res-list">
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          const Icon = cat.icon

          return (
            <div key={cat.id} className={`res-card ${isOpen ? 'res-card--open' : ''}`}>
              <button
                className="res-card-header"
                onClick={() => setOpenId(isOpen ? null : cat.id)}
                aria-expanded={isOpen}
              >
                <span className="res-card-icon"><Icon size={18} /></span>
                <span className="res-card-heading">
                  <span className="res-card-title">{cat.title}</span>
                  <span className="res-card-desc">{cat.desc}</span>
                </span>
                <ChevronDown size={16} className="res-card-chevron" />
              </button>

              {isOpen && (
                <div className="res-card-body">
                  {cat.id === 'safety' && (
                    <div className="res-safety-grid">
                      {SAFETY_GUIDELINES.map(g => (
                        <div key={g.phase} className="res-safety-col">
                          <p className="res-safety-phase">{g.phase}</p>
                          <ul className="res-tip-list">
                            {g.tips.map(t => <li key={t}>{t}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  {cat.id === 'contacts' && (
                    <div className="res-contacts-list">
                      {EMERGENCY_CONTACTS.map(c => (
                        <div key={c.name} className="res-contact-row">
                          <div>
                            <p className="res-contact-name">{c.name}</p>
                            <p className="res-contact-desc">{c.desc}</p>
                          </div>
                          <a className="res-contact-number" href={`tel:${c.number.replace(/[^0-9]/g, '')}`}>
                            {c.number}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {cat.id === 'shelters' && (
                    <div className="res-shelters-grid">
                      {MOCK_SHELTERS.map(s => <ShelterCard key={s.id} shelter={s} />)}
                    </div>
                  )}

                  {cat.id === 'prep' && (
                    <ul className="res-tip-list res-tip-list--single">
                      {PREPAREDNESS_TIPS.map(t => <li key={t}>{t}</li>)}
                    </ul>
                  )}

                  {cat.id === 'faq' && (
                    <div className="res-faq-list">
                      {FAQS.map((f, i) => (
                        <div key={f.q} className="res-faq-item">
                          <button
                            className="res-faq-question"
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          >
                            {f.q}
                            <ChevronDown size={14} className={`res-faq-chevron ${openFaq === i ? 'res-faq-chevron--up' : ''}`} />
                          </button>
                          {openFaq === i && <p className="res-faq-answer">{f.a}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
