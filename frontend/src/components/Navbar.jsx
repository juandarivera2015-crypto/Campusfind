import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-campusfind sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <span className="brand-icon">🔍</span> CampusFind
        </Link>
        <button className="navbar-toggler" type="button" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>
          <span className="navbar-toggler-icon" />
        </button>
        <div className={`collapse navbar-collapse${open ? ' show' : ''}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><NavLink className="nav-link" end to="/">Dashboard</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/report">Report Object</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/messages">Messages</NavLink></li>
          </ul>
          {user ? (
            <div className="d-flex align-items-center gap-3">
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.875rem', fontWeight: 600 }}>
                👋 <span>{user.name}</span>
              </span>
              <button type="button" className="btn-nav-outline" onClick={onLogout}>Log Out</button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn-nav-outline">Log In</Link>
              <Link to="/register" className="btn-nav-solid">Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
