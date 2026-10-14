// Preload for the no-network test (node --import). Every outbound socket, UDP send, or DNS
// lookup is recorded to $CRAFT_NET_GUARD_LOG and then refused, so a test can prove that a
// command opened no network connection even if the error was swallowed.
import net from 'node:net';
import dgram from 'node:dgram';
import dns from 'node:dns';
import { appendFileSync } from 'node:fs';

const log = process.env.CRAFT_NET_GUARD_LOG;
/** @param {string} what */
function refuse(what) {
  if (log) appendFileSync(log, `${what}\n`);
  throw new Error(`craft-no-network guard: ${what}`);
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = /** @type {any} */ (function guarded(/** @type {any[]} */ ...args) {
  const a = args[0];
  const pipe = typeof a === 'string' || (a && typeof a === 'object' && typeof a.path === 'string');
  if (!pipe) refuse(`tcp connect ${JSON.stringify(a && typeof a === 'object' ? { host: a.host, port: a.port } : args.slice(0, 2))}`);
  return connect.apply(this, /** @type {any} */ (args));
});
dgram.Socket.prototype.send = /** @type {any} */ (function guardedSend() {
  refuse('udp send');
});
dns.lookup = /** @type {any} */ (function guardedLookup(/** @type {string} */ host) {
  refuse(`dns lookup ${host}`);
});
dns.promises.lookup = /** @type {any} */ (async function guardedLookup(/** @type {string} */ host) {
  refuse(`dns lookup ${host}`);
});
