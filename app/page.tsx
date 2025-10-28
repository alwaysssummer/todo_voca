import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">Todo Voca</h1>
          <p className="text-2xl text-gray-600">체크리스트 단어장</p>
          <p className="text-lg text-gray-500">
            단어 암기를 체크리스트처럼 하나씩 완료하세요
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/teacher/login"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            강사 로그인
          </Link>
        </div>

        <div className="pt-8">
          <p className="text-sm text-gray-500">
            학생은 강사가 제공한 링크로 접속하세요
          </p>
        </div>
      </div>
    </div>
  );
}

