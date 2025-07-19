const { getWeeklyTotal } = require("../db/expenses");
const { formatRupiah } = require("../utils/format");

module.exports = async function handleWeekly(msg, user_id) {
    try {
        const total = await getWeeklyTotal(user_id);
        return msg.reply(`📅 *This Week's Total*: ${formatRupiah(total)}`);
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Could not fetch this Week's expense.");
    }
};
