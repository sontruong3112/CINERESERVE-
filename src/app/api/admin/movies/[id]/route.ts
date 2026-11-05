import { requireViewer } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import { adminFailure, saveMovie } from "@/lib/admin/service";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireViewer(["ADMIN"]);
    return authJson({
      movie: await saveMovie(
        actor.id,
        await readAuthBody(request, 32768),
        (await params).id,
      ),
    });
  } catch (error) {
    return adminFailure(error);
  }
}
