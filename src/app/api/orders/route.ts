import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import { holdFailure } from "@/lib/booking/service";
import { createOrder, listOrders } from "@/lib/booking/orders";
export async function GET(request: Request) {
  try {
    await requireViewer();
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    return authJson(
      await listOrders(
        session.id,
        new URL(request.url).searchParams.get("page") ?? "1",
      ),
    );
  } catch (error) {
    return holdFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    await requireViewer(["CUSTOMER"]);
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    return authJson({
      order: await createOrder(session.id, await readAuthBody(request)),
    });
  } catch (error) {
    return holdFailure(error);
  }
}
