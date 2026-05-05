const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Refusing to start.');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET is not set. Refusing to start.');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB connected');
        try {
            // One-time migration: legacy tasks have assignedTo as a single ObjectId
            // (or null). New schema is an array. Bypass Mongoose to fix existing docs.
            const tasks = mongoose.connection.db.collection('tasks');
            const result = await tasks.updateMany(
                { assignedTo: { $exists: true, $not: { $type: 'array' } } },
                [{
                    $set: {
                        assignedTo: {
                            $cond: [
                                { $eq: ['$assignedTo', null] },
                                [],
                                ['$assignedTo'],
                            ],
                        },
                    },
                }],
            );
            if (result.modifiedCount > 0) {
                console.log(`✅ Migrated ${result.modifiedCount} task(s) to multi-assignee`);
            }
        } catch (e) {
            console.warn('⚠ assignedTo migration skipped:', e.message);
        }
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        uptime: process.uptime(),
    });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/projects', require('./routes/project.routes'));
app.use('/api/tasks', require('./routes/task.routes'));

const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
const indexHtml = path.join(clientDist, 'index.html');

if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(indexHtml);
    });
    console.log('📦 Serving client build from', clientDist);
} else {
    app.get('/', (req, res) => {
        res.json({ message: 'Team Task Manager API is running' });
    });
}

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
