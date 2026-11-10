import { createServer } from 'node:net';

/**
 * Minimal in-process server speaking the Redis protocol (RESP2) for the commands a client
 * needs to connect and answer a health check: PING, INFO, CLIENT, SELECT, QUIT.
 * Used ONLY by `npm run smoke` when REDIS_URL is not set (no Docker on the dev machine).
 * It proves the API's Redis wiring end to end, not Redis itself; CI runs a real Redis.
 */
export function startRedisStub() {
  const server = createServer((socket) => {
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('error', () => socket.destroy());
    socket.on('data', (chunk) => {
      buffer += chunk;
      let parsed;
      while ((parsed = parseCommand(buffer))) {
        buffer = buffer.slice(parsed.consumed);
        const [name = '', ...args] = parsed.args;
        socket.write(reply(name.toUpperCase(), args));
        if (name.toUpperCase() === 'QUIT') socket.end();
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ port, stop: () => new Promise((done) => server.close(() => done())) });
    });
  });
}

function reply(name, args) {
  switch (name) {
    case 'PING':
      return args.length ? bulk(args[0]) : '+PONG\r\n';
    case 'INFO':
      return bulk('# Server\r\nredis_version:7.4.0\r\nredis_mode:standalone\r\nloading:0\r\n');
    case 'CLIENT':
    case 'SELECT':
    case 'QUIT':
      return '+OK\r\n';
    default:
      return `-ERR unknown command '${name}' (smoke redis stub)\r\n`;
  }
}

const bulk = (s) => `$${Buffer.byteLength(s)}\r\n${s}\r\n`;

/** Parses one `*N\r\n$len\r\narg\r\n...` command; returns null until a full one has arrived. */
function parseCommand(input) {
  if (!input.startsWith('*')) {
    const end = input.indexOf('\r\n');
    return end === -1 ? null : { args: input.slice(0, end).split(' '), consumed: end + 2 };
  }
  let pos = input.indexOf('\r\n');
  if (pos === -1) return null;
  const count = Number(input.slice(1, pos));
  pos += 2;
  const args = [];
  for (let i = 0; i < count; i++) {
    const lineEnd = input.indexOf('\r\n', pos);
    if (lineEnd === -1) return null;
    const len = Number(input.slice(pos + 1, lineEnd));
    const start = lineEnd + 2;
    if (input.length < start + len + 2) return null;
    args.push(input.slice(start, start + len));
    pos = start + len + 2;
  }
  return { args, consumed: pos };
}
