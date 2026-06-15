import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar';
import AdminTopNav from '../components/AdminTopNav';
import AdminPageSpinner from '../components/AdminPageSpinner';
import './AdminDashboard.css';
import { adminRequest, getAdminApiBase, getAdminAuthToken } from '../utils/adminApi';

const API_BASE = getAdminApiBase();

const TABS = [
  { key: 'likes', label: 'Likes', icon: 'fas fa-heart' },
  { key: 'matches', label: 'Matchs', icon: 'fas fa-handshake' },
  { key: 'blocks', label: 'Blocages', icon: 'fas fa-ban' },
];

const PILL = {
  display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
  borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
};

function UserCell({ user }) {
  return (
    <div>
      <div style={{ fontWeight: 600, color: '#1A1A2E', fontSize: '0.85rem' }}>{user.name}</div>
      <div style={{ color: '#999', fontSize: '0.75rem' }}>{user.email}</div>
    </div>
  );
}

function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, padding: '12px 0 0' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #E8E5DF', background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: '#666' }}
      >
        <i className="fas fa-chevron-left" />
      </button>
      <span style={{ fontSize: '0.82rem', color: '#666' }}>
        {page} / {pages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        style={{ padding: '4px 10px', borderRadius: 999, border: '1px solid #E8E5DF', background: '#fff', cursor: page >= pages ? 'not-allowed' : 'pointer', color: '#666' }}
      >
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}

export default function AdminInteractions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('likes');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ count: 0, pages: 1, results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [darkMode]);

  const fetchData = useCallback(async (tab, pg, q) => {
    const token = getAdminAuthToken();
    if (!token) { navigate('/admin/login'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await adminRequest({
        method: 'get',
        url: `${API_BASE}/interactions/${tab}/`,
        params: { page: pg, limit: 20, search: q },
      });
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/admin/login');
      } else {
        setError('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData(activeTab, page, search);
  }, [activeTab, page, fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(activeTab, 1, search);
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setData({ count: 0, pages: 1, results: [] });
  };

  const handleMenuClick = (_menu, path) => navigate(path);

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const colCount = activeTab === 'blocks' ? 3 : 4;

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeMenu="interactions" onMenuClick={handleMenuClick} />
      <main className="admin-main">
        <AdminTopNav darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="admin-page-shell">
          <div className="admin-page-header">
            <div className="admin-page-header-copy">
              <h2 className="admin-page-title">
                <i className="fas fa-network-wired me-2 text-danger" />
                Interactions utilisateurs
              </h2>
              <p className="admin-page-subtitle">Qui a aimé, matché ou bloqué qui.</p>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                style={{
                  padding: '8px 20px', borderRadius: 999, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  background: activeTab === t.key ? '#FF2D55' : '#fff',
                  color: activeTab === t.key ? '#fff' : '#666',
                  boxShadow: activeTab === t.key
                    ? '0 2px 8px rgba(255,45,85,0.3)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                  outline: 'none',
                }}
              >
                <i className={`${t.icon} me-2`} />{t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              className="form-control"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <button
              type="submit"
              style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#FF2D55', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-search me-1" /> Chercher
            </button>
          </form>

          {/* Table */}
          <div className="recent-blocks-card admin-section" style={{ margin: 0 }}>
            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {loading ? (
                <AdminPageSpinner label="Chargement..." />
              ) : (
                <div className="table-responsive">
                  <table className="table admin-table">
                    <thead>
                      <tr>
                        {activeTab === 'likes' && (<><th>De</th><th>À</th><th>Type</th><th>Date</th></>)}
                        {activeTab === 'matches' && (<><th>Utilisateur 1</th><th>Utilisateur 2</th><th>Conversation</th><th>Date</th></>)}
                        {activeTab === 'blocks' && (<><th>Bloqueur</th><th>Bloqué</th><th>Date</th></>)}
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.length === 0 ? (
                        <tr>
                          <td colSpan={colCount} className="text-center py-5">
                            <div className="admin-empty-state">
                              <i className="fas fa-inbox" />
                              <span>Aucun résultat.</span>
                            </div>
                          </td>
                        </tr>
                      ) : data.results.map((row) => (
                        <tr key={row.id}>
                          {activeTab === 'likes' && (
                            <>
                              <td><UserCell user={row.from_user} /></td>
                              <td><UserCell user={row.to_user} /></td>
                              <td>
                                <span style={{
                                  ...PILL,
                                  background: row.type === 'coup_de_coeur' ? 'rgba(139,48,201,0.1)' : 'rgba(255,45,85,0.1)',
                                  color: row.type === 'coup_de_coeur' ? '#8B30C9' : '#FF2D55',
                                }}>
                                  {row.type === 'coup_de_coeur' ? '💜 Coup de Coeur' : '❤️ Like'}
                                </span>
                              </td>
                              <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                            </>
                          )}
                          {activeTab === 'matches' && (
                            <>
                              <td><UserCell user={row.user1} /></td>
                              <td><UserCell user={row.user2} /></td>
                              <td>
                                <span style={{
                                  ...PILL,
                                  background: row.has_messages ? 'rgba(30,125,72,0.1)' : 'rgba(200,200,200,0.2)',
                                  color: row.has_messages ? '#1E7D48' : '#888',
                                }}>
                                  {row.has_messages ? '✓ Messagé' : 'Pas encore'}
                                </span>
                              </td>
                              <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                            </>
                          )}
                          {activeTab === 'blocks' && (
                            <>
                              <td><UserCell user={row.blocker} /></td>
                              <td><UserCell user={row.blocked} /></td>
                              <td style={{ color: '#666', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination page={page} pages={data.pages} onPage={setPage} />
              {!loading && data.count > 0 && (
                <div style={{ color: '#999', fontSize: '0.78rem', marginTop: 8 }}>
                  {data.count} résultat{data.count !== 1 ? 's' : ''} au total
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
