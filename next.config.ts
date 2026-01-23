import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 빌드 최적화
  compiler: {
    // 프로덕션에서만 console.log 제거
    removeConsole: process.env.NODE_ENV === 'production'
  },

  // 성능 최적화
  poweredByHeader: false, // X-Powered-By 헤더 제거

  // 캐시 제어 헤더 추가
  async headers() {
    return [
      {
        // 정적 자산 (JS, CSS, 이미지) - 1년 캐시
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // HTML 페이지 - 재검증 필요
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

