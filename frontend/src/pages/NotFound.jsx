import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="container py-5">
      <div className="empty-state">
        <div className="empty-icon">🧭</div>
        <h4>Página no encontrada</h4>
        <p><Link to="/">Volver al inicio</Link></p>
      </div>
    </main>
  );
}
