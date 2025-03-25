/**
 * Simple DMARC Test Script
 * 
 * A simplified version for troubleshooting XML parsing issues.
 */

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:5000/api';
const SAMPLE_REPORT_PATH = path.join(__dirname, 'test-data', 'simple-dmarc.xml');

async function testSimpleDmarcParse() {
  try {
    console.log('🔍 Testing Simple DMARC Parsing...');
    console.log(`Loading XML report from ${SAMPLE_REPORT_PATH}`);

    // Read the XML file
    const xmlContent = fs.readFileSync(SAMPLE_REPORT_PATH, 'utf-8');
    console.log(`XML file loaded successfully (${xmlContent.length} bytes)`);
    console.log(`XML content:\n${xmlContent.substring(0, 200)}...`);

    // Test direct XML parsing
    console.log('\n📊 Uploading XML content for parsing...');
    
    const parseResponse = await fetch(`${API_BASE_URL}/dmarc/reports/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ xml: xmlContent }),
    });

    console.log('Response status:', parseResponse.status, parseResponse.statusText);
    
    const responseText = await parseResponse.text();
    console.log('Response body:', responseText);

    if (!parseResponse.ok) {
      throw new Error(`Failed to parse XML: ${parseResponse.statusText} (${parseResponse.status})`);
    }

    try {
      const parseResult = JSON.parse(responseText);
      console.log('✅ XML parsing successful!');
      console.log('Parse result:', JSON.stringify(parseResult, null, 2));
    } catch (jsonError) {
      console.error('❌ Error parsing JSON response:', jsonError);
    }

    console.log('\n🎉 Test completed!');
  } catch (error) {
    console.error('❌ Error during DMARC testing:', error);
  }
}

testSimpleDmarcParse().catch(console.error);