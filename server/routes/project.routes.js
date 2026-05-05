const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// @desc    Get all projects visible to current user
// @route   GET /api/projects
router.get('/', protect, async (req, res) => {
    try {
        const filter = { $or: [{ admin: req.user._id }, { members: req.user._id }] };

        const projects = await Project.find(filter)
            .populate('admin', 'name email')
            .populate('members', 'name email')
            .sort({ createdAt: -1 });
        return res.json(projects);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Get single project
// @route   GET /api/projects/:id
router.get('/:id', protect, async (req, res) => {
    if (!isObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid project id' });
    }
    try {
        const project = await Project.findById(req.params.id)
            .populate('admin', 'name email')
            .populate('members', 'name email');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const isAdmin = project.admin._id.equals(req.user._id);
        const isMember = project.members.some(m => m._id.equals(req.user._id));
        if (!isAdmin && !isMember) {
            return res.status(403).json({ message: 'Not authorized for this project' });
        }
        return res.json(project);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Create a project
// @route   POST /api/projects
router.post('/', protect, async (req, res) => {
    const { title, description, members } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Project title is required' });
    }

    try {
        const project = await Project.create({
            title: title.trim(),
            description: (description || '').trim(),
            admin: req.user._id,
            members: Array.isArray(members) ? members.filter(isObjectId) : [],
        });

        const populated = await project.populate([
            { path: 'admin', select: 'name email' },
            { path: 'members', select: 'name email' },
        ]);
        return res.status(201).json(populated);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
});

// @desc    Add member to project by email
// @route   POST /api/projects/:id/members
router.post('/:id/members', protect, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid project id' });

    try {
        const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToAdd) return res.status(404).json({ message: 'User not found. Ask them to sign up first.' });

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (!project.admin.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the project admin can add members' });
        }
        if (project.admin.equals(userToAdd._id)) {
            return res.status(400).json({ message: 'User is already the admin of this project' });
        }
        if (project.members.some(m => m.equals(userToAdd._id))) {
            return res.status(400).json({ message: 'User is already a member' });
        }

        project.members.push(userToAdd._id);
        await project.save();
        const populated = await project.populate([
            { path: 'admin', select: 'name email' },
            { path: 'members', select: 'name email' },
        ]);
        return res.json(populated);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', protect, async (req, res) => {
    if (!isObjectId(req.params.id) || !isObjectId(req.params.userId)) {
        return res.status(400).json({ message: 'Invalid id' });
    }
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (!project.admin.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the project admin can remove members' });
        }

        project.members = project.members.filter(m => m.toString() !== req.params.userId);
        await project.save();
        return res.json({ message: 'Member removed' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Delete project (and its tasks)
// @route   DELETE /api/projects/:id
router.delete('/:id', protect, async (req, res) => {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid project id' });
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        if (!project.admin.equals(req.user._id)) {
            return res.status(403).json({ message: 'Only the project admin can delete this project' });
        }
        await Task.deleteMany({ project: project._id });
        await project.deleteOne();
        return res.json({ message: 'Project deleted' });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

module.exports = router;
