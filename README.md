# Medical Leads CRM — Script & Technical Documentation

> **نوع الملف:** توثيق تقني ووظيفي مستقل للسكريبت الحالي كما هو موجود في الكود.
>
> **المشروع الموثّق:** `Medical Leads CRM`
>
> **آخر مراجعة للكود:** 20 أغسطس 2026
>
> هذا الملف مختلف عن `README Design.md`: ملف التصميم يشرح الشكل المطلوب، أما هذا الملف فيشرح السكربت الحالي، مكوّناته، طريقة عمله، تدفق البيانات، الصلاحيات، التشغيل، والقيود الفعلية.

---

## 1. السكربت ده إيه؟

Medical Leads CRM هو نظام مستقل لإدارة ومتابعة العملاء المحتملين لعيادات أو مراكز طبية. يستقبل الـ Leads يدويًا أو من منصات الإعلانات، يحفظهم في قاعدة بيانات مركزية، يوزعهم على موظفي الـ Call Center، ويسجل كل إجراء يحدث عليهم.

النظام يساعد الإدارة على معرفة:

- عدد الـ Leads الواردة.
- مصدر كل Lead والحملة والإعلان المرتبطين به.
- العلاج أو الخدمة الطبية المطلوبة.
- الموظف المسؤول عن المتابعة.
- الحالة الحالية للـ Lead.
- مواعيد المتابعة والمواعيد الطبية.
- أداء كل Agent.
- سرعة أول تواصل وأول إجراء.
- جودة كل مصدر إعلاني.
- الـ Leads المكررة.
- سجل كامل للتغييرات والإجراءات.

النظام الحالي **ليس WordPress Plugin**. هو Web Application مستقل يتكوّن من:

- Frontend: React 19 + TypeScript + Vite.
- Backend: NestJS 11 + TypeScript.
- Database: PostgreSQL 17.
- ORM/Migrations: Prisma 6.
- Authentication: JWT محفوظ داخل HttpOnly Cookie.
- Deployment support: Docker وDocker Compose.

يمكن لاحقًا ربطه بموقع WordPress عن طريق API أو تضمين واجهته أو تطوير Plugin وسيط، لكن هذا الربط غير موجود حاليًا في الكود.

---

## 2. الوظائف الرئيسية

### إدارة الـ Leads

- إنشاء Lead يدوي.
- استقبال Leads من Webhooks.
- عرض كل الـ Leads مع Pagination.
- البحث بالاسم أو رقم الهاتف.
- الفلترة بالحالة، العلاج، المصدر، الموظف، التاريخ، والتكرار.
- ترتيب النتائج حسب تاريخ الإنشاء أو الاسم.
- تعديل بيانات الـ Lead.
- الحذف المنطقي Soft Delete.
- تعيين أو إلغاء تعيين أو نقل Lead بين الموظفين.
- Bulk Assignment لمجموعة Leads.
- Bulk Edit للعلاج أو المصدر من الواجهة.
- تصدير النتائج بصيغة XLSX أو CSV.
- عرض تفاصيل وتاريخ نشاط كل Lead.

### متابعة دورة المبيعات الطبية

الحالات المتاحة حاليًا:

| القيمة البرمجية | المعنى |
|---|---|
| `new` | Lead جديد |
| `no_answer` | لم يرد |
| `follow_up` | يحتاج متابعة |
| `interested` | مهتم |
| `not_interested` | غير مهتم |
| `wrong_number` | رقم خاطئ |
| `job_seeker` | باحث عن عمل/Lead غير صالح تسويقيًا |
| `booked` | تم الحجز |
| `showed_up` | حضر الموعد |
| `no_show` | لم يحضر الموعد |
| `paid` | دفع/تحويل ناجح |

الخدمة الحالية تسمح بالانتقال من أي حالة إلى أي حالة صحيحة من القائمة. لا يوجد Workflow يمنع انتقالات معينة في النسخة الحالية.

### المتابعات Follow-ups

- إنشاء متابعة بتاريخ ووقت وملاحظة.
- عرض متابعات اليوم.
- عرض المتابعات القادمة.
- عرض المتابعات المتأخرة.
- عرض المتابعات المكتملة.
- تعليم المتابعة كمكتملة أو ملغاة.
- تسجيل إنشاء/إكمال/إلغاء المتابعة داخل Activity Timeline.

### المواعيد والحجوزات

لا يوجد حاليًا جدول `Booking` أو صفحة Bookings مستقلة. الحجز ممثل بطريقتين داخل الـ Lead:

- حالة الـ Lead تكون `booked`.
- بيانات الموعد تحفظ في `appointmentAt` و`appointmentTreatmentId` و`appointmentNote`.

وبالتالي كلمة Bookings في الداشبورد والتقارير تعني حاليًا عدد الـ Leads الموجودة في حالة `booked`، وليست عدد سجلات حجوزات مستقلة.

### توزيع الـ Leads

النظام يدعم أربع آليات عملية:

1. **Manual:** يظل الـ Lead غير معيّن حتى يقوم Manager/Admin بتعيينه.
2. **Round Robin:** يمر على الـ Agents النشطين بالترتيب ويتخطى من وصل للحد الأقصى.
3. **Treatment-Based:** يوزع الـ Lead بين الموظفين المرتبطين بالعلاج المطلوب.
4. **Advanced Weighted Distribution:** قواعد متقدمة حسب المصدر والحملة والإعلان وForm ID مع وزن لكل Agent.

### التكاملات

- Meta/Facebook Lead Ads.
- TikTok Lead Generation.
- Snapchat Lead Generation.
- Generic Webhook.
- Google Webhook endpoint.
- Workflow جاهز لـ n8n.
- Postman collection لاختبار الـ Generic Webhook.

### الإدارة والتقارير

