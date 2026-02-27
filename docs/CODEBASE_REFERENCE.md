# SafeCheck — Codebase Reference

> **Purpose**: Comprehensive technical reference for AI agents and developers working on this codebase.  
> **Last updated**: 2026-02-27  
> **App**: SafeCheck — an elderly wellbeing check-in application

---

## 1. Project Overview

SafeCheck is a mobile-first web app that allows elderly users ("elders") to perform daily wellbeing check-ins (via face detection or manual tap). Caregivers (family members or care staff) monitor their elders through a dashboard, receive alerts on missed check-ins, and manage health records.

**Key user flows:**
- **Elder**: Opens app → face scan or manual "I'm OK" tap → check-in recorded → caregivers notified
- **Caregiver**: Views dashboard → sees elder statuses → drills into elder detail → manages schedules, health conditions, notes

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | ^18.3.1 |
| Build | Vite | (via vite.config.ts) |
| Language | TypeScript | (tsconfig.app.json) |
| Styling | Tailwind CSS + tailwindcss-animate | ^1.0.7 |
| UI Components | shadcn/ui (Radix primitives) | Various |
| Routing | react-router-dom | ^6.30.1 |
| State/Data | @tanstack/react-query | ^5.83.0 |
| Animation | framer-motion | ^12.34.2 |
| Backend | Supabase (Lovable Cloud) | @supabase/supabase-js ^2.97.0 |
| Mobile | Capacitor (iOS + Android) | ^8.1.0 |
| PWA | vite-plugin-pwa | ^1.2.0 |
| Font | Nunito (Google Fonts) | 400-900 weights |
| Date utils | date-fns | ^3.6.0 |
| Haptics | @capacitor/haptics | ^8.0.0 |
| Form validation | react-hook-form + zod | ^7.61.1 / ^3.25.76 |

---

## 3. File Structure

