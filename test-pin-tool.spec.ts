import { test, expect } from '@playwright/test';

test.setTimeout(45000);

test('pin tool click opens PinForm dialog', async ({ page }) => {
  // Navigate to the app first
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);
  
  // Check if we need to create a world first
  const hasWorld = await page.evaluate(() => {
    try {
      const stored = localStorage.getItem('zzworld-storage');
      if (stored) {
        const data = JSON.parse(stored);
        return data?.state?.data?.meta?.name !== undefined;
      }
    } catch {}
    return false;
  });
  
  if (!hasWorld) {
    // Seed a world via the store
    await page.evaluate(() => {
      const seedData = {
        state: {
          data: {
            meta: { name: '测试世界', description: '测试用', id: 'test-1', createdAt: Date.now(), updatedAt: Date.now() },
            characters: [],
            factions: [
              { id: 'f1', name: '测试势力', description: '', color: '#e53935', establishedYear: 100, fallenYear: null, leaderId: null }
            ],
            cities: [
              { id: 'c1', name: '测试城', factionId: 'f1', type: 'capital', gridX: 50, gridY: 50, population: 10000, isCapital: true, description: '' }
            ],
            events: [],
            eras: ['远古时代'],
            mapPins: [],
            mapLayers: [
              { id: 'terrain', name: '地形层', visible: true, opacity: 1, isReadOnly: true },
              { id: 'territory', name: '领地层', visible: true, opacity: 0.8 },
              { id: 'city', name: '城市层', visible: true, opacity: 1, isReadOnly: true },
              { id: 'event', name: '事件层', visible: true, opacity: 0.9, isReadOnly: true },
              { id: 'pin', name: '图钉层', visible: true, opacity: 1 }
            ],
            mapGrid: {
              width: 100,
              height: 100,
              cellSize: 10,
              cells: {}
            },
            relations: [],
            mysteries: [],
            chronicles: []
          },
          activeLayerId: 'territory',
          drawingTool: 'brush',
          drawingColor: '#e53935',
          undoStack: [],
          redoStack: []
        },
        version: 0
      };
      localStorage.setItem('zzworld-storage', JSON.stringify(seedData));
    });
    // Reload to pick up the seeded data
    await page.reload();
    await page.waitForTimeout(2000);
  }
  
  // Now we should have a map canvas
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 10000 });
  
  // Take a screenshot to see current state
  await page.screenshot({ path: 'test-step1-loaded.png' });
  
  // Click the edit button
  const editBtn = page.getByRole('button', { name: /编辑地图/ });
  await editBtn.click();
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: 'test-step2-edit-mode.png' });
  
  // Click the pin tool button in the toolbar
  const pinToolBtn = page.getByRole('button', { name: /图钉/ });
  await pinToolBtn.click();
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: 'test-step3-pin-tool.png' });
  
  // Click on the canvas
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    const clickX = canvasBox.x + canvasBox.width * 0.6;
    const clickY = canvasBox.y + canvasBox.height * 0.5;
    await page.mouse.click(clickX, clickY);
  }
  
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'test-step4-after-click.png' });
  
  // Check if PinForm dialog appeared
  const pinFormTitle = page.getByText('新增图钉');
  const titleVisible = await pinFormTitle.isVisible().catch(() => false);
  
  console.log('PinForm title visible:', titleVisible);
  
  expect(titleVisible).toBe(true);
});
