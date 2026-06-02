import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173/PDFit/';
const TEST_DIR = '/Users/zhewenliu/Claude/PdfX/test-files';

interface TestResult {
  scenario: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  confidence: 'High' | 'Medium' | 'Low';
  notes: string;
  errors?: string[];
}

const results: TestResult[] = [];

async function uploadFile(page: Page, filePath: string) {
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  await page.waitForTimeout(1000);
}

async function clickTool(page: Page, toolName: string) {
  await page.getByText(toolName).click();
  await page.waitForTimeout(500);
}

async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

async function runTests() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);

  // Scenario 1: PDF→Image - Single page, PNG, 150 DPI
  try {
    console.log('Running Scenario 1: PDF→Image - Single page PNG 150 DPI');
    await clickTool(page, 'PDF转图片');
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    
    // Select PNG format
    await page.getByText('PNG（无损）').click();
    await page.waitForTimeout(200);
    
    // Select 150 DPI
    await page.getByText('150').click();
    await page.waitForTimeout(200);
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('导出图片').click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 1: PDF→Image - Single page PNG 150 DPI',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 1: PDF→Image - Single page PNG 150 DPI',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  // Scenario 2: PDF→Image - Multi-page, all pages, ZIP
  try {
    console.log('Running Scenario 2: PDF→Image - Multi-page ZIP');
    await page.goto(BASE_URL);
    await clickTool(page, 'PDF转图片');
    await uploadFile(page, path.join(TEST_DIR, 'multi-page.pdf'));
    
    await page.getByText('全部页面').click();
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('导出图片').click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 2: PDF→Image - Multi-page ZIP',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 2: PDF→Image - Multi-page ZIP',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  // Scenario 3: PDF→Image - JPEG format
  try {
    console.log('Running Scenario 3: PDF→Image - JPEG format');
    await page.goto(BASE_URL);
    await clickTool(page, 'PDF转图片');
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    
    await page.getByText('JPEG（有损）').click();
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('导出图片').click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 3: PDF→Image - JPEG format',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 3: PDF→Image - JPEG format',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  // Print results
  console.log('\n========== QA TEST RESULTS ==========\n');
  for (const r of results) {
    console.log(`${r.status}: ${r.scenario}`);
    console.log(`  Confidence: ${r.confidence}`);
    console.log(`  Notes: ${r.notes}\n`);
  }
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nTotal: ${results.length}, Passed: ${passed}, Failed: ${failed}`);

  await browser.close();
}

runTests().catch(console.error);
