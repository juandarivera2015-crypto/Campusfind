import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import LoadingOverlay from '../components/Loading';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [alert, setAlert] = useState(location.state?.registered
    ? { type: 'success', message: 'Account created! You can now log in.' } : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-page">
      <LoadingOverlay show={busy} />
      <div className="container px-3">
        <div className="auth-card">
          <div className="auth-logo">🔍 CampusFind</div>
          <div className="auth-subtitle">Sign in to your account</div>
          <Alert alert={alert} />
          <form onSubmit={submit} noValidate>
            <div className="mb-3">
              <label className="form-label-cf" htmlFor="email">Email Address</label>
              <input id="email" type="email" className="form-control-cf" placeholder="you@university.edu" required autoComplete="email"
                value={form.email} onChange={set('email')} />
            </div>
            <div className="mb-4">
              <label className="form-label-cf" htmlFor="password">Password</label>
              <input id="password" type="password" className="form-control-cf" placeholder="Your password" required autoComplete="current-password"
                value={form.password} onChange={set('password')} />
            </div>
            <button type="submit" className="btn-primary-cf w-100" style={{ padding: '0.75rem', fontSize: '1rem' }} disabled={busy}>Log In</button>
          </form>
          <div style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '0.8rem', color: '#aaa' }}>─── or ───</div>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
            Don&apos;t have an account? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign Up</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link to="/" style={{ color: '#aaa', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Dashboard</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
