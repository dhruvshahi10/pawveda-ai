# Triage + Vet-Brief Revamp Roadmap

This plan applies the chosen options:
- Triage storage: new `triage_sessions` table + endpoints.
- Payment: manual payment link + unlock flag.
- Brief export: client-side PDF now, server-generated PDF next.

## Phase 0: Positioning + Navigation (1-2 days)
Goal: make triage the primary action without removing Adoption Hub or Community.

Changes:
- Update landing CTA copy to "Triage now: get a clear next step in 2 minutes."
- Add a "Triage" primary CTA above the fold.
- Simplify dashboard nav to: Triage, Briefs/Records, Community, Adoption, Profile.
- Demote non-wedge features from primary navigation.

Files:
- `components/LandingPage.tsx`
- `components/Dashboard.tsx`
- `components/SEO.tsx` (if messaging is duplicated)

## Phase 1: Data Model + API (2-3 days)
Goal: capture triage sessions cleanly and link to pet profiles.

Backend:
- Add migration: `triage_sessions` table (pet_id, user_id, payload_json, outcome, urgency, paid_status, created_at).
- Add endpoints:
  - `POST /api/triage/sessions`
  - `GET /api/triage/sessions?petId=...`

Files:
- `/Users/dhruvshahi_07/pawveda-backend/src/main/resources/db/migration/V7__triage_sessions.sql`
- `/Users/dhruvshahi_07/pawveda-backend/src/main/java/com/pawveda/backend/adapters/web/TriageController.java`
- `/Users/dhruvshahi_07/pawveda-backend/src/main/java/com/pawveda/backend/adapters/web/TriageService.java`
- `/Users/dhruvshahi_07/pawveda-backend/src/main/java/com/pawveda/backend/adapters/persistence/entity/TriageSessionEntity.java`
- `/Users/dhruvshahi_07/pawveda-backend/src/main/java/com/pawveda/backend/adapters/persistence/repository/TriageSessionJpaRepository.java`

Frontend:
- Add `services/triageService.ts` for new endpoints.
- Add triage session type in `types.ts`.

Files:
- `services/triageService.ts`
- `types.ts`

## Phase 2: Triage Flow + Outcome (2-4 days)
Goal: 2-minute triage intake with clear outcome.

Changes:
- Repurpose care request modal into a structured triage flow.
- Add a rule-based classifier:
  - Emergency / Visit soon / Monitor + home care.
- Save triage session and show outcome screen with next steps.
- Add option to attach a photo (optional, stored as base64 in session payload for now).

Files:
- `components/Dashboard.tsx`
- `lib/triageRules.ts`
- `services/triageService.ts`

## Phase 3: Vet-Brief Generator (2-3 days)
Goal: generate a vet-ready brief from existing logs + triage.

Changes:
- New Vet Brief view:
  - Pet profile summary
  - Latest triage outcome + symptoms
  - Timeline: symptoms, meds, medical events, recent diet/activity/weight
  - Allergies, current meds, last vet visit
- Add client-side "Export PDF."
- Add "Share link" stub for next phase.

Files:
- `components/VetBrief.tsx` (new)
- `components/Dashboard.tsx`
- `types.ts`

## Phase 4: Paid Validation (1-2 days)
Goal: test willingness to pay with minimal engineering.

Changes:
- Add payment gate before showing full vet-brief.
- Use manual payment link + simple unlock flow.
- Store `paid_status` on the triage session.
- Track funnel: start -> complete -> pay -> brief export.

Files:
- `components/Dashboard.tsx`
- `services/triageService.ts`
- `/Users/dhruvshahi_07/pawveda-backend/.../TriageService.java` (mark paid)

## Phase 5: Server PDF + Share Link (2-4 days)
Goal: clean sharing to vets and multi-device access.

Changes:
- Add server endpoint to generate PDF:
  - `POST /api/triage/briefs/{sessionId}/pdf`
- Store PDF or regenerate on demand.
- Shareable tokenized link.

Files:
- `/Users/dhruvshahi_07/pawveda-backend/.../TriageController.java`
- `/Users/dhruvshahi_07/pawveda-backend/.../TriageService.java`
- `components/VetBrief.tsx`

## Phase 6: Onboarding Additions (1-2 days)
Goal: strengthen brief quality with minimal friction.

Add fields:
- Existing conditions (free-text or tags)
- Current meds (list)
- Last vet visit date
- Primary vet contact (name + phone)
- Emergency contact (optional)

Files:
- `components/Onboarding.tsx`
- `types.ts`
- `/Users/dhruvshahi_07/pawveda-backend/.../PetProfile*`
- DB migration for new columns

## Keep / De-emphasize / Remove

Keep:
- Adoption Hub (unchanged).
- Community/forum (read-only for now).

De-emphasize:
- Daily brief, safety radar, micro-tips (supportive, not primary).

Remove:
- Studio (AI pet image generation).
- Play plan + activity tip AI.
- Credits-based gating.

## Monetization Alignment
- Paid wedge: triage + vet-brief.
- Future: subscription for records + reminders, B2B clinic intake.
