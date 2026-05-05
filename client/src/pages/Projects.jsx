import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'var(--overlay)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 1000, padding: '40px 20px', overflowY: 'auto',
};

const Projects = () => {
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', description: '' });
    const [createError, setCreateError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [addMemberFor, setAddMemberFor] = useState(null); // project object
    const [addMemberEmail, setAddMemberEmail] = useState('');
    const [addMemberError, setAddMemberError] = useState('');
    const [adding, setAdding] = useState(false);

    const [removeMemberFor, setRemoveMemberFor] = useState(null); // { projectId, userId, name }
    const [deleteProjectFor, setDeleteProjectFor] = useState(null); // project object
    const [actionError, setActionError] = useState('');
    const [acting, setActing] = useState(false);

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/projects');
            setProjects(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setCreateError('');
        setSubmitting(true);
        try {
            await api.post('/projects', newProject);
            setShowCreate(false);
            setNewProject({ title: '', description: '' });
            fetchProjects();
        } catch (err) {
            setCreateError(err.response?.data?.message || 'Failed to create project');
        } finally {
            setSubmitting(false);
        }
    };

    const openAddMember = (project) => {
        setAddMemberFor(project);
        setAddMemberEmail('');
        setAddMemberError('');
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!addMemberFor) return;
        setAddMemberError('');
        setAdding(true);
        try {
            await api.post(`/projects/${addMemberFor._id}/members`, { email: addMemberEmail });
            setAddMemberFor(null);
            setAddMemberEmail('');
            fetchProjects();
        } catch (err) {
            setAddMemberError(err.response?.data?.message || 'Failed to add member');
        } finally {
            setAdding(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!removeMemberFor) return;
        setActionError('');
        setActing(true);
        try {
            await api.delete(`/projects/${removeMemberFor.projectId}/members/${removeMemberFor.userId}`);
            setRemoveMemberFor(null);
            fetchProjects();
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to remove member');
        } finally {
            setActing(false);
        }
    };

    const confirmDeleteProject = async () => {
        if (!deleteProjectFor) return;
        setActionError('');
        setActing(true);
        try {
            await api.delete(`/projects/${deleteProjectFor._id}`);
            setDeleteProjectFor(null);
            fetchProjects();
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to delete project');
        } finally {
            setActing(false);
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

    const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '·';
    const accentColors = ['#8b5cf6', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#60a5fa'];
    const accentFor = (id = '') => accentColors[(id.charCodeAt?.(id.length - 1) || 0) % accentColors.length];

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '800' }}>Projects</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Manage your workspace and collaborators.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Project</button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {projects.length === 0 ? (
                    <div className="glass-card" style={{ padding: '64px 30px', textAlign: 'center', gridColumn: '1/-1' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '18px',
                            background: 'var(--primary-soft)', color: 'var(--primary)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.8rem', marginBottom: '16px',
                        }}>◫</div>
                        <h3 style={{ marginBottom: '6px' }}>No projects yet</h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Create a project to start organizing your team — you'll be its admin.
                            Or wait for someone to add you to theirs.
                        </p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ marginTop: '20px' }}>+ New Project</button>
                    </div>
                ) : (
                    projects.map(project => {
                        const isOwner = project.admin?._id === user?._id;
                        const accent = accentFor(project._id);
                        return (
                            <div key={project._id} className="glass-card card-interactive" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0 }}>
                                        <div style={{
                                            width: '42px', height: '42px', borderRadius: '11px',
                                            background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                                            color: 'white', fontWeight: '700', fontSize: '1rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, boxShadow: `0 6px 18px ${accent}55`,
                                        }}>{initials(project.title)}</div>
                                        <div style={{ minWidth: 0 }}>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '4px' }}>{project.title}</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {project.description || 'No description.'}
                                            </p>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={() => { setDeleteProjectFor(project); setActionError(''); }}
                                            className="btn-ghost"
                                            style={{ color: 'var(--danger)', flexShrink: 0 }}
                                            title="Delete project"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                                            Team · {project.members?.length || 0}
                                        </h4>
                                        {isOwner && (
                                            <button onClick={() => openAddMember(project)} className="btn-ghost" style={{ color: 'var(--primary)' }}>
                                                + Add Member
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                        {project.members?.length ? project.members.map(m => {
                                            const mAccent = accentFor(m._id);
                                            return (
                                                <div
                                                    key={m._id}
                                                    title={m.email}
                                                    style={{
                                                        background: 'var(--bg-glass)', padding: '4px 8px 4px 4px',
                                                        borderRadius: '999px', fontSize: '0.8rem',
                                                        border: '1px solid var(--border)',
                                                        display: 'flex', alignItems: 'center', gap: '8px',
                                                    }}
                                                >
                                                    <span style={{
                                                        width: '22px', height: '22px', borderRadius: '50%',
                                                        background: `linear-gradient(135deg, ${mAccent}, ${mAccent}aa)`,
                                                        color: 'white', fontWeight: '700', fontSize: '0.65rem',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>{initials(m.name)}</span>
                                                    <span>{m.name}</span>
                                                    {isOwner && (
                                                        <button
                                                            onClick={() => { setRemoveMemberFor({ projectId: project._id, userId: m._id, name: m.name }); setActionError(''); }}
                                                            style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1rem', padding: 0, lineHeight: 0.5, marginLeft: '2px' }}
                                                            title="Remove"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }) : <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>No members added yet.</p>}
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="pill-dot" style={{ background: 'var(--primary)' }} />
                                        Owner: <strong style={{ color: 'var(--text-main)' }}>{isOwner ? 'You' : project.admin?.name}</strong>
                                    </span>
                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showCreate && (
                <div style={overlayStyle}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
                        <h2 style={{ marginBottom: '20px' }}>New Project</h2>
                        {createError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{createError}</div>}
                        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Project Title</label>
                                <input type="text" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} placeholder="Enter title" required autoFocus />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Description</label>
                                <textarea value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="Enter description" rows="4" style={{ resize: 'vertical' }}></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
                                <button type="button" onClick={() => { setShowCreate(false); setCreateError(''); }} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {addMemberFor && (
                <div style={overlayStyle}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '36px' }}>
                        <h2 style={{ marginBottom: '6px' }}>Add Member</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                            Add a teammate to <strong>{addMemberFor.title}</strong>. They must already have a TaskFlow account.
                        </p>
                        {addMemberError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{addMemberError}</div>}
                        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
                                <input
                                    type="email"
                                    value={addMemberEmail}
                                    onChange={(e) => setAddMemberEmail(e.target.value)}
                                    placeholder="teammate@company.com"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={adding}>{adding ? 'Adding...' : 'Add Member'}</button>
                                <button type="button" onClick={() => setAddMemberFor(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {removeMemberFor && (
                <div style={overlayStyle}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
                        <h2 style={{ marginBottom: '10px' }}>Remove member?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            <strong>{removeMemberFor.name}</strong> will lose access to this project's tasks.
                        </p>
                        {actionError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{actionError}</div>}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={confirmRemoveMember} className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} disabled={acting}>{acting ? 'Removing...' : 'Remove'}</button>
                            <button onClick={() => setRemoveMemberFor(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteProjectFor && (
                <div style={overlayStyle}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '36px' }}>
                        <h2 style={{ marginBottom: '10px' }}>Delete project?</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            <strong>{deleteProjectFor.title}</strong> and all of its tasks will be permanently deleted. This cannot be undone.
                        </p>
                        {actionError && <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>{actionError}</div>}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={confirmDeleteProject} className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} disabled={acting}>{acting ? 'Deleting...' : 'Delete'}</button>
                            <button onClick={() => setDeleteProjectFor(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
