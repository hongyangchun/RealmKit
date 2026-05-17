import { test, expect } from '@playwright/test';

test.describe('世界圣典功能测试', () => {
  test('首页仪表盘正常加载', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/世界圣典/);
    // 检查侧边栏
    await expect(page.locator('nav, aside, [class*="sidebar"]')).toBeVisible();
  });

  test('人物卡片页面加载', async ({ page }) => {
    await page.goto('http://localhost:5173/characters');
    await expect(page.getByText(/人物|角色|Character/i)).toBeVisible();
  });

  test('时间轴页面加载', async ({ page }) => {
    await page.goto('http://localhost:5173/timeline');
    await expect(page.getByText(/时间轴|事件|Event/i)).toBeVisible();
  });

  test('地图页面加载', async ({ page }) => {
    await page.goto('http://localhost:5173/map');
    await expect(page.getByText(/地图|Map/i)).toBeVisible();
  });

  test('关系图页面加载', async ({ page }) => {
    await page.goto('http://localhost:5173/graph');
    await expect(page.getByText(/关系|Graph/i)).toBeVisible();
  });
});