- إدارة المستخدمين.
- إدارة الأدوار المخصصة والصلاحيات.
- إدارة العلاجات.
- إعداد طريقة التوزيع.
- إعداد ربط العلاجات بالموظفين.
- إعداد قواعد توزيع موزونة.
- Dashboard حسب الدور.
- تقارير الإدارة والتسويق.
- تصدير التقارير.
- Audit Logs على مستوى النظام.
- Security Logs لمحاولات الوصول غير المسموحة إلى Leads.

---

## 3. المعمارية العامة

```text
Meta / TikTok / Snapchat / Google / n8n / Manual Entry
                         │
                         ▼
                  NestJS REST API
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Validation       Business Logic   Auth & Permissions
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  Prisma Data Layer
                         ▼
                     PostgreSQL
                         ▲
                         │
                  React Frontend
```

### طبقات الـ Backend

كل Module منظم غالبًا إلى:

- `presentation`: Controllers والـ HTTP endpoints.
- `application/dto`: التحقق من المدخلات.
- `application/use-cases`: تنفيذ حالات الاستخدام.
- `application/services`: منطق الأعمال المركب.
- `application/ports`: Interfaces تعزل منطق التطبيق عن Prisma.
- `domain`: Entities وEnums.
- `infrastructure`: Prisma repositories والخدمات الخارجية.

هذا التقسيم قريب من Clean Architecture ويجعل تغيير قاعدة البيانات أو اختبار منطق الأعمال أسهل.

---

## 4. هيكل الملفات

```text
Medical Leads CRM/
├── README Design.md                 # متطلبات وتسليم التصميم الاحترافي
├── README Script.md                 # هذا الملف: شرح السكربت الحالي
├── backend/
│   ├── src/
│   │   ├── main.ts                  # تشغيل NestJS والأمان وCORS والتحقق
│   │   ├── app.module.ts            # تجميع كل Modules
│   │   ├── common/                  # أخطاء، Filters، Logging، Types مشتركة
│   │   ├── config/                  # Environment config والتحقق منه
│   │   ├── infrastructure/database/ # Prisma module/service
│   │   └── modules/                 # وحدات النظام الوظيفية
│   ├── prisma/
│   │   ├── schema.prisma            # مخطط قاعدة البيانات
│   │   ├── migrations/              # تاريخ تغييرات قاعدة البيانات
│   │   └── seed.ts                  # بيانات QA تجريبية
│   ├── test/                         # اختبارات E2E
│   ├── docs/                         # توثيق Webhooks والتكاملات
│   ├── n8n/                          # Workflow جاهز للاستيراد
│   ├── postman/                      # Collection لاختبار Webhook
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/                      # App, providers, router, route definitions
│   │   ├── api/leadsApi.ts           # جميع استدعاءات API الرئيسية
│   │   ├── services/apiClient.ts     # HTTP client المشترك
│   │   ├── components/               # جداول وفلاتر وUI components
│   │   ├── layouts/                  # App layout وAuth layout
│   │   ├── pages/                    # الصفحات الأساسية
│   │   ├── modules/                  # Auth/Users/Roles/Reports/Settings/etc.
│   │   ├── config/                   # Navigation والصلاحيات وإعدادات التطبيق
│   │   ├── contexts/                 # Auth context
│   │   ├── i18n/                     # ترجمة عربي/إنجليزي وRTL/LTR
│   │   ├── types.ts                  # TypeScript contracts
│   │   └── styles.css                # Styling مركزي
│   ├── public/                        # PWA manifest/service worker/icon
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
└── db-recovery-20260820/              # ملفات استعادة/نسخ قاعدة بيانات وليست Runtime code
```

مجلدات `node_modules` تحتوي Dependencies مثبتة ولا يجب تعديلها يدويًا. مجلد `frontend/dist` هو ناتج Build ويمكن إعادة توليده.

---

## 5. شرح وحدات الـ Backend

### `auth`

مسؤول عن:

- Login بالبريد وكلمة المرور.
- مقارنة كلمة المرور باستخدام Argon2.
- إنشاء JWT.
- وضع JWT في HttpOnly Cookie.
- Logout ومسح الـ Cookie.
- إرجاع بيانات المستخدم الحالي.
- Guards للتحقق من تسجيل الدخول والدور.

الـ Cookie مضبوط `SameSite=Strict` و`HttpOnly`، ويصبح Secure عند ضبط البيئة لذلك.

### `users`

- عرض المستخدمين مع البحث والفلترة والصفحات.
- إنشاء وتعديل المستخدم.
- تفعيل/تعطيل المستخدم.
- Reset Password.
- Soft Delete للمستخدم بدل حذف السجل نهائيًا.
- عرض الـ Agents النشطين.
- تحديد `maxActiveLeads` لكل Agent.
- القيمة `0` في السعة تعني Unlimited.
- تسجيل تغييرات ووصول السعة في `AgentCapacityHistory`.

### `roles`

- أربع Base Roles: Admin, Manager, Agent, Marketing.
- إنشاء Custom Roles مبنية على Base Role.
- حفظ Permissions في JSON.
- System roles لا تعامل مثل الأدوار المخصصة العادية.

### `leads`

أكبر Module في النظام، ويشمل:

- CRUD.
- List, My Leads, Unassigned Leads.
- Access policy.
- Status changes and history.
- Activities timeline.
- Assignment, bulk assignment, unassignment, transfer.
- Duplicate detection.
- Phone normalization.
- Call sessions.
- Speed to contact / first action.
- Excel and CSV exports.
- Manual and automated ingestion.

### `follow-ups`

- إنشاء متابعة مرتبطة بـ Lead وUser.
- فصل تاريخ المتابعة عن الوقت وحفظ `scheduledAt` كامل.
- حالات Pending/Completed/Cancelled.
- قوائم Today/Upcoming/Overdue/Completed.
- Activity event لكل تغيير.

### `dashboard`

- Overview بسيط: إجمالي Leads، New، Paid.
- إحصائيات الـ Agents: Leads، Booked، Paid.
- متوسط/وسيط/أقل/أعلى Speed to Contact.
- Speed to Contact لكل Agent.
- Agent يرى إحصائياته فقط في endpoints الخاصة بالموظفين.

