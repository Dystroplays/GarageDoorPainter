import { cookies } from "next/headers";

export async function requireAdminAuth(): Promise<Response | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("bolt_admin_session");
  if (!session || session.value !== "1") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
