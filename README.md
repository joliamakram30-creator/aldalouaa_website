# الدلوعة — AL DALOUAA (متجر إلكتروني كامل)

- `frontend/` — موقع العملاء + لوحة الأدمن على `/admin` (React + Vite)
- `backend/` — الـ API (Express + Prisma + MySQL)
- `docker-compose.yml` — قاعدة بيانات MySQL جاهزة على بورت `3307` (اختياري)

الموقع بيشتغل **عربي / إنجليزي** (زرار اللغة في الناف بار وفي لوحة الأدمن) وكل الأسعار بالجنيه المصري.

---

## أهم اللي في النسخة دي

**لوحة الأدمن**
- إضافة منتج بتشتغل، وتعديل أي منتج موجود (الاسم عربي/إنجليزي، الوصف، السعر، السعر القديم، المخزون، القسم، المقاسات، الألوان).
- **رفع أكتر من صورة للمنتج** (لحد 10) — ترتيبهم وتحديد الصورة الرئيسية بضغطة، وحذف أي صورة.
- الطلبات: الأدمن بيشوف بيانات العميلة، العنوان، المحافظة، المنتجات (بالمقاس واللون)، **طريقة الدفع اللي اختارتها**، رقم عملية فودافون كاش وصورة الإثبات، وبيقبل أو يرفض الدفع ويغيّر حالة الطلب.
- العملاء: كل عميلة وطلباتها وطرق الدفع اللي استخدمتها وإجمالي مشترياتها والمفضلة والسلة.
- الأقسام، المقاسات والألوان، ولوحة إحصائيات.
- صفحة **الشحن**: أسعار كل المحافظات تتعدل من اللوحة، وتقدري تضيفي محافظة أو توقفيها.

**الدفع** — الطرق المتاحة بس: **الدفع عند الاستلام** و**فودافون كاش**. (فيزا/ماستركارد اتشالت بالكامل.)

**الشحن** — كل محافظات الجدول اللي اتفقنا عليه (21 منطقة) وكل واحدة بسعرها، والشحن المجاني للطلبات من 2000 جنيه (بتتغير من `FREE_SHIPPING_THRESHOLD`).

**الرئيسية** — «لينا جوا كل بيت حكاية» وتحتها «ثقة منذ 1995» (وبالإنجليزي: A story in every home / Trusted since 1995).

**تسجيل الدخول بجوجل** — زرار «المتابعة بحساب Google» حقيقي في صفحتي الدخول والتسجيل. السيرفر بيتأكد من التوكن مع جوجل نفسها، ولو الإيميل مسجل قبل كده بيربط الحساب من غير ما يعمل نسخة مكررة. الزرار بيظهر بس لما تحطي `GOOGLE_CLIENT_ID` (شوفي الخطوات تحت).

**أمان وإصلاحات** — الحسابات والأسعار والمخزون بتتحسب وتتراجع من السيرفر مش من المتصفح، صلاحية الأدمن بتتقرا من قاعدة البيانات في كل طلب، رفع الصور بيتأكد إنها صور حقيقية، حماية من التكرار وتحديد عدد المحاولات في تسجيل الدخول، وتم حذف أي باسورد أو ملفات تجريبية كانت في الكود.

---

## التشغيل على جهازك

### أسرع طريقة على Windows / PowerShell

1. افتحي PowerShell داخل فولدر المشروع.
2. شغّلي قاعدة البيانات:
```powershell
docker compose up -d
```
3. Backend:
```powershell
cd backend
npm install
npm run setup
npm run create-admin -- "اسم الأدمن" admin@example.com "Password-قوي-جداً"
npm start
```
4. افتحي PowerShell ثانية للـ Frontend:
```powershell
cd frontend
npm install
npm run dev
```

> النسخة المرفقة فيها `backend/.env` و`frontend/.env` محليين جاهزين للتشغيل على MySQL الموجود في `docker-compose.yml`. الـ JWT secret الموجود محلي فقط ويمكن تغييره قبل أي نشر حقيقي.

### 1) قاعدة البيانات
```bash
docker compose up -d
```
(أو استخدمي أي MySQL/MariaDB وحطي بياناته في `DATABASE_URL`.)

### 2) الـ Backend
```bash
cd backend
npm install
# لو هتستخدمي إعدادات مختلفة، انسخي .env.example إلى .env وعدّلي القيم
npm run setup               # generate + migrate + seed
npm run create-admin -- "اسمك" you@example.com "باسورد-قوي-8-حروف-أو-أكتر"
npm start
```
- `npm run seed:demo` (اختياري) بيضيف 4 منتجات تجريبية علشان الموقع مايبقاش فاضي وأنتِ بتجربي — امسحيهم من لوحة الأدمن قبل الإطلاق.
- الـ API على `http://localhost:5000`.

### 3) الـ Frontend
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev
```
- الموقع: `http://localhost:5173` — لوحة الأدمن: `http://localhost:5173/admin` (بنفس تسجيل الدخول، والحساب لازم يكون أدمن).
- في `frontend/.env` تقدري تضيفي (اختياري) `VITE_CONTACT_EMAIL` و`VITE_WHATSAPP` و`VITE_INSTAGRAM_URL` و`VITE_FACEBOOK_URL` وهيظهروا في الفوتر.

---

## تفعيل تسجيل الدخول بجوجل (مرة واحدة)

الزرار محتاج «Client ID» من حسابك على جوجل، ومن غيره بيفضل مخفي:

