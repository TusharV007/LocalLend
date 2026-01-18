require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password', // Default fallback
};

async function setupDatabase() {
    try {
        // 1. Connect to MySQL Server (no DB selected yet)
        console.log('Connecting to MySQL...', dbConfig);
        const connection = await mysql.createConnection(dbConfig);

        // 2. Read Schema
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const statements = schemaSql.split(';').filter(stmt => stmt.trim());

        // 3. Execute Statements
        console.log('Running schema setup...');
        for (let statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }

        console.log('Database setup complete: locale_lend created/updated.');
        await connection.end();
    } catch (error) {
        console.error('Database setup failed:', error);
        console.error('Please ensure MySQL is running and credentials in .env are correct.');
    }
}

setupDatabase();
