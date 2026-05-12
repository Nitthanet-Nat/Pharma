import { createServer as createViteServer } from 'vite';

const port = Number(process.env.PORT || 3000);

const apiRoutes = [
  { method: 'POST', pattern: /^\/api\/auth\/login$/, file: '/api/auth/login.ts' },
  { method: 'POST', pattern: /^\/api\/auth\/register$/, file: '/api/auth/register.ts' },
  { method: 'GET', pattern: /^\/api\/auth\/me$/, file: '/api/auth/me.ts' },
  { method: 'POST', pattern: /^\/api\/auth\/logout$/, file: '/api/auth/logout.ts' },
  { method: 'POST', pattern: /^\/api\/dify\/chat$/, file: '/api/dify/chat.ts' },
  { method: 'GET|POST', pattern: /^\/api\/personas$/, file: '/api/personas/index.ts' },
  { method: 'GET|POST', pattern: /^\/api\/personas\/active$/, file: '/api/personas/active.ts' },
  { method: 'GET|PUT|DELETE', pattern: /^\/api\/personas\/([^/]+)$/, file: '/api/personas/[id].ts', param: 'id' },
  { method: 'GET', pattern: /^\/api\/admin\/users$/, file: '/api/admin/users.ts' },
  { method: 'GET|POST', pattern: /^\/api\/admin\/personas$/, file: '/api/admin/personas/index.ts' },
  { method: 'GET|PUT|DELETE', pattern: /^\/api\/admin\/personas\/([^/]+)$/, file: '/api/admin/personas/[id].ts', param: 'id' },
];

const readBody = async (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    req.on('error', reject);
  });

const createVercelResponse = (res) => {
  let statusCode = 200;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    json(body) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      if (statusCode === 204) {
        res.end();
        return;
      }
      res.end(JSON.stringify(body));
    },
  };
};

let vite;

const apiMiddleware = async (req, res, next) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `localhost:${port}`}`);
  const pathname = requestUrl.pathname;

  if (!pathname.startsWith('/api/')) {
    next();
    return;
  }

  try {
    const route = apiRoutes.find((candidate) => {
      const methods = candidate.method.split('|');
      return methods.includes(req.method || 'GET') && candidate.pattern.test(pathname);
    });

    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'API route not found' }));
      return;
    }

    const match = pathname.match(route.pattern);
    const query = Object.fromEntries(requestUrl.searchParams.entries());
    if (route.param && match?.[1]) query[route.param] = decodeURIComponent(match[1]);

    const mod = await vite.ssrLoadModule(route.file);
    const handler = mod.default;
    await handler(
      {
        method: req.method,
        query,
        body: await readBody(req),
        headers: req.headers,
      },
      createVercelResponse(res)
    );
  } catch (error) {
    vite?.ssrFixStacktrace(error);
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }));
  }
};

vite = await createViteServer({
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    hmr: { port: Number(process.env.VITE_HMR_PORT || 24679) },
  },
  plugins: [
    {
      name: 'rsu-pharma-local-api',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      },
    },
  ],
});

await vite.listen();
vite.printUrls();
console.log('Local API routes are mounted under /api/*');