### Root config files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite config: React SWC plugin, lovable-tagger (dev only), VitePWA manifest, path aliases |
| `capacitor.config.ts` | Capacitor config: appId `app.lovable.f5e4f831fb0148738b2eaea3cedc7424`, webDir `dist`, remote server URL |
| `tailwind.config.ts` | Tailwind theme extension with custom colors (success, warning, danger, sidebar tokens) |
| `index.html` | Entry HTML, loads `/src/main.tsx` |
| `components.json` | shadcn/ui component configuration |
| `.env` | Auto-managed env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` |

### `src/` directory

| File/Dir | Purpose |
|----------|---------|
| `main.tsx` | React entry point, renders `<App />` |
| `App.tsx` | Root component: providers (QueryClient, Tooltip, Toaster, Sonner, BrowserRouter, AuthProvider), route definitions |
| `App.css` | (empty/minimal) |
| `index.css` | Tailwind directives, Nunito font import, CSS custom properties for light/dark themes |
| `vite-env.d.ts` | Vite type declarations |

### `src/pages/`

| File | Route | Access | Description |
|------|-------|--------|-------------|
| `AuthPage.tsx` | (shown when `!user`) | Public | Role selection (elder vs care_staff), anonymous sign-in for elders, email/password for staff |
| `CheckInPage.tsx` | `/` | Elder only | Main check-in screen with FaceCheckIn component, lockdown mode when check-in is due |
| `HistoryPage.tsx` | `/history` | Elder only | Scrollable list of past check-ins grouped by day |
| `SettingsPage.tsx` | `/settings` | All roles | Avatar upload, link code display (elder), language selector, data sharing toggles (elder), sign out |
| `DashboardPage.tsx` | `/dashboard` | Caregiver only | Elder status cards (OK/warning/alert/high_priority), add elder by code, alert badge, realtime updates |
| `ElderDetailPage.tsx` | `/elder/:elderId` | Caregiver only | Full elder profile view/edit, check-in history, schedule management, health conditions CRUD, notes CRUD, device info, data prefs display |
| `AlertsPage.tsx` | `/alerts` | Caregiver only | List of alerts with dismiss (mark as read) |
| `Index.tsx` | (unused redirect) | — | Likely a redirect or landing |
| `NotFound.tsx` | `*` | All | 404 page |

### `src/components/`

| File | Description |
|------|-------------|
| `FaceCheckIn.tsx` | Camera-based face detection check-in. Opens front camera, captures frames every 4s, sends to `face-detect` edge function. Falls back to manual check-in after 2 failures. Shows oval overlay with color feedback (neutral/success/destructive). |
| `CheckInButton.tsx` | Simple animated "I'm OK" button with heart icon and pulse animation (used as alternative to FaceCheckIn, though currently FaceCheckIn is used on CheckInPage) |
| `BottomNav.tsx` | Fixed bottom navigation. Elder tabs: Check In, History, Settings. Caregiver tabs: Dashboard, Settings. |
| `NavLink.tsx` | Wrapper around react-router-dom NavLink with className/activeClassName support |
| `SetupWizard.tsx` | 5-step onboarding for new elders: Language → Profile (name, year of birth, gender) → Emergency Contact → Check-in Frequency → Photo upload. Saves to `profiles`, creates `check_in_schedules` entry, calls `markSetupComplete()`. |

### `src/hooks/`

| File | Exports | Description |
|------|---------|-------------|
| `useAuth.tsx` | `AuthProvider`, `useAuth()` | Context provider managing auth state. Fetches `user_roles.role` and `profiles` on auth change. Exposes: `user`, `session`, `role`, `profile`, `loading`, `setupCompleted`, `markSetupComplete()`, `refreshProfile()`, `signOut()`. |
| `useLanguage.tsx` | `LanguageProvider`, `useLanguage()` | Context for i18n. Reads `profiles.preferred_language` on mount, persists changes to DB. Exposes: `lang`, `setLang()`, `t()`. |
| `useCheckInLockdown.ts` | `useCheckInLockdown(active)`, `vibrateSuccess()` | When `active=true`: requests fullscreen (web), vibrates phone every 8s (native Haptics or web fallback), prevents page navigation via `beforeunload`, re-requests fullscreen on exit. `vibrateSuccess()` fires a short haptic on successful check-in. |
| `use-mobile.tsx` | `useIsMobile()` | Media query hook for `(max-width: 768px)` |
| `use-toast.ts` | `useToast()` | Toast notification hook (shadcn/ui) |

### `src/lib/`

| File | Exports | Description |
|------|---------|-------------|
| `i18n.ts` | `Language`, `LANGUAGES`, `t()` | 4 languages: `en` (English), `zh` (Chinese), `ms` (Malay), `ta` (Tamil). 70+ translation keys covering all UI text. |
| `utils.ts` | `cn()` | Tailwind class merge utility (clsx + tailwind-merge) |

### `src/integrations/supabase/`

| File | Description |
|------|-------------|
| `client.ts` | **DO NOT EDIT** — Auto-generated Supabase client. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| `types.ts` | **DO NOT EDIT** — Auto-generated TypeScript types from database schema. |

---

## 4. Database Schema

**Project ID**: `rkpkwdhdiqxjowqpmzbo`

### Enum: `app_role`

```sql
CREATE TYPE public.app_role AS ENUM ('elder', 'family', 'care_staff');
```

### Tables

#### `user_roles`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `role` | app_role | No | — |

**RLS Policies:**
- `Users can view own roles` — SELECT: `auth.uid() = user_id`
- `Users can insert own role` — INSERT: `auth.uid() = user_id`
- ❌ No UPDATE or DELETE

---

#### `profiles`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `full_name` | text | No | `''` |
| `phone` | text | Yes | — |
| `avatar_url` | text | Yes | — |
| `date_of_birth` | date | Yes | — |
| `gender` | text | Yes | — |
| `address` | text | Yes | — |
| `nric_last4` | text | Yes | — |
| `emergency_contact_name` | text | Yes | — |
| `emergency_contact_phone` | text | Yes | — |
| `preferred_language` | text | No | `'en'` |
| `setup_completed` | boolean | No | `false` |
| `link_code` | text | Yes | — (auto-generated by trigger) |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Users can view own profile` — SELECT: `auth.uid() = user_id`
- `Users can update own profile` — UPDATE: `auth.uid() = user_id`
- `Caregivers can view elder profiles` — SELECT: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = profiles.user_id)`
- `Care staff can update elder profiles` — UPDATE: `has_role(auth.uid(), 'care_staff') OR EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = profiles.user_id)`
- ❌ No INSERT (created by trigger), no DELETE

---

#### `data_preferences`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `share_battery` | boolean | No | `false` |
| `share_app_usage` | boolean | No | `false` |
| `share_location` | boolean | No | `false` |
| `daily_reminder` | boolean | No | `true` |
| `updated_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Users can view own preferences` — SELECT: `auth.uid() = user_id`
- `Users can update own preferences` — UPDATE: `auth.uid() = user_id`
- ❌ No INSERT (created by trigger), no DELETE

---

#### `check_ins`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `checked_in_at` | timestamptz | No | `now()` |
| `battery_level` | integer | Yes | — |
| `is_charging` | boolean | Yes | — |
| `last_app_usage_at` | timestamptz | Yes | — |

**RLS Policies:**
- `Elders can view own check-ins` — SELECT: `auth.uid() = user_id`
- `Elders can insert own check-ins` — INSERT: `auth.uid() = user_id`
- `Caregivers can view elder check-ins` — SELECT: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = check_ins.user_id)`
- ❌ No UPDATE or DELETE

