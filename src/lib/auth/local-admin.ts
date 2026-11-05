export const LOCAL_ADMIN_EMAIL = "admin@local.cinereserve.test";
export function localAdminEnabled() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_LOCAL_ADMIN_LOGIN !== "true"
  )
    return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return (
      url.hostname === "127.0.0.1" &&
      url.port === "55432" &&
      url.pathname === "/cinereserve"
    );
  } catch {
    return false;
  }
}
