import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ForecastDashboard = () => {
  const keywordsList = [
    "views_abses", "views_acne", "views_bakteri", "views_dermatologi", "views_epidermis",
    "views_hormon", "views_infeksi", "views_jerawat", "views_kelenjar", "views_kista",
    "views_komedo", "views_kosmetik", "views_kulit", "views_melanin", "views_melasma",
    "views_minyak", "views_nanah", "views_nutrisi", "views_papula", "views_pori_pori",
    "views_pubertas", "views_radang", "views_stres", "views_stress", "views_wajah"
  ];

  const [selectedKeyword, setSelectedKeyword] = useState(keywordsList[7]);
  const [timeFilter, setTimeFilter] = useState('mingguan');
  const [chartData, setChartData] = useState(null);
  const [summaryCards, setSummaryCards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hitungRataRata = (arr) => {
    if (!arr || arr.length === 0) return 0;
    const total = arr.reduce((acc, val) => acc + val, 0);
    return Math.round(total / arr.length);
  };

  const handleRunPrediction = async () => {
    setLoading(true);
    setError(null);
    
    let keywordFinal = selectedKeyword;

    try {
      const response = await fetch('http://127.0.0.1:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keywordFinal }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const result = await response.json();
      
      // FIX SINKRONISASI: Menarik data_forecasting langsung dari json app.py baru
      const rawPredictions = result.data_forecasting;

      if (!rawPredictions || rawPredictions.length === 0) {
        throw new Error('Data peramalan kosong dari server backend.');
      }

      let labelsX = [];
      let dataY = [];
      let cardsInfo = {};

      if (timeFilter === 'mingguan') {
        labelsX = Array.from({ length: 12 }, (_, i) => `Minggu ${i + 1}`);
        
        for (let i = 0; i < 12; i++) {
          const sliceMinggu = rawPredictions.slice(i * 7, (i + 1) * 7);
          dataY.push(hitungRataRata(sliceMinggu));
        }

        cardsInfo = {
          unit: 'Minggu',
          box1: dataY[0] || 0,
          box2: dataY[1] || 0,
          box3: dataY[2] || 0,
        };

      } else {
        labelsX = ['Bulan 1', 'Bulan 2', 'Bulan 3'];
        
        const bulan1 = rawPredictions.slice(0, 30);
        const bulan2 = rawPredictions.slice(30, 60);
        const bulan3 = rawPredictions.slice(60, 90);

        dataY = [hitungRataRata(bulan1), hitungRataRata(bulan2), hitungRataRata(bulan3)];

        cardsInfo = {
          unit: 'Bulan',
          box1: dataY[0] || 0,
          box2: dataY[1] || 0,
          box3: dataY[2] || 0,
        };
      }

      setChartData({
        labels: labelsX,
        datasets: [
          {
            label: `Estimasi Volume Penayangan: ${keywordFinal.replace('views_', '').toUpperCase()}`,
            data: dataY,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            fill: true,
          }
        ]
      });

      setSummaryCards(cardsInfo);

    } catch (err) {
      setError("Gagal terhubung ke Server Python. Pastikan app.py sudah dijalankan!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1f3a 0%, #2d1b4e 50%, #1a2847 100%)',
      padding: '40px 30px',
      margin: 0,
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      width: '100%',
      overflow: 'hidden'
    }}>
      <div style={{ 
        maxWidth: '100%', 
        width: '100%',
        margin: '0 auto'
      }}>
        
        <div style={{
          background: 'linear-gradient(135deg, #2d3561 0%, #3d2672 100%)',
          color: 'white',
          padding: '50px 40px',
          borderRadius: '16px',
          marginBottom: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          textAlign: 'center'
        }}>
          <h1 style={{
            margin: '0 0 15px 0',
            fontSize: '2.5rem',
            fontWeight: '700',
            letterSpacing: '-0.5px'
          }}>
            Dashboard Forecasting Kesehatan Kulit
          </h1>
          <p style={{
            margin: 0,
            fontSize: '1.1rem',
            opacity: 0.9,
            fontWeight: '400',
            letterSpacing: '0.3px'
          }}>
            Analisis Prediksi Tren dengan Machine Learning
          </p>
        </div>

        <div style={{
          background: '#252d45',
          padding: '30px',
          borderRadius: '14px',
          marginBottom: '30px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '25px',
          alignItems: 'flex-end',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#e5e7eb',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📋 Pilih Kata Kunci
            </label>
            <select 
              value={selectedKeyword} 
              onChange={(e) => {
                setSelectedKeyword(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                fontSize: '15px',
                fontWeight: '500',
                color: '#e5e7eb',
                background: '#1f2937',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#60a5fa';
                e.target.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {keywordsList.map((kw) => (
                <option key={kw} value={kw} style={{ background: '#1f2937', color: '#e5e7eb' }}>
                  {kw.replace('views_', '').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#e5e7eb',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📅 Rentang Waktu
            </label>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                fontSize: '15px',
                fontWeight: '500',
                color: '#e5e7eb',
                background: '#1f2937',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#60a5fa';
                e.target.style.boxShadow = '0 0 0 3px rgba(96, 165, 250, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="mingguan" style={{ background: '#1f2937', color: '#e5e7eb' }}>MINGGUAN</option>
              <option value="bulanan" style={{ background: '#1f2937', color: '#e5e7eb' }}>BULANAN</option>
            </select>
          </div>

          <button 
            onClick={handleRunPrediction}
            disabled={loading}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              background: loading ? '#4b5563' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: loading ? 'none' : '0 8px 20px rgba(59, 130, 246, 0.4)',
              transform: loading ? 'scale(1)' : 'scale(1)',
              width: '100%',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 28px rgba(59, 130, 246, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
              }
            }}
          >
            {loading ? '⏳ Menghitung...' : '▶ Analisis Prediksi'}
          </button>
        </div>

        {error && (
          <div style={{
            background: '#7f1d1d',
            border: '2px solid #dc2626',
            color: '#fecaca',
            padding: '18px 24px',
            borderRadius: '10px',
            marginBottom: '30px',
            fontSize: '15px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            {error}
          </div>
        )}

        {/* CHART CONTAINER */}
        <div style={{
          background: '#252d45',
          padding: '35px',
          borderRadius: '14px',
          marginBottom: '30px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {chartData ? (
            <div>
              <h2 style={{
                margin: '0 0 25px 0',
                fontSize: '1.4rem',
                fontWeight: '600',
                color: '#e5e7eb'
              }}>
                📊 Visualisasi Proyeksi {timeFilter === 'mingguan' ? 'Mingguan' : 'Bulanan'}
              </h2>
              <Line 
                data={chartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        boxWidth: 14,
                        font: { weight: '500', size: 13 },
                        color: '#9ca3af',
                        padding: 15,
                        usePointStyle: true
                      }
                    },
                    title: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      grid: { color: 'rgba(255, 255, 255, 0.05)' },
                      title: { display: true, text: 'Views', font: { weight: '600', size: 13 }, color: '#9ca3af' },
                      beginAtZero: false,
                      ticks: { font: { size: 12 }, color: '#6b7280' }
                    },
                    x: {
                      grid: { display: false },
                      title: { display: true, text: timeFilter === 'mingguan' ? 'Minggu' : 'Bulan', font: { weight: '600', size: 13 }, color: '#9ca3af' },
                      ticks: { font: { size: 12 }, color: '#6b7280' }
                    }
                  }
                }} 
              />
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '80px 40px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📈</div>
              <p style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '500',
                lineHeight: '1.6'
              }}>
                Silakan tentukan kata kunci dan klik tombol analisis<br/>untuk menampilkan proyeksi grafik
              </p>
            </div>
          )}
        </div>

        {/* SUMMARY CARDS */}
        {summaryCards && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px'
          }}>
            {/* Card 1 */}
            <div style={{
              background: 'linear-gradient(135deg, #1e3a1f 0%, #1f3a2f 100%)',
              border: '2px solid #10b981',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(16, 185, 129, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.15)';
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#6ee7b7',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                ✓ Proyeksi 1 {summaryCards.unit}
              </h4>
              <p style={{
                margin: '0 0 10px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: '#10b981'
              }}>
                {summaryCards.box1.toLocaleString('id-ID')}
              </p>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#6ee7b7',
                fontWeight: '500',
                opacity: 0.8
              }}>
                Estimasi rata-rata views periode pertama
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #1e3a4c 0%, #1f2d42 100%)',
              border: '2px solid #3b82f6',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.15)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.15)';
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#93c5fd',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                ✓ Proyeksi 2 {summaryCards.unit}
              </h4>
              <p style={{
                margin: '0 0 10px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: '#3b82f6'
              }}>
                {summaryCards.box2.toLocaleString('id-ID')}
              </p>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#93c5fd',
                fontWeight: '500',
                opacity: 0.8
              }}>
                Estimasi rata-rata views periode kedua
              </p>
            </div>

            {/* Card 3 */}
            <div style={{
              background: 'linear-gradient(135deg, #3d1f4f 0%, #3d2a4f 100%)',
              border: '2px solid #a855f7',
              padding: '28px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(168, 85, 247, 0.15)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(168, 85, 247, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.15)';
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#d8b4fe',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                ✓ Proyeksi 3 {summaryCards.unit}
              </h4>
              <p style={{
                margin: '0 0 10px 0',
                fontSize: '32px',
                fontWeight: '700',
                color: '#a855f7'
              }}>
                {summaryCards.box3.toLocaleString('id-ID')}
              </p>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#d8b4fe',
                fontWeight: '500',
                opacity: 0.8
              }}>
                Estimasi rata-rata views periode ketiga
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastDashboard;




