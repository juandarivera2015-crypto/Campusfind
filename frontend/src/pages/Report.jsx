import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { CATEGORIES, categoryLabel } from '../constants';
import Alert from '../components/Alert';
import LoadingOverlay from '../components/Loading';

const MAX_BYTES = 4 * 1024 * 1024; // Vercel Functions accept request bodies up to 4.5 MB
const today = () => new Date().toISOString().slice(0, 10);

export default function Report() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState(params.get('status') === 'found' ? 'found' : 'lost');
  const [form, setForm] = useState({ name: '', category: '', date: today(), location: '', description: '', contact_email: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef();

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setAlert({ type: 'error', message: 'Selecciona un archivo de imagen.' }); return; }
    if (f.size > MAX_BYTES) { setAlert({ type: 'error', message: 'La imagen debe pesar menos de 4 MB.' }); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.location || !form.date) {
      setAlert({ type: 'error', message: 'Completa todos los campos obligatorios.' });
      return;
    }
    const data = new FormData();
    Object.entries({ ...form, status }).forEach(([k, v]) => { if (v) data.append(k, v); });
    if (file) data.append('image', file);
    setBusy(true);
    try {
      const res = await api('/api/v1/objects', { method: 'POST', body: data });
      setAlert({ type: 'success', message: res.message });
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const req = <span style={{ color: 'var(--primary)' }}>*</span>;

  return (
    <>
      <LoadingOverlay show={busy} />
      <div style={{ background: 'linear-gradient(90deg,var(--primary-dark),var(--primary))', padding: '2.5rem 0' }}>
        <div className="container">
          <h2 style={{ color: '#fff', fontFamily: "'Raleway',sans-serif", fontWeight: 900, margin: 0 }}>📋 Reportar un objeto</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
            Completa los datos. Mientras más información des, más fácil será recuperarlo.
          </p>
        </div>
      </div>
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="mb-4 d-flex gap-2">
              <button type="button" className={`status-tab${status === 'lost' ? ' active' : ''}`} onClick={() => setStatus('lost')}>🚨 Perdí algo</button>
              <button type="button" className={`status-tab${status === 'found' ? ' active-found' : ''}`} onClick={() => setStatus('found')}>✅ Encontré algo</button>
            </div>
            <Alert alert={alert} />
            <div className="form-card">
              <form onSubmit={submit} noValidate>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label-cf" htmlFor="name">Nombre del objeto {req}</label>
                    <input id="name" className="form-control-cf" maxLength={150} required value={form.name} onChange={set('name')}
                      placeholder="Ej.: morral azul, iPhone 14, carné estudiantil…" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-cf" htmlFor="category">Categoría {req}</label>
                    <select id="category" className="form-select-cf" required value={form.category} onChange={set('category')}>
                      <option value="" disabled>Selecciona una categoría</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label-cf" htmlFor="date">Fecha {req}</label>
                    <input id="date" type="date" className="form-control-cf" required value={form.date} onChange={set('date')} />
                  </div>
                  <div className="col-12">
                    <label className="form-label-cf" htmlFor="location">Lugar {req}</label>
                    <input id="location" className="form-control-cf" maxLength={200} required value={form.location} onChange={set('location')}
                      placeholder="Ej.: biblioteca piso 2, edificio de ingeniería salón 204, cafetería principal…" />
                  </div>
                  <div className="col-12">
                    <label className="form-label-cf" htmlFor="description">Descripción {req}</label>
                    <textarea id="description" className="form-control-cf" rows={4} maxLength={5000} required value={form.description}
                      onChange={set('description')} placeholder="Describe el objeto con detalle: color, marca, marcas especiales, contenido, estado…" />
                  </div>
                  <div className="col-12">
                    <label className="form-label-cf" htmlFor="contact_email">Correo de contacto</label>
                    <input id="contact_email" type="email" className="form-control-cf" value={form.contact_email} onChange={set('contact_email')}
                      placeholder="Correo para que te contacten (por defecto, el de tu cuenta)" />
                    <small style={{ color: '#aaa', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>Déjalo vacío para usar el correo de tu cuenta.</small>
                  </div>
                  <div className="col-12">
                    <label className="form-label-cf">Foto del objeto</label>
                    <div
                      className={`img-upload-zone${drag ? ' dragover' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                    >
                      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => pick(e.target.files[0])} />
                      {preview ? (
                        <div className="img-preview-wrap" style={{ display: 'block' }}>
                          <img src={preview} alt="Vista previa" style={{ maxWidth: '100%' }} />
                          <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '0.5rem' }}>Haz clic para cambiar la imagen</div>
                        </div>
                      ) : (
                        <div className="upload-default">
                          <div className="upload-icon">📷</div>
                          <div className="upload-text">Haz clic o arrastra una imagen aquí</div>
                          <div className="upload-hint">JPG, PNG, GIF o WebP — máximo 4 MB</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-12 d-flex gap-3 justify-content-end mt-2">
                    <Link to="/" className="btn-outline-cf">Cancelar</Link>
                    <button type="submit" className="btn-primary-cf" style={{ padding: '0.65rem 2rem' }} disabled={busy}>Enviar reporte</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
