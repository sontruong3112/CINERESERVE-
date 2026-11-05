import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, authFailure } from "@/lib/auth/http";
import { operationsOrders } from "@/lib/operations/orders";
import {
  OperationsError,
  type OperationsQuery,
} from "@/lib/operations/orders-shared";

export async function GET(request: Request) {
  try {
    await requireViewer(["ADMIN", "STAFF"]);
    const session = await currentSession();
    if (!session) throw new AuthError("UNAUTHENTICATED", 401);
    const params = new URL(request.url).searchParams;
    const query: OperationsQuery = Object.fromEntries(
      ["q", "status", "cinema", "from", "to", "page"].map((key) => [
        key,
        params.get(key) || "",
      ]),
    );
    return authJson(await operationsOrders(session.id, query));
  } catch (error) {
    if (error instanceof OperationsError)
      return authJson({ error: error.code }, error.status);
    return authFailure(error);
  }
}
