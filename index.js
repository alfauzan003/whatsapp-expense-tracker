const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const handleMessage = require("./handlers/messageHandler");

console.log("🚀 Starting bot...");

const client = new Client({
    puppeteer: { args: ["--no-sandbox"] },
    authStrategy: new LocalAuth(),
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ WhatsApp bot ready"));
client.on("message", (msg) => handleMessage(msg, client));

client.initialize();
