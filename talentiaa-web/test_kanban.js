import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testKanban() {
  const { data: jobs, error: err1 } = await supabase.from('jobs').select('id, title, recruiter_id').limit(1);
  if (err1 || !jobs.length) {
    console.log("No jobs found.");
    return;
  }
  const job = jobs[0];
  console.log(`Job found: ${job.title} (ID: ${job.id})`);

  const { data: apps, error: err2 } = await supabase.from('applications').select('id, current_stage').eq('job_id', job.id);
  
  if (err2) {
    console.log("Error fetching applications:", err2);
    return;
  }
  
  if (!apps.length) {
    console.log("No applications found for this job.");
    return;
  }
  
  console.log("Applications before update:", apps);
  
  // Test stage update
  const appToUpdate = apps[0];
  const newStage = appToUpdate.current_stage === 'REVIEW' ? 'INTERVIEW' : 'REVIEW';
  
  console.log(`Attempting to update application ${appToUpdate.id} to ${newStage}...`);
  
  // Notice: using ANON key. RLS might block this if not authenticated. We need to check if the policy allows recruiter updates.
  const { data: updateData, error: err3 } = await supabase
    .from('applications')
    .update({ current_stage: newStage })
    .eq('id', appToUpdate.id)
    .select();
    
  if (err3) {
    console.log("Update failed (likely RLS):", err3.message);
  } else {
    console.log("Update succeeded:", updateData);
  }
}
testKanban();
