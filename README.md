# Talentiaa

**Talentiaa** is an AI-assisted recruitment platform that connects **candidates**, **recruiters**, and **admins** in a single workflow — from public job discovery to CV upload, AI-powered resume matching, and a structured hiring pipeline.

The platform is built as a modern single-page application (`talentiaa-web/`) backed by **Supabase** (Postgres, Auth, Storage, Row-Level Security) and uses **Groq (Llama 3.3 70B)** for AI resume parsing, job-description generation, and candidate–job match scoring.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

Talentiaa streamlines hiring for three roles:

| Role | What they can do |
|---|---|
| **Candidate** | Browse public job listings, apply with CV upload, get AI-parsed profile auto-fill, track application status across the hiring pipeline, and manage notification preferences. |
| **Recruiter** | Post jobs (with AI-assisted job-description generation), review applicants ranked by AI match score, move candidates through a Kanban-style hiring pipeline, and manage notes/filters. |
| **Admin** | Approve/verify recruiter accounts, oversee all users and jobs, and monitor platform-wide analytics. |

## Key Features

- 🔐 **Role-based authentication** — email/password and Google OAuth via Supabase Auth, with email verification and account-status gating (`pending` / `active` / `suspended` / `rejected`).
- 📋 **Public job board** — searchable, filterable job listings, viewable without login.
- 📄 **CV upload & AI resume parsing** — candidates upload a PDF/DOC resume; text is extracted (`pdfjs-dist`) and parsed to auto-fill profile fields.
- 🤖 **AI match scoring** — Groq LLM scores each application against the job description and required skills, producing an overall score plus a skills/experience/education breakdown.
- 🧩 **AI job-post generation** — recruiters can generate a full job description, required skills, and metadata from just a job title.
- 🗂️ **Kanban hiring pipeline** — drag-and-drop applicant tracking across pipeline stages (`review → interview → offer → hired / rejected`) via `@dnd-kit`.
- 🔔 **Notifications** — in-app and email notifications (via EmailJS) for application and pipeline events, with per-user notification preferences.
- 📊 **Analytics dashboards** — recruiter and admin dashboards with charts (`recharts`) summarizing jobs, applications, and pipeline health.
- 🛡️ **Row-Level Security** — Postgres RLS policies enforce per-role data access directly at the database layer.

## Tech Stack

**Frontend**
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool & dev server
- [React Router v7](https://reactrouter.com/) — routing
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — forms & validation
- [@dnd-kit](https://dndkit.com/) — Kanban drag-and-drop
- [Recharts](https://recharts.org/) — analytics charts
- [Lucide React](https://lucide.dev/) — icons
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) — client-side PDF text extraction

**Backend / Infrastructure**
- [Supabase](https://supabase.com/) — Postgres database, Auth (email + Google OAuth), Storage, and Row-Level Security policies
- [Groq API](https://groq.com/) (Llama 3.3 70B) — AI resume parsing, match scoring, and job-post generation
- [EmailJS](https://www.emailjs.com/) — transactional email notifications
- [Vercel](https://vercel.com/) — hosting/deployment (SPA rewrites configured in `vercel.json`)

## Project Structure

```
Talentiaa/
├── talentiaa-web/                 # React + Vite frontend application
│   ├── src/
│   │   ├── components/            # Shared UI (KanbanBoard, NotificationBell, ProtectedRoute, ErrorBoundary, ...)
│   │   ├── contexts/               # AuthContext — session, role, and account-status handling
│   │   ├── hooks/                  # Custom hooks (e.g. usePageTitle)
│   │   ├── lib/                    # supabase.ts (client), groq.ts (AI calls)
│   │   ├── pages/
│   │   │   ├── auth/                # Login, Signup, Admin login, Email verification, OAuth callback
│   │   │   ├── public/              # Public job board
│   │   │   ├── candidate/           # Profile, Apply flow, Notification preferences
│   │   │   ├── recruiter/           # Job creation
│   │   │   └── dashboard/           # Candidate / Recruiter / Admin dashboards
│   │   ├── types/                  # Shared TypeScript types (database.ts)
│   │   ├── App.tsx                 # Route definitions
│   │   └── main.tsx                # App entry point
│   ├── public/                    # Static assets
│   ├── vercel.json                 # SPA rewrite rules for deployment
│   └── package.json
│
├── talentiaa_schema.sql            # Core Postgres schema (tables, enums, indexes)
├── setup_database.sql              # One-shot Supabase SQL editor setup script
├── *_policies.sql                  # Row-Level Security policies (applications, jobs, notifications, ...)
├── fix_*.sql / update_trigger.sql  # Incremental DB fixes & triggers
├── supabase_connection_auth_guide.md  # Supabase + role-based auth integration guide
├── category_wise_feature_implementation.md  # Full feature-by-feature capability spec (candidate/recruiter/admin)
└── README.md
```

## Database Schema

The Postgres schema (`talentiaa_schema.sql`) models the full hiring workflow:

- **`users`** — profile data + `role` (`admin` / `recruiter` / `candidate`) + `account_status`
- **`recruiter_invites`** — invite-only recruiter onboarding
- **`jobs`** — postings with type, workplace mode, salary, required skills, scoring config, and status
- **`candidate_profiles`** — parsed/edited candidate profile data
- **`resumes`** / **`parsing_jobs`** — uploaded CVs and their AI-parsing status
- **`applications`** / **`application_stage_history`** / **`application_notes`** — the hiring pipeline and audit trail
- **`saved_filters`** — recruiter search presets
- **`notifications`** / **`notification_preferences`** — in-app/email delivery and opt-in preferences
- **`email_templates`**, **`activity_logs`**, **`analytics_events`**, **`analytics_snapshots`** — messaging, auditing, and analytics

All tables are indexed for common access patterns (role/status, job/stage/score, GIN indexes on skill arrays, etc.) and protected by RLS policies defined in the accompanying `*_policies.sql` files.

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project
- API keys for Groq (and optionally EmailJS) for AI/notification features

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/istiak133/Talentiaa.git
cd Talentiaa

# 2. Set up the database
# In the Supabase SQL editor, run in order:
#   talentiaa_schema.sql  →  setup_database.sql  →  the *_policies.sql files

# 3. Install frontend dependencies
cd talentiaa-web
npm install

# 4. Configure environment variables (see below), then start the dev server
npm run dev
```

## Environment Variables

Create a `.env` file inside `talentiaa-web/`:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI (resume parsing, match scoring, job-post generation)
VITE_GROQ_API_KEY=your_groq_api_key

# Email notifications
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_TEMPLATE_ID=your_emailjs_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
```

> ⚠️ **Note:** `VITE_`-prefixed variables are bundled into client-side JavaScript and are visible in the browser. For production, proxy AI calls (Groq) through a Supabase Edge Function or backend service so API keys stay server-side.

## Available Scripts

Run from `talentiaa-web/`:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Deployment

The app is configured for [Vercel](https://vercel.com/) with SPA routing rewrites (`talentiaa-web/vercel.json`), so all routes fall back to `index.html` for client-side routing to work correctly.

## Documentation

Further project documentation lives at the repository root:

- [`category_wise_feature_implementation.md`](category_wise_feature_implementation.md) — full capability spec by feature and role
- [`supabase_connection_auth_guide.md`](supabase_connection_auth_guide.md) — Supabase connection & role-based auth guide
- [`talentiaa_schema.sql`](talentiaa_schema.sql) — full database schema
- [`database_analysis.md.resolved`](database_analysis.md.resolved) — database design analysis