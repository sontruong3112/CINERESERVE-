import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import { holdFailure } from "@/lib/booking/service";
import { readOrder, cancelOrder } from "@/lib/booking/orders";
type Context = { params: Promise<{ id: string }> };
async function sessionId() {
  await requireViewer();
  const session = await currentSession();
  if (!session) throw new AuthError("UNAUTHENTICATED", 401);
  return session.id;
}
export async function GET(_req: Request, { params }: Context) {
  try {
    return authJson({
      order: await readOrder(await sessionId(), (await params).id),
    });
  } catch (error) {
    return holdFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const session = await sessionId();
    return authJson({
      order: await cancelOrder(
        session,
        (await params).id,
        await readAuthBody(request),
      ),
    });
  } catch (error) {
    return holdFailure(error);
  }
}
