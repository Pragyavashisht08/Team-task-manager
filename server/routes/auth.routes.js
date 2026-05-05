const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
});

// @desc    Register a new user
// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const userExists = await User.findOne({ email: email.toLowerCase() });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password,
        });

        return res.status(201).json({
            ...publicUser(user),
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Signup Error:', error);
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user && (await user.comparePassword(password))) {
            return res.json({
                ...publicUser(user),
                token: generateToken(user._id),
            });
        }
        return res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: error.message });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    return res.json(publicUser(req.user));
});

module.exports = router;
