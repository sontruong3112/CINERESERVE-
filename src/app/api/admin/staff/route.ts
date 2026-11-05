import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, authFailure, readAuthBody } from "@/lib/auth/http";
import { staffDirectory, createStaff } from "@/lib/admin/staff";
import { StaffError } from "@/lib/admin/staff-shared";
export const runtime = "nodejs";
async function adminSession() {
  await requireViewer(["ADMIN"]);
  const session = await currentSession();
  if (!session) throw new AuthError("UNAUTHENTICATED", 401);
  return session.id;
}
function failure(error: unknown) {
  return error instanceof StaffError
    ? authJson({ error: error.code }, error.status)
    : authFailure(error);
}
export async function GET(request: Request) {
  try {
    const sessionId = await adminSession(),
      params = new URL(request.url).searchParams;
    return authJson(
      await staffDirectory(sessionId, {
        q: params.get("q") || "",
        cinema: params.get("cinema") || "",
        page: params.get("page") || "",
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const sessionId = await adminSession();
    return authJson(
      { staff: await createStaff(sessionId, await readAuthBody(request)) },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