واجهة الداشبورد الحالية تعتمد غالبًا على `reports` للإدارة والتسويق، وعلى endpoints خاصة للـ Agent.

### `reports`

ينتج Response واحدًا يحتوي على:

- Overview.
- Agent performance.
- Marketing/source quality.
- Source breakdown.
- Treatment breakdown.
- Conversion funnel.
- Call outcome/status distribution.
- Campaign performance.
- Echo للفلاتر المستخدمة.

يدعم Export كـ XLSX أو CSV، بأنواع `management` و`marketing` و`all`.

### `treatments`

- CRUD للعلاجات/الخدمات.
- اسم إنجليزي مطلوب.
- اسم عربي اختياري.
- وصف وحالة Active.
- ربط Lead بعلاج.
- ربط Treatment بعدة Agents للتوزيع التلقائي.

### `assignment-settings`

- حفظ طريقة التوزيع الحالية.
- Treatment routing.
- Advanced distribution rules.
- توزيع موزون مع عداد `assignedCount` لكل Allocation.
- فحص سعة الـ Agent قبل التعيين.

### `facebook`, `tiktok`, `snapchat`

كل Integration يحتوي على:

- OAuth connection flow.
- Session مؤقتة أثناء الربط.
- اختيار Page/Advertiser/Ad Account وForm.
- تخزين Connection.
- تشفير Access/Refresh tokens.
- استقبال Webhook.
- تحويل Payload إلى Lead موحد.

### `webhooks`

- Endpoint عام لاستقبال Lead موحد.
- Endpoint مخصص لـ Google يضع المصدر `Google` إن لم يرسل المصدر.
- يعيد Response موحد بعد الإنشاء والتوزيع وفحص التكرار.

### `audit`

- Interceptor لتسجيل العمليات الحساسة.
- يسجل المستخدم، الوحدة، الإجراء، نوع ومعرف العنصر، IP، User-Agent، HTTP method، endpoint، والقيم قبل/بعد عند توفرها.
- صفحة منفصلة للقائمة والتفاصيل.

### `access-test`

Endpoints اختبارية للتأكد من عمل Role Guard للأدوار Admin/Manager/Agent. ليست Feature للمستخدم النهائي.

---

## 6. دورة حياة الـ Lead

### إنشاء يدوي

```text
User submits lead
  → DTO validation
  → phone normalization
  → duplicate evaluation
  → create Lead
  → create lead_created Activity
  → record duplicate relationship when required
  → apply assignment logic when eligible
  → return saved Lead
```

حقول الإنشاء الأساسية:

- `name` مطلوب، حتى 150 حرفًا.
- `phone` مطلوب، حتى 25 حرفًا.
- `sourceChannel` مطلوب، حتى 100 حرف.
- `campaignName` اختياري.
- `adName` اختياري.
- `treatmentId` اختياري.
- `ownerAgentId` اختياري.
- `status` اختياري والافتراضي `new`.
- `note` اختياري.

### إنشاء من إعلان أو Webhook

```text
External platform
  → platform webhook controller
  → validate/map incoming fields
  → unified lead-ingestion service
  → normalize phone and detect duplicate
  → save source/campaign/ad/form metadata
  → create Activity indicating the source
  → try advanced matching rule
  → otherwise apply configured assignment method
  → return success and Lead reference
```

### تعديل الحالة

تغيير الحالة ينتج عنه:

- تحديث الحالة الحالية في `Lead`.
- إضافة سجل إلى `LeadStatusHistory`.
- إضافة Activity من نوع `status_changed`.
- عند أول حالة تعتبر تواصلًا ناجحًا، يسجل `firstContactedAt` و`speedToContactSeconds`.
- يمكن إنشاء Follow-up أو تسجيل موعد حسب البيانات المرسلة مع تغيير الحالة.

الحالات التي تعتبر Successful Contact في خدمة Speed to Contact:

- Interested.
- Not Interested.
- Booked.
- Showed Up.
- No Show.
- Paid.

`No Answer` و`Follow Up` لا يسجلان First Successful Contact في هذه الخدمة.

### المكالمات

- `call/start` ينشئ LeadCallSession مفتوحة.
- `call/end` يغلق الجلسة ويقبل ملاحظة اختيارية.
- يمنع منطق الخدمة وجود جلسات غير منتهية بطريقة غير متحكم بها.
- الأنشطة تحفظ أحداث بدء وإنهاء الاتصال.
- أول إجراء يمكن أن يستخدم في حساب Speed to First Action.

### الحذف

الحذف الحالي Soft Delete عبر `deletedAt`، وليس إزالة نهائية مباشرة. بعد حذف Lead، يعاد Reconciliation لعلاقات التكرار الخاصة بنفس رقم الهاتف حتى لا تظل الإشارات إلى Original محذوف غير صحيحة.

---

## 7. اكتشاف الـ Duplicate

المنطق الحالي:

1. تطبيع رقم الهاتف.
2. البحث عن Lead غير محذوف خلال نافذة زمنية.
3. النافذة الافتراضية 30 يومًا عبر `DUPLICATE_WINDOW_DAYS` إن لم تضبط قيمة أخرى.
4. المطابقة تكون بالرقم المطبع، ومع Token من آخر 9 أرقام عندما يكون مناسبًا.
5. أقدم Lead مطابق يصبح Original.
6. الـ Lead الجديد يحصل على `isDuplicate=true` و`duplicateOfLeadId`.
7. ينشأ سجل في `LeadDuplicate` وActivity من نوع `duplicate_detected`.

يوفر النظام:

- فحص الرقم قبل إنشاء Lead.
- Duplicate history.
- Duplicate group يعرض كل الـ Leads المتشابهة وأنشطتها.
- إعادة بناء الروابط بعد حذف أحد السجلات.

---

## 8. منطق توزيع الـ Leads

### Manual

لا يحدث تعيين تلقائي. يظهر الـ Lead في Available/Unassigned حتى يختاره Agent بالطريقة المتاحة أو يقوم Manager بتعيينه.

