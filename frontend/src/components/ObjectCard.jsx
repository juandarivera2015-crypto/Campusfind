import { formatDate, safeImageSrc, truncate } from '../constants';

const PinIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
const CalIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const BoxIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" /><path d="M16 3H8L4 7h16l-4-4z" /></svg>
);

/**
 * All user-supplied values are rendered as React text nodes, which are escaped.
 * (The legacy version built this card with innerHTML template strings -> stored XSS.)
 */
export default function ObjectCard({ obj, isOwner, onContact, onDelete }) {
  const img = safeImageSrc(obj.image);
  const status = obj.status === 'found' ? 'found' : 'lost';
  return (
    <div className="col-sm-6 col-lg-4 col-xl-3">
      <div className="object-card" data-testid="object-card">
        <div className="card-img-wrap">
          {img ? <img src={img} alt={obj.name} loading="lazy" /> : <div className="card-img-placeholder">📦</div>}
          <span className={`card-status-badge badge-${status}`}>{status}</span>
        </div>
        <div className="card-body-cf">
          <div className="card-title-cf">{obj.name}</div>
          <div className="card-desc">{truncate(obj.description, 90)}</div>
          <div className="card-meta">
            <div className="card-meta-item"><PinIcon /> {obj.location}</div>
            <div className="card-meta-item"><CalIcon /> {formatDate(obj.date)}</div>
            <div className="card-meta-item"><BoxIcon /> <span className="cat-badge">{obj.category}</span></div>
          </div>
          <div className="card-footer-cf">
            <span className="poster-info">By {obj.user_name}</span>
            {isOwner ? (
              <button type="button" className="btn-outline-cf" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={() => onDelete(obj)}>
                Delete
              </button>
            ) : (
              <button type="button" className="btn-primary-cf" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={() => onContact(obj)}>
                Contact
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
