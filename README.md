# Automatic Trading Bot for Bitcoin on Binance

**ATTN: Read [DISCLAIMER OF LIABILITY FOR TRADING SCRIPT](#disclaimer-of-liability-for-trading-script) first!**

### Overview

This application uses Node.js and the `binance-api-node` library to create a trading bot that:
- Fetches historical 15-minute candlestick data for BTC/USDT at startup.
- Updates the current candlestick and recalculates RSI(6) every second using real-time price data.
- Executes trades based on the following strategy:
  - **Buy:** When RSI(6) < 20 and no position is held.
  - **Additional Buy:** When holding a position, RSI(6) < 20, and RSI(6) drops by at least 3 points since the last buy.
  - **Sell:** When holding a position, RSI(6) > 70, and RSI(6) declines from the previous value.
- Manages positions and balances, logs trades, and ensures proper candlestick transitions and time alignment with Binance’s server.

### Prerequisites

- **Node.js**: Ensure Node.js is installed.

- **Dependencies**: Install dependencies using npm:

```bash
  npm install
```
- **API Keys**: Obtain Binance API key and secret from your Binance account. Store them in a `.env` file:

```
  BINANCE_API_KEY=your_api_key
  BINANCE_API_SECRET=your_api_secret
```

- **Run the Bot**: Execute the bot:

```bash
  npm start
```

### Code Explanation

#### **Setup**
- **Dependencies**: Uses `binance-api-node` for API interactions and `dotenv` to load API keys securely from a `.env` file.
- **Binance Client**: Initialized with API key and secret for authenticated requests.

#### **RSI Calculation**
- **Function**: `calculateRSI` computes RSI(n) using n+1 close prices to calculate n price changes. For RSI(6), it requires 7 close prices (6 completed candles + current candle).
- **Logic**: Separates gains and losses, computes averages, and calculates RSI using the standard formula: `100 - (100 / (1 + RS))`.

#### **Initialization**
- **Server Time**: Fetches Binance server time and calculates an offset to align local time.
- **Historical Data**: Retrieves 100 recent 15-minute candles (more than enough for RSI(6)) up to the last completed interval.
- **Current Candle**: Starts with the latest price as open, high, low, and close.

#### **Real-Time Updates**
- **Interval**: Runs every second using `setInterval`.
- **Price Fetch**: Gets the current BTC/USDT price via `client.prices`.
- **Candlestick Update**:
  - Updates the current candle’s close, high, and low with the latest price.
  - If a new 15-minute interval starts, closes the current candle and begins a new one.

#### **Trading Logic**
- **State**: Tracks `position` (BTC held), `usdtBalance`, `lastBuyRSI`, and `prevRSI`.
- **Buy**: Places a market order for 100 USDT when RSI(6) < 20 and no position is held.
- **Additional Buy**: Places another 100 USDT order if holding a position, RSI(6) < 20, and RSI drops 3+ points since the last buy.
- **Sell**: Sells all BTC when RSI(6) > 70 and declines from the previous value.
- **Simulation**: Balances are updated assuming instant execution at the current price. Actual order placement is commented out for safety.

#### **API Interactions**
- **Endpoints**:
  - `/api/v3/klines`: Historical candlestick data.
  - `/api/v3/ticker/price`: Real-time price.
  - `/api/v3/order`: Market orders (commented out).
- **Error Handling**: Wrapped in try-catch blocks to handle API errors or network issues.
- **Rate Limits**: Fetching every second (60 requests/minute) is well below Binance’s 1200 requests/minute limit.

#### **Additional Features**
- **Candlestick Transitions**: Properly closes and starts new candles at 15-minute boundaries.
- **Time Alignment**: Uses server time offset for accuracy.
- **Logging**: Outputs trade actions and current state for monitoring.

### Running the Bot

1. **Setup Environment**:

   - Create a `.env` file with your Binance API key and secret.
   - Install dependencies with `npm install`.

2. **Run the Application**:

```bash
   node bot.js
```

3. **Safety Note**:

- The code logs trades without executing them (order placement is commented out). To enable real trading, uncomment the `client.order` calls and test on Binance Testnet first.

### Notes

- **Fees**: Ignored for simplicity; in a real scenario, adjust balances for trading fees.
- **Precision**: BTC quantities may need rounding (e.g., `.toFixed(8)`) for Binance API compatibility.
- **WebSockets**: For efficiency, consider replacing HTTP price fetches with Binance WebSocket streams.
- **Robustness**: Add more error handling (e.g., API rate limit retries) for production use.

## DISCLAIMER OF LIABILITY FOR TRADING SCRIPT

**PLEASE READ THIS DISCLAIMER CAREFULLY BEFORE USING THE TRADING SCRIPT.**

By launching or using this trading script ("the Script"), you acknowledge and agree to the following terms and conditions. If you do not agree with any part of this disclaimer, you must not use the Script.

### 1. **No Warranty or Guarantee**
The Script is provided "as is" without any warranties or guarantees of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. I, the creator of the Script ("the Creator"), do not guarantee that the Script will operate without errors, interruptions, or defects. You use the Script entirely at your own risk.

### 2. **Full Assumption of Risk**
Trading in financial markets, including cryptocurrencies, stocks, or other instruments, carries a high level of risk and may result in significant financial losses. By launching this Script, you understand and accept that you are solely responsible for all risks associated with your trading activities. This includes, but is not limited to, the potential loss of all invested capital due to market volatility, technical failures, or other unforeseen circumstances. I bear no responsibility for any outcomes of your use of the Script.

### 3. **Not Financial Advice**
The Script is intended for informational and educational purposes only. It does not constitute financial, investment, or trading advice. I am not a financial advisor, and nothing in the Script should be interpreted as a recommendation to buy, sell, or hold any financial instrument. You are fully responsible for your own trading decisions and should consult a qualified financial professional if needed.

### 4. **Third-Party Services**
The Script may interact with third-party services, such as trading platforms or APIs (e.g., Binance). I am not responsible for any issues, losses, or damages caused by these third-party services, including but not limited to service outages, API changes, security breaches, or actions taken by those providers. You are responsible for complying with the terms of service of any third-party platforms you use with the Script.

### 5. **Your Responsibility to Understand**
By using the Script, you confirm that you have sufficient knowledge of trading, financial markets, and the specific strategies implemented in the Script. It is your responsibility to thoroughly test and understand the Script before using it with real funds. I am not liable for any losses or damages resulting from your lack of understanding or improper use.

### 6. **Legal Compliance**
You are solely responsible for ensuring that your use of the Script complies with all applicable laws, regulations, and tax obligations in your jurisdiction. I make no claims about the legality of using the Script in any location and disclaim any liability for your failure to adhere to relevant laws.

### 7. **No Liability for Consequences**
To the fullest extent permitted by law, I shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from or related to your use of the Script. This includes, but is not limited to, financial losses, loss of data, or any other damages, even if I have been informed of the possibility of such outcomes. I completely absolve myself of all consequences resulting from the Script’s operation.

### 8. **Indemnification**
You agree to indemnify, defend, and hold me harmless from any claims, liabilities, damages, losses, or expenses (including legal fees) arising out of or connected to your use of the Script, your trading activities, or your breach of this disclaimer.

### 9. **Acknowledgment**
By launching or using the Script, you acknowledge that you have read, understood, and accepted this disclaimer in full. You understand that you are using the Script at your own risk, and I am not responsible for any results, financial or otherwise, that may occur.

**IMPORTANT:** Launching or using the Script signifies your complete acceptance of these terms. If you proceed, you do so with the full understanding that I, the Creator, am absolved of all consequences arising from its use.

This disclaimer ensures that you, the user, take full responsibility for the Script’s use, leaving no room for legal recourse against me, the Creator. It is clear, thorough, and designed to protect me from any liability.

Copy of this disclaimer is available in the [DISCLAIMER OF LIABILITY FOR TRADING SCRIPT.md](./DISCLAIMER%20OF%20LIABILITY%20FOR%20TRADING%20SCRIPT.md) file.
