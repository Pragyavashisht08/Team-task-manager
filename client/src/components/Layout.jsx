import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const initials = (name = '') => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

const Layout = ({ children }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside
                className="glass-card"
                style={{
                    width: '270px',
                    margin: '20px',
                    padding: '28px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'sticky',
                    top: '20px',
                    height: 'calc(100vh - 40px)',
                }}
            >
                <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'var(--gradient-primary-flat)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                            fontSize: '1.1rem',
                        }}>✓</div>
                        <h2 className="text-gradient" style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em' }}>TaskFlow</h2>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', paddingLeft: '48px' }}>Team Management</p>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-ico">▦</span> Dashboard
                    </NavLink>
                    <NavLink to="/projects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-ico">◫</span> Projects
                    </NavLink>
                    <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <span className="nav-ico">☑</span> Tasks
                    </NavLink>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'var(--gradient-primary-flat)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: '700', fontSize: '0.9rem',
                            flexShrink: 0,
                        }}>{initials(user?.name) || '·'}</div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%' }}>Sign out</button>
                </div>
            </aside>

            <main style={{ flex: 1, padding: '40px 40px 40px 0', overflowY: 'auto', minWidth: 0 }}>
                {children}
            </main>

            <style>{`
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 11px 14px;
                    border-radius: 10px;
                    text-decoration: none;
                    color: var(--text-muted);
                    font-weight: 500;
                    font-size: 0.95rem;
                    transition: background 0.2s, color 0.2s, transform 0.15s;
                    border: 1px solid transparent;
                }
                .nav-link:hover {
                    background: var(--bg-glass);
                    color: var(--text-strong);
                    border-color: var(--border);
                }
                .nav-link.active {
                    background: var(--primary-soft);
                    color: var(--text-strong);
                    border-color: rgba(139, 92, 246, 0.35);
                    box-shadow: inset 3px 0 0 var(--primary);
                }
                .nav-ico {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 22px;
                    height: 22px;
                    color: var(--text-faint);
                    font-size: 0.95rem;
                }
                .nav-link.active .nav-ico {
                    color: var(--primary);
                }
                @media (max-width: 900px) {
                    aside { position: static !important; height: auto !important; width: auto !important; margin: 16px !important; }
                    main { padding: 16px !important; }
                }
            `}</style>
        </div>
    );
};

export default Layout;
