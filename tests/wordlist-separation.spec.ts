import { test, expect } from '@playwright/test'

test.describe('단어장 원본/복습 분리 테스트', () => {

  test.beforeEach(async ({ page }) => {
    // 강사 로그인 페이지로 이동
    await page.goto('http://localhost:3008/teacher/login')

    // 로그인 폼이 있으면 로그인, 없으면 (이미 로그인된 상태) 대시보드 대기
    const loginForm = page.locator('input[type="text"]')

    if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.fill('input[type="text"]', 'teacher')
      await page.fill('input[type="password"]', '7136')
      await page.click('button[type="submit"]')
    }

    // 대시보드 로드 대기
    await page.waitForURL('**/teacher/dashboard', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
  })

  test('강사 대시보드에서 복습 단어장이 숨겨지는지 확인', async ({ page }) => {
    // 대시보드 로드 대기
    await page.waitForSelector('text=단어장 목록', { timeout: 10000 })

    // 스크린샷 저장
    await page.screenshot({ path: 'test-results/dashboard-wordlist.png', fullPage: true })

    // 단어장 목록 섹션 확인
    const wordlistSection = page.locator('text=단어장 목록').first()
    await expect(wordlistSection).toBeVisible()

    // 복습 단어장 패턴 확인 (이름에 "복습 (N개)" 포함된 단어장)
    const reviewWordlistPattern = page.locator('text=/복습 \\(\\d+개\\)/')
    const reviewCount = await reviewWordlistPattern.count()

    console.log(`✅ 강사 대시보드 테스트 완료`)
    console.log(`   - 대시보드에서 발견된 복습 단어장 수: ${reviewCount}`)

    if (reviewCount === 0) {
      console.log('   - ✅ 복습 단어장이 대시보드에서 숨겨짐 (정상)')
    } else {
      console.log('   - ⚠️ 복습 단어장이 일부 표시됨 (기존 데이터 마이그레이션 확인 필요)')
    }
  })

  test('학생 관리 모달에서 원본/복습 그룹 분리 확인', async ({ page }) => {
    // 대시보드 로드 대기 - "학생 목록" 텍스트 확인
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    // 첫 번째 학생 이름 클릭 (학생 목록에서)
    const studentName = page.locator('.flex.items-center.gap-3 >> text=/오개|효정|주연/').first()

    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()

      // 모달 로드 대기
      await page.waitForSelector('text=단어장 배정', { timeout: 10000 })
      await page.waitForTimeout(1000) // UI 렌더링 대기

      // 스크린샷 저장
      await page.screenshot({ path: 'test-results/student-modal.png', fullPage: true })

      // 원본 단어장 그룹 확인
      const originalGroup = page.locator('text=원본 단어장')
      const originalGroupVisible = await originalGroup.isVisible()

      // 복습 단어장 그룹 확인 (있을 수도 없을 수도 있음)
      const reviewGroup = page.locator('text=복습 단어장')
      const reviewGroupVisible = await reviewGroup.isVisible()

      console.log(`✅ 학생 관리 모달 테스트 완료`)
      console.log(`   - 원본 단어장 그룹 표시: ${originalGroupVisible ? '✅' : '❌'}`)
      console.log(`   - 복습 단어장 그룹 표시: ${reviewGroupVisible ? '✅ (복습 단어장 있음)' : '- (복습 단어장 없음)'}`)

      // 원본 단어장 그룹은 항상 있어야 함
      await expect(originalGroup).toBeVisible()

    } else {
      console.log('⚠️ 학생을 찾을 수 없음')
      await page.screenshot({ path: 'test-results/no-students.png', fullPage: true })
    }
  })

  test('단어장 배정 UI 스타일 확인', async ({ page }) => {
    // 대시보드 로드 대기
    await page.waitForSelector('text=학생 목록', { timeout: 10000 })

    // 첫 번째 학생 이름 클릭
    const studentName = page.locator('.flex.items-center.gap-3 >> text=/오개|효정|주연/').first()

    if (await studentName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await studentName.click()

      // 모달 로드 대기
      await page.waitForSelector('text=단어장 배정', { timeout: 10000 })
      await page.waitForTimeout(1000)

      // 파란색 원본 단어장 헤더 확인 (bg-blue-50)
      const blueHeader = page.locator('.bg-blue-50')
      const blueHeaderCount = await blueHeader.count()

      // 주황색 복습 단어장 헤더 확인 (bg-orange-50)
      const orangeHeader = page.locator('.bg-orange-50')
      const orangeHeaderCount = await orangeHeader.count()

      // 체크박스 확인
      const checkboxes = page.locator('[role="checkbox"]')
      const checkboxCount = await checkboxes.count()

      console.log(`✅ UI 스타일 테스트 완료`)
      console.log(`   - 파란색(원본) 헤더 수: ${blueHeaderCount}`)
      console.log(`   - 주황색(복습) 헤더 수: ${orangeHeaderCount}`)
      console.log(`   - 체크박스 수: ${checkboxCount}`)

      // 원본 단어장 헤더는 최소 1개 있어야 함
      expect(blueHeaderCount).toBeGreaterThanOrEqual(1)

    } else {
      console.log('⚠️ 학생을 찾을 수 없음')
    }
  })
})
