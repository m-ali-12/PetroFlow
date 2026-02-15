// Supabase Configuration
const SUPABASE_URL = 'https://ycoxgzplqkqqhzqrclvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljb3hnenBscWtxcWh6cXJjbHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjEsImV4cCI6MjA4NjIyNzYyMX0.wYQN_c-LVl949E1Hp0AAeyHtvDEpo92Llpo4b21cHN8';


// Create client safely and attach to window
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Optional fuel config
window.config = {
  FUEL_PRICES: {
    Petrol: 270,
    Diesel: 280
  }
};
