import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
    const [businessName, setBusinessName] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { signup } = useAuth();
    const navigate = useNavigate();

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
        await signup(businessName, name, email, password);
        navigate('/verify-email-pending');   // <-- ye line change ki
    } catch (err) {
        setError(err.response?.data?.error || 'Signup failed');
    }
};
    return (
        <div style={styles.wrap}>
            <form style={styles.card} onSubmit={handleSubmit}>
                <h2>Create your account</h2>
                {error && <div style={styles.error}>{error}</div>}
                <input style={styles.input} placeholder="Business name" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                <input style={styles.input} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
                <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <button style={styles.button} type="submit">Create account</button>
                <p style={styles.link}>Already have an account? <Link to="/login">Sign in</Link></p>
            </form>
        </div>
    );
}

const styles = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F4F1' },
    card: { background: '#fff', padding: 32, borderRadius: 14, width: 340, boxShadow: '0 20px 50px -20px rgba(0,0,0,.15)' },
    input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', marginBottom: 10, border: '1px solid #E7E2D8', borderRadius: 8, fontSize: 14 },
    button: { width: '100%', padding: 11, background: '#1B1A18', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
    error: { color: '#B8410F', fontSize: 13, marginBottom: 10 },
    link: { fontSize: 13, textAlign: 'center', marginTop: 12 }
};