### Round Robin

- يجلب Agents النشطين بالترتيب.
- يحسب Active Leads لكل Agent.
- يتخطى من وصل إلى `maxActiveLeads`.
- `maxActiveLeads=0` تعني Unlimited.
- يحفظ آخر Agent مستخدم في `RoundRobinState`.
- يستخدم Database transaction وrow locking لمنع توزيع Leadين متزامنين بشكل غير عادل.
- يسجل LeadAssignment وActivity.
- إذا لم توجد سعة، يترك الـ Lead غير معيّن ويسجل السبب.

### Treatment-Based Routing

- يتطلب Treatment على الـ Lead.
- يجلب Agents المرتبطين بهذا العلاج.
- يستبعد غير النشط ومن وصل للسعة.
- يطبق Round Robin داخل مجموعة العلاج.
- إذا لم يجد موظفًا مناسبًا يترك الـ Lead غير معيّن ويسجل Activity.

### Advanced Weighted Distribution

كل Rule يمكن أن تطابق:

- `source_channel`.
- `campaign_name`.
- `ad_name`.
- `form_id`.

القيمة الفارغة تعني Wildcard. القواعد ترتب حسب Priority تصاعديًا ثم تاريخ الإنشاء. أول Rule مطابقة تستخدم.

لكل Agent وزن. الاختيار يعتمد على:

```text
assignment score = assignedCount ÷ weight
```

يختار النظام أقل Score بين الموظفين المتاحين، ثم يزيد `assignedCount`. هذا يحقق توزيعًا نسبيًا على المدى الطويل. جميع الموظفين داخل Allocation يجب أن يكونوا Agents نشطين، ولا يسمح بتكرار نفس Agent داخل القاعدة.

---

## 9. الأدوار والصلاحيات

### Admin

صلاحيات كاملة تقريبًا:

- كل الـ Leads بما في ذلك التعديل والحذف والتعيين والنقل والتصدير.
- Users وRoles.
- Treatments.
- Integrations.
- Reports وDashboard.
- Audit Logs.
- Settings.

### Manager

- عرض وإنشاء وتعديل Leads تشغيليًا.
- تعيين ونقل وتصدير Leads.
- Follow-ups.
- عرض وإدارة أجزاء من المستخدمين.
- Treatments.
- Dashboard وReports وAudit.
- لا يملك كل عمليات Admin الحساسة.

### Agent

- Dashboard شخصي.
- عرض وإنشاء وتحديث Leads حسب سياسة الوصول.
- متابعة الـ Leads المسندة إليه.
- Follow-ups وActivities.
- لا يرى Lead خاصًا بموظف آخر؛ محاولة الوصول تسجل في SecurityLog.

### Marketing

- Dashboard مخصص للتسويق.
- Reports.
- لا يملك تشغيل الـ Leads أو المستخدمين.

### ملاحظة عن الصلاحيات

الـ Frontend يخفي الروابط حسب Permission map، والـ Backend يطبق JWT Guards وRole Guards. إخفاء زر في الواجهة ليس وسيلة الحماية الأساسية؛ الحماية الحقيقية موجودة في الـ API.

---

## 10. شاشات الـ Frontend الحالية

### Login — `/login`

- Email وPassword.
- إرسال Login request.
- حفظ الجلسة في HttpOnly Cookie من الـ Backend.
- توجيه المستخدم للصفحة المناسبة لدوره.

### Leads — `/`

- All/My/Available Leads حسب الدور.
- Search وFilters.
- Pagination وحجم الصفحة.
- جدول Leads.
- تحديد عدة صفوف.
- Bulk assignment وBulk edit.
- Create/Edit modals.
- Status actions.
- Assignment/claim/transfer/unassign.
- Start/end call.
- Schedule follow-up.
- Duplicate indicators.
- XLSX/CSV export لمن لديه الصلاحية.

### Lead Timeline — `/leads/:leadId`

- بيانات Lead الأساسية.
- عدد محاولات المتابعة.
- Activity timeline.
- Duplicate group/history.
- Transfer history لمن لديه صلاحية.

### Follow-ups — `/follow-ups`

- Today, Upcoming, Overdue, Completed filters.
- Pagination.
- جدول بالـ Lead والموعد والحالة والملاحظة.

### Dashboard — `/dashboard`

يدعم All Time, Today, Last 7 Days, Last 30 Days, Custom Range.

#### Admin/Manager

- Total Leads.
- Booked Leads.
- Paid Leads.
- Conversion Rate.
- Average Speed to First Contact.
- Contacted Leads.
- Outcome cards.
- Conversion funnel.
- Agent ranking.
- Leads by source.

#### Marketing

- Lead quality by source.
- Channel comparison.
- Campaign performance.

#### Agent

- Assigned Leads.
- Active Leads.
- Today Follow-ups.
- Booking Rate.
- Win Rate.
- Average First Attempt.
- My Assigned Leads table.
- Today Follow-ups table.

### Reports — `/reports`

الفلاتر:

- From date.
- To date.
- Agent.
- Treatment.
- Source channel.

المحتوى:

- Overview metrics.
- Agent performance.
- Conversion funnel.
- Leads by source.
- Leads by treatment.
- Call/status outcome distribution.
- Marketing lead quality.
- XLSX/CSV export.

### Users — `/users`

- Summary cards.
- Search بالاسم أو البريد.
- فلترة Base Role وStatus.
- Create/Edit.
- اختيار Role أو Custom Permission Profile.
- Agent capacity.
- Activate/Deactivate.
- Reset Password.
- Soft delete/deactivate.

### Roles — `/roles`

- عرض System وCustom roles.
- إنشاء وتعديل وحذف Custom roles.
- اختيار Base Role.
- Permission map حسب Modules والعمليات.

### Treatments — `/treatments`

- Summary.
- Search/Status filters.
- Create/Edit/Delete.
- English name, Arabic name, description, Active status.

### Integrations — `/integrations`

