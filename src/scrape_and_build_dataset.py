"""
Universitego.com'dan TYT/AYT konu-soru dağılımlarını scrape eder,
yks_dataset.csv'yi doğru verilerle yeniden oluşturur ve pipeline'ı çalıştırır.

Düzeltmeler:
- BeautifulSoup ile sağlam tablo parse
- TYT konuları SADECE field=ALL (çoğaltma yok)
- AYT ortak dersler (Mat, Geo, Edebiyat, Tarih-1, Coğrafya-1) doğru alanlara
- Eksik yıllar (Din Kültürü 2025 yok) sessizce atlanır
- Felsefe Grubu konu adı vs sayı karışıklığı düzeltildi
"""

import sys, re, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import numpy as np
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR  = BASE_DIR / "data" / "raw"
OUT_CSV  = RAW_DIR / "yks_dataset.csv"
URL = "https://www.universitego.com/tyt-ayt-konu-soru-dagilimlari/"

# ─── Tablo numarası → (session, başlangıç_field, subject) ─────────────────
# AYT için ortak dersler aşağıda EXTRA_FIELDS ile eklenir
TABLE_MAP = {
    # TYT — TÜM ALAN → field = ALL (kesinlikle çoğaltma YOK)
    1:  ("TYT", "ALL",          "Türkçe"),
    2:  ("TYT", "ALL",          "Matematik"),
    3:  ("TYT", "ALL",          "Geometri"),
    4:  ("TYT", "ALL",          "Tarih"),
    5:  ("TYT", "ALL",          "Coğrafya"),
    6:  ("TYT", "ALL",          "Felsefe"),
    7:  ("TYT", "ALL",          "Din Kültürü ve Ahlak Bilgisi"),
    8:  ("TYT", "ALL",          "Fizik"),
    9:  ("TYT", "ALL",          "Kimya"),
    10: ("TYT", "ALL",          "Biyoloji"),
    # AYT
    11: ("AYT", "SAYISAL",      "Matematik"),          # + ESIT_AGIRLIK
    12: ("AYT", "ESIT_AGIRLIK", "Türk Dili ve Edebiyatı"),  # + SOZEL
    13: ("AYT", "SAYISAL",      "Geometri"),           # + ESIT_AGIRLIK
    14: ("AYT", "SAYISAL",      "Fizik"),
    15: ("AYT", "SAYISAL",      "Kimya"),
    16: ("AYT", "SAYISAL",      "Biyoloji"),
    17: ("AYT", "ESIT_AGIRLIK", "Tarih-1"),            # + SOZEL
    18: ("AYT", "SOZEL",        "Tarih-2"),
    19: ("AYT", "ESIT_AGIRLIK", "Coğrafya-1"),         # + SOZEL
    20: ("AYT", "SOZEL",        "Coğrafya-2"),
    21: ("AYT", "SOZEL",        "Felsefe Grubu"),
    22: ("AYT", "SOZEL",        "Din Kültürü ve Ahlak Bilgisi"),
}

# AYT'de hangi dersler birden fazla alana hizmet eder
AYT_EXTRA_FIELDS = {
    "Matematik":               ["ESIT_AGIRLIK"],
    "Geometri":                ["ESIT_AGIRLIK"],
    "Türk Dili ve Edebiyatı":  ["SOZEL"],
    "Tarih-1":                 ["SOZEL"],
    "Coğrafya-1":              ["SOZEL"],
}

ALL_YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]


# ─── Sayfa çek ─────────────────────────────────────────────────────────────

def fetch_page() -> str:
    req = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
            "Accept": "text/html",
            "Accept-Language": "tr-TR,tr;q=0.9",
        }
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


# ─── Tablo parse (BeautifulSoup) ────────────────────────────────────────────

def parse_one_table(table_tag) -> tuple[list[int], list[tuple]]:
    """
    Döndürür: (year_list, [(topic_name, {year: count}), ...])
    """
    rows = table_tag.find_all("tr")
    if not rows:
        return [], []

    # Başlık satırı: KONULAR + yıllar
    header_cells = [td.get_text(strip=True) for td in rows[0].find_all(["th", "td"])]
    years = []
    for c in header_cells[1:]:          # ilk hücre "KONULAR"
        try:
            years.append(int(c))
        except ValueError:
            pass
    if not years:
        return [], []

    topics = []
    for row in rows[1:]:
        cells = [td.get_text(strip=True) for td in row.find_all(["th", "td"])]
        if not cells:
            continue

        topic_name = cells[0].strip()
        if not topic_name or topic_name.upper() in ("SORU SAYISI", "KONULAR", "TOPLAM"):
            continue

        # Konu adının sayı olup olmadığını kontrol et (parse hatası)
        try:
            int(topic_name)
            continue  # sayıysa konu değil, atla
        except ValueError:
            pass
        if topic_name in ("–", "-", ""):
            continue

        counts = {}
        for i, yr in enumerate(years):
            raw = cells[i + 1] if i + 1 < len(cells) else "–"
            raw = raw.replace("–", "0").replace("-", "0").strip()
            # HTML entity temizle
            raw = re.sub(r"&[a-zA-Z]+;", "0", raw)
            try:
                counts[yr] = int(raw)
            except ValueError:
                counts[yr] = 0

        topics.append((topic_name, counts))

    return years, topics


