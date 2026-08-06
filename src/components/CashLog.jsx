import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { sortMonthsDescending } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function CashLog({ withdrawals }) {
  const sortedMonths = sortMonthsDescending(Object.keys(withdrawals || {}));
  const [expandedMonth, setExpandedMonth] = useState(sortedMonths[0] || null);
  const chartMonths = sortedMonths.slice(0, 6).reverse(); // Oldest to newest for the chart
  
  const chartData = {
    labels: chartMonths,
    datasets: [
      {
        label: 'Cash Withdrawn',
        data: chartMonths.map(m => withdrawals[m].total),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '6-Month Cash Trend',
        color: '#f8fafc',
        align: 'start',
        font: { size: 14 }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.1)' },
        ticks: { color: '#ffffff' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#ffffff' }
      }
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'start' }}>
      
      {/* Left side: Accordions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedMonths.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px' }}>No cash withdrawals recorded.</div>
        ) : (
          sortedMonths.map(month => (
            <div key={month} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div 
                onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>{expandedMonth === month ? '▼' : '▶'} {month}</span>
                <span style={{ color: 'var(--danger)' }}>
                  ₱{withdrawals[month].total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {expandedMonth === month && (
                <div style={{ padding: '16px' }}>
                  {withdrawals[month].logs.map((log, idx) => {
                    const dateStr = log.date ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx !== withdrawals[month].logs.length - 1 ? '1px dashed var(--glass-border)' : 'none' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px', width: '60px' }}>{dateStr}</span>
                        <span style={{ fontWeight: 'bold', flex: 1 }}>{log.reason}</span>
                        <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                          ₱{Number(log.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Right side: Chart */}
      <div className="glass-card" style={{ padding: '20px', height: '400px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>

    </div>
  );
}