---

#### `check_in_schedules`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `elder_id` | uuid | No | — |
| `created_by` | uuid | Yes | — |
| `schedule_times` | text[] | No | `'{09:00,18:00}'` |
| `days_of_week` | integer[] | No | `'{0,1,2,3,4,5,6}'` |
| `grace_period_minutes` | integer | No | `60` |
| `is_active` | boolean | No | `true` |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Elders can view own schedules` — SELECT: `auth.uid() = elder_id`
- `Caregivers can view elder schedules` — SELECT: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = check_in_schedules.elder_id)`
- `Caregivers can manage schedules` — INSERT: `has_role(auth.uid(), 'family') OR has_role(auth.uid(), 'care_staff')`
- `Caregivers can update schedules` — UPDATE: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = check_in_schedules.elder_id)`
- ❌ No DELETE

---

#### `care_relationships`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `caregiver_id` | uuid | No | — |
| `elder_id` | uuid | No | — |
| `relationship_type` | text | No | `'family'` |
| `created_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Participants can view relationships` — SELECT: `auth.uid() = elder_id OR auth.uid() = caregiver_id`
- `Caregivers can create relationships` — INSERT: `auth.uid() = caregiver_id AND (has_role(auth.uid(), 'family') OR has_role(auth.uid(), 'care_staff'))`
- `Care staff can delete relationships` — DELETE: `has_role(auth.uid(), 'care_staff')`
- ❌ No UPDATE

---

#### `alerts`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `elder_id` | uuid | No | — |
| `alert_type` | text | No | `'missed_checkin'` |
| `message` | text | Yes | — |
| `is_read` | boolean | No | `false` |
| `created_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Elders can view own alerts` — SELECT: `auth.uid() = elder_id`
- `Caregivers can view elder alerts` — SELECT: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = alerts.elder_id)`
- `Caregivers can update alerts` — UPDATE: `EXISTS (care_relationships WHERE caregiver_id = auth.uid() AND elder_id = alerts.elder_id)`
- ❌ No INSERT (created by edge function with service role), no DELETE

---

