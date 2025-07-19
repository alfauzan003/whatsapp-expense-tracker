const { getTodayExpenses } = require("../db/expenses");
const { formatRupiah } = require("../utils/format");

module.exports = async function handleToday(msg, user_id) {
    try {
        const rows = await getTodayExpenses(user_id);
        if (rows.length === 0) return msg.reply("📭 No expenses today.");

        let reply = "📅 *Today's Expenses:*\n";
        let total = 0;

        rows.forEach((r) => {
            const amount = formatRupiah(r.amount);
            total += parseFloat(r.amount);
            reply += `• ${r.category} - ${amount}\n`;
        });
        reply += `\n🧾 *Total*: ${formatRupiah(total)}`;
        return msg.reply(reply);
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Could not fetch today's expenses.");
    }
};
