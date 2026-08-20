# Medical Leads CRM — Production Installation & Integrations

> **الغرض:** دليل رفع وتشغيل Medical Leads CRM على سيرفر حقيقي، ربطه بدومين وHTTPS، ثم إعداد Meta وTikTok وSnapchat وGeneric/Google Webhooks.
>
> **تمت مراجعة الكود:** 20 أغسطس 2026.
>
> استبدل كل قيمة بين `<...>` ببياناتك الفعلية. لا تنسخ أسرار الأمثلة كما هي.

---

## 1. قبل أن تبدأ

النظام ليس WordPress Plugin ولا مجموعة ملفات PHP. هو تطبيق مستقل يحتاج:

- Node.js Backend مبني بـ NestJS.
- React Frontend مبني بـ Vite.
- PostgreSQL Database.
- Process دائم أو Docker.
- Reverse Proxy مثل Nginx.
- HTTPS حقيقي لاستقبال Webhooks وتشغيل OAuth.

### نوع الاستضافة المناسب

المسار الموصى به هو VPS أو Cloud Server يعمل بـ Ubuntu 24.04 LTS، مع:

- 2 vCPU على الأقل.
- 4 GB RAM موصى بها.
- 40 GB SSD أو أكثر.
- Public IPv4.
- SSH وsudo access.
- دومين تملك إعدادات DNS الخاصة به.

الـ Shared Hosting أو cPanel العادي لن يكون مناسبًا إلا إذا كان يدعم Node.js 22، PostgreSQL، تشغيل Process دائم، Reverse Proxy، Environment Variables، وWebhooks. وجود WordPress على نفس الاستضافة لا يعني أن CRM يمكن رفعه كإضافة WordPress.

### شكل النشر الموصى به

استخدم دومينًا فرعيًا واحدًا مثل:

```text
https://crm.example.com
```

ثم اجعل:

- الواجهة: `https://crm.example.com/`
- الـ API: `https://crm.example.com/api/`
- Meta callback: `https://crm.example.com/api/facebook/callback`
- TikTok callback: `https://crm.example.com/api/tiktok/callback`
- Snapchat callback: `https://crm.example.com/api/snapchat/callback`
- Meta webhook: `https://crm.example.com/api/webhooks/meta`
- TikTok webhook: `https://crm.example.com/api/webhooks/tiktok`
- Snapchat webhook: `https://crm.example.com/api/webhooks/snapchat`
- Generic webhook: `https://crm.example.com/api/webhooks/leads`
- Google webhook: `https://crm.example.com/api/webhooks/google`

هذا الشكل يجعل الـ Frontend والـ API على نفس الـ Origin، فيبسط الـ Cookies وCORS.

---

## 2. معلومات ستحتاجها

جهز القيم التالية قبل التنفيذ:

```text
DOMAIN=crm.example.com
SERVER_IP=203.0.113.10
DEPLOY_PATH=/opt/medical-leads-crm
PUBLIC_PATH=/var/www/medical-leads-crm
ADMIN_EMAIL=admin@example.com
```

لا تستخدم عنوان IP الموجود في المثال؛ استخدم IP السيرفر الحقيقي.

---

## 3. ربط الدومين بالسيرفر

من لوحة DNS الخاصة بالدومين:

1. أنشئ `A Record`.
2. Name/Host: `crm`.
3. Value: Public IPv4 الخاص بالسيرفر.
4. TTL: Auto أو 300 أثناء التجهيز.
5. إذا لم تضبط IPv6، لا تنشئ `AAAA Record` عشوائيًا.

اختبر من جهازك:

```powershell
nslookup crm.example.com
```

يجب أن يظهر IP السيرفر. انتشار DNS قد يستغرق وقتًا حسب المزود والـ TTL.

---

## 4. الملفات التي ترفعها

ارفع:

- `backend/src`
- `backend/prisma`
- `backend/docs`
- `backend/n8n`
- `backend/postman`
- ملفات إعداد وبناء الـ Backend.
- `frontend/src`
- `frontend/public`
- ملفات إعداد وبناء الـ Frontend.
- ملفات README وINSTALLATION.

لا ترفع إلى السيرفر العام:

- أي `.env` من جهاز التطوير.
- `node_modules`.
- `frontend/dist` القديم؛ سنعيد بناءه للإنتاج.
- ملفات `*.log`.
- `db-recovery-20260820` ضمن ملفات الموقع.
- Dumps أو Backups داخل `/var/www`.
- بيانات Git أو أدوات التطوير غير المطلوبة.

احتفظ بنسخ الاستعادة في Storage خاص ومشفر، وليس داخل Document Root.

### الرفع باستخدام WinSCP

