const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Testing Playwright browser launch...');
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    console.log('Browser launched successfully! Opening page...');
    const page = await browser.newPage();
    await page.goto('https://www.tradingview.com/symbols/BTCUSD/?exchange=BINANCE');
    
    console.log('Page loaded! Browser should be visible now.');
    console.log('Waiting 10 seconds before closing...');
    
    await new Promise(resolve => setTimeout(resolve, 10000));
    await browser.close();
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Error launching browser:', error.message);
  }
})();