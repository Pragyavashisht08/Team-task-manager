import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Signup = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { signup } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await signup(formData.name, formData.email, formData.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed');
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
                        Build your<br />team workspace.
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '460px', lineHeight: 1.6 }}>
                        One account, any role. No setup steps — sign up and you're ready to collaborate.
                    </p>

                    <ul style={{ listStyle: 'none', marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            ['Project Admin', "Anything you create, you own. Add teammates by email, build out tasks, manage priorities and deadlines, and delete tasks or the project itself when you're done."],
                            ['Team Member', "Anything you're added to. View tasks, see who's assigned, and move your own tasks through Todo → In Progress → Review → Completed."],
                            ['Same person, both hats', "You can be admin of Marketing and member of QA — your dashboard shows tasks across every team you belong to."],
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
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{d}</p>
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
                <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '460px', padding: '40px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>Create your account</h1>
                        <p style={{ color: 'var(--text-muted)' }}>It takes less than a minute.</p>
                    </div>

                    {error && (
                        <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px 14px', borderRadius: '10px', marginBottom: '18px', fontSize: '0.9rem', border: '1px solid rgba(220, 38, 38, 0.22)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-muted)' }}>Full name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Jane Doe" autoFocus required />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-muted)' }}>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" required />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--text-muted)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="At least 6 characters"
                                    minLength={6}
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

                        <button type="submit" className="btn-primary" style={{ marginTop: '14px', height: '48px' }} disabled={submitting}>
                            {submitting ? <span className="spinner" /> : 'Create account'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Log in</Link>
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

export default Signup;