1. افتح WinSCP.
2. اختر SFTP.
3. أدخل IP السيرفر وSSH username/key.
4. أنشئ `/opt/medical-leads-crm`.
5. ارفع مجلدي `backend` و`frontend` والوثائق إليه.

### الرفع باستخدام SCP من PowerShell

من جهاز Windows، وبعد تجهيز نسخة نظيفة من المشروع:

```powershell
scp -r "H:\Mo Makarem\Client Project\Medical Leads CRM\backend" <server-user>@<server-ip>:/opt/medical-leads-crm/
scp -r "H:\Mo Makarem\Client Project\Medical Leads CRM\frontend" <server-user>@<server-ip>:/opt/medical-leads-crm/
```

لا تستخدم هذا الأمر مباشرة إذا كانت المجلدات ما زالت تحتوي `.env` أو `node_modules` أو logs. نظف نسخة الرفع أولًا أو استخدم SFTP وحدد ملفات المصدر فقط.

---

## 5. تجهيز Ubuntu

اتصل بالسيرفر:

```bash
ssh <server-user>@<server-ip>
```

حدّث النظام وثبت الأدوات الأساسية:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx ufw ca-certificates curl git
```

ثبت Docker Engine وDocker Compose plugin وفق وثائق Docker الرسمية الخاصة بإصدار Ubuntu عند التنفيذ، ثم تحقق:

```bash
docker --version
docker compose version
```

أضف المستخدم إلى مجموعة Docker إن كنت تريد تشغيل Docker بدون sudo، ثم اخرج وادخل من SSH من جديد:

```bash
sudo usermod -aG docker "$USER"
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

لا تفتح PostgreSQL `5432` أو NestJS `3000` للعالم. يجب أن يصل إليهما Nginx أو Docker داخليًا فقط.

---

## 6. إعداد Production Environment

انتقل للمشروع:

```bash
cd /opt/medical-leads-crm
```

أنشئ ملفًا خاصًا بالإنتاج:

```bash
nano backend/.env.production
```

مثال كامل. غيّر القيم السرية:

```env
NODE_ENV=production
PORT=3000

POSTGRES_DB=medical_crm
POSTGRES_USER=medical_crm
POSTGRES_PASSWORD=<LONG_RANDOM_DATABASE_PASSWORD>
DATABASE_URL=postgresql://medical_crm:<LONG_RANDOM_DATABASE_PASSWORD>@postgres:5432/medical_crm?schema=public

JWT_SECRET=<64_OR_MORE_RANDOM_CHARACTERS>
JWT_EXPIRES_IN=3600
AUTH_COOKIE_NAME=medical_crm_access
COOKIE_SECURE=true
CORS_ORIGIN=https://crm.example.com
LOG_LEVEL=log
SECURITY_ENFORCE_HTTPS=true
SECURITY_HSTS_MAX_AGE=15552000
DUPLICATE_WINDOW_DAYS=30

META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://crm.example.com/api/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=<LONG_RANDOM_VERIFY_TOKEN>
META_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>

TIKTOK_APP_ID=
TIKTOK_APP_SECRET=
TIKTOK_REDIRECT_URI=https://crm.example.com/api/tiktok/callback
TIKTOK_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>
TIKTOK_API_BASE_URL=https://business-api.tiktok.com/open_api/v1.3
TIKTOK_OAUTH_AUTHORIZE_URL=
TIKTOK_OAUTH_TOKEN_URL=
TIKTOK_SCOPES=lead_management,advertiser_management

SNAPCHAT_CLIENT_ID=
SNAPCHAT_CLIENT_SECRET=
SNAPCHAT_REDIRECT_URI=https://crm.example.com/api/snapchat/callback
SNAPCHAT_TOKEN_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_KEY>
SNAPCHAT_API_BASE_URL=https://adsapi.snapchat.com/v1
SNAPCHAT_OAUTH_AUTHORIZE_URL=https://accounts.snapchat.com/login/oauth2/authorize
SNAPCHAT_OAUTH_TOKEN_URL=https://accounts.snapchat.com/login/oauth2/access_token
SNAPCHAT_SCOPES=snapchat-marketing-api
```

استخدم كلمات سر Hex لتجنب مشاكل URL encoding في `DATABASE_URL`:

```bash
openssl rand -hex 32
```

نفذ الأمر عدة مرات لإنشاء Database password وJWT secret وverify/encryption keys مختلفة. لا تعِد استخدام نفس المفتاح لكل خدمة.

احمِ الملف:

```bash
chmod 600 backend/.env.production
```

### ملاحظة مهمة عن الأسرار

- لا ترسل `.env.production` بالبريد أو WhatsApp.
- لا تضعه في Git.
- لا تعرضه في Screenshot.
- لا تستخدم QA passwords أو القيم الموجودة في `docker-compose.yml` الحالي.
- إذا تسرب مفتاح، غيّره فورًا وأعد توصيل التكامل المتأثر.

