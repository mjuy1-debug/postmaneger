import React, { useState, useEffect, useMemo } from 'react';
import { fetchData, fetchStaffList, fetchHolidays } from './services/api';
import { calculateOverview } from './utils/calculations';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell, ComposedChart, AreaChart, Area,
  LabelList
} from 'recharts';
import {
  Calendar, Package, MapPin, Moon, Sun, Users, AlertTriangle, TrendingUp, TrendingDown,
  Activity, ArrowUpDown, Search
} from 'lucide-react';
import clsx from 'clsx';
import { format, startOfMonth, endOfMonth } from 'date-fns';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">일시적인 오류가 발생했습니다.</h2>
          <p className="text-gray-500 mb-4">{this.state.error?.toString()}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DISTRICTS = [
  { id: 'dongdaemun', label: '동대문구' },
  { id: 'seongbuk', label: '성북구' },
  { id: 'songpa', label: '송파구' },
];

function App() {
  // State
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICTS[0].id);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays().then(setHolidays);
  }, []); // Run once on mount. If user updates excel, they might need to reload page.
  // The user asked "When excel is updated... automatically applied".
  // If we only load on mount, they need to refresh.
  // To make it "automatic" without full reload, maybe we should reload holidays when they click "Search" or change districts?
  // Let's add it to the dependency of the main fetch effect or a separate one that runs periodically?
  // Easiest is to fetch it whenever we fetch data.

  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default Dark Mode for "Senior Manager" feel

  // Table Sort & Filter State
  const [sortConfig, setSortConfig] = useState({ key: 'totalQty', direction: 'desc' });
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [listModalData, setListModalData] = useState(null);
  const [listModalTitle, setListModalTitle] = useState('');
  const [listModalType, setListModalType] = useState('performance'); // 'performance' | 'detail'

  // Fetch data
  useEffect(() => {
    if (selectedDistrict && startDate && endDate) {
      setLoading(true);
      Promise.all([
        fetchData(selectedDistrict, startDate, endDate),
        fetchHolidays()
      ]).then(([data, holidayData]) => {
        setRawData(data);

        setHolidays(holidayData);
        setLoading(false);
      });
    }
  }, [selectedDistrict, startDate, endDate]);



  // Derived state
  const stats = useMemo(() => calculateOverview(rawData, holidays), [rawData, holidays]);

  const sortedStaff = useMemo(() => {
    let items = [...stats.staffStats];

    // 1. Filter
    if (filterName) {
      items = items.filter(s => s.name.includes(filterName));
    }
    if (filterStatus !== 'all') {
      items = items.filter(s => s.status === filterStatus);
    }

    // 2. Sort
    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return items;
  }, [stats.staffStats, filterName, filterStatus, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // List Modal Handlers
  const openStaffListModal = async (type) => {
    console.log("openStaffListModal called with type:", type);
    console.log("Current selectedDistrict:", selectedDistrict);

    let filtered = [];
    let title = '';
    let modalType = 'performance';

    if (type === 'overload') {
      filtered = stats.staffStats.filter(s => s.status === '과부하');
      title = '과부하 직원 목록';
    } else if (type === 'underload') {
      // '과부족' status check
      filtered = stats.staffStats.filter(s => s.status === '과부족');
      title = '과부족 직원 목록';
    } else if (type === 'all') {
      // Fetch Detailed List
      try {
        console.log("Attempting to fetch staff list...");
        setLoading(true); // Maybe local loading?
        filtered = await fetchStaffList(selectedDistrict);
        console.log("Fetched staff list result:", filtered);
        title = '전체 담당자 목록 (상세)';
        modalType = 'detail';
      } catch (err) {
        console.error("Error in openStaffListModal:", err);
        filtered = [];
      } finally {
        setLoading(false);
      }
    }

    setListModalData(filtered);
    setListModalTitle(title);
    setListModalType(modalType);
  };

  // Theme toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 transition-colors duration-200 font-sans">

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 tracking-tight">
              <Package className="text-blue-600 dark:text-blue-500" /> POST 관리자 대시보드
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">광재 전용 통합 모니터링 시스템</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* District Tabs */}
            <div className="flex bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
              {DISTRICTS.map(dist => (
                <button
                  key={dist.id}
                  onClick={() => setSelectedDistrict(dist.id)}
                  className={clsx(
                    "px-4 py-2 text-sm font-bold rounded-md transition-all",
                    selectedDistrict === dist.id
                      ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  )}
                >
                  {dist.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white w-32"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white w-32"
              />
            </div>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-lg font-medium text-gray-500">데이터 분석 중...</p>
          </div>
        ) : stats.totalVolume === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 m-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4 inline-block">
              <Package size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">데이터가 없습니다</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              선택하신 기간({startDate} ~ {endDate})에 해당하는 실적 데이터가 존재하지 않습니다.<br />
              조회 기간을 변경하거나 다른 구역을 선택해주세요.
            </p>
          </div>
        ) : (
          <main className="space-y-6 max-w-[1600px] mx-auto">

            {/* 1. KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="총 물량"
                value={stats.totalVolume.toLocaleString()}
                sub="선택 기간 합계"
                icon={<Package className="text-blue-500" />}
              />
              <KpiCard
                title="등록 담당자"
                value={`${stats.totalStaff}명`}
                sub="전체 인원"
                icon={<Users className="text-green-500" />}
                onClick={() => openStaffListModal('all')}
              />
              <KpiCard
                title="근무일수"
                value={`${stats.effectiveDays}일`}
                sub="정상 근무일 기준"
                icon={<Calendar className="text-orange-500" />}
              />
              <KpiCard
                title="일 평균 물량"
                value={stats.globalDailyAvg.toFixed(0)}
                sub="담당자 1인당 평균"
                icon={<Activity className="text-purple-500" />}
              />
              <KpiCard
                title="과부하 직원"
                value={`${stats.overloadCount}명`}
                sub="평균 대비 +20% 이상"
                icon={<AlertTriangle className="text-red-500" />}
                isDanger={stats.overloadCount > 0}
                onClick={() => openStaffListModal('overload')}
              />
              <KpiCard
                title="과부족 직원"
                value={`${stats.underloadCount}명`}
                sub="평균 대비 -30% 미만"
                icon={<TrendingDown className="text-gray-500" />}
                isDanger={false}
                onClick={() => openStaffListModal('underload')}
              />
            </div>

            {/* 2. Flow & Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Line Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp size={18} /> 일별 물량 흐름</h3>
                    <p className="text-xs text-gray-400 mt-1">물량 급증/급감 구간 확인</p>
                  </div>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis
                        dataKey="date"
                        interval={0}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickFormatter={(v) => v.slice(5)}
                        axisLine={false}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                        itemStyle={{ color: darkMode ? '#fff' : '#000' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="count" name="전체 물량" stroke="#3b82f6" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Day of Week Bar */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Calendar size={18} /> 요일별 평균 물량</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.dayOfWeekStats}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} axisLine={false} />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                      <Bar dataKey="avg" name="평균 물량" fill="#8884d8" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="avg" position="top" fill="#6b7280" fontSize={12} formatter={(val) => Math.round(val).toLocaleString()} />
                        {stats.dayOfWeekStats.map((entry, index) => {
                          // Exclude Sun(0) and Mon(1) from the average calculation for comparison
                          // Target: Tue(2) ~ Sat(6)
                          const targetStats = stats.dayOfWeekStats.filter(d => d.key !== 0 && d.key !== 1);
                          const targetAvg = targetStats.reduce((acc, curr) => acc + curr.avg, 0) / (targetStats.length || 1);

                          // Highlight only Tue-Sat if > targetAvg
                          const isTargetDay = entry.key !== 0 && entry.key !== 1;
                          const isRed = isTargetDay && entry.avg > targetAvg;
                          return <Cell key={`cell-${index}`} fill={isRed ? '#ef4444' : '#6366f1'} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. Comparison & Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 10 Staff */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">직원별 일 평균 (Top 10)</h3>
                  <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">빨강: 과부하 위험</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const chartData = [...stats.staffStats].sort((a, b) => b.dailyAvg - a.dailyAvg).slice(0, 10);

                      const CustomLabel = (props) => {
                        const { x, y, width, value, index } = props;
                        const staff = chartData[index];
                        const isRed = staff.isOverloaded;

                        return (
                          <text
                            x={x + width + 5}
                            y={y + 15} // Adjust for vertical alignment (barSize=24, half is 12)
                            fill={isRed ? "#ef4444" : "#6b7280"}
                            fontSize={11}
                            fontWeight={isRed ? "bold" : "normal"}
                            textAnchor="start"
                          >
                            {value.toFixed(0)}
                            {isRed && ` (Max: ${staff.maxQty})`}
                          </text>
                        );
                      };

                      return (
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={true} vertical={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                          <Bar dataKey="dailyAvg" name="일 평균" radius={[0, 4, 4, 0]} barSize={24}>
                            <LabelList dataKey="dailyAvg" content={<CustomLabel />} />
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.isOverloaded ? '#ef4444' : '#3b82f6'} />
                            ))}
                          </Bar>
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quadrant Analysis (Scatter) */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">성실도 vs 처리량 (효율성 분석)</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 과부하</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 정상</span>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" dataKey="workDays" name="근무일수" unit="일" tick={{ fill: '#9ca3af' }} />
                      <YAxis type="number" dataKey="dailyAvg" name="일평균" unit="건" tick={{ fill: '#9ca3af' }} />
                      <ZAxis type="number" dataKey="totalQty" range={[60, 400]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                      <ReferenceLine y={stats.globalDailyAvg} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '평균 부하', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                      <Scatter name="직원" data={stats.staffStats} fill="#8884d8">
                        {stats.staffStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.dailyAvg > stats.globalDailyAvg * 1.2 ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. Details & Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Analysis: Max vs Avg */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-6">변동성 위험 (최고 물량 vs 평균)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={[...stats.staffStats].sort((a, b) => b.maxQty - a.maxQty).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                      <Legend />
                      <Bar dataKey="dailyAvg" name="평균 물량" fill="#3b82f6" barSize={20} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="dailyAvg" position="top" fill="#6b7280" fontSize={10} formatter={(val) => val.toFixed(0)} />
                      </Bar>
                      <Line type="monotone" dataKey="maxQty" name="최고 물량 (폭주)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gyeombae Impact */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-6">겸배 제외 시 평균 변화</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.staffStats.filter(s => s.gyeombaeQty > 0).sort((a, b) => b.gyeombaeQty - a.gyeombaeQty).slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                      <Legend />
                      <Bar dataKey="dailyAvg" name="전체 평균" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={15}>
                        <LabelList dataKey="dailyAvg" position="top" fill="#6b7280" fontSize={10} formatter={(val) => val.toFixed(0)} />
                      </Bar>
                      <Bar dataKey="avgExcGyeombae" name="겸배 제외 평균" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15}>
                        <LabelList dataKey="avgExcGyeombae" position="top" fill="#10b981" fontSize={10} formatter={(val) => val.toFixed(0)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 5. Detailed Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-lg">직원별 상세 실적표</h3>

                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="이름 검색"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all w-48"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-4 pr-8 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">전체 상태</option>
                    <option value="과부하">과부하</option>
                    <option value="주의">주의</option>
                    <option value="정상">정상</option>
                    <option value="부족">부족</option>
                    <option value="과부족">과부족</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium border-b dark:border-gray-700">
                    <tr>
                      {[
                        { key: 'status', label: '상태' },
                        { key: 'name', label: '이름' },
                        { key: 'workDays', label: '근무일', align: 'center' },
                        { key: 'unitPrice', label: '단가', align: 'right' },
                        { key: 'totalQty', label: '총 물량', align: 'right' },
                        { key: 'dailyAvg', label: '일 평균', align: 'right' },
                        { key: 'avgExcGyeombae', label: '겸배 제외 평균', align: 'right' },
                        { key: 'gyeombaeQty', label: '겸배 수량', align: 'right' },
                        { key: 'maxQty', label: '최고 물량', align: 'right' }
                      ].map((col) => (
                        <th
                          key={col.key}
                          className={clsx("p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition select-none group", col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left')}
                          onClick={() => handleSort(col.key)}
                        >
                          <div className={clsx("flex items-center gap-1", col.align === 'center' && 'justify-center', col.align === 'right' && 'justify-end')}>
                            {col.label}
                            <ArrowUpDown size={12} className={clsx("opacity-0 group-hover:opacity-100 transition-opacity", sortConfig.key === col.key && "opacity-100 text-blue-500")} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedStaff.map((staff) => (
                      <tr
                        key={staff.name}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700/50 transition cursor-pointer group"
                        onClick={() => setSelectedStaff(staff)}
                      >
                        <td className="p-4">
                          <span className={clsx(
                            "px-2 py-1 rounded-full text-xs font-bold",
                            staff.status === '과부하' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900" :
                              staff.status === '주의' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900" :
                                staff.status === '과부족' ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600" :
                                  staff.status === '부족' ? "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500 border border-gray-200 dark:border-gray-700" :
                                    "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-900"
                          )}>
                            {staff.status}
                          </span>

                        </td>
                        <td className="p-4 font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">{staff.name}</td>
                        <td className="p-4 text-center text-gray-500">{staff.workDays}일</td>
                        <td className="p-4 text-right text-gray-500">{staff.unitPrice.toLocaleString()}원</td>
                        <td className="p-4 text-right font-medium">{staff.totalQty.toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-blue-600 dark:text-blue-400">{staff.dailyAvg.toFixed(0)}</td>
                        <td className="p-4 text-right text-green-600 dark:text-green-400">{staff.avgExcGyeombae.toFixed(0)}</td>
                        <td className="p-4 text-right text-gray-400">{staff.gyeombaeQty.toLocaleString()}</td>
                        <td className="p-4 text-right text-gray-400">{staff.maxQty.toLocaleString()}</td>
                      </tr>
                    ))}
                    {sortedStaff.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-500">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </main>
        )}

        {/* Staff Detail Modal */}
        {selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedStaff(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">{selectedStaff.name}</h2>
                    <span className={clsx(
                      "text-sm px-3 py-1 rounded-full border font-bold",
                      selectedStaff.status === '과부하' ? "border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20" :
                        selectedStaff.status === '주의' ? "border-yellow-500 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" :
                          "border-green-500 text-green-500 bg-green-50 dark:bg-green-900/20"
                    )}>{selectedStaff.status}</span>
                  </div>
                  <p className="text-gray-500 mt-2">
                    총 근무 {selectedStaff.workDays}일 동안 <strong className="text-gray-900 dark:text-white">{selectedStaff.totalQty.toLocaleString()}건</strong> 배송
                  </p>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-400">✕</button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl mb-6">
                <h4 className="text-sm font-bold text-gray-500 mb-4">최근 30일 물량 패턴</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <AreaChart data={selectedStaff.records}>
                      <defs>
                        <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="날짜" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} />
                      <YAxis tick={{ fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderRadius: '8px', border: 'none' }} />
                      <Area type="monotone" dataKey="당일수량" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorQty)" />
                      <Area type="monotone" dataKey="검배수량" stroke="#10b981" strokeWidth={2} fill="transparent" strokeDasharray="5 5" name="겸배수량" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <p className="text-blue-500 dark:text-blue-400 text-xs font-bold mb-1">일 최고 실적</p>
                  <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{selectedStaff.maxQty.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                  <p className="text-green-500 dark:text-green-400 text-xs font-bold mb-1">겸배 제외 평균</p>
                  <p className="text-2xl font-black text-green-700 dark:text-green-300">{selectedStaff.avgExcGyeombae.toFixed(0)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                  <p className="text-purple-500 dark:text-purple-400 text-xs font-bold mb-1">겸배 비중</p>
                  <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
                    {selectedStaff.totalQty > 0
                      ? ((selectedStaff.gyeombaeQty / selectedStaff.totalQty) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff List Modal (Category View) */}
        {listModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setListModalData(null)}>
            <div className={clsx("bg-white dark:bg-gray-800 rounded-2xl w-full shadow-2xl p-8 border border-gray-200 dark:border-gray-700", listModalType === 'detail' ? 'max-w-5xl' : 'max-w-2xl')} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{listModalTitle}</h2>
                <button onClick={() => setListModalData(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition text-gray-400">✕</button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium border-b dark:border-gray-700 sticky top-0">
                    <tr>
                      {listModalType === 'performance' ? (
                        <>
                          <th className="p-3">이름</th>
                          <th className="p-3 text-center">상태</th>
                          <th className="p-3 text-right">일 평균</th>
                          <th className="p-3 text-right">총 물량</th>
                        </>
                      ) : (
                        <>
                          <th className="p-3">이름</th>
                          <th className="p-3">집배구</th>
                          <th className="p-3">구분코드</th>
                          <th className="p-3">담당구역</th>
                          <th className="p-3">전화번호</th>
                          <th className="p-3">PDA번호</th>
                          <th className="p-3 text-center">생년월일</th>
                          <th className="p-3 text-center">임용일자</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {listModalData.map((staff, idx) => (
                      <tr
                        key={idx}
                        className={clsx("transition", listModalType === 'performance' ? "hover:bg-blue-50 dark:hover:bg-gray-700/50 cursor-pointer" : "hover:bg-gray-50 dark:hover:bg-gray-700")}
                        onClick={() => {
                          if (listModalType === 'performance') {
                            setSelectedStaff(staff);
                            setListModalData(null);
                          }
                        }}
                      >
                        {listModalType === 'performance' ? (
                          <>
                            <td className="p-3 font-bold">{staff.name}</td>
                            <td className="p-3 text-center">
                              <span className={clsx(
                                "px-2 py-1 rounded-full text-xs font-bold",
                                staff.status === '과부하' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                                  staff.status === '주의' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    staff.status === '과부족' ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300" :
                                      staff.status === '부족' ? "bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-500" :
                                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                              )}>
                                {staff.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{staff.dailyAvg.toFixed(0)}</td>
                            <td className="p-3 text-right text-gray-500">{staff.totalQty.toLocaleString()}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-bold">{staff['이름']}</td>
                            <td className="p-3">{staff['집배구']}</td>
                            <td className="p-3">{staff['구분코드']}</td>
                            <td className="p-3">{staff['담당구역']}</td>
                            <td className="p-3 text-gray-500">{staff['전화번호']}</td>
                            <td className="p-3 text-gray-500">{staff['PDA번호']}</td>
                            <td className="p-3 text-center text-gray-500">{staff['생년월일']}</td>
                            <td className="p-3 text-center text-gray-500">{staff['임용일자']}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {listModalData.length === 0 && (
                      <tr>
                        <td colSpan={listModalType === 'performance' ? 4 : 8} className="p-8 text-center text-gray-500">해당하는 직원이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div >
  );
}

function KpiCard({ title, value, sub, icon, isDanger, onClick }) {
  return (
    <div className={clsx(
      "bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 transition-all hover:translate-y-[-2px]",
      isDanger ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-transparent",
      onClick && "cursor-pointer hover:shadow-md"
    )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{title}</p>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <h2 className={clsx("text-3xl font-black tracking-tight", isDanger ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white")}>
          {value}
        </h2>
      </div>
      <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
    </div>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
