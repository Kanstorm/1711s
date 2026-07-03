-- ═══════════════════════════════════════════════════════════════════
-- 17:11s — Canonical Row-Level Security policies
-- Run once in the Supabase SQL Editor. Safe to re-run (idempotent):
-- it drops ALL existing policies on these tables and recreates the
-- correct set, so this file is the single source of truth.
--
-- What this fixes:
--  • Every table was readable by ANYONE with the anon key (which is
--    public). After this, all reads require a logged-in member.
--  • Several update/delete policies were missing entirely, making app
--    features fail silently (e.g. group-read completion). This grants
--    exactly what each feature needs — no more, no less.
-- ═══════════════════════════════════════════════════════════════════

-- ── Helper: is the current user an admin? ──────────────────────────
-- SECURITY DEFINER avoids RLS recursion when policies check profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false)
$$;

-- ── Helper: is the current user a participant of a group read? ─────
CREATE OR REPLACE FUNCTION public.is_group_read_participant(gr_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM group_reads WHERE id = gr_id AND from_id = auth.uid())
      OR EXISTS (SELECT 1 FROM group_read_members WHERE group_read_id = gr_id AND user_id = auth.uid())
$$;

-- ── Wipe all existing policies on app tables, enable RLS ───────────
DO $$
DECLARE
  t text;
  pol record;
  app_tables text[] := ARRAY[
    'profiles','books','reading_progress','reviews','review_likes',
    'threads','posts','recommendations','activities','friendships',
    'friend_requests','custom_seals','custom_triumphs','completed_seals',
    'triumph_progress','group_challenges','group_reads',
    'group_read_members','group_read_messages','bible_progress'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ═══ PROFILES ═══
-- Everyone (logged in) sees the member list; you manage only your own row.
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ═══ BOOKS ═══  (any member adds; only admins edit/remove)
CREATE POLICY books_select ON books FOR SELECT TO authenticated USING (true);
CREATE POLICY books_insert ON books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY books_update_admin ON books FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY books_delete_admin ON books FOR DELETE TO authenticated USING (is_admin());

-- ═══ READING PROGRESS ═══  (own rows only; visible to all members)
CREATE POLICY rp_select ON reading_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY rp_insert_own ON reading_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY rp_update_own ON reading_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY rp_delete_own ON reading_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ═══ REVIEWS ═══  (write your own; author or admin deletes)
CREATE POLICY reviews_select ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY reviews_insert_own ON reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_update_own ON reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_delete ON reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- ═══ REVIEW LIKES ═══
CREATE POLICY rl_select ON review_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY rl_insert_own ON review_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY rl_delete_own ON review_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ═══ THREADS ═══  (anyone starts; admin pins/edits/deletes)
CREATE POLICY threads_select ON threads FOR SELECT TO authenticated USING (true);
CREATE POLICY threads_insert_own ON threads FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY threads_update_admin ON threads FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY threads_delete_admin ON threads FOR DELETE TO authenticated USING (is_admin());

-- ═══ POSTS ═══  (write your own; author or admin deletes)
CREATE POLICY posts_select ON posts FOR SELECT TO authenticated USING (true);
CREATE POLICY posts_insert_own ON posts FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY posts_delete ON posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_admin());

-- ═══ RECOMMENDATIONS ═══
CREATE POLICY recs_select ON recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY recs_insert_own ON recommendations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY recs_delete ON recommendations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- ═══ ACTIVITIES ═══  (feed: anyone reads, you post as yourself)
CREATE POLICY act_select ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY act_insert_own ON activities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ═══ FRIENDSHIPS ═══  (stored both directions; either side manages)
CREATE POLICY fs_select ON friendships FOR SELECT TO authenticated USING (true);
CREATE POLICY fs_insert ON friendships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY fs_update ON friendships FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY fs_delete ON friendships FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- ═══ FRIEND REQUESTS ═══  (sender creates; either party updates/removes)
CREATE POLICY fr_select ON friend_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY fr_insert_own ON friend_requests FOR INSERT TO authenticated WITH CHECK (from_id = auth.uid());
CREATE POLICY fr_update ON friend_requests FOR UPDATE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid())
  WITH CHECK (from_id = auth.uid() OR to_id = auth.uid());
CREATE POLICY fr_delete ON friend_requests FOR DELETE TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());

