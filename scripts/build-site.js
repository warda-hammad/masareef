// بيجهز فولدر النشر (_site افتراضياً) بملفات الموقع بس: نفس ASSETS بتاعة sw.js،
// و sw.js نفسه، وتراخيص الخطوط. الاختبارات و CLAUDE.md وأي حاجة تانية مبتترفعش.
// مفيش build للكود: الملفات بتتنسخ زي ما هي.
//   node scripts/build-site.js [out-dir]
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, readSw, computeVersion } = require('./sw-version');

const EXTRA = ['sw.js', 'fonts/OFL-Alexandria.txt', 'fonts/OFL-JetBrainsMono.txt'];

function siteFiles() {
  const { ASSETS } = readSw();
  return ASSETS.filter((a) => a !== './').concat(EXTRA);
}

// build بيمسح فولدر النشر قبل ما ينسخ، فلازم يكون اسم فولدر بسيط جوه المشروع مباشرةً:
// يبدأ بحرف أو _، ومن غير "." أو "/" (يعني مستحيل يبقى "." أو ".." أو مسار برا المشروع)
function resolveOutDir(name) {
  const dir = name || '_site';
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(dir)) {
    throw new Error('اسم فولدر النشر لازم يكون اسم بسيط زي _site، مش "' + dir + '"');
  }
  const out = path.join(ROOT, dir);
  if (path.dirname(out) !== ROOT) throw new Error('فولدر النشر لازم يكون جوه المشروع مباشرةً');
  return out;
}

function checkVersion() {
  const { VERSION, ASSETS } = readSw();
  const expected = computeVersion(ASSETS);
  if (VERSION !== expected) {
    throw new Error('sw.js VERSION (' + VERSION + ') مش متحدّث (' + expected + '). شغّلي: node scripts/sw-version.js --write');
  }
}

// بينسخ ملفات الموقع لفولدر موجود (من غير ما يمسح حاجة)
function copyTo(out) {
  const files = siteFiles();
  files.forEach((file) => {
    const dest = path.join(out, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), dest);
  });
  // GitHub Pages: من غير Jekyll، الملفات تتنشر زي ما هي
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  return files;
}

function build(name) {
  const out = resolveOutDir(name);
  checkVersion();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out);
  return { out, files: copyTo(out) };
}

module.exports = { siteFiles, resolveOutDir, checkVersion, copyTo, build };

if (require.main === module) {
  const { out, files } = build(process.argv[2]);
  console.log('اتجهز ' + files.length + ' ملف في ' + out);
}
