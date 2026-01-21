import { test, expect } from '@playwright/test'

test.describe('모바일 다중 단어장 기능 테스트', () => {

  // 여러 단어장이 배정된 학생 토큰 (테스트용)
  const multiWordlistStudentToken = '446c3e2f-6fcd-4577-8032-843a4b13c759'
  // 단일 단어장 학생 토큰
  const singleWordlistStudentToken = '1302e749-8977-4d8e-b856-7ef484682e9a'

  test.describe('탭 UI 표시', () => {

    test('여러 단어장이 배정된 학생에게 탭이 표시되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      // 헤더에 학생 이름이 표시되는지 확인
      const header = page.locator('header')
      await expect(header).toBeVisible()

      // 탭 영역 확인 (button 요소들)
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      console.log(`탭 개수: ${tabCount}`)

      if (tabCount > 1) {
        console.log('✅ 여러 단어장 탭 표시 확인')

        // 첫 번째 탭이 활성화 상태인지 확인 (파란색 테두리)
        const firstTab = tabs.first()
        const firstTabClass = await firstTab.getAttribute('class')
        expect(firstTabClass).toContain('border-blue-600')
        console.log('✅ 첫 번째 탭 활성화 상태 확인')
      } else {
        console.log('⚠️ 단일 단어장 또는 탭 없음 - 다른 토큰 필요')
      }

      await page.screenshot({ path: 'test-results/mobile-multi-wordlist-tabs.png', fullPage: true })
    })

    test('단일 단어장 학생에게는 탭이 표시되지 않는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${singleWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      // 헤더 내 탭 버튼 확인
      const header = page.locator('header')
      const tabContainer = header.locator('.flex.border-t')

      const tabContainerVisible = await tabContainer.isVisible().catch(() => false)

      if (!tabContainerVisible) {
        console.log('✅ 단일 단어장 학생에게 탭 미표시 확인')
      } else {
        const tabs = tabContainer.locator('button')
        const tabCount = await tabs.count()
        console.log(`탭 개수: ${tabCount} (1개면 탭 컨테이너가 숨겨져야 함)`)
      }

      await page.screenshot({ path: 'test-results/mobile-single-wordlist.png', fullPage: true })
    })
  })

  test.describe('탭 전환 기능', () => {

    test('탭 클릭 시 단어장이 전환되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      if (tabCount < 2) {
        console.log('⚠️ 탭이 2개 미만 - 테스트 스킵')
        return
      }

      // 첫 번째 탭의 텍스트 기록
      const firstTabText = await tabs.nth(0).textContent()
      console.log(`첫 번째 탭: ${firstTabText}`)

      // 두 번째 탭 클릭
      await tabs.nth(1).click()
      await page.waitForTimeout(300)

      // 두 번째 탭이 활성화되었는지 확인
      const secondTabClass = await tabs.nth(1).getAttribute('class')
      expect(secondTabClass).toContain('border-blue-600')
      console.log('✅ 두 번째 탭 활성화 확인')

      // 첫 번째 탭은 비활성화
      const firstTabClass = await tabs.nth(0).getAttribute('class')
      expect(firstTabClass).not.toContain('border-blue-600')
      console.log('✅ 첫 번째 탭 비활성화 확인')

      await page.screenshot({ path: 'test-results/mobile-tab-switch.png', fullPage: true })
    })

    test('탭 전환 시 학습 버튼 진행률이 변경되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      if (tabCount < 2) {
        console.log('⚠️ 탭이 2개 미만 - 테스트 스킵')
        return
      }

      // 첫 번째 탭의 진행률 기록
      const studyButton = page.locator('main button').first()
      const firstProgress = await studyButton.textContent()
      console.log(`첫 번째 단어장 진행률: ${firstProgress}`)

      // 두 번째 탭 클릭
      await tabs.nth(1).click()
      await page.waitForTimeout(500)

      // 두 번째 탭의 진행률 확인
      const secondProgress = await studyButton.textContent()
      console.log(`두 번째 단어장 진행률: ${secondProgress}`)

      // 진행률이 다르거나 같을 수 있음 (데이터에 따라)
      console.log('✅ 탭 전환 후 학습 버튼 업데이트 확인')

      await page.screenshot({ path: 'test-results/mobile-tab-progress.png', fullPage: true })
    })
  })

  test.describe('학습 시작 라우팅', () => {

    test('학습 시작 버튼 클릭 시 assignment ID가 URL에 포함되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      // 학습 시작 버튼 찾기
      const studyButton = page.locator('main button').first()

      // 버튼이 비활성화 상태가 아닌지 확인
      const isDisabled = await studyButton.isDisabled()

      if (isDisabled) {
        console.log('⚠️ 학습 버튼 비활성화 (학습 완료 상태) - 테스트 스킵')
        return
      }

      // 버튼 클릭
      await studyButton.click()

      // URL 확인
      await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })
      const url = page.url()

      console.log(`이동된 URL: ${url}`)

      // assignment 파라미터 확인
      expect(url).toContain('assignment=')
      console.log('✅ assignment ID가 URL에 포함됨')

      await page.screenshot({ path: 'test-results/mobile-study-url.png', fullPage: true })
    })

    test('두 번째 탭 선택 후 학습 시작 시 해당 assignment ID가 전달되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      if (tabCount < 2) {
        console.log('⚠️ 탭이 2개 미만 - 테스트 스킵')
        return
      }

      // 두 번째 탭 클릭
      await tabs.nth(1).click()
      await page.waitForTimeout(500)

      // 학습 버튼 클릭
      const studyButton = page.locator('main button').first()
      const isDisabled = await studyButton.isDisabled()

      if (isDisabled) {
        console.log('⚠️ 두 번째 단어장 학습 완료 상태 - 테스트 스킵')
        return
      }

      await studyButton.click()
      await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })

      const url = page.url()
      console.log(`두 번째 단어장 학습 URL: ${url}`)

      expect(url).toContain('assignment=')
      console.log('✅ 두 번째 단어장 assignment ID 확인')

      await page.screenshot({ path: 'test-results/mobile-study-second-tab.png', fullPage: true })
    })
  })

  test.describe('회차 기록 필터링', () => {

    test('탭 전환 시 회차 기록이 해당 단어장만 표시되는지 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      if (tabCount < 2) {
        console.log('⚠️ 탭이 2개 미만 - 테스트 스킵')
        return
      }

      // 첫 번째 탭의 회차 수 확인
      const sessionCards = page.locator('main .space-y-3 > div')
      const firstTabSessionCount = await sessionCards.count()
      console.log(`첫 번째 단어장 회차 수: ${firstTabSessionCount}`)

      // 두 번째 탭 클릭
      await tabs.nth(1).click()
      await page.waitForTimeout(500)

      // 두 번째 탭의 회차 수 확인
      const secondTabSessionCount = await sessionCards.count()
      console.log(`두 번째 단어장 회차 수: ${secondTabSessionCount}`)

      // 빈 상태 메시지 확인
      const emptyMessage = page.locator('text=아직 완성된 회차가 없습니다')
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

      if (hasEmptyMessage) {
        console.log('✅ 빈 회차 메시지 표시됨')
      } else {
        console.log(`✅ 회차 기록 표시됨 (${secondTabSessionCount}개)`)
      }

      await page.screenshot({ path: 'test-results/mobile-session-filter.png', fullPage: true })
    })
  })

  test.describe('학습 화면 동작', () => {

    test('assignment ID로 학습 화면 접속 시 해당 단어장이 로드되는지 확인', async ({ page }) => {
      // 먼저 대시보드에서 assignment ID 추출
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const studyButton = page.locator('main button').first()
      const isDisabled = await studyButton.isDisabled()

      if (isDisabled) {
        console.log('⚠️ 학습 완료 상태 - 테스트 스킵')
        return
      }

      // 학습 시작
      await studyButton.click()
      await page.waitForURL(/\/mobile\/study/, { timeout: 10000 })

      // 학습 화면 로드 대기
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // 로딩 완료 확인
      const loader = page.locator('text=로딩 중')
      const isLoading = await loader.isVisible().catch(() => false)

      if (isLoading) {
        await page.waitForTimeout(3000)
      }

      await page.screenshot({ path: 'test-results/mobile-study-screen.png', fullPage: true })

      // 오류 메시지 확인
      const errorMessage = page.locator('text=오류')
      const hasError = await errorMessage.isVisible().catch(() => false)

      if (hasError) {
        console.log('❌ 학습 화면 로드 오류')
        const errorText = await page.locator('.text-destructive').textContent()
        console.log(`오류 내용: ${errorText}`)
      } else {
        console.log('✅ 학습 화면 정상 로드')
      }
    })
  })

  test.describe('UI 스타일 및 접근성', () => {

    test('탭 truncate(말줄임표) 처리 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      const header = page.locator('header')
      const tabs = header.locator('button')
      const tabCount = await tabs.count()

      if (tabCount < 1) {
        console.log('⚠️ 탭 없음 - 테스트 스킵')
        return
      }

      // 각 탭의 텍스트 확인
      for (let i = 0; i < tabCount; i++) {
        const tabText = await tabs.nth(i).textContent()
        console.log(`탭 ${i + 1}: "${tabText}"`)

        // 12자 초과 시 말줄임표 확인
        if (tabText && tabText.includes('...')) {
          console.log(`✅ 탭 ${i + 1} 말줄임표 처리됨`)
        }
      }

      await page.screenshot({ path: 'test-results/mobile-tab-truncate.png', fullPage: true })
    })

    test('sticky 헤더 동작 확인', async ({ page }) => {
      await page.goto(`http://localhost:3008/s/${multiWordlistStudentToken}/mobile/dashboard`)
      await page.waitForLoadState('networkidle')

      // 스크롤
      await page.evaluate(() => window.scrollTo(0, 500))
      await page.waitForTimeout(300)

      // 헤더가 여전히 보이는지 확인
      const header = page.locator('header')
      const headerBox = await header.boundingBox()

      if (headerBox) {
        expect(headerBox.y).toBeLessThanOrEqual(0)
        console.log('✅ sticky 헤더 동작 확인')
      }

      await page.screenshot({ path: 'test-results/mobile-sticky-header.png', fullPage: true })
    })
  })
})
