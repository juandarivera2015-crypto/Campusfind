import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-cf">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="footer-brand">🔍 CampusFind</div>
            <p className="mt-2" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
              Ayudando a los estudiantes universitarios a recuperar sus pertenencias desde 2024.
            </p>
          </div>
          <div className="col-md-4">
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Enlaces rápidos</div>
            <div className="d-flex flex-column gap-1">
              <Link to="/">Inicio</Link>
              <Link to="/report">Reportar objeto</Link>
              <Link to="/messages">Mis mensajes</Link>
            </div>
          </div>
          <div className="col-md-4">
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.8rem', fontSize: '0.9rem' }}>Desarrolladores</div>
            <div className="d-flex flex-column gap-1">
              <a href="/api/docs/" target="_blank" rel="noreferrer">Documentación de la API (Swagger)</a>
              <a href="/api/stats/docs/" target="_blank" rel="noreferrer">Documentación de estadísticas</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom text-center">
          &copy; {new Date().getFullYear()} CampusFind — Sistema universitario de objetos perdidos y encontrados
        </div>
      </div>
    </footer>
  );
}
