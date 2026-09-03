// Local demo server for ACI.
//
// Runs the brain server-side (loading language files via runtime:fs) and
// serves the site over HTTP. The browser never touches runtime:fs — it just
// fetches /brain, so no CORS / server-only-module problem in the browser.
//
//   GET  /             -> serves the built site (demo/dist)
//   POST /brain {q}    -> runs brain(q) and returns its JSON result
//
// Uses the ES-Runtime built-in HTTP server (runtime:http) and file system
// (runtime:fs). Start with:  esrun --allow-net --allow-read demo/server.js
import { serve } from "runtime:http";
import { file } from "runtime:fs";
import { env } from "runtime:process";
import { brain } from "../src/index.js";

// Port from PORT env (esdev start moves it and tells us via PORT), else default.
const PORT = Number(env.PORT) || 4199;
const MODULE_DIR = new URL(".", import.meta.url).pathname;

// The built site lives beside the server bundle: with esdev start the server
// target and the web target share demo/dist, so index.html sits next to
// server.js. When run raw via esrun, it is under ./dist instead. Pick whichever
// holds index.html, resolved without cwd (which needs the Env capability).
async function resolveSiteDir() {
  const candidates = [`${MODULE_DIR}index.html`, `${MODULE_DIR}dist/index.html`];
  for (const p of candidates) {
    const f = file(p);
    if (await f.exists()) return p.replace(/index\.html$/, "");
  }
  return `${MODULE_DIR}dist/`;
}

let DIST = await resolveSiteDir();

async function serveStatic(url) {
  const rel = url.pathname === "/" ? "/index.html" : safePath(url.pathname);
  if (rel === null) return null;
  const path = `${DIST}${rel}`;
  try {
    const f = file(path);
    if (!(await f.exists()) || !(await f.stat()).isFile) return null;
    const type = contentType(rel);
    return new Response((await f.bytes()).buffer, {
      headers: { "content-type": type },
    });
  } catch {
    return null;
  }
}

// Decode the request path and keep it inside DIST: a segment that climbs out,
// however it was encoded, is not served.
function safePath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const parts = decoded.split("/");
  if (parts.some((p) => p === "..")) return null;
  return decoded;
}

function contentType(path) {
  const ext = path.split(".").pop();
  const map = {
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    svg: "image/svg+xml",
    json: "application/json; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

const server = serve({ port: PORT }, async (request) => {
  const url = new URL(request.url);

  if (url.pathname === "/brain" || url.pathname === "/brain/") {
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }
    let q;
    try {
      ({ q } = await request.json());
    } catch {
      return new Response("expected a JSON body of { q }", { status: 400 });
    }
    const result = await brain(String(q ?? ""));
    return Response.json(result);
  }

  const asset = await serveStatic(url);
  if (asset) return asset;

  return new Response("not found", { status: 404 });
});

const { hostname, port } = await server.addr;
console.log(`aci demo on http://${hostname}:${port}`);
