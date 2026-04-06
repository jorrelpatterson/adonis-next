// src/protocols/registry.js
import { validateProtocol } from './protocol-interface';

const protocols = [];

export function registerProtocol(protocol) {
  if (!validateProtocol(protocol)) {
    console.error(`Invalid protocol: ${protocol?.id || 'unknown'} — missing required fields or methods.`);
    return;
  }
  if (protocols.find(p => p.id === protocol.id)) return;
  protocols.push(protocol);
}

export function getAllProtocols() {
  return protocols;
}

export function matchProtocols(goal) {
  return protocols.filter(p => p.canServe(goal));
}

export function getByDomain(domainId) {
  return protocols.filter(p => p.domain === domainId);
}

export function getProtocol(id) {
  return protocols.find(p => p.id === id) || null;
}