---

## 7. Docker Compose للإنتاج

ملف `backend/docker-compose.yml` الحالي مناسب للتطوير وليس Production كما هو، لأنه يحتوي قيم تطوير ويفتح منفذ PostgreSQL.

أنشئ في جذر المشروع:

```bash
nano compose.production.yml
```

ضع:

```yaml
services:
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    env_file:
      - ./backend/.env.production
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    env_file:
      - ./backend/.env.production
    volumes:
      - medical_crm_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U medical_crm -d medical_crm"]
      interval: 5s
      timeout: 5s
      retries: 20
    restart: unless-stopped

volumes:
  medical_crm_postgres_data:
```

شغل:

```bash
docker compose -f compose.production.yml build --no-cache
docker compose -f compose.production.yml up -d
docker compose -f compose.production.yml ps
docker compose -f compose.production.yml logs --tail=100 api
```

الـ Backend Docker image يشغل Prisma migrations قبل تشغيل NestJS.

اختبر محليًا على السيرفر:

```bash
curl -i http://127.0.0.1:3000/auth/me
```

الحصول على `401 Unauthorized` هنا يعني غالبًا أن API تعمل وتطلب Login، وهو متوقع لهذا endpoint.

---

## 8. بناء الـ Frontend للإنتاج

أنشئ:

```bash
nano frontend/.env.production
```

المحتوى:

```env
VITE_API_BASE_URL=/api
```

ثبت Node.js 22 على السيرفر أو استخدم بيئة بناء منفصلة، ثم:

```bash
cd /opt/medical-leads-crm/frontend
npm ci
npm run typecheck
npm run build
```

انشر ناتج البناء:

```bash
sudo mkdir -p /var/www/medical-leads-crm
sudo rsync -a --delete dist/ /var/www/medical-leads-crm/
sudo chown -R www-data:www-data /var/www/medical-leads-crm
sudo find /var/www/medical-leads-crm -type d -exec chmod 755 {} \;
sudo find /var/www/medical-leads-crm -type f -exec chmod 644 {} \;
```

لا تنشر `frontend/src` داخل `/var/www`. المطلوب هناك محتويات `dist` فقط.

---

## 9. إعداد Nginx والدومين

أنشئ:

```bash
sudo nano /etc/nginx/sites-available/medical-leads-crm
```

ضع، مع تغيير الدومين:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name crm.example.com;

    root /var/www/medical-leads-crm;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 20m;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. {
        deny all;
    }
}
```

فعّل الموقع:

```bash
sudo ln -s /etc/nginx/sites-available/medical-leads-crm /etc/nginx/sites-enabled/medical-leads-crm
sudo nginx -t
sudo systemctl reload nginx
```

إذا ظهر الموقع الافتراضي بدل CRM، راجع `sites-enabled/default` وتعارض `server_name` قبل تعطيله.

اختبر:

```bash
curl -I http://crm.example.com
curl -i http://crm.example.com/api/auth/me
```

---

## 10. تفعيل HTTPS

يجب أن يكون DNS صحيحًا، وNginx يرد على port 80، والـ Firewall يسمح بـ 80 و443.

ثبت Certbot بالطريقة الرسمية المناسبة لإصدار Ubuntu، ثم:

```bash
sudo certbot --nginx -d crm.example.com
```

اختر Redirect من HTTP إلى HTTPS. اختبر التجديد:

```bash
sudo certbot renew --dry-run
```

اختبر:

```bash
curl -I https://crm.example.com
curl -i https://crm.example.com/api/auth/me
```

بعد نجاح HTTPS فقط، أعد تشغيل API للتأكد من إعدادات `COOKIE_SECURE` وHTTPS:

```bash
cd /opt/medical-leads-crm
docker compose -f compose.production.yml restart api
```

مرجع Certbot الرسمي: <https://certbot.eff.org/instructions>

---

## 11. إنشاء أول Admin

لا تشغّل `npm run db:seed` على قاعدة الإنتاج. الـ Seed الحالي يمسح بيانات تشغيلية وينشئ QA users وLeads تجريبية.

قبل الإطلاق تحتاج طريقة آمنة لإنشاء أول Admin. الخيارات المقبولة:

1. Migration/Bootstrap command مخصص ينشئ Admin واحدًا من Environment Variables.
2. Admin provisioning script منفصل يعمل مرة واحدة ويستخدم Argon2id.
3. إنشاء المستخدم يدويًا بواسطة مطور يعرف Schema وArgon2، ثم حذف أداة الإنشاء.

لا تدخل Password كنص عادي في جدول `users`. يجب تخزين Argon2 hash.

الكود الحالي لا يحتوي Production-safe CLI واضح لإنشاء أول Admin؛ يجب تجهيز هذه الخطوة قبل نشر النظام لمستخدمين فعليين.

---

## 12. فحص التطبيق قبل التكاملات

1. افتح `https://crm.example.com`.
2. سجل الدخول بحساب Admin حقيقي.
3. أنشئ Treatment تجريبيًا.
4. أنشئ Lead يدويًا.
5. غيّر الحالة.
6. أنشئ Follow-up.
7. تأكد من Activity Timeline.
8. راجع Dashboard وReports.
9. اختبر Logout/Login.
10. افتح DevTools وتأكد أنه لا توجد أخطاء CORS أو Mixed Content.

