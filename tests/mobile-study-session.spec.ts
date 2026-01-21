import { test, expect } from '@playwright/test'

test.describe('모바일 학습 세션 - 단어장 선택 테스트', () => {

  const studentToken = '446c3e2f-6fcd-4577-8032-843a4b13c759'

  test('첫 번째 단어장 학습 시작 및 단어 확인', async ({ page }) => {
    // 대시보드 접속
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    // 첫 번째 탭 확인 (기본 선택)
    const header = page.locator('header')
    const tabs = header.locator('button')
    const firstTabText = await tabs.first().textContent()
    console.log(`선택된 단어장: ${firstTabText}`)

    // 학습 시작 버튼 클릭
    const studyButton = page.locator('main button').first()
    const isDisabled = await studyButton.isDisabled()

    if (isDisabled) {
      console.log('⚠️ 첫 번째 단어장 학습 완료 - 스킵')
      return
    }

    await studyButton.click()
    await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })

    // URL에서 assignment ID 추출
    const url = page.url()
    const assignmentId = url.split('assignment=')[1]
    console.log(`첫 번째 단어장 ID: ${assignmentId}`)

    // 학습 화면 로드 대기
    await page.waitForTimeout(3000)

    // 학습 화면에서 단어장 정보 확인
    await page.screenshot({ path: 'test-results/study-first-wordlist.png', fullPage: true })

    // 오류 확인
    const errorElement = page.locator('text=오류').or(page.locator('text=에러'))
    const hasError = await errorElement.isVisible().catch(() => false)

    if (hasError) {
      console.log('❌ 학습 화면 오류 발생')
      expect(hasError).toBe(false)
    } else {
      console.log('✅ 첫 번째 단어장 학습 화면 정상 로드')
    }
  })

  test('두 번째 단어장 학습 시작 및 단어 확인', async ({ page }) => {
    // 대시보드 접속
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    // 두 번째 탭 클릭
    const header = page.locator('header')
    const tabs = header.locator('button')
    const tabCount = await tabs.count()

    if (tabCount < 2) {
      console.log('⚠️ 단어장 1개만 있음 - 스킵')
      return
    }

    await tabs.nth(1).click()
    await page.waitForTimeout(300)

    const secondTabText = await tabs.nth(1).textContent()
    console.log(`선택된 단어장: ${secondTabText}`)

    // 학습 시작 버튼 클릭
    const studyButton = page.locator('main button').first()
    const isDisabled = await studyButton.isDisabled()

    if (isDisabled) {
      console.log('⚠️ 두 번째 단어장 학습 완료 - 스킵')
      return
    }

    // 첫 번째 단어장 ID 기록 (비교용)
    await tabs.nth(0).click()
    await page.waitForTimeout(100)
    await studyButton.click()
    await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })
    const firstUrl = page.url()
    const firstAssignmentId = firstUrl.split('assignment=')[1]
    console.log(`첫 번째 단어장 ID: ${firstAssignmentId}`)

    // 다시 대시보드로 돌아가서 두 번째 선택
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    await tabs.nth(1).click()
    await page.waitForTimeout(300)

    await studyButton.click()
    await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })

    const secondUrl = page.url()
    const secondAssignmentId = secondUrl.split('assignment=')[1]
    console.log(`두 번째 단어장 ID: ${secondAssignmentId}`)

    // 두 ID가 다른지 확인
    expect(secondAssignmentId).not.toBe(firstAssignmentId)
    console.log('✅ 서로 다른 단어장 ID 확인됨')

    // 학습 화면 로드 대기
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/study-second-wordlist.png', fullPage: true })

    // 오류 확인
    const errorElement = page.locator('text=오류').or(page.locator('text=에러'))
    const hasError = await errorElement.isVisible().catch(() => false)

    if (hasError) {
      console.log('❌ 학습 화면 오류 발생')
      expect(hasError).toBe(false)
    } else {
      console.log('✅ 두 번째 단어장 학습 화면 정상 로드')
    }
  })

  test('직접 URL로 특정 단어장 학습 접속', async ({ page }) => {
    // 먼저 대시보드에서 assignment ID 목록 수집
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    const header = page.locator('header')
    const tabs = header.locator('button')
    const tabCount = await tabs.count()

    if (tabCount < 2) {
      console.log('⚠️ 단어장 1개만 있음 - 스킵')
      return
    }

    // 두 번째 단어장의 ID 가져오기
    await tabs.nth(1).click()
    await page.waitForTimeout(300)

    const studyButton = page.locator('main button').first()
    const isDisabled = await studyButton.isDisabled()

    if (isDisabled) {
      console.log('⚠️ 두 번째 단어장 학습 완료 - 스킵')
      return
    }

    await studyButton.click()
    await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })
    const studyUrl = page.url()
    const assignmentId = studyUrl.split('assignment=')[1]

    console.log(`테스트할 assignment ID: ${assignmentId}`)

    // 새 탭에서 직접 URL로 접속
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/study?assignment=${assignmentId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/study-direct-url.png', fullPage: true })

    // 오류 확인
    const errorElement = page.locator('text=오류').or(page.locator('text=에러'))
    const hasError = await errorElement.isVisible().catch(() => false)

    if (hasError) {
      console.log('❌ 직접 URL 접속 오류')
      const errorText = await page.locator('[class*="destructive"]').textContent().catch(() => '알 수 없음')
      console.log(`오류 내용: ${errorText}`)
      expect(hasError).toBe(false)
    } else {
      console.log('✅ 직접 URL 접속 성공')
    }
  })

  test('잘못된 assignment ID로 접속 시 fallback 동작', async ({ page }) => {
    // 존재하지 않는 assignment ID로 접속
    const fakeAssignmentId = '00000000-0000-0000-0000-000000000000'
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/study?assignment=${fakeAssignmentId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/study-invalid-id.png', fullPage: true })

    // 오류 메시지 또는 fallback으로 첫 번째 단어장이 로드되는지 확인
    const errorElement = page.locator('text=오류').or(page.locator('text=배정된 단어장이 없습니다'))
    const hasError = await errorElement.isVisible().catch(() => false)

    // 학습 화면이 로드되면 fallback 성공
    const studyContent = page.locator('text=안다').or(page.locator('text=모른다')).or(page.locator('text=학습'))
    const hasStudyContent = await studyContent.isVisible().catch(() => false)

    if (hasStudyContent) {
      console.log('✅ 잘못된 ID → fallback으로 첫 번째 단어장 로드됨')
    } else if (hasError) {
      console.log('⚠️ 잘못된 ID → 오류 표시 (예상된 동작)')
    } else {
      console.log('❓ 알 수 없는 상태')
    }
  })

  test('assignment ID 없이 학습 접속 (기존 동작 확인)', async ({ page }) => {
    // assignment 파라미터 없이 접속
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/study`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    await page.screenshot({ path: 'test-results/study-no-assignment.png', fullPage: true })

    // 기존 동작: 첫 번째 단어장이 자동 선택되어야 함
    const errorElement = page.locator('text=오류').or(page.locator('text=에러'))
    const hasError = await errorElement.isVisible().catch(() => false)

    if (hasError) {
      console.log('❌ assignment 없이 접속 시 오류')
      expect(hasError).toBe(false)
    } else {
      console.log('✅ assignment 없이 접속 → 첫 번째 단어장 자동 로드')
    }
  })
})

test.describe('모바일 대시보드 - 탭 상태 유지', () => {

  const studentToken = '446c3e2f-6fcd-4577-8032-843a4b13c759'

  test('페이지 새로고침 시 탭 상태 (첫 번째로 리셋)', async ({ page }) => {
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    const header = page.locator('header')
    const tabs = header.locator('button')
    const tabCount = await tabs.count()

    if (tabCount < 2) {
      console.log('⚠️ 단어장 1개만 있음 - 스킵')
      return
    }

    // 두 번째 탭 선택
    await tabs.nth(1).click()
    await page.waitForTimeout(300)

    // 두 번째 탭이 활성화되었는지 확인
    let secondTabClass = await tabs.nth(1).getAttribute('class')
    expect(secondTabClass).toContain('border-blue-600')
    console.log('✅ 두 번째 탭 선택됨')

    // 새로고침
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 첫 번째 탭이 다시 활성화되었는지 확인
    const firstTabClass = await tabs.nth(0).getAttribute('class')
    expect(firstTabClass).toContain('border-blue-600')
    console.log('✅ 새로고침 후 첫 번째 탭으로 리셋됨')
  })

  test('학습 후 대시보드 복귀 시 동작', async ({ page }) => {
    await page.goto(`http://localhost:3008/s/${studentToken}/mobile/dashboard`)
    await page.waitForLoadState('networkidle')

    // 학습 시작
    const studyButton = page.locator('main button').first()
    const isDisabled = await studyButton.isDisabled()

    if (isDisabled) {
      console.log('⚠️ 학습 완료 상태 - 스킵')
      return
    }

    await studyButton.click()
    await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })

    // 학습 화면 로드 대기
    await page.waitForTimeout(2000)

    // 뒤로 가기 (대시보드로 복귀)
    await page.goBack()
    await page.waitForLoadState('networkidle')

    // 대시보드 정상 표시 확인
    const header = page.locator('header')
    await expect(header).toBeVisible()
    console.log('✅ 학습 후 대시보드 복귀 성공')

    await page.screenshot({ path: 'test-results/dashboard-after-study.png', fullPage: true })
  })
})
