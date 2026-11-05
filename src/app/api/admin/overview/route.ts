import { requireViewer } from "@/lib/auth/session";
import { authJson, authFailure } from "@/lib/auth/http";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    await requireViewer(["ADMIN"]);
    const db = getDb();
    const [users, movies, cinemas] = await Promise.all([
      db.user.count(),
      db.movie.count(),
      db.cinema.count(),
    ]);
    return authJson({ users, movies, cinemas });
  } catch (error) {
    return authFailure(error);
  }
}
