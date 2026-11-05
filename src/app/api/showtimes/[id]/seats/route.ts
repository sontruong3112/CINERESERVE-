import { currentSession, requireViewer, AuthError } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import {
  getSeatMap,
  updateHold,
  releaseHold,
  holdFailure,
} from "@/lib/booking/service";
type Context = { params: Promise<{ id: string }> };
async function sessionId(customer = false) {
  await requireViewer(customer ? ["CUSTOMER"] : undefined);
  const session = await currentSession();
  if (!session) throw new AuthError("UNAUTHENTICATED", 401);
  return session.id;
}
export async function GET(_request: Request, { params }: Context) {
  try {
    return authJson(await getSeatMap(await sessionId(true), (await params).id));
  } catch (error) {
    return holdFailure(error);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    const id = await sessionId(true);
    const body = await readAuthBody(request);
    return authJson(await updateHold(id, (await params).id, body));
  } catch (error) {
    return holdFailure(error);
  }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    const id = await sessionId();
    const body = await readAuthBody(request);
    return authJson(await releaseHold(id, (await params).id, body));
  } catch (error) {
    return holdFailure(error);
  }
}
