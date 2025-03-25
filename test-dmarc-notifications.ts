/**
 * DMARC Notification Test Script
 * 
 * This script tests the DMARC notification capabilities of the application
 * by sending test notifications for existing DMARC reports.
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'test@example.com';

// For test scripts, we'll use the DMARC API routes directly to bypass CSRF protection
const DMARC_API_BASE_URL = 'http://localhost:5000/api/dmarc';

interface DmarcReport {
  id: number;
  reportId: string;
  domain: string;
  sourceIp: string;
  reportingOrg: string;
  disposition: string;
  dkimResult: string | null;
  spfResult: string | null;
}

// Get a CSRF token for authenticated requests
async function getCsrfToken(): Promise<string | null> {
  try {
    // First, get a session cookie
    const response = await fetch(`${API_BASE_URL}/api/csrf-token`);
    
    if (!response.ok) {
      console.error('Failed to fetch CSRF token:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json() as { csrfToken?: string };
    return data.csrfToken || null;
  } catch (error) {
    console.error('Error fetching CSRF token:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function testSingleNotification() {
  console.log('=== Testing Single DMARC Notification ===');
  
  try {
    // 1. Get available reports
    const reportsResponse = await fetch(`${DMARC_API_BASE_URL}/reports`);
    const reportsData = await reportsResponse.json() as { reports?: DmarcReport[] };
    
    if (!reportsResponse.ok) {
      throw new Error(`Failed to fetch reports: ${(reportsData as any).error || 'Unknown error'}`);
    }
    
    if (!reportsData.reports || reportsData.reports.length === 0) {
      console.log('No DMARC reports available to test with');
      return;
    }
    
    // 2. Pick first report for testing
    const testReport = reportsData.reports[0] as DmarcReport;
    console.log(`Using report ID ${testReport.id} (${testReport.reportId}) for domain ${testReport.domain}`);
    
    // 3. Get CSRF token
    const csrfToken = await getCsrfToken();
    
    if (!csrfToken) {
      // Skip CSRF for direct API testing
      console.log('Warning: Proceeding without CSRF token (API may reject the request)');
    }
    
    // 4. Send test notification
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['CSRF-Token'] = csrfToken;
    }
    
    const notificationResponse = await fetch(`${DMARC_API_BASE_URL}/notifications/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reportId: testReport.id,
        email: TEST_EMAIL
      }),
    });
    
    const notificationResult = await notificationResponse.json() as Record<string, any>;
    
    if (!notificationResponse.ok) {
      throw new Error(`Failed to send notification: ${notificationResult.error || 'Unknown error'}`);
    }
    
    console.log('=== Notification Test Result ===');
    console.log(JSON.stringify(notificationResult, null, 2));
    
  } catch (error) {
    console.error('Error testing DMARC notification:', error instanceof Error ? error.message : error);
  }
}

async function testBatchNotifications() {
  console.log('=== Testing Batch DMARC Notifications ===');
  
  try {
    // 1. Get CSRF token
    const csrfToken = await getCsrfToken();
    
    if (!csrfToken) {
      // Skip CSRF for direct API testing
      console.log('Warning: Proceeding without CSRF token (API may reject the request)');
    }
    
    // 2. Send batch notifications
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['CSRF-Token'] = csrfToken;
    }
    
    const batchResponse = await fetch(`${DMARC_API_BASE_URL}/notifications/send-all`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: TEST_EMAIL,
        limit: 5
      }),
    });
    
    const batchResult = await batchResponse.json() as Record<string, any>;
    
    if (!batchResponse.ok) {
      throw new Error(`Failed to send batch notifications: ${batchResult.error || 'Unknown error'}`);
    }
    
    console.log('=== Batch Notification Test Result ===');
    console.log(JSON.stringify(batchResult, null, 2));
    
  } catch (error) {
    console.error('Error testing batch DMARC notifications:', error instanceof Error ? error.message : error);
  }
}

async function testEmailProcessing() {
  console.log('=== Testing DMARC Email Processing ===');
  
  try {
    // 1. Get CSRF token
    const csrfToken = await getCsrfToken();
    
    if (!csrfToken) {
      // Skip CSRF for direct API testing
      console.log('Warning: Proceeding without CSRF token (API may reject the request)');
    }
    
    // 2. Test email processing
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (csrfToken) {
      headers['CSRF-Token'] = csrfToken;
    }
    
    const processingResponse = await fetch(`${DMARC_API_BASE_URL}/process-emails`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        maxEmails: 5,
        notificationEmail: TEST_EMAIL
      }),
    });
    
    const processingResult = await processingResponse.json() as Record<string, any>;
    
    if (!processingResponse.ok) {
      throw new Error(`Failed to process DMARC emails: ${processingResult.error || 'Unknown error'}`);
    }
    
    console.log('=== Email Processing Test Result ===');
    console.log(JSON.stringify(processingResult, null, 2));
    
  } catch (error) {
    console.error('Error testing DMARC email processing:', error instanceof Error ? error.message : error);
  }
}

async function runTests() {
  console.log('Starting DMARC notification tests...');
  
  // Run all tests
  await testSingleNotification();
  console.log('\n');
  
  await testBatchNotifications();
  console.log('\n');
  
  await testEmailProcessing();
  
  console.log('\nAll DMARC notification tests completed');
}

// Execute tests
runTests();