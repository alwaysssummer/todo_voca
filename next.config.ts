import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 빌드 최적화
  compiler: {
    // 디버깅을 위해 일시적으로 console.log 제거 비활성화
    removeConsole: false
  },
  
  // 성능 최적화
  poweredByHeader: false, // X-Powered-By 헤더 제거
  
  // 캐시 제어 헤더 추가 (자동 로그인 디버깅용)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ]
  },
  
  // 이미지 최적화 (필요 시 Supabase Storage 도메인 추가)
  // images: {
  //   domains: ['your-supabase-project.supabase.co'],
  // },
};

export default nextConfig;

