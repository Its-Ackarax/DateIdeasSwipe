import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pgbffsfmheawnlhyebla.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnYmZmc2ZtaGVhd25saHllYmxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTIzNDEsImV4cCI6MjA4NzI4ODM0MX0.O2da494YcFhh1NrqfhA8XcBdkFQoncBefno3-6TTl8s";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});