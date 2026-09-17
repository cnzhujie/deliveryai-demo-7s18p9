import { expect, test, type Locator, type Page } from '@playwright/test'

const DARK_TOGGLE = /切换至夜间模式|Switch to dark mode/
const LIGHT_TOGGLE = /切换至浅色模式|Switch to light mode/

async function expectTheme(page: Page, theme: 'light' | 'dark') {
  const root = page.locator('html')
  if (theme === 'dark') await expect(root).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
  else await expect(root).not.toHaveClass(/(?:^|\s)dark(?:\s|$)/)
  await expect(root).toHaveCSS('color-scheme', theme)
  await expect(page.getByRole('button', { name: theme === 'dark' ? LIGHT_TOGGLE : DARK_TOGGLE })).toBeVisible()
}

async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
  await expect(page.getByRole('button', { name: /切换语言|Switch language/ })).toBeVisible()
}

async function expectDarkSurface(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect.poll(async () => {
    const color = await locator.evaluate((element) => getComputedStyle(element).backgroundColor)
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
    return channels.length === 3 ? Math.max(...channels) : 255
  }, { message: 'Expected the surface transition to settle on a dark background' }).toBeLessThan(90)
}

async function expectTextContrast(locator: Locator, minimum = 4.5) {
  const result = await locator.evaluate((element) => {
    const parse = (value: string) => {
      const values = value.match(/[\d.]+/g)?.map(Number) ?? []
      return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 }
    }
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((channel) => {
        const value = channel / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }
    const foreground = parse(getComputedStyle(element).color).rgb
    let current: Element | null = element
    let background = [0, 0, 0]
    while (current) {
      const parsed = parse(getComputedStyle(current).backgroundColor)
      if (parsed.alpha === 1) { background = parsed.rgb; break }
      current = current.parentElement
    }
    const light = Math.max(luminance(foreground), luminance(background))
    const dark = Math.min(luminance(foreground), luminance(background))
    return { foreground, background, ratio: (light + 0.05) / (dark + 0.05) }
  })
  expect(result.ratio, `Contrast ${result.foreground.join(',')} / ${result.background.join(',')}`).toBeGreaterThanOrEqual(minimum)
}

