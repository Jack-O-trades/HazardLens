import { useNavigate } from 'react-router-dom'
import {
  BookOpen, AlertTriangle, Clock, MapPin, Zap, Camera,
  Heart, FileText, Upload, CheckCircle, XCircle, Shield,
  Lightbulb, X, ChevronRight, Users, BarChart2, MessageSquare
} from 'lucide-react'
import './CommunityReportingPage.css'

const RELATED_RESOURCES = [
  {
    Icon: AlertTriangle,
    title: 'Hazard Alerts',
    desc: 'See active alerts in your area.',
    tone: 'orange',
  },
  {
    Icon: BookOpen,
    title: 'Preparedness Guide',
    desc: 'Tips to prepare for different hazards.',
    tone: 'blue',
  },
  {
    Icon: Users,
    title: 'Community Stories',
    desc: 'How local reports make a difference.',
    tone: 'green',
  },
  {
    Icon: MessageSquare,
    title: 'Contact Alsts',
    desc: "Questions? We're here to help.",
    tone: 'red',
  },
]

const REPORT_FIELDS = [
  {
    Icon: AlertTriangle,
    title: 'What Happened',
    desc: 'A clear description of the event or hazard.',
  },
  {
    Icon: Clock,
    title: 'When',
    desc: 'Date and time it happened (or started).',
  },
  {
    Icon: MapPin,
    title: 'Where',
    desc: 'Location details—be as specific as you can.',
  },
  {
    Icon: Zap,
    title: 'Impact',
    desc: 'What you saw: damage, flooding, smoke, injuries, etc.',
  },
  {
    Icon: Camera,
    title: 'Photo / Video (if safe)',
    desc: 'Visuals help others understand the situation.',
  },
]

const HOW_TO_STEPS = [
  {
    num: '1',
    title: 'Open the AlertLocal App or Website',
    desc: 'Go to the report section.',
    Icon: Upload,
  },
  {
    num: '2',
    title: 'Fill in the Details',
    desc: 'Include what, when, where, and impact.',
    Icon: FileText,
  },
  {
    num: '3',
    title: 'Add Photos or Videos (if safe)',
    desc: 'Help others understand the situation.',
    Icon: Camera,
  },
  {
    num: '4',
    title: 'Submit',
    desc: 'Your report is reviewed and verified.',
    Icon: CheckCircle,
  },
]

const BETTER_TIPS = [
  {
    Icon: Camera,
    label: 'Photo Quality',
    text: 'Take clear, well-lit photos from a safe distance.',
  },
  {
    Icon: MapPin,
    label: 'Location Accuracy',
    text: 'Use a pin or describe landmarks, street signs, or boundaries.',
  },
  {
    Icon: Shield,
    label: 'Safety First',
    text: 'Never put yourself in danger to gather information.',
  },
]

const WHAT_TO_AVOID = [
  'Do not share rumors or unverified information.',
  'Do not include personal or sensitive details about others.',
  'Do not submit false or misleading reports.',
]

