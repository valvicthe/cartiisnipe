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
        
        // Handle both raw arrays and nested data wraps (e.g., response.data.data)
        const items = Array.isArray(response.data) ? response.data : response.data.data;

        if (!items || !items.length) {
            console.log("No items returned from endpoint.");
            return;
        }

        for (const item of items) {
            // Fallback chain targeting common revival database schemas
            const itemId = item.id || item.assetId || item.Id;

            if (itemId && !knownItems.has(itemId)) {
                knownItems.add(itemId);
                
                if (!isFirstRun) {
                    await sendDiscordAlert(item, itemId);
                }
            }
        }

        if (isFirstRun) {
            console.log(`Initialization complete. Monitoring ${knownItems.size} items.`);
            isFirstRun = false;
        }

    } catch (error) {
        console.error('Error fetching catalog data:', error.message);
    }
}

async function sendDiscordAlert(item, itemId) {
    const itemName = item.name || item.title || 'Unknown Asset';
    const itemPrice = item.price !== undefined ? item.price : (item.robux ?? 'Free');

    const payload = {
        embeds: [{
            title: `🚨 New Item Released: ${itemName}`,
            color: 4321431, // Custom color
            fields: [
                { name: 'Price', value: `${itemPrice}`, inline: true },
                { name: 'Asset ID', value: `${itemId}`, inline: true }
            ],
            footer: { text: 'cartii.fit Monitor' },
            timestamp: new Date()
        }]
    };

    try {
        await axios.post(CONFIG.WEBHOOK_URL, payload);
        console.log(`Discord alert fired for Asset ID: ${itemId}`);
    } catch (error) {
        console.error('Discord webhook dispatch error:', error.message);
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
