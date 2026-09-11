-- =========================================================================
--  معمل الحوشي — إعداد قاعدة البيانات على Supabase (نسخة مؤمّنة)
--  الطريقة: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ الصق الملف ▸ Run
--  (مرة واحدة — ولو شغّلت نسخة قديمة قبل كده شغّل الملف ده كله تاني هيصلّحها)
-- =========================================================================

-- 1) جدول واحد بيستوعب كل بيانات المعمل
create table if not exists public.lab_data (
  tbl  text not null,
  id   text not null,
  data jsonb not null default '{}'::jsonb,
  _u   bigint not null default 0,       -- وقت آخر تعديل (epoch ms)
  _del boolean not null default false,  -- علامة حذف
  primary key (tbl, id)
);

create index if not exists lab_data_tbl_idx on public.lab_data (tbl);
create index if not exists lab_data_u_idx   on public.lab_data (_u desc);

-- 2) تفعيل الحماية (RLS)
alter table public.lab_data enable row level security;

-- 3) مسح أي سياسات قديمة (مهم)
drop policy if exists "lab_read"   on public.lab_data;
drop policy if exists "lab_insert" on public.lab_data;
drop policy if exists "lab_update" on public.lab_data;
drop policy if exists "lab_none"   on public.lab_data;
drop policy if exists "lab_noins"  on public.lab_data;
drop policy if exists "lab_noupd"  on public.lab_data;

-- =========================================================================
--  اختر وضع واحد وفعّله:
-- =========================================================================

---------------------------------------------------------------------------
-- [أ] الوضع الآمن ⭐ (المُوصى به) — مع طبقة السيرفر api/ على Vercel
--     العامة مقفولة 100%، والسيرفر بيتصل بـ service_role (بيجاوز RLS)
--     وبيحدد مين يشوف إيه.
---------------------------------------------------------------------------
create policy "lab_none"  on public.lab_data for select using (false);
create policy "lab_noins" on public.lab_data for insert with check (false);
create policy "lab_noupd" on public.lab_data for update using (false) with check (false);

---------------------------------------------------------------------------
-- [ب] الوضع المباشر (المتصفح بيتصل بـ Supabase مباشرة) — مخاطرة أعلى
--     لو مش هتستخدم مجلد api/ وتريد المزامنة من المتصفح،
--     شغّل السطور دي بدل قسم [أ]:
--
-- create policy "lab_read"   on public.lab_data for select using (true);
-- create policy "lab_insert" on public.lab_data for insert with check (true);
-- create policy "lab_update" on public.lab_data for update using (true) with check (true);
--
-- ⚠ تحذير مهم: في الوضع [ب] أي حد يمسك الـ anon/publishable key
--   (موجود في المتصفح) يقدر يقرأ كل بيانات المرضى بالأمر ده:
--     curl "https://XXX.supabase.co/rest/v1/lab_data?select=*" -H "apikey: المفتاح"
--   متستخدموش لو هتخزن بيانات مرضى حقيقية.
---------------------------------------------------------------------------

-- =========================================================================
--  4) مجلد الملفات (صور الروشتات / إيصالات الدفع / صور الأطباء)
--     بيتعمل تلقائي من الكود ده، ولو مش موجود اعمله يدوي:
--     Storage ▸ New bucket ▸ lab-files ▸ Public ✓
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('lab-files', 'lab-files', true)
on conflict (id) do nothing;

drop policy if exists "lab_files_read"   on storage.objects;
drop policy if exists "lab_files_insert" on storage.objects;

-- ملاحظة: سياسات القراءة دي للصور فقط (الصور مش بيانات شخصية مباشرة)،
-- والروابط بيبقى صعب تخمينها. لو عايز تقفل أكتر: استبدل using (true) بـ false
-- وسيب الرفع والقراءة يمرّوا من السيرفر.
create policy "lab_files_read"
  on storage.objects for select
  using ( bucket_id = 'lab-files' );

create policy "lab_files_insert"
  on storage.objects for insert
  with check ( bucket_id = 'lab-files' );

-- =========================================================================
--  5) تشديد إضافي (اختياري بس مُوصى به)
-- =========================================================================
-- منع كتابة صفوف ضخمة (حماية من استنزاف المساحة):
-- alter table public.lab_data add constraint lab_data_size_chk
--   check (pg_column_size(data) < 200000);

-- =========================================================================
--  ✅ بعد التشغيل: Table Editor ▸ lab_data هتلاقيه فاضي — وده الطبيعي.
--  في الوضع [أ] هيتعبى من السيرفر بعد أول دخول للوحة الأدمن.
-- =========================================================================
