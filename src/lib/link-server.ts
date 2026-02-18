import * as http from 'http';
import type { AddressInfo } from 'net';

/** Escape string for safe embedding in HTML/JS template literals. */
function escapeForTemplate(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\x3c')
    .replace(/>/g, '\\x3e');
}

function buildLinkPage(linkToken: string): string {
  const safeToken = escapeForTemplate(linkToken);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>checkclaw — Connect Bank</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; }
    h1 { color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Connecting your bank...</h1>
    <p>Plaid Link will open automatically.</p>
  </div>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <script>
    const handler = Plaid.create({
      token: '${safeToken}',
      onSuccess: (public_token, metadata) => {
        fetch('/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token, metadata })
        }).then(() => {
          document.querySelector('.container').innerHTML = '<h1>&#10004; Bank connected!</h1><p>You can close this window.</p>';
        });
      },
      onExit: (err) => {
        fetch('/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: err ? err.error_message : 'cancelled' })
        }).then(() => {
          document.querySelector('.container').innerHTML = '<h1>Connection cancelled</h1><p>You can close this window.</p>';
        });
      }
    });
    handler.open();
  </script>
</body>
</html>`;
}

export function startLinkServer(
  linkToken: string,
): Promise<{ publicToken: string; port: number } | { error: string }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(buildLinkPage(linkToken));
        return;
      }

      if (req.method === 'POST' && req.url === '/callback') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));

          try {
            const data = JSON.parse(body);
            server.close();

            if (data.public_token) {
              const addr = server.address() as AddressInfo;
              resolve({ publicToken: data.public_token, port: addr?.port ?? 0 });
            } else {
              resolve({ error: data.error || 'cancelled' });
            }
          } catch {
            server.close();
            resolve({ error: 'Invalid callback payload' });
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    // Bind to localhost only (random port)
    server.listen(0, '127.0.0.1');
  });
}

/** Returns the link URL after the server has started. */
export function getLinkUrl(port: number): string {
  return `http://localhost:${port}`;
}
