import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 프로덕션 빌드 최적화
  compiler: {
    // 프로덕션에서 console.log 제거 (error, warn은 유지)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  
  // 성능 최적화
  poweredByHeader: false, // X-Powered-By 헤더 제거
  
  // 이미지 최적화 (필요 시 Supabase Storage 도메인 추가)
  // images: {
  //   domains: ['your-supabase-project.supabase.co'],
  // },
};

export default nextConfig;

