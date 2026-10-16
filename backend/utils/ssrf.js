import { URL } from 'node:url';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js'; // Let's check if this package exists, if not I'll just use regex

export const isSafeUrl = async (urlString) => {
    try {
        const parsed = new URL(urlString);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

        // Basic check for localhost / internal IPs
        if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')) return false;

        const addresses = await dns.resolve(parsed.hostname);
        for (const address of addresses) {
            // We'll just do basic string checks for common private ranges if ipaddr.js isn't available
            if (address.startsWith('127.') || 
                address.startsWith('10.') || 
                address.startsWith('192.168.') || 
                address === '::1' ||
                address.startsWith('169.254.')) {
                return false;
            }
            // 172.16.0.0/12 is trickier to regex exactly, but we can do a simple prefix check for 172.16-31
            if (address.startsWith('172.')) {
                const secondOctet = parseInt(address.split('.')[1], 10);
                if (secondOctet >= 16 && secondOctet <= 31) return false;
            }
        }
        return true;
    } catch (error) {
        return false; // Invalid URL or DNS resolution failed
    }
};

