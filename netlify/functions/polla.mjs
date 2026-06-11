import { getStore } from "@netlify/blobs";

// Combina predicciones por partido y por jugador, para no pisar lo de otros.
function mergePredictions(base, incoming) {
  const out = { ...(base || {}) };
  for (const matchId of Object.keys(incoming || {})) {
    out[matchId] = { ...(out[matchId] || {}), ...(incoming[matchId] || {}) };
  }
  return out;
}

// Guarda y lee los datos de la polla en Netlify Blobs.
// GET  /api/polla -> { state, matches }
// POST /api/polla {state, matches} -> combina y guarda
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

      if (body.state !== undefined) {
        const prev = (await store.get("state", { type: "json" })) || {};
        const inc = body.state || {};
        // La lista de jugadores SOLO se actualiza cuando viene la marca playersEdit:true
        // (acción explícita del admin). Un guardado normal de apuesta NO la toca,
        // para que nunca se pierda un jugador recién agregado.
        let players = prev.players || null;
        if (body.playersEdit === true && Array.isArray(inc.players)) {
          players = inc.players;
        }
        const merged = {
          predictions: mergePredictions(prev.predictions, inc.predictions),
          results: { ...(prev.results || {}), ...(inc.results || {}) },
          champions: { ...(prev.champions || {}), ...(inc.champions || {}) },
          real_champion: inc.real_champion !== undefined ? inc.real_champion : (prev.real_champion || ""),
          players,
        };
        await store.setJSON("state", merged);
      }

      if (body.matches !== undefined) await store.setJSON("matches", body.matches);

      return Response.json({ ok: true });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};

export const config = { path: "/api/polla" };
