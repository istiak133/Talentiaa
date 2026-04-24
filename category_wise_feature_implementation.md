# Category-Wise Feature Capability and Implementation Guide

## Scope Lock

S_DB Pass: snPH%9$G5V_,-x/
এই ফাইলে শুধু নিচের features include করা হয়েছে:
1. Multi-Role System and Secure Authentication
2. Smart Job Posting
3. Public Job Board
4. Candidate Application Flow and CV Upload
5. AI Resume Parsing
6. AI Match Scoring and Ranking
7. Structured Hiring Pipeline
8. Kanban and List-Based Tracking with Advanced Search and Filters
9. Automated Email Alerts and In-App Notifications
10. Recruiter and Admin Analytics Dashboard

Out of scope:
1. MCQ
2. Coding Platform
3. Video Call

---

## Candidate: Full Capability List (What Candidate Can Do)

1. Candidate account create করতে পারবে email/password দিয়ে।
Tech Stack: React, React Hook Form, Zod, Express, MongoDB, Argon2.
Implementation Flow: Signup form submit -> POST /auth/register -> user status pending verify -> verification mail পাঠানো -> verify endpoint hit -> status active.

2. Candidate Google OAuth দিয়ে signup/login করতে পারবে।
Tech Stack: Passport Google OAuth, Express, JWT token service.
Implementation Flow: Google auth শুরু -> callback -> email verified profile -> user create বা login -> session cookie issue.

3. Candidate email verify না করলে dashboard access পাবে না।
Tech Stack: Email token service, Redis optional for token blacklist, MongoDB token fields.
Implementation Flow: verify flag false থাকলে protected route deny -> verify link success হলে allow.

4. Candidate secure login/logout করতে পারবে এবং session maintain হবে।
Tech Stack: JWT access token, refresh token rotation, HttpOnly Secure cookies.
Implementation Flow: login -> access+refresh issue -> refresh endpoint via cookie -> logout করলে refresh invalidate.

5. Candidate public job board থেকে jobs browse করতে পারবে login ছাড়া।
Tech Stack: React + TanStack Query, Express query API, Mongo indexes.
Implementation Flow: GET /public/jobs with query params -> paginated results render.

6. Candidate keyword search এবং filters apply করতে পারবে job board এ।
Tech Stack: Debounced search in frontend, URL query sync, MongoDB indexed filtering.
Implementation Flow: user input -> 300ms debounce -> API query update -> URL update -> filtered list show.

7. Candidate job details split view এ দেখতে পারবে page reload ছাড়া।
Tech Stack: React Router state, drawer/panel component.
Implementation Flow: card click -> route state update -> right panel details fetch -> quick compare support.

8. Candidate Apply Now click করলে auth gate হবে এবং login শেষে same job এ back আসবে।
Tech Stack: React Router redirect state, auth middleware.
Implementation Flow: unauth apply -> redirect /login?next=jobId -> auth success -> navigate back job details.

9. Candidate saved profile থাকলে one-click apply করতে পারবে।
Tech Stack: Application API, profile snapshot logic.
Implementation Flow: apply with saved profile -> duplicate check -> create application -> confirmation.

10. Candidate নতুন CV upload করে apply করতে পারবে (PDF/DOC)।
Tech Stack: Presigned upload, Cloudinary/S3-compatible storage, Multer alternative for metadata.
Implementation Flow: request presign -> direct upload -> upload progress -> resume metadata save.

11. Candidate CV upload চলার সময় form fill continue করতে পারবে।
Tech Stack: Async upload + parallel UI state.
Implementation Flow: upload promise চলবে background এ -> info form editable -> final submit checks upload complete.

12. Candidate auto-filled basic info verify/edit করতে পারবে submit এর আগে।
Tech Stack: Resume parsing output binding, controlled forms.
Implementation Flow: parse result আসে -> fields prefill -> candidate edit -> save to profile snapshot.

