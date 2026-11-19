import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";

export type AdminAuditLog = {
  id: string;
  timestamp: string;
  adminId: string;
  adminUsername: string;
  action: string;
  targetId?: string;
  targetUsername?: string;
  details: string;
};

const LOG_FILE = path.resolve(process.cwd(), "admin_audit_logs.json");

function readLogs(): AdminAuditLog[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLogs(logs: AdminAuditLog[]) {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 500), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write audit logs:", err);
  }
}

export async function logAdminAction(adminId: string, action: string, targetId?: string, details?: string) {
  try {
    const { data: adminProf } = await db.from("profiles").select("username").eq("id", adminId).maybeSingle();
    let targetUsername = "";
    if (targetId) {
      const { data: targetProf } = await db.from("profiles").select("username").eq("id", targetId).maybeSingle();
      targetUsername = targetProf?.username || targetId;
    }

    const log: AdminAuditLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      adminId,
      adminUsername: adminProf?.username || "Admin",
      action,
      targetId,
      targetUsername,
      details: details || "",
    };

    const logs = readLogs();
    logs.unshift(log);
    writeLogs(logs);
    return log;
  } catch (err) {
    console.error("Failed to log admin action:", err);
    return null;
  }
}

export async function getAdminAuditLogs(callerId: string): Promise<AdminAuditLog[]> {
  const { data: profile } = await db.from("profiles").select("username").eq("id", callerId).maybeSingle();
  if (profile?.username?.toLowerCase() !== "keno") {
    throw new Error("Access Denied: Admin Panel History Logger is strictly restricted to owner Keno.");
  }
  return readLogs();
}
