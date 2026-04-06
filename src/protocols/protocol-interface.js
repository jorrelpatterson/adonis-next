// src/protocols/protocol-interface.js
const REQUIRED_FIELDS = ['id', 'domain', 'name', 'icon'];
const REQUIRED_METHODS = ['canServe', 'getState', 'getTasks', 'getAutomations', 'getRecommendations', 'getUpsells'];

export function validateProtocol(protocol) {
  if (!protocol) return false;
  for (const field of REQUIRED_FIELDS) {
    if (!protocol[field]) return false;
  }
  for (const method of REQUIRED_METHODS) {
    if (typeof protocol[method] !== 'function') return false;
  }
  return true;
}