13. Candidate optional LinkedIn, Portfolio, GitHub add করতে পারবে।
Tech Stack: CandidateProfile model, URL validation.
Implementation Flow: optional fields schema validation -> application/profile save.

14. Candidate optional cover letter submit করতে পারবে।
Tech Stack: Rich text editor, sanitized HTML storage.
Implementation Flow: cover letter input sanitize -> store in application document.

15. Candidate duplicate apply করতে পারবে না একই job এ।
Tech Stack: Mongo unique compound index (jobId + candidateId), guard service.
Implementation Flow: application create time duplicate check -> exists হলে Already Applied response.

16. Candidate deadline পার হয়ে গেলে apply করতে পারবে না।
Tech Stack: Deadline validation in backend + UI state disable.
Implementation Flow: job deadline compare current time -> block API + disabled CTA.

17. Candidate application submit confirmation screen পাবে এবং email পাবে।
Tech Stack: Notification queue (BullMQ), email provider (Brevo/Resend).
Implementation Flow: application.created event -> queue -> email template render -> send -> status update.

18. Candidate dashboard থেকে নিজের application list এবং stage status দেখতে পারবে।
Tech Stack: Protected candidate API, status timeline component.
Implementation Flow: GET /candidate/applications -> show stage + updated time + decision.

19. Candidate নিজের parsed profile review/edit করতে পারবে।
Tech Stack: CandidateProfile API, parse merge strategy.
Implementation Flow: parsed fields আসে -> candidate edits -> approved profile save.

20. Candidate নিজের score overall দেখতে পারবে (breakdown না)।
Tech Stack: Response shaping service.
Implementation Flow: recruiter/admin full score receive করবে, candidate response only overallScore.

21. Candidate notification preference manage করতে পারবে optional emails এর জন্য।
Tech Stack: NotificationPreference model, preference-aware dispatch service.
Implementation Flow: candidate toggle -> save preference -> optional mails respect preference.

22. Candidate personal summary analytics দেখতে পারবে (নিজের applications count and status spread)।
Tech Stack: Lightweight aggregation endpoints.
Implementation Flow: candidate-only analytics API -> own data only aggregate -> dashboard card render.

---

## Recruiter: Full Capability List (What Recruiter Can Do)

1. Recruiter self-register করতে পারবে না, invite link ছাড়া onboarding হবে না।
Tech Stack: RecruiterInvite model, invite token hash, expiry logic.
Implementation Flow: admin invite -> token mail -> accept -> password set/OAuth.

2. Recruiter invited email দিয়ে password set বা Google OAuth করতে পারবে।
Tech Stack: Invite-bound OAuth policy, Auth controller.
Implementation Flow: OAuth callback email match with pending invite -> allow; mismatch হলে deny.

3. Recruiter secure login/logout, remember me session ব্যবহার করতে পারবে।
Tech Stack: JWT + refresh rotation + HttpOnly cookies.
Implementation Flow: login -> token issue; remember me true হলে 30d refresh TTL.

4. Recruiter step-by-step smart job posting করতে পারবে।
Tech Stack: React multi-step form, draft autosave API.
Implementation Flow: each step save -> validation -> preview -> publish.

5. Recruiter job title দিলে AI skill suggestions পাবে।
Tech Stack: JobAIAssistService + provider abstraction.
Implementation Flow: title input -> AI suggestion API -> suggested skills list -> recruiter Keep বা Discard.

6. Recruiter AI generated JD পাবে title+skills থেকে।
Tech Stack: Free AI provider (Gemini/Groq), prompt templates.
Implementation Flow: Generate JD click -> AI response -> recruiter Keep/Edit/Replace with manual.

7. Recruiter jobType, workplaceType, salary visibility, experience level সেট করতে পারবে।
Tech Stack: Job schema with normalized enums.
Implementation Flow: structured fields save -> public board and filters consume these fields.

