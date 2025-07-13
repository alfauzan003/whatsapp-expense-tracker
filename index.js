const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const pool = require("./db");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { DateTime } = require("luxon");

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

async function exportMonthlyExpenses(user_id, phone) {
    const result = await pool.query(
        `SELECT category, amount, created_at FROM expenses
        WHERE user_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)
        ORDER BY created_at ASC`,
        [user_id]
    );
    const total = await pool.query(
        `SELECT SUM(amount) AS total FROM expenses
        WHERE user_id = $1 
        AND created_at >= date_trunc('month', CURRENT_DATE)`,
        [user_id]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Expenses");

    sheet.columns = [
        { header: "Date", key: "date", width: 20 },
        { header: "Category", key: "category", width: 30 },
        { header: "Amount", key: "amount", width: 15 },
    ];

    result.rows.forEach((row) => {
        sheet.addRow({
            date: DateTime.fromJSDate(row.created_at, { zone: "utc" })
                .setZone("Asia/Bangkok")
                .toFormat("yyyy-MM-dd HH:mm:ss"),
            category: row.category,
            amount: Number(row.amount),
        });
    });

    sheet.addRow({});
    const totalRow = sheet.addRow({
        category: "🧾 TOTAL",
        amount: Number(total.rows[0].total),
    });

    // Make total row bold
    totalRow.getCell("B").font = { bold: true };
    totalRow.getCell("C").font = { bold: true };

    // Format amount to Rupiah currency
    sheet.getColumn("amount").numFmt = '"Rp"#,##0';

    // Save excel .xlsx
    const currentMonth = DateTime.now()
        .setZone("Asia/Bangkok")
        .toFormat("MM-yyyy");
    const fileName = `expenses_${currentMonth}_${phone}.xlsx`;
    const filePath = path.join(__dirname, "tmp", fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
}

function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(amount);
}

function infoMessage() {
    return `
👋 *Welcome to Your Personal Expense Bot!*

This bot helps you track your daily expenses via WhatsApp and saves them to your personal Sheet.

🧰 *Features*:
• 💸 Log expenses
• 📅 View today's expenses
• ⏪ Undo last entry
• 📎 Download your sheet as .xlsx

📌 *Commands*:
*Add an expense*  
Format: \`Category - Amount\`  
Example: \`Lunch at cafe - 25000\`

*/undo* - Delete the last entry 
*/today* - Show today’s expenses  
*/yesterday* - Show yesterday's expenses 
*/weekly* - Show total expense on this week  
*/monthly* - Show total expense on this month 
*/export* - Export expenses on this month as Excel file  
*/info* - Show this message  


⚠️ *Note*: You must be registered by the bot admin.
    `;
}

async function handleRegister(msg) {
    const phone = msg.from.replace(/@c\.us$/, "");
    const exists = await getUser(phone);
    if (exists) return msg.reply("✅ You are already registered.");
    try {
        await createUser(phone);
        return msg.reply(
            "🎉 Registration complete! You can now log your expenses.\nExample: `Makan siang - 5000`\n\nOr type `/info` for help."
        );
    } catch (err) {
        console.error("❌ Registration error:", err);
        return msg.reply("❌ Failed to register. Please try again.");
    }
}

async function handleToday(msg, user_id) {
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
}

async function handleYesterday(msg, user_id) {
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
}

async function handleWeekly(msg, user_id) {
    try {
        const total = await getWeeklyTotal(user_id);
        return msg.reply(`📅 *This Week's Total*: ${formatRupiah(total)}`);
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Could not fetch this Week's expense.");
    }
}

async function handleMonthly(msg, user_id) {
    try {
        const total = await getMonthlyTotal(user_id);
        return msg.reply(`📆 *This Month's Total*: ${formatRupiah(total)}`);
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Could not fetch monthly total.");
    }
}

async function handleUndo(msg, user_id) {
    try {
        await deleteLastRow(user_id);
        return msg.reply("⏪ Last entry deleted.");
    } catch (err) {
        console.error(err);
        return msg.reply("❌ Error deleting the last entry.");
    }
}

async function handleExport(msg, user_id) {
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
}

async function handleInfo(msg) {
    return msg.reply(infoMessage());
}

const commands = {
    "/today": handleToday,
    "/yesterday": handleYesterday,
    "/weekly": handleWeekly,
    "/monthly": handleMonthly,
    "/undo": handleUndo,
    "/export": handleExport,
    "/info": handleInfo,
    "/help": handleInfo,
};

console.log("🚀 Starting bot...");

// WhatsApp Client Setup
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: "./.wwebjs_auth",
    }),
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));

client.on("ready", () => {
    console.log("✅ WhatsApp bot is ready!");
});

client.on("message", async (msg) => {
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

    const command = commands[text];
    if (command) {
        return command(msg, user_id);
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
});
client.initialize();
