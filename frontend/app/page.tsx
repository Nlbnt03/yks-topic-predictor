import Link from 'next/link';
import { Disclaimer } from '@/components/ui/Disclaimer';
import { FIELD_META } from '@/lib/utils';
import type { Field } from '@/lib/types';

const FIELDS: Field[] = ['SAYISAL', 'ESIT_AGIRLIK', 'SOZEL'];

const TYT_SUBJECTS = ['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Felsefe', 'Din Kültürü'];

const HOW_TO = [
  { step: '1', icon: '🎯', title: 'Alanını seç', desc: 'Sayısal, Eşit Ağırlık veya Sözel alanını seçerek başla.' },
  { step: '2', icon: '📊', title: 'TYT + AYT tahminlerini gör', desc: 'Her ders için tahmini soru sayısı, aralık ve önem sıralamasını incele.' },
  { step: '3', icon: '🔍', title: 'Konu detayına in', desc: 'Her konunun 2018-2025 arası geçmiş dağılımını ve trend bilgisini gör.' },
];

export default function HomePage() {
  return (
    <div className="space-y-12">

      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-100">
          📅 2026 YKS Sınav Dönemi
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          YKS Konu Tahmin Rehberi
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          2018-2025 yıllarındaki sınav verilerine dayalı konu bazlı tahmini soru dağılımı,
          çalışma öncelikleri ve trend analizi.
        </p>
      </section>

      {/* Disclaimer */}
      <Disclaimer />

      {/* Field Selection */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Alanını seç</h2>
        <p className="text-sm text-gray-500 mb-6">
          TYT tüm alanlar için ortaktır. AYT tahminleri aşağıda seçtiğin alana göre filtrelenir.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FIELDS.map(field => {
            const m = FIELD_META[field];
            return (
              <Link key={field} href={`/dashboard/${field}`} className="group">
                <div className={`rounded-2xl border-2 ${m.border} bg-white hover:shadow-lg hover:scale-[1.01] transition-all duration-200 overflow-hidden`}>
                  {/* Color header */}
                  <div className={`${m.bg} px-6 pt-6 pb-4`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{m.icon}</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Alan</p>
                        <h3 className={`text-2xl font-extrabold ${m.color}`}>{m.name}</h3>
                      </div>
                    </div>
                  </div>

                  {/* AYT subjects */}
                  <div className="px-6 py-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AYT Dersleri</p>
                    <ul className="space-y-1">
                      {m.aytSubjects.map(s => (
                        <li key={s} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${m.border.replace('border-', 'bg-')}`} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`px-6 py-3 border-t ${m.border} flex items-center justify-between ${m.bg}`}>
                    <span className={`text-sm font-semibold ${m.color}`}>Tahminleri incele</span>
                    <span className={`text-xl group-hover:translate-x-1 transition-transform ${m.color}`}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TYT common info */}
      <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="text-3xl">📋</span>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">TYT — Tüm Alanlar İçin Ortak</h3>
            <p className="text-sm text-gray-500 mb-3">
              TYT tahminleri alandaki tüm öğrenciler için aynıdır. 120 soruluk test aşağıdaki dersleri kapsar:
            </p>
            <div className="flex flex-wrap gap-2">
              {TYT_SUBJECTS.map(s => (
                <span key={s} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to use */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Nasıl kullanılır?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {HOW_TO.map(item => (
            <div key={item.step} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Explanation */}
      <section className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="font-bold text-blue-900 mb-3">📖 Tahmin Nasıl Hesaplanıyor?</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-semibold mb-1">Önem Skoru (0-100)</p>
            <p className="text-blue-700">Konunun geçmişte kaç yıl soru çıktığı, ortalama soru sayısı, trendi ve güven skoru birleştirilerek hesaplanır.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Tahmini Aralık</p>
            <p className="text-blue-700">Makine öğrenmesi modeli bir merkezi tahmin verir. Tarihsel standart sapma ile alt ve üst sınır hesaplanır.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Trend Etiketi</p>
            <p className="text-blue-700">Son yıllardaki konu soru sayısının lineer trendi: Artış, Azalış veya Stabil.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Güven Seviyesi</p>
            <p className="text-blue-700">Soruların zorluk bilgisinin sınıflandırılabilme oranına göre belirlenir. Yüksek güven = daha güvenilir veri.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