8. Recruiter application deadline এবং hiring count define করতে পারবে।
Tech Stack: Job model validation.
Implementation Flow: publish validation checks mandatory fields + deadline rules.

9. Recruiter AI match threshold set করতে পারবে per job।
Tech Stack: Job scoringConfig and threshold fields.
Implementation Flow: threshold save -> applications scored -> below threshold routed hidden pool.

10. Recruiter scoring weights configure করতে পারবে first application এর আগে।
Tech Stack: scoringConfig + scoringVersion.
Implementation Flow: config editable until first app; lock afterwards; update requires version bump and recalc action.

11. Recruiter jobs publish, pause, close করতে পারবে lifecycle অনুযায়ী।
Tech Stack: Job status transitions in controller.
Implementation Flow: status action API -> activity log -> board visibility update.

12. Recruiter public board preview থেকে job quality check করতে পারবে।
Tech Stack: Shared public rendering + recruiter preview mode.
Implementation Flow: recruiter preview route -> same candidate-facing card/details UI.

13. Recruiter candidate ranked list score অনুযায়ী দেখতে পারবে।
Tech Stack: MatchScoringService, sorting queries.
Implementation Flow: ranked API -> score desc order -> pagination.

14. Recruiter full score explanation দেখতে পারবে।
Tech Stack: ScoreExplanationService.
Implementation Flow: explanation payload includes matched skills, missing skills, weight contribution.

15. Recruiter hidden pool এ থাকা candidate recover করতে পারবে।
Tech Stack: application hiddenPoolFlag and stage routing service.
Implementation Flow: recover action -> hidden false -> move to REVIEW stage -> notify candidate.

16. Recruiter candidate pipeline Kanban view use করতে পারবে।
Tech Stack: dnd-kit, Socket.IO, stage APIs.
Implementation Flow: drag card -> PATCH stage -> version check -> update -> broadcast realtime.

17. Recruiter একই pipeline List view use করতে পারবে sortable table সহ।
Tech Stack: TanStack Table.
Implementation Flow: table API with server sorting/pagination -> actions inline.

18. Recruiter bulk action নিতে পারবে (move/reject multiple candidates)।
Tech Stack: Bulk endpoint + transactional guard.
Implementation Flow: selected ids -> bulk validate -> stage update -> logs and notifications.

19. Recruiter candidate note add করতে পারবে stage wise।
Tech Stack: Application notes subdocument.
Implementation Flow: add note endpoint -> note timestamp + author save.

20. Recruiter advanced search/filter করতে পারবে alias, skills, score, stage, experience দিয়ে।
Tech Stack: SearchService, indexed fields, query parser.
Implementation Flow: filter params -> query builder -> paginated result.

21. Recruiter saved filters তৈরি করে reuse করতে পারবে।
Tech Stack: SavedFilter model.
Implementation Flow: current filter state save with name -> later load/apply.

22. Recruiter candidate email/phone দিয়ে search করতে পারবে না।
Tech Stack: API-level response masking and query allowlist.
Implementation Flow: forbidden keys in recruiter query rejected; PII omitted in response.

23. Recruiter new application, high score alert, deadline reminder notification পাবে।
Tech Stack: Event map + notification queue.
Implementation Flow: events -> queue -> in-app + optional email dispatch.

24. Recruiter optional digest preferences সেট করতে পারবে।
Tech Stack: NotificationPreference per recruiter.
Implementation Flow: recruiter toggles digest/high-score alerts -> dispatch service respects settings.

25. Recruiter analytics dashboard ব্যবহার করতে পারবে funnel এবং productivity metrics সহ।
Tech Stack: Aggregation services + Recharts.
Implementation Flow: recruiter scoped analytics API -> cards + funnel + recent activity render.

---

## Admin: Full Capability List (What Admin Can Do)

1. Admin seeded super-admin account দিয়ে platform access পাবে।
Tech Stack: Seed script, role-guarded auth.
Implementation Flow: system bootstrap admin user -> admin login allowed.

