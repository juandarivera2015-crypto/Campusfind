import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCode, useAuth } from '../auth/AuthContext';
import { Spinner } from '../components/Loading';

/**
 * Redirect URI for the classic (302) variant of the OAuth flow.
 * Expects the PKCE verifier and state stored in sessionStorage by the initiator.
 */
export default function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loadMe } = useAuth();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const expectedState = sessionStorage.getItem('cf_oauth_state');
    const verifier = sessionStorage.getItem('cf_oauth_verifier');
    sessionStorage.removeItem('cf_oauth_state');
    sessionStorage.removeItem('cf_oauth_verifier');
    if (params.get('error')) { setError(params.get('error_description') || params.get('error')); return; }
    if (!verifier || params.get('state') !== expectedState) { setError('Invalid OAuth state.'); return; }
    exchangeCode(params.get('code'), verifier).then(loadMe).then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err.message));
  }, [params, navigate, loadMe]);

  return <main className="container py-5 text-center">{error ? <p className="text-muted">{error}</p> : <Spinner />}</main>;
}
