import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import LoadingOverlay from '../components/Loading';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' });
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setAlert({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const field = (id, label, type, placeholder, autoComplete) => (
    <div className={id === 'confirm_password' ? 'mb-4' : 'mb-3'}>
      <label className="form-label-cf" htmlFor={id}>{label}</label>
      <input id={id} type={type} className="form-control-cf" placeholder={placeholder} required autoComplete={autoComplete}
        value={form[id]} onChange={set(id)} />
    </div>
  );

  return (
    <div className="auth-page">
      <LoadingOverlay show={busy} />
      <div className="container px-3">
        <div className="auth-card">
          <div className="auth-logo">🔍 CampusFind</div>
          <div className="auth-subtitle">Create your student account</div>
          <Alert alert={alert} />
          <form onSubmit={submit} noValidate>
            {field('name', 'Full Name', 'text', 'Your full name', 'name')}
            {field('email', 'Email Address', 'email', 'you@university.edu', 'email')}
            {field('password', 'Password', 'password', 'At least 8 characters', 'new-password')}
            {field('confirm_password', 'Confirm Password', 'password', 'Repeat your password', 'new-password')}
            <button type="submit" className="btn-primary-cf w-100" style={{ padding: '0.75rem', fontSize: '1rem' }} disabled={busy}>Create Account</button>
          </form>
          <div style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '0.8rem', color: '#aaa' }}>─── or ───</div>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
