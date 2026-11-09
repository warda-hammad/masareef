# مصاريفي

تطبيق بسيط لتسجيل المصاريف بالجنيه المصري. واجهته عربي (RTL)، وبيشتغل على الموبايل وبيتثبت كتطبيق (PWA)، وبيشتغل من غير إنترنت.

موقع static بس: HTML و CSS و JavaScript عادي، من غير backend ولا framework ولا build.

## المميزات

- إضافة وتعديل ومسح مصروف (المبلغ، الفئة، التاريخ، ملاحظة)، مع «تراجع» بعد المسح.
- فئات جاهزة (أكل، مواصلات، فواتير، إيجار، صحة، خروجات، تانيين)، وفئات مخصصة باسم ولون.
- ميزانية شهرية، وتحذير عند 80% وعند تعدّيها.
- داشبورد: إجمالي الشهر ومقارنته بالشهر اللي فات، وأكبر فئة، والمتوسط اليومي، و charts للفئات وأيام الشهر.
- بحث في الملاحظات والفئات، وفلتر بالشهر والفئة. الفلتر بيتحفظ في الرابط.
- تصدير واستيراد CSV. الاستيراد بيفهم ملفات Excel العربي (Windows-1256، والفاصل `;`، والتاريخ `9/11/2026`).
- مسح كل البيانات من الجهاز.

## الخصوصية

كل البيانات في `localStorage` على الجهاز والمتصفح ده بس. مفيش سيرفر بيستقبل بيانات، ومفيش حساب، ولا تتبع، ولا cookies، ولا ملفات من مواقع تانية. فيه Content Security Policy بتمنع الصفحة إنها تتصل بأي موقع تاني. التفاصيل في [privacy.html](privacy.html).

## التشغيل على الجهاز

- أسرع طريقة: فتح `index.html` في المتصفح.
- عشان تجربة الـ PWA (التثبيت والشغل من غير نت) لازم سيرفر محلي، لأن الـ service worker بيشتغل على `localhost` أو `https` بس:

  ```
  python -m http.server 8642
  ```

  وبعدين فتح http://127.0.0.1:8642

## الاختبارات

محتاجة Node 24 أو أحدث، ومن غير أي packages:

```
node --test
```

## بعد أي تعديل في ملفات الموقع

الـ service worker بيخزّن نسخة من الملفات على أجهزة الناس. عشان التعديل يوصلهم، لازم رقم النسخة يتحدث:

```
node scripts/sw-version.js --write
```

الاختبارات بتفشل لو ده اتنسى، وكمان لو فيه ملف جديد مش متضاف لقايمة `ASSETS` في `sw.js`.

## النشر ببلاش

الفولدر اللي بيترفع هو `_site`، وبيتجهز بالأمر ده:

```
node scripts/build-site.js _site
```

فيه ملفات الموقع بس (من غير الاختبارات والملفات الداخلية). الأمر بيرفض يكمل لو رقم نسخة الـ service worker مش متحدّث.

### GitHub Pages

الـ workflow موجود في `.github/workflows/pages.yml`: بيشغّل الاختبارات، ويجهز `_site`، وينشره مع كل push على `main` أو `master`.

1. عمل repo على GitHub ورفع المشروع عليه.
2. الـ workflow بيشتغل مع أي push على `main` أو `master`. GitHub بيسمح افتراضياً بالنشر من البرانش الأساسي للـ repo بس، فلو الاتنين موجودين، التاني محتاج يتضاف في Settings ← Environments ← github-pages.
3. في الـ repo: Settings ← Pages ← Source = **GitHub Actions**.
4. بعد أول push، الرابط بيبقى `https://<username>.github.io/<repo>/`. التطبيق شغال من فولدر فرعي عادي، لأن كل المسارات نسبية.

GitHub Pages مش بيسمح بـ headers مخصصة، فالـ CSP جاية من `<meta>` جوه كل صفحة.

### Netlify

`netlify.toml` جاهز: بيشغّل الاختبارات، ويجهز `_site`، وينشره، وبيضيف headers أمان (CSP كاملة ومعاها `frame-ancestors`، و `nosniff`، و `no-referrer`)، وبيخلي `sw.js` يتسأل عليه كل مرة.

- **ربط الـ repo** (الأحسن): Add new site ← Import from Git، واختيار الـ repo. الإعدادات بتتقري من `netlify.toml` لوحدها.
- **سحب وإفلات**: تشغيل `node scripts/build-site.js _site`، وبعدين سحب فولدر `_site` لـ https://app.netlify.com/drop. في الطريقة دي `netlify.toml` مش بيتقري، فالـ headers الزيادة مش هتتطبق، بس الـ CSP اللي في `<meta>` فضلت شغالة.

### Cloudflare Pages

Build command: `node scripts/build-site.js _site`. Build output directory: `_site`. ومتغير البيئة `NODE_VERSION=24`.

## الخطوط

- [Alexandria](https://github.com/Gue3bara/Alexandria) للعربي.
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) للأرقام.

الاتنين بترخيص SIL Open Font License 1.1، والتراخيص في `fonts/`.
