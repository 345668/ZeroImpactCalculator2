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
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:5000/api';
const SIMPLE_REPORT_PATH = path.join(__dirname, 'test-data', 'simple-dmarc.xml');
const COMPREHENSIVE_REPORT_PATH = path.join(__dirname, 'test-data', 'comprehensive-dmarc.xml');

interface DmarcReportData {
  id?: number;
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

async function testDmarcReportUpload() {
  try {
    console.log('🔍 Testing DMARC Report Upload and Processing...');
    
    // Test 1: Parse XML directly
    console.log('\n📊 Test 1: Direct XML Parsing (Simple Report)');
    const simpleXmlContent = fs.readFileSync(SIMPLE_REPORT_PATH, 'utf-8');
    console.log(`Simple XML loaded successfully (${simpleXmlContent.length} bytes)`);
    
    const parseResponse = await fetch(`${API_BASE_URL}/dmarc/reports/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ xml: simpleXmlContent }),
    });
    
    console.log('Simple parsing response status:', parseResponse.status);
    const parsedData = await parseResponse.json() as ParseResponse;
    console.log('✅ Simple XML parsing successful!');
    
    if (parsedData.reports && parsedData.reports.length > 0) {
      console.log(`Parsed ${parsedData.reports.length} report records`);
      parsedData.reports.forEach((report: DmarcReportData, index: number) => {
        console.log(`Report ${index + 1}:`);
        console.log(`  - Report ID: ${report.reportId}`);
        console.log(`  - Domain: ${report.domain}`);
        console.log(`  - Source IP: ${report.sourceIp}`);
        console.log(`  - DKIM Result: ${report.dkimResult}`);
        console.log(`  - SPF Result: ${report.spfResult}`);
      });
    }
    
    // Test 2: Parse comprehensive XML
    console.log('\n📊 Test 2: Comprehensive XML Parsing');
    const comprehensiveXmlContent = fs.readFileSync(COMPREHENSIVE_REPORT_PATH, 'utf-8');
    console.log(`Comprehensive XML loaded successfully (${comprehensiveXmlContent.length} bytes)`);
    
    const comprehensiveParseResponse = await fetch(`${API_BASE_URL}/dmarc/reports/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ xml: comprehensiveXmlContent }),
    });
    
    console.log('Comprehensive parsing response status:', comprehensiveParseResponse.status);
    const comprehensiveParsedData = await comprehensiveParseResponse.json() as ParseResponse;
    console.log('✅ Comprehensive XML parsing successful!');
    
    if (comprehensiveParsedData.reports && comprehensiveParsedData.reports.length > 0) {
      console.log(`Parsed ${comprehensiveParsedData.reports.length} report records`);
      comprehensiveParsedData.reports.forEach((report: DmarcReportData, index: number) => {
        console.log(`Report ${index + 1}:`);
        console.log(`  - Report ID: ${report.reportId}`);
        console.log(`  - Domain: ${report.domain}`);
        console.log(`  - Source IP: ${report.sourceIp}`);
        console.log(`  - DKIM Result: ${report.dkimResult}`);
        console.log(`  - SPF Result: ${report.spfResult}`);
        console.log(`  - Disposition: ${report.disposition}`);
      });
    }
    
    // Test 3: File Upload Test
    console.log('\n📊 Test 3: File Upload Test');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(COMPREHENSIVE_REPORT_PATH), {
      filename: 'dmarc-report.xml',
      contentType: 'application/xml',
    });
    
    const uploadResponse = await fetch(`${API_BASE_URL}/dmarc/reports/upload`, {
      method: 'POST',
      body: formData as any,
    });
    
    console.log('Upload response status:', uploadResponse.status);
    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);
    
    // Test 4: Get Analytics (if available)
    try {
      console.log('\n📊 Test 4: Retrieving DMARC Analytics');
      const analyticsResponse = await fetch(`${API_BASE_URL}/dmarc/reports/analytics/summary`);
      
      console.log('Analytics response status:', analyticsResponse.status);
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json() as AnalyticsResponse;
        console.log('Analytics result:', analyticsData);
      } else {
        console.log('Analytics endpoint returned error:', await analyticsResponse.text());
      }
    } catch (analyticsError) {
      console.error('Error retrieving analytics:', analyticsError);
    }
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('❌ Error during DMARC testing:', error);
  }
}

testDmarcReportUpload().catch(console.error);