2. Admin recruiter invite create করতে পারবে 72-hour expiry সহ।
Tech Stack: RecruiterInvite model with expiresAt, status, usedAt.
Implementation Flow: invite create -> email send -> accept updates status accepted/expired.

3. Admin recruiters active/suspend/reactivate করতে পারবে।
Tech Stack: User status management endpoints.
Implementation Flow: status action -> session revoke optional -> activity log.

4. Admin platform-wide activity logs monitor করতে পারবে।
Tech Stack: ActivityLog model, filtered admin queries.
Implementation Flow: critical events লিখা -> admin dashboard audit list.

5. Admin job moderation করতে পারবে (pause/unpublish policy violation)।
Tech Stack: AdminJobModerationController.
Implementation Flow: flagged job review -> moderation action -> job status update.

6. Admin parsing health monitor করতে পারবে provider success/failure সহ।
Tech Stack: ParsingJob metrics, provider tags.
Implementation Flow: parsing jobs aggregated -> failure causes visible.

7. Admin scoring audit করতে পারবে config changes এবং version history সহ।
Tech Stack: Activity logs + job scoringVersion fields.
Implementation Flow: config change logs -> admin audit page.

8. Admin pipeline anomaly monitor করতে পারবে (invalid jump attempts etc.)।
Tech Stack: PipelineAuditService.
Implementation Flow: transition attempts logged -> suspicious patterns highlighted.

9. Admin email templates manage করতে পারবে।
Tech Stack: EmailTemplate model + template editor UI.
Implementation Flow: template fetch/edit/save -> versioned templates.

10. Admin failed notification/email retry trigger করতে পারবে।
Tech Stack: BullMQ retry and dead-letter handling.
Implementation Flow: failed jobs list -> admin retry action -> requeue.

11. Admin transactional email policy enforce করতে পারবে।
Tech Stack: Notification policy service.
Implementation Flow: transactional templates forced delivery; optional mails preference-aware.

12. Admin preference override rules set করতে পারবে।
Tech Stack: Notification preference policy matrix.
Implementation Flow: admin role has no optional preference for mandatory alerts; system enforces mandatory sends.

13. Admin platform analytics dashboard দেখতে পারবে।
Tech Stack: AdminAnalyticsController + aggregation services.
Implementation Flow: platform metrics API -> cards and charts.

14. Admin recruiter performance compare করতে পারবে।
Tech Stack: RecruiterPerformanceService.
Implementation Flow: recruiter-wise aggregates -> sortable table.

15. Admin analytics export নিতে পারবে CSV/XLSX format এ।
Tech Stack: Export service + stream response.
Implementation Flow: date-range query -> report generation -> file download.

16. Admin KPI definitions lock করতে পারবে release এর আগে।
Tech Stack: Platform settings model.
Implementation Flow: KPI config freeze -> analytics services use fixed definitions.

17. Admin security posture monitor করতে পারবে (suspicious login, token misuse indicators)।
Tech Stack: AuthRiskService logs + admin security widgets.
Implementation Flow: risk events লিখা -> admin alerts panel.

18. Admin privacy compliance monitor করতে পারবে (PII exposure checks)।
Tech Stack: Response masking tests + audit checks.
Implementation Flow: scheduled audit checks -> mismatch alerts.

---

## Feature-Wise Tech Stack and Implementation (System View)

1. Multi-Role Auth and Secure Access
Tech Stack: React, Express, Passport Google, JWT, Argon2, HttpOnly cookies, MongoDB.
How to Implement: role-aware signup/invite flow -> verification -> token/session management -> protected route guards -> audit logging.

2. Smart Job Posting with AI Assistance
Tech Stack: React multi-step form, Job model, AI provider abstraction service.
How to Implement: recruiter step form -> title-based skill suggestion -> AI JD generation -> keep/edit/manual override -> status draft/published lifecycle.

