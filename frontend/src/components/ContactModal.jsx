import { useState } from 'react';
import { api } from '../api/client';
import Alert from './Alert';

export default function ContactModal({ obj, onClose }) {
  const [message, setMessage] = useState('');
  const [alert, setAlert] = useState(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!message.trim()) { setAlert({ type: 'error', message: 'Please type a message.' }); return; }
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
            <h5 className="modal-title">📩 Contact Poster</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Sending message to <strong>{obj.user_name}</strong> about <em>{obj.name}</em>.
            </p>
            <Alert alert={alert} />
            <label className="form-label-cf" htmlFor="contact-message">Your Message</label>
            <textarea id="contact-message" className="form-control-cf" rows={4} maxLength={2000} value={message}
              onChange={(e) => setMessage(e.target.value)} placeholder="Describe how you can identify or return this item…" />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-cf" onClick={onClose}>Cancel</button>
            <button type="button" className="btn-primary-cf ms-2" disabled={sending} onClick={send}>Send Message</button>
          </div>
        </div>
      </div>
    </div>
  );
}
