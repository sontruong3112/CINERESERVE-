import { requireViewer } from "@/lib/auth/session";
import { authJson, readAuthBody } from "@/lib/auth/http";
import {
  adminFailure,
  createShowtime,
  showtimeList,
} from "@/lib/admin/service";
export async function GET(request: Request) {
  try {
    await requireViewer(["ADMIN"]);
    const query = new URL(request.url).searchParams;
    return authJson(
      await showtimeList({
        date: query.get("date") ?? "",
        cinema: query.get("cinema") ?? "",
        page: query.get("page") ?? "1",
      }),
    );
  } catch (error) {
    return adminFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireViewer(["ADMIN"]);
    return authJson(
      { showtime: await createShowtime(actor.id, await readAuthBody(request)) },
      201,
    );
  } catch (error) {
    return adminFailure(error);
  }
}
