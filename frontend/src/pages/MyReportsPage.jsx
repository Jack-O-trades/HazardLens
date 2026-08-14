import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FileText, Search, Filter } from 'lucide-react'
import { MOCK_ALERTS } from '../data/mockData'
import AlertCard from '../components/shared/AlertCard'
import EmptyState from '../components/shared/EmptyState'
import './MyReportsPage.css'

export default function MyReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Community and Reporter: show only their own submissions
  // Verifier / Corrector / Admin: show all reports (they review all)
  const isFieldRole = user.role === 'community' || user.role === 'reporter'
  const myReports = isFieldRole
    ? MOCK_ALERTS.filter(a => a.reportedBy === user.name)
    : MOCK_ALERTS

  const filtered = myReports.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.location.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="my-reports animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{isFieldRole ? 'My Reports' : 'All Reports'}</h1>
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

      {/* Search & filters */}
      <div className="my-reports-controls">
        <div className="topbar-search" style={{ flex: 1, maxWidth: 380 }}>
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
        <div className="dashboard-filters">
          {['all', 'pending', 'verified', 'resolved', 'rejected'].map(s => (
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

      {/* Summary cards */}
      <div className="my-reports-summary">
        {[
          { label: 'Total', value: myReports.length, color: 'var(--text-muted)' },
          { label: 'Pending', value: myReports.filter(a => a.status === 'pending').length, color: 'var(--status-pending)' },
          { label: 'Verified', value: myReports.filter(a => a.status === 'verified').length, color: 'var(--status-verified)' },
          { label: 'Resolved', value: myReports.filter(a => a.status === 'resolved').length, color: 'var(--status-resolved)' },
        ].map(item => (
          <div key={item.label} className="my-reports-summary-card">
            <span className="my-reports-summary-val" style={{ color: item.color }}>{item.value}</span>
            <span className="my-reports-summary-label">{item.label}</span>
          </div>
        ))}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(alert => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      )}
    </div>
  )
}
