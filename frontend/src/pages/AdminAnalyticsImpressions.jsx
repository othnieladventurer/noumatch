import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import './AdminDashboard.css';

const API_BASE = '/api/noumatch-admin';

export default function AdminAnalyticsImpressions() {
  const navigate = useNavigate();
  const [impressions, setImpressions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');
  const [activeMenu, setActiveMenu] = useState('analytics-impressions');
  const [filters, setFilters] = useState({
    viewer_email: '',
    viewed_email: '',
    swipe_action: '',
    date_from: '',
    date_to: ''
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('admin_access');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchImpressions();
  }, []);

  const fetchImpressions = async () => {
    const token = localStorage.getItem('admin_access');
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.viewer_email) params.append('viewer_email', filters.viewer_email);
      if (filters.viewed_email) params.append('viewed_email', filters.viewed_email);
      if (filters.swipe_action) params.append('swipe_action', filters.swipe_action);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await axios.get(`${API_BASE}/analytics/impressions/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setImpressions(response.data);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('admin_access');
        localStorage.removeItem('admin_refresh');
        navigate('/admin/login');
      } else {
        setError(err.response?.data?.error || 'Failed to load impressions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (menu, path) => {
    setActiveMenu(menu);
    navigate(path);
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchImpressions();
  };

  const clearFilters = () => {
    setFilters({
      viewer_email: '',
      viewed_email: '',
      swipe_action: '',
      date_from: '',
      date_to: ''
    });
    setTimeout(() => fetchImpressions(), 100);
  };

  // Download CSV function
  const downloadCSV = () => {
    if (impressions.length === 0) {
      alert('No data to download');
      return;
    }

    // Define CSV headers
    const headers = [
      'Timestamp',
      'Viewer Name',
      'Viewer Email',
      'Viewer Location',
      'Viewed Name',
      'Viewed Email',
      'Viewed Location',
      'Feed Position',
      'Ranking Score',
      'Swipe Action',
      'Device Type'
    ];

    // Convert data to CSV rows
    const rows = impressions.map(imp => [
      new Date(imp.timestamp).toLocaleString(),
      imp.viewer_name || '',
      imp.viewer_email || '',
      imp.viewer_location || '',
      imp.viewed_name || '',
      imp.viewed_email || '',
      imp.viewed_location || '',
      imp.feed_position + 1,
      imp.ranking_score,
      imp.swipe_action === 'like' ? 'Like' : imp.swipe_action === 'pass' ? 'Pass' : 'Pending',
      imp.device_type || 'unknown'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Add BOM for UTF-8 encoding (fixes special characters)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `impressions_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download as JSON
  const downloadJSON = () => {
    if (impressions.length === 0) {
      alert('No data to download');
      return;
    }

    const jsonStr = JSON.stringify(impressions, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `impressions_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && impressions.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-danger"></div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu={activeMenu} onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="container-fluid px-4 py-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">
              <i className="fas fa-eye me-2 text-danger"></i>
              Profile Impressions Analytics
            </h2>
            <div className="btn-group">
              <button 
                className="btn btn-success btn-sm" 
                onClick={downloadCSV}
                disabled={impressions.length === 0}
              >
                <i className="fas fa-download me-1"></i> Download CSV
              </button>
              <button 
                className="btn btn-info btn-sm" 
                onClick={downloadJSON}
                disabled={impressions.length === 0}
              >
                <i className="fas fa-file-code me-1"></i> Download JSON
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          {impressions.length > 0 && (
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card bg-primary bg-opacity-10 border-0">
                  <div className="card-body text-center">
                    <h5 className="mb-0">{impressions.length}</h5>
                    <small className="text-muted">Total Impressions</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success bg-opacity-10 border-0">
                  <div className="card-body text-center">
                    <h5 className="mb-0">{impressions.filter(i => i.swipe_action === 'like').length}</h5>
                    <small className="text-muted">Total Likes</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-danger bg-opacity-10 border-0">
                  <div className="card-body text-center">
                    <h5 className="mb-0">{impressions.filter(i => i.swipe_action === 'pass').length}</h5>
                    <small className="text-muted">Total Passes</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning bg-opacity-10 border-0">
                  <div className="card-body text-center">
                    <h5 className="mb-0">
                      {impressions.length > 0 
                        ? ((impressions.filter(i => i.swipe_action === 'like').length / impressions.length) * 100).toFixed(1)
                        : 0}%
                    </h5>
                    <small className="text-muted">Conversion Rate</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label small">Viewer</label>
                  <input type="text" name="viewer_email" className="form-control" placeholder="Name or email..." value={filters.viewer_email} onChange={handleFilterChange} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Viewed</label>
                  <input type="text" name="viewed_email" className="form-control" placeholder="Name or email..." value={filters.viewed_email} onChange={handleFilterChange} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Swipe Action</label>
                  <select name="swipe_action" className="form-select" value={filters.swipe_action} onChange={handleFilterChange}>
                    <option value="">All</option>
                    <option value="like">Like</option>
                    <option value="pass">Pass</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Date From</label>
                  <input type="date" name="date_from" className="form-control" value={filters.date_from} onChange={handleFilterChange} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Date To</label>
                  <input type="date" name="date_to" className="form-control" value={filters.date_to} onChange={handleFilterChange} />
                </div>
              </div>
              <div className="mt-3">
                <button className="btn btn-danger btn-sm me-2" onClick={applyFilters}>
                  <i className="fas fa-search me-1"></i> Apply
                </button>
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  <i className="fas fa-times me-1"></i> Clear
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-sm">
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Time</th>
                      <th>Viewer</th>
                      <th>Viewed</th>
                      <th>Pos</th>
                      <th>Score</th>
                      <th>Swipe</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impressions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-5">
                          <i className="fas fa-inbox fa-2x text-muted mb-2 d-block"></i>
                          No impressions recorded yet
                        </td>
                      </tr>
                    ) : (
                      impressions.map(imp => (
                        <tr key={imp.id}>
                          <td className="text-nowrap small">
                            {new Date(imp.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <div className="fw-semibold">{imp.viewer_name}</div>
                            <div className="small text-muted">{imp.viewer_email}</div>
                            {imp.viewer_location && (
                              <div className="small text-muted">
                                <i className="fas fa-map-marker-alt me-1"></i>
                                {imp.viewer_location}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="fw-semibold">{imp.viewed_name}</div>
                            <div className="small text-muted">{imp.viewed_email}</div>
                            {imp.viewed_location && (
                              <div className="small text-muted">
                                <i className="fas fa-map-marker-alt me-1"></i>
                                {imp.viewed_location}
                              </div>
                            )}
                          </td>
                          <td className="text-center">
                            <span className="badge bg-secondary">#{imp.feed_position + 1}</span>
                          </td>
                          <td>
                            <span className={`badge ${imp.ranking_score >= 70 ? 'bg-success' : imp.ranking_score >= 40 ? 'bg-warning' : 'bg-danger'}`}>
                              {imp.ranking_score}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${imp.swipe_action === 'like' ? 'bg-success' : imp.swipe_action === 'pass' ? 'bg-danger' : 'bg-secondary'}`}>
                              {imp.swipe_action === 'like' ? <><i className="fas fa-thumbs-up me-1"></i> Like</> : imp.swipe_action === 'pass' ? <><i className="fas fa-thumbs-down me-1"></i> Pass</> : 'Pending'}
                            </span>
                          </td>
                          <td>
                            <i className={`fas ${imp.device_type === 'mobile' ? 'fa-mobile-alt' : 'fa-desktop'} me-1`}></i>
                            {imp.device_type}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}