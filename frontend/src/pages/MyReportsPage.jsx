import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { FileText, Search, Filter } from 'lucide-react'
import AlertCard from '../components/shared/AlertCard'
import EmptyState from '../components/shared/EmptyState'
import './MyReportsPage.css'

const STATUS_FILTERS = ['all', 'pending', 'verified', 'resolved', 'rejected']

export default function MyReportsPage({ showOnlyOwn = false }) {
  const { user } = useAuth()
  const { alerts } = useAlerts()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Community and Reporter: show only their own submissions
  // Verifier / Corrector / Admin: show all reports unless showOnlyOwn is requested
  const isFieldRole = user.role === 'community' || user.role === 'reporter'
  const myReports = (showOnlyOwn || isFieldRole)
    ? alerts.filter(a => a.reportedBy === user.name)
    : alerts

  const filtered = myReports.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.location.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const summary = [
    { label: 'Total',    tone: 'neutral',  value: myReports.length,                                     color: 'var(--text-muted)' },
    { label: 'Pending',  tone: 'pending',  value: myReports.filter(a => a.status === 'pending').length,  color: 'var(--status-pending)' },
    { label: 'Verified', tone: 'verified', value: myReports.filter(a => a.status === 'verified').length, color: 'var(--status-verified)' },
    { label: 'Resolved', tone: 'resolved', value: myReports.filter(a => a.status === 'resolved').length, color: 'var(--status-resolved)' },
  ]

  return (
    <div className="my-reports animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={22} className="my-reports-title-icon" />
            {(showOnlyOwn || isFieldRole) ? 'My Reports' : 'All Reports'}
          </h1>
          <p className="page-subtitle">
            {(showOnlyOwn || isFieldRole)
              ? `${myReports.length} report${myReports.length !== 1 ? 's' : ''} submitted by you`
              : `${myReports.length} total reports across all reporters`
            }
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/report/new')}>
          + New Report
        </button>
      </div>

      {/* Summary cards */}
      <div className="my-reports-summary">
        {summary.map(item => (
          <div
            key={item.label}
            className={`my-reports-summary-card my-reports-summary-card--${item.tone}`}
          >
            <span className="my-reports-summary-val" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="my-reports-summary-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="my-reports-controls">
        <div className="topbar-search-wrap my-reports-search">
          <Search size={15} className="topbar-search-icon" />
          <input
            id="my-reports-search"
            type="search"
            className="topbar-search-input"
            placeholder="Search my reports…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="my-reports-filter-group">
          <span className="my-reports-filter-label">
            <Filter size={13} />
            Status
          </span>
          <div className="dashboard-filters">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                id={`my-filter-${s}`}
                className={`dashboard-filter-btn ${statusFilter === s ? 'dashboard-filter-btn--active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title={myReports.length === 0 ? "No reports yet" : "No reports match your filters"}
          description={myReports.length === 0
            ? "You haven't submitted any hazard reports. Start by reporting a hazard you've observed."
            : "Try adjusting your search or filter to find your reports."}
          action={myReports.length === 0 && (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard/report/new')}>
              Submit First Report
            </button>
          )}
        />
      ) : (
        <div className="my-reports-list">
          {filtered.map(alert => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      )}
    </div>
  )
}