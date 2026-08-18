import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, Search, Filter } from 'lucide-react'
import { MOCK_ALERTS } from '../data/mockData'
import AlertCard from '../components/shared/AlertCard'
import EmptyState from '../components/shared/EmptyState'
import './MyReportsPage.css'

const STATUS_FILTERS = ['all', 'pending', 'verified', 'resolved', 'rejected']

export default function MyReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Community and Reporter: show only their own submissions
  // Verifier / Corrector / Admin: show all reports (they review all)
  const isFieldRole = user.role === 'community' || user.role === 'reporter'

  // NOTE: matching on a stable identifier (user.id) rather than user.name,
  // since names aren't guaranteed unique and shouldn't be used as a key.
  // This assumes MOCK_ALERTS entries expose a matching id field
  // (reportedById) alongside the display name (reportedBy) — adjust the
  // field name here if your mock data uses a different key.
  const myReports = useMemo(() => (
    isFieldRole
      ? MOCK_ALERTS.filter(a => (a.reportedById ?? a.reportedBy) === (user.id ?? user.name))
      : MOCK_ALERTS
  ), [isFieldRole, user.id, user.name])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return myReports.filter(a => {
      const matchSearch = query === '' ||
        a.title.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query) ||
        a.reportedBy?.toLowerCase().includes(query)
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [myReports, search, statusFilter])

  const summary = useMemo(() => ([
    { label: 'Total',    tone: 'neutral',  value: myReports.length,                                     color: 'var(--text-muted)' },
    { label: 'Pending',  tone: 'pending',  value: myReports.filter(a => a.status === 'pending').length,  color: 'var(--status-pending)' },
    { label: 'Verified', tone: 'verified', value: myReports.filter(a => a.status === 'verified').length, color: 'var(--status-verified)' },
    { label: 'Resolved', tone: 'resolved', value: myReports.filter(a => a.status === 'resolved').length, color: 'var(--status-resolved)' },
    { label: 'Rejected', tone: 'rejected', value: myReports.filter(a => a.status === 'rejected').length, color: 'var(--status-rejected)' },
  ]), [myReports])

  return (
    <div className="my-reports animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={22} className="my-reports-title-icon" />
            {isFieldRole ? 'My Reports' : 'All Reports'}
          </h1>
          <p className="page-subtitle">
            {isFieldRole
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
        <div className="topbar-search my-reports-search">
          <label htmlFor="my-reports-search" className="sr-only">
            Search my reports
          </label>
          <Search size={15} className="topbar-search-icon" aria-hidden="true" />
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
            <Filter size={13} aria-hidden="true" />
            Status
          </span>
          <div className="dashboard-filters" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                id={`my-filter-${s}`}
                type="button"
                aria-pressed={statusFilter === s}
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