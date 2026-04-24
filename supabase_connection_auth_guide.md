# Supabase Connection + Role Based Login (MVP)

Use this flow to make your database working with role-based authentication.

## 1) Supabase project credentials

From Supabase Dashboard:
- Project URL
- anon public key
- service role key (backend only, never frontend)

## 2) Run SQL bootstrap

Run this file in Supabase SQL Editor after schema:
- supabase_auth_bootstrap.sql

## 3) Install client SDK

For frontend (React):

    npm install @supabase/supabase-js

For backend (Node/Express):

    npm install @supabase/supabase-js dotenv

## 4) Environment variables

Frontend env example:

    VITE_SUPABASE_URL=YOUR_PROJECT_URL
    VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

Backend env example:

    SUPABASE_URL=YOUR_PROJECT_URL
    SUPABASE_ANON_KEY=YOUR_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

## 5) Frontend connection

    import { createClient } from '@supabase/supabase-js';

    export const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );

## 6) Signup (candidate default)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

## 7) Login + role read

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) throw signInError;

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, full_name, account_status')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // role-based route
    if (profile.role === 'admin') {
      // go /admin
    } else if (profile.role === 'recruiter') {
      // go /recruiter
    } else {
      // go /candidate
    }

## 8) Promote recruiter/admin (from admin account)

After user signs up as candidate, admin can promote role:

    select public.admin_set_user_role(
      'USER_UUID_HERE',
      'recruiter',
      'active'
    );

or

    select public.admin_set_user_role(
      'USER_UUID_HERE',
      'admin',
      'active'
    );

## 9) Smoke test checklist

- User can sign up and login
- Row auto-created in public.users with same id as auth.users
- Candidate sees only own user row
- Admin can read all user rows
- Non-admin cannot change role/account_status

## 10) Very important security rules

- Use anon key only in frontend.
- Use service role key only in backend server.
- Never expose service role key to browser.
