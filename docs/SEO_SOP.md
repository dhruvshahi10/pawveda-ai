# PawVeda SEO Upgrade — Execution SOP
Version: v1.2 (Aligned to Current LandingPage.tsx)
Executor: Codex
Status: Pre-deployment
Research: COMPLETE

---

## OBJECTIVE

Finalize PawVeda landing page SEO without altering UI, UX, or product logic.

This SOP applies to the CURRENT LandingPage.tsx as provided.

---

## FILES IN SCOPE

- components/LandingPage.tsx (NO content changes)
- index.html OR App-level Head file (MODIFY)
- docs/SEO_CHANGES.md (reference)
- docs/SEO_CHANGELOG.md (update)

---

## STRICT RULES

Codex MUST NOT:
- Change copy inside LandingPage.tsx
- Modify animations or layout
- Add tracking, analytics, or scripts
- Add new dependencies

Codex MUST:
- Add SEO metadata at document/head level
- Add structured data
- Preserve current rendering behavior

---

## VALIDATION CHECKLIST

- Exactly ONE <h1> on page
- Title + meta description present
- Canonical URL present (placeholder allowed)
- Open Graph tags present
- JSON-LD Organization schema present
- No visual regression