تابع اللوج:

```bash
docker compose -f /opt/medical-leads-crm/compose.production.yml logs -f --tail=200 api
```

---

## 13. إعداد Meta Lead Ads

### المتطلبات

- Meta Business portfolio.
- Facebook Page.
- Instant Form منشور.
- Meta Developer account.
- App مربوطة بالـ Business.
- Privacy Policy URL وData Deletion instructions عند طلب Meta.
- صلاحية إدارة Page وLeads Access.
- App Review/Advanced Access للصلاحيات المطلوبة عند استخدام حسابات حقيقية خارج أدوار التطبيق.

الكود الحالي يطلب:

```text
pages_show_list
leads_retrieval
pages_manage_metadata
```

ويستخدم Graph API `v20.0` بشكل ثابت داخل الكود. قبل Production يجب التأكد أن هذا الإصدار ما زال مدعومًا لحسابك، وتحديثه واختباره إذا انتهى دعمه.

### 13.1 إنشاء وإعداد Meta App

1. افتح Meta for Developers.
2. أنشئ App مناسبة لاستخدام Business/Lead Ads.
3. اربطها بالـ Business المطلوب.
4. أضف Facebook Login المناسب وWebhooks/Page subscription وفق الواجهة الحالية للمنصة.
5. أضف Valid OAuth Redirect URI بالضبط:

```text
https://crm.example.com/api/facebook/callback
```

6. داخل Webhooks اختر Page object واشترك في field:

```text
leadgen
```

7. Callback URL:

```text
https://crm.example.com/api/webhooks/meta
```

8. Verify Token يجب أن يساوي `META_WEBHOOK_VERIFY_TOKEN` في السيرفر حرفيًا.
9. انسخ App ID وApp Secret إلى `.env.production`.
10. أعد تشغيل API.

```bash
docker compose -f /opt/medical-leads-crm/compose.production.yml up -d --build api
```

### 13.2 التوصيل من CRM

1. ادخل بحساب Admin.
2. افتح Integrations.
3. اضغط Connect في Meta.
4. وافق على الصلاحيات.
5. Meta ستعيدك إلى callback وستظهر استجابة JSON بها `session_id` و`pages`.

**مهم:** الواجهة الحالية لا تكمل اختيار Page/Form وحفظ Connection بعد الـ callback. تحتاج إكمالًا يدويًا أو تطوير هذه الخطوة في UI.

من نفس Browser session:

1. اختر `page_id` من JSON.
2. افتح:

```text
https://crm.example.com/api/facebook/sessions/<SESSION_ID>/forms?page_id=<PAGE_ID>
```

3. اختر `form_id`.
4. من Console داخل صفحة CRM نفّذ بعد استبدال القيم:

```javascript
fetch('/api/facebook/connections', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: '<SESSION_ID>',
    page_id: '<PAGE_ID>',
    form_id: '<FORM_ID>'
  })
}).then(r => r.json()).then(console.log)
```

عند الحفظ، الـ Backend يشترك تلقائيًا في `leadgen` للـ Page ويحفظ Page token مشفرًا.

### 13.3 الاختبار

- استخدم Meta Lead Ads Testing Tool أو Lead form test.
- أرسل Lead باسم ورقم واضحين.
- راقب logs للرسائل `Meta Webhook Received` و`Meta Lead Created`.
- تأكد أن Lead ظهر بـ `sourceChannel=Meta`.
- تأكد من Activity `lead_created_via_meta`.
- اختبر Duplicate والتوزيع.

مرجع Meta الرسمي: <https://developers.facebook.com/docs/marketing-api/guides/lead-ads/>

---

## 14. إعداد TikTok Lead Generation

### المتطلبات

- TikTok for Business account.
- Advertiser account.
- Instant Lead Form.
- TikTok API for Business developer app.
- الموافقة على الصلاحيات المتعلقة بإدارة المعلنين واسترجاع Leads.
- Webhook subscription للـ Lead Generation events.

بوابة TikTok الرسمية: <https://business-api.tiktok.com/portal>

### 14.1 إعداد App

1. أنشئ App داخل TikTok API for Business.
2. اطلب/فعّل المنتجات والصلاحيات الخاصة بـ Lead Generation.
3. أضف Redirect URI بالضبط:

