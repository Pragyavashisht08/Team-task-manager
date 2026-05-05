const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedDemoUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const email = 'demo@taskflow.com';
        const exists = await User.findOne({ email });
        if (exists) {
            console.log('Demo user already exists');
            process.exit();
        }

        await User.create({
            name: 'Demo User',
            email,
            password: 'demo1234',
        });

        console.log('✅ Demo user created');
        console.log(`Email:    ${email}`);
        console.log('Password: demo1234');
        console.log('Log in, then click "+ New Project" — you become the admin of any project you create.');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDemoUser();