- Cards لـ Meta وTikTok وSnapchat.
- عرض Connection status.
- OAuth connection flow.
- اختيار Account/Page/Form بعد الربط.
- شرح Generic/Google Webhook ingestion.

### Audit Logs — `/audit-logs`

- Search.
- Filters للوحدة والإجراء والمستخدم والعنصر والتاريخ.
- جدول Date/User/Module/Action/Entity/IP.
- صفحة تفاصيل `/audit-logs/:auditId` للقيم والـ metadata.

### Settings — `/settings`

- CRM name.
- Default language.
- Timezone.
- Assignment method.
- Advanced weighted rules.
- Treatment routing.
- معلومات Access & Sessions.

**مهم:** CRM name واللغة والـ timezone في الجزء العام من صفحة Settings تحفظ حاليًا في Browser `localStorage`، وليست إعدادات مركزية في قاعدة البيانات. أما Assignment/Routing settings فتحفظ في الـ Backend.

---

## 11. نظام الترجمة والاتجاه

- يوجد I18n Context داخل الـ Frontend.
- يدعم English وArabic.
- اللغة تحفظ محليًا في `localStorage`.
- اتجاه الصفحة يتغير بين LTR وRTL.
- عدد كبير من Labels وحالات الـ Lead له مفاتيح ترجمة.
- بعض الرسائل التقنية ما زالت مكتوبة مباشرة بالإنجليزية داخل Components، لذلك يلزم Audit ترجمة قبل النشر النهائي إذا كان المطلوب تعريبًا كاملًا.

---

## 12. قاعدة البيانات

### الجداول الرئيسية

| Model | الوظيفة |
|---|---|
| `User` | المستخدم والدور والحالة والسعة واللغة |
| `CustomRole` | أدوار مخصصة وصلاحيات JSON |
| `Lead` | السجل الأساسي للعميل المحتمل |
| `Treatment` | الخدمة/العلاج الطبي |
| `Activity` | Timeline لكل إجراء على Lead |
| `LeadStatusHistory` | تاريخ تغييرات الحالة |
| `FollowUp` | المتابعات المجدولة |
| `LeadAssignment` | تاريخ التعيين وإلغاء التعيين |
| `LeadTransfer` | تاريخ النقل بين الموظفين |
| `LeadDuplicate` | علاقات Original/Duplicate |
| `LeadCallSession` | جلسات الاتصال |
| `SecurityLog` | محاولات الوصول إلى Leads غير المسموحة |
| `AuditLog` | سجل النظام الإداري العام |
| `AssignmentSettings` | طريقة التوزيع الحالية |
| `RoundRobinState` | آخر Agent في دورة التوزيع |
| `AgentCapacityHistory` | تاريخ السعة والوصول للحد |
| `TreatmentAgentRouting` | Many-to-many بين Treatment وAgent |
| `AssignmentDistributionRule` | قاعدة توزيع متقدمة |
| `AssignmentDistributionAllocation` | وزن وعدّاد كل Agent داخل القاعدة |
| `FacebookConnection` | اتصال Meta Page/Form مشفر |
| `TiktokConnection` | اتصال TikTok Advertiser/Form مشفر |
| `SnapchatConnection` | اتصال Snapchat Account/Form مشفر |

### أهم حقول Lead

- الهوية: `id`, `name`, `phone`, `normalizedPhone`.
- التكرار: `isDuplicate`, `duplicateOfLeadId`.
- التسويق: `sourceChannel`, `campaignName`, `adName`, `arrivalTimestamp`.
- العلاج: `treatmentId`.
- التشغيل: `status`, `ownerAgentId`, `isPrivate`, `createdBy`.
- الموعد: `appointmentAt`, `appointmentTreatmentId`, `appointmentNote`.
- الأداء: `firstContactedAt`, `speedToContactSeconds`, `firstActionAt`, `speedToFirstActionSeconds`.
- التواريخ: `createdAt`, `updatedAt`, `deletedAt`.

قاعدة البيانات تستخدم UUIDs وPostgreSQL `timestamptz` لمعظم التوقيتات، مع Indexes للفلاتر والبحث والأداء.

---

## 13. تعريف الأرقام والنسب الحالية

### فلاتر التقارير

التقارير تستبعد `deletedAt != null` وتفلتر بـ:

- `createdAt` بين بداية ونهاية التاريخ بصيغة UTC.
- `ownerAgentId` عند اختيار Agent.
- `treatmentId` عند اختيار Treatment.
- `sourceChannel` بمطابقة case-insensitive.

### Overview

```text
total_leads      = كل الـ Leads غير المحذوفة داخل الفلاتر
new_leads        = الـ Leads التي حالتها الحالية new
contacted_leads  = مجموع حالات التواصل المعرفة في ReportsService
booked_leads     = الـ Leads التي حالتها الحالية booked فقط
paid_leads       = الـ Leads التي حالتها الحالية paid فقط
conversion_rate  = paid_leads ÷ total_leads × 100
```

النسب تقرب إلى منزلتين عشريتين، وعندما يكون المقام صفرًا ترجع `0`.

### Agent performance

```text
booking_rate   = booked ÷ leads × 100
show_up_rate   = showed_up ÷ booked × 100
win_rate       = paid ÷ leads × 100
no_answer_rate = no_answer ÷ leads × 100
avg_followups  = عدد Follow-ups التي أنشأها الموظف ÷ Leads الموظف
```

يوجد صف `Unassigned` عندما توجد Leads بلا Agent. الترتيب الافتراضي تنازليًا حسب عدد Leads.

### Source performance

```text
source_percentage = source leads ÷ total filtered leads × 100
conversion_rate   = paid source leads ÷ source leads × 100
duplicate_rate    = duplicate source leads ÷ source leads × 100
junk_rate         = (wrong_number + job_seeker) ÷ source leads × 100
```

### Treatment breakdown

```text
treatment_percentage = treatment leads ÷ total filtered leads × 100
```

الـ Leads بدون Treatment تظهر باسم `No Treatment`.

### Funnel الحالي