```text
https://crm.example.com/api/tiktok/callback
```

4. أضف Webhook URL:

```text
https://crm.example.com/api/webhooks/tiktok
```

5. اشترك في Lead Generation/Lead event المناسب الموجود في لوحة TikTok وقت التنفيذ.
6. انسخ App ID وSecret.
7. من الوثائق الخاصة بإصدار App لديك، انسخ OAuth Authorize URL وOAuth Token URL الدقيقين إلى:

```env
TIKTOK_OAUTH_AUTHORIZE_URL=<OFFICIAL_AUTHORIZE_URL_FOR_YOUR_APP>
TIKTOK_OAUTH_TOKEN_URL=<OFFICIAL_TOKEN_URL_FOR_YOUR_APP>
```

لا تخمّن هذين الرابطين؛ TikTok يغير منتجات وإصدارات API، والكود يتعمد تركهما فارغين في `.env.example`.

8. تأكد أن Scopes المعتمدة لحسابك تطابق ما يرسله الكود. الافتراضي الحالي:

```env
TIKTOK_SCOPES=lead_management,advertiser_management
```

9. أعد Build/Restart للـ API.

### 14.2 التوصيل من CRM

1. Admin → Integrations → TikTok → Connect.
2. وافق على الوصول.
3. callback سيعيد JSON به `session_id` و`advertisers`.
4. اختر `advertiser_id`.
5. افتح:

```text
https://crm.example.com/api/tiktok/sessions/<SESSION_ID>/forms?advertiser_id=<ADVERTISER_ID>
```

6. اختر Form ثم نفّذ من Console داخل CRM:

```javascript
fetch('/api/tiktok/connections', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: '<SESSION_ID>',
    advertiser_id: '<ADVERTISER_ID>',
    form_id: '<FORM_ID>'
  })
}).then(r => r.json()).then(console.log)
```

### 14.3 Webhook payload المتوقع في الكود

الكود الحالي يبحث عن:

```json
{
  "lead_id": "<LEAD_ID>",
  "advertiser_id": "<ADVERTISER_ID>",
  "form_id": "<FORM_ID>"
}
```

ويدعم وجود هذه القيم داخل `data` أو `event` أيضًا. بعد الاستلام يجلب تفاصيل Lead من TikTok ثم يحفظه.

### 14.4 نقاط يجب اختبارها قبل التشغيل الحقيقي

- الـ API adapter الحالي يستخدم TikTok API base `v1.3` ومسارات `lead/form/list/` و`lead/get/`.
- يجب مقارنة المسارات وشكل Response مع النسخة المعتمدة فعليًا لتطبيقك.
- الكود يخزن Refresh Token لكنه لا يحتوي حاليًا على Token refresh flow تلقائي واضح؛ عند انتهاء Access Token قد يتوقف استقبال التفاصيل إلى أن تعيد التوصيل.
- تسجيل Webhook غير منفذ تلقائيًا داخل `saveConnection`؛ يجب ضبطه من TikTok أو API رسميًا.
- أضف verification/signature validation حسب آلية TikTok الحالية قبل استقبال بيانات حقيقية.

اختبر Test Lead وراقب `TikTok Webhook Received`, `TikTok Lead Retrieved`, و`TikTok Lead Created`.

---

## 15. إعداد Snapchat Lead Generation

### المتطلبات

- Snap Business Manager.
- Organization Admin access.
- Ad Account وLead Generation Form.
- OAuth App داخل Business Details.
- `snapchat-marketing-api` scope.

وفق توثيق Snap، OAuth App ينشأ من Business Manager، وRedirect URI يجب أن يطابق تمامًا. Access tokens قصيرة العمر وتحتاج Refresh Token للتجديد.

### 15.1 إعداد OAuth App

1. ادخل Snap Business Manager كـ Organization Admin.
2. افتح Business Details → OAuth Apps.
3. أنشئ App.
4. Redirect URI:

```text
https://crm.example.com/api/snapchat/callback
```

5. ضع القيم في `.env.production`:

```env
SNAPCHAT_CLIENT_ID=<CLIENT_ID>
SNAPCHAT_CLIENT_SECRET=<CLIENT_SECRET>
SNAPCHAT_REDIRECT_URI=https://crm.example.com/api/snapchat/callback
SNAPCHAT_OAUTH_AUTHORIZE_URL=https://accounts.snapchat.com/login/oauth2/authorize
SNAPCHAT_OAUTH_TOKEN_URL=https://accounts.snapchat.com/login/oauth2/access_token
SNAPCHAT_SCOPES=snapchat-marketing-api
```

6. أعد تشغيل API.

مرجع OAuth الرسمي: <https://developers.snap.com/marketing-api/Ads-API/authentication>

