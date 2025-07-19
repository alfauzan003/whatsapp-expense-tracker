const pool = require("../db");

// Actions
async function addExpense(user_id, category, amount) {
    await pool.query(
        `INSERT INTO expenses (user_id, category, amount) VALUES ($1, $2, $3)`,
        [user_id, category, amount]
    );
}

async function getTodayExpenses(user_id) {
    const result = await pool.query(
        `SELECT category, amount, created_at FROM expenses 
        WHERE user_id = $1
        AND created_at >= CURRENT_DATE`,
        [user_id]
    );
    return result.rows;
}

async function getYesterdayExpenses(user_id) {
    return await pool
        .query(
            `SELECT category, amount, created_at FROM expenses
            WHERE user_id = $1
            AND created_at >= CURRENT_DATE - INTERVAL '1 day'
            AND created_at < CURRENT_DATE
            ORDER BY created_at ASC`,
            [user_id]
        )
        .then((res) => res.rows);
}

async function getWeeklyTotal(user_id) {
    const result = await pool.query(
        `SELECT SUM(amount) AS total FROM expenses
        WHERE user_id = $1 
        AND created_at >= date_trunc('week', CURRENT_DATE)`,
        [user_id]
    );
    return parseFloat(result.rows[0].total || 0);
}

async function getMonthlyTotal(user_id) {
    const result = await pool.query(
        `SELECT SUM(amount) AS total FROM expenses
        WHERE user_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [user_id]
    );
    return parseFloat(result.rows[0].total || 0);
}

async function deleteLastRow(user_id) {
    await pool.query(
        `DELETE FROM expenses
        WHERE id = (
            SELECT id FROM expenses
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        )`,
        [user_id]
    );
}

module.exports = {
    addExpense,
    getTodayExpenses,
    getYesterdayExpenses,
    getWeeklyTotal,
    getMonthlyTotal,
    deleteLastRow,
};
