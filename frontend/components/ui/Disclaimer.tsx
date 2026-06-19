export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <span>⚠️</span>
        <span>Bu tahminler geçmiş yıl verilerine dayanır; kesin soru garantisi vermez.</span>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="font-semibold text-amber-800 mb-1">Önemli Bilgi</p>
          <p className="text-sm text-amber-700">
            Bu sistem <strong>kesin soru tahmini yapmaz.</strong> 2018-2025 yıllarındaki konu
            dağılımlarına dayalı istatistiksel bir rehberdir. Tahminler ÖSYM'nin gelecekteki kararlarını
            yansıtmaz. "Tahmini soru aralığı" ve "önem skoru" ifadeleri çalışma önceliği belirlemeye
            yöneliktir.
          </p>
        </div>
      </div>
    </div>
  );
}
