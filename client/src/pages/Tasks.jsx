import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const STATUSES = ['Todo', 'In Progress', 'Review', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const priorityStyle = (p) => {
    if (p === 'High') return { bg: 'var(--danger-soft)', color: 'var(--danger)' };
    if (p === 'Medium') return { bg: 'var(--warning-soft)', color: 'var(--warning)' };
    return { bg: 'var(--success-soft)', color: 'var(--success)' };
};

const statusStyle = (s) => {
    if (s === 'Completed') return { bg: 'var(--success-soft)', color: 'var(--success)' };
    if (s === 'In Progress') return { bg: 'var(--info-soft)', color: 'var(--info)' };
    if (s === 'Review') return { bg: 'var(--warning-soft)', color: 'var(--warning)' };
    return { bg: 'rgba(148, 163, 184, 0.14)', color: 'var(--text-muted)' };
};

const Tasks = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [deleteTaskFor, setDeleteTaskFor] = useState(null);
    const [actionError, setActionError] = useState('');
    const [acting, setActing] = useState(false);
    const [expandedTask, setExpandedTask] = useState(null);
    const [commentDraft, setCommentDraft] = useState('');
    const [commentingId, setCommentingId] = useState(null);
    const [commentError, setCommentError] = useState('');
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        dueDate: '',
        assignedTo: [],
    });

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data } = await api.get('/projects');
                setProjects(data);
                if (data.length > 0) setSelectedProject(data[0]._id);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const fetchTasks = async (projectId) => {
        try {
            const { data } = await api.get(`/tasks/project/${projectId}`);
            setTasks(data);
        } catch (err) {
            console.error(err);
            setTasks([]);
        }
    };

    useEffect(() => {
        if (selectedProject) fetchTasks(selectedProject);
        else setTasks([]);
    }, [selectedProject]);

    const currentProject = useMemo(
        () => projects.find(p => p._id === selectedProject),
        [projects, selectedProject]
    );

    const isProjectAdmin = currentProject && currentProject.admin?._id === user?._id;

    const assignableUsers = useMemo(() => {
        if (!currentProject) return [];
        const seen = new Set();
        const list = [];
        if (currentProject.admin?._id) {
            seen.add(currentProject.admin._id);
            list.push(currentProject.admin);
        }
        (currentProject.members || []).forEach(m => {
            if (!seen.has(m._id)) {
                seen.add(m._id);
                list.push(m);
            }
        });
        return list;
    }, [currentProject]);

    const visibleTasks = useMemo(() => {
        if (statusFilter === 'All') return tasks;
        return tasks.filter(t => t.status === statusFilter);
    }, [tasks, statusFilter]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setFormError('');
        setSubmitting(true);
        try {
            await api.post('/tasks', { ...newTask, project: selectedProject, dueDate: newTask.dueDate || undefined });
            setShowModal(false);
            setNewTask({ title: '', description: '', priority: 'Medium', dueDate: '', assignedTo: [] });
            fetchTasks(selectedProject);
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create task');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleAssignee = (id) => {
        setNewTask((t) => {
            const has = t.assignedTo.includes(id);
            return { ...t, assignedTo: has ? t.assignedTo.filter(x => x !== id) : [...t.assignedTo, id] };
        });
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        try {
            const { data } = await api.put(`/tasks/${taskId}`, { status: newStatus });
            setTasks(tasks.map(t => t._id === taskId ? data : t));
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to update task');
        }
    };

    const confirmDeleteTask = async () => {
        if (!deleteTaskFor) return;
        setActionError('');
        setActing(true);
        try {
            await api.delete(`/tasks/${deleteTaskFor._id}`);
            setTasks(tasks.filter(t => t._id !== deleteTaskFor._id));
            setDeleteTaskFor(null);
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to delete task');
        } finally {
            setActing(false);
        }
    };

    const canChangeStatus = (task) => {
        if (isProjectAdmin) return true;
        const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
        return assignees.some(a => a?._id === user?._id);
    };

    const toggleComments = (taskId) => {
        setCommentError('');
        setCommentDraft('');
        setExpandedTask((prev) => (prev === taskId ? null : taskId));
    };

    const handleAddComment = async (taskId, e) => {
        if (e) e.preventDefault();
        if (!commentDraft.trim()) return;
        setCommentingId(taskId);
        setCommentError('');
        try {
            const { data } = await api.post(`/tasks/${taskId}/comments`, { body: commentDraft.trim() });
            setTasks((ts) => ts.map(t => t._id === taskId ? data : t));
            setCommentDraft('');
        } catch (err) {
            setCommentError(err.response?.data?.message || 'Failed to post comment');
        } finally {
            setCommentingId(null);
        }
    };

    const handleDeleteComment = async (taskId, commentId) => {
        try {
            const { data } = await api.delete(`/tasks/${taskId}/comments/${commentId}`);
            setTasks((ts) => ts.map(t => t._id === taskId ? data : t));
        } catch (err) {
            setCommentError(err.response?.data?.message || 'Failed to delete comment');
        }
    };

    const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '·';

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted)' }}>
                <span className="spinner" style={{ marginRight: '10px' }} /> Loading tasks…
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800' }}>Tasks</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        {currentProject ? `Working in ${currentProject.title}` : 'Select a project to view its tasks.'}
                    </p>
                </div>
                {isProjectAdmin && selectedProject && (
                    <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Task</button>
                )}
            </header>

            {actionError && (
                <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.88rem', border: '1px solid rgba(220, 38, 38, 0.22)' }}>
                    {actionError}
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project</label>
                    <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                        {projects.length === 0 && <option value="">No projects</option>}
                        {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All statuses</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="glass-card" style={{ overflow: 'hidden' }}>
                {!selectedProject ? (
                    <div style={{ padding: '60px 30px', textAlign: 'center' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'var(--secondary-soft)', color: 'var(--secondary)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem', marginBottom: '14px',
                        }}>◫</div>
                        <h3 style={{ marginBottom: '6px' }}>No project selected</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Create or join a project to manage tasks.</p>
                    </div>
                ) : visibleTasks.length === 0 ? (
                    <div style={{ padding: '60px 30px', textAlign: 'center' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'var(--primary-soft)', color: 'var(--primary)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.6rem', marginBottom: '14px',
                        }}>☑</div>
                        <h3 style={{ marginBottom: '6px' }}>{tasks.length === 0 ? 'No tasks yet' : 'Nothing matches that filter'}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {tasks.length === 0
                                ? (isProjectAdmin ? 'Click "Add Task" to create the first one.' : 'Once the admin assigns work, it will show up here.')
                                : 'Try a different status filter.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '880px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    {['Task', 'Priority', 'Status', 'Assignee', 'Due', ...(isProjectAdmin ? ['Actions'] : [])].map(h => (
                                        <th key={h} style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: '500', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleTasks.map(task => {
                                    const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                    const ps = priorityStyle(task.priority);
                                    const ss = statusStyle(task.status);
                                    const list = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
                                    const isYouAssigned = list.some(a => a?._id === user?._id);
                                    const expanded = expandedTask === task._id;
                                    const comments = task.comments || [];
                                    return (
                                        <React.Fragment key={task._id}>
                                            <tr
                                                className="task-row"
                                                style={{
                                                    borderBottom: expanded ? 'none' : '1px solid var(--border)',
                                                    background: overdue ? 'rgba(244, 63, 94, 0.05)' : (isYouAssigned ? 'var(--primary-soft)' : 'transparent'),
                                                    boxShadow: overdue ? 'inset 3px 0 0 var(--danger)' : (isYouAssigned ? 'inset 3px 0 0 var(--primary)' : 'none'),
                                                }}
                                            >
                                                <td style={{ padding: '16px 18px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--text-strong)' }}>{task.title}</span>
                                                        {overdue && (
                                                            <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                                                                <span className="pill-dot" style={{ background: 'var(--danger)' }} /> Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{task.description}</div>}
                                                    <button
                                                        onClick={() => toggleComments(task._id)}
                                                        className="btn-ghost"
                                                        style={{ marginTop: '8px', fontSize: '0.78rem', padding: '4px 10px', color: comments.length ? 'var(--primary)' : 'var(--text-muted)' }}
                                                    >
                                                        💬 {comments.length === 0 ? 'Comment' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`} {expanded ? '▲' : '▼'}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '16px 18px' }}>
                                                    <span className="pill" style={{ background: ps.bg, color: ps.color }}>
                                                        <span className="pill-dot" style={{ background: ps.color }} /> {task.priority}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px 18px' }}>
                                                    {canChangeStatus(task) ? (
                                                        <select
                                                            value={task.status}
                                                            onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                            title="Change status"
                                                            style={{
                                                                width: 'auto',
                                                                appearance: 'none',
                                                                WebkitAppearance: 'none',
                                                                backgroundColor: ss.bg,
                                                                color: ss.color,
                                                                border: `1px solid ${ss.color}40`,
                                                                borderRadius: '999px',
                                                                padding: '5px 26px 5px 12px',
                                                                fontSize: '0.72rem',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.3px',
                                                                cursor: 'pointer',
                                                                backgroundImage:
                                                                    `linear-gradient(45deg, transparent 50%, ${ss.color} 50%),` +
                                                                    `linear-gradient(135deg, ${ss.color} 50%, transparent 50%)`,
                                                                backgroundPosition: 'calc(100% - 14px) 50%, calc(100% - 9px) 50%',
                                                                backgroundSize: '5px 5px, 5px 5px',
                                                                backgroundRepeat: 'no-repeat',
                                                            }}
                                                        >
                                                            {STATUSES.map(s => <option key={s} value={s} style={{ color: 'var(--text-strong)', background: 'var(--bg-elevated)' }}>{s}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className="pill"
                                                            style={{ background: ss.bg, color: ss.color, cursor: 'help' }}
                                                            title="Only an assignee or the project admin can change status. Use Comments to ask."
                                                        >
                                                            <span className="pill-dot" style={{ background: ss.color }} /> {task.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 18px' }}>
                                                    {list.length === 0 ? (
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Unassigned</span>
                                                    ) : (() => {
                                                        const visible = list.slice(0, 3);
                                                        const extra = list.length - visible.length;
                                                        const oneAssignee = list.length === 1;
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} title={list.map(a => a._id === user?._id ? `${a.name} (you)` : a.name).join(', ')}>
                                                                <div style={{ display: 'flex' }}>
                                                                    {visible.map((a, i) => {
                                                                        const isMe = a._id === user?._id;
                                                                        return (
                                                                            <span key={a._id} style={{
                                                                                width: '26px', height: '26px', borderRadius: '50%',
                                                                                background: 'var(--gradient-primary-flat)',
                                                                                color: 'white', fontWeight: '700', fontSize: '0.7rem',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                marginLeft: i === 0 ? 0 : '-8px',
                                                                                border: isMe ? '2px solid var(--primary)' : '2px solid var(--bg-elevated)',
                                                                                outline: isMe ? '2px solid var(--bg-elevated)' : 'none',
                                                                            }}>{initials(a.name)}</span>
                                                                        );
                                                                    })}
                                                                    {extra > 0 && (
                                                                        <span style={{
                                                                            width: '26px', height: '26px', borderRadius: '50%',
                                                                            background: 'var(--bg-input)', color: 'var(--text-muted)',
                                                                            fontWeight: '700', fontSize: '0.65rem',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            marginLeft: '-8px',
                                                                            border: '2px solid var(--bg-elevated)',
                                                                        }}>+{extra}</span>
                                                                    )}
                                                                </div>
                                                                <span style={{ fontSize: '0.9rem' }}>
                                                                    {oneAssignee ? (
                                                                        <>
                                                                            {list[0].name}
                                                                            {list[0]._id === user?._id && <span style={{ color: 'var(--primary)', fontWeight: '600' }}> (you)</span>}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {list.length} assignees
                                                                            {isYouAssigned && <span style={{ color: 'var(--primary)', fontWeight: '600' }}> · incl. you</span>}
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ padding: '16px 18px', fontSize: '0.88rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)', fontWeight: overdue ? '600' : '400', whiteSpace: 'nowrap' }}>
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                                                </td>
                                                {isProjectAdmin && (
                                                    <td style={{ padding: '16px 18px' }}>
                                                        <button
                                                            onClick={() => { setDeleteTaskFor(task); setActionError(''); }}
                                                            className="btn-ghost"
                                                            style={{ color: 'var(--danger)' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                            {expanded && (
                                                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                                                    <td colSpan={isProjectAdmin ? 6 : 5} style={{ padding: '14px 18px 18px 18px' }}>
                                                        <div style={{ maxWidth: '720px' }}>
                                                            <h4 style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>Discussion</span>
                                                                <span style={{ color: 'var(--text-faint)', fontWeight: '500', textTransform: 'none', letterSpacing: 0 }}>· anyone in this project can post</span>
                                                            </h4>
                                                            {commentError && (
                                                                <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                                                                    {commentError}
                                                                </div>
                                                            )}
                                                            {comments.length > 0 && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '280px', overflowY: 'auto' }}>
                                                                    {comments.map(c => {
                                                                        const isMine = c.author?._id === user?._id;
                                                                        const canDelete = isMine || isProjectAdmin;
                                                                        return (
                                                                            <div key={c._id} style={{
                                                                                background: 'var(--bg-elevated)',
                                                                                border: '1px solid var(--border)',
                                                                                borderRadius: '10px', padding: '10px 12px',
                                                                                display: 'flex', gap: '10px', alignItems: 'flex-start',
                                                                            }}>
                                                                                <span style={{
                                                                                    width: '26px', height: '26px', borderRadius: '50%',
                                                                                    background: 'var(--gradient-primary-flat)',
                                                                                    color: 'white', fontWeight: '700', fontSize: '0.7rem',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    flexShrink: 0,
                                                                                }}>{initials(c.author?.name)}</span>
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                                                                        <strong style={{ fontSize: '0.86rem', color: 'var(--text-strong)' }}>
                                                                                            {c.author?.name || 'Unknown'}
                                                                                            {isMine && <span style={{ color: 'var(--primary)', fontWeight: '600', marginLeft: '4px' }}>· you</span>}
                                                                                        </strong>
                                                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
                                                                                            {c.createdAt ? new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '2px' }}>{c.body}</p>
                                                                                </div>
                                                                                {canDelete && (
                                                                                    <button
                                                                                        onClick={() => handleDeleteComment(task._id, c._id)}
                                                                                        className="btn-ghost"
                                                                                        style={{ color: 'var(--text-faint)', fontSize: '1rem', padding: '0 6px', lineHeight: 1 }}
                                                                                        title="Delete comment"
                                                                                    >
                                                                                        ×
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            <form onSubmit={(e) => handleAddComment(task._id, e)} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                                                <span style={{
                                                                    width: '34px', height: '38px', borderRadius: '50%',
                                                                    background: 'var(--gradient-primary-flat)',
                                                                    color: 'white', fontWeight: '700', fontSize: '0.78rem',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0, alignSelf: 'flex-start',
                                                                    height: '34px',
                                                                }}>{initials(user?.name)}</span>
                                                                <input
                                                                    type="text"
                                                                    value={commentDraft}
                                                                    onChange={(e) => setCommentDraft(e.target.value)}
                                                                    placeholder={comments.length === 0
                                                                        ? (canChangeStatus(task) ? 'Share an update or note…' : 'Ask the admin to reassign or share progress…')
                                                                        : 'Reply…'}
                                                                    maxLength={2000}
                                                                    style={{ background: 'var(--bg-elevated)', flex: 1 }}
                                                                />
                                                                <button type="submit" className="btn-primary" disabled={commentingId === task._id || !commentDraft.trim()} style={{ padding: '0 18px' }}>
                                                                    {commentingId === task._id ? <span className="spinner" /> : 'Post'}
                                                                </button>
                                                            </form>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                .task-row { transition: background 0.15s ease; }
                .task-row:hover { background: var(--bg-glass) !important; }
            `}</style>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 20px', overflowY: 'auto' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '40px' }}>
                        <h2 style={{ marginBottom: '20px' }}>New Task</h2>
                        {formError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{formError}</div>}
                        <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Title</label>
                                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                                <textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Optional description" rows="3" style={{ resize: 'vertical' }}></textarea>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Assign to {newTask.assignedTo.length > 0 && <span style={{ color: 'var(--primary)', fontWeight: '600' }}>· {newTask.assignedTo.length} selected</span>}
                                    </label>
                                    {newTask.assignedTo.length > 0 && (
                                        <button type="button" onClick={() => setNewTask({ ...newTask, assignedTo: [] })} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '4px 8px' }}>
                                            Clear
                                        </button>
                                    )}
                                </div>
                                {assignableUsers.length === 0 ? (
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>No teammates yet — add members to this project first.</p>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                                        {assignableUsers.map(u => {
                                            const checked = newTask.assignedTo.includes(u._id);
                                            return (
                                                <label
                                                    key={u._id}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                        padding: '8px 10px', borderRadius: '10px',
                                                        border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: checked ? 'var(--primary-soft)' : 'var(--bg-elevated)',
                                                        cursor: 'pointer', fontSize: '0.85rem',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleAssignee(u._id)}
                                                        style={{ width: 'auto', accentColor: 'var(--primary)' }}
                                                    />
                                                    <span style={{
                                                        width: '22px', height: '22px', borderRadius: '50%',
                                                        background: 'var(--gradient-primary-flat)',
                                                        color: 'white', fontWeight: '700', fontSize: '0.65rem',
                                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>{initials(u.name)}</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {u.name}{u._id === user?._id ? ' (Me)' : ''}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Priority</label>
                                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Due Date</label>
                                    <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>{submitting ? 'Adding...' : 'Add Task'}</button>
                                <button type="button" onClick={() => { setShowModal(false); setFormError(''); }} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteTaskFor && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '40px 20px', overflowY: 'auto' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
                        <h2 style={{ marginBottom: '10px' }}>Delete task?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            <strong>{deleteTaskFor.title}</strong> will be permanently removed.
                        </p>
                        {actionError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{actionError}</div>}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={confirmDeleteTask} className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} disabled={acting}>{acting ? 'Deleting...' : 'Delete'}</button>
                            <button onClick={() => setDeleteTaskFor(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
