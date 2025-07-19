const pool = require("../db");

// Create user
async function createUser(phone) {
    const result = await pool.query(
        `INSERT INTO users (phone) VALUES ($1) RETURNING id`,
        [phone]
    );
    return result.rows[0].id;
}

// Check user
async function getUser(phone) {
    const result = await pool.query(`SELECT id FROM users WHERE phone = $1`, [
        phone,
    ]);
    return result.rows[0]?.id || null;
}

module.exports = { createUser, getUser };
