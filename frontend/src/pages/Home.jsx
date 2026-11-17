import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, categoryLabel } from '../constants';
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
      setError(err.status ? err.message : 'No se pudieron cargar los objetos. Verifica que la API esté en ejecución.');
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
    if (!window.confirm(`¿Eliminar "${obj.name}"?`)) return;
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
              <h1>Portal universitario de objetos perdidos</h1>
              <p className="hero-sub mt-2">Reporta lo que perdiste, revisa lo que otros encontraron y ayuda a los estudiantes a recuperar sus pertenencias, todo en un solo lugar.</p>
              <div className="d-flex gap-3 mt-4 flex-wrap">
                <Link to="/report?status=lost" className="btn-hero">Reportar pérdida</Link>
                <Link to="/report?status=found" className="btn-hero-outline">Reportar hallazgo</Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.total ?? '—'}</div><div className="stat-label">Reportes totales</div></div>
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.lost ?? '—'}</div><div className="stat-label">Objetos perdidos</div></div>
                <div className="hero-stat"><div className="stat-num" translate="no">{stats?.found ?? '—'}</div><div className="stat-label">Objetos encontrados</div></div>
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
              <label className="form-label mb-1" style={labelStyle} htmlFor="search-input">Buscar</label>
              <input id="search-input" type="text" className="form-control" maxLength={100} placeholder="🔍  Palabras clave, lugar, descripción…"
                value={filters.keyword} onChange={set('keyword')} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-category">Categoría</label>
              <select id="filter-category" className="form-select" value={filters.category} onChange={set('category')}>
                <option value="">Todas las categorías</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-location">Lugar</label>
              <input id="filter-location" type="text" className="form-control" maxLength={100} placeholder="Edificio, zona…"
                value={filters.location} onChange={set('location')} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label mb-1" style={labelStyle} htmlFor="filter-date">Fecha</label>
              <input id="filter-date" type="date" className="form-control" value={filters.date} onChange={set('date')} />
            </div>
            <div className="col-6 col-md-2">
              <button type="button" className="btn-outline-cf w-100" style={{ padding: '0.63rem' }} onClick={() => setFilters(EMPTY)}>Limpiar filtros</button>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="status-tabs">
            <button type="button" className={tabClass('')} onClick={() => setStatus('')}>Todos</button>
            <button type="button" className={tabClass('lost')} onClick={() => setStatus('lost')}>Perdidos</button>
            <button type="button" className={tabClass('found')} onClick={() => setStatus('found')}>Encontrados</button>
          </div>
          {/* translate="no": browser translators replace text nodes and React could no longer update them */}
          <span translate="no" style={{ fontSize: '0.85rem', color: '#888', fontWeight: 600 }}>
            {!loading && `${total} resultado${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="mb-3">
          <div className="section-title">Reportes recientes</div>
          <div className="section-line" />
        </div>

        <div className="row g-3">
          {error && <div className="col-12 text-center text-muted py-4">{error}</div>}
          {!error && !loading && items.length === 0 && (
            <div className="col-12">
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h4>No se encontraron objetos</h4>
                <p>Prueba con otros filtros o sé el primero en reportar uno.</p>
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
            <button type="button" className="btn-outline-cf" onClick={() => load(filters, items.length)}>Cargar más</button>
          </div>
        )}
      </main>

      {contact && <ContactModal obj={contact} onClose={() => setContact(null)} />}
    </>
  );
}
