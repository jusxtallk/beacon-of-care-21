

## Plan: Create comprehensive codebase documentation

**Single task:** Create `docs/CODEBASE_REFERENCE.md` with a complete, accurate mapping of every file, database table, edge function, RLS policy, trigger, and integration in the project. No fabricated information — only what exists in the current code.

**Contents of the .md file:**
1. Project overview (SafeCheck — elderly wellbeing check-in app)
2. Technology stack with exact versions
3. File structure with purpose of every file
4. Database schema — all 9 tables with columns, types, defaults, and foreign keys
5. RLS policies per table (exact expressions)
6. Database functions and triggers (`handle_new_user`, `generate_link_code`, `lookup_elder_by_code`, `has_role`, `update_updated_at_column`)
7. Authentication flow — anonymous sign-in for elders, email/password for care_staff, role auto-assignment via trigger
8. Edge functions — `face-detect`, `check-missed-checkins`, `send-alert-email`
9. Frontend routing and role-based access
10. Hooks (`useAuth`, `useLanguage`, `useCheckInLockdown`)
11. i18n system (4 languages: en, zh, ms, ta)
12. Storage buckets (avatars)
13. Realtime subscriptions used in DashboardPage and ElderDetailPage
14. PWA and Capacitor configuration
15. Environment variables required

