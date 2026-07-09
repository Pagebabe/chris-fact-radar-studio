import { cookies } from "next/headers";
import { adminAuthConfigured, isValidAdminToken, STUDIO_ADMIN_COOKIE } from "@/lib/admin-auth";
import { ClientOnlyRadar } from "@/components/client-only-radar";
import { StudioLogin } from "@/components/studio-login";

type StudioPageProps = {
  searchParams?: Promise<{ auth?: string }>;
};

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = (await searchParams) ?? {};
  const protectedMode = adminAuthConfigured();

  if (protectedMode) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(STUDIO_ADMIN_COOKIE)?.value;
    if (!isValidAdminToken(sessionToken)) {
      return <StudioLogin failed={params.auth === "failed"} />;
    }
  }

  return (
    <>
      {protectedMode && (
        <form method="post" action="/api/admin/logout" style={{ position: "fixed", right: 18, top: 70, zIndex: 9000 }}>
          <button
            type="submit"
            style={{ border: "1px solid rgba(148,163,184,0.28)", borderRadius: 999, background: "#0d1424", color: "#e8ecf5", padding: "10px 14px", fontWeight: 900, boxShadow: "0 12px 32px rgba(0,0,0,0.45)", cursor: "pointer" }}
          >
            Studio sperren
          </button>
        </form>
      )}
      <ClientOnlyRadar />
    </>
  );
}
