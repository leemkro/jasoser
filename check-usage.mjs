import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or key in .env / .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);
const today = new Date().toISOString().slice(0, 10);

// 1. Find user by email via auth admin API
const { data: userList, error: listErr } = await supabase.auth.admin.listUsers();

if (listErr) {
  console.error("Auth listUsers error:", listErr.message);
  process.exit(1);
}

const targetUser = userList.users.find((u) => u.email === "leemkro@naver.com");

if (!targetUser) {
  console.log("해당 이메일의 사용자가 없습니다.");
  process.exit(0);
}

console.log("== 사용자 ==");
console.log(`  이메일: ${targetUser.email}`);
console.log(`  user_id: ${targetUser.id}`);

// 2. Check profiles
const { data: profile } = await supabase
  .from("profiles")
  .select("subscription_status")
  .eq("id", targetUser.id)
  .maybeSingle();

console.log(`  구독상태: ${profile?.subscription_status ?? "프로필 없음"}`);

// 3. Check daily_usage
const { data: usage, error: usageErr } = await supabase
  .from("daily_usage")
  .select("used_count, limit_count, usage_date")
  .eq("user_id", targetUser.id)
  .eq("feature", "generation")
  .eq("usage_date", today)
  .maybeSingle();

if (usageErr) {
  console.error("Usage query error:", usageErr.message);
  process.exit(1);
}

console.log(`\n== 오늘(${today}) 사용량 ==`);
if (!usage) {
  console.log("  오늘 사용 기록 없음 → 남은 횟수: 3");
} else {
  const remaining = Math.max(0, usage.limit_count - usage.used_count);
  console.log(`  사용: ${usage.used_count} / ${usage.limit_count}`);
  console.log(`  남은 횟수: ${remaining}`);
}