1. ادخلي على [Google Cloud Console](https://console.cloud.google.com/apis/credentials) وأنشئي مشروع (لو معندكيش)، وجهزي شاشة الموافقة **OAuth consent screen** (اسم التطبيق والإيميل).
2. من **Credentials ← Create credentials ← OAuth client ID** اختاري النوع **Web application**.
3. تحت **Authorized JavaScript origins** ضيفي عنوان موقعك: `http://localhost:5173` للتجربة، و`https://موقعك-الحقيقي.com` للإطلاق.
4. انسخي الـ Client ID (بيخلص بـ `.apps.googleusercontent.com`) وحطيه في `backend/.env`:
   ```
   GOOGLE_CLIENT_ID="xxxxxxxx.apps.googleusercontent.com"
   ```
5. أعيدي تشغيل الـ backend. خلاص — الفرونت بياخد الـ Client ID من الـ API تلقائي ومحتاجش تعملي حاجة في `frontend/.env`.

ملاحظات: لحد ما تنشري التطبيق («Publish app») في شاشة الموافقة، بس الإيميلات اللي تضيفيها كـ Test users هتقدر تدخل. ولو الموقع بيبعت هيدر `Cross-Origin-Opener-Policy: same-origin` من الاستضافة، شيليه أو خليه `same-origin-allow-popups` وإلا نافذة جوجل مش هتشتغل. حساب جوجل جديد بيتعمل من غير كلمة مرور، وتقدر العميلة تحط كلمة مرور من صفحة حسابها.

## لو عندك قاعدة بيانات شغالة من النسخة القديمة

1. **خدي نسخة احتياطية من قاعدة البيانات الأول.**
2. حطي `DATABASE_URL` بتاعتك في `backend/.env` وشغّلي `npm run prisma:migrate` — المايجريشن الجديدة (`store_upgrade` و`google_login`) بتحوّل أي دفعات فيزا قديمة لـ«الدفع عند الاستلام»، وتضيف الأسماء العربي وجدول الشحن والصور المتعددة، وتنقل صورة كل منتج لجدول الصور الجديد.
3. شغّلي `npm run seed` (آمن، مابيمسحش حاجة عدلتيها).
4. غيّري باسورد الأدمن بـ `npm run create-admin -- "اسمك" email "باسورد-جديد"`.

## قبل الإطلاق (Checklist)

- [ ] `JWT_SECRET` طويل وعشوائي: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- [ ] غيّري `DB_CONNECTION_LIMIT` لو الاستضافة تحتاج pool أكبر، والقيمة الافتراضية في النسخة دي 10.
- [ ] `FRONTEND_URL` = عنوان موقعك الحقيقي (بدونه الـ API بيرفض الطلبات من الموقع) و`NODE_ENV=production`، و`TRUST_PROXY=1` لو ورا nginx/استضافة.
- [ ] `VODAFONE_CASH_NUMBER` = رقمك الحقيقي.
- [ ] `GOOGLE_CLIENT_ID` متظبط ومعاه عنوان موقعك الحقيقي في الـ Authorized origins.
- [ ] **الصور:** الافتراضي بتتخزن على السيرفر في `backend/uploads`. لو استضافتك بتمسح الملفات مع كل تحديث (Render/Railway/Heroku…) استخدمي Cloudinary (املي `CLOUDINARY_*` التلاتة) أو ديسك دائم، وخدي نسخة احتياطية من فولدر `uploads`.
- [ ] شغّلي الموقع على HTTPS.
- [ ] امسحي المنتجات التجريبية لو شغّلتي `seed:demo`.
- [ ] `npm run build` في الـ frontend وارفعي فولدر `dist` مع إعداد إن أي رابط يرجع لـ `index.html` (SPA).
- [ ] خدي نسخة احتياطية دورية من قاعدة البيانات.

## ملاحظات

- الفوتر مافيهوش روابط سوشيال وهمية — بتظهر بس اللي تحطيها في `frontend/.env`.
- محافظات مش في الجدول (الدقهلية، الفيوم، أسيوط، مطروح، سيناء، الوادي الجديد…) تقدري تضيفيها بسعرها من **الأدمن ← الشحن**.

## Latest production-ready updates

- Product scents are now stored through the full cart -> order flow.
- Checkout was rebuilt so it uses the real Store config, governorates and server-calculated totals.
- Admin notifications are stored in the database and appear in the dashboard with an unread badge. New orders are created as notifications AFTER the order transaction commits, so a notification problem can never cancel a valid order. The admin panel polls for new notifications every 10 seconds; after browser notification permission is granted from the bell button, a new order also triggers a desktop browser notification.
- Home page shows an Admin Dashboard button only to ADMIN users.
- Admin > Shipping now controls free shipping directly: enable/disable it and change the minimum subtotal without editing `.env`.
- Visa/Mastercard is not supported; checkout only offers Cash on Delivery and Vodafone Cash.

### Run after updating the project

1. Start MySQL with `docker compose up -d`.
2. Copy `backend/.env.example` to `backend/.env` and set a real `JWT_SECRET`.
3. Copy `frontend/.env.example` to `frontend/.env` if needed.
4. In `backend`: `npm install`, then `npm run prisma:generate`, then `npm run prisma:migrate`.
5. In `frontend`: `npm install`, then `npm run dev`.

The new migration is `20260922030000_store_settings_scent_notifications`.