### 15.2 التوصيل من CRM

1. Admin → Integrations → Snapchat → Connect.
2. وافق على الوصول.
3. callback سيظهر JSON به `session_id` و`ad_accounts`.
4. اختر `ad_account_id`.
5. افتح:

```text
https://crm.example.com/api/snapchat/sessions/<SESSION_ID>/forms?ad_account_id=<AD_ACCOUNT_ID>
```

6. اختر Form ونفّذ:

```javascript
fetch('/api/snapchat/connections', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    session_id: '<SESSION_ID>',
    ad_account_id: '<AD_ACCOUNT_ID>',
    form_id: '<FORM_ID>'
  })
}).then(r => r.json()).then(console.log)
```

### 15.3 إنشاء Webhook Integration

Snap يتيح Public Webhook integration لكل Form، وواحد فقط لكل Form. أنشئه باستخدام API الرسمي بعد الحصول على Access Token:

```bash
curl -X POST \
  -H "Authorization: Bearer <SNAP_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"webhook_integrations":[{"form_id":"<FORM_ID>","webhook_url":"https://crm.example.com/api/webhooks/snapchat"}]}' \
  https://adsapi.snapchat.com/v1/lead_gen/integrations/public_webhook
```

احفظ `integrationId` و`hmacSecret` في Secret Manager. لا تضعهما في Frontend.

اختبار رسمي:

```bash
curl -H "Authorization: Bearer <SNAP_ACCESS_TOKEN>" \
  "https://adsapi.snapchat.com/v1/lead_gen/integrations/<INTEGRATION_ID>/test"
```

مرجع Lead Generation الرسمي: <https://developers.snap.com/marketing-api/Ads-API/lead-generation-ads>

### 15.4 فجوات يجب إغلاقها

- الكود الحالي لا ينشئ Webhook integration تلقائيًا.
- لا يخزن أو يتحقق من Snap HMAC signature حاليًا، رغم أن Snap يعيد HMAC secret مع إنشاء Integration.
- الكود يخزن Refresh Token لكن لا يجدد Access Token تلقائيًا.
- الوثائق الرسمية الحالية تعرض endpoint للـ Forms باسم `lead_generation_forms`، بينما Adapter الحالي يستخدم `/lead_forms`. يجب اختبار/تحديث المسار قبل الاعتماد.
- Snap webhook الحالي قد يحتوي بيانات Lead مباشرة، بينما Adapter يحاول جلب التفاصيل من endpoint إضافي. تحقق من العقد الفعلي وعدّل المابنج إذا لزم.

لا تشغل Snapchat على بيانات مرضى حقيقية قبل معالجة Signature verification وToken refresh والتوافق مع endpoints.

---

## 16. Generic Webhook وGoogle

### Generic

```text
POST https://crm.example.com/api/webhooks/leads
```

Body:

```json
{
  "name": "Mohammed Ahmed",
  "phone": "+201012345678",
  "source_channel": "Website",
  "campaign_name": "Hair Transplant Campaign",
  "treatment": "Hair Transplant"
}
```

### Google

```text
POST https://crm.example.com/api/webhooks/google
```

إذا لم ترسل `source_channel`، يضع الكود `Google`.

### اختبار curl

```bash
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Production Test","phone":"+201000000001","source_channel":"Website","campaign_name":"Deployment Test","treatment":"Dental"}' \
  https://crm.example.com/api/webhooks/leads
```

### تحذير أمني

Generic وGoogle webhooks لا يطلبان Authentication أو Signature في النسخة الحالية. أي شخص يعرف الرابط يمكنه إرسال Leads. قبل Production أضف واحدًا أو أكثر من:

- HMAC signature.
- Shared secret header يتم تغييره دوريًا.
- Rate limiting.
- IP allowlist عندما يكون المصدر ثابتًا.
- Replay protection وtimestamp/nonce.
- Queue وretry/idempotency.

---

## 17. ربط n8n

1. ثبت n8n في بيئة منفصلة أو Container.
2. استورد:

```text
backend/n8n/medical-leads-crm-generic-webhook.workflow.json
```

3. اضبط:

```env
CRM_WEBHOOK_URL=https://crm.example.com/api/webhooks/leads
```

4. عدل payload.
5. نفذ Test.
6. راجع Execution log وCRM Activity.

لا تضع CRM Admin credentials داخل Workflow. بعد إضافة HMAC للـ Generic webhook، خزّن secret داخل n8n Credentials وليس داخل الـ Workflow JSON.

---

## 18. التحقق النهائي لكل Integration

استخدم جدولًا لكل منصة:

