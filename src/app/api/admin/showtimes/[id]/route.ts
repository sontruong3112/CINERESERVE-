import { requireViewer } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import { adminFailure, changeShowtime } from "@/lib/admin/service";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireViewer(["ADMIN"]);
    return authJson({
      showtime: await changeShowtime(
        actor.id,
        (await params).id,
        await readAuthBody(request),
      ),
    });
  } catch (error) {
    return adminFailure(error);
  }
}