def parse_all_tables(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    print(f"   HTML'de {len(tables)} tablo bulundu")

    results = {}
    for idx, table in enumerate(tables):
        tbl_no = idx + 1
        if tbl_no not in TABLE_MAP:
            continue
        years, topics = parse_one_table(table)
        if not topics:
            print(f"  ⚠  Tablo {tbl_no}: parse edilemedi, atlanıyor")
            continue
        results[tbl_no] = (years, topics)
        sess, field, subj = TABLE_MAP[tbl_no]
        total = sum(sum(c.values()) for _, c in topics)
        print(f"  Tablo {tbl_no:2d} [{sess} {field:15s} {subj:40s}] "
              f"{len(topics):3d} konu | {len(years)} yıl | {total} soru")

    return results


# ─── Dataset oluştur ───────────────────────────────────────────────────────

def build_dataset(parsed: dict) -> pd.DataFrame:
    rows = []
    row_id = 1

    for tbl_no, (years, topics) in parsed.items():
        session, primary_field, subject = TABLE_MAP[tbl_no]

        # TYT → sadece ALL; AYT → primary + extra_fields
        if session == "TYT":
            all_fields = ["ALL"]
        else:
            extras = AYT_EXTRA_FIELDS.get(subject, [])
            all_fields = [primary_field] + [f for f in extras if f != primary_field]

        for topic_name, counts in topics:
            for yr in years:
                count = counts.get(yr, 0)
                if count == 0:
                    continue

                for field in all_fields:
                    for q in range(count):
                        rows.append({
                            "id":              row_id,
                            "year":            yr,
                            "exam":            "YKS",
                            "session":         session,
                            "field":           field,
                            "branch":          subject,
                            "subject":         subject,
                            "topic":           topic_name,
                            "subtopic":        "",
                            "question_no":     q + 1,
                            "question_count":  1,
                            "difficulty_level":"MEDIUM",
                            "is_common":       "true" if session == "TYT" else "false",
                            "source_type":     "WEB_SCRAPED",
                            "source_note":     f"{yr} {session} konu dağılımı (universitego.com)",
                            "confidence_score": 0.95,
                            "label_note":      "",
                        })
                        row_id += 1

    return pd.DataFrame(rows)


# ─── Doğrulama ─────────────────────────────────────────────────────────────

def verify(df: pd.DataFrame, parsed: dict):
    print("\n=== DOĞRULAMA ===")
    errors = 0
    for tbl_no, (years, topics) in parsed.items():
        sess, pfield, subj = TABLE_MAP[tbl_no]
        for yr in years:
            expected = sum(c.get(yr, 0) for _, c in topics)
            if expected == 0:
                continue
            actual = len(df[
                (df['year'] == yr) & (df['session'] == sess) &
                (df['field'] == pfield) & (df['subject'] == subj)
            ])
            if expected != actual:
                print(f"  ⚠  {yr} {sess} {pfield} {subj}: beklenen={expected}, gerçek={actual}")
                errors += 1
    if errors == 0:
        print("  ✓ Tüm sayımlar tutarlı!")
    else:
        print(f"  {errors} tutarsızlık!")


# ─── Özet rapor ────────────────────────────────────────────────────────────

def print_summary(df: pd.DataFrame):
    print("\n=== DERS BAZLI ÖZET ===")
    grp = df.groupby(["session", "field", "subject"])
    for (sess, field, subj), g in grp:
        topics  = g["topic"].nunique()
        by_year = g.groupby("year")["question_count"].sum().to_dict()
        yrs     = " | ".join(f"{y}:{v}" for y, v in sorted(by_year.items()))
        print(f"  {sess} {field:15s} {subj:45s} {topics:3d} konu | {yrs}")


# ─── Ana akış ──────────────────────────────────────────────────────────────

def main():
    print("1. Sayfa fetch ediliyor...")
    html = fetch_page()
    print(f"   {len(html):,} karakter alındı")

    print("\n2. Tablolar parse ediliyor...")
    parsed = parse_all_tables(html)
    print(f"   {len(parsed)} tablo başarıyla parse edildi")

    print("\n3. Dataset oluşturuluyor...")
    df = build_dataset(parsed)
    print(f"   {len(df):,} satır")

    print_summary(df)
    verify(df, parsed)

    print(f"\n4. CSV kaydediliyor → {OUT_CSV}")
    df.to_csv(OUT_CSV, index=False, encoding="utf-8-sig")

    print("\n5. Pipeline (rebuild_from_raw) çalıştırılıyor...")
    from rebuild_from_raw import main as rebuild
    rebuild()

    print("\n✓ TAMAMLANDI")


if __name__ == "__main__":
    main()
