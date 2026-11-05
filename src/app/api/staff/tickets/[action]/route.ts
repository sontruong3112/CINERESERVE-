import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, readAuthBody, throttle } from "@/lib/auth/http";
import { holdFailure } from "@/lib/booking/service";
import { inspectTicket, redeemTicket } from "@/lib/tickets/service";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const viewer = await requireViewer(["STAFF"]),
      session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    const { action } = await params;
    if (action !== "inspect" && action !== "redeem")
      return authJson({ error: "NOT_FOUND" }, 404);
    const body = await readAuthBody(request);
    await throttle(`ticket-${action}`, viewer.id, 900);
    return authJson(
      action === "inspect"
        ? { ticket: await inspectTicket(session.id, body.code) }
        : await redeemTicket(session.id, body),
    );
  } catch (error) {
    return holdFailure(error);
  }
}
