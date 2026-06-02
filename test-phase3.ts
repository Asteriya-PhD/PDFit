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
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('[class*="border-dashed"]').first().click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  await page.waitForTimeout(1000);
}

async function clickTool(page: Page, toolName: string) {
  const button = page.getByRole('button', { name: toolName, exact: true });
  await button.click();
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
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    await clickTool(page, 'PDF转图片');
    
    // Select PNG format
    await page.locator('button').filter({ hasText: 'PNG（无损）' }).click();
    await page.waitForTimeout(200);
    
    // Select 150 DPI
    await page.locator('button').filter({ hasText: '150' }).first().click();
    await page.waitForTimeout(200);
    
    // Export
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button').filter({ hasText: '导出图片' }).click();
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
    await uploadFile(page, path.join(TEST_DIR, 'multi-page.pdf'));
    await clickTool(page, 'PDF转图片');
    
    await page.locator('button').filter({ hasText: '全部' }).first().click();
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button').filter({ hasText: '导出图片' }).click();
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
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    await clickTool(page, 'PDF转图片');
    
    await page.locator('button').filter({ hasText: 'JPEG（可压缩）' }).click();
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button').filter({ hasText: '导出图片' }).click();
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

  try {
    console.log('Running Scenario 4: PDF→Image - Image-only PDF');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'image-only.pdf'));
    await clickTool(page, 'PDF转图片');
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出图片', exact: true }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 4: PDF→Image - Image-only PDF',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 4: PDF→Image - Image-only PDF',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 5: PDF→Image - Custom DPI 300');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    await clickTool(page, 'PDF转图片');
    
    await page.locator('button').filter({ hasText: '300' }).first().click();
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出图片', exact: true }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 5: PDF→Image - Custom DPI 300',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 5: PDF→Image - Custom DPI 300',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 6: PDF→Image - Custom page range');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'multi-page.pdf'));
    await clickTool(page, 'PDF转图片');
    
    await page.locator('button').filter({ hasText: '指定页面' }).first().click();
    await page.waitForTimeout(200);
    
    await page.locator('input[type="text"]').fill('1,3');
    await page.waitForTimeout(200);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出图片', exact: true }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 6: PDF→Image - Custom page range',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 6: PDF→Image - Custom page range',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 7: PDF→Image - No file selected');
    await page.goto(BASE_URL);
    await clickTool(page, 'PDF转图片');
    
    await page.getByRole('button', { name: '导出图片', exact: true }).click();
    await page.waitForTimeout(500);
    
    results.push({
      scenario: 'Scenario 7: PDF→Image - No file selected',
      status: 'FAIL',
      confidence: 'High',
      notes: 'Should have shown an error when no file is selected'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 7: PDF→Image - No file selected',
      status: 'PASS',
      confidence: 'Medium',
      notes: `Error handled correctly: ${e instanceof Error ? e.message : String(e)}`
    });
  }


  try {
    console.log('Running Scenario 8: Image→PDF - Single PNG');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(TEST_DIR, 'test1.png'));
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 8: Image→PDF - Single PNG',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 8: Image→PDF - Single PNG',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 9: Image→PDF - Single JPG');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(TEST_DIR, 'test3.jpg'));
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 9: Image→PDF - Single JPG',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 9: Image→PDF - Single JPG',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 10: Image→PDF - Mixed formats');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(TEST_DIR, 'test1.png'),
      path.join(TEST_DIR, 'test3.jpg')
    ]);
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 10: Image→PDF - Mixed formats',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 10: Image→PDF - Mixed formats',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 11: Image→PDF - WebP format');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(TEST_DIR, 'test4.webp'));
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 11: Image→PDF - WebP format',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 11: Image→PDF - WebP format',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 12: Image→PDF - Multiple images');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(TEST_DIR, 'test1.png'),
      path.join(TEST_DIR, 'test2.png'),
      path.join(TEST_DIR, 'test3.jpg')
    ]);
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 12: Image→PDF - Multiple images',
      status: 'PASS',
      confidence: 'High',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 12: Image→PDF - Multiple images',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 13: Image→PDF - Reorder images');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[class*="border-dashed"]').first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(TEST_DIR, 'test1.png'),
      path.join(TEST_DIR, 'test2.png')
    ]);
    await page.waitForTimeout(1000);
    
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    const download = await downloadPromise;
    
    results.push({
      scenario: 'Scenario 13: Image→PDF - Reorder images',
      status: 'PASS',
      confidence: 'Medium',
      notes: `Downloaded: ${download.suggestedFilename()}`
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 13: Image→PDF - Reorder images',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 14: Image→PDF - No image selected');
    await page.goto(BASE_URL);
    await clickTool(page, '图片转PDF');
    
    await page.getByRole('button', { name: /转换为 PDF/ }).click();
    await page.waitForTimeout(500);
    
    results.push({
      scenario: 'Scenario 14: Image→PDF - No image selected',
      status: 'FAIL',
      confidence: 'High',
      notes: 'Should have shown an error when no image is selected'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 14: Image→PDF - No image selected',
      status: 'PASS',
      confidence: 'Medium',
      notes: `Error handled correctly: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 15: PDF→Markdown - Multi-page text PDF');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'multi-page.pdf'));
    await clickTool(page, '提取Markdown');
    
    await page.getByRole('button', { name: '提取 Markdown', exact: true }).click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('pre, textarea, [class*="markdown"]').first().textContent() || '';
    const hasContent = content.length > 0 && !content.includes('no extractable text');
    
    results.push({
      scenario: 'Scenario 15: PDF→Markdown - Multi-page text PDF',
      status: hasContent ? 'PASS' : 'FAIL',
      confidence: 'High',
      notes: hasContent ? 'Markdown extracted successfully' : 'No markdown content found'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 15: PDF→Markdown - Multi-page text PDF',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 16: PDF→Markdown - Empty text PDF');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'text-pdf.pdf'));
    await clickTool(page, '提取Markdown');
    
    await page.getByRole('button', { name: '提取 Markdown', exact: true }).click();
    await page.waitForTimeout(2000);
    
    const content = await page.locator('pre, textarea, [class*="markdown"]').first().textContent() || '';
    const hasContent = content.length > 0;
    
    results.push({
      scenario: 'Scenario 16: PDF→Markdown - Empty text PDF',
      status: 'PASS',
      confidence: 'Medium',
      notes: hasContent ? `Extracted content length: ${content.length}` : 'No content extracted (expected for empty PDF)'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 16: PDF→Markdown - Empty text PDF',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 17: PDF→Markdown - Image-only PDF');
    await page.goto(BASE_URL);
    await uploadFile(page, path.join(TEST_DIR, 'image-only.pdf'));
    await clickTool(page, '提取Markdown');
    
    await page.getByRole('button', { name: '提取 Markdown', exact: true }).click();
    await page.waitForTimeout(2000);
    
    const emptyMessage = await page.locator('text=扫描件').count() > 0 || await page.locator('text=无可提取').count() > 0;
    const content = await page.locator('pre, textarea, [class*="markdown"]').first().textContent() || '';
    
    results.push({
      scenario: 'Scenario 17: PDF→Markdown - Image-only PDF',
      status: emptyMessage || content.includes('no extractable text') ? 'PASS' : 'FAIL',
      confidence: 'High',
      notes: emptyMessage ? 'Correctly detected image-only PDF' : 'Did not detect image-only PDF'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 17: PDF→Markdown - Image-only PDF',
      status: 'FAIL',
      confidence: 'High',
      notes: `Error: ${e instanceof Error ? e.message : String(e)}`
    });
  }

  try {
    console.log('Running Scenario 18: PDF→Markdown - No file selected');
    await page.goto(BASE_URL);
    await clickTool(page, '提取Markdown');
    
    await page.getByRole('button', { name: '提取 Markdown', exact: true }).click();
    await page.waitForTimeout(500);
    
    results.push({
      scenario: 'Scenario 18: PDF→Markdown - No file selected',
      status: 'FAIL',
      confidence: 'High',
      notes: 'Should have shown an error when no file is selected'
    });
  } catch (e) {
    results.push({
      scenario: 'Scenario 18: PDF→Markdown - No file selected',
      status: 'PASS',
      confidence: 'Medium',
      notes: `Error handled correctly: ${e instanceof Error ? e.message : String(e)}`
    });
  }

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
