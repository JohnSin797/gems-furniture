import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://zdktmnzetynreahdpjim.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpka3RtbnpldHlucmVhaGRwamltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzkxOTYsImV4cCI6MjA3MTg1NTE5Nn0.LIHb2ksu58zLyHjs3axx-rglGSzbfWZyJuQbf8bpPkg";

// ✅ Stable Supabase client with persistent auth and tab sync
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,     // 👈 ensures session restores correctly after reload
    storageKey: "supabase.auth.token", // 👈 consistent key across tabs
  },
});
