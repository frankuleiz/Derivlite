// websocket_client.js
const WebSocket = require('ws');

const app_id = '81087'; // Replace with your app_id
const availableMarkets = ["R_10", "R_25", "R_50", "R_75", "R_100"];
const marketStates = new Map();
const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

ws.on('open', () => {
    console.log("✅ WebSocket connected. Subscribing to tick streams...");
    availableMarkets.forEach(market => {
        subscribeToTicks(market);
    });
});

ws.on('message', (data) => {
    const response = JSON.parse(data);

    if (response.tick) {
        const market = response.tick.symbol;
        const price = response.tick.quote;
        const epoch = response.tick.epoch;

        console.log(`[${market}] Tick received → ${price} @ ${new Date(epoch * 1000).toLocaleTimeString()}`);

        if (!marketStates.has(market)) {
            marketStates.set(market, []);
        }

        const history = marketStates.get(market);
        history.push({ epoch, quote: price });

        // Limit history length (similar to analysisDepth)
        if (history.length > 300) {
            history.shift();
        }

        // You can call analyzeHistory(history) here if you have that logic available
    } else if (response.error) {
        console.error("❌ Error:", response.error.message);
    }
});

ws.on('close', () => {
    console.log("🔌 WebSocket disconnected");
});

ws.on('error', (err) => {
    console.error("❗ WebSocket error:", err);
});

function subscribeToTicks(market) {
    ws.send(JSON.stringify({
        ticks: market,
        subscribe: 1
    }));
}
