import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Remove all whitespace, newlines, and carriage returns in case of copy-paste errors
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[\s\r\n]+/g, '');
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.replace(/[\s\r\n]+/g, '');

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

console.log("Supabase URL initialized:", !!supabaseUrl);
console.log("Supabase Key starts with eyJ?", supabaseKey?.startsWith("eyJ"));
console.log("Supabase Key valid length?", supabaseKey?.length > 100);

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
