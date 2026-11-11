"use server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, adminToken } from "@/lib/auth";

const h = (s: string) => crypto.createHash("sha256").update(s).digest();

export async function login(formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (real && crypto.timingSafeEqual(h(pw), h(real))) {
    (await cookies()).set(COOKIE, adminToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/admin", maxAge: 60 * 60 * 8,
    });
    redirect("/admin");
  }
  redirect("/admin?error=1");
}

export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin");
}
