import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-cf">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="footer-brand">🔍 CampusFind</div>
            <p className="mt-2" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              Helping university students recover lost belongings since 2024.
            </p>
          </div>
          <div className="col-md-4">
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Quick Links</div>
            <div className="d-flex flex-column gap-1">
              <Link to="/">Dashboard</Link>
              <Link to="/report">Report Object</Link>
              <Link to="/messages">My Messages</Link>
            </div>
          </div>
          <div className="col-md-4">
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Developers</div>
            <div className="d-flex flex-column gap-1">
              <a href="/api/docs/" target="_blank" rel="noreferrer">API docs (Swagger)</a>
              <a href="/api/stats/docs/" target="_blank" rel="noreferrer">Stats API docs</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom text-center">
          &copy; {new Date().getFullYear()} CampusFind — University Lost &amp; Found System
        </div>
      </div>
    </footer>
  );
}
