import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { formatDate } from '../constants';
import { Spinner } from '../components/Loading';

export default function Messages() {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/v1/messages');
        setMessages(res.data);
        if (res.unread > 0) await api('/api/v1/messages/read', { method: 'POST' });
      } catch (err) {
        setError(err.message || 'Failed to load messages.');
      }
    })();
  }, []);

  let content;
  if (error) content = <p className="text-muted">{error}</p>;
  else if (!messages) content = <div className="text-center py-5"><Spinner /></div>;
  else if (messages.length === 0) {
    content = (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <h4>No messages yet</h4>
        <p>When someone contacts you about your posted objects, messages will appear here.</p>
      </div>
    );
  } else {
    content = messages.map((m) => (
      <div key={m.id} className={`msg-item${m.is_read ? '' : ' unread'}`}>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="msg-sender">{m.sender_name}{m.sender_email && <small className="text-muted"> · {m.sender_email}</small>}</div>
            <div className="msg-object">Re: <strong>{m.object_name}</strong> ({m.object_status})</div>
            <div className="msg-text">{m.message}</div>
          </div>
          <div className="msg-time">{formatDate(m.created_at)}</div>
        </div>
      </div>
    ));
  }

  return (
    <>
      <div style={{ background: 'linear-gradient(90deg,var(--primary-dark),var(--primary))', padding: '2.5rem 0' }}>
        <div className="container">
          <h2 style={{ color: '#fff', fontFamily: "'Raleway',sans-serif", fontWeight: 900, margin: 0 }}>📬 My Inbox</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0.4rem 0 0', fontSize: '0.95rem' }}>
            Messages from other students about your posted items.
          </p>
        </div>
      </div>
      <main className="container py-5">
        <div className="row justify-content-center"><div className="col-lg-8">{content}</div></div>
      </main>
    </>
  );
}
