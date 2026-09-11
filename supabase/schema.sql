-- =============================================================
--  معمل الحوشي — إعداد قاعدة بيانات Supabase
--  الطريقة: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ الصق
--  الملف ده والصق Run. (مرة واحدة بس)
-- =============================================================

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

-- 3) السياسات: الموقع الثابت بيستخدم anon key، فمحتاجين سماح بالقراءة والكتابة
drop policy if exists "lab_read"   on public.lab_data;
drop policy if exists "lab_insert" on public.lab_data;
drop policy if exists "lab_update" on public.lab_data;

create policy "lab_read"   on public.lab_data for select using (true);
create policy "lab_insert" on public.lab_data for insert with check (true);
create policy "lab_update" on public.lab_data for update using (true) with check (true);

-- 4) مجلد الملفات (صور الروشتات، إيصالات الدفع، صور الدكاترة)
--    يُنشأ من: Storage ▸ New bucket ▸ الاسم lab-files ▸ Public ✓
insert into storage.buckets (id, name, public)
values ('lab-files', 'lab-files', true)
on conflict (id) do nothing;

drop policy if exists "lab_files_read"   on storage.objects;
drop policy if exists "lab_files_insert" on storage.objects;

create policy "lab_files_read"
  on storage.objects for select
  using ( bucket_id = 'lab-files' );

create policy "lab_files_insert"
  on storage.objects for insert
  with check ( bucket_id = 'lab-files' );

-- =============================================================
--  ملاحظة أمان: السياسات دي بتسمح لأي زائر بالكتابة (لازم علشان
--  المريض يحجز من غير تسجيل دخول). البيانات دي مش بيانات بنكية،
--  ولو حابب تقفل أكتر: استبدل السياسات دي بـ Edge Function
--  يتحقق من صحة البيانات قبل الكتابة.
-- =============================================================