#### `health_conditions`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `elder_id` | uuid | No | — |
| `condition_name` | text | No | — |
| `severity` | text | Yes | `'moderate'` |
| `notes` | text | Yes | — |
| `diagnosed_date` | date | Yes | — |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Caregivers can view elder health conditions` — SELECT: `EXISTS(care_relationships...) OR has_role(auth.uid(), 'care_staff')`
- `Care staff can insert health conditions` — INSERT: `has_role(auth.uid(), 'care_staff') OR EXISTS(care_relationships...)`
- `Care staff can update health conditions` — UPDATE: same as insert
- `Care staff can delete health conditions` — DELETE: same as insert

---

#### `elder_notes`
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `elder_id` | uuid | No | — |
| `author_id` | uuid | Yes | — |
| `content` | text | No | — |
| `created_at` | timestamptz | No | `now()` |
| `updated_at` | timestamptz | No | `now()` |

**RLS Policies:**
- `Caregivers can view elder notes` — SELECT: `EXISTS(care_relationships...) OR has_role(auth.uid(), 'care_staff')`
- `Caregivers can insert elder notes` — INSERT: `has_role(auth.uid(), 'care_staff') OR EXISTS(care_relationships...)`
- `Caregivers can update own elder notes` — UPDATE: `auth.uid() = author_id`
- `Caregivers can delete own elder notes` — DELETE: `auth.uid() = author_id`

---

## 5. Database Functions

### `handle_new_user()` — Trigger function
**Fires on**: `INSERT` on `auth.users` (trigger on auth schema)  
**Security**: `SECURITY DEFINER`

**Logic:**
1. Creates a `profiles` row with `user_id = NEW.id`, `full_name` from `raw_user_meta_data.full_name` (or `''`)
2. Creates a `data_preferences` row with defaults
3. If `raw_user_meta_data.role` exists and is a valid `app_role`, inserts into `user_roles` (ON CONFLICT DO NOTHING)

### `generate_link_code()` — Trigger function
**Fires on**: `INSERT` on `profiles`  
**Security**: `SECURITY DEFINER`

**Logic:** Generates a unique 6-character uppercase alphanumeric code (from `md5(random()...)`), assigns to `NEW.link_code`. Loops until unique.

### `has_role(_user_id uuid, _role app_role)` — SQL function
**Returns**: `boolean`  
**Security**: `SECURITY DEFINER`, `STABLE`

Checks if the given user has the specified role in `user_roles`. Used in RLS policies to avoid recursive checks.

### `lookup_elder_by_code(_code text)` — SQL function
**Returns**: `TABLE(user_id uuid, full_name text)`  
**Security**: `SECURITY DEFINER`, `STABLE`

Looks up a profile by `link_code` (uppercased), joining with `user_roles` to confirm the user is an elder. Used by caregivers to add elders by code.

### `update_updated_at_column()` — Trigger function
Generic trigger that sets `NEW.updated_at = now()`. Attached to tables that need automatic timestamp updates.

---

## 6. Authentication Flow

### Elder Sign-In (Anonymous)
1. User taps "I'm an Elder" on `AuthPage`
2. `supabase.auth.signInAnonymously()` is called
3. `handle_new_user` trigger fires → creates profile + data_preferences
4. Client inserts `user_roles` row with `role: 'elder'`
5. `generate_link_code` trigger fires on profile insert → assigns 6-char code
6. `useAuth` fetches role + profile → detects `setup_completed === false` → renders `SetupWizard`
7. After wizard completion, `markSetupComplete()` sets `profiles.setup_completed = true`

### Care Staff Sign-Up (Email/Password)
1. User taps "Care Staff" → form appears
2. `supabase.auth.signUp()` with `data: { full_name, role: 'care_staff' }`
3. Email confirmation sent (auto-confirm is NOT enabled)
4. On confirmation, `handle_new_user` trigger fires → creates profile, data_preferences, and `user_roles` row with `role: 'care_staff'`
5. `useAuth` fetches role → routes to `/dashboard`

### Care Staff Sign-In
1. `supabase.auth.signInWithPassword({ email, password })`
2. `useAuth` fetches role + profile → routes to `/dashboard`

### Sign Out
1. `supabase.auth.signOut()` clears session
2. `useAuth` resets all state → `AuthPage` renders

---

## 7. Edge Functions

All edge functions are in `supabase/functions/` and deployed automatically.

### `face-detect`
**File**: `supabase/functions/face-detect/index.ts`  
**Trigger**: Called from `FaceCheckIn.tsx` via `supabase.functions.invoke("face-detect", { body: { image } })`  
**Secret used**: `LOVABLE_API_KEY`  
**AI Model**: `google/gemini-2.5-flash` via Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)

**Input**: `{ image: string }` — base64 JPEG data URL (320×400)

**Output**: JSON object:
```json
{
  "face_detected": boolean,
  "face_in_oval": boolean,
  "is_dark": boolean,
  "is_bright": boolean,
  "guidance": string,
  "confidence": number (0-100)
}
```

**Behavior**: Sends the image to Gemini with a system prompt that instructs it to analyze face position, lighting, and return structured guidance. Handles 429 (rate limited) and 402 (credits exhausted) responses.

### `check-missed-checkins`
**File**: `supabase/functions/check-missed-checkins/index.ts`  
**Trigger**: Intended to be called on a cron schedule (not configured in code — would need external trigger)  
**Secrets used**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Logic:**
1. Fetches all users with role `elder`
2. For each elder, checks if last check-in is >48 hours ago
3. If no alert of type `high_priority_missed` was sent in last 24 hours, creates an alert
4. Looks up each caregiver via `care_relationships`
5. Gets caregiver email via `auth.admin.getUserById()`
6. Calls `send-alert-email` edge function for each caregiver

### `send-alert-email`
**File**: `supabase/functions/send-alert-email/index.ts`  
**Trigger**: Called by `check-missed-checkins` edge function  
**Secrets used**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Input**: `{ to: string, elderName: string, lastCheckIn: string | null }`

**Behavior**: Constructs an HTML email body with high-priority alert styling. Currently generates a magic link via Supabase auth admin API and logs the alert (actual email delivery depends on Supabase email configuration). The alert record is already in the database for in-app display.

---

## 8. Frontend Routing & Role-Based Access

Defined in `src/App.tsx` → `ProtectedRoutes` component.

```
If loading → Loading spinner
If !user → AuthPage (login/signup)
If elder && !setupCompleted → SetupWizard
If elder:
  / → CheckInPage
  /history → HistoryPage
  /settings → SettingsPage
