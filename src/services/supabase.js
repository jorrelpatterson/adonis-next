// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://efuxqrvdkrievbpljlaf.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmdXhxcnZka3JpZXZicGxqbGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyNjAsImV4cCI6MjA4ODYxNzI2MH0.68LnOw8EvvTx_UUgHo1cuQ-7WuEre7L46AMyDFNAq30';

export const supabase = createClient(SUPA_URL, SUPA_KEY);
