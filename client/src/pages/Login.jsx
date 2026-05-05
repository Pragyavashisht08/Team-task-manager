import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            background: 'var(--bg-app)',
            backgroundImage: 'var(--gradient-bg)',
        }}>
            <aside style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '48px',
                background:
                    'linear-gradient(160deg, rgba(139, 92, 246, 0.18), transparent 55%),' +
                    'linear-gradient(20deg, rgba(34, 211, 238, 0.12), transparent 60%)',
                borderRight: '1px solid var(--border)',
            }} className="auth-aside">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'var(--gradient-primary-flat)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45)',
                        fontSize: '1.2rem',
                    }}>✓</div>
                    <h2 className="text-gradient" style={{ fontSize: '1.6rem', fontWeight: '800' }}>TaskFlow</h2>
                </div>

                <div className="animate-slide-up">
                    <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', marginBottom: '20px' }}>
                        Plan smart.<br />Ship together.
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '460px', lineHeight: 1.6 }}>
                        One workspace for every team you're on. Be the admin of the projects you create, a member of the ones you join.
                    </p>

                    <ul style={{ listStyle: 'none', marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            ['Lead a project', "Create a project and you're its admin — invite teammates, assign tasks, set priorities."],
                            ['Or join a team', 'Get added by email and you become a member — see assigned work and update statuses.'],
                            ['Track everything', 'Dashboard rolls up tasks across every team — totals, status, overdue, completion.'],
                            ['Multi-assignee', 'Tag one or many teammates on a single task. Everyone keeps it in their queue.'],
                        ].map(([t, d]) => (
                            <li key={t} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <span style={{
                                    flexShrink: 0,
                                    width: '24px', height: '24px', borderRadius: '6px',
                                    background: 'var(--primary-soft)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: '700', fontSize: '0.85rem', marginTop: '2px',
                                }}>✓</span>
                                <div>
                                    <strong style={{ color: 'var(--text-strong)' }}>{t}</strong>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{d}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                    © {new Date().getFullYear()} TaskFlow
                </p>
            </aside>

            <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
                <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
                    <div style={{ marginBottom: '28px' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Welcome back</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Log in to continue with your team.</p>
                    </div>

                    {error && (
                        <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.9rem', border: '1px solid rgba(220, 38, 38, 0.22)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus required />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-muted)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{ paddingRight: '64px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    style={{
                                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'transparent', color: 'var(--text-muted)',
                                        fontSize: '0.78rem', fontWeight: '600', padding: '6px 10px',
                                        borderRadius: '6px',
                                    }}
                                    aria-label={showPw ? 'Hide password' : 'Show password'}
                                >
                                    {showPw ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" style={{ marginTop: '6px', height: '48px' }} disabled={submitting}>
                            {submitting ? <span className="spinner" /> : 'Log in'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '26px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        New to TaskFlow? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '600' }}>Create an account</Link>
                    </p>
                </div>
            </section>

            <style>{`
                @media (max-width: 900px) {
                    .auth-aside { display: none; }
                    section { grid-column: 1 / -1; }
                }
            `}</style>
        </div>
    );
};

export default Login;
