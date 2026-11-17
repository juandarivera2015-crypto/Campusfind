import { useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';

export default function ContactModal({ obj, onClose }) {
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) { setAlert({ type: 'error', message: 'Escribe un mensaje.' }); return; }
    setSending(true);
    try {
      const res = await api('/api/v1/messages', { method: 'POST', body: { object_id: obj.id, message } });
      setAlert({ type: 'success', message: res.message });
      setTimeout(onClose, 1400);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal fade show d-block modal-cf" role="dialog" aria-modal="true" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">📩 Contactar a quien publicó</h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
          </div>
          <div className="modal-body">
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Enviando mensaje a <strong>{obj.user_name}</strong> sobre <em>{obj.name}</em>.
            </p>
            <Alert alert={alert} />
            <label className="form-label-cf" htmlFor="contact-message">Tu mensaje</label>
            <textarea id="contact-message" className="form-control-cf" rows={4} maxLength={2000} value={message}
              onChange={(e) => setMessage(e.target.value)} placeholder="Describe cómo puedes identificar o devolver este objeto…" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-cf" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn-primary-cf ms-2" disabled={sending} onClick={send}>Enviar mensaje</button>
          </div>
        </div>
      </div>
    </div>
  );
}
