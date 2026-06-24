const axios = require('axios');

const CONFIG = {
    API_URL: process.env.TARGET_API_URL,
    WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
    INTERVAL: parseInt(process.env.POLL_INTERVAL) || 30000 // 30 seconds
};

// Simple in-memory cache to track items
let knownItems = new Set();
let isFirstRun = true;

async function checkCatalog() {
    if (!CONFIG.API_URL || !CONFIG.WEBHOOK_URL) {
        console.error("Missing environment variables.");
        return;
    }

    try {
        const response = await axios.get(CONFIG.API_URL);
        const items = response.data; // Assumes the API returns an array of items

        let newDetected = false;

        for (const item of items) {
            if (!knownItems.has(item.id)) {
                knownItems.add(item.id);
                
                // Don't spam Discord with the entire catalog on the first boot
                if (!isFirstRun) {
                    await sendDiscordAlert(item);
                    newDetected = true;
                }
            }
        }

        if (isFirstRun) {
            console.log(`System initialized. Cached ${knownItems.size} items.`);
            isFirstRun = false;
        }

    } catch (error) {
        console.error('Error fetching catalog data:', error.message);
    }
}

async function sendDiscordAlert(item) {
    const payload = {
        embeds: [{
            title: `New Item: ${item.name || 'Unknown Name'}`,
            color: 5814783, // Discord Blurple
            fields: [
                { name: 'Price', value: `${item.price ?? 'Free'}`, inline: true },
                { name: 'Item ID', value: `${item.id}`, inline: true }
            ],
            footer: { text: 'cartiisnipe' },
            timestamp: new Date()
        }]
    };

    try {
        await axios.post(CONFIG.WEBHOOK_URL, payload);
        console.log(`Alert sent for item: ${item.id}`);
    } catch (error) {
        console.error('Failed to send Discord webhook:', error.message);
    }
}

// Start loops
setInterval(checkCatalog, CONFIG.INTERVAL);
checkCatalog();
