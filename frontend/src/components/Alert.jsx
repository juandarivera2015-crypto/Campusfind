/** Inline alert. Message is rendered as text (React escapes it), never as HTML. */
export default function Alert({ alert }) {
  if (!alert) return null;
  const cls = alert.type === 'success' ? 'alert-success-cf' : 'alert-error-cf';
  return <div role="alert" className={`alert-cf ${cls} show`}>{alert.message}</div>;
}
