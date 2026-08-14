import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, LayoutDashboard, PlusCircle, FileText } from 'lucide-react'
import './SubmissionSuccessPage.css'

export default function SubmissionSuccessPage() {
  const navigate = useNavigate()
  const [reportId] = useState(() => `RPT-${Math.floor(1000 + Math.random() * 9000)}`)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="success-page">
      <div className={`success-content ${showContent ? 'success-content--visible' : ''}`}>
        {/* Animated check */}
        <div className="success-circle">
          <CheckCircle size={48} className="success-check" />
        </div>

        <div className="success-text">
          <h1 className="success-title">Report Submitted!</h1>
          <p className="success-subtitle">
            Your hazard report has been received and is now in the verification queue.
          </p>
        </div>

        <div className="success-id-card">
          <p className="success-id-label">Report Reference ID</p>
          <p className="success-id-value">{reportId}</p>
          <p className="success-id-hint">Keep this ID to track your report status</p>
        </div>

        <div className="success-steps-info">
          <h3>What happens next?</h3>
          <ol>
            <li>
              <span className="success-step-num">1</span>
              <div>
                <strong>Verification</strong>
                <p>A certified safety officer will review and verify your report within 2–4 hours.</p>
              </div>
            </li>
            <li>
              <span className="success-step-num">2</span>
              <div>
                <strong>Response Assignment</strong>
                <p>If verified, a corrector will be assigned to address the hazard.</p>
              </div>
            </li>
            <li>
              <span className="success-step-num">3</span>
              <div>
                <strong>Resolution &amp; Closure</strong>
                <p>You'll be notified when the hazard is resolved and closed.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="success-actions">
          <button
            id="go-dashboard-btn"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/dashboard')}
            style={{ justifyContent: 'center' }}
          >
            <LayoutDashboard size={18} /> Go to Dashboard
          </button>
          <button
            id="new-report-btn"
            className="btn btn-ghost"
            onClick={() => navigate('/dashboard/report/new')}
          >
            <PlusCircle size={16} /> Submit Another
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => navigate('/dashboard/my-reports')}
          >
            <FileText size={16} /> My Reports
          </button>
        </div>
      </div>
    </div>
  )
}
