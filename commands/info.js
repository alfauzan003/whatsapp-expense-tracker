function infoMessage() {
    return `
👋 *Welcome to Budget Bot!*

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
*/info* - Show this message`;
}

module.exports = async function handleInfo(msg) {
    return msg.reply(infoMessage());
};