الفنل تراكمي كالتالي:

```text
New        = جميع Leads داخل الفلتر
Contacted  = interested + not_interested + wrong_number + job_seeker
             + booked + showed_up + no_show + paid
Interested = interested + booked + showed_up + no_show + paid
Booked     = booked + showed_up + no_show + paid
Showed Up  = showed_up + paid
Paid       = paid
```

`conversion_from_previous = current stage count ÷ previous stage count × 100`.

### Speed to Contact

- يحسب بالثواني من `Lead.createdAt` إلى أول تواصل ناجح.
- تعرض الواجهة النتيجة بالدقائق.
- Dashboard endpoint يوفر Average, Median, Minimum, Maximum.
- Reports overview يعرض Average فقط.

### ملاحظات اتساق مهمة في النسخة الحالية

- `ReportsService` وإحصائيات Agents تستبعد الـ Soft-deleted Leads.
- `DashboardOverviewService` الخام لا يحتوي حاليًا شرط `deleted_at IS NULL`، ولذلك endpoint `/dashboard/overview` قد يختلف عن التقارير إذا كانت هناك Leads محذوفة. الواجهة الإدارية الحالية تعتمد التقارير، لكن يجب توحيد هذا قبل اعتبار كل endpoints متطابقة.
- Dashboard الخاص بالـ Agent يجلب أول 20 Lead فقط في قائمة العمل، ثم يحسب `activeMyLeads` من هذه الصفحة فقط؛ لذلك هذا الرقم قد لا يمثل كل Active Leads إذا تجاوز العدد 20.
- Quick ranges في واجهة Dashboard ترسل تواريخ تقويمية، بينما endpoint Dashboard الداخلي يدعم أيضًا rolling 7/30-day ranges. يجب اعتماد طريقة واحدة عند توحيد التصميم والحسابات.
- حدود التاريخ في التقارير تبنى كـ UTC من `00:00:00.000Z` إلى `23:59:59.999Z`، وليست مبنية حاليًا على timezone المخزن محليًا في Settings.
- `booked_leads` يعد الحالة الحالية `booked` فقط؛ Lead تقدم إلى `showed_up` أو `paid` لا يدخل في بطاقة Booked، رغم دخوله في Funnel Booked التراكمي.

هذه النقاط ليست وصفًا للتصميم المطلوب؛ هي سلوك الكود الحالي ويجب أخذها في الاعتبار قبل النشر.

---

## 14. أهم API Endpoints

كل endpoints المحمية تستخدم Cookie authentication، والطلبات من Frontend ترسل credentials.

### Auth

| Method | Path | الوظيفة |
|---|---|---|
| POST | `/auth/login` | تسجيل الدخول |
| POST | `/auth/logout` | تسجيل الخروج |
| GET | `/auth/me` | المستخدم الحالي |

### Leads

| Method | Path | الوظيفة |
|---|---|---|
| GET | `/leads` | قائمة Leads حسب صلاحية المستخدم |
| GET | `/my/leads` | Leads الخاصة بالمستخدم |
| GET | `/leads/unassigned` | Leads غير المعينة |
| GET | `/leads/export` | تصدير XLSX/CSV |
| GET | `/leads/check-duplicate` | فحص الهاتف |
| POST | `/leads` | إنشاء Lead |
| GET | `/leads/:id` | تفاصيل Lead |
| PATCH | `/leads/:id` | تعديل Lead — Admin في الـ Controller الحالي |
| DELETE | `/leads/:id` | Soft delete — Admin |
| POST | `/leads/:id/change-status` | تغيير الحالة |
| POST | `/leads/:id/assign` | تعيين Agent |
| POST | `/leads/:id/unassign` | إلغاء التعيين |
| POST | `/leads/:id/transfer` | نقل Lead |
| POST | `/leads/bulk-assign` | تعيين جماعي |
| GET | `/leads/:id/activities` | Timeline |
| GET | `/leads/:id/status-history` | تاريخ الحالات |
| GET | `/leads/:id/transfers` | تاريخ النقل |
| GET | `/leads/:id/duplicates` | تاريخ التكرار |
| GET | `/leads/:id/duplicate-group` | مجموعة الأرقام المتكررة |
| POST | `/leads/:id/call/start` | بدء جلسة اتصال |
| POST | `/leads/:id/call/end` | إنهاء جلسة اتصال |

### Follow-ups

| Method | Path | الوظيفة |
|---|---|---|
| POST | `/leads/:id/follow-ups` | إنشاء متابعة |
| GET | `/leads/:id/follow-ups` | متابعات Lead |
| GET | `/follow-ups` | القائمة المفلترة |
| GET | `/follow-ups/today` | متابعات اليوم |
| GET | `/follow-ups/overdue` | المتابعات المتأخرة |
| PATCH | `/follow-ups/:id/complete` | إكمال |
| PATCH | `/follow-ups/:id/cancel` | إلغاء |

### Dashboard and Reports

| Method | Path | الوظيفة |
|---|---|---|
| GET | `/dashboard/overview` | إجمالي/New/Paid |
| GET | `/dashboard/agents` | إحصائيات Agents |
| GET | `/dashboard/agents/:id` | Agent محدد |
| GET | `/dashboard/speed-to-contact` | إحصائيات السرعة العامة |
| GET | `/dashboard/agents/speed-to-contact` | السرعة لكل Agent |
| GET | `/reports` | التقرير الموحد |
| GET | `/reports/export` | تصدير التقرير |

### Administration

| Method | Path | الوظيفة |
|---|---|---|
| GET/POST | `/users` | عرض/إنشاء Users |
| PATCH/DELETE | `/users/:id` | تعديل/تعطيل User |
| PATCH | `/users/:id/status` | تغيير الحالة |
| PATCH | `/users/:id/reset-password` | Reset password |
| GET | `/users/agents` | Agents النشطون |
| GET/PATCH | `/agents/:id/capacity` | قراءة/تعديل السعة |
| GET/POST | `/roles` | عرض/إنشاء Roles |
| PATCH/DELETE | `/roles/:id` | تعديل/حذف Role |
| GET/POST | `/treatments` | عرض/إنشاء Treatments |
| GET/PATCH/DELETE | `/treatments/:id` | تفاصيل/تعديل/حذف Treatment |
| GET | `/audit-logs` | Audit list |
| GET | `/audit-logs/:id` | Audit details |

