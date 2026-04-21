// const SUPABASE_URL = 'https://kmcxhjkgbhmsmszecszi.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3hoamtnYmhtc21zemVjc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjE0NDQsImV4cCI6MjA5MTUzNzQ0NH0.MWMHWzrAt6k_LCuGiDy_hHtqpn-UQ1Fo4U1Qa_I9d1A';

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://kmcxhjkgbhmsmszecszi.supabase.co'; // your actual URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3hoamtnYmhtc21zemVjc3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjE0NDQsImV4cCI6MjA5MTUzNzQ0NH0.MWMHWzrAt6k_LCuGiDy_hHtqpn-UQ1Fo4U1Qa_I9d1A';
; // your actual key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});