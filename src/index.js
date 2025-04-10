require('the-log');
require('dotenv').config();
const Binance = require('binance-api-node').default;

// Initialize Binance client with API credentials
const client = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
});

/**
 * Calculates RSI(n) based on an array of close prices
 * @param {number[]} closePrices - Array of close prices (length >= n + 1)
 * @param {number} n - Number of periods for RSI calculation
 * @returns {number} RSI value
 */
function calculateRSI(closePrices, n) {
  if (closePrices.length < n + 1) {
    throw new Error('Not enough data to calculate RSI');
  }
  // Calculate price changes
  const changes = [];
  for (let i = 1; i < closePrices.length; i++) {
    changes.push(closePrices[i] - closePrices[i - 1]);
  }
  // Use last n changes
  const recentChanges = changes.slice(-n);
  let sumGain = 0;
  let sumLoss = 0;
  recentChanges.forEach(change => {
    if (change > 0) sumGain += change;
    else sumLoss -= change; // Losses are positive values
  });
  const avgGain = sumGain / n;
  const avgLoss = sumLoss / n;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

async function main() {
  try {
    // Synchronize with Binance server time
    const serverTime = await client.time();
    const localTime = Date.now();
    const offset = serverTime - localTime; // Time offset for alignment

    const intervalMs = 15 * 60 * 1000; // 15 minutes in milliseconds
    const currentTime = Date.now() + offset;
    const currentIntervalStart = Math.floor(currentTime / intervalMs) * intervalMs;

    // Fetch historical 15-minute candlestick data
    const klines = await client.candles({
      symbol: 'BTCUSDT',
      interval: '15m',
      limit: 100, // More than enough for RSI(6)
      endTime: currentIntervalStart - 1, // Up to last completed candle
    });

    // Parse historical candles
    const completedCandles = klines.map(kline => ({
      openTime: kline.openTime,
      closeTime: kline.closeTime,
      open: parseFloat(kline.open),
      high: parseFloat(kline.high),
      low: parseFloat(kline.low),
      close: parseFloat(kline.close),
    }));

    // Initialize current candlestick with latest price
    const latestPrice = parseFloat((await client.prices({ symbol: 'BTCUSDT' })).BTCUSDT);
    let currentCandle = {
      openTime: currentIntervalStart,
      closeTime: currentIntervalStart + intervalMs - 1,
      open: latestPrice,
      high: latestPrice,
      low: latestPrice,
      close: latestPrice,
    };

    // Trading state
    let position = 0; // BTC balance
    let usdtBalance = 1000; // Initial USDT balance
    let lastBuyRSI = null; // RSI at last buy
    let prevRSI = null; // Previous RSI value

    // Real-time update loop every second
    setInterval(async () => {
      try {
        // Fetch latest price
        const latestPrice = parseFloat((await client.prices({ symbol: 'BTCUSDT' })).BTCUSDT);
        const currentTime = Date.now() + offset;
        const newIntervalStart = Math.floor(currentTime / intervalMs) * intervalMs;

        // Handle candlestick transition
        if (newIntervalStart > currentCandle.openTime) {
          completedCandles.push(currentCandle); // Close current candle
          // Start new candle
          currentCandle = {
            openTime: newIntervalStart,
            closeTime: newIntervalStart + intervalMs - 1,
            open: latestPrice,
            high: latestPrice,
            low: latestPrice,
            close: latestPrice,
          };
          console.log(`New 15m candle started at ${new Date(newIntervalStart).toISOString()}`);
        } else {
          // Update current candle
          currentCandle.close = latestPrice;
          currentCandle.high = Math.max(currentCandle.high, latestPrice);
          currentCandle.low = Math.min(currentCandle.low, latestPrice);
        }

        // Calculate RSI(6) with last 6 completed candles + current candle
        const closePrices = completedCandles.slice(-6).map(c => c.close).concat([currentCandle.close]);
        if (closePrices.length < 7) {
          console.log('Waiting for enough data to calculate RSI(6)');
          return;
        }

        const currentRSI = calculateRSI(closePrices, 6);

        // Trading logic
        const buyAmountUSDT = 100; // Fixed amount per buy order

        // Initial buy
        if (position === 0 && currentRSI < 20) {
          if (usdtBalance >= buyAmountUSDT) {
            const btcBought = buyAmountUSDT / latestPrice;
            position += btcBought;
            usdtBalance -= buyAmountUSDT;
            lastBuyRSI = currentRSI;
            console.log(`BUY: ${btcBought} BTC at ${latestPrice} USDT | RSI: ${currentRSI.toFixed(2)}`);
            // Uncomment to place real order
            // await client.order({
            //   symbol: 'BTCUSDT',
            //   side: 'BUY',
            //   type: 'MARKET',
            //   quoteOrderQty: buyAmountUSDT,
            // });
          } else {
            console.log('Insufficient USDT balance for buy');
          }
        }
        // Additional buy
        else if (position > 0 && currentRSI < 20 && lastBuyRSI !== null && currentRSI < lastBuyRSI - 3) {
          if (usdtBalance >= buyAmountUSDT) {
            const btcBought = buyAmountUSDT / latestPrice;
            position += btcBought;
            usdtBalance -= buyAmountUSDT;
            lastBuyRSI = currentRSI;
            console.log(`ADDITIONAL BUY: ${btcBought} BTC at ${latestPrice} USDT | RSI: ${currentRSI.toFixed(2)}`);
            // Uncomment to place real order
            // await client.order({
            //   symbol: 'BTCUSDT',
            //   side: 'BUY',
            //   type: 'MARKET',
            //   quoteOrderQty: buyAmountUSDT,
            // });
          } else {
            console.log('Insufficient USDT balance for additional buy');
          }
        }
        // Sell
        if (position > 0 && currentRSI > 70 && prevRSI !== null && currentRSI < prevRSI) {
          const usdtReceived = position * latestPrice;
          usdtBalance += usdtReceived;
          console.log(`SELL: ${position} BTC at ${latestPrice} USDT | Received: ${usdtReceived} USDT | RSI: ${currentRSI.toFixed(2)}`);
          position = 0;
          lastBuyRSI = null;
          // Uncomment to place real order
          // await client.order({
          //   symbol: 'BTCUSDT',
          //   side: 'SELL',
          //   type: 'MARKET',
          //   quantity: position.toFixed(8), // Adjust precision as needed
          // });
        }

        prevRSI = currentRSI;

        // Log current state (optional)
        console.log(`Position: ${position} BTC | USDT Balance: ${usdtBalance} | RSI: ${currentRSI.toFixed(2)}`);

      } catch (error) {
        console.error('Error in update loop:', error.message);
      }
    }, 1000);

  } catch (error) {
    console.error('Initialization error:', error.message);
    process.exit(1);
  }
}

// Start the bot
main().catch(error => {
  console.error('Main process error:', error.message);
  process.exit(1);
});

