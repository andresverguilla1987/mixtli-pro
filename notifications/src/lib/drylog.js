/**
 * In‑memory mail log for demo. Not for production.
 */
const _log = [];
export function recordMail(entry) {
  _log.unshift({ ts: new Date().toISOString(), ...entry });
  if (_log.length > 50) _log.pop();
}
export function getMailLog() {
  return _log;
}
