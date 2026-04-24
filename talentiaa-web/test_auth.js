import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testUserAndProfile() {
  const email = `testuser.talentiaa.${Date.now()}@gmail.com`;
  const password = 'TestPassword123!';
  
  console.log("1. Signing up user:", email);
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'Test Setup User' } }
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }
  
  console.log("✓ Signed up. User ID:", authData.user.id);
  
  console.log("2. Fetching profile from public.users...");
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
    
  if (profileError) {
    console.error("Profile Fetch Error:", profileError);
  } else {
    console.log("✓ Profile Fetched:", profile);
  }
}

testUserAndProfile();
