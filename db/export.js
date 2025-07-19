const pool = require("../db");
const ExcelJS = require("exceljs");
const { DateTime } = require("luxon");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const TMP_DIR = path.join(ROOT_DIR, "tmp");

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
    const filePath = path.join(TMP_DIR, fileName);
    await workbook.xlsx.writeFile(filePath);

    return filePath;
}

module.exports = { exportMonthlyExpenses };
