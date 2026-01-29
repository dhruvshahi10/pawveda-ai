# PawVeda MVP Analysis (Repo-Aligned)

Note: A Spring Boot backend exists at `../pawveda-backend`. This analysis covers the frontend repo plus that backend.

## 0) Revamp Summary (post-funding reset)
- Product stance: minimal, outcome-driven pet care with a calm, low-text interface.
- Core loop: Onboarding → Pet Profile → Daily/Weekly Check-in → Symptom Signal → Vet Brief.
- Wedge remains triage + vet brief, but the daily check-in keeps retention and data quality.
- Dashboard becomes a "Today" command center, not a feature gallery.

## 0.1) North Star Metrics
- Activation: % of new users completing onboarding + first check-in within 24 hours.
- Trust: % of users with a complete profile (photo + meds + vaccines).
- Value: % of sessions generating a triage outcome or vet brief.

## 1) Idea and Personas
- Product idea: AI-assisted pet care tailored for Indian pet parents, with nutrition safety, climate alerts, activity coaching, and adoption support.
- Primary personas:
  - Pet parent (main flow with personalized care).
  - NGO or general user (adoption discovery, rescue contact).

## 2) Current User Journeys (as implemented)
- Anonymous visitor
  - Landing and waitlist capture: `components/LandingPage.tsx`.
  - Guides/blog library: `components/GuidesIndex.tsx`, `components/BlogIndex.tsx`.
- Pet parent
  - Auth: `components/Auth.tsx`.
  - Onboarding: `components/Onboarding.tsx`.
  - Dashboard: `components/Dashboard.tsx` (feed, lens, playbook, studio, adoption).
- NGO/general user
  - Auth role select: `components/Auth.tsx`.
  - Org onboarding: `components/OrgOnboarding.tsx`.
  - Dashboard: same container, but NGO-specific tooling is not implemented.

## 3) Feature Inventory (what exists today)
- Public marketing + waitlist
  - Branding, pitch, and form submission: `components/LandingPage.tsx`.
- Auth + session
  - Login, signup, role selection, refresh workflow: `components/Auth.tsx`, `App.tsx`, `lib/auth.ts`.
- Onboarding
  - Pet profile collection and posting: `components/Onboarding.tsx`.
  - NGO profile collection: `components/OrgOnboarding.tsx`.
- Pet parent dashboard
  - Feed, safety radar, daily brief, micro tips, nearby services: `components/Dashboard.tsx`, `services/feedService.ts`.
  - AI features (nutri lens, play plan, activity tip, studio art): `components/Dashboard.tsx`, `services/geminiService.ts`.
  - Checklists and reminders are local-only: `components/Dashboard.tsx`.
- Adoption hub
  - Listings and application flow with fallbacks: `components/Adoption.tsx`, `services/adoptionService.ts`.
- Content + SEO
  - Markdown-powered guides and blogs: `lib/content.ts`, `components/BlogPage.tsx`, `components/PillarPage.tsx`.

## 4) Backend Surface (frontend dependencies + current status)
- Auth (implemented in backend)
  - `POST /api/auth/register`, `POST /api/auth/login`: `components/Auth.tsx`, `../pawveda-backend/.../AuthController.java`.
  - `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/me`: `App.tsx`, `../pawveda-backend/.../AuthController.java`, `../pawveda-backend/.../UserController.java`.
- Profiles (implemented in backend)
  - `GET /api/pets`, `POST /api/pets`: `components/Onboarding.tsx`, `../pawveda-backend/.../PetProfileController.java`.
  - `GET /api/orgs/profile`, `POST /api/orgs/profile`: `components/OrgOnboarding.tsx`, `../pawveda-backend/.../OrgProfileController.java`.
- AI (implemented in backend, requires Gemini key)
  - `POST /api/ai/nutri-lens`, `POST /api/ai/play-plan`, `POST /api/ai/activity-tip`, `POST /api/ai/generate-art`: `services/geminiService.ts`, `../pawveda-backend/.../AiController.java`.
  - `GET /api/ai/city-insights`, `GET /api/ai/pet-centres`: `services/geminiService.ts`, `../pawveda-backend/.../AiController.java`.