| الفحص | النتيجة |
|---|---|
| OAuth callback يعمل بـ HTTPS | PASS/FAIL |
| الحساب والـ Form الصحيحان | PASS/FAIL |
| Connection active في CRM | PASS/FAIL |
| Webhook registered | PASS/FAIL |
| Webhook signature verified | PASS/FAIL |
| Test lead وصل | PASS/FAIL |
| الاسم ورقم الهاتف صحيحان | PASS/FAIL |
| Source/Campaign/Ad صحيحون | PASS/FAIL |
| Duplicate detection عمل | PASS/FAIL |
| Assignment rule عمل | PASS/FAIL |
| Activity تسجلت | PASS/FAIL |
| لا توجد أسرار في logs | PASS/FAIL |
| Token refresh اختبر | PASS/FAIL |

لا تعتبر Integration جاهزة لمجرد أن OAuth أعاد Access Token.

---

## 19. النسخ الاحتياطي

### Backup يدوي

```bash
mkdir -p /opt/backups/medical-crm
docker compose -f /opt/medical-leads-crm/compose.production.yml exec -T postgres \
  pg_dump -U medical_crm -d medical_crm -Fc \
  > /opt/backups/medical-crm/medical_crm_$(date +%F_%H-%M).dump
```

شفّر وانقل النسخة إلى Storage خارج السيرفر. وجود Backup على نفس السيرفر وحده لا يحمي من فقدان السيرفر.

### Restore test

اختبر الاستعادة على Database منفصلة بصورة دورية. Backup لم يتم اختباره ليس خطة استعادة موثوقة.

لا تضع Dumps داخل `/var/www/medical-leads-crm`.

---

## 20. تحديث نسخة التطبيق

1. خذ Backup.
2. ارفع النسخة الجديدة إلى Release directory أو استبدل Source بحذر.
3. Build API image.
4. Prisma deploy migrations.
5. Build Frontend.
6. انشر `dist`.
7. Restart API.
8. اختبر Login وLead creation وWebhook.

أوامر نموذجية:

```bash
cd /opt/medical-leads-crm
docker compose -f compose.production.yml build api
docker compose -f compose.production.yml up -d api

cd frontend
npm ci
npm run typecheck
npm run build
sudo rsync -a --delete dist/ /var/www/medical-leads-crm/

sudo nginx -t
sudo systemctl reload nginx
```

لا تشغّل Prisma `migrate dev` في Production؛ الـ Dockerfile يستخدم `prisma migrate deploy` وهو المناسب للنشر.

---

## 21. Troubleshooting

### 502 Bad Gateway

```bash
docker compose -f /opt/medical-leads-crm/compose.production.yml ps
docker compose -f /opt/medical-leads-crm/compose.production.yml logs --tail=200 api
curl -i http://127.0.0.1:3000/auth/me
sudo tail -n 100 /var/log/nginx/error.log
```

### Login ينجح ثم يعود Login

- تأكد أن الموقع HTTPS.
- `COOKIE_SECURE=true` في Production.
- Frontend API URL هو `/api`.
- لا تخلط `www` مع subdomain آخر.
- راجع Cookie في Browser DevTools.
- تأكد أن Nginx يرسل `X-Forwarded-Proto`.

### CORS error

- في تصميم الدومين الواحد يجب أن يكون `VITE_API_BASE_URL=/api`.
- تأكد أن النسخة المعروضة هي آخر `dist`.
- `CORS_ORIGIN=https://crm.example.com` بدون slash في النهاية.
- امسح Service Worker/cache بعد تغيير عنوان API.

### OAuth redirect mismatch

القيم الأربع يجب أن تتطابق حرفيًا:

- URI في منصة الإعلانات.
- URI داخل `.env.production`.
- HTTPS والدومين.
- `/api/<provider>/callback`.

اختلاف slash واحد قد يسبب الرفض.

### Webhook verification fails في Meta

- Callback URL صحيح.
- Verify Token مطابق.
- HTTPS certificate صالح.
- Nginx يمرر Query String تلقائيًا؛ لا تحذفه.
- راجع API logs.

### OAuth نجح لكن Connection غير موجود

هذا متوقع في UI الحالية حتى تكمل `sessions/.../forms` ثم POST إلى `connections` كما في أقسام المنصات.

### Leads لا تصل

- تأكد أن الـ Webhook registered ومفعل للـ Form نفسه.
- راجع Page/Advertiser/Ad Account ID وForm ID.
- راجع Token expiration.
- راجع payload contract.
- ابحث عن `No active ... connection found` أو `mapping failed` في logs.
- تأكد أن Form يحتوي اسمًا ورقم هاتف؛ Adapter الحالي لن ينشئ Lead إذا لم يستخرج الاثنين.

### تغييرات Frontend لا تظهر

```bash
cd /opt/medical-leads-crm/frontend
npm run build
sudo rsync -a --delete dist/ /var/www/medical-leads-crm/
```

ثم امسح Browser cache أو ألغِ تسجيل Service Worker أثناء الاختبار.

