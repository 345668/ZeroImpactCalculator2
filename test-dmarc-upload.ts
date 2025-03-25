/**
 * DMARC Report Upload Test Script
 * 
 * This script demonstrates how to upload and process a DMARC XML report
 * via the application's API endpoints.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Types for API responses
interface DmarcReportData {
  id: number;
  reportId: string;
  domain: string;
  sourceIp: string;
  sourceOrg: string | null;
  reportingOrg: string;
  count: number;
  disposition: string;
  dkimResult: string | null;
  spfResult: string | null;
  alignmentDkim: string | null;
  alignmentSpf: string | null;
  policyEvaluated: string | null;
  reportDate: string;
  processed: boolean;
  emailSent: boolean;
  startDate?: string;
  endDate?: string;
  messageCount?: number;
}

interface ParseResponse {
  success: boolean;
  reports: DmarcReportData[];
  message: string;
}

interface AnalyticsResponse {
  totalReports: number;
  passRate: number;
  failRate: number;
  topSources: Array<{ sourceIp: string; count: number }>;
  reportsByDay: Array<{ date: string; count: number }>;
  message: string;
}

const API_BASE_URL = 'http://localhost:5000/api';
const SAMPLE_REPORT_PATH = path.join(__dirname, 'test-data', 'sample-dmarc-report.xml');

async function testDmarcReportUpload() {
  try {
    console.log('🔍 Testing DMARC Report Upload...');
    console.log(`Loading XML report from ${SAMPLE_REPORT_PATH}`);

    // Read the XML file
    const xmlContent = fs.readFileSync(SAMPLE_REPORT_PATH, 'utf-8');
    console.log(`XML file loaded successfully (${xmlContent.length} bytes)`);

    // First test: Direct XML parsing
    console.log('\n📊 Test 1: Uploading XML content directly for parsing...');
    const parseResponse = await fetch(`${API_BASE_URL}/dmarc/reports/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ xml: xmlContent }),
    });

    if (!parseResponse.ok) {
      throw new Error(`Failed to parse XML: ${parseResponse.statusText} (${parseResponse.status})`);
    }

    const parseResult = await parseResponse.json() as ParseResponse;
    console.log('✅ XML parsing successful!');
    console.log('Parse result:', JSON.stringify(parseResult, null, 2));

    // Second test: Multi-part form upload
    console.log('\n📤 Test 2: Uploading XML file via multi-part form...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(SAMPLE_REPORT_PATH), {
      filename: 'dmarc-report.xml',
      contentType: 'application/xml',
    });

    const uploadResponse = await fetch(`${API_BASE_URL}/dmarc/reports/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.statusText} (${uploadResponse.status})`);
    }

    const uploadResult = await uploadResponse.json() as DmarcReportData[];
    console.log('✅ Upload successful!');
    console.log('Upload result:', JSON.stringify(uploadResult, null, 2));

    // Third test: Get all reports
    console.log('\n📋 Test 3: Retrieving all DMARC reports...');
    const getResponse = await fetch(`${API_BASE_URL}/dmarc/reports`);

    if (!getResponse.ok) {
      throw new Error(`Failed to retrieve reports: ${getResponse.statusText} (${getResponse.status})`);
    }

    const reports = await getResponse.json() as DmarcReportData[];
    console.log('✅ Retrieved reports successfully!');
    console.log(`Found ${reports.length} reports:`);
    reports.forEach((report: DmarcReportData, index: number) => {
      console.log(`Report #${index + 1}:`);
      console.log(`  ID: ${report.id}`);
      console.log(`  Domain: ${report.domain}`);
      console.log(`  Report ID: ${report.reportId}`);
      console.log(`  Start Date: ${report.startDate || 'N/A'}`);
      console.log(`  End Date: ${report.endDate || 'N/A'}`);
      console.log(`  Messages: ${report.messageCount || report.count || 0}`);
    });

    // Fourth test: Get analytics
    console.log('\n📈 Test 4: Retrieving DMARC analytics summary...');
    const analyticsResponse = await fetch(`${API_BASE_URL}/dmarc/reports/analytics/summary`);

    if (!analyticsResponse.ok) {
      throw new Error(`Failed to retrieve analytics: ${analyticsResponse.statusText} (${analyticsResponse.status})`);
    }

    const analytics = await analyticsResponse.json() as AnalyticsResponse;
    console.log('✅ Retrieved analytics successfully!');
    console.log('Analytics:', JSON.stringify(analytics, null, 2));

    console.log('\n🎉 All DMARC tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during DMARC testing:', error);
  }
}

testDmarcReportUpload().catch(console.error);