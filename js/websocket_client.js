// websocket_client.js
const app_id = '81087';
const availableMarkets = ["R_10", "R_25", "R_50", "R_75", "R_100"];
let ws = null;
let marketStates = new Map();

// This function is called from initializeTool()
function initWebSocket() {
    ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${app_id}`);

    ws.onopen = () => {
        console.log("✅ WebSocket connected.");
        availableMarkets.forEach(symbol => subscribeToTicks(symbol));
    };

    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.tick) {
            const market = response.tick.symbol;
            const price = response.tick.quote;
            const epoch = response.tick.epoch;

            if (!marketStates.has(market)) {
                marketStates.set(market, []);
            }

            const history = marketStates.get(market);
            history.push({ epoch, quote: price });

            if (history.length > 300) history.shift();

            // Optional: trigger update or call analyzeHistory here
            console.log(`[${market}] Tick → ${price} @ ${new Date(epoch * 1000).toLocaleTimeString()}`);
        }

        if (response.error) {
            console.error("❌ WebSocket error:", response.error.message);
        }
    };

    ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
    };

    ws.onerror = (err) => {
        console.error("❗ WebSocket error:", err);
    };

    return ws;
}

// Subscribe to ticks for a market
function subscribeToTicks(symbol) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            ticks: symbol,
            subscribe: 1
        }));
        console.log(`📡 Subscribed to ${symbol}`);
    }
}

// Unsubscribe from all ticks
function unsubscribeTicks(symbol) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ forget_all: "ticks" }));
        console.log(`🔕 Unsubscribed from ticks`);
    }
}

// Expose for your tool
window.initWebSocket = initWebSocket;
window.unsubscribeTicks = unsubscribeTicks;
window.marketStates = marketStates;
