const { getUser, createUser } = require("../db/users");

module.exports = async function handleRegister(msg) {
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
};