-- ═══ CUSTOM SEALS + TRIUMPHS ═══  (admin-authored)
CREATE POLICY cs_select ON custom_seals FOR SELECT TO authenticated USING (true);
CREATE POLICY cs_insert_admin ON custom_seals FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY cs_update_admin ON custom_seals FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY cs_delete_admin ON custom_seals FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY ct_select ON custom_triumphs FOR SELECT TO authenticated USING (true);
CREATE POLICY ct_insert_admin ON custom_triumphs FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY ct_update_admin ON custom_triumphs FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY ct_delete_admin ON custom_triumphs FOR DELETE TO authenticated USING (is_admin());

-- ═══ COMPLETED SEALS ═══
CREATE POLICY cseal_select ON completed_seals FOR SELECT TO authenticated USING (true);
CREATE POLICY cseal_insert_own ON completed_seals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY cseal_update_own ON completed_seals FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══ TRIUMPH PROGRESS ═══  (own rows; admins may set manual triumphs)
CREATE POLICY tp_select ON triumph_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY tp_insert ON triumph_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY tp_update ON triumph_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- ═══ GROUP CHALLENGES ═══  (admin-managed)
CREATE POLICY gc_select ON group_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY gc_insert_admin ON group_challenges FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY gc_update_admin ON group_challenges FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY gc_delete_admin ON group_challenges FOR DELETE TO authenticated USING (is_admin());

-- ═══ GROUP READS ═══  (starter creates; participants update e.g. completed)
CREATE POLICY gr_select ON group_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY gr_insert_own ON group_reads FOR INSERT TO authenticated WITH CHECK (from_id = auth.uid());
CREATE POLICY gr_update_participant ON group_reads FOR UPDATE TO authenticated
  USING (is_group_read_participant(id)) WITH CHECK (is_group_read_participant(id));
CREATE POLICY gr_delete ON group_reads FOR DELETE TO authenticated
  USING (from_id = auth.uid() OR is_admin());

-- ═══ GROUP READ MEMBERS ═══  (starter invites others; you answer for yourself)
CREATE POLICY grm_select ON group_read_members FOR SELECT TO authenticated USING (true);
CREATE POLICY grm_insert ON group_read_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_reads gr WHERE gr.id = group_read_id AND gr.from_id = auth.uid())
  );
CREATE POLICY grm_update_own ON group_read_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY grm_delete ON group_read_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_reads gr WHERE gr.id = group_read_id AND gr.from_id = auth.uid())
  );

-- ═══ GROUP READ MESSAGES ═══  (chat is private to participants)
CREATE POLICY grmsg_select_participant ON group_read_messages FOR SELECT TO authenticated
  USING (is_group_read_participant(group_read_id));
CREATE POLICY grmsg_insert ON group_read_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND is_group_read_participant(group_read_id));

-- ═══ BIBLE PROGRESS ═══  (own rows; visible to all for profiles/prestige)
CREATE POLICY bp_select ON bible_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY bp_insert_own ON bible_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY bp_update_own ON bible_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY bp_delete_own ON bible_progress FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- BONUS: unique constraints the app's upserts rely on. Each block
-- dedupes first, then adds the constraint; skips if already present.
-- (Same class of problem as the bible_progress fix you already ran.)
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  DELETE FROM completed_seals a USING completed_seals b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.seal_id = b.seal_id;
  ALTER TABLE completed_seals ADD CONSTRAINT completed_seals_user_seal_key UNIQUE (user_id, seal_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM reading_progress a USING reading_progress b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.book_id = b.book_id;
  ALTER TABLE reading_progress ADD CONSTRAINT reading_progress_user_book_key UNIQUE (user_id, book_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM triumph_progress a USING triumph_progress b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.triumph_id = b.triumph_id;
  ALTER TABLE triumph_progress ADD CONSTRAINT triumph_progress_user_triumph_key UNIQUE (user_id, triumph_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  DELETE FROM friendships a USING friendships b
    WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.friend_id = b.friend_id;
  ALTER TABLE friendships ADD CONSTRAINT friendships_user_friend_key UNIQUE (user_id, friend_id);
EXCEPTION WHEN duplicate_table OR duplicate_object OR invalid_table_definition THEN NULL;
END $$;
