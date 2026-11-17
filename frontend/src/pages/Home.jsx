import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES } from '../constants';
import ObjectCard from '../components/ObjectCard';
import ContactModal from '../components/ContactModal';
import { Spinner } from '../components/Loading';

const PAGE = 20;
const EMPTY = { keyword: '', category: '', location: '', date: '', status: '' };
const labelStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#666' };

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [contact, setContact] = useState(null);
  const debounce = useRef();

  // Hero stats come from the Django microservice
  useEffect(() => {
    api('/api/stats/summary/').then(setStats).catch(() => setStats(null));
  }, []);

  const load = useCallback(async (f, offset = 0) => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/api/v1/objects', { query: { ...f, limit: PAGE, offset } });
      setItems((prev) => (offset ? [...prev, ...res.data] : res.data));
      setTotal(res.total);
    } catch (err) {
      setError(err.status ? err.message : 'Failed to load objects. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(filters), 350);
    return () => clearTimeout(debounce.current);
  }, [filters, load]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const setStatus = (s) => setFilters((f) => ({ ...f, status: s }));

  const openContact = (obj) => (user ? setContact(obj) : navigate('/login', { state: { from: '/' } }));
  const remove = async (obj) => {
    if (!window.confirm(`Delete "${obj.name}"?`)) return;
    try {
      await api(`/api/v1/objects/${obj.id}`, { method: 'DELETE' });
      setItems((list) => list.filter((o) => o.id !== obj.id));
      setTotal((t) => t - 1);
    } catch (err) { setError(err.message); }
  };

  const tabClass = (s) => {
    if (filters.status !== s) return 'status-tab';
    if (s === 'lost') return 'status-tab active';
    if (s === 'found') return 'status-tab active-found';
    return 'status-tab';
  };

  return (
    <>
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1>University Lost &amp; Found Portal</h1>
              <p className="hero-sub mt-2">Report lost items, browse found objects, and reconnect students with their belongings — all in one place.</p>
              <div className="d-flex gap-3 mt-4 flex-wrap">
                <Link to="/report?status=lost" className="btn-hero">Report Lost</Link>
                <Link to="/report?status=found" className="btn-hero-outline">Report Found</Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.total ?? '—'}</div><div className="stat-label">Total Reports</div></div>
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.lost ?? '—'}</div><div className="stat-label">Lost Items</div></div>
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.found ?? '—'}</div><div className="stat-label">Found Items</div></div>
              </div>
            </div>
            <div className="col-lg-5 text-center d-none d-lg-block">
              <div style={{ fontSize: '9rem', opacity: 0.25, lineHeight: 1, marginTop: -10 }}>🎒</div>
            </div>
          </div>
        </div>
      </section>

      <main className="container py-4">
        <div className="filter-bar">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="form-label mb-1" style={labelStyle} htmlFor="search-input">Search</label>
              <input id="search-input" type="text" className="form-control" maxLength={100} placeholder="🔍  Keywords, location, description…"
                value={filters.keyword} onChange={set('keyword')} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-category">Category</label>
              <select id="filter-category" className="form-select" value={filters.category} onChange={set('category')}>
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-location">Location</label>
              <input id="filter-location" type="text" className="form-control" maxLength={100} placeholder="Building, area…"
                value={filters.location} onChange={set('location')} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-date">Date</label>
              <input id="filter-date" type="date" className="form-control" value={filters.date} onChange={set('date')} />
            </div>
            <div className="col-6 col-md-2">
              <button type="button" className="btn-outline-cf w-100" style={{ padding: '0.63rem' }} onClick={() => setFilters(EMPTY)}>Clear Filters</button>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="status-tabs">
            <button type="button" className={tabClass('')} onClick={() => setStatus('')}>All Items</button>
            <button type="button" className={tabClass('lost')} onClick={() => setStatus('lost')}>Lost</button>
            <button type="button" className={tabClass('found')} onClick={() => setStatus('found')}>Found</button>
          </div>
          {/* translate="no": browser translators replace text nodes and React could no longer update them */}
          <span translate="no" style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600 }}>
            {!loading && `${total} result${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="mb-3">
          <div className="section-title">Recent Reports</div>
          <div className="section-line" />
        </div>

        <div className="row g-3">
          {error && <div className="col-12 text-center text-muted py-4">{error}</div>}
          {!error && !loading && items.length === 0 && (
            <div className="col-12">
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h4>No objects found</h4>
                <p>Try adjusting your filters or be the first to report one!</p>
              </div>
            </div>
          )}
          {items.map((obj) => (
            <ObjectCard key={obj.id} obj={obj} isOwner={user?.id === obj.user_id} onContact={openContact} onDelete={remove} />
          ))}
          {loading && <div className="col-12 text-center py-5"><Spinner /></div>}
        </div>

        {!loading && items.length < total && (
          <div className="text-center mt-4">
            <button type="button" className="btn-outline-cf" onClick={() => load(filters, items.length)}>Load more</button>
          </div>
        )}
      </main>

      {contact && <ContactModal obj={contact} onClose={() => setContact(null)} />}
    </>
  );
}
