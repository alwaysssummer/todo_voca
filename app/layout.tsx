import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Todo Voca - 체크리스트 단어장",
  description: "단어 암기를 할 일(To-Do) 프로젝트로 관리하는 학원 관리 플랫폼",
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='g' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='%23ff5656'/><stop offset='100%' stop-color='%23d91c1c'/></linearGradient></defs><rect width='128' height='128' rx='24' fill='url(%23g)'/><text x='64' y='88' fill='%23ffffff' font-family='Inter, sans-serif' font-size='72' font-weight='700' text-anchor='middle'>VO</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

