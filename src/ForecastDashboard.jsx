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
  const keywordsList = [
    "views_abses", "views_acne", "views_bakteri", "views_dermatologi", "views_epidermis",
    "views_hormon", "views_infeksi", "views_jerawat", "views_kelenjar", "views_kista",
    "views_komedo", "views_kosmetik", "views_kulit", "views_melanin", "views_melasma",
    "views_minyak", "views_nanah", "views_nutrisi", "views_papula", "views_pori_pori",
    "views_pubertas", "views_radang", "views_stres", "views_stress", "views_wajah"
  ];

  const [selectedKeywords, setSelectedKeywords] = useState([keywordsList[7]]); // Default: views_jerawat
  const [showDropdown, setShowDropdown] = useState(false); 
  const [activeTab, setActiveTab] = useState('prediksi'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [multiApiData, setMultiApiData] = useState([]); 
  const [metrics, setMetrics] = useState({ totalObservasi: "0 Hari", rataRataViews: 0, rekorTertinggi: 0, pergerakanTren: "0%" });
  const [cardsSummaryCollector, setCardsSummaryCollector] = useState([]);

  const BASE_URL_API = "https://angkykurniawan-forecastingjerawat.hf.space";

  const colorPalette = [
    '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', 
    '#06b6d4', '#ec4899', '#84cc16', '#14b8a6', '#6366f1'
  ];

  const hitungRataRata = (arr) => {
    if (!arr || arr.length === 0) return 0;
    return Math.round(arr.reduce((acc, val) => acc + val, 0) / arr.length);
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
        let response = await fetch(`${BASE_URL_API}/api/predict`, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: kw }),
        });
        if (!response.ok) throw new Error(`Gagal memuat kueri: ${kw}`);
        const resJson = await response.json();
        return { keyword: kw, data: resJson };
      });

      const responses = await Promise.all(requests);
      
      let dataCollector = [];
      let globalMaxValues = [];
      let globalAllHistory = [];
      let globalAllForecast = [];
      let totalHariSample = 0;
      let summaryCardsCollector = [];

      responses.forEach((item, index) => {
        if (!item.data || item.data.status !== "success") return;
        
        const hist = item.data.data_historis;
        const fore = item.data.data_forecasting;
        const color = colorPalette[index % colorPalette.length];

        totalHariSample = hist.length + fore.length;
        globalMaxValues.push(Math.max(...hist, ...fore));
        globalAllHistory.push(...hist);
        globalAllForecast.push(...fore);

        dataCollector.push({
          label: item.keyword.replace('views_', '').toUpperCase(),
          historis: hist,
          forecasting: fore
        });

        summaryCardsCollector.push({
          name: item.keyword.replace('views_', '').toUpperCase(),
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
        totalObservasi: `${totalHariSample} Hari`,
        rataRataViews: avgHistGlobal,
        rekorTertinggi: Math.max(...globalMaxValues),
        pergerakanTren: `${selisihPersen >= 0 ? '+' : ''}${selisihPersen.toFixed(2)}%`
      });

    } catch (err) {
      setError(`⚠️ Gagal memproses data tren pencarian: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getPrediksiChartData = () => {
    let labelsX = [];
    let datasets = [];
    let labelSumbuSet = false;

    multiApiData.forEach((item, index) => {
      const color = colorPalette[index % colorPalette.length];
      const datasetAktual = [];
      const datasetProyeksi = [];

      if (!labelSumbuSet) {
        item.historis.forEach((_, idx) => labelsX.push(`H-${item.historis.length - idx}`));
        item.forecasting.forEach((_, idx) => labelsX.push(`Hari +${idx + 1}`));
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
        label: `${item.label} (Tren Aktual)`,
        data: datasetAktual,
        borderColor: color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
      });

      datasets.push({
        label: `${item.label} (Ramalan AI)`,
        data: datasetProyeksi,
        borderColor: color,
        backgroundColor: multiApiData.length === 1 ? `${color}1A` : 'transparent', 
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

    multiApiData.forEach((item, index) => {
      const color = colorPalette[index % colorPalette.length];
      if (!labelSumbuSet) {
        labelsX = item.historis.map((_, idx) => `H-${item.historis.length - idx}`);
        labelSumbuSet = true;
      }

      const movingAverage7Hari = item.historis.map((val, idx, arr) => {
        if (idx < 6) return val;
        return Math.round(arr.slice(idx - 6, idx + 1).reduce((a, b) => a + b, 0) / 7);
      });

      datasets.push({
        label: `${item.label} (Smoothed MA-7)`,
        data: movingAverage7Hari,
        borderColor: color,
        borderWidth: 2.5,
        pointRadius: 0,
        fill: false
      });
    });

    return { labels: labelsX, datasets };
  };

  const getDistribusiChartData = () => {
    const datasets = multiApiData.map((item, index) => {
      const color = colorPalette[index % colorPalette.length];
      return {
        label: item.label,
        data: [
          hitungRataRata(item.forecasting.slice(0, 30)),
          hitungRataRata(item.forecasting.slice(30, 60)),
          hitungRataRata(item.forecasting.slice(60, 90))
        ],
        backgroundColor: color,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
      };
    });

    return {
      labels: ['Proyeksi Bulan ke-1', 'Proyeksi Bulan ke-2', 'Proyeksi Bulan ke-3'],
      datasets
    };
  };

  const getKorelasiChartData = () => {
    let labelsX = ['Titik Terendah', 'Titik Median', 'Titik Tertinggi'];
    const datasets = multiApiData.map((item, index) => {
      const color = colorPalette[index % colorPalette.length];
      const sortedFore = [...item.forecasting].sort((a,b) => a-b);
      return {
        label: `Matriks Distribusi: ${item.label}`,
        data: [sortedFore[0], sortedFore[Math.floor(sortedFore.length/2)], sortedFore[sortedFore.length-1]],
        borderColor: color,
        backgroundColor: `${color}33`,
        borderWidth: 2,
        pointRadius: 6,
        fill: true
      };
    });
    return { labels: labelsX, datasets };
  };

  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#b3b3b3', font: { size: 11, weight: '500' }, usePointStyle: true }, position: 'top' },
      tooltip: { mode: 'index', intersect: false },
      datalabels: {
        display: activeTab === 'distribusi' || activeTab === 'korelasi', 
        align: 'top',
        anchor: 'end',
        color: '#ffffff',
        font: { size: 10, weight: '700' },
        formatter: (value) => value.toLocaleString('id-ID')
      }
    },
    scales: {
      y: { grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [3, 3] }, ticks: { color: '#777' }, title: { display: true, text: 'Volume Penayangan (Search Views)', color: '#888' } },
      x: { grid: { display: false }, ticks: { color: '#777' } }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e2e4e9',
      padding: '30px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ================= ATAS: KPI GLOBAL METRICS GRID ================= */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px', background: '#161925', padding: '20px', borderRadius: '10px', border: '1px solid #222638' }}>
          <div><span style={{ color: '#848a9e', fontSize: '12px', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>📊 Jendela Observasi Tren</span><strong style={{ fontSize: '26px', fontWeight: '600', color: '#ffffff' }}>{metrics.totalObservasi}</strong></div>
          <div><span style={{ color: '#848a9e', fontSize: '12px', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>📈 Rata-rata Views Historis</span><strong style={{ fontSize: '26px', fontWeight: '600', color: '#ffffff' }}>{metrics.rataRataViews.toLocaleString('id-ID')}</strong></div>
          <div><span style={{ color: '#848a9e', fontSize: '12px', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>🚨 Lonjakan Tren Tertinggi</span><strong style={{ fontSize: '26px', fontWeight: '600', color: '#ffffff' }}>{metrics.rekorTertinggi.toLocaleString('id-ID')}</strong></div>
          <div>
            <span style={{ color: '#848a9e', fontSize: '12px', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>🔄 Estimasi Pergeseran Tren</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <strong style={{ fontSize: '26px', fontWeight: '600', color: metrics.pergerakanTren.includes('-') ? '#ff4d4d' : '#00e676' }}>{metrics.pergerakanTren}</strong>
              <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', background: metrics.pergerakanTren.includes('-') ? 'rgba(255,77,77,0.15)' : 'rgba(0,230,118,0.15)', color: metrics.pergerakanTren.includes('-') ? '#ff4d4d' : '#00e676', fontWeight: '700' }}>{metrics.pergerakanTren.includes('-') ? '↓' : '↑'}</span>
            </div>
          </div>
        </div>

        {/* ================= INPUT SELECTION DROPDOWN MATRIX ================= */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '20px', background: '#161925', padding: '15px 20px', borderRadius: '8px', border: '1px solid #222638', marginBottom: '25px', alignItems: 'center', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#848a9e' }}>KUERI KATA KUNCI:</span>
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ padding: '10px 15px', borderRadius: '6px', background: '#0f111a', color: '#fff', border: '1px solid #333852', cursor: 'pointer', fontSize: '14px', fontWeight: '600', minWidth: '260px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
            >
              <span>{selectedKeywords.length} Kata Kunci Dipilih</span>
              <span>{showDropdown ? '▲' : '▼'}</span>
            </div>

            {showDropdown && (
              <div style={{ position: 'absolute', top: '45px', left: '145px', background: '#161925', border: '1px solid #333852', borderRadius: '6px', width: '280px', maxHeight: '300px', overflowY: 'auto', zIndex: 99, boxShadow: '0 10px 25 rgba(0,0,0,0.5)', padding: '10px' }}>
                {keywordsList.map(kw => {
                  const isChecked = selectedKeywords.includes(kw);
                  return (
                    <label key={kw} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '4px', cursor: 'pointer', background: isChecked ? 'rgba(99, 102, 241, 0.15)' : 'transparent', color: isChecked ? '#6366f1' : '#b3b3b3' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleKeyword(kw)} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{kw.replace('views_', '').toUpperCase()}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <button onClick={handleRunPrediction} disabled={loading} style={{ padding: '12px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
            {loading ? '⏳ MEMPROSES ANALISIS...' : '🚀 PROYEKSIKAN TREN'}
          </button>
        </div>

        {/* ================= TABS MENU SELECTION ================= */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '1px solid #222638' }}>
          <button onClick={() => setActiveTab('prediksi')} style={{ padding: '12px 20px', border: 'none', background: activeTab === 'prediksi' ? '#161925' : 'transparent', color: activeTab === 'prediksi' ? '#ff7f0e' : '#848a9e', borderBottom: activeTab === 'prediksi' ? '3px solid #ff7f0e' : '3px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            🔮 Prediksi Tren Masa Depan
          </button>
          <button onClick={() => setActiveTab('pola')} style={{ padding: '12px 20px', border: 'none', background: activeTab === 'pola' ? '#161925' : 'transparent', color: activeTab === 'pola' ? '#d62728' : '#848a9e', borderBottom: activeTab === 'pola' ? '3px solid #d62728' : '3px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            🍂 Siklus Musiman & Garis Tren
          </button>
          <button onClick={() => setActiveTab('distribusi')} style={{ padding: '12px 20px', border: 'none', background: activeTab === 'distribusi' ? '#161925' : 'transparent', color: activeTab === 'distribusi' ? '#3498db' : '#848a9e', borderBottom: activeTab === 'distribusi' ? '3px solid #3498db' : '3px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            📊 Rangkuman Minat Bulanan
          </button>
          <button onClick={() => setActiveTab('korelasi')} style={{ padding: '12px 20px', border: 'none', background: activeTab === 'korelasi' ? '#161925' : 'transparent', color: activeTab === 'korelasi' ? '#a855f7' : '#848a9e', borderBottom: activeTab === 'korelasi' ? '3px solid #a855f7' : '3px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            📈 Analisis Batas Sebaran Data
          </button>
          <button onClick={() => setActiveTab('ringkasan')} style={{ padding: '12px 20px', border: 'none', background: activeTab === 'ringkasan' ? '#161925' : 'transparent', color: activeTab === 'ringkasan' ? '#00e676' : '#848a9e', borderBottom: activeTab === 'ringkasan' ? '3px solid #00e676' : '3px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
            📋 Ringkasan Informasi
          </button>
        </div>

        {/* ================= MAIN PLOT CANVAS ================= */}
        <div style={{ background: '#161925', padding: '30px', borderRadius: '10px', border: '1px solid #222638', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', marginBottom: '30px' }}>
          {error && <div style={{ color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{error}</div>}

          {multiApiData.length > 0 ? (
            <div>
              {activeTab === 'prediksi' && (
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>Proyeksi Perilaku Pencarian Model Deep Learning</h3>
                  <p style={{ margin: '0 0 25px 0', fontSize: '12px', color: '#848a9e' }}>Uji Komparasi Runutan Volume Views Kontinu Harian Bersambung</p>
                  <Line data={getPrediksiChartData()} options={darkChartOptions} />
                </div>
              )}

              {activeTab === 'pola' && (
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>Analisis Interaktif Siklus Musiman Kata Kunci (MA-7)</h3>
                  <p style={{ margin: '0 0 25px 0', fontSize: '12px', color: '#848a9e' }}>Eliminasi Noise Gejolak Harian untuk Membaca Tren Minat Utama Jangka Panjang</p>
                  <Line data={getPolaMusimanChartData()} options={darkChartOptions} />
                </div>
              )}

              {activeTab === 'distribusi' && (
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>Estimasi Distribusi Rata-rata Minat Bulanan</h3>
                  <p style={{ margin: '0 0 25px 0', fontSize: '12px', color: '#848a9e' }}>Komparasi Balok Estimasi Volume Perhatian 3 Periode Kedepan</p>
                  <Bar data={getDistribusiChartData()} plugins={[ChartDataLabels]} options={darkChartOptions} />
                </div>
              )}

              {activeTab === 'korelasi' && (
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600', color: '#fff' }}>Rentang Koefisien Sebaran Minat Pencarian</h3>
                  <p style={{ margin: '0 0 25px 0', fontSize: '12px', color: '#848a9e' }}>Komparasi Batas Nilai Penayangan Terendah, Median, dan Puncak Tertinggi Proyeksi</p>
                  <Line data={getKorelasiChartData()} plugins={[ChartDataLabels]} options={darkChartOptions} />
                </div>
              )}

              {activeTab === 'ringkasan' && (
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600', color: '#00e676' }}>📋 Ringkasan Kuantitatif Informasi Kata Kunci Aktif</h3>
                  <p style={{ margin: '0 0 25px 0', fontSize: '12px', color: '#848a9e' }}>Metrik Statistik Perbandingan Volume Pencarian (Views) Masa Lalu dan Masa Depan AI</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                    {cardsSummaryCollector.map((card) => (
                      <div key={card.name} style={{ background: '#0f111a', borderTop: `4px solid ${card.color}`, borderRadius: '6px', padding: '20px', border: '1px solid #222638' }}>
                        <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', fontWeight: '700', color: card.color }}>{card.name}</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px', color: '#b3b3b3' }}>
                          <div>Rerata 180 Hari Lalu:<br/><strong style={{ color: '#fff', fontSize: '14px' }}>{card.avgHistory.toLocaleString('id-ID')} views</strong></div>
                          <div>Rerata 90 Hari AI:<br/><strong style={{ color: '#a855f7', fontSize: '14px' }}>{card.avgForecast.toLocaleString('id-ID')} views</strong></div>
                          <div style={{ gridColumn: 'span 2', height: '1px', background: '#222638', margin: '4px 0' }}></div>
                          <div>Estimasi Bulan 1:<br/><strong style={{ color: '#10b981' }}>{card.p1.toLocaleString('id-ID')}</strong></div>
                          <div>Estimasi Bulan 2:<br/><strong style={{ color: '#3b82f6' }}>{card.p2.toLocaleString('id-ID')}</strong></div>
                          <div>Estimasi Bulan 3:<br/><strong style={{ color: '#f59e0b' }}>{card.p3.toLocaleString('id-ID')}</strong></div>
                          <div>Lonjakan Tertinggi:<br/><strong style={{ color: '#ef4444' }}>{card.peakForecast.toLocaleString('id-ID')} views</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#525876' }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔮</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                Centang kueri kata kunci pada selection box di atas,<br />
                kemudian klik tombol **"PROYEKSIKAN TREN"** untuk melihat analisis komparasi volume penayangan.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ForecastDashboard;