3. Public Job Board
Tech Stack: React query, debounced search, URL state sync, Mongo indexed filtering.
How to Implement: public endpoints with pagination and filters -> split-view UI -> apply auth redirect-back.

4. Application and CV Upload
Tech Stack: Presigned upload, cloud storage, Application and Resume models.
How to Implement: upload token endpoint -> direct file upload -> metadata save -> one-click apply or new CV path -> duplicate/deadline guard.

5. AI Resume Parsing
Tech Stack: pdf-parse, mammoth, Gemini/Groq free tier, fallback parser, ParsingJob model.
How to Implement: enqueue parse task -> provider parse -> confidence + normalized fields -> candidate correction flow -> profile update.

6. Match Scoring and Ranking
Tech Stack: Scoring service, weighted formula engine, explanation service.
How to Implement: compute skill/experience/education score -> store overall and breakdown -> apply threshold -> hidden pool routing -> ranked retrieval.

7. Structured Pipeline
Tech Stack: Application stage machine, dnd-kit, Socket.IO, optimistic concurrency.
How to Implement: canonical stage transition rules -> drag/list actions -> version check -> update + logs + notifications.

8. Advanced Search and Filters
Tech Stack: query builder service, SavedFilter model, indexed fields.
How to Implement: recruiter query allowlist -> alias/skills/stage/score filters -> saved presets -> URL sharable states.

9. Notifications
Tech Stack: BullMQ, Brevo/Resend, in-app notification store, template engine.
How to Implement: event map -> queue processing -> email and in-app dispatch -> retry/idempotency -> preference rules.

10. Analytics
Tech Stack: Aggregation pipeline, Recharts, export service.
How to Implement: track defined events -> aggregate recruiter/admin metrics -> render dashboards -> export reports.

---

## Final Implementation Sequence (Which Feature After Which)

1. Multi-Role System and Secure Authentication
Reason: role guards and session security ছাড়া অন্য feature safe ভাবে চালু করা যাবে না।

2. Smart Job Posting
Reason: job entity না থাকলে public board এবং applications flow শুরু করা যাবে না।

3. Public Job Board
Reason: candidate discovery and apply entry point establish করতে হবে।

4. Candidate Application Flow and CV Upload
Reason: inbound candidate data pipeline build করার জন্য this is the first operational core.

5. AI Resume Parsing
Reason: application data enrich করে scoring-ready profile তৈরি করতে হবে।

6. AI Match Scoring and Ranking
Reason: recruiter prioritization workflow চালু করতে parsed data দরকার, তাই parsing এর পর।

7. Structured Hiring Pipeline
Reason: scored candidates কে stage-wise process করার core ATS layer।

8. Kanban/List Tracking with Advanced Search and Filters
Reason: pipeline usability, scale handling, productivity optimization।

9. Notifications (Email and In-App)
Reason: stage/status events already defined হলে communication automation reliable হয়।

10. Analytics Dashboard
Reason: upstream events, pipeline data, notification states stable হওয়ার পর accurate analytics পাওয়া যায়।

---

## Release-Readiness Checklist
1. Recruiter invite ছাড়া recruiter onboarding blocked.
2. Session TTL and remember me rules verified.
3. jobType/workplaceType filter correctness verified.
4. Hidden pool does not trigger auto rejection email.
5. Recruiter responses never expose candidate PII.
6. Stage transition matrix blocks invalid moves.
7. Concurrent stage update returns 409 and UI refresh prompt.
8. Score versioning and explanation behave as designed.
9. Notification queue retry and dead-letter flow tested.
10. Recruiter and admin analytics values consistent.
11. Parsing accuracy on validation CV set 80 percent or higher.
12. Email deliverability tested for inbox and spam outcomes.
13. Realtime sync tested with at least two browsers simultaneously.
14. Deterministic scoring validated with repeated same inputs.
15. Mobile responsiveness tested on iOS Safari and Android Chrome.
