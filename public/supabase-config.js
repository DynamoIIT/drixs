import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://jtxnjcwnxoluzfrdazcz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eG5qY3dueG9sdXpmcmRhemN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNDg2MDQsImV4cCI6MjA4MTcyNDYwNH0.DXyvXnn1hdkoOr3XYLQP99g4CPHyKkNFFze0-4tdxwo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
