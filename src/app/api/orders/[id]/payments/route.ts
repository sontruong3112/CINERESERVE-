import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import { holdFailure } from "@/lib/booking/service";
import { payOrder } from "@/lib/booking/orders";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireViewer(["CUSTOMER"]);
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    return authJson({
      order: await payOrder(
        session.id,
        (await params).id,
        await readAuthBody(request),
      ),
    });
  } catch (error) {
    return holdFailure(error);
  }
}
