export const Spinner = () => <div className="spinner-cf mx-auto" aria-label="Loading" />;

export default function LoadingOverlay({ show }) {
  return <div className={`loading-overlay${show ? ' show' : ''}`}><div className="spinner-cf" /></div>;
}
