import { useState } from 'react';
import { api } from './api';

export default function Auth({ onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await (mode === 'login' ? api.login : api.register)(email, password);
      localStorage.setItem('token', token);
      onSignedIn();
    } catch (err) {
      setError(mode === 'login' ? 'Email or password is incorrect.' : err.message || 'Could not create the account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>DocMind</h1>
        <p className="muted">Upload your documents. Ask questions. Answers come only from your files.</p>
        <label>Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                 autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
        </button>
      </form>
    </main>
  );
}
