# PawVeda Implementation Plan (Spring Boot + Supabase)

This plan assumes the backend lives in `../pawveda-backend` and already exposes `/api/*` endpoints. The goal is to turn placeholder logic into production-ready services and align the frontend to a stable, secure backend.

## Revamp Objectives (post-funding reset)
- Reduce cognitive load across all screens; default to visual-first UI with short helper text.
- Anchor the product to one core loop: Onboarding → Pet Profile → Daily/Weekly Check-in → Symptom Signal → Vet Brief.
- Make the dashboard outcome-driven (today's actions + health signals), not feature-driven.
- Complete backend fundamentals first: auth, email verification/reset, media storage, payments, data persistence.
- Treat trust and reliability as product features: transparent logs, stable data, predictable flows.

## Next Steps (start here each session)
- [ ] Confirm the current target: `MVP Core Loop` or `Platform Foundations`.
- [ ] Pull the latest blockers and owners (auth, email, S3, Razorpay, dashboard redesign).
- [ ] Choose one thin vertical slice and finish it end-to-end:
  - Onboarding → Pet profile save → Photo upload → Dashboard summary render.
- [ ] Capture a short demo note in `Project Completion Kit/IMPLEMENTATION_PLAN.md` under "Session Notes".
- [ ] Update the "Done This Week" list for visible progress.

## Session Notes
- _Keep a running, dated log of what shipped and what is still blocked._

## Done This Week
- _List only completed, user-visible changes or backend merges._

## Assumptions (confirm or edit)
- Frontend stays as-is and uses `VITE_BACKEND_URL` for API calls.
- Backend is Spring Boot + Postgres (Supabase) in `../pawveda-backend`.
- Flyway is enabled; we will add migrations for all core entities.

## Phase 0: Security and Config Cleanup (1 session)
Goal: remove hardcoded secrets and make configuration deploy-safe.

Steps
- [ ] Move DB credentials and Gemini API keys from `../pawveda-backend/src/main/resources/application.properties` into environment variables.
- [ ] Rotate any exposed keys (DB and Gemini).
- [ ] Ensure `JWT_SECRET` (and any refresh secret if added later) are set via env.
- [ ] Confirm `VITE_BACKEND_URL` points to the Spring Boot API.
- [ ] Add env var placeholders for email + S3 + Razorpay to avoid hardcoding later.

Acceptance criteria
- Backend starts without secrets in source control.
- Local dev uses env vars for DB and AI keys.

## Phase 1: Boot and Smoke Test (1 session)
Goal: confirm the existing backend endpoints work end-to-end.

Steps
- [ ] Start Spring Boot locally.
- [ ] Hit these endpoints with a city param:
  - `GET /api/daily-brief?city=Delhi`
  - `GET /api/air-quality?city=Delhi`
  - `GET /api/nearby-services?city=Delhi`
  - `GET /api/pet-events?city=Delhi`
- [ ] Register and login via `/api/auth/register` and `/api/auth/login`.
- [ ] Confirm `GET /api/me` works with the access token.
- [ ] Validate email verification + password reset endpoints (stub responses ok).

Acceptance criteria
- Auth flow works from the frontend.
- Feed endpoints return data (even if static).
- Email verification and reset endpoints are reachable.

## Phase 1.5: Auth + Email Completion (1-2 sessions)
Goal: ship a trustworthy account system with verification and reset.

Steps
- [ ] Implement verification and reset flows in backend + frontend.
- [ ] Add token expiry handling and UI error states.
- [ ] Track verification state on user profile.

Acceptance criteria
- User can verify email, request reset, and complete password update.

## Phase 2: Database Alignment and Migrations (1-2 sessions)
Goal: align the Spring Boot entities with the existing Supabase schema and make migrations reproducible.

Steps
- [ ] Verify the existing Supabase schema in `Project Completion Kit/SUPABASE_SCHEMA.md` matches JPA entities.
- [ ] Add Flyway migrations that reflect the current schema (baseline + delta as needed).
- [ ] Ensure `citext` extension is enabled for `users.email` and `login_audit.email` (if not already).
- [ ] Keep `spring.jpa.hibernate.ddl-auto=validate`.

Acceptance criteria
- A fresh DB can be migrated and the app boots cleanly.
- Existing production schema matches the entity model without manual changes.

## Phase 3: Replace In-Memory Services (2-4 sessions)
Goal: persist adoption and waitlist data.

Steps
- [ ] Create DB tables and repositories for:
  - waitlist_entries
  - adoption_orgs, adoption_pets, adoption_applications
- [ ] Replace in-memory logic in:
  - `../pawveda-backend/.../WaitlistService.java`
  - `../pawveda-backend/.../AdoptionService.java`
- [ ] Add admin-ready endpoints for NGO adoption management (create/update listings, update application status).

Acceptance criteria
- Adoption and waitlist survive restarts and are queryable.

## Phase 3.5: Media Storage + Thumbnails (1-2 sessions)
Goal: enable reliable pet photo uploads with fast loading.

Steps
- [ ] Implement S3 (or compatible) upload flow with presigned URLs.
- [ ] Add thumbnail generation (server or worker).
- [ ] Store original + thumbnail URLs on pet profiles and activity logs.

Acceptance criteria
- Photo uploads succeed and render quickly on dashboard and profile views.

## Phase 4: Feed Data Integration (2-4 sessions)
Goal: replace static feed data with real city-aware feeds.

Steps
- [ ] Decide whether to port `server/validate-links.js` into Spring Boot or run it as a separate service.
- [ ] Implement live data fetching in `../pawveda-backend/.../FeedService.java`.
- [ ] Add caching and rate limiting to avoid API throttling.

Acceptance criteria
- Feed endpoints return real data for supported cities.

## Phase 5: AI Features Hardening (1-3 sessions)
Goal: make AI outputs safe and reliable.

Steps
- [ ] Add safety guardrails and fallbacks to `../pawveda-backend/.../AiService.java`.
- [ ] Log AI requests (without sensitive content) for observability.
- [ ] Add server-side rate limits for AI endpoints.

Acceptance criteria
- AI features work reliably with sensible fallback behavior.

## Phase 6: Credits, Premium, and Payments (2-4 sessions)
Goal: make premium state server-authoritative.

Steps
- [ ] Add tables: subscriptions, user_credits (or entitlements).
- [ ] Implement Razorpay checkout endpoint and webhook handler.
- [ ] Update frontend credit deduction to query the server.
- [ ] Add subscription expiry tracking + grace period handling.

Acceptance criteria
- Premium status and credits persist across sessions and devices.

## Phase 7: Reminders, Activity Logs, and Support (2-3 sessions)
Goal: sync care history across devices and close the support loop.

Steps
- [ ] Add endpoints for reminders and activity logs.
- [ ] Store reminders and activities in DB.
- [ ] Add support ticket endpoint for the Help Center form.

Acceptance criteria
- Reminders and activity logs persist after logout.
- Support submissions are stored and retrievable.

## Phase 8: Feedback + Outcomes Analytics (1-2 sessions)
Goal: capture parent feedback and pet progress updates for trend analysis.

Steps
- [ ] Add tables: parent_feedback, pet_updates.
- [ ] Add API endpoints to submit feedback and pet updates.
- [ ] Backfill existing localStorage pet update history into the DB on first login.
- [ ] Create lightweight analytics queries (weekly NPS, sentiment by feature, weight trend by city/breed).

Acceptance criteria
- Feedback and pet updates are queryable in the DB.
- Weekly trend dashboards can be built from stored data.

## Prompt Chain (Spring Boot aligned)
Use these prompts one phase at a time.

Phase 2 Prompt
"Create Flyway migrations for existing JPA entities (users, auth_identities, refresh_tokens, login_audit, pet_profiles, org_profiles). Provide SQL files and any entity adjustments needed for Spring Boot." 

Phase 3 Prompt
"Implement persistent adoption and waitlist services in Spring Boot with JPA repositories. Replace in-memory storage, add DTOs, and keep API contracts unchanged." 

Phase 4 Prompt
"Port the feed logic from server/validate-links.js into Spring Boot FeedService. Add external API clients, caching, and error fallbacks." 

Phase 5 Prompt
"Harden AiService with safety guardrails, rate limits, and structured logging. Keep the existing Gemini client." 

Phase 6 Prompt
"Add subscription and credit tables plus Razorpay checkout and webhook handlers. Update endpoints to set user tier and credits." 

Phase 7 Prompt
"Add reminder, activity log, and support ticket endpoints with JPA persistence and minimal admin retrieval." 
