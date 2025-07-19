const { deleteLastRow } = require("../db/expenses");

module.exports = async function handleUndo(msg, user_id) {
    try {
        await deleteLastRow(user_id);
        return msg.reply("⏪ Last entry deleted.");
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Error deleting the last entry.");
    }
};
