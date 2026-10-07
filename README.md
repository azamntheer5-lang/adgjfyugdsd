# CrowdCloud — منصة سحابية ذكية لإدارة الطوابير وضغط الخدمات

![CI](https://github.com/azamntheer5-lang/adgjfyugdsd/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.x-green.svg)

**Working Prototype** لمقرر *Cloud Computing & Distributed Systems* (3CCN314) — المجموعة الثالثة.

---

## النشر بنقرة واحدة (رابط دائم حقيقي)

[![Deploy to Render](https://render.com/images/deploy-button.svg)](https://render.com/deploy?repo=https://github.com/azamntheer5-lang/adgjfyugdsd)

زر واحد → رابط عام دائم `https://<service>.onrender.com` (خطة مجانية).
الإعدادات كاملة في `render.yaml`: Gunicorn 4×2 + فحص صحة `/healthz` + عتبات الحالة.

---

## فكرة المشروع

منصة سحابية تدير طوابير الانتظار للخدمات التي تستقبل أعدادًا كبيرة من المستخدمين في
الوقت نفسه. يختار المستخدم الخدمة المطلوبة، فيحصل على **رقم انتظار (Queue Ticket)**
يستطيع متابعته لحظيًا، بينما يراقب النظام ضغط كل خدمة ويعرض حالتها:

| الحالة | المعنى |
|---|---|
| `NORMAL` | الضغط طبيعي |
| `BUSY` | الخدمة مزدحمة |
| `HIGH LOAD` | ضغط مرتفع جدًا |

الانتقال `NORMAL → BUSY → HIGH LOAD` يحدث فعليًا أثناء التشغيل ويكون مرئيًا في
الواجهة، كما يتطلب المشروع.

**الخدمات الأربع:** Academic Advising · IT Support · Registration Support · Student Services

## التشغيل السريع من GitHub (3 خطوات)

```bash
git clone https://github.com/azamntheer5-lang/adgjfyugdsd.git CrowdCloud
cd CrowdCloud
pip install -r requirements.txt
python run.py
```

ثم افتح **http://127.0.0.1:5000** — لا خطوة إعداد إضافية؛ قاعدة البيانات تُنشأ تلقائيًا.

> يفضَّل استخدام بيئة افتراضية: `python3 -m venv .venv && source .venv/bin/activate`

## المتطلبات

- Python 3.10 أو أحدث (اختُبر على 3.12.14)
- (اختياري للتشغيل الحاوي) Docker و Docker Compose
- (اختياري للاختبارات) `pip install -r requirements-dev.txt`

## التقنيات المستخدمة

| التقنية | الاستخدام |
|---|---|
| Python + Flask | تطبيق الويب وواجهات REST API |
| HTML / CSS / JavaScript | الواجهة (تحديث حي Polling كل 3 ثوانٍ) |
| SQLite (وضع WAL) | قاعدة بيانات التذاكر والخدمات |
| Gunicorn | خادم WSGI للإنتاج (4 عمال × 2 خيوط) |
| Docker + docker-compose | الحاويات والعزل والتشغيل السحابي |
| diagrams.net | المخطط المعماري (`docs/architecture.drawio`) |
| curl + أداة حمل مكافئة لـ ApacheBench | اختبارات الأداء (`benchmarks/bench.py`) |

## واجهة Luxe (عربي أساسي / إنجليزي ثانوي)

- **اللغة الأساسية عربية (RTL)** والإنجليزية ثانوية عبر زر التبديل `EN / عربي`
  في الترويسة (تبديل فوري بدون إعادة تحميل، والاختيار محفوظ في المتصفح).
- تصميم داكن فاخر (أزرق ليلي ملكي + ذهب) مع بطاقات زجاجية، تدرجات ذهبية،
  ولمعان تفاعلي — وصفحة التذكرة بأسلوب بطاقة صعود فخمة.
- خطوط عربية راقية **مستضافة محليًا** (`static/fonts`): أميري للعناوين
  وTajawal للنصوص — لا اعتماد على أي CDN خارجي.
- ترجمة كاملة للنصوص الحية: الحالات (عادي/مزدحم/حمل مرتفع)، حالة التذكرة،
  أزرار لوحة الموظف، الإشعارات (Toasts)، الجداول، وحتى صيغ الجمع العربية
  (دقيقة واحدة/دقيقتين/5 دقائق…).
- فحص آلي شامل **لكل زر** (58/58) عبر متصفح حقيقي في `scripts/luxe_ui_check.py`
  عبر مسار النشر الكامل.

> ملاحظة على أداة الحمل: بيئة إعداد النتائج النهائية لا تتضمن أمر `ab` ولا تسمح
> بتركيبه (بلا صلاحيات root)، لذلك بُنيت أداة `benchmarks/bench.py` بلغة Python
> القياسية فقط وتنتج المقاييس نفسها (RPS، percentiles، نسبة الفشل). أوامر `ab`
> المكافئة جاهزة في `benchmarks/ab_commands.txt`.

## هيكل المشروع

```
CrowdCloud/
├── app/                 # تطبيق Flask (نماذج البيانات، منطق الحمل، المسارات)
│   └── routes/          # REST API + الصفحات
├── templates/           # صفحات Jinja2
├── static/              # CSS + JavaScript
├── database/            # ملف SQLite (يُنشأ تلقائيًا)
├── tests/               # اختبارات pytest (29 اختبارًا)
├── scripts/             # سيناريو العرض + فحص QA وظيفي + أدوات مساندة
├── benchmarks/          # أداة الحمل + مصفوفة الاختبارات + اختبار ضغط تدريجي + النتائج الخام
├── docs/                # التقرير + المخطط المعماري (drawio + PNG) + لقطات الشاشة + الرسوم
├── docker/              # إعداد nginx لسيناريو التوسع
├── .github/workflows/   # CI: pytest + فحص وظيفي على GitHub Actions
├── Dockerfile
├── docker-compose.yml            # تشغيل عقدة واحدة
├── docker-compose.scale.yml      # توسع أفقي (nginx + نسخ متعددة)
├── render.yaml                   # نشر بنقرة واحدة على Render (مجاني)
├── requirements.txt              # تشغيل
├── requirements-dev.txt          # تشغيل + اختبارات
└── README.md
```

## طريقة التثبيت

```bash
cd CrowdCloud
python3 -m venv .venv && source .venv/bin/activate    # اختياري
pip install -r requirements.txt
```

## طريقة التشغيل (التطوير)

```bash
python run.py
# ثم افتح: http://127.0.0.1:5000
```

متغيرات البيئة (كلها اختيارية):

| المتغير | الافتراضي | الوظيفة |
|---|---|---|
| `PORT` | `5000` | منفذ الخادم |
| `CROWDCLOUD_DB` | `database/crowdcloud.db` | مسار قاعدة البيانات |
| `BUSY_THRESHOLD` | `8` | عدد المنتظرين لتحول الخدمة إلى BUSY |
| `HIGH_THRESHOLD` | `16` | عدد المنتظرين لتحولها إلى HIGH LOAD |
| `AUTO_SERVE` | `0` | `1` = تشغيل محاكي "موظف الخدمة" في الخلفية |
| `AUTO_SERVE_INTERVAL` | `25` | ثوانٍ بين كل خدمة تذكرة والأخرى (للمحاكي) |

مثال: `BUSY_THRESHOLD=3 HIGH_THRESHOLD=6 AUTO_SERVE=1 python run.py`

## طريقة تشغيل Docker

```bash
# عقدة واحدة
docker compose up --build
# ثم افتح: http://localhost:5000

# سيناريو التوسع الأفقي (nginx + نسختان)
docker compose -f docker-compose.scale.yml up --build --scale web=2
# ثم افتح: http://localhost:8080
```

قاعدة البيانات محفوظة في Docker Volume باسم `crowdcloud-data` فتبقى التذاكر بعد
إعادة التشغيل. لبدء بيانات نظيفة: `docker compose down` ثم أضف
`-v` لحذف الحجم.

## النشر السحابي (رابط عام)

أسهل طريق: **Render** (الخطة المجانية، دون بطاقة بنكية) — النشر من GitHub مباشرة:

1. أنشئ حسابًا على [render.com](https://render.com)
2. **New → Blueprint** واختر مستودع GitHub هذا — سيتعرف على `render.yaml` تلقائيًا
   (أو يدويًا: **New → Web Service**، Build: `pip install -r requirements.txt`،
   Start: `gunicorn --workers 4 --threads 2 --bind 0.0.0.0:$PORT --timeout 60 run:app`)
3. ستحصل على رابط عام مثل `https://crowdcloud-xxxx.onrender.com`

> على الخطة المجانية يتوقف الخادم بعد فترة خمول ثم يعود تلقائيًا مع أول زيارة
> (تأخير ~50 ثانية)، وقاعدة البيانات تتصدّر مع كل إعادة تشغيل — كافٍ تمامًا للتجربة
> والعرض. الحل الإنتاجي: قرص دائم أو قاعدة بيانات مُدارة.

## طريقة اختبار النظام

```bash
# 1) اختبارات pytest (قاعدة بيانات مؤقتة لكل اختبار)
pip install -r requirements-dev.txt
python -m pytest tests/ -v

# 2) فحص وظيفي شامل على خادم إنتاجي حقيقي (Gunicorn 4×2 كما في Dockerfile)
bash scripts/qa_smoke.sh http://127.0.0.1:5055

# 3) فحص سريع بواجهات API والخادم يعمل
curl http://127.0.0.1:5000/healthz
curl http://127.0.0.1:5000/api/services
curl -X POST http://127.0.0.1:5000/api/tickets \
     -H "Content-Type: application/json" \
     -d '{"service_code": "it_support", "customer_name": "Ali"}'
curl "http://127.0.0.1:5000/api/tickets?service_code=it_support&status=WAITING"
curl -X POST http://127.0.0.1:5000/api/services/it_support/next      # مناداة التالي
curl -X POST http://127.0.0.1:5000/api/tickets/IT-001/status \
     -H "Content-Type: application/json" -d '{"status": "DONE"}'
curl -X POST http://127.0.0.1:5000/api/demo/reset                    # تصفير للعرض
```

## طريقة تجربة NORMAL / BUSY / HIGH LOAD (سيناريو العرض)

الطريقة الأسهل (الخادم يعمل):

```bash
./scripts/demo_scenario.sh http://127.0.0.1:5000
```

يستعرض السكربت المراحل كاملة ويطبع حالة الخدمات الحقيقية بعد كل خطوة:
تصفير ← 3 تذاكر (**NORMAL**) ← 8 تذاكر (**BUSY**) ← 16 تذكرة (**HIGH LOAD**)
← خدمة 3 طلبات فيهبط الضغط إلى **BUSY**، مع بقاء الخدمات الأخرى مستقلة.

للعرض اليدوي أمام اللجنة: افتح الصفحة الرئيسية ثم أنشئ التذاكر من زر
**Get a Ticket** أو من لوحة الموظف `/admin`، وراقب الشارات الخضراء/البرتقالية/الحمراء
تتغير دون تحديث الصفحة (التحديث الحي كل 3 ثوانٍ).

## طريقة تنفيذ اختبارات الأداء

```bash
# أ) شغّل الخادم بإعدادات الإنتاج (مطابقة لإعداد Docker)
CROWDCLOUD_DB=/tmp/bench.db gunicorn --workers 4 --threads 2 \
    --bind 127.0.0.1:5000 run:app

# ب) نفّذ المصفوفة كاملة (3 نقاط نهاية × 3 مستويات + مستوى رابع للكتابة + نقطة تحكم)
./benchmarks/run_benchmarks.sh http://127.0.0.1:5000

# ج) لخص النتائج في CSV + Markdown
python3 benchmarks/summarize.py

# د) اختبار توسّع العمال (يشغّل Gunicorn بـ 1/2/4 عمال بنفسه)
./benchmarks/run_scaling.sh

# هـ) اختبار الضغط التدريجي (Ramp): حدود النظام ومتى يبدأ الأداء بالتراجع
python3 benchmarks/ramp_test.py --url http://127.0.0.1:5000 \
    -o benchmarks/results/ramp_test.json

# و) قياس منفرد بأداة الحمل
python3 benchmarks/bench.py --url http://127.0.0.1:5000 \
    --path /api/tickets --method POST -n 500 -c 10 \
    --body '{"service_code": "it_support", "customer_name": "load-test"}' \
    -o benchmarks/results/my_test.json
```

النتائج الرسمية موجودة في `benchmarks/results/` (ملفات JSON خام + `summary.md` +
`ramp_test.md`)، وملف `VERIFICATION.md` في جذر المستودع يوثّق تشغيلها الكامل من
نسخة GitHub نفسها.

## ملاحظات مهمة للتشغيل

- **مفتاح العرض الحي:** المتصفح يسحب الحالة من `/api/services` كل 3 ثوانٍ؛ إذا
  فتحت الصفحة على جهازين (مستخدم + موظف) سترى التغييرات في الطرفين لحظيًا.
- **AUTO_SERVE** مصمم للتشغيل المحلي بعملية واحدة (`python run.py`). عند تشغيل
  عمال Gunicorn متعددة يبقى معطّلًا افتراضيًا (كل عامل يبدّل خيطًا خاصًا فتتسارع
  المعالجة) — الشرح في التقرير.
- **/api/demo/reset** أداة تسهيل للعرض فقط، ويجب إزالتها أو حمايتها قبل أي نشر حقيقي.
- **Docker في بيئة إعداد هذا التسليم غير متوفر**، لذلك اختُبر التطبيق فعليًا عبر
  Gunicorn بالإعدادات نفسها الموجودة في `Dockerfile`، وملفات الحاويات جاهزة
  للتشغيل على أي جهاز فيه Docker (خطوات التشغيل أعلاه).
- المسارات الأساسية: `/` الصفحة الرئيسية، `/queue` لوحة الانتظار، `/admin` لوحة
  الموظف، `/ticket/<رقم-التذكرة>` متابعة التذكرة، `/healthz` فحص الجهوزية.
