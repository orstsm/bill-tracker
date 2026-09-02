import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sortMonthsDescending } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export default function CashLog({ withdrawals }) {
  const sortedMonths = sortMonthsDescending(Object.keys(withdrawals || {}));
  const [expandedMonth, setExpandedMonth] = useState(sortedMonths[0] || null);
  const chartMonths = sortedMonths.slice(0, 6).reverse();
  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  const chartData = useMemo(() => ({
    labels: chartMonths.map((month) => month.replace(/\s\d{4}$/, '')),
    datasets: [{
      data: chartMonths.map((month) => withdrawals[month].total),
      backgroundColor: isDark ? '#42d39b' : '#07966a',
      borderRadius: 7,
      borderSkipped: false,
      maxBarThickness: 46,
    }],
  }), [chartMonths, withdrawals, isDark]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: { label: (context) => money(context.raw) },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: isDark ? 'rgba(255,255,255,.10)' : 'rgba(60,60,67,.12)' },
        border: { display: false },
        ticks: {
          color: isDark ? '#a2a2a8' : '#6c6c70',
          font: { family: '-apple-system, BlinkMacSystemFont, sans-serif', size: 11 },
          callback: (value) => value >= 1000 ? `${value / 1000}k` : value,
        },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: isDark ? '#a2a2a8' : '#6c6c70',
          font: { family: '-apple-system, BlinkMacSystemFont, sans-serif', size: 11 },
          maxRotation: 0,
        },
      },
    },
  }), [isDark]);

  if (!sortedMonths.length) {
    return (
      <div className="surface empty-state">
        <strong>No withdrawals yet</strong>
        <span>Cash withdrawals you log will appear here.</span>
      </div>
    );
  }

  return (
    <div className="content-stack">
      <section>
        <div className="section-heading"><h2>6-month cash trend</h2></div>
        <div className="surface" style={{ height: 260, padding: '18px 12px 12px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </section>

      <section className="section-gap">
        <div className="section-heading"><h2>Withdrawals</h2></div>
        <div className="content-stack">
          {sortedMonths.map((month) => {
            const expanded = expandedMonth === month;
            return (
              <div className="surface" key={month}>
                <button className="accordion-header" type="button" onClick={() => setExpandedMonth(expanded ? null : month)} aria-expanded={expanded} data-no-swipe>
                  <span className="accordion-title">{month}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="accordion-meta">{money(withdrawals[month].total)}</span>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {expanded && (
                  <div className="accordion-content">
                    {withdrawals[month].logs.map((log, index) => (
                      <div className="settings-row" key={log.id || `${log.date}-${index}`}>
                        <span>
                          <strong style={{ fontSize: 15 }}>{log.reason}</strong><br />
                          <span className="accordion-meta">{log.date ? new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}</span>
                        </span>
                        <strong style={{ color: 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>−{money(log.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
