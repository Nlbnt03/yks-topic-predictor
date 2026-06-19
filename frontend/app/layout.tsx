import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YKS 2026 Konu Tahmin Rehberi',
  description: '2018-2025 yıllarına dayalı YKS konu bazlı tahmini soru dağılımı ve çalışma öncelikleri',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 min-h-screen font-sans text-gray-900">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                YKS
              </div>
              <div className="leading-tight">
                <div className="font-bold text-gray-900 text-sm">Konu Tahmin Rehberi</div>
                <div className="text-xs text-gray-400">2026 Tahmini</div>
              </div>
            </a>
            <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1.5 font-medium">
              <span>⚠️</span>
              <span>İstatistiksel tahmin — kesin değildir</span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 min-h-[calc(100vh-3.5rem-80px)]">
          {children}
        </main>

        <footer className="border-t border-gray-100 bg-white mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-gray-400 space-y-1">
            <p>YKS Konu Tahmin Rehberi — 2018-2025 sınav verilerine dayalı istatistiksel analiz</p>
            <p>Bu sistem ÖSYM ile ilişkili değildir. Tahminler garanti niteliği taşımaz.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
