const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth.middleware');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureProjectAccess = async (projectId, user) => {
    const project = await Project.findById(projectId);
    if (!project) return { error: { status: 404, message: 'Project not found' } };
    const isAdmin = project.admin.equals(user._id);
    const isMember = project.members.some(m => m.equals(user._id));
    if (!isAdmin && !isMember) return { error: { status: 403, message: 'Not authorized for this project' } };
    return { project, isAdmin };
};

// Sanitize an `assignedTo` payload from the client. Accepts either a single
// ObjectId string (legacy) or an array of ObjectIds. Returns a normalized
// array, or null if the value is malformed.
const normalizeAssignees = (raw) => {
    if (raw == null || raw === '') return [];
    const list = Array.isArray(raw) ? raw : [raw];
    const cleaned = [...new Set(list.filter(v => typeof v === 'string' && v.length))];
    if (cleaned.some(v => !isObjectId(v))) return null;
    return cleaned;
};

const isInProject = (project, userId) => (
    project.admin.equals(userId) || project.members.some(m => m.equals(userId))
);

// @desc    Get tasks where the current user is one of the assignees
// @route   GET /api/tasks/my
router.get('/my', protect, async (req, res) => {
    try {
        const tasks = await Task.find({ assignedTo: req.user._id })
            .populate('project', 'title')
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name')
            .populate('comments.author', 'name email')
            .sort({ dueDate: 1, createdAt: -1 });
        return res.json(tasks);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
router.get('/project/:projectId', protect, async (req, res) => {
    if (!isObjectId(req.params.projectId)) return res.status(400).json({ message: 'Invalid project id' });
    try {
        const access = await ensureProjectAccess(req.params.projectId, req.user);
        if (access.error) return res.status(access.error.status).json({ message: access.error.message });

        const tasks = await Task.find({ project: req.params.projectId })
            .populate('assignedTo', 'name email')
            .populate('createdBy', 'name email')
            .populate('comments.author', 'name email')
            .sort({ createdAt: -1 });
        return res.json(tasks);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Create a task (project admin only)
// @route   POST /api/tasks
router.post('/', protect, async (req, res) => {
    const { title, description, priority, dueDate, project, assignedTo } = req.body;

    if (!title || !title.trim()) return res.status(400).json({ message: 'Task title is required' });
    if (!isObjectId(project)) return res.status(400).json({ message: 'Valid project id is required' });

    const assignees = normalizeAssignees(assignedTo);
    if (assignees === null) return res.status(400).json({ message: 'Invalid assignee id' });

    try {
        const projectDoc = await Project.findById(project);
        if (!projectDoc) return res.status(404).json({ message: 'Project not found' });
        if (!projectDoc.admin.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the project admin can create tasks here' });
        }

        for (const a of assignees) {
            if (!isInProject(projectDoc, a)) {
                return res.status(400).json({ message: 'Every assignee must be a project member' });
            }
        }

        const task = await Task.create({
            title: title.trim(),
            description: (description || '').trim(),
            priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
            dueDate: dueDate || null,
            project,
            assignedTo: assignees,
            createdBy: req.user._id,
        });

        const populated = await task.populate([
            { path: 'assignedTo', select: 'name email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'comments.author', select: 'name email' },
        ]);
        return res.status(201).json(populated);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// @desc    Update task (status by assignee/admin, all fields by admin)
// @route   PUT /api/tasks/:id
router.put('/:id', protect, async (req, res) => {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task id' });
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isProjectAdmin = project.admin.equals(req.user._id);
        const isAssignee = (task.assignedTo || []).some(a => a.equals(req.user._id));
        const isProjectMember = project.members.some(m => m.equals(req.user._id));

        if (!isProjectAdmin && !isAssignee && !isProjectMember) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        if (req.body.status !== undefined) {
            if (!['Todo', 'In Progress', 'Review', 'Completed'].includes(req.body.status)) {
                return res.status(400).json({ message: 'Invalid status' });
            }
            if (!isProjectAdmin && !isAssignee) {
                return res.status(403).json({ message: 'Only an assignee or the project admin can change task status' });
            }
            task.status = req.body.status;
        }

        if (isProjectAdmin) {
            if (req.body.title !== undefined) task.title = req.body.title.trim();
            if (req.body.description !== undefined) task.description = req.body.description.trim();
            if (req.body.priority && ['Low', 'Medium', 'High'].includes(req.body.priority)) {
                task.priority = req.body.priority;
            }
            if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate || null;
            if (req.body.assignedTo !== undefined) {
                const assignees = normalizeAssignees(req.body.assignedTo);
                if (assignees === null) return res.status(400).json({ message: 'Invalid assignee id' });
                for (const a of assignees) {
                    if (!isInProject(project, a)) {
                        return res.status(400).json({ message: 'Every assignee must be a project member' });
                    }
                }
                task.assignedTo = assignees;
            }
        }

        const updated = await task.save();
        const populated = await updated.populate([
            { path: 'assignedTo', select: 'name email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'comments.author', select: 'name email' },
        ]);
        return res.json(populated);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// @desc    Add a comment to a task (any project member)
// @route   POST /api/tasks/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task id' });
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (body.length > 2000) return res.status(400).json({ message: 'Comment too long (max 2000 chars)' });

    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const project = await Project.findById(task.project);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        const isAdmin = project.admin.equals(req.user._id);
        const isMember = project.members.some(m => m.equals(req.user._id));
        if (!isAdmin && !isMember) {
            return res.status(403).json({ message: 'Not authorized for this project' });
        }

        task.comments.push({ author: req.user._id, body: body.trim() });
        await task.save();
        const populated = await task.populate([
            { path: 'assignedTo', select: 'name email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'comments.author', select: 'name email' },
        ]);
        return res.status(201).json(populated);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// @desc    Delete a comment (own comment, or project admin)
// @route   DELETE /api/tasks/:id/comments/:commentId
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
    if (!isObjectId(req.params.id) || !isObjectId(req.params.commentId)) {
        return res.status(400).json({ message: 'Invalid id' });
    }
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const comment = task.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const project = await Project.findById(task.project);
        const isProjectAdmin = project && project.admin.equals(req.user._id);
        const isAuthor = comment.author.equals(req.user._id);
        if (!isProjectAdmin && !isAuthor) {
            return res.status(403).json({ message: 'You can only delete your own comments' });
        }

        comment.deleteOne();
        await task.save();
        const populated = await task.populate([
            { path: 'assignedTo', select: 'name email' },
            { path: 'createdBy', select: 'name email' },
            { path: 'comments.author', select: 'name email' },
        ]);
        return res.json(populated);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// @desc    Delete task (project admin only)
// @route   DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res) => {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid task id' });
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const project = await Project.findById(task.project);
        if (!project || !project.admin.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the project admin can delete this task' });
        }

        await task.deleteOne();
        return res.json({ message: 'Task deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

module.exports = router;
