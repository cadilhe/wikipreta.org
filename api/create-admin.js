import { db } from './db-init.js';
import { hashPassword } from './auth.js';

const createAdmin = async () => {
    const username = 'admin';
    const password = 'adminpassword123';

    try {
        const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existing) {
            console.log('Admin user already exists');
            return;
        }

        const hash = await hashPassword(password);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, 'admin');
        console.log(`User '${username}' created with password '${password}'`);
    } catch (error) {
        console.error('Error creating admin:', error);
    }
};

createAdmin();
