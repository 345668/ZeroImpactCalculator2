/**
 * DMARC Domain Alignment Test Script
 * 
 * This script tests the domain alignment and authentication functionality.
 */

import fetch from 'node-fetch';
import { createHash } from 'crypto';

// Configuration
const baseUrl = 'http://localhost:5000';

interface ApiResponse {
  success: boolean;
  message?: string;
  [key: string]: any;
}

async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.csrfToken || null;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

async function login(username: string, password: string): Promise<boolean> {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token for login');
    }
    
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        login: username,
        password: password
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Login successful:', data);
    return data.success;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

async function testGenerateDmarcRecord() {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }
    
    const domain = 'example.com';
    
    const response = await fetch(`${baseUrl}/api/email-agent/domains/generate-dmarc`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        domain,
        policy: 'quarantine',
        subdomainPolicy: 'reject',
        reportEmail: 'dmarc@example.com',
        reportForensicEmail: 'forensic@example.com',
        percentage: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`DMARC record generation failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as ApiResponse;
    console.log('DMARC Record Generation Test:', data.success ? 'PASSED' : 'FAILED');
    console.log('DMARC Record:', data.dmarcRecord);
    console.log('Details:', data);
    
    return data.success;
  } catch (error) {
    console.error('DMARC record generation error:', error);
    return false;
  }
}

async function testCheckDomainAlignment() {
  try {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token');
    }
    
    const domain = 'example.com';
    
    const response = await fetch(`${baseUrl}/api/email-agent/domains/check-alignment`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ domain })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Response text:', errorText);
      throw new Error(`Domain alignment check failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as ApiResponse;
    console.log('Domain Alignment Check Test:', data.success ? 'PASSED' : 'FAILED');
    
    if (data.success && data.alignment) {
      console.log('Domain alignment details:');
      console.log('- Domain:', data.alignment.domain);
      console.log('- SPF aligned:', data.alignment.spfAligned);
      console.log('- DKIM aligned:', data.alignment.dkimAligned);
      console.log('- DMARC configured:', data.alignment.dmarcConfigured);
      console.log('- DMARC policy:', data.alignment.dmarcPolicy);
      console.log('- Valid:', data.alignment.isValid);
      
      if (data.alignment.recommendations.length > 0) {
        console.log('Recommendations:');
        data.alignment.recommendations.forEach((rec: string, index: number) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      } else {
        console.log('No recommendations provided.');
      }
    } else {
      console.log('Message:', data.message);
    }
    
    return data.success;
  } catch (error) {
    console.error('Domain alignment check error:', error);
    return false;
  }
}

async function runTests() {
  console.log('===== Domain Alignment and Authentication Tests =====');
  
  // Login first (use the admin credentials here)
  const loggedIn = await login('admin', 'adminpassword');
  if (!loggedIn) {
    console.error('Login failed. Tests aborted.');
    return;
  }
  
  // Run all tests
  console.log('\n1. Testing DMARC Record Generation');
  const dmarcResult = await testGenerateDmarcRecord();
  
  console.log('\n2. Testing Domain Alignment Check');
  const alignmentResult = await testCheckDomainAlignment();
  
  // Summary
  console.log('\n===== Test Results Summary =====');
  console.log('DMARC Record Generation:', dmarcResult ? 'PASSED' : 'FAILED');
  console.log('Domain Alignment Check:', alignmentResult ? 'PASSED' : 'FAILED');
  console.log('===============================');
}

// Run all tests
runTests().catch(error => {
  console.error('Test suite error:', error);
});