test.describe('SPEC-DARK-MODE-001 夜间模式', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('REQ-001/002/003: 默认浅色、键盘双向切换并在刷新和新页面中恢复', async ({ page, context }) => {
    await page.goto('/')
    await expectTheme(page, 'light')

    await page.getByRole('button', { name: DARK_TOGGLE }).focus()
    await page.keyboard.press('Enter')
    await expectTheme(page, 'dark')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('display-theme'))).toBe('dark')

    await page.reload()
    await expectTheme(page, 'dark')
    const reopened = await context.newPage()
    await reopened.goto('/')
    await expectTheme(reopened, 'dark')

    await reopened.getByRole('button', { name: LIGHT_TOGGLE }).click()
    await expectTheme(reopened, 'light')
    await reopened.reload()
    await expectTheme(reopened, 'light')
  })

  test('REQ-001/003/012: 绑定页与欢迎页可切换，且切换不丢失当前视图', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: DARK_TOGGLE }).click()
    await expectDarkSurface(page.locator('body'))
    await expectTextContrast(page.getByRole('heading').first())

    await page.getByRole('button', { name: /A08/ }).first().click()
    await expect(page.getByRole('button', { name: /进入点餐|Enter/ })).toBeVisible()
    await expectTheme(page, 'dark')
    await page.getByRole('button', { name: LIGHT_TOGGLE }).click()
    await expect(page.getByRole('button', { name: /进入点餐|Enter/ })).toBeVisible()
    await expectTheme(page, 'light')
  })

  test('REQ-003/004/005/006/007/009: 菜单、会员、规格、风险和桌边服务浮层完成夜间适配', async ({ page }) => {
    await enterMenu(page)
    await page.getByRole('button', { name: DARK_TOGGLE }).click()
    await expectDarkSurface(page.locator('body'))

    await page.getByRole('button', { name: /会员与排号|Membership & Queue/ }).click()
    let dialog = page.getByRole('dialog')
    await expectDarkSurface(dialog)
    await expectTextContrast(dialog.getByRole('heading'))
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: '锅底' }).click()
    await page.locator('article').first().locator('button').last().click()
    dialog = page.getByRole('dialog')
    await expectDarkSurface(dialog)
    await page.getByRole('button', { name: '超级辣' }).click()
    const warning = page.getByRole('dialog').last()
    await expectDarkSurface(warning)
    await expectTextContrast(warning.getByText(/辣度极高/))
    await page.getByRole('button', { name: '重新选择' }).click()
    await expect(dialog).toBeVisible()
    await expect(page.locator('html')).toHaveClass(/(?:^|\s)dark(?:\s|$)/)
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /呼叫服务|Call Service/ }).click()
    dialog = page.getByRole('dialog')
    await expectDarkSurface(dialog)
    await expect(dialog.getByRole('button').filter({ hasText: /加汤|Broth/ }).first()).toBeVisible()
  })

  test('REQ-003/004/005/009: 移动购物车、订单和结账页保持夜间模式与业务状态', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/?preview=menu')
    await page.getByRole('button', { name: DARK_TOGGLE }).click()
    await page.getByRole('button', { name: /查看购物车|View cart/ }).click()
    const dialog = page.getByRole('dialog')
    await expectDarkSurface(dialog)
    await expect(dialog.getByText(/姚乾/)).toBeVisible()
    await dialog.getByRole('button', { name: /提交加菜|Submit Additional/ }).click()

    await expect(page.getByRole('heading', { name: /这一锅，正在抵达|Your pot is on the way/ })).toBeVisible()
    await expectTheme(page, 'dark')
    await expectDarkSurface(page.locator('body'))
    const checkoutButton = page.getByRole('button', { name: /去结账|Checkout/ })
    await checkoutButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: /核对本桌账单|Review Your Bill/ })).toBeVisible()
    await expectTheme(page, 'dark')
    await expectDarkSurface(page.locator('body'))
  })

  test('REQ-004/008: 英文、老人模式与夜间模式可组合，焦点和文字对比度清晰', async ({ page }) => {
    await enterMenu(page)
    await page.getByRole('button', { name: '切换语言' }).click()
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await page.getByRole('button', { name: '切换至老人模式' }).click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveClass(/elderly/)
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
    const languageButton = page.getByRole('button', { name: 'Switch language' })
    await page.getByRole('button', { name: '切换至常规模式' }).focus()
    await page.keyboard.press('Tab')
    await expect(languageButton).toBeFocused()
    await expect.poll(async () => languageButton.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none')
    await expectTextContrast(page.getByRole('heading', { name: /What shall we order/ }))
  })

  test('REQ-002.3/002.4: 非法偏好回退浅色，本地存储异常时仍可会话内切换', async ({ browser }) => {
    const invalidContext = await browser.newContext()
    await invalidContext.addInitScript(() => localStorage.setItem('display-theme', 'system'))
    const invalidPage = await invalidContext.newPage()
    await invalidPage.goto('/')
    await expectTheme(invalidPage, 'light')
    await invalidContext.close()

    const blockedContext = await browser.newContext()
    await blockedContext.addInitScript(() => {
      Object.defineProperty(Storage.prototype, 'getItem', { configurable: true, value: () => { throw new Error('storage disabled') } })
      Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: () => { throw new Error('storage disabled') } })
    })
    const blockedPage = await blockedContext.newPage()
    await blockedPage.goto('/')
    await expectTheme(blockedPage, 'light')
    await blockedPage.getByRole('button', { name: DARK_TOGGLE }).click()
    await expectTheme(blockedPage, 'dark')
    await expect(blockedPage.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await blockedContext.close()
  })
})
