import { getDb } from "@/lib/db";
import {
  AuthError,
  createSession,
  currentSession,
  currentViewer,
  deleteSession,
  requireViewer,
} from "@/lib/auth/session";
import { authFailure, authJson, readAuthBody, throttle } from "@/lib/auth/http";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { isLocale } from "@/lib/i18n";
import { localAdminEnabled, LOCAL_ADMIN_EMAIL } from "@/lib/auth/local-admin";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const text = (value: unknown) => (typeof value === "string" ? value : "");
const validPassword = (value: string) =>
  value.length >= 10 && value.length <= 128;

export async function GET(_request: Request, { params }: Context) {
  if ((await params).action !== "me")
    return authJson({ error: "NOT_FOUND" }, 404);
  try {
    return authJson({ user: await currentViewer() });
  } catch (error) {
    return authFailure(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  const { action } = await params;
  if (!["login", "register", "logout", "password", "profile"].includes(action))
    return authJson({ error: "NOT_FOUND" }, 404);
  try {
    const body = await readAuthBody(request);
    const db = getDb();
    if (action === "logout") {
      await deleteSession();
      return authJson({ ok: true });
    }

    if (action === "login" || action === "register") {
      const identifier = text(body.email).trim().toLowerCase();
      const email =
        action === "login" && identifier === "admin" && localAdminEnabled()
          ? LOCAL_ADMIN_EMAIL
          : identifier;
      const password = text(body.password);
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 ||
        password.length < 1 ||
        password.length > 128
      )
        throw new AuthError("INVALID_INPUT", 400);
      await throttle("auth-global", "all", 150);
      await throttle(action, email, 10);
      if (action === "register") {
        await throttle("register-global", "all", 30);
        const name = text(body.name).trim();
        if (
          name.length < 2 ||
          name.length > 80 ||
          !validPassword(password) ||
          password !== body.confirmPassword
        )
          throw new AuthError("INVALID_INPUT", 400);
        const passwordHash = await hashPassword(password);
        let user;
        try {
          user = await db.user.create({
            data: {
              name,
              emailNormalized: email,
              passwordHash,
              preferredLocale: isLocale(text(body.locale))
                ? text(body.locale)
                : "vi",
              role: "CUSTOMER",
            },
          });
        } catch (error) {
          if ((error as { code?: string }).code === "P2002")
            throw new AuthError("EMAIL_UNAVAILABLE", 409);
          throw error;
        }
        await deleteSession();
        await createSession(user.id, user.authVersion);
        return authJson({ user: await currentViewer() }, 201);
      }
      const user = await db.user.findUnique({
        where: { emailNormalized: email },
      });
      const valid = await verifyPassword(
        password,
        user?.passwordHash ?? dummyHash,
      );
      if (
        !user ||
        !valid ||
        user.status !== "ACTIVE" ||
        (user.emailNormalized === LOCAL_ADMIN_EMAIL && !localAdminEnabled())
      )
        throw new AuthError("INVALID_CREDENTIALS", 401);
      await deleteSession();
      await createSession(user.id, user.authVersion);
      return authJson({ user: await currentViewer() });
    }

    const viewer = await requireViewer(undefined, true);
    if (action === "profile") {
      if (viewer.mustChangePassword)
        throw new AuthError("PASSWORD_CHANGE_REQUIRED", 428);
      const name = text(body.name).trim();
      const phone = text(body.phone).trim();
      if (
        name.length < 2 ||
        name.length > 80 ||
        (phone && !/^[+\d ()-]{6,25}$/.test(phone))
      )
        throw new AuthError("INVALID_INPUT", 400);
      await db.user.update({
        where: { id: viewer.id },
        data: { name, phone: phone || null },
      });
      return authJson({ user: await currentViewer() });
    }

    await throttle("password-change", viewer.id, 10);
    const password = text(body.password);
    const previous = text(body.currentPassword);
    if (
      !validPassword(password) ||
      previous.length > 128 ||
      password !== body.confirmPassword
    )
      throw new AuthError("INVALID_INPUT", 400);
    const session = await currentSession();
    if (
      !session ||
      !(await verifyPassword(previous, session.user.passwordHash))
    )
      throw new AuthError("INVALID_CREDENTIALS", 401);
    if (password === previous) throw new AuthError("PASSWORD_REUSED", 400);
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: viewer.id,
          passwordHash: session.user.passwordHash,
          authVersion: session.authVersion,
        },
        data: {
          passwordHash,
          mustChangePassword: false,
          authVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) throw new AuthError("UNAUTHENTICATED", 401);
      await tx.authSession.deleteMany({ where: { userId: viewer.id } });
    });
    await createSession(viewer.id, session.authVersion + 1);
    return authJson({ user: await currentViewer() });
  } catch (error) {
    return authFailure(error);
  }
}