### Assignment settings

Base path: `/settings/assignment-method`

- GET/PATCH للإعداد الحالي.
- GET/POST `/distribution-rules`.
- PATCH/DELETE `/distribution-rules/:id`.
- GET `/treatment-routing`.
- PATCH `/treatment-routing/:treatmentId`.

### Webhooks and integrations

- `/webhooks/leads` — Generic lead.
- `/webhooks/google` — Google lead.
- `/webhooks/meta` — Meta verification/receive.
- `/webhooks/tiktok` — TikTok receive.
- `/webhooks/snapchat` — Snapchat receive.
- `/facebook/connect`, callback, sessions/forms, connections.
- `/tiktok/connect`, callback, sessions/forms, connections.
- `/snapchat/connect`, callback, sessions/forms, connections.

---

## 15. التشغيل محليًا

### المتطلبات

- Node.js 22 موصى به لأن Dockerfile يستخدمه.
- npm.
- PostgreSQL 17 أو Docker Desktop.
- منافذ 3000 للـ API و5173 للـ Frontend و5432 لقاعدة البيانات، أو تغييرها.

### أسهل طريقة لتشغيل الـ Backend وقاعدة البيانات

من داخل `backend`:

```powershell
docker compose up --build
```

هذا يشغل:

- PostgreSQL على `localhost:5432`.
- NestJS API على `localhost:3000`.
- Prisma migrations قبل بدء التطبيق.

### تشغيل الـ Backend بدون Docker

```powershell
cd backend
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npm run db:deploy
npm run start:dev
```

يجب تعديل `DATABASE_URL` و`JWT_SECRET` وأي Integration secrets قبل التشغيل الحقيقي.

### تشغيل الـ Frontend

في Terminal آخر:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

الواجهة تعمل افتراضيًا على `http://localhost:5173` وتتصل بـ `http://127.0.0.1:3000` حسب `VITE_API_BASE_URL`.

### Production build

Backend:

```powershell
cd backend
npm run build
npm run start:prod
```

Frontend:

```powershell
cd frontend
npm run build
```

ناتج الـ Frontend يوجد في `frontend/dist` ويحتاج Web Server أو Hosting يعيد مسارات SPA إلى `index.html`.

---

## 16. Environment Variables

لا تضع القيم السرية في Git أو README. استخدم `.env` محليًا وSecret Manager في الإنتاج.

### Core

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `AUTH_COOKIE_NAME`
- `COOKIE_SECURE`
- `CORS_ORIGIN`
- `LOG_LEVEL`
- `SECURITY_ENFORCE_HTTPS`
- `SECURITY_HSTS_MAX_AGE`
- `DUPLICATE_WINDOW_DAYS` عند الحاجة لتغيير نافذة التكرار.

