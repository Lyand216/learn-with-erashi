-- Menyeragamkan kebijakan RLS yang sudah ada dengan bentuk optimal:
-- auth.uid() dibungkus (select ...) supaya dievaluasi sekali per query.
-- Bentuk ini sama dengan yang dipakai create policy di migrasi pertama,
-- jadi migrasi ini aman dijalankan pada project yang sudah terpasang.

alter policy "notes milik sendiri" on public.notes
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "cards milik sendiri" on public.cards
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "focus_sessions milik sendiri" on public.focus_sessions
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "journal milik sendiri" on public.journal
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "checklist milik sendiri" on public.checklist
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter policy "settings milik sendiri" on public.settings
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
