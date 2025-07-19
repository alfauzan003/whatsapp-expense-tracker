const { getYesterdayExpenses } = require("../db/expenses");
const { formatRupiah } = require("../utils/format");

module.exports = async function handleYesterday(msg, user_id) {
    try {
        const rows = await getYesterdayExpenses(user_id);
        if (rows.length === 0) return msg.reply("📭 No expenses yesterday.");

        let reply = "📅 *Yesterday's Expenses:*\n";
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
        return msg.reply("❌ Could not fetch yesterday's expenses.");
    }
};
