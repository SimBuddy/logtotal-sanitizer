import type { SanitizeRule } from '../../types';

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = `(?:(?<![\\d.])\\b${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}\\b(?!\\.\\d))`;

const IPV6_SEG = '[0-9a-fA-F]{1,4}';
const IPV6_FULL = `(?:${IPV6_SEG}:){7}${IPV6_SEG}`;
const IPV6_COMPRESSED = `(?:(?:${IPV6_SEG}:){1,7}:|(?:${IPV6_SEG}:){1,6}:${IPV6_SEG}|(?:${IPV6_SEG}:){1,5}(?::${IPV6_SEG}){1,2}|(?:${IPV6_SEG}:){1,4}(?::${IPV6_SEG}){1,3}|(?:${IPV6_SEG}:){1,3}(?::${IPV6_SEG}){1,4}|(?:${IPV6_SEG}:){1,2}(?::${IPV6_SEG}){1,5}|${IPV6_SEG}:(?::${IPV6_SEG}){1,6}|:(?:(?::${IPV6_SEG}){1,7}|:))`;
const IPV4_MAPPED = `(?:::ffff:${IPV4})`;
const IPV6 = `(?:(?<![A-Za-z0-9])(?:${IPV4_MAPPED}|${IPV6_FULL}|${IPV6_COMPRESSED})(?![A-Za-z0-9:])(?!\\.\\d)(?:%[A-Za-z0-9_.-]+)?)`;

const PTR_V4 = '(?:\\b(?:\\d{1,3}\\.){4}in-addr\\.arpa\\b)';
const PTR_V6 = '(?:\\b(?:[0-9a-fA-F]\\.){4,32}ip6\\.arpa\\b)';

const MAC_COLON = '(?:(?<!&)\\b[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}\\b)';
const MAC_DASH = '(?:\\b[0-9A-Fa-f]{2}(?:-[0-9A-Fa-f]{2}){5}\\b)';
const MAC_CISCO = '(?:\\b[0-9A-Fa-f]{4}(?:\\.[0-9A-Fa-f]{4}){2}\\b)';

function ipv4ToOctets(ip: string): number[] {
  return ip.split('.').map(Number);
}

function isNetmaskShape(octets: number[]): boolean {
  const bin = octets.map((octet) => octet.toString(2).padStart(8, '0')).join('');
  return /^1*0*$/.test(bin);
}

function isReservedIpv4(ip: string): boolean {
  const octets = ipv4ToOctets(ip);

  if (octets.length !== 4 || octets.some((octet) => Number.isNaN(octet))) {
    return false;
  }

  if (octets[0] === 127) {
    return true;
  }

  if (octets[0] === 0) {
    return true;
  }

  if (octets[0] === 169 && octets[1] === 254) {
    return true;
  }

  if (octets[0] >= 224 && octets[0] <= 239) {
    return true;
  }

  return isNetmaskShape(octets);
}

function validateIp(match: string): boolean {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(match)) {
    return !isReservedIpv4(match);
  }

  const withoutZone = match.split('%')[0] ?? match;

  if (withoutZone === '::' || withoutZone === '::1') {
    return false;
  }

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(withoutZone);

  if (mapped?.[1]) {
    return !isReservedIpv4(mapped[1]);
  }

  return true;
}

export const ipAddressesRule: SanitizeRule = {
  id: 'ips',
  label: 'Network addresses',
  description:
    'IPv4/IPv6 addresses, MAC addresses and reverse-DNS (PTR) names become the same token everywhere within a session.',
  mode: 'pseudo',
  token: 'IP',
  patterns: [PTR_V4, PTR_V6, IPV6, IPV4, MAC_COLON, MAC_DASH, MAC_CISCO],
  validate: validateIp,
  jsonKeys: [
    'ip',
    'ipAddress',
    'ip_address',
    'clientIp',
    'remoteAddr',
    'srcIp',
    'dstIp',
    'sourceIp',
    'destinationIp',
    'xForwardedFor',
    'mac',
    'macAddress',
  ],
};