---

## 22. Production Go-Live Checklist

### Server

- [ ] DNS يشير إلى السيرفر الصحيح.
- [ ] HTTPS صالح والتجديد التلقائي مختبر.
- [ ] Port 3000 و5432 غير مفتوحين للعالم.
- [ ] PostgreSQL data على Volume دائم.
- [ ] `.env.production` permissions = 600.
- [ ] لا توجد Default passwords.
- [ ] لا توجد QA data.
- [ ] Backup واستعادة مختبران.
- [ ] Monitoring وتنبيه على امتلاء القرص وتعطل Container.

### Application

- [ ] First Admin تم إنشاؤه بأمان.
- [ ] Login/Logout يعملان.
- [ ] Roles اختبرت.
- [ ] Lead access policy اختبرت.
- [ ] Dashboard/Reports numbers راجعت.
- [ ] Timezone/date range behavior حسم.
- [ ] Soft-deleted Leads لا تسبب اختلافًا.
- [ ] Frontend build نظيف.

### Integrations

- [ ] OAuth apps في Production/Live mode حسب متطلبات المنصة.
- [ ] Redirect URIs مطابقة.
- [ ] Webhooks registered.
- [ ] Webhook signatures يتم التحقق منها.
- [ ] Token refresh منفذ ومختبر.
- [ ] Test lead من كل منصة وصل مرة واحدة.
- [ ] Duplicate وAssignment يعملان.
- [ ] لا توجد Tokens أو بيانات مرضى في logs.

### Privacy

- [ ] Privacy Policy تغطي استقبال وتخزين Leads.
- [ ] صلاحيات الوصول أقل حد مطلوب.
- [ ] Retention/deletion policy معتمدة.
- [ ] Backups مشفرة.
- [ ] Processing agreement ومتطلبات الدولة/القطاع الطبي راجعتها جهة قانونية مختصة.

---

## 23. فجوات برمجية يجب إغلاقها قبل بيانات حقيقية

هذه ليست تحسينات شكلية:

1. إكمال OAuth callback flow داخل Frontend بدل JSON وConsole يدوي.
2. تنفيذ Token refresh التلقائي لـ TikTok وSnapchat.
3. تسجيل/إلغاء Webhooks من داخل النظام أو توثيق عملية مستقرة خارجيًا.
4. التحقق من Meta/TikTok/Snapchat webhook signatures.
5. حماية Generic وGoogle webhooks.
6. إضافة idempotency لمنع إنشاء Lead مرتين عند retry.
7. Queue/retry/dead-letter للـ Webhooks بدل ابتلاع أخطاء المعالجة بعد HTTP 200.
8. تحديث واختبار Meta Graph API version.
9. التأكد من TikTok endpoints/scopes مع App المعتمدة.
10. تحديث Snapchat forms/lead retrieval endpoints حسب العقد الرسمي الحالي.
11. Production-safe first-admin bootstrap.
12. Rate limiting وlogin brute-force protection.
13. Central timezone configuration في الـ Backend.
14. Monitoring لاستهلاك Tokens وفشل Webhooks.

لا يوصى بنشر التكاملات على بيانات مرضى/عملاء حقيقية قبل إنهاء هذه القائمة أو اعتماد المخاطر رسميًا.

---

## 24. روابط رسمية

- Meta Lead Ads: <https://developers.facebook.com/docs/marketing-api/guides/lead-ads/>
- Meta Webhooks: <https://developers.facebook.com/docs/graph-api/webhooks/>
- TikTok API for Business: <https://business-api.tiktok.com/portal>
- Snap OAuth: <https://developers.snap.com/marketing-api/Ads-API/authentication>
- Snap Lead Generation Webhooks: <https://developers.snap.com/marketing-api/Ads-API/lead-generation-ads>
- Certbot: <https://certbot.eff.org/instructions>
- Docker Engine: <https://docs.docker.com/engine/install/ubuntu/>
- Nginx: <https://nginx.org/en/docs/>

متطلبات المنصات وإصدارات API تتغير. راجع الروابط الرسمية وقت التنفيذ، خصوصًا App Review والصلاحيات وأسماء Events وOAuth endpoints.

---

## 25. مسار التنفيذ المختصر

```text
Buy/configure VPS
→ point crm.example.com to server
→ upload clean source
→ create production secrets
→ start PostgreSQL + API with Docker
→ build React frontend
→ configure Nginx /api reverse proxy
→ issue HTTPS certificate
→ create first Admin safely
→ test CRM core
→ configure Meta/TikTok/Snap apps
→ complete OAuth connection and select form
→ register webhooks
→ add signature verification and token refresh
→ send test leads
→ verify source, duplicate, assignment and activity
→ enable backups and monitoring
→ go live
```
