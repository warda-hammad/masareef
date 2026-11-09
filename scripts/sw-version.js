// VERSION بتاع sw.js = أول 10 حروف من sha256 لمحتوى كل الملفات اللي في ASSETS.
// لو أي ملف اتغير والـ VERSION متغيرش، المتصفحات هتفضل شايلة النسخة القديمة.
//   node scripts/sw-version.js          → يطبع الـ VERSION الصح
//   node scripts/sw-version.js --write  → يكتبه في sw.js
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const SW = path.join(ROOT, 'sw.js');
const TEXT = /\.(html|css|js|json|webmanifest|svg|txt)$/;

// بيشغّل sw.js في vm عشان ياخد ASSETS و VERSION زي ما هما في الملف
function readSw() {
  const ctx = vm.createContext({ self: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync(SW, 'utf8') + '\n;this.__sw = { VERSION, ASSETS };', ctx);
  return { VERSION: ctx.__sw.VERSION, ASSETS: Array.from(ctx.__sw.ASSETS) };
}

function computeVersion(assets) {
  const hash = crypto.createHash('sha256');
  assets.filter((a) => a !== './').slice().sort().forEach((file) => {
    let data = fs.readFileSync(path.join(ROOT, file));
    // git على ويندوز ممكن يحوّل LF لـ CRLF؛ منخليش ده يغير الـ hash
    if (TEXT.test(file)) data = Buffer.from(data.toString('utf8').replace(/\r\n/g, '\n'));
    hash.update(file + '\0').update(data).update('\0');
  });
  return 'v-' + hash.digest('hex').slice(0, 10);
}

module.exports = { ROOT, readSw, computeVersion };

if (require.main === module) {
  const { VERSION, ASSETS } = readSw();
  const next = computeVersion(ASSETS);
  if (process.argv.includes('--write')) {
    if (next === VERSION) {
      console.log('sw.js VERSION already up to date: ' + VERSION);
    } else {
      const src = fs.readFileSync(SW, 'utf8').replace(/const VERSION = '[^']*';/, "const VERSION = '" + next + "';");
      fs.writeFileSync(SW, src);
      console.log('sw.js VERSION: ' + VERSION + ' → ' + next);
    }
  } else {
    console.log(next);
  }
}
