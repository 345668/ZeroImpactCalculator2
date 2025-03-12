
import express from "express";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export function log(message) {
  console.log(`${new Date().toLocaleTimeString()} [express] ${message}`);
}

// Production mode - serve static files
export function serveStatic(app) {
  app.use(
    express.static(resolve(__dirname, "../dist/public"), {
      maxAge: "1y",
      etag: false,
    })
  );
  app.get("*", (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(resolve(__dirname, "../dist/public/index.html"));
  });
  return app;
}

// Development mode - integrate with Vite
export async function setupVite(app) {
  try {
    const { createServer } = await import("vite");

    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: {
          clientPort: 5000,
          port: 5000
        }
      },
      appType: "spa",
      root: resolve(__dirname, "../client"),
      clearScreen: false
    });

    // Use Vite's hot module replacement middleware
    app.use(vite.middlewares);

    // Handle client-side routes
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        if (!url.startsWith("/api")) {
          // Read the template from disk
          const templatePath = resolve(__dirname, "../client/index.html");
          let template = await vite.transformIndexHtml(url, await import('fs').then(fs => fs.readFileSync(templatePath, 'utf-8')));
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e) {
        if (vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });

    return app;
  } catch (error) {
    console.error("Error setting up Vite:", error);
    throw error;
  }
}
