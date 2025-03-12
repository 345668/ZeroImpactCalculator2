import express, { Express } from "express";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export function log(message: string) {
  console.log(`${new Date().toLocaleTimeString()} [express] ${message}`);
}

// Production mode - serve static files
export function serveStatic(app: Express) {
  const clientDistPath = resolve(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(resolve(clientDistPath, "index.html"));
  });
}

// Development mode - use Vite middleware
export async function setupVite(app: Express) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    root: resolve(__dirname, "../client"),
    appType: "spa",
  });

  app.use(vite.middlewares);

  // Fallback for SPA routing
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Always send back the index.html for SPA client-side routing
      let template = await vite.transformIndexHtml(url, "");
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  return vite;
}