-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It makes the bible_progress table safe for the app's conflict-aware upserts.

-- 1. Remove any duplicate rows that accumulated from the old upsert logic
--    (keeps one copy of each user/book/chapter combination).
DELETE FROM bible_progress a
USING bible_progress b
WHERE a.ctid < b.ctid
  AND a.user_id  = b.user_id
  AND a.book_name = b.book_name
  AND a.chapter   = b.chapter;

-- 2. Add the unique constraint the app's upserts rely on
--    (onConflict: "user_id,book_name,chapter").
--    If this errors with "already exists", that's fine — it means it's already in place.
ALTER TABLE bible_progress
  ADD CONSTRAINT bible_progress_user_book_chapter_key
  UNIQUE (user_id, book_name, chapter);
