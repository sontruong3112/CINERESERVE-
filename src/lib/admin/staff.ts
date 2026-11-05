import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { databaseNow, bookingLock } from "@/lib/booking/maintenance";
import { hashPassword } from "@/lib/auth/password";
import { localAdminEnabled, LOCAL_ADMIN_EMAIL } from "@/lib/auth/local-admin";
import {
  StaffError,
  type StaffRow,
  type StaffQuery,
  type StaffDirectory,
} from "./staff-shared";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const staffSelect = {
  id: true,
  name: true,
  emailNormalized: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  staffAssignment: {
    select: { cinema: { select: { id: true, name: true, active: true } } },
  },
} satisfies Prisma.UserSelect;
function dto(
  user: Prisma.UserGetPayload<{ select: typeof staffSelect }>,
): StaffRow {
  return {
    id: user.id,
    name: user.name,
    email: user.emailNormalized,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
    cinema: user.staffAssignment?.cinema || null,
  };
}
async function assertAdmin(tx: Prisma.TransactionClient, sessionId: string) {
  const now = await databaseNow(tx);
  const session = await tx.authSession.findUnique({
    where: { id: sessionId },
    select: {
      expiresAt: true,
      authVersion: true,
      user: {
        select: {
          id: true,
          emailNormalized: true,
          status: true,
          authVersion: true,
          role: true,
          mustChangePassword: true,
        },
      },
    },
  });
  if (
    !session ||
    session.expiresAt <= now ||
    session.user.status !== "ACTIVE" ||
    session.authVersion !== session.user.authVersion ||
    (session.user.emailNormalized === LOCAL_ADMIN_EMAIL && !localAdminEnabled())
  )
    throw new StaffError("UNAUTHENTICATED", 401);
  if (session.user.mustChangePassword)
    throw new StaffError("PASSWORD_CHANGE_REQUIRED", 428);
  if (session.user.role !== "ADMIN") throw new StaffError("FORBIDDEN", 403);
  return session.user.id;
}
export async function staffDirectory(
  sessionId: string,
  query: StaffQuery = {},
): Promise<StaffDirectory> {
  return getDb().$transaction(
    async (tx) => {
      await assertAdmin(tx, sessionId);
      const q = (query.q || "").trim(),
        cinema = query.cinema || "",
        pageValue = query.page || "1";
      if (
        q.length > 100 ||
        (cinema && !uuid.test(cinema)) ||
        !/^[1-9]\d{0,3}$/.test(pageValue)
      )
        throw new StaffError("INVALID_FILTER");
      const cinemas = await tx.cinema.findMany({
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
      });
      if (cinema && !cinemas.some((c) => c.id === cinema.toLowerCase()))
        throw new StaffError("INVALID_FILTER");
      const page = Number(pageValue),
        where: Prisma.UserWhereInput = {
          role: "STAFF",
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { emailNormalized: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(cinema
            ? { staffAssignment: { cinemaId: cinema.toLowerCase() } }
            : {}),
        };
      const total = await tx.user.count({ where });
      const rows = await tx.user.findMany({
        where,
        select: staffSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * 20,
        take: 20,
      });
      return {
        items: rows.map(dto),
        cinemas,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / 20)),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
export async function createStaff(
  sessionId: string,
  body: Record<string, unknown>,
): Promise<StaffRow> {
  // Fail before expensive password hashing, then re-check inside the write transaction.
  await getDb().$transaction((tx) => assertAdmin(tx, sessionId));
  if (
    Object.keys(body).some(
      (key) =>
        !["name", "email", "temporaryPassword", "cinemaId"].includes(key),
    )
  )
    throw new StaffError("INVALID_INPUT");
  const name = typeof body.name === "string" ? body.name.trim() : "",
    email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    password = body.temporaryPassword;
  if (
    name.length < 2 ||
    name.length > 80 ||
    /[\x00-\x1f\x7f]/.test(name) ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128 ||
    !password.trim() ||
    typeof body.cinemaId !== "string" ||
    !uuid.test(body.cinemaId)
  )
    throw new StaffError("INVALID_INPUT");
  const cinemaId = body.cinemaId.toLowerCase(),
    passwordHash = await hashPassword(password);
  try {
    return await getDb().$transaction(
      async (tx) => {
        await bookingLock(tx);
        const actorId = await assertAdmin(tx, sessionId);
        const cinema = await tx.cinema.findFirst({
          where: { id: cinemaId, active: true },
          select: { id: true },
        });
        if (!cinema) throw new StaffError("CINEMA_UNAVAILABLE", 409);
        const user = await tx.user.create({
          data: {
            name,
            emailNormalized: email,
            passwordHash,
            role: "STAFF",
            mustChangePassword: true,
            staffAssignment: { create: { cinemaId } },
          },
          select: staffSelect,
        });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            action: "STAFF_CREATED",
            entityType: "User",
            entityId: user.id,
            afterData: {
              id: user.id,
              name: user.name,
              role: "STAFF",
              cinemaId,
              mustChangePassword: true,
            },
          },
        });
        return dto(user);
      },
      { timeout: 15000, maxWait: 10000 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      throw new StaffError("EMAIL_UNAVAILABLE", 409);
    throw error;
  }
}
