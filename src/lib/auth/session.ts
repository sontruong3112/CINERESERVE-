import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { Role, Viewer, AuthCode } from "./shared";
import { bookingLock, cancelUserHolds } from "@/lib/booking/maintenance";
import { localAdminEnabled, LOCAL_ADMIN_EMAIL } from "./local-admin";

export const SESSION_COOKIE = "cr_session";
export const sessionHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class AuthError extends Error {
  constructor(
    public code: AuthCode,
    public status: number,
  ) {
    super(code);
  }
}
export async function currentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await getDb().authSession.findUnique({
    where: { tokenHash: sessionHash(token) },
    include: {
      user: { include: { staffAssignment: { include: { cinema: true } } } },
    },
  });
  if (
    !session ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE" ||
    session.authVersion !== session.user.authVersion ||
    (session.user.emailNormalized === LOCAL_ADMIN_EMAIL && !localAdminEnabled())
  )
    return null;
  return session;
}
export async function currentViewer(): Promise<Viewer | null> {
  const session = await currentSession();
  if (!session) return null;
  const user = session.user;
  const cinema = user.staffAssignment?.cinema;
  return {
    id: user.id,
    name: user.name,
    email: user.emailNormalized,
    phone: user.phone,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    cinema: cinema?.active
      ? { id: cinema.id, code: cinema.code, name: cinema.name }
      : null,
  };
}
export async function createSession(userId: string, authVersion: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await getDb().authSession.create({
    data: { userId, authVersion, tokenHash: sessionHash(token), expiresAt },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function deleteSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token)
    await getDb().$transaction(async (tx) => {
      await bookingLock(tx);
      const session = await tx.authSession.findUnique({
        where: { tokenHash: sessionHash(token) },
      });
      if (session) {
        await cancelUserHolds(tx, session.userId);
        await tx.authSession.delete({ where: { id: session.id } });
      }
    });
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function requireViewer(roles?: Role[], allowTemporary = false) {
  const viewer = await currentViewer();
  if (!viewer) throw new AuthError("UNAUTHENTICATED", 401);
  if (viewer.mustChangePassword && !allowTemporary)
    throw new AuthError("PASSWORD_CHANGE_REQUIRED", 428);
  if (roles && !roles.includes(viewer.role))
    throw new AuthError("FORBIDDEN", 403);
  if (viewer.role === "STAFF" && !viewer.cinema && !allowTemporary)
    throw new AuthError("FORBIDDEN", 403);
  return viewer;
}
export async function requirePageViewer(
  locale: string,
  path: string,
  roles?: Role[],
  allowTemporary = false,
) {
  const viewer = await currentViewer();
  if (!viewer)
    redirect(
      `/${locale}/login?next=${encodeURIComponent(`/${locale}/${path}`)}`,
    );
  if (viewer.mustChangePassword && !allowTemporary)
    redirect(`/${locale}/account/password`);
  if (
    (roles && !roles.includes(viewer.role)) ||
    (viewer.role === "STAFF" && !viewer.cinema && !allowTemporary)
  )
    redirect(`/${locale}/forbidden`);
  return viewer;
}
