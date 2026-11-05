import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const language = (await cookies()).get("cinereserve-locale")?.value;
  redirect(language === "en" ? "/en" : "/vi");
}
