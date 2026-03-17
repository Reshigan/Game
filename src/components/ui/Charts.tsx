import { useMemo } from 'react';

interface LineChartProps {
  data: Array<{ date: string; clicks: number }>;
  xKey: string;
  yKey: string;
  title?: string;
}

export function LineChart({ data, xKey, yKey, title }: LineChartProps) {
  const { width, height, padding, points, maxY } = useMemo(() => {
    const width = 500;
    const height = 250;
    const padding = 40;
    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - (d[yKey] as number / Math.max(...data.map(d => d[yKey] as number))) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const maxY = Math.max(...data.map(d => d[yKey] as number));

    return { width, height, padding, points, maxY };
  }, [data, yKey]);

  return (
    <div className="relative">
      {title && (
        <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
      )}
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        {/* X-axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <text 
            key={i} 
            x={padding - 10} 
            y={height - padding - (tick * (height - padding * 2))} 
            textAnchor="end" 
            alignmentBaseline="middle" 
            className="text-xs fill-gray-500"
          >
            {Math.round(tick * maxY)}
          </text>
        ))}
        
        {/* Line */}
        <polyline 
          points={points} 
          fill="none" 
          stroke="#3b82f6" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        
        {/* Points */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - (d[yKey] as number / Math.max(...data.map(d => d[yKey] as number))) * (height - padding * 2);
          
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r="4" 
              fill="#3b82f6" 
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${d[xKey]}: ${d[yKey]}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

interface BarChartProps {
  data: Array<{ hour: number; clicks: number }>;
  xKey: string;
  yKey: string;
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export function BarChart({ data, xKey, yKey, title, xLabel, yLabel }: BarChartProps) {
  const { width, height, padding, bars, maxY } = useMemo(() => {
    const width = 500;
    const height = 250;
    const padding = 40;
    const barWidth = (width - padding * 2) / data.length - 10;
    const bars = data.map((d, i) => {
      const x = padding + i * (barWidth + 10);
      const barHeight = (d[yKey] as number / Math.max(...data.map(d => d[yKey] as number))) * (height - padding * 2);
      const y = height - padding - barHeight;
      return { x, y, width: barWidth, height: barHeight, value: d[yKey], label: d[xKey] };
    });

    const maxY = Math.max(...data.map(d => d[yKey] as number));

    return { width, height, padding, bars, maxY };
  }, [data, xKey, yKey]);

  return (
    <div className="relative">
      {title && (
        <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
      )}
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        {/* X-axis */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <text 
            key={i} 
            x={padding - 10} 
            y={height - padding - (tick * (height - padding * 2))} 
            textAnchor="end" 
            alignmentBaseline="middle" 
            className="text-xs fill-gray-500"
          >
            {Math.round(tick * maxY)}
          </text>
        ))}
        
        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            <rect 
              x={bar.x} 
              y={bar.y} 
              width={bar.width} 
              height={bar.height} 
              fill="#3b82f6" 
              className="hover:fill-blue-500 transition-colors cursor-pointer"
            >
              <title>{`${bar.label}: ${bar.value}`}</title>
            </rect>
            <text 
              x={bar.x + bar.width / 2} 
              y={height - padding + 20} 
              textAnchor="middle" 
              className="text-xs fill-gray-500"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ device: string; count: number; percentage: number }>;
  labelKey: string;
  valueKey: string;
  title?: string;
}

export function PieChart({ data, labelKey, valueKey, title }: PieChartProps) {
  const { width, height, radius, slices } = useMemo(() => {
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;
    
    const total = data.reduce((sum, d) => sum + (d[valueKey] as number), 0);
    let currentAngle = 0;
    
    const slices = data.map((d, i) => {
      const value = d[valueKey] as number;
      const percentage = value / total;
      const startAngle = currentAngle;
      const endAngle = currentAngle + percentage * 2 * Math.PI;
      currentAngle = endAngle;
      
      const x1 = width / 2 + radius * Math.cos(startAngle);
      const y1 = height / 2 + radius * Math.sin(startAngle);
      const x2 = width / 2 + radius * Math.cos(endAngle);
      const y2 = height / 2 + radius * Math.sin(endAngle);
      
      const largeArcFlag = percentage > 0.5 ? 1 : 0;
      
      const pathData = [
        `M ${width / 2} ${height / 2}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      
      return {
        path: pathData,
        color: colors[i % colors.length],
        label: d[labelKey],
        value,
        percentage
      };
    });
    
    return { width, height, radius, slices };
  }, [data, labelKey, valueKey]);

  return (
    <div className="relative">
      {title && (
        <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
      )}
      <div className="flex items-center justify-center">
        <svg width={width} height={height}>
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.path}
              fill={slice.color}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{`${slice.label}: ${slice.value} (${(slice.percentage * 100).toFixed(1)}%)`}</title>
            </path>
          ))}
        </svg>
        <div className="ml-4 space-y-1">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: slice.color }}
              ></div>
              <span className="text-sm text-gray-700">{slice.label}</span>
              <span className="ml-2 text-sm text-gray-500">
                ({(slice.percentage * 100).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TableProps {
  data: Array<{ word: string; clicks: number; avgDuration: number }>;
  columns: Array<{ header: string; key: string; align?: 'left' | 'right' }>;
}

export function Table({ data, columns }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i} 
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col, j) => (
                <td 
                  key={j} 
                  className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.key === 'word' ? (
                    <span className="font-medium text-gray-900">{row[col.key]}</span>
                  ) : (
                    row[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}