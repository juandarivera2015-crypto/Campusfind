import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="container py-5">
      <div className="empty-state">
        <div className="empty-icon">🧭</div>
        <h4>Page not found</h4>
        <p><Link to="/">Back to the dashboard</Link></p>
      </div>
    </main>
  );
}
