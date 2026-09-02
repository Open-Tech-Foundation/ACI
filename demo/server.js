// Local demo server for ACI.
//
// Runs the brain server-side (loading language files via runtime:fs) and
// serves the site over HTTP. The browser never touches runtime:fs — it just
// fetches /brain, so no CORS / server-only-module problem in the browser.
//
//   GET /              -> serves the built site (demo/dist)
//   GET /brain?q=<in>  -> runs brain(<in>) and returns its JSON result
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
  let rel = url.pathname === "/" ? "/index.html" : url.pathname;
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
    const { q } = await request.json();
    const result = await brain(String(q ?? ""));
    return Response.json(result);
  }

  const asset = await serveStatic(url);
  if (asset) return asset;

  return new Response("not found", { status: 404 });
});

const { hostname, port } = await server.addr;
console.log(`aci demo on http://${hostname}:${port}`);
