const { getUser } = require("../db/users");
const { addExpense } = require("../db/expenses");
const handleRegister = require("../commands/register");
const { formatRupiah } = require("../utils/format");

const commands = {
    "/today": require("../commands/today"),
    "/yesterday": require("../commands/yesterday"),
    "/weekly": require("../commands/weekly"),
    "/monthly": require("../commands/monthly"),
    "/undo": require("../commands/undo"),
    "/export": require("../commands/export"),
    "/info": require("../commands/info"),
    "/help": require("../commands/info"),
};

module.exports = async function handleMessage(msg, client) {
    const rawText = msg.body.trim();
    const text = rawText.toLowerCase();
    const phone = msg.from.replace(/@c\.us$/, "");

    if (text === "/register") {
        return handleRegister(msg);
    }

    const user_id = await getUser(phone);
    if (!user_id) {
        return msg.reply("🚫 You are not registered. Type /register to start.");
    }

    if (text[0] === "/") {
        if (commands[text]) {
            return commands[text](msg, user_id, client);
        }
        return msg.reply(
            "❌ Wrong command \nType `/info` to see a list of supported commands"
        );
    }

    // Add expense
    const lines = text.split("\n");
    const successes = [];
    const errors = [];

    for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const match = trimmed.match(/^(.+?)\s*-\s*(\d+(?:\.\d{1,2})?)$/);
        if (!match) {
            errors.push(`❌ Wrong format: "${trimmed}"`);
            continue;
        }

        const [, category, amountStr] = match;
        const amount = parseFloat(amountStr);

        try {
            await addExpense(user_id, category, amount);
            successes.push(`✅ ${category}: ${formatRupiah(amount)}`);
        } catch (err) {
            console.error("Error logging expense:", err);
            errors.push(`❌ Error logging expense: "${trimmed}"`);
        }
    }

    if (successes.length === 0 && errors.length >= 0) {
        return msg.reply(
            "❗ Incorrect format.\nUse: `Category - Amount`\nExample: `Makan siang - 5000`\n\nOr type `/info` for help."
        );
    }

    let reply = "";
    if (successes.length > 0) {
        reply += "📥 *Saved:*\n" + successes.join("\n") + "\n";
    }
    if (errors.length > 0) {
        reply += "\n⚠️ *Invalid:*\n" + errors.join("\n");
    }
    return msg.reply(reply);
};
