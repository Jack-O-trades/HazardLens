import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, CloudOff, LayoutDashboard, PlusCircle, FileText } from 'lucide-react'
import './SubmissionSuccessPage.css'

export default function SubmissionSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { savedOffline = false, idempotencyKey = null } = location.state || {}
  const [reportId] = useState(() => `RPT-${Math.floor(1000 + Math.random() * 9000)}`)
  const [showContent, setShowContent] = useState(false)

  // NOTE: this page used to persist the report itself (addAlert) based on
  // location.state passed from the old multi-step flow. That's now done
  // by NewReportPage.handleUpload before it navigates here, so this page
  // is purely a confirmation screen — no second write. If you want to
  // reintroduce showing details of what was submitted (photo, hazard
  // type, etc.), pull useLocation() back in and read location.state,
  // whose current shape is { photo, hazardType, severity, description,
  // coordinates, timestamp, reportedBy }.

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="success-page">
      <div className={`success-content ${showContent ? 'success-content--visible' : ''}`}>
        {/* Animated check / offline indicator */}
        <div className="success-circle" style={savedOffline ? { borderColor: '#f59e0b', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' } : undefined}>
          {savedOffline ? <CloudOff size={48} className="success-check" /> : <CheckCircle size={48} className="success-check" />}
        </div>

        <div className="success-text">
          <h1 className="success-title">
            {savedOffline ? 'Saved Offline (Pending Sync)' : 'Report Submitted!'}
          </h1>
          <p className="success-subtitle">
            {savedOffline
              ? 'You are currently offline. Your hazard report has been saved locally on this device and will automatically sync to the server when connectivity returns.'
              : 'Your hazard report has been received and is now in the verification queue.'}
          </p>
        </div>

        <div className="success-id-card">
          <p className="success-id-label">
            {savedOffline ? 'Offline Queue Key (Pending Sync)' : 'Report Reference ID'}
          </p>
          <p className="success-id-value" style={savedOffline && idempotencyKey ? { fontSize: '1.05rem', wordBreak: 'break-all' } : undefined}>
            {savedOffline && idempotencyKey ? idempotencyKey : reportId}
          </p>
          <p className="success-id-hint">
            {savedOffline
              ? 'Stored in HazardLensOfflineDB — auto-sync will trigger once you are back online'
              : 'Keep this ID to track your report status'}
          </p>
        </div>

        <div className="success-steps-info">
          <h3>What happens next?</h3>
          <ol>
            <li>
              <span className="success-step-num">1</span>
              <div>
                <strong>{savedOffline ? 'Auto-Sync on Reconnect' : 'Verification'}</strong>
                <p>
                  {savedOffline
                    ? 'Your report is queued locally and will upload automatically as soon as internet connectivity is restored.'
                    : 'A certified safety officer will review and verify your report within 2–4 hours.'}
                </p>
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