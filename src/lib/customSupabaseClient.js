import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nhjhhjnnuulurinpaxcw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oamhoam5udXVsdXJpbnBheGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTg4MzcsImV4cCI6MjA2ODM3NDgzN30.xR0Zs-YIKj-tVqCLEWSoKJaae1YwE5LL8Zeh1RErDE4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);