- Adoption (implemented but in-memory data)
  - `GET /api/adoption/orgs`, `GET /api/adoption/pets`, `POST /api/adoption/applications`: `services/adoptionService.ts`, `../pawveda-backend/.../AdoptionController.java`.
- Feed (implemented but static data)
  - `GET /api/air-quality`, `GET /api/daily-brief`, `GET /api/nearby-services`, `GET /api/pet-events`: `services/feedService.ts`, `../pawveda-backend/.../FeedController.java`.
  - `POST /api/validate-links`: implemented in backend with minimal validation in `../pawveda-backend/.../LinkValidationController.java`.
- Waitlist (implemented but in-memory data)
  - `POST /api/waitlist`: `components/LandingPage.tsx`, `../pawveda-backend/.../WaitlistController.java`.

## 5) Data Persistence and State
- Supabase schema exists for core auth/profile tables; see `Project Completion Kit/SUPABASE_SCHEMA.md`.
- User state stored in localStorage: `lib/storage.ts`, `lib/auth.ts`.
- Reminders and checklists stored in localStorage: `components/Dashboard.tsx`.
- Activity logs are client-only, stored in user state: `components/Dashboard.tsx`, `types.ts`.

## 6) Incomplete Areas (MVP Gaps)
- Backend exists but some services remain placeholders.
  - Feed and link validation are still static/minimal in `../pawveda-backend/.../FeedService.java`, `../pawveda-backend/.../LinkValidationService.java`.
- Auth and profiles are implemented with Flyway migrations in place.
  - Core schema is now versioned via `../pawveda-backend/src/main/resources/db/migration/V2__bootstrap_core_schema.sql`.
- AI endpoints are implemented but require a Gemini key and safety hardening.
  - `../pawveda-backend/.../AiService.java`, `../pawveda-backend/.../GeminiClient.java`.
- Payments and premium entitlements are UI-only.
  - Credits and upgrades are local state in `components/Dashboard.tsx`.
- Notifications and support are UI-only.
  - Support form in `components/Dashboard.tsx` has no backend endpoint.
- NGO flow is minimal.
  - No NGO dashboard for listing management or application review.
- Secrets are currently embedded in backend config.
  - Move DB and AI keys to environment variables and rotate compromised keys.

## 7) External Dependencies (current/expected)
- Database: Supabase Postgres configured in `../pawveda-backend/src/main/resources/application.properties`.
- AI inference: Gemini via `../pawveda-backend/.../GeminiClient.java`.
- Payments: Razorpay planned but not implemented.
- Legacy feed aggregation exists in `server/validate-links.js` but is not used by the Spring Boot backend.

## 8) MVP Completion Definition (pragmatic)
- Pet parent can sign up, onboard, and see a personalized dashboard with real data.
- AI endpoints return real responses with basic safety controls.
- Adoption applications are stored and retrievable.
- Credits and premium state are server-authoritative.
- Waitlist and support submissions persist and are viewable by admins.

## 8.1) MVP Scope Reset (must-have vs later)
Must-have for the next release:
- Clean onboarding and pet profile (basic + health + meds + vaccines + photo).
- Daily/weekly check-in, symptom logging, and reminders.
- Triage + vet brief with export.
- Auth with email verification + password reset.
- Media storage with thumbnails.

Defer until retention is proven:
- Studio, play plan, activity tip AI.
- Community posting and advanced adoption workflows.
- Complex analytics dashboards and premium tiers.

## 9) Decisions Required Before Build
- Confirm Spring Boot + Supabase stays the chosen backend stack.
- Decide whether to port `server/validate-links.js` logic into the backend or retire it.
- Choose payment and notification providers (Razorpay, email/WhatsApp).
- Define what NGO admin capabilities are in MVP scope.

## 10) Next Steps (start here each session)
- [ ] Pick a single vertical slice and complete end-to-end (UI + API + storage).
- [ ] Track outcomes against the North Star metrics (activation, trust, value).
- [ ] Remove or hide non-core dashboard modules until core loop is polished.
- [ ] Re-run smoke test for auth + profile + check-in after each backend change.
