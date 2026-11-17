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
      setAlert({ type: 'error', message: 'Las contraseñas no coinciden.' });
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
          <div className="auth-subtitle">Crea tu cuenta de estudiante</div>
          <Alert alert={alert} />
          <form onSubmit={submit} noValidate>
            {field('name', 'Nombre completo', 'text', 'Tu nombre completo', 'name')}
            {field('email', 'Correo electrónico', 'email', 'tu@universidad.edu', 'email')}
            {field('password', 'Contraseña', 'password', 'Mínimo 8 caracteres', 'new-password')}
            {field('confirm_password', 'Confirmar contraseña', 'password', 'Repite tu contraseña', 'new-password')}
            <button type="submit" className="btn-primary-cf w-100" style={{ padding: '0.75rem', fontSize: '1rem' }} disabled={busy}>Crear cuenta</button>
          </form>
          <div style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '0.8rem', color: '#aaa' }}>─── o ───</div>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