If caregiver (family or care_staff):
  /dashboard → DashboardPage
  /elder/:elderId → ElderDetailPage
  /alerts → AlertsPage
  /settings → SettingsPage
* → NotFound
```

Cross-role access is prevented by `<Navigate>` redirects (elders to `/`, caregivers to `/dashboard`).

---

## 9. Realtime Subscriptions

### `DashboardPage.tsx`
Channel: `dashboard-checkins`
- `INSERT` on `check_ins` → re-fetches elder statuses
- `INSERT` on `alerts` → re-fetches alert count

### `ElderDetailPage.tsx`
Channel: `elder-detail-{elderId}`
- `*` on `check_ins` (filtered by `user_id=eq.{elderId}`) → re-fetches check-ins
- `*` on `profiles` (filtered by `user_id=eq.{elderId}`) → re-fetches profile
- `*` on `health_conditions` (filtered by `elder_id=eq.{elderId}`) → re-fetches conditions
- `*` on `elder_notes` (filtered by `elder_id=eq.{elderId}`) → re-fetches notes
- `*` on `data_preferences` (filtered by `user_id=eq.{elderId}`) → re-fetches data prefs

---

## 10. i18n System

**File**: `src/lib/i18n.ts`

**Languages**: `en` (English), `zh` (Chinese/中文), `ms` (Malay/Bahasa Melayu), `ta` (Tamil/தமிழ்)

**70+ translation keys** covering: greetings, check-in prompts, navigation labels, settings labels, face scan guidance, time descriptions, privacy text, form labels.

**Usage**: `useLanguage()` hook provides `t(key)` function. Language preference is stored in `profiles.preferred_language` and persisted to DB on change.

**SetupWizard** has its own inline translations (not using the i18n system) for step titles and form labels across all 4 languages.

---

## 11. Storage Buckets

### `avatars` (Public)
- **Purpose**: Profile photos for elders
- **Upload path**: `{user_id}/avatar.{ext}`
- **Uploaded from**: `SetupWizard.tsx` (onboarding) and `SettingsPage.tsx` (settings)
- **Read from**: `ElderDetailPage.tsx` (avatar display), `SettingsPage.tsx`
- **Public URL**: Retrieved via `supabase.storage.from("avatars").getPublicUrl(path)`

---

## 12. PWA Configuration

**File**: `vite.config.ts` → `VitePWA` plugin

```json
{
  "name": "SafeCheck - Elderly Wellbeing",
  "short_name": "SafeCheck",
  "theme_color": "#2a9d6e",
  "background_color": "#f5f9f7",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "/pwa-192.png", "sizes": "192x192" },
    { "src": "/pwa-512.png", "sizes": "512x512" },
    { "src": "/pwa-512.png", "sizes": "512x512", "purpose": "maskable" }
  ]
}
```

- `registerType: "autoUpdate"` — Service worker auto-updates
- `navigateFallbackDenylist: [/^\/~oauth/]` — Excludes OAuth callback routes from SW

---

## 13. Capacitor Configuration

**File**: `capacitor.config.ts`

```typescript
{
  appId: 'app.lovable.f5e4f831fb0148738b2eaea3cedc7424',
  appName: 'SafeCheck',
  webDir: 'dist',
  server: {
    url: 'https://f5e4f831-fb01-4873-8b2e-aea3cedc7424.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
}
```

**Native plugins used:**
- `@capacitor/haptics` — Vibration for check-in lockdown and success feedback
- `@capacitor/core` — Platform detection (`Capacitor.isNativePlatform()`)

---

## 14. Design System

**Font**: Nunito (400, 600, 700, 800, 900)

**Color tokens** (HSL, defined in `src/index.css`):

| Token | Light | Purpose |
|-------|-------|---------|
| `--primary` | `162 48% 42%` | Green — buttons, links, active states |
| `--success` | `145 60% 42%` | Check-in success, OK status |
| `--warning` | `36 90% 55%` | Overdue status (amber) |
| `--destructive` | `0 72% 55%` | Alerts, missed check-ins, errors |
| `--accent` | `36 90% 55%` | Same as warning |
| `--background` | `160 20% 97%` | Page background (light green tint) |
| `--card` | `0 0% 100%` | Card backgrounds |
| `--muted` | `160 15% 93%` | Muted backgrounds |
| `--border` | `160 15% 88%` | Borders |

Dark mode variants are defined under `.dark` class.

---

## 15. Environment Variables

### Frontend (in `.env`, auto-managed)
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Project ID |

### Edge Function Secrets (server-side)
| Secret | Used By |
|--------|---------|
| `LOVABLE_API_KEY` | `face-detect` — authenticates with Lovable AI Gateway |
| `SUPABASE_URL` | `check-missed-checkins`, `send-alert-email` |
| `SUPABASE_SERVICE_ROLE_KEY` | `check-missed-checkins`, `send-alert-email` — admin access |
| `SUPABASE_ANON_KEY` | Available but not directly used in edge functions |
| `SUPABASE_DB_URL` | Available but not directly used |
| `SUPABASE_PUBLISHABLE_KEY` | Available but not directly used |

---

## 16. Key Integration Points

### Elder linking flow
1. Elder's `profiles.link_code` is auto-generated on profile creation (6-char uppercase)
2. Elder views their code on `SettingsPage` → shares with caregiver
3. Caregiver enters code on `DashboardPage` → "Add Elder" dialog
4. Code is looked up via `supabase.rpc("lookup_elder_by_code", { _code })` — SECURITY DEFINER function
5. Caregiver confirms → `care_relationships` row created
6. Caregiver can now see elder on dashboard and drill into detail

### Check-in flow (face detection)
1. `CheckInPage` renders `FaceCheckIn` component
2. User taps green camera button → front camera opens
3. After 2s warmup, frames are captured every 4s
4. Local lighting check (dark/bright pixel analysis) runs first
5. If lighting OK, frame sent to `face-detect` edge function
6. Edge function sends image to Gemini AI for analysis
7. If `face_detected && face_in_oval && confidence >= 60` → check-in recorded via `supabase.from("check_ins").insert()`
8. If 2+ failures → falls back to manual "Check In Manually" button
9. On success: haptic feedback, lockdown mode disabled, success animation

### Check-in lockdown
- `useCheckInLockdown(active)` activates when `checkInDue === true` (no check-in today)
- Requests fullscreen, vibrates every 8s, blocks navigation
- Deactivates when check-in is completed

### Alert system
- `check-missed-checkins` edge function (needs external cron trigger) scans all elders
- Creates `alerts` table entries for elders with >48h since last check-in
- Caregivers see unread alert count badge on dashboard
- Alert detail on `AlertsPage` with dismiss (mark read) functionality
