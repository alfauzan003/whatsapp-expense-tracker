const { exportMonthlyExpenses } = require("../db/export");
const { MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");

module.exports = async function handleExport(msg, user_id, client) {
    try {
        const phone = msg.from.replace(/@c\.us$/, "");
        const filePath = await exportMonthlyExpenses(user_id, phone);
        const media = MessageMedia.fromFilePath(filePath);
        await msg.reply("📦 Exporting monthly expense Excel files...");
        await client.sendMessage(msg.from, media, {
            sendMediaAsDocument: true,
            caption: "📊 Monthly Expense Report",
        });
        fs.unlinkSync(filePath);
        return;
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Failed to export Excel file.");
    }
};
