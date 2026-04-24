import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
  console.log("Checking public.users table...");
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error("Error reading users:", error);
  else console.log("Users in DB:", data);
}
checkUsers();
