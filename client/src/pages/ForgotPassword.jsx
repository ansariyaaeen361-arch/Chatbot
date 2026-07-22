import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { color, globalStyles } from '../theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('sending');
    
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={s.wrap}>
        <style>{globalStyles}</style>
        <div style={s.glowTop} />
        <div style={s.glowBottom} />
        <div className="forge-card" style={s.card}>
          <div style={s.badgeSuccess}>
            <CheckIcon />
          </div>
          <h2 style={s.title}>Check your email</h2>
          <p style={s.desc}>
            If an account exists for {email}, we've sent a password reset link.
          </p>
          <Link to="/login" style={s.backLink}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <style>{globalStyles}</style>
      <div style={s.glowTop} />
      <div style={s.glowBottom} />

      <form className="forge-card" style={s.card} onSubmit={handleSubmit}>
        <div style={s.logoRow}>
          <div style={s.logoMark}>M</div>
          <div style={s.logoWordmark}>MentalForge <span style={s.logoWordmarkAccent}>AI</span></div>
        </div>

        <h2 style={s.title}>Forgot password</h2>
        <p style={s.desc}>Enter your email to receive a reset link.</p>

        {error && <div style={s.error}>{error}</div>}

        <label style={s.label}>Email</label>
        <input
          className="forge-input"
          style={s.input}
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={status === 'sending'}
        />

        <button className="forge-btn-primary" style={s.button} type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Send reset link'}
        </button>

        <Link to="/login" style={s.backLink}>Back to login</Link>
      </form>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden', padding: 24 },
  glowTop: { position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${color.accent}22, transparent 70%)`, pointerEvents: 'none' },
  glowBottom: { position: 'absolute', bottom: -200, right: -120, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${color.accentDeep}18, transparent 70%)`, pointerEvents: 'none' },

  card: { position: 'relative', background: color.surface, padding: '36px 32px 30px', borderRadius: 18, width: 360, boxSizing: 'border-box', border: `1px solid ${color.border}`, boxShadow: '0 24px 60px -24px rgba(26,27,46,.18)' },

  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 10, justifyContent: 'center' },
  logoMark: { width: 36, height: 36, borderRadius: 10, background: color.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", flex: '0 0 auto' },
  logoWordmark: { fontSize: 15.5, fontWeight: 700, color: color.ink, letterSpacing: '-0.01em', fontFamily: "'Space Grotesk', sans-serif" },
  logoWordmarkAccent: { color: color.accent },

  title: { fontSize: 19, fontWeight: 700, margin: '0 0 8px', color: color.ink, textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif" },
  desc: { fontSize: 13.5, color: color.inkSoft, lineHeight: 1.5, margin: '0 0 20px', textAlign: 'center' },

  label: { display: 'block', fontSize: 12, color: color.inkSoft, fontWeight: 600, marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink, marginBottom: 14 },

  button: { width: '100%', padding: 12, marginTop: 6, borderRadius: 9, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' },
  error: { background: color.dangerSoft, color: color.danger, fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16, fontWeight: 600 },
  backLink: { display: 'inline-block', marginTop: 16, fontSize: 12.5, color: color.inkSoft, textDecoration: 'none' },
  badgeSuccess: { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', background: color.successSoft, color: color.successText },
};