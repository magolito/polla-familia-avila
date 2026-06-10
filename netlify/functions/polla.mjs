import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("polla-mundial");
  try {
    if (req.method === "GET") {
      const [state, matches] = await Promise.all([
        store.get("state", { type: "json" }),
        store.get("matches", { type: "json" }),
      ]);
      return Response.json({ state: state || null, matches: matches || null });
    }
    if (req.method === "POST") {
      const body = await req.json();
      if (body.state !== undefined) await store.setJSON("state", body.state);
      if (body.matches !== undefined) await store.setJSON("matches", body.matches);
      return Response.json({ ok: true });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};

export const config = { path: "/api/polla" };
