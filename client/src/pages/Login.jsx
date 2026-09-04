import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { color, globalStyles } from '../theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(email, password);
      navigate(data.user?.role === 'agent' ? '/livechat' : '/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      setSubmitting(false);
    }
  };

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

        <h1 style={s.title}>Welcome back</h1>
        <p style={s.subtitle}>Sign in to manage your AI assistant.</p>

        {error && <div style={s.error}>{error}</div>}

        <Field label="Email">
          <input
            className="forge-input"
            style={s.input}
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field
          label="Password"
          action={
            <Link to="/forgot-password" style={s.forgotLink}>
              Forgot password?
            </Link>
          }
        >
          <div style={s.passwordWrap}>
            <input
              className="forge-input"
              style={{ ...s.input, paddingRight: 40 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              style={s.eyeBtn}
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        <button className="forge-btn-primary" style={s.button} type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={s.link}>Don't have an account? <Link to="/signup" style={s.linkAnchor}>Sign up</Link></p>
      </form>
    </div>
  );
}

function Field({ label, children, action }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={s.labelRow}>
        <label style={s.label}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.4 20.4 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 7 11 7a20.36 20.36 0 01-3.22 4.4M14.12 14.12a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: color.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden', padding: 24 },
  glowTop: { position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${color.accent}22, transparent 70%)`, pointerEvents: 'none' },
  glowBottom: { position: 'absolute', bottom: -200, right: -120, width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, ${color.accentDeep}18, transparent 70%)`, pointerEvents: 'none' },

  card: { position: 'relative', background: color.surface, padding: '36px 32px 30px', borderRadius: 18, width: 360, boxSizing: 'border-box', border: `1px solid ${color.border}`, boxShadow: '0 24px 60px -24px rgba(26,27,46,.18)' },

  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 10},
  logoMark: { width: 36, height: 36, borderRadius: 10, background: color.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", flex: '0 0 auto' },
  logoWordmark: { fontSize: 15.5, fontWeight: 700, color: color.ink, letterSpacing: '-0.01em', fontFamily: "'Space Grotesk', sans-serif" },
  logoWordmarkAccent: { color: color.accent },

  title: { fontSize: 21, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em', color: color.ink, fontFamily: "'Space Grotesk', sans-serif" },
  subtitle: { fontSize: 13, color: color.inkSoft, margin: '0 0 22px' },

  labelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { display: 'block', fontSize: 12, color: color.inkSoft, fontWeight: 600, margin: 0 },
  forgotLink: { fontSize: 12, color: color.accentDeep, fontWeight: 600, textDecoration: 'none' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: `1px solid ${color.border}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', background: '#FBFBFD', color: color.ink },

  passwordWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, border: 'none', background: 'none', color: color.inkFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6 },

  button: { width: '100%', padding: 12, marginTop: 6, borderRadius: 9, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' },
  error: { background: color.dangerSoft, color: color.danger, fontSize: 12.5, padding: '9px 12px', borderRadius: 8, marginBottom: 16, fontWeight: 600 },
  link: { fontSize: 13, color: color.inkSoft, textAlign: 'center', marginTop: 18, marginBottom: 0 },
  linkAnchor: { color: color.accentDeep, fontWeight: 600, textDecoration: 'none' },
};
