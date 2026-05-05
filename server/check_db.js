const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

dotenv.config({ path: './.env' });

const checkDB = async () => {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const userCount = await User.countDocuments();
        const projectCount = await Project.countDocuments();
        const taskCount = await Task.countDocuments();

        console.log('\n--- Database Stats ---');
        console.log(`Users:    ${userCount}`);
        console.log(`Projects: ${projectCount}`);
        console.log(`Tasks:    ${taskCount}`);
        
        if (userCount > 0) {
            const latestUser = await User.findOne().sort({ createdAt: -1 });
            console.log(`\nLatest User: ${latestUser.name} (${latestUser.email})`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

checkDB();
