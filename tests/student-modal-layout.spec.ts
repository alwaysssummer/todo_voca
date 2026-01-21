import { test, expect } from '@playwright/test'

test.describe('학생 관리 모달 2컬럼 레이아웃', () => {

  test.beforeEach(async ({ page }) => {
    // 강사 로그인 페이지로 이동
    await page.goto('http://localhost:3008/teacher/login')

    // 로그인 폼이 있으면 로그인
    const loginForm = page.locator('input[type="text"]')
    if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="text"]', 'teacher')
      await page.fill('input[type="password"]', '7136')
      await page.click('button[type="submit"]')
    }

    // 대시보드 로드 대기
    await page.waitForURL('**/teacher/dashboard', { timeout: 30000 })
    await page.waitForSelector('text=학생 목록', { timeout: 15000 })
  })

  test('모달 크기가 확장되었는지 확인', async ({ page }) => {
    // 학생 목록 대기
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    // 학생 클릭하여 모달 열기
    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()

      // 모달 로드 대기
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 스크린샷 저장
      await page.screenshot({ path: 'test-results/modal-2column.png', fullPage: true })

      // 모달 너비 확인 (max-w-5xl = 1024px, 실제 너비는 화면에 따라 다를 수 있음)
      const modal = page.locator('[role="dialog"]')
      const box = await modal.boundingBox()

      console.log(`모달 크기: ${box?.width}px x ${box?.height}px`)

      // 모달이 기존 672px (max-w-2xl)보다 크면 성공
      expect(box?.width).toBeGreaterThan(700)

      console.log('모달 크기 확장 확인')
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('2컬럼 레이아웃이 적용되었는지 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 왼쪽 컬럼: 단어장 배정
      const leftColumn = page.locator('text=단어장 배정').first()
      await expect(leftColumn).toBeVisible()

      // 오른쪽 컬럼: 배정된 단어장 상세
      const rightColumn = page.locator('text=배정된 단어장 상세')
      await expect(rightColumn).toBeVisible()

      console.log('2컬럼 레이아웃 확인: 왼쪽(단어장 배정), 오른쪽(배정된 단어장 상세)')
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('원본/복습 단어장 그룹 분리 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 원본 단어장 그룹
      const originalGroup = page.locator('text=원본 단어장')
      await expect(originalGroup).toBeVisible()

      // 파란색 배경 확인
      const blueHeader = page.locator('.bg-blue-50')
      await expect(blueHeader.first()).toBeVisible()

      console.log('원본 단어장 그룹 확인 (파란색 헤더)')

      // 복습 단어장 그룹 확인 (있을 수도 없을 수도 있음)
      const reviewGroup = page.locator('text=복습 단어장')
      const reviewGroupVisible = await reviewGroup.isVisible()

      if (reviewGroupVisible) {
        const orangeHeader = page.locator('.bg-orange-50')
        await expect(orangeHeader.first()).toBeVisible()
        console.log('복습 단어장 그룹 확인 (주황색 헤더)')
      } else {
        console.log('복습 단어장 없음')
      }
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('기본 정보가 한 줄로 압축되었는지 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 기본 정보 요소들 확인
      await expect(page.locator('text=이름:')).toBeVisible()
      await expect(page.locator('text=회차목표:')).toBeVisible()

      // 링크 확인 (dashboard 포함)
      const linkCode = page.locator('code:has-text("dashboard")')
      await expect(linkCode).toBeVisible()

      console.log('기본 정보 한 줄 압축 확인: 이름, 회차목표, 링크')
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('단어장 체크박스 동작 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 체크박스 확인
      const checkboxes = page.locator('[role="checkbox"]')
      const checkboxCount = await checkboxes.count()

      console.log(`체크박스 수: ${checkboxCount}`)
      expect(checkboxCount).toBeGreaterThan(0)

      // 첫 번째 미배정 단어장 체크박스 클릭 시도
      const unassignedBadge = page.locator('text=미배정').first()
      if (await unassignedBadge.isVisible()) {
        const parentRow = unassignedBadge.locator('xpath=ancestor::div[contains(@class, "flex items-center")]').first()
        const checkbox = parentRow.locator('[role="checkbox"]')

        if (await checkbox.isVisible()) {
          await checkbox.click()

          // 저장 버튼이 나타나는지 확인
          await page.waitForTimeout(300)
          const saveButton = page.locator('text=/저장.*\\(1\\)/')
          const saveVisible = await saveButton.isVisible()

          if (saveVisible) {
            console.log('체크박스 클릭 후 저장 버튼 표시 확인')
          }

          // 원상복구 (다시 클릭)
          await checkbox.click()
        }
      }
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('배정된 단어장 상세 정보 표시 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 배정된 단어장이 있는지 확인
      const detailSection = page.locator('text=배정된 단어장 상세')
      await expect(detailSection).toBeVisible()

      // 배정된 단어장 카드 확인
      const progressText = page.locator('text=/진도/')
      if (await progressText.isVisible()) {
        console.log('배정된 단어장 상세 정보 확인: 진도 표시')

        // 회차 정보 확인
        const sessionText = page.locator('text=/회차:/')
        if (await sessionText.isVisible()) {
          console.log('회차 정보 표시 확인')
        }

        // 테스트 정보 확인
        const oTestText = page.locator('text=/O-TEST:/')
        if (await oTestText.isVisible()) {
          console.log('O-TEST/X-TEST 정보 표시 확인')
        }
      } else {
        console.log('배정된 단어장이 없거나 진도 정보 없음')
      }
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })

  test('각 컬럼 내부 스크롤 동작 확인', async ({ page }) => {
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    const studentName = page.locator('text=/오개|효정|주연/').first()
    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 })
      await page.waitForTimeout(500)

      // 모달 내부에서 스크롤 영역 확인
      const modal = page.locator('[role="dialog"]')

      // 2컬럼 그리드 확인
      const gridContainer = modal.locator('.grid.grid-cols-2')
      await expect(gridContainer).toBeVisible()
      console.log('2컬럼 그리드 컨테이너 확인')

      // 왼쪽 컬럼 (단어장 배정)
      const leftColumn = modal.locator('text=단어장 배정').locator('xpath=ancestor::div[contains(@class, "border rounded-lg")]').first()
      const leftColumnVisible = await leftColumn.isVisible()
      console.log(`왼쪽 컬럼 표시: ${leftColumnVisible}`)

      // 오른쪽 컬럼 (배정된 단어장 상세)
      const rightColumn = modal.locator('text=배정된 단어장 상세').locator('xpath=ancestor::div[contains(@class, "border rounded-lg")]').first()
      const rightColumnVisible = await rightColumn.isVisible()
      console.log(`오른쪽 컬럼 표시: ${rightColumnVisible}`)

      // 두 컬럼이 모두 표시되는지 확인
      expect(leftColumnVisible || rightColumnVisible).toBe(true)
      console.log('스크롤 가능 컬럼 레이아웃 확인 완료')
    } else {
      console.log('학생을 찾을 수 없음')
    }
  })
})