### Meta

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_TOKEN_ENCRYPTION_KEY`

### TikTok

- `TIKTOK_APP_ID`
- `TIKTOK_APP_SECRET`
- `TIKTOK_REDIRECT_URI`
- `TIKTOK_TOKEN_ENCRYPTION_KEY`
- `TIKTOK_API_BASE_URL`
- `TIKTOK_OAUTH_AUTHORIZE_URL`
- `TIKTOK_OAUTH_TOKEN_URL`
- `TIKTOK_SCOPES`

### Snapchat

- `SNAPCHAT_CLIENT_ID`
- `SNAPCHAT_CLIENT_SECRET`
- `SNAPCHAT_REDIRECT_URI`
- `SNAPCHAT_TOKEN_ENCRYPTION_KEY`
- `SNAPCHAT_API_BASE_URL`
- `SNAPCHAT_OAUTH_AUTHORIZE_URL`
- `SNAPCHAT_OAUTH_TOKEN_URL`
- `SNAPCHAT_SCOPES`

### Frontend

- `VITE_API_BASE_URL`

في الإنتاج يجب تفعيل HTTPS، ضبط `COOKIE_SECURE=true`، واستخدام CORS origin محدد وليس wildcard.

---

## 17. بيانات الـ Seed التجريبية

`backend/prisma/seed.ts` ينشئ بيئة QA تحتوي على:

- Admin.
- 2 Managers.
- 5 Agents.
- Marketing Viewer.
- 5 Treatments.
- 50 Leads موزعة على مصادر وحالات مختلفة.
- Activities وStatus History.
- 15 Follow-ups متنوعة.

**تحذير شديد:** الـ Seed يحذف Activities وStatus History وFollow-ups وLeads وTreatments الموجودة قبل إدخال بيانات QA. توجد حماية تمنع تشغيله عندما يكون `NODE_ENV=production`، لكن لا يجب تشغيله على أي قاعدة بيانات حقيقية أو مستعادة من العميل.

بيانات تسجيل الدخول داخل Seed هي للاختبار فقط ويجب ألا تستخدم في Production.

---

## 18. الاختبارات الموجودة

يوجد Backend E2E coverage للموضوعات التالية:

- Authentication.
- Leads CRUD.
- Leads list performance.
- Lead status workflow.
- Activity timeline.
- Follow-ups.
- Manual assignment.
- Transfers.
- Round Robin.
- Agent capacity.
- Generic webhook.

الأوامر:

```powershell
cd backend
npm test
npm run test:e2e
npm run lint
npm run build
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run build
```

لا يوجد Frontend test runner معرف حاليًا في `package.json`؛ الموجود TypeScript check وproduction build.

---

## 19. الأمان

الموجود حاليًا:

- Argon2id password hashing.
- JWT authentication.
- HttpOnly, SameSite Strict cookie.
- Secure cookie configuration.
- Helmet security headers.
- HSTS في Production.
- HTTPS enforcement اختياري خلف Reverse Proxy.
- Strict allowed CORS origins.
- DTO validation مع whitelist ورفض الحقول غير المعرفة.
- Role guards.
- Lead-level access policy.
- Security logs لمحاولات الوصول المرفوضة.
- Audit logs للعمليات.
- Token encryption لتكاملات الإعلانات.
- Trust proxy مضبوط لمستوى Proxy واحد.

قبل النشر يجب أيضًا:

- تغيير كل أسرار وأمثلة التطوير.
- منع نشر ملفات `.env` والـ logs والنسخ الاحتياطية.
- استخدام Database user محدود الصلاحيات.
- تأمين Webhooks بالتوقيعات المتاحة لكل منصة.
- وضع Rate Limiting وBrute-force protection إن لم تتم إضافتهما في طبقة البنية التحتية.
- مراجعة Rotation وExpiration للـ integration tokens.
- اختبار سياسة Backup/Restore.

---

## 20. PWA والـ Frontend Runtime

- يوجد `manifest.webmanifest` باسم Medical Leads CRM.
- Display mode مضبوط `standalone`.
- يوجد Service Worker وIcon SVG.
- Router داخلي خفيف مبني على History API بدل React Router.
- أي Web Server في الإنتاج يجب أن يدعم SPA fallback.
- API client يعالج JSON والأخطاء ويرسل Cookies.
- الواجهة تحتوي Components مشتركة مثل Button, Input, Select, Badge, Dialog, Toast, Loading, Empty, Error, Pagination.

---

## 21. ملفات التكامل المساعدة

داخل `backend/docs`:

- `generic-lead-webhook.md`
- `meta-lead-ads-integration.md`
- `n8n-generic-webhook-workflow.md`
- `tiktok-lead-generation-integration.md`
- `snapchat-lead-generation-integration.md`

داخل `backend/n8n`:

- Workflow JSON جاهز للاستيراد في n8n لإرسال Leads إلى الـ Generic Webhook.

داخل `backend/postman`:

- Postman Collection لاختبار Generic Lead Webhook.

---

## 22. النسخ والاستعادة

المجلد `db-recovery-20260820` يحتوي ملفات Recovery من حادث/عملية استعادة سابقة، منها PostgreSQL dumps ونسخة Volume مضغوطة وأداة `pg_dirtyread`.

هذه الملفات:

- ليست جزءًا من تشغيل التطبيق.
- لا يجب تقديمها للمتصفح أو وضعها في Public hosting.
- قد تحتوي بيانات حساسة.
- يجب حفظها في Backup storage مشفر ومحدود الصلاحيات.
- لا يجب حذفها أو استبدالها إلا بقرار واضح وبعد التأكد من وجود نسخة أخرى قابلة للاستعادة.

---

## 23. نقاط يجب حسمها قبل النشر التجاري

1. هل النظام سيظل Standalone أم سيرتبط بـ WordPress؟
2. هل نحتاج Booking module مستقل بدل حالة وحقول داخل Lead؟
3. توحيد تعريف Booked بين البطاقات والفنل.
4. توحيد استبعاد Soft-deleted Leads في جميع Dashboard endpoints.
5. تصحيح أرقام Agent dashboard حتى تعتمد إجمالي DB لا أول 20 صفًا.
6. اعتماد Timezone مركزي في الـ Backend بدل Local UI فقط.
7. توحيد Quick ranges وحدود التاريخ.
8. تحديد ما إذا كانت الأرقام تقيس الحالة الحالية أم أحداث الانتقال خلال الفترة.
9. إضافة automated reconciliation tests للداشبورد والتقارير والقوائم.
10. مراجعة كل الرسائل والترجمات العربية.
11. إضافة Frontend unit/integration/E2E tests.
12. تحديد Production hosting وReverse proxy وSSL وbackup policy.
13. إزالة أو عزل logs وQA data وrecovery artifacts من حزمة النشر.
14. مراجعة Webhook authentication/signature verification لكل منصة.
15. تغيير Branding والأيقونات والألوان والنصوص وفق `README Design.md`.

---

## 24. Checklist للمطور أو المصمم الذي سيكمل المشروع

- اقرأ هذا الملف لفهم السلوك الحالي.
- اقرأ `README Design.md` لفهم الشكل وتجربة الاستخدام المطلوبة.
- لا تفترض وجود Booking entity مستقلة.
- لا تغيّر تعريف Metric في الواجهة فقط؛ التعريف يجب أن يكون موحدًا في Backend.
- حافظ على Permissions لكل Role.
- حافظ على Lead access restrictions للـ Agents.
- اجعل كل Dashboard drill-down يستخدم نفس الفلاتر.
- لا تحذف Unknown/Unassigned/Duplicate records من التقسيمات بصمت.
- اختبر عربي RTL وإنجليزي LTR.
- لا تستخدم بيانات Recovery أو Seed في الإنتاج.
- شغّل Build وTests قبل التسليم.
- وثّق أي Migration جديدة وأي تغيير في تعريف الأرقام.

---

## 25. الخلاصة

السكريبت الحالي هو CRM طبي متقدم نسبيًا، وليس مجرد جدول Leads. قوته الأساسية في ربط استقبال الـ Lead بالتوزيع، المتابعة، سجل النشاط، القياس، والتقارير داخل نظام صلاحيات واضح.

التدفق الأساسي هو:

```text
Lead arrives
→ validate and normalize
→ detect duplicate
→ save marketing and treatment context
→ assign based on configured rules and capacity
→ agent contacts and updates status
→ schedule follow-ups/appointment
→ record every activity
→ management and marketing reports read the same database
```

قبل الـ Publish النهائي، الأولوية التقنية هي توحيد تعريفات الأرقام والتاريخ والـ timezone، فصل الحجز في Model مستقل إذا كان مطلوبًا، ثم تطبيق التصميم الجديد من `README Design.md` على Components قابلة لإعادة الاستخدام بدون كسر منطق الصلاحيات والـ API الحالي.
