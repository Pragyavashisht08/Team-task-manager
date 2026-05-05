import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const STATUSES = ['Todo', 'In Progress', 'Review', 'Completed'];

const priorityStyle = (p) => {
    if (p === 'High') return { bg: 'var(--danger-soft)', color: 'var(--danger)' };
    if (p === 'Medium') return { bg: 'var(--warning-soft)', color: 'var(--warning)' };
    return { bg: 'var(--success-soft)', color: 'var(--success)' };
};

const statusStyle = (s) => {
    if (s === 'Completed') return { bg: 'var(--success-soft)', color: 'var(--success)' };
    if (s === 'In Progress') return { bg: 'var(--info-soft)', color: 'var(--info)' };
    if (s === 'Review') return { bg: 'var(--warning-soft)', color: 'var(--warning)' };
    return { bg: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)' };
};

const StatCard = ({ label, value, color, glyph, accent }) => (
    <div className="glass-card card-interactive" style={{
        padding: '22px 22px',
        position: 'relative',
        overflow: 'hidden',
        borderColor: accent ? 'var(--border-strong)' : 'var(--border)',
    }}>
        <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: '120px', height: '120px', borderRadius: '50%',
            background: color, opacity: 0.12, filter: 'blur(12px)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <span style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: `${color}1f`, color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: '700',
            }}>{glyph}</span>
        </div>
        <h3 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-strong)' }}>{value}</h3>
    </div>
);

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyTasks = async () => {
            try {
                const { data } = await api.get('/tasks/my');
                setTasks(data);
            } catch (err) {
                console.error('Error fetching tasks', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyTasks();
    }, []);

    const stats = useMemo(() => ({
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'Completed').length,
        pending: tasks.filter(t => t.status !== 'Completed').length,
        overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed').length,
    }), [tasks]);

    const byStatus = useMemo(() => {
        const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
        tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
        return counts;
    }, [tasks]);

    const recent = useMemo(() => {
        return [...tasks]
            .sort((a, b) => {
                const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                return ad - bd;
            })
            .slice(0, 6);
    }, [tasks]);

    const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <span className="spinner" style={{ marginRight: '10px' }} /> Loading your dashboard…
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                gap: '20px', flexWrap: 'wrap', marginBottom: '32px',
            }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '6px' }}>
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: '800' }}>
                        Welcome back, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>.
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                        {stats.pending > 0
                            ? `You have ${stats.pending} task${stats.pending === 1 ? '' : 's'} in flight today.`
                            : 'Inbox zero — nothing pending right now.'}
                    </p>
                </div>
                <Link to="/tasks" className="btn-secondary">View all tasks →</Link>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px', marginBottom: '28px',
            }}>
                <StatCard label="Total" value={stats.total} color="#7c3aed" glyph="✦" />
                <StatCard label="Completed" value={stats.completed} color="#059669" glyph="✓" />
                <StatCard label="Pending" value={stats.pending} color="#2563eb" glyph="◐" />
                <StatCard label="Overdue" value={stats.overdue} color="#dc2626" glyph="!" accent={stats.overdue > 0} />
            </div>

            <div style={{
                display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 360px)',
                gap: '18px', marginBottom: '28px',
            }} className="dash-grid">
                <section className="glass-card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Workload by status</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>{stats.total} task{stats.total === 1 ? '' : 's'}</span>
                    </h2>
                    {stats.total === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tasks yet — once you're assigned work, this chart will fill in.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {STATUSES.map(s => {
                                const pct = stats.total > 0 ? (byStatus[s] / stats.total) * 100 : 0;
                                const ss = statusStyle(s);
                                return (
                                    <div key={s}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                <span className="pill-dot" style={{ background: ss.color }}></span>
                                                {s}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{byStatus[s]}</span>
                                        </div>
                                        <div style={{ height: '8px', borderRadius: '999px', background: 'var(--bg-input)', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${pct}%`, height: '100%',
                                                background: ss.color,
                                                transition: 'width 0.5s ease',
                                                borderRadius: '999px',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Completion</h2>
                    <div style={{
                        position: 'relative',
                        margin: '8px auto',
                        width: '180px', height: '180px',
                        borderRadius: '50%',
                        background: `conic-gradient(var(--primary) ${completionPct * 3.6}deg, var(--bg-input) 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.6s ease',
                    }}>
                        <div style={{
                            width: '142px', height: '142px',
                            borderRadius: '50%',
                            background: 'var(--bg-elevated)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-strong)' }}>{completionPct}%</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>completed</span>
                        </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        {stats.completed} of {stats.total} task{stats.total === 1 ? '' : 's'} done
                    </p>
                </section>
            </div>

            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Upcoming tasks</h2>
                    <Link to="/tasks" style={{ color: 'var(--primary)', fontSize: '0.88rem', fontWeight: '600' }}>See all →</Link>
                </div>

                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    {recent.length === 0 ? (
                        <div style={{ padding: '60px 30px', textAlign: 'center' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '16px',
                                background: 'var(--primary-soft)', color: 'var(--primary)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.6rem', marginBottom: '14px',
                            }}>✓</div>
                            <h3 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>You're all caught up</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No tasks assigned yet. Check back when an admin assigns you work.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                        <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task</th>
                                        <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</th>
                                        <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</th>
                                        <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                        <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map(task => {
                                        const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                        const ps = priorityStyle(task.priority);
                                        const ss = statusStyle(task.status);
                                        return (
                                            <tr
                                                key={task._id}
                                                style={{
                                                    borderBottom: '1px solid var(--border)',
                                                    background: overdue ? 'rgba(244, 63, 94, 0.05)' : 'transparent',
                                                    boxShadow: overdue ? 'inset 3px 0 0 var(--danger)' : 'none',
                                                }}
                                            >
                                                <td style={{ padding: '14px 18px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-strong)' }}>{task.title}</span>
                                                        {overdue && (
                                                            <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                                                                <span className="pill-dot" style={{ background: 'var(--danger)' }} /> Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 18px', color: 'var(--text-muted)' }}>{task.project?.title || '—'}</td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    <span className="pill" style={{ background: ps.bg, color: ps.color }}>
                                                        <span className="pill-dot" style={{ background: ps.color }} /> {task.priority}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 18px' }}>
                                                    <span className="pill" style={{ background: ss.bg, color: ss.color }}>
                                                        <span className="pill-dot" style={{ background: ss.color }} /> {task.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 18px', fontSize: '0.88rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? '600' : '400' }}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <style>{`
                @media (max-width: 980px) {
                    .dash-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
