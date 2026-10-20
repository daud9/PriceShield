// Serves the Vite build output in dist/ with Deno.
// Run locally after `npm run build`:  deno run -A server.ts
import { serveDir } from "jsr:@std/http/file-server";

Deno.serve((req) => serveDir(req, { fsRoot: "dist", quiet: true }));
