import { defineConfig } from "vite";
import { resolve } from "node:path";
import { cpSync, existsSync } from "node:fs";
import handler from "./api/arcade.js";

export default defineConfig({
  server: { host: "127.0.0.1" },
  build: {
    target: "es2022",
    rollupOptions: {
      input: { arcade: resolve("index.html"), owner: resolve("owner.html") },
    },
  },
  plugins: [
    {
      name: "arcade-assets-and-api",
      configureServer(server) {
        server.middlewares.use("/api/arcade", async (req, res) => {
          try {
            const query = Object.fromEntries(
              new URL(req.url, "http://local").searchParams,
            );
            let body = "";
            for await (const chunk of req) {
              body += chunk;
              if (body.length > 32768) throw new Error("Request too large");
            }
            req.query = query;
            req.body = body || "{}";
            res.status = (n) => ((res.statusCode = n), res);
            res.json = (v) => {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(v));
            };
            await handler(req, res);
          } catch {
            res.statusCode = 400;
            res.end('{"error":"Invalid request"}');
          }
        });
      },
      closeBundle() {
        for (const dir of ["assets", "games"])
          if (existsSync(dir)) cpSync(dir, `dist/${dir}`, { recursive: true });
        cpSync("classic.html", "dist/classic.html");
      },
    },
  ],
});
