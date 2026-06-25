import React, { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const ForecastDashboard = () => {
  const keywordsList = ["jerawat", "komedo", "kosmetik"];

  const [selectedKeywords, setSelectedKeywords] = useState([keywordsList[0]]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('prediksi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [multiApiData, setMultiApiData] = useState([]);
  const [metrics, setMetrics] = useState({ totalObservasi: "12 Bulan", rataRataViews: 0, rekorTertinggi: 0, pergerakanTren: "0%" });
  const [cardsSummaryCollector, setCardsSummaryCollector] = useState([]);

  const BASE_URL_API = "https://angkykurniawan-forecastingjerawat.hf.space";

  const colorPalette = [
    '#ef4444',
    '#f59e0b',
    '#10b981'
  ];

  const hitungRataRata = (arr) => {
    if (!arr || arr.length === 0) return 0;
    return Math.round(arr.reduce((acc, val) => acc + val, 0) / arr.length);
  };

  const getSubLabelKategori = (kw) => {
    if (kw === 'jerawat') return 'PENYAKIT';
    if (kw === 'komedo') return 'PENYEBAB';
    if (kw === 'kosmetik') return 'PENYELESAIAN';
    return '';
  };

  const handleToggleKeyword = (kw) => {
    if (selectedKeywords.includes(kw)) {
      if (selectedKeywords.length === 1) return;
      setSelectedKeywords(selectedKeywords.filter(item => item !== kw));
    } else {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setError(null);
    setShowDropdown(false);

    const totalDaysTrack = 270; 

    try {
      const requests = selectedKeywords.map(async (kw) => {
        let response = await fetch(`${BASE_URL_API}/api/predict/${kw.toLowerCase()}`, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          const pesanServer = errJson.message || `Status Code: ${response.status}`;
          throw new Error(`[Kategori: ${kw.toUpperCase()}] -> ${pesanServer}`);
        }

        const resJson = await response.json();
        return { keyword: kw, data: resJson };
      });

      const responses = await Promise.all(requests);

      let dataCollector = [];
      let globalMaxValues = [];
      let globalAllHistory = [];
      let globalAllForecast = [];
      let summaryCardsCollector = [];

      responses.forEach((item) => {
        if (!item.data || item.data.status !== "success") return;

        const hist = item.data.data_historis.slice(-totalDaysTrack);
        const fore = item.data.data_forecasting;

        const primaryIdx = keywordsList.indexOf(item.keyword);
        const color = colorPalette[primaryIdx !== -1 ? primaryIdx : 0];

        globalMaxValues.push(Math.max(...hist, ...fore));
        globalAllHistory.push(...hist);
        globalAllForecast.push(...fore);

        dataCollector.push({
          label: item.keyword.toUpperCase(),
          subLabel: getSubLabelKategori(item.keyword),
          historis: hist, 
          forecasting: fore, 
          color: color
        });

        summaryCardsCollector.push({
          name: item.keyword.toUpperCase(),
          subLabel: getSubLabelKategori(item.keyword),
          color: color,
          avgHistory: hitungRataRata(hist),
          avgForecast: hitungRataRata(fore),
          peakForecast: Math.max(...fore),
          p1: hitungRataRata(fore.slice(0, 30)),
          p2: hitungRataRata(fore.slice(30, 60)),
          p3: hitungRataRata(fore.slice(60, 90))
        });
      });

      setMultiApiData(dataCollector);
      setCardsSummaryCollector(summaryCardsCollector);

      const avgHistGlobal = hitungRataRata(globalAllHistory);
      const avgForeGlobal = hitungRataRata(globalAllForecast);
      const selisihPersen = ((avgForeGlobal - avgHistGlobal) / (avgHistGlobal || 1)) * 100;

      setMetrics({
        totalObservasi: `${totalDaysTrack + 90} Hari Total (12 Bulan)`,
        rataRataViews: avgHistGlobal,
        rekorTertinggi: Math.max(...globalMaxValues),
        pergerakanTren: `${selisihPersen >= 0 ? '+' : ''}${selisihPersen.toFixed(2)}%`
      });

    } catch (err) {
      setError(`⚠️ Gagal memproses data analisis tren: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPrediksiChartData = () => {
    let labelsX = [];
    let datasets = [];
    let labelSumbuSet = false;

    multiApiData.forEach((item) => {
      const datasetAktual = [];
      const datasetProyeksi = [];

      // REKONSTRUKSI PENANGGALAN KALENDER RIIL (270 Hari Lalu s.d 90 Hari Kedepan)
      if (!labelSumbuSet) {
        const tglMulai = new Date();
        tglMulai.setDate(tglMulai.getDate() - item.historis.length); // Mundur 270 hari dari hari ini

        // Generasikan strings tanggal kalender riil sekuensial penuh (360 Titik Kontinu)
        for (let i = 0; i < (item.historis.length + item.forecasting.length); i++) {
          const tglBerjalan = new Date(tglMulai);
          tglBerjalan.setDate(tglBerjalan.getDate() + i);

          const tahun = tglBerjalan.getFullYear();
          const bulan = tglBerjalan.toLocaleString('id-ID', { month: 'long' });
          const tanggal = String(tglBerjalan.getDate()).padStart(2, '0');

          // Disimpan dalam format terstruktur utuh untuk dibaca oleh Tooltip Chart.js dan fungsi filter sumbu X
          labelsX.push(`${tanggal} ${bulan} ${tahun}`);
        }
        labelSumbuSet = true;
      }

      item.historis.forEach((val) => {
        datasetAktual.push(val);
        datasetProyeksi.push(null);
      });

      if (datasetAktual.length > 0) {
        datasetProyeksi[datasetAktual.length - 1] = datasetAktual[datasetAktual.length - 1];
      }

      item.forecasting.forEach((val) => {
        datasetAktual.push(null);
        datasetProyeksi.push(val);
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - Aktual)`,
        data: datasetAktual,
        borderColor: item.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - Ramalan AI)`,
        data: datasetProyeksi,
        borderColor: item.color,
        backgroundColor: multiApiData.length === 1 ? `${item.color}1A` : 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        fill: multiApiData.length === 1,
      });
    });

    return { labels: labelsX, datasets };
  };

  const getPolaMusimanChartData = () => {
    let labelsX = [];
    let datasets = [];
    let labelSumbuSet = false;

    multiApiData.forEach((item) => {
      if (!labelSumbuSet) {
        const tglMulai = new Date();
        tglMulai.setDate(tglMulai.getDate() - item.historis.length);

        for (let i = 0; i < item.historis.length; i++) {
          const tglBerjalan = new Date(tglMulai);
          tglBerjalan.setDate(tglBerjalan.getDate() + i);
          const tahun = tglBerjalan.getFullYear();
          const bulan = tglBerjalan.toLocaleString('id-ID', { month: 'long' });
          const tanggal = String(tglBerjalan.getDate()).padStart(2, '0');
          labelsX.push(`${tanggal} ${bulan} ${tahun}`);
        }
        labelSumbuSet = true;
      }

      const movingAverage7Hari = item.historis.map((val, idx, arr) => {
        if (idx < 6) return val;
        return Math.round(arr.slice(idx - 6, idx + 1).reduce((a, b) => a + b, 0) / 7);
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - Smoothed MA-7)`,
        data: movingAverage7Hari,
        borderColor: item.color,
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      });
    });

    return { labels: labelsX, datasets };
  };

  const getDistribusiChartData = () => {
    const datasets = multiApiData.map((item) => {
      return {
        label: `${item.label} (${item.subLabel})`,
        data: [
          hitungRataRata(item.forecasting.slice(0, 30)),
          hitungRataRata(item.forecasting.slice(30, 60)),
          hitungRataRata(item.forecasting.slice(60, 90))
        ],
        backgroundColor: item.color,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      };
    });

    return {
      labels: ['Proyeksi Bulan ke-1', 'Proyeksi Bulan ke-2', 'Proyeksi Bulan ke-3'],
      datasets
    };
  };

  const isPositive = !metrics.pergerakanTren.includes('-');

  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: '#b3b3b3',
          font: { size: 11, weight: '500' },
          usePointStyle: true,
          boxWidth: 10,
        },
        position: 'top'
      },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: 'rgba(22, 25, 37, 0.95)',
        titleColor: '#fff',
        bodyColor: '#e2e4e9',
        borderColor: '#333852',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: '700' },
        callbacks: {
          title: (context) => {
            // Tooltip menampilkan tanggal riil harian yang presisi saat di-hover/di-klik
            return `📅 Tanggal: ${context[0].label}`;
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.raw.toLocaleString('id-ID')} views`;
          }
        }
      },
      datalabels: {
        display: activeTab === 'distribusi',
        align: 'top',
        anchor: 'end',
        color: '#ffffff',
        font: { size: 10, weight: '700' },
        formatter: (value) => value.toLocaleString('id-ID')
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [3, 3] },
        ticks: { color: '#777', maxTicksLimit: 6 },
        title: { display: true, text: 'Volume Views', color: '#888', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#e2e4e9',
          font: { weight: '600', size: 10 },
          maxRotation: 45,
          minRotation: 0,
          // PENYARINGAN SUMBU X KALENDER UTUH: Hanya cetak teks jika elemen tanggal berada pada tanggal "01" dari bulan tersebut
          callback: function(val, index) {
            const labelPenuh = this.getLabelForValue(index); 
            if (labelPenuh && labelPenuh.startsWith('01')) {
              // Memotong string "01 Januari 2026" menjadi "Januari 2026" agar bersih di space kanvas
              return labelPenuh.substring(3);
            }
            return null; // Menyembunyikan tanggal harian lain agar tidak bertumpuk berantakan
          }
        }
      }
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .fd-root {
          min-height: 100vh;
          width: 100vw;
          overflow-x: hidden;
          background-color: #0f111a;
          color: #e2e4e9;
          padding: 24px 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .fd-inner {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        .fd-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          background: #161925;
          padding: 20px;
          border-radius: 10px;
          border: 1px solid #222638;
          margin-bottom: 24px;
          width: 100%;
        }
        @media (max-width: 900px) {
          .fd-kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .fd-kpi-grid { grid-template-columns: 1fr; }
        }

        .fd-kpi-label {
          color: #848a9e;
          font-size: 11px;
          display: block;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .fd-kpi-value {
          font-size: clamp(20px, 4vw, 26px);
          font-weight: 600;
          color: #ffffff;
        }

        .fd-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          background: #161925;
          padding: 14px 18px;
          border-radius: 8px;
          border: 1px solid #222638;
          margin-bottom: 22px;
          align-items: center;
          width: 100%;
        }

        .fd-keyword-wrapper {
          position: relative;
          flex: 1 1 260px;
          min-width: 0;
        }

        .fd-keyword-trigger {
          padding: 10px 14px;
          border-radius: 6px;
          background: #0f111a;
          color: #fff;
          border: 1px solid #333852;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          user-select: none;
        }

        .fd-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #161925;
          border: 1px solid #333852;
          border-radius: 6px;
          max-height: 280px;
          overflow-y: auto;
          z-index: 200;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          padding: 8px;
        }

        .fd-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 4px;
          cursor: pointer;
        }

        .fd-run-btn {
          padding: 11px 24px;
          border-radius: 6px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
          flex: 1 1 auto;
          min-width: 180px;
          white-space: nowrap;
          transition: opacity 0.15s;
        }
        .fd-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .fd-tabs {
          display: flex;
          overflow-x: auto;
          gap: 2px;
          margin-bottom: 20px;
          border-bottom: 1px solid #222638;
          scrollbar-width: none;
          -ms-overflow-style: none;
          width: 100%;
          white-space: nowrap;
        }
        .fd-tabs::-webkit-scrollbar { display: none; }

        .fd-tab-btn {
          padding: 11px 16px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.15s;
        }

        .fd-chart-panel {
          background: #161925;
          padding: 24px;
          border-radius: 10px;
          border: 1px solid #222638;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          margin-bottom: 30px;
          width: 100%;
        }
        @media (max-width: 480px) {
          .fd-chart-panel { padding: 14px; }
        }

        .fd-chart-title {
          margin: 0 0 4px 0;
          font-size: clamp(14px, 3vw, 18px);
          font-weight: 600;
          color: #fff;
        }
        .fd-chart-sub {
          margin: 0 0 20px 0;
          font-size: 11px;
          color: #848a9e;
          line-height: 1.5;
        }

        .fd-chart-wrap {
          position: relative;
          width: 100%;
          height: 450px;
        }

        .fd-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 18px;
          width: 100%;
        }

        .fd-summary-card {
          background: #0f111a;
          border-radius: 6px;
          padding: 18px;
          border: 1px solid #222638;
        }

        .fd-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .fd-card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 12px;
          color: #b3b3b3;
        }

        .fd-card-divider {
          grid-column: span 2;
          height: 1px;
          background: #222638;
          margin: 2px 0;
        }

        .fd-empty {
          text-align: center;
          padding: 80px 20px;
          color: #525876;
          width: 100%;
        }

        .fd-trend-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .fd-table-title {
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          margin: 35px 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fd-table-container {
          width: 100%;
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #222638;
          border-radius: 8px;
          background: #0f111a;
        }
        .fd-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .fd-data-table th {
          background: #161925;
          color: #848a9e;
          padding: 12px;
          font-weight: 700;
          position: sticky;
          top: 0;
          border-bottom: 1px solid #222638;
          z-index: 10;
        }
        .fd-data-table td {
          padding: 12px;
          border-bottom: 1px solid #161925;
          color: #e2e4e9;
        }
        .fd-data-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
      `}</style>

      <div className="fd-root">
        <div className="fd-inner">

          {/* ── KPI Metrics ── */}
          <div className="fd-kpi-grid">
            <div>
              <span className="fd-kpi-label">📊 Jendela Observasi Tren</span>
              <strong className="fd-kpi-value">{metrics.totalObservasi}</strong>
            </div>
            <div>
              <span className="fd-kpi-label">📈 Rata-rata Views Historis</span>
              <strong className="fd-kpi-value">{metrics.rataRataViews.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="fd-kpi-label">🚨 Lonjakan Tren Tertinggi</span>
              <strong className="fd-kpi-value">{metrics.rekorTertinggi.toLocaleString('id-ID')}</strong>
            </div>
            <div>
              <span className="fd-kpi-label">🔄 Estimasi Pergeseran Tren</span>
              <div className="fd-trend-row">
                <strong className="fd-kpi-value" style={{ color: isPositive ? '#00e676' : '#ff4d4d' }}>
                  {metrics.pergerakanTren}
                </strong>
                <span style={{
                  fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                  background: isPositive ? 'rgba(0,230,118,0.15)' : 'rgba(255,77,77,0.15)',
                  color: isPositive ? '#00e676' : '#ff4d4d',
                  fontWeight: '700'
                }}>
                  {isPositive ? '↑' : '↓'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="fd-toolbar">
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#848a9e', flexShrink: 0 }}>
              PILAR KATA KUNCI:
            </span>

            <div className="fd-keyword-wrapper">
              <div className="fd-keyword-trigger" onClick={() => setShowDropdown(!showDropdown)}>
                <span>{selectedKeywords.length} Pilar Dipilih</span>
                <span>{showDropdown ? '▲' : '▼'}</span>
              </div>

              {showDropdown && (
                <div className="fd-dropdown">
                  {keywordsList.map(kw => {
                    const isChecked = selectedKeywords.includes(kw);
                    return (
                      <label
                        key={kw}
                        className="fd-dropdown-item"
                        style={{
                          background: isChecked ? 'rgba(99,102,241,0.15)' : 'transparent',
                          color: isChecked ? '#6366f1' : '#b3b3b3'
                        }}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => handleToggleKeyword(kw)} />
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>
                          {kw.toUpperCase()}{' '}
                          <span style={{ color: '#6b7280', fontWeight: '500', fontSize: '11px' }}>
                            ({getSubLabelKategori(kw)})
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="fd-run-btn" onClick={handleRunPrediction} disabled={loading}>
              {loading ? '⏳ MEMPROSES ANALISIS...' : '🚀 PROYEKSIKAN TREN'}
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="fd-tabs">
            {[
              { id: 'prediksi',   label: '🔮 Prediksi Tren Masa Depan',       activeColor: '#ff7f0e' },
              { id: 'pola',       label: '🍂 Siklus Musiman & Garis Tren',     activeColor: '#d62728' },
              { id: 'distribusi', label: '📊 Rangkuman Minat Bulanan',          activeColor: '#3498db' },
              { id: 'ringkasan',  label: '📋 Ringkasan Informasi',              activeColor: '#00e676' },
            ].map(tab => (
              <button
                key={tab.id}
                className="fd-tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  color: activeTab === tab.id ? tab.activeColor : '#848a9e',
                  background: activeTab === tab.id ? '#161925' : 'transparent',
                  borderBottom: activeTab === tab.id ? `3px solid ${tab.activeColor}` : '3px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Chart Panel ── */}
          <div className="fd-chart-panel">
            {error && <div className="fd-error">{error}</div>}

            {multiApiData.length > 0 ? (
              <div style={{ width: '100%' }}>
                {activeTab === 'prediksi' && (
                  <div style={{ width: '100%' }}>
                    <h3 className="fd-chart-title">Proyeksi Perilaku Pencarian Model Deep Learning</h3>
                    <p className="fd-chart-sub">Uji Komparasi Runutan Volume Views Kontinu Harian Kalender Riil (270 Hari Input → 90 Hari Prediksi dengan Ticks Sumbu X Adaptif Bulanan)</p>
                    <div className="fd-chart-wrap">
                      <Line data={getPrediksiChartData()} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'pola' && (
                  <div style={{ width: '100%' }}>
                    <h3 className="fd-chart-title">Analisis Interaktif Siklus Musiman Kata Kunci (MA-7)</h3>
                    <p className="fd-chart-sub">Eliminasi Noise Gejolak Harian untuk Membaca Tren Minat Utama Jangka Panjang</p>
                    <div className="fd-chart-wrap">
                      <Line data={getPolaMusimanChartData()} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'distribusi' && (
                  <div style={{ width: '100%' }}>
                    <h3 className="fd-chart-title">Estimasi Distribusi Rata-rata Minat Bulanan</h3>
                    <p className="fd-chart-sub">Komparasi Balok Estimasi Volume Perhatian 3 Periode Kedepan</p>
                    <div className="fd-chart-wrap">
                      <Bar data={getDistribusiChartData()} plugins={[ChartDataLabels]} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'ringkasan' && (
                  <div style={{ width: '100%' }}>
                    <h3 className="fd-chart-title" style={{ color: '#00e676' }}>📋 Ringkasan Kuantitatif Informasi Pilar Aktif</h3>
                    <p className="fd-chart-sub">Metrik Statistik Perbandingan Volume Pencarian (Views) Masa Lalu dan Masa Depan AI</p>

                    <div className="fd-cards-grid">
                      {cardsSummaryCollector.map((card) => (
                        <div
                          key={card.name}
                          className="fd-summary-card"
                          style={{ borderTop: `4px solid ${card.color}` }}
                        >
                          <div className="fd-card-header">
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: card.color }}>{card.name}</h4>
                            <span style={{
                              fontSize: '10px', padding: '3px 7px',
                              background: `${card.color}22`, color: card.color,
                              borderRadius: '4px', fontWeight: '700'
                            }}>{card.subLabel}</span>
                          </div>

                          <div className="fd-card-stats">
                            <div>Rerata 270 Hari Lalu:<br /><strong style={{ color: '#fff', fontSize: '14px' }}>{card.avgHistory.toLocaleString('id-ID')} views</strong></div>
                            <div>Rerata 90 Hari AI:<br /><strong style={{ color: '#a855f7', fontSize: '14px' }}>{card.avgForecast.toLocaleString('id-ID')} views</strong></div>
                            <div className="fd-card-divider"></div>
                            <div>Estimasi Bulan 1:<br /><strong style={{ color: '#10b981' }}>{card.p1.toLocaleString('id-ID')}</strong></div>
                            <div>Estimasi Bulan 2:<br /><strong style={{ color: '#3b82f6' }}>{card.p2.toLocaleString('id-ID')}</strong></div>
                            <div>Estimasi Bulan 3:<br /><strong style={{ color: '#f59e0b' }}>{card.p3.toLocaleString('id-ID')}</strong></div>
                            <div>Lonjakan Tertinggi:<br /><strong style={{ color: '#ef4444' }}>{card.peakForecast.toLocaleString('id-ID')} views</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PANEL DETAIL PREDIKSI PER HARI (90 HARI) */}
                <h4 className="fd-table-title">📅 Tabel Detail Prediksi Masa Depan Per Hari (90 Hari Proyeksi)</h4>
                <div className="fd-table-container">
                  <table className="fd-data-table">
                    <thead>
                      <tr>
                        <th>Timeline Proyeksi</th>
                        {multiApiData.map(pilar => (
                          <th key={pilar.label} style={{ color: pilar.color }}>
                            {pilar.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 90 }).map((_, dayIdx) => (
                        <tr key={dayIdx}>
                          <td style={{ fontWeight: '600', color: '#848a9e' }}>Hari +{dayIdx + 1}</td>
                          {multiApiData.map(pilar => {
                            const nilaiHarian = pilar.forecasting[dayIdx];
                            return (
                              <td key={pilar.label} style={{ fontWeight: '500' }}>
                                {nilaiHarian !== undefined ? nilaiHarian.toLocaleString('id-ID') : '-'} <span style={{ fontSize: '11px', color: '#525876' }}>views</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div className="fd-empty">
                <div style={{ fontSize: '3rem', marginBottom: '14px' }}>🔮</div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', lineHeight: '1.7' }}>
                  Centang kueri pilar kata kunci pada selection box di atas,<br />
                  kemudian klik tombol <strong>"PROYEKSIKAN TREN"</strong> untuk melihat analisis komparasi volume penayangan.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default ForecastDashboard;