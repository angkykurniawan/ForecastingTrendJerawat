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
  const [metrics, setMetrics] = useState({ totalObservasi: "Sept 2025 - Agst 2026 (12 Bulan Total)", rataRataViews: 0, rekorTertinggi: 0, pergerakanTren: "0%" });
  const [cardsSummaryCollector, setCardsSummaryCollector] = useState([]);

  const BASE_URL_API = "https://angkykurniawan-forecastingjerawat.hf.space";

  const colorPalette = [
    '#ef4444',
    '#f59e0b',
    '#10b981'
  ];

  // Pembaruan Jendela Rentang Waktu 12 Bulan (September 2025 s.d Agustus 2026)
  const listNamaBulan = [
    { nama: "September 2025", tipe: "historis" },
    { nama: "Oktober 2025", tipe: "historis" },
    { nama: "November 2025", tipe: "historis" },
    { nama: "Desember 2025", tipe: "historis" },
    { nama: "Januari 2026", tipe: "historis" },
    { nama: "Februari 2026", tipe: "historis" },
    { nama: "Maret 2026", tipe: "historis" },
    { nama: "April 2026", tipe: "historis" },
    { nama: "Mei 2026", tipe: "historis" },     // Selesai 9 Bulan Pertama (Historis)
    { nama: "Juni 2026", tipe: "prediction" },
    { nama: "Juli 2026", tipe: "prediction" },
    { nama: "Agustus 2026", tipe: "prediction" } // Selesai 3 Bulan Terakhir (Prediksi)
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

        const rawHistory = item.data.data_historis;
        const rawForecast = item.data.data_forecasting;
        const totalRawData = rawHistory.length + rawForecast.length;

        // Proporsi pembagian 9 bulan berbanding 3 bulan dari total data API
        const targetHistoryCount = Math.floor(totalRawData * (9 / 12));
        
        const allCombinedData = [...rawHistory, ...rawForecast];
        const hist = allCombinedData.slice(0, targetHistoryCount);
        const fore = allCombinedData.slice(targetHistoryCount);

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

        // Split merata data prediksi untuk 3 Bulan Akhir (Juni, Juli, Agustus)
        const sepertiga = Math.floor(fore.length / 3);
        const p1 = fore.slice(0, sepertiga);
        const p2 = fore.slice(sepertiga, sepertiga * 2);
        const p3 = fore.slice(sepertiga * 2);

        summaryCardsCollector.push({
          name: item.keyword.toUpperCase(),
          subLabel: getSubLabelKategori(item.keyword),
          color: color,
          avgHistory: hitungRataRata(hist),
          avgForecast: hitungRataRata(fore),
          peakForecast: Math.max(...fore),
          p1: hitungRataRata(p1),
          p2: hitungRataRata(p2),
          p3: hitungRataRata(p3)
        });
      });

      setMultiApiData(dataCollector);
      setCardsSummaryCollector(summaryCardsCollector);

      const avgHistGlobal = hitungRataRata(globalAllHistory);
      const avgForeGlobal = hitungRataRata(globalAllForecast);
      const selisihPersen = ((avgForeGlobal - avgHistGlobal) / (avgHistGlobal || 1)) * 100;

      setMetrics({
        totalObservasi: "Sept 2025 - Agst 2026 (12 Bulan Total)",
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

  const getTimelineMapping = () => {
    if (multiApiData.length === 0) return { labelsX: [], tickPositions: [] };

    const totalHariAsli = multiApiData[0].historis.length + multiApiData[0].forecasting.length;
    const totalHariHistoris = multiApiData[0].historis.length;

    let labelsX = new Array(totalHariAsli).fill("");
    let tickPositions = [];

    const segmenPerBulan = totalHariAsli / 12;

    listNamaBulan.forEach((bulan, i) => {
      const indexTengahBulan = Math.floor((i * segmenPerBulan) + (segmenPerBulan / 2));
      tickPositions.push({
        index: indexTengahBulan,
        text: bulan.nama,
        isHistoris: indexTengahBulan < totalHariHistoris
      });
    });

    return { labelsX, tickPositions, totalHariHistoris };
  };

  const { labelsX, tickPositions, totalHariHistoris } = getTimelineMapping();

  const getPrediksiChartData = () => {
    let datasets = [];

    multiApiData.forEach((item) => {
      const datasetAktual = [];
      const datasetProyeksi = [];

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
        label: `${item.label} (${item.subLabel} - 9 Bulan Aktual)`,
        data: datasetAktual,
        borderColor: item.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });

      datasets.push({
        label: `${item.label} (${item.subLabel} - 3 Bulan Ramalan AI)`,
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
    let datasets = [];

    multiApiData.forEach((item) => {
      const movingAverage7Hari = item.historis.map((val, idx, arr) => {
        if (idx < 6) return val;
        return Math.round(arr.slice(idx - 6, idx + 1).reduce((a, b) => a + b, 0) / 7);
      });

      const paddingNull = new Array(item.forecasting.length).fill(null);
      const finalDataMA = [...movingAverage7Hari, ...paddingNull];

      datasets.push({
        label: `${item.label} (${item.subLabel} - Smoothed MA-7)`,
        data: finalDataMA,
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
      const sepertiga = Math.floor(item.forecasting.length / 3);
      return {
        label: `${item.label} (${item.subLabel})`,
        data: [
          hitungRataRata(item.forecasting.slice(0, sepertiga)),          
          hitungRataRata(item.forecasting.slice(sepertiga, sepertiga * 2)),     
          hitungRataRata(item.forecasting.slice(sepertiga * 2)) 
        ],
        backgroundColor: item.color,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      };
    });

    return {
      labels: ['Juni 2026', 'Juli 2026', 'Agustus 2026'], 
      datasets
    };
  };

  const isPositive = !metrics.pergerakanTren.includes('-');

  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#b3b3b3', font: { size: 11, weight: '500' }, usePointStyle: true, boxWidth: 10 },
        position: 'top'
      },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: 'rgba(22, 25, 37, 0.95)',
        titleColor: '#fff', bodyColor: '#e2e4e9', borderColor: '#333852', borderWidth: 1, padding: 12,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex;
            return index < totalHariHistoris ? '📅 Periode: 9 Bulan Historis' : '🔮 Periode: 3 Bulan Prediksi AI';
          },
          label: (context) => {
            if (context.raw === null) return null;
            return `${context.dataset.label}: ${context.raw.toLocaleString('id-ID')} views`;
          }
        }
      },
      datalabels: {
        display: activeTab === 'distribusi',
        align: 'top', anchor: 'end', color: '#ffffff', font: { size: 10, weight: '700' },
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
          color: '#e2e4e9', font: { weight: '600', size: 10 }, maxRotation: 0, minRotation: 0,
          callback: function(val, index) {
            const match = tickPositions.find(t => t.index === index);
            return match ? match.text : null;
          }
        }
      }
    }
  };

  const darkChartOptionsPola = {
    ...darkChartOptions,
    scales: {
      ...darkChartOptions.scales,
      x: {
        grid: { display: false },
        ticks: {
          color: '#e2e4e9', font: { weight: '600', size: 10 }, maxRotation: 0, minRotation: 0,
          callback: function(val, index) {
            const match = tickPositions.find(t => t.index === index && t.isHistoris);
            return match ? match.text : null;
          }
        }
      }
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .fd-root { min-height: 100vh; width: 100vw; overflow-x: hidden; background-color: #0f111a; color: #e2e4e9; padding: 24px 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .fd-inner { width: 100%; max-width: 100%; margin: 0 auto; }
        .fd-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background: #161925; padding: 20px; border-radius: 10px; border: 1px solid #222638; margin-bottom: 24px; }
        @media (max-width: 900px) { .fd-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .fd-kpi-grid { grid-template-columns: 1fr; } }
        .fd-kpi-label { color: #848a9e; font-size: 11px; display: block; margin-bottom: 6px; text-transform: uppercase; }
        .fd-kpi-value { font-size: clamp(18px, 3.5vw, 24px); font-weight: 600; color: #ffffff; }
        .fd-toolbar { display: flex; flex-wrap: wrap; gap: 14px; background: #161925; padding: 14px 18px; border-radius: 8px; border: 1px solid #222638; margin-bottom: 22px; align-items: center; }
        .fd-keyword-wrapper { position: relative; flex: 1 1 260px; }
        .fd-keyword-trigger { padding: 10px 14px; border-radius: 6px; background: #0f111a; color: #fff; border: 1px solid #333852; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; justify-content: space-between; }
        .fd-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #161925; border: 1px solid #333852; border-radius: 6px; max-height: 280px; overflow-y: auto; z-index: 200; padding: 8px; }
        .fd-dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; cursor: pointer; }
        .fd-run-btn { padding: 11px 24px; border-radius: 6px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; border: none; font-weight: 700; cursor: pointer; font-size: 13px; flex: 1 1 auto; }
        .fd-run-btn:disabled { opacity: 0.6; }
        .fd-tabs { display: flex; overflow-x: auto; gap: 2px; margin-bottom: 20px; border-bottom: 1px solid #222638; scrollbar-width: none; }
        .fd-tab-btn { padding: 11px 16px; border: none; background: transparent; cursor: pointer; font-weight: 700; font-size: 12px; }
        .fd-chart-panel { background: #161925; padding: 24px; border-radius: 10px; border: 1px solid #222638; margin-bottom: 30px; }
        .fd-chart-title { margin: 0 0 4px 0; font-size: clamp(14px, 3vw, 18px); font-weight: 600; color: #fff; }
        .fd-chart-sub { margin: 0 0 20px 0; font-size: 11px; color: #848a9e; }
        .fd-chart-wrap { position: relative; width: 100%; height: 450px; }
        .fd-cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
        .fd-summary-card { background: #0f111a; border-radius: 6px; padding: 18px; border: 1px solid #222638; }
        .fd-card-header { display: flex; justify-content: space-between; margin-bottom: 14px; }
        .fd-card-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; color: #b3b3b3; }
        .fd-card-divider { grid-column: span 2; height: 1px; background: #222638; }
        .fd-empty { text-align: center; padding: 80px 20px; color: #525876; }
        .fd-table-title { font-size: 16px; font-weight: 600; color: #fff; margin: 35px 0 12px 0; }
        .fd-table-container { width: 100%; max-height: 400px; overflow-y: auto; border: 1px solid #222638; border-radius: 8px; background: #0f111a; }
        .fd-data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .fd-data-table th { background: #161925; color: #848a9e; padding: 12px; font-weight: 700; position: sticky; top: 0; border-bottom: 1px solid #222638; }
        .fd-data-table td { padding: 12px; border-bottom: 1px solid #161925; }
      `}</style>

      <div className="fd-root">
        <div className="fd-inner">

          {/* KPI Metrics */}
          <div className="fd-kpi-grid">
            <div>
              <span className="fd-kpi-label">📊 Jendela Observasi</span>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <strong className="fd-kpi-value" style={{ color: isPositive ? '#00e676' : '#ff4d4d' }}>
                  {metrics.pergerakanTren}
                </strong>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="fd-toolbar">
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#848a9e' }}>PILAR KATA KUNCI:</span>
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
                      <label key={kw} className="fd-dropdown-item" style={{ color: isChecked ? '#6366f1' : '#b3b3b3' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => handleToggleKeyword(kw)} />
                        <span>{kw.toUpperCase()}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <button className="fd-run-btn" onClick={handleRunPrediction} disabled={loading}>
              {loading ? '⏳ MEMPROSES...' : '🚀 PROYEKSIKAN TREN'}
            </button>
          </div>

          {/* Tabs */}
          <div className="fd-tabs">
            {[
              { id: 'prediksi',   label: '🔮 Prediksi Tren Masa Depan',   activeColor: '#ff7f0e' },
              { id: 'pola',       label: '🍂 Siklus Musiman (Garis Tren)', activeColor: '#d62728' },
              { id: 'distribusi', label: '📊 Rangkuman Minat Bulanan',      activeColor: '#3498db' },
              { id: 'ringkasan',  label: '📋 Ringkasan Informasi',          activeColor: '#00e676' },
            ].map(tab => (
              <button
                key={tab.id}
                className="fd-tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  color: activeTab === tab.id ? tab.activeColor : '#848a9e',
                  borderBottom: activeTab === tab.id ? `3px solid ${tab.activeColor}` : '3px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart Panel */}
          <div className="fd-chart-panel">
            {error && <div style={{ color: '#ff4d4d', marginBottom: '15px' }}>{error}</div>}

            {multiApiData.length > 0 ? (
              <div style={{ width: '100%' }}>
                {activeTab === 'prediksi' && (
                  <div>
                    <h3 className="fd-chart-title">Proyeksi Perilaku Pencarian Model Deep Learning</h3>
                    <p className="fd-chart-sub">Uji Skala Penuh Kalender Riil: September 2025 → Agustus 2026</p>
                    <div className="fd-chart-wrap">
                      <Line data={getPrediksiChartData()} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'pola' && (
                  <div>
                    <h3 className="fd-chart-title">Analisis Interaktif Siklus Musiman Kata Kunci (MA-7)</h3>
                    <p className="fd-chart-sub">Mengikuti Rentang Skala Waktu Utama 9 Bulan Kalender Historis</p>
                    <div className="fd-chart-wrap">
                      <Line data={getPolaMusimanChartData()} options={darkChartOptionsPola} />
                    </div>
                  </div>
                )}

                {activeTab === 'distribusi' && (
                  <div>
                    <h3 className="fd-chart-title">Estimasi Distribusi Rata-rata Minat Bulanan</h3>
                    <p className="fd-chart-sub">Hasil Rata-rata Pembagian Data Prediksi 3 Bulan Terakhir (Juni - Agustus 2026)</p>
                    <div className="fd-chart-wrap">
                      <Bar data={getDistribusiChartData()} plugins={[ChartDataLabels]} options={darkChartOptions} />
                    </div>
                  </div>
                )}

                {activeTab === 'ringkasan' && (
                  <div>
                    <h3 className="fd-chart-title" style={{ color: '#00e676' }}>📋 Ringkasan Kuantitatif Informasi</h3>
                    <div className="fd-cards-grid">
                      {cardsSummaryCollector.map((card) => (
                        <div key={card.name} className="fd-summary-card" style={{ borderTop: `4px solid ${card.color}` }}>
                          <div className="fd-card-header">
                            <h4 style={{ margin: 0, color: card.color }}>{card.name}</h4>
                          </div>
                          <div className="fd-card-stats">
                            <div>Rerata 9 Bulan Lalu:<br /><strong>{card.avgHistory.toLocaleString('id-ID')} views</strong></div>
                            <div>Rerata 3 Bulan AI:<br /><strong>{card.avgForecast.toLocaleString('id-ID')} views</strong></div>
                            <div className="fd-card-divider"></div>
                            <div>Juni 2026:<br /><strong>{card.p1.toLocaleString('id-ID')}</strong></div>
                            <div>Juli 2026:<br /><strong>{card.p2.toLocaleString('id-ID')}</strong></div>
                            <div>Agustus 2026:<br /><strong>{card.p3.toLocaleString('id-ID')}</strong></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TABEL DETAIL */}
                <h4 className="fd-table-title">📅 Tabel Detail Prediksi Per Hari ({multiApiData[0].forecasting.length} Hari Proyeksi)</h4>
                <div className="fd-table-container">
                  <table className="fd-data-table">
                    <thead>
                      <tr>
                        <th>Timeline Proyeksi</th>
                        {multiApiData.map(pilar => <th key={pilar.label} style={{ color: pilar.color }}>{pilar.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: multiApiData[0].forecasting.length }).map((_, dayIdx) => (
                        <tr key={dayIdx}>
                          <td style={{ color: '#848a9e' }}>Hari Prediksi +{dayIdx + 1}</td>
                          {multiApiData.map(pilar => (
                            <td key={pilar.label}>
                              {pilar.forecasting[dayIdx] !== undefined ? pilar.forecasting[dayIdx].toLocaleString('id-ID') : '-'} views
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            ) : (
              <div className="fd-empty">
                <div style={{ fontSize: '3rem' }}>🔮</div>
                <p>Klik tombol <strong>"PROYEKSIKAN TREN"</strong> untuk memetakan grafik riil 12 bulan penuh.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default ForecastDashboard;