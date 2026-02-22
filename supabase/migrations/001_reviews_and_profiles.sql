-- ============================================================
-- K-daejeop: 리뷰 시스템 테이블 + RLS + Storage
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ── 1) user_profiles ──
create table if not exists public.user_profiles (
  user_id    uuid references auth.users(id) on delete cascade primary key,
  tutorial_seen boolean default false,
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = user_id);

-- 신규 유저 가입 시 자동으로 프로필 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2) reviews ──
create table if not exists public.reviews (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  place_id        text not null,
  place_name      text not null,
  place_address   text default '',
  place_category  text default '',
  place_x         text default '',
  place_y         text default '',
  rating          smallint not null check (rating between 1 and 3),
  review_taste    text default '',
  review_other    text default '',
  photo_url       text not null,
  visited_at      date default current_date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 인덱스
create index if not exists idx_reviews_user_id on public.reviews(user_id);
create index if not exists idx_reviews_place_id on public.reviews(place_id);

alter table public.reviews enable row level security;

create policy "reviews_select_own"
  on public.reviews for select
  using (auth.uid() = user_id);

create policy "reviews_insert_own"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "reviews_update_own"
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  using (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

-- ── 3) Storage: review-photos 버킷 ──
insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

-- 유저별 폴더에 업로드 가능 (경로: {user_id}/{filename})
create policy "storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'review-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 공개 읽기
create policy "storage_select_public"
  on storage.objects for select
  using (bucket_id = 'review-photos');

-- 본인 파일만 삭제
create policy "storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'review-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
