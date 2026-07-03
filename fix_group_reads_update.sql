-- Run once in the Supabase SQL Editor.
-- group_reads has RLS but no UPDATE policy, so the app's attempt to mark a
-- group read "completed" silently updates zero rows — which is why the
-- completion banner replays on every Library visit.
-- This lets participants (the starter or anyone invited/accepted) update it.

CREATE POLICY "participants_update_group_reads"
ON group_reads FOR UPDATE TO authenticated
USING (
  auth.uid() = from_id
  OR EXISTS (
    SELECT 1 FROM group_read_members m
    WHERE m.group_read_id = group_reads.id AND m.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = from_id
  OR EXISTS (
    SELECT 1 FROM group_read_members m
    WHERE m.group_read_id = group_reads.id AND m.user_id = auth.uid()
  )
);
