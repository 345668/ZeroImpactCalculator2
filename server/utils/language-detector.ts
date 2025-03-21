import { Request } from 'express';
import geoip from 'geoip-lite';

/**
 * Detect language based on the user's IP address
 * @param req Express request object
 * @returns The detected language code (en or de)
 */
export function detectLanguageFromIP(req: Request): string {
  try {
    // Get client IP address
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? 
      (typeof forwarded === 'string' ? forwarded : forwarded[0]) : 
      req.socket.remoteAddress;
    
    if (!ip) return 'en';
    
    // Clean IP address (get first IP if multiple)
    const cleanIp = ip.toString().split(',')[0].trim();
    
    // Lookup geo information
    const geo = geoip.lookup(cleanIp);
    if (!geo) return 'en';
    
    // Map countries to languages
    const countryToLang: Record<string, string> = {
      DE: 'de', // Germany
      AT: 'de', // Austria
      CH: 'de', // Switzerland
      // Add more country-to-language mappings as needed
    };
    
    // Return the mapped language or default to English
    return countryToLang[geo.country] || 'en';
  } catch (error) {
    console.error('Error detecting language from IP:', error);
    return 'en';
  }
}