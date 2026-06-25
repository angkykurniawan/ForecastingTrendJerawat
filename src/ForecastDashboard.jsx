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
  const [metrics, setMetrics] = useState({ totalObservasi: "0 Bulan", rataRataViews: 0, rekorTertinggi: 0, pergerakanTren: "0%" });
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

    // PARAMETER UTAMA KELOMPOK WAKTU (Ubah angka di bawah ini untuk mengatur per berapa hari)
    const daysPerMonth = 30; 
    const totalMonthsHistory = 9;
    const totalDaysTrack = totalMonthsHistory * daysPerMonth; // 270 Hari

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

        // Pengelompokan Data Historis Mengikuti Parameter daysPerMonth
        const historyMonths = [];
        for (let i = 0; i < totalMonthsHistory; i++) {
          const chunk = hist.slice(i * daysPerMonth, (i + 1) * daysPerMonth);
          historyMonths.push(hitungRataRata(chunk));
        }

        // Pengelompokan Data Peramalan Mengikuti Parameter daysPerMonth
        const forecastMonths = [
          hitungRataRata(fore.slice(0, daysPerMonth)),
          hitungRataRata(fore.slice(daysPerMonth, daysPerMonth * 2)),
          hitungRataRata(fore.slice(daysPerMonth * 2, daysPerMonth * 3))
        ];

        dataCollector.push({
          label: item.keyword.toUpperCase(),
          subLabel: getSubLabelKategori(item.keyword),
          historisBulanan: historyMonths,
          forecastingBulanan: forecastMonths,
          color: color
        });

        summaryCardsCollector.push({
          name: item.keyword.toUpperCase(),
          subLabel: getSubLabelKategori(item.keyword),
          color: color,
          avgHistory: hitungRataRata(hist),
          avgForecast: hitungRataRata(fore),
          peakForecast: Math.max(...fore),
          p1: forecastMonths[0],
          p2: forecastMonths[1],
          p3: forecastMonths[2]
        });
      });

      setMultiApiData(dataCollector);
      setCardsSummaryCollector(summaryCardsCollector);

      const avgHistGlobal = hitungRataRata(globalAllHistory);
      const avgForeGlobal = hitungRataRata(globalAllForecast);
      const selisihPersen = ((avgForeGlobal - avgHistGlobal) / (avgHistGlobal || 1)) * 100;

      setMetrics({
        totalObservasi: `${totalMonthsHistory + 3} Bulan Total`,
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

      if (!labelSumbuSet) {
        for (let i = 9; i >= 1; i--) {
          labelsX.push(`Bulan M-${i}`);
        }
        for (let i = 1; i <= 3; i++) {
          labelsX.push(`Bulan +${i}`);
        }
        labelSumbuSet = true;
      }

      item.historisBulanan.forEach((val) => {
        datasetAktual.push(val);
        datasetProyeksi.push(null);
      });

      if (datasetAktual.length > 0) {
        datasetProyeksi[datasetAktual.length - 1] = datasetAktual[datasetAktual.length - 1];
      }

      item.forecastingBulanan.forEach((val) => {
        datasetAktual.push(null);
        datasetProyeksi.push(val);
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - Aktual)`,
        data: datasetAktual,
        borderColor: item.color,
        backgroundColor: 'transparent',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - Ramalan AI)`,
        data: datasetProyeksi,
        borderColor: item.color,
        backgroundColor: multiApiData.length === 1 ? `${item.color}1A` : 'transparent',
        borderWidth: 3,
        borderDash: [5, 5],
        pointRadius: 4,
        pointHoverRadius: 6,
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
        for (let i = 9; i >= 1; i--) {
          labelsX.push(`Bulan M-${i}`);
        }
        labelSumbuSet = true;
      }

      datasets.push({
        label: `${item.label} (${item.subLabel} - Rerata Siklus)`,
        data: item.historisBulanan,
        borderColor: item.color,
        borderWidth: 2.5,
        pointRadius: 3,
        fill: false
      });
    });

    return { labels: labelsX, datasets };
  };

  const getDistribusiChartData = () => {
    const datasets = multiApiData.map((item) => {
      return {
        label: `${item.label} (${item.subLabel})`,
        data: item.forecastingBulanan,
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
      tooltip: { mode: 'index', intersect: false },
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
        title: { display: true, text: 'Rerata Volume Pencarian (Views)', color: '#888', font: { size: 11 } }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#e2e4e9',
          font: { weight: '600', size: 11 },
          maxRotation: 0,
          minRotation: 0,
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

        .fd-error {
          color: #ff4d4d;
          background: rgba(255,77,77,0.1);
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 18px;
          font-size: 13px;
          word-break: break-word;
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
              <span className="fd-kpi-label">📈 Rata-rata Views Historis (Bulanan)</span>
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
                    <p className="fd-chart-sub">Uji Komparasi Runutan Volume Views Kontinu Bulanan (9 Bulan Sebelumnya → 3 Bulan Prediksi)</p>
                    <div className="fd-chart-wrap">
                      <Line data={getPrediksiChartData()} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'pola' && (
                  <div style={{ width: '100%' }}>
                    <h3 className="fd-chart-title">Analisis Interaktif Siklus Musiman Rata-rata Bulanan</h3>
                    <p className="fd-chart-sub">Komparasi Fluktuasi Rerata Gerak Makro Sepanjang 9 Bulan Terakhir</p>
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
                            <div>Estimasi Bulan +1:<br /><strong style={{ color: '#10b981' }}>{card.p1.toLocaleString('id-ID')}</strong></div>
                            <div>Estimasi Bulan +2:<br /><strong style={{ color: '#3b82f6' }}>{card.p2.toLocaleString('id-ID')}</strong></div>
                            <div>Estimasi Bulan +3:<br /><strong style={{ color: '#f59e0b' }}>{card.p3.toLocaleString('id-ID')}</strong></div>
                            <div>Lonjakan Tertinggi:<br /><strong style={{ color: '#ef4444' }}>{card.peakForecast.toLocaleString('id-ID')} views</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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