export default function CommunityReportingPage() {
  const navigate = useNavigate()

  return (
    <div className="crg-page animate-fade-in">
      <div className="crg-layout">
        {/* ── Main content ── */}
        <div className="crg-main">
          {/* Header */}
          <div className="crg-header">
            <p className="crg-eyebrow">COMMUNITY REPORTING GUIDELINES</p>
            <div className="crg-hero-row">
              <div>
                <h1 className="crg-title">Community Reporting Guidelines</h1>
                <p className="crg-subtitle">
                  Your reports help improve local awareness and keep our communities safer.<br />
                  Accurate, timely information makes a real difference.
                </p>
              </div>
              <div className="crg-hero-leaf" aria-hidden="true">
                <svg width="90" height="100" viewBox="0 0 90 100" fill="none">
                  <path d="M45 90 Q20 60 30 20 Q50 0 70 25 Q85 50 60 75 Q52 83 45 90Z" stroke="#b5c4a0" strokeWidth="1.5" fill="none" />
                  <path d="M45 90 Q45 50 45 20" stroke="#b5c4a0" strokeWidth="1" />
                  <path d="M45 65 Q35 55 30 45" stroke="#b5c4a0" strokeWidth="0.8" />
                  <path d="M45 55 Q55 47 60 38" stroke="#b5c4a0" strokeWidth="0.8" />
                  <path d="M45 45 Q38 37 35 28" stroke="#b5c4a0" strokeWidth="0.8" />
                  <path d="M45 40 Q52 35 55 28" stroke="#b5c4a0" strokeWidth="0.8" />
                </svg>
              </div>
            </div>
          </div>

          {/* Why Reports Matter */}
          <div className="crg-section-card">
            <div className="crg-section-header">
              <span className="crg-section-icon crg-section-icon--teal">
                <Heart size={20} />
              </span>
              <h2 className="crg-section-title">Why Your Reports Matter</h2>
            </div>
            <p className="crg-section-body">
              When you report what you see, hear, or experience, you help authorities and
              neighbors respond faster, make better decisions, and prevent harm.
            </p>
            <p className="crg-section-italic">
              <em>Together, we build a more aware, prepared, and resilient community.</em>
            </p>
          </div>

          {/* What to Include */}
          <div className="crg-section-card">
            <div className="crg-section-header">
              <span className="crg-section-icon crg-section-icon--teal">
                <FileText size={20} />
              </span>
              <h2 className="crg-section-title">What to Include in a Report</h2>
            </div>
            <div className="crg-report-fields">
              {REPORT_FIELDS.map((field, i) => {
                const FieldIcon = field.Icon
                return (
                  <div key={i} className="crg-report-field">
                    <span className="crg-report-field-icon">
                      <FieldIcon size={20} />
                    </span>
                    <div className="crg-report-field-title">{field.title}</div>
                    <div className="crg-report-field-desc">{field.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* How to Submit */}
          <div className="crg-section-card">
            <div className="crg-section-header">
              <span className="crg-section-icon crg-section-icon--teal">
                <Upload size={20} />
              </span>
              <h2 className="crg-section-title">How to Submit a Report</h2>
            </div>
            <div className="crg-steps-row">
              {HOW_TO_STEPS.map((step, i) => {
                const StepIcon = step.Icon
                return (
                  <div key={i} className="crg-step-col">
                    <div className="crg-step-num-row">
                      <span className="crg-step-circle">{step.num}</span>
                      {i < HOW_TO_STEPS.length - 1 && (
                        <span className="crg-step-connector" aria-hidden="true" />
                      )}
                    </div>
                    <div className="crg-step-icon">
                      <StepIcon size={20} />
                    </div>
                    <div className="crg-step-title">{step.title}</div>
                    <div className="crg-step-desc">{step.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tips + What to Avoid */}
          <div className="crg-two-col">
            {/* Tips for Better Reports */}
            <div className="crg-section-card crg-tips-card">
              <div className="crg-section-header">
                <span className="crg-section-icon crg-section-icon--amber">
                  <Lightbulb size={20} />
                </span>
                <h2 className="crg-section-title">Tips for Better Reports</h2>
              </div>
              <div className="crg-tips-list">
                {BETTER_TIPS.map((tip, i) => {
                  const TipIcon = tip.Icon
                  return (
                    <div key={i} className="crg-tip-item">
                      <TipIcon size={15} className="crg-tip-bullet" />
                      <div>
                        <span className="crg-tip-label">{tip.label}</span>
                        <span className="crg-tip-sep"> </span>
                        <span className="crg-tip-text">{tip.text}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* What to Avoid */}
            <div className="crg-section-card crg-avoid-card">
              <div className="crg-section-header">
                <span className="crg-section-icon crg-section-icon--red">
                  <XCircle size={20} />
                </span>
                <h2 className="crg-section-title">What to Avoid</h2>
              </div>
              <div className="crg-avoid-list">
                {WHAT_TO_AVOID.map((item, i) => (
                  <div key={i} className="crg-avoid-item">
                    <AlertTriangle size={14} className="crg-avoid-icon" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy & Verification */}
          <div className="crg-section-card crg-privacy-card">
            <div className="crg-section-header">
              <span className="crg-section-icon crg-section-icon--teal">
                <Shield size={20} />
              </span>
              <h2 className="crg-section-title">Privacy &amp; Verification</h2>
            </div>
            <p className="crg-section-body">
              Your reports are handled securely and confidentially. All submissions are verified before action is taken.
            </p>
            <p className="crg-section-body">
              You can choose to report anonymously.
            </p>
            <p className="crg-section-body">
              Thank you for helping keep our community safe and informed.
            </p>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="crg-sidebar">
          {/* Related Resources */}
          <div className="crg-sidebar-card">
            <div className="crg-sidebar-title">
              <BookOpen size={16} />
              Related Resources
            </div>
            <div className="crg-related-list">
              {RELATED_RESOURCES.map((res, i) => {
                const ResIcon = res.Icon
                return (
                  <div key={i} className={`crg-related-item crg-related-item--${res.tone}`}>
                    <span className={`crg-related-icon crg-related-icon--${res.tone}`}>
                      <ResIcon size={18} />
                    </span>
                    <div className="crg-related-body">
                      <span className="crg-related-title">{res.title}</span>
                      <span className="crg-related-desc">{res.desc}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quote card */}
          <div className="crg-quote-card">
            <div className="crg-quote-text-top">
              <p className="crg-quote-headline">Your voice.</p>
              <p className="crg-quote-headline">Your community. Our safety.</p>
            </div>
            <p className="crg-quote-body">
              Every accurate report helps protect lives and livelihoods.
            </p>
            {/* Landscape illustration */}
            <div className="crg-landscape">
              <svg viewBox="0 0 260 120" xmlns="http://www.w3.org/2000/svg" className="crg-landscape-svg">
                <defs>
                  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4e8f0" />
                    <stop offset="100%" stopColor="#eaf4f8" />
                  </linearGradient>
                  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a8d0df" />
                    <stop offset="100%" stopColor="#c8e4ef" />
                  </linearGradient>
                </defs>
                {/* Sky */}
                <rect width="260" height="120" fill="url(#sky)" />
                {/* Distant mountains */}
                <path d="M0 80 L40 40 L80 65 L110 30 L150 55 L190 25 L230 50 L260 35 L260 120 L0 120Z" fill="#b8cedb" />
                {/* Nearer hills */}
                <path d="M0 95 L50 70 L100 85 L150 65 L200 80 L260 60 L260 120 L0 120Z" fill="#8ab5a0" />
                {/* Water */}
                <path d="M0 105 Q65 100 130 107 Q195 113 260 105 L260 120 L0 120Z" fill="url(#water)" />
                {/* Foreground trees */}
                <rect x="8" y="82" width="5" height="20" fill="#5a8070" />
                <ellipse cx="10" cy="80" rx="8" ry="10" fill="#4a7060" />
                <rect x="18" y="78" width="4" height="24" fill="#5a8070" />
                <ellipse cx="20" cy="75" rx="7" ry="9" fill="#4a7060" />
                <rect x="230" y="78" width="5" height="22" fill="#5a8070" />
                <ellipse cx="232" cy="76" rx="8" ry="10" fill="#4a7060" />
                <rect x="242" y="80" width="4" height="20" fill="#5a8070" />
                <ellipse cx="244" cy="78" rx="6" ry="8" fill="#4a7060" />
                {/* Water reflections */}
                <path d="M30 110 Q65 108 100 110" stroke="#7ab5cc" strokeWidth="1" fill="none" opacity="0.5" />
                <path d="M150 112 Q190 110 220 113" stroke="#7ab5cc" strokeWidth="1" fill="none" opacity="0.5" />
              </svg>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
