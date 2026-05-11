import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  Clipboard,
  Compass,
  Crown,
  Database,
  Globe2,
  Heart,
  Home,
  Landmark,
  Leaf,
  ListChecks,
  Loader2,
  Map as MapIcon,
  MapPin,
  MapPinned,
  PieChart,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const CATEGORIES = [
  { id: 'traffic', label: 'Traffic', ko: '교통', en: 'Traffic', icon: Car },
  { id: 'culture', label: 'Culture', ko: '문화·여가·디지털', en: 'Culture & Digital', icon: Landmark },
  { id: 'convenience', label: 'Convenience', ko: '생활편의', en: 'Convenience', icon: BriefcaseBusiness },
  { id: 'safety', label: 'Safety', ko: '안전', en: 'Safety', icon: ShieldCheck },
  { id: 'nature', label: 'Nature', ko: '자연', en: 'Nature', icon: Leaf },
]

const PRESETS = [
  {
    id: 'city',
    label: 'City Lover',
    labelKo: '도시 생활 선호',
    icon: Heart,
    weights: { traffic: 78, culture: 85, convenience: 82, safety: 62, nature: 45 },
  },
  {
    id: 'nature',
    label: 'Nature Seeker',
    labelKo: '자연 선호',
    icon: Leaf,
    weights: { traffic: 50, culture: 55, convenience: 60, safety: 70, nature: 92 },
  },
  {
    id: 'family',
    label: 'Family Friendly',
    labelKo: '가족 친화',
    icon: Users,
    weights: { traffic: 65, culture: 58, convenience: 88, safety: 86, nature: 72 },
  },
  {
    id: 'long_stay',
    label: 'Long-stay Tourist',
    labelKo: '장기체류관광',
    icon: MapPinned,
    weights: { traffic: 58, culture: 88, convenience: 72, safety: 82, nature: 70 },
  },
]

const FALLBACK_REGIONS = [
  {
    region_id: '11',
    region_name_ko: '서울특별시',
    region_name_en: 'Seoul Special City',
    description: 'Culture, transport, hospitals, and daily convenience are highly concentrated.',
    descriptionKo: '교통·문화·의료·생활편의 인프라가 매우 밀집된 대도시형 추천 지역입니다.',
    lat: 37.5665,
    lng: 126.978,
    tone: 'city',
    scores: { traffic: 95, culture: 91, convenience: 96, safety: 70, nature: 55 },
  },
  {
    region_id: '50',
    region_name_ko: '제주특별자치도',
    region_name_en: 'Jeju Special Self-Governing Province',
    description: 'A strong nature and long-stay tourism option with clean scenery and leisure assets.',
    descriptionKo: '자연환경과 장기체류 관광 자원이 강점인 휴식형 추천 지역입니다.',
    lat: 33.4996,
    lng: 126.5312,
    tone: 'jeju',
    scores: { traffic: 52, culture: 82, convenience: 67, safety: 76, nature: 98 },
  },
  {
    region_id: '42',
    region_name_ko: '강원도',
    region_name_en: 'Gangwon Province',
    description: 'Great for nature-oriented living, remote work retreats, and calm regional stays.',
    descriptionKo: '자연 중심 생활, 원격근무 휴식지, 조용한 체류에 적합한 추천 지역입니다.',
    lat: 37.8228,
    lng: 128.1555,
    tone: 'mountain',
    scores: { traffic: 60, culture: 64, convenience: 61, safety: 82, nature: 96 },
  },
  {
    region_id: '26',
    region_name_ko: '부산광역시',
    region_name_en: 'Busan Metropolitan City',
    description: 'Balanced city convenience with coastal culture, transport access, and tourism assets.',
    descriptionKo: '해양 문화, 도시 편의, 교통 접근성이 균형 잡힌 추천 지역입니다.',
    lat: 35.1796,
    lng: 129.0756,
    tone: 'ocean',
    scores: { traffic: 82, culture: 84, convenience: 86, safety: 72, nature: 74 },
  },
  {
    region_id: '47',
    region_name_ko: '경상북도',
    region_name_en: 'Gyeongsangbuk-do',
    description: 'A quieter stay option with historic culture, local infrastructure, and open nature.',
    descriptionKo: '역사문화, 지역 인프라, 넓은 자연환경을 함께 고려할 수 있는 추천 지역입니다.',
    lat: 36.4919,
    lng: 128.8889,
    tone: 'plain',
    scores: { traffic: 58, culture: 76, convenience: 62, safety: 79, nature: 83 },
  },
  {
    region_id: '29',
    region_name_ko: '광주광역시',
    region_name_en: 'Gwangju Metropolitan City',
    description: 'Good culture and convenience balance for a compact city stay.',
    descriptionKo: '도시 규모 대비 문화·생활편의 접근성이 좋은 추천 지역입니다.',
    lat: 35.1595,
    lng: 126.8526,
    tone: 'plain',
    scores: { traffic: 70, culture: 82, convenience: 78, safety: 74, nature: 68 },
  },
]

const DEFAULT_DETAILS = {
  hospitals: '상급·종합병원 및 병의원 접근성',
  pharmacies: '약국 밀도와 야간 접근성',
  accommodation: '숙박시설 및 장기체류 숙소 기반',
  wifi: '공공 와이파이와 5G 통신 품질',
  parks: '도시공원·녹지 접근성',
  airQuality: '미세먼지·오존 등 대기질',
  safety: '지역안전지수와 생활안전 지표',
}

const MAP_POSITIONS = {
  '11': { left: '42%', top: '20%' },
  '50': { left: '21%', top: '86%' },
  '42': { left: '68%', top: '20%' },
  '26': { left: '78%', top: '65%' },
  '47': { left: '69%', top: '44%' },
  '29': { left: '30%', top: '61%' },
}

const MODE_TEXT = {
  simple: {
    modeLabel: '간편',
    headline: '추천 결과 Top 5',
    sub: '5대 카테고리 가중치를 기준으로 계산했습니다.',
    run: '추천 실행',
    share: '공유',
    lang: 'ko',
  },
  detail: {
    modeLabel: '꼼꼼',
    headline: '추천 결과 Top 5',
    sub: '카테고리 점수와 기여도를 함께 확인합니다.',
    run: '추천 재계산',
    share: '공유',
    lang: 'ko',
  },
  senior: {
    modeLabel: '시니어',
    headline: '보기 쉬운 추천 Top 5',
    sub: '큰 글씨와 쉬운 문장으로 핵심 정보만 보여드립니다.',
    run: '크게 보기로 추천',
    share: '공유',
    lang: 'ko',
  },
  english: {
    modeLabel: 'English',
    headline: 'Top 5 Recommended Regions',
    sub: 'Calculated from your weighted preferences.',
    run: 'Run Recommendation',
    share: 'Share',
    lang: 'en',
  },
}

function normalizeWeights(weights) {
  const total = Object.values(weights).reduce((acc, value) => acc + Number(value || 0), 0) || 1
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Number(value || 0) / total]))
}

function weightTotal(weights) {
  return Object.values(weights).reduce((acc, value) => acc + Number(value || 0), 0)
}

function scoreRegion(region, weights) {
  const normalized = normalizeWeights(weights)
  return Object.entries(normalized).reduce((sum, [category, weight]) => sum + (region.scores?.[category] || 0) * weight, 0)
}

function topCategories(region, count = 2) {
  return Object.entries(region.scores || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => CATEGORIES.find((c) => c.id === id))
    .filter(Boolean)
}

function reasonFor(region, mode = 'simple') {
  const top = topCategories(region, 2)
  if (mode === 'english') {
    return `${top.map((item) => item.en).join(' and ')} scores are strong for your current preference.`
  }
  if (mode === 'senior') {
    return `${top.map((item) => item.ko).join('와 ')}이 좋아 생활하기 편한 지역입니다.`
  }
  return `${top.map((item) => item.ko).join('·')} 지표가 높아 현재 조건에 잘 맞습니다.`
}

async function fetchJson(path, options) {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) throw new Error(`${response.status} ${path}`)
  return response.json()
}

async function fetchFirst(paths, options) {
  const errors = []
  for (const path of paths) {
    try {
      return await fetchJson(path, options)
    } catch (error) {
      errors.push(error.message)
    }
  }
  throw new Error(errors.join(' / '))
}

function convertApiData(regionsPayload, scoresPayload) {
  const regions = regionsPayload?.regions || regionsPayload?.data || []
  const scores = scoresPayload?.scores || scoresPayload?.data || []
  if (!regions.length || !scores.length) return null

  const grouped = new Map()
  for (const region of regions) {
    grouped.set(String(region.region_id), {
      ...region,
      region_id: String(region.region_id),
      region_name_en: region.region_name_en || region.region_name_ko,
      description: 'FastAPI and Supabase live score data are reflected.',
      descriptionKo: 'FastAPI와 Supabase에서 조회한 지역 지표 기반 추천 결과입니다.',
      lat: region.latitude || region.lat,
      lng: region.longitude || region.lng,
      tone: region.region_name_ko?.includes('제주') ? 'jeju' : region.region_name_ko?.includes('강원') ? 'mountain' : 'city',
      scores: {},
    })
  }

  for (const row of scores) {
    const region = grouped.get(String(row.region_id))
    if (!region || !row.category_id || row.score_100 == null) continue
    if (!region.__catRows) region.__catRows = {}
    if (!region.__catRows[row.category_id]) region.__catRows[row.category_id] = []
    region.__catRows[row.category_id].push(Number(row.score_100))
  }

  for (const region of grouped.values()) {
    for (const category of CATEGORIES) {
      const values = region.__catRows?.[category.id] || []
      region.scores[category.id] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    }
    delete region.__catRows
  }

  return [...grouped.values()].filter((region) => Object.values(region.scores).some(Boolean))
}

function mapRecommendationPayload(payload, weights, mode) {
  const list = payload?.recommendations || payload?.results || payload?.data || []
  if (!Array.isArray(list) || !list.length) return null

  return list.map((item, index) => ({
    ...item,
    rank: item.rank || index + 1,
    region_id: String(item.region_id || item.id || index + 1),
    region_name_ko: item.region_name_ko || item.name_ko || item.region_name || `추천 지역 ${index + 1}`,
    region_name_en: item.region_name_en || item.name_en || item.region_name_ko || `Region ${index + 1}`,
    scores: item.category_scores || item.scores || FALLBACK_REGIONS[index % FALLBACK_REGIONS.length].scores,
    finalScore: Number(item.final_score || item.finalScore || scoreRegion(item, weights)),
    reason: item.reasons?.[0] || item.reason || reasonFor(item, mode),
    description: item.description || 'Live recommendation result from API.',
    descriptionKo: item.description_ko || item.description || 'API 추천 결과입니다.',
    tone: item.tone || FALLBACK_REGIONS[index % FALLBACK_REGIONS.length].tone,
  }))
}

function fallbackDetails(region) {
  const score = region.scores || {}
  return {
    hospitals: score.convenience >= 80 ? '병의원 접근성이 우수합니다.' : '기본 의료 인프라를 확인할 수 있습니다.',
    pharmacies: score.convenience >= 75 ? '약국 접근성이 좋은 편입니다.' : '약국 접근성은 세부 확인이 필요합니다.',
    accommodation: score.culture >= 80 ? '숙박·관광 인프라가 풍부합니다.' : '숙박 인프라는 보통 수준입니다.',
    wifi: score.culture >= 75 ? '공공 와이파이와 디지털 인프라가 양호합니다.' : '통신 인프라 추가 확인이 필요합니다.',
    parks: score.nature >= 80 ? '공원·녹지와 자연환경 강점이 큽니다.' : '도시형 자연환경 수준입니다.',
    airQuality: score.nature >= 75 ? '대기질·자연 지표가 상대적으로 좋습니다.' : '대기질 지표는 보통 또는 관리 필요입니다.',
    safety: score.safety >= 80 ? '안전 지표가 우수합니다.' : '생활안전 지표를 함께 확인하세요.',
  }
}

export default function App() {
  const [mode, setMode] = useState('simple')
  const [selectedPreset, setSelectedPreset] = useState('long_stay')
  const [weights, setWeights] = useState(PRESETS[3].weights)
  const [regions, setRegions] = useState(FALLBACK_REGIONS)
  const [recommendations, setRecommendations] = useState([])
  const [apiState, setApiState] = useState('mock')
  const [loading, setLoading] = useState(true)
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState([])
  const [dataVersion, setDataVersion] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [shareUrl, setShareUrl] = useState('')
  const [mapProvider, setMapProvider] = useState('Kakao')
  const currentText = MODE_TEXT[mode]

  const localRecommendations = useMemo(() => {
    const limit = mode === 'senior' ? 5 : 10
    return [...regions]
      .map((region, index) => ({
        ...region,
        rank: index + 1,
        finalScore: scoreRegion(region, weights),
        reason: reasonFor(region, mode),
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((region, index) => ({ ...region, rank: index + 1 }))
      .slice(0, limit)
  }, [regions, weights, mode])

  const activeRecommendations = recommendations.length ? recommendations : localRecommendations
  const primaryRegion = activeRecommendations[0]
  const chartData = CATEGORIES.map((category) => ({
    category: currentText.lang === 'en' ? category.en : category.ko,
    score: Math.round(primaryRegion?.scores?.[category.id] || 0),
    contribution: Math.round((primaryRegion?.scores?.[category.id] || 0) * normalizeWeights(weights)[category.id]),
  }))

  useEffect(() => {
    let ignore = false

    async function loadBootstrap() {
      setLoading(true)
      setError('')
      try {
        const [regionsResult, scoresResult, metricsResult, versionResult] = await Promise.allSettled([
          fetchFirst(['/api/v1/regions', '/regions']),
          fetchFirst(['/api/v1/scores', '/scores']),
          fetchFirst(['/api/v1/metrics', '/metrics']),
          fetchFirst(['/api/v1/data-versions/latest', '/data-versions/latest']),
        ])

        const converted = regionsResult.status === 'fulfilled' && scoresResult.status === 'fulfilled'
          ? convertApiData(regionsResult.value, scoresResult.value)
          : null

        if (!ignore && converted?.length) {
          setRegions(converted)
          setApiState('connected')
        } else if (!ignore) {
          setApiState(metricsResult.status === 'fulfilled' || versionResult.status === 'fulfilled' ? 'partial' : 'mock')
        }

        if (!ignore && metricsResult.status === 'fulfilled') {
          setMetrics(metricsResult.value?.metrics || metricsResult.value?.data || [])
        }

        if (!ignore && versionResult.status === 'fulfilled') {
          setDataVersion(versionResult.value?.version || versionResult.value)
        }
      } catch (loadError) {
        if (!ignore) {
          setApiState('mock')
          setError('API 연결에 실패하여 목업 데이터로 표시합니다.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadBootstrap()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    setRecommendations([])
  }, [weights, mode, regions])

  async function runRecommendation() {
    setRecommendLoading(true)
    setError('')
    try {
      const payload = await fetchFirst(['/api/v1/recommendations', '/recommendations'], {
        method: 'POST',
        body: JSON.stringify({ mode, weights, limit: mode === 'senior' ? 5 : 10 }),
      })
      const mapped = mapRecommendationPayload(payload, weights, mode)
      if (mapped?.length) {
        setRecommendations(mapped)
        setApiState('connected')
      } else {
        setRecommendations(localRecommendations)
      }
    } catch {
      setRecommendations(localRecommendations)
      setError('추천 API가 없어 프론트엔드 계산 결과로 Top 5를 표시합니다.')
    } finally {
      setRecommendLoading(false)
    }
  }

  async function openRegion(region) {
    setSelectedRegion(region)
    setSelectedDetails(null)
    try {
      const payload = await fetchFirst([
        `/api/v1/regions/${region.region_id}/details`,
        `/regions/${region.region_id}/details`,
        `/api/v1/scores/${region.region_id}`,
        `/scores/${region.region_id}`,
      ])
      setSelectedDetails(payload?.details || payload)
    } catch {
      setSelectedDetails(fallbackDetails(region))
    }
  }

  async function shareRecommendation() {
    const ids = activeRecommendations.slice(0, 5).map((item) => item.region_id)
    const localUrl = `${window.location.origin}${window.location.pathname}?mode=${mode}&preset=${selectedPreset}&regions=${ids.join(',')}`

    try {
      const payload = await fetchFirst(['/api/v1/shares', '/shares'], {
        method: 'POST',
        body: JSON.stringify({ mode, weights, regions: ids }),
      })
      const url = payload?.url || payload?.share_url || localUrl
      setShareUrl(url)
      await navigator.clipboard?.writeText(url)
    } catch {
      setShareUrl(localUrl)
      await navigator.clipboard?.writeText(localUrl)
    }
  }

  const handlePreset = (preset) => {
    setSelectedPreset(preset.id)
    setWeights(preset.weights)
  }

  const resetWeights = () => {
    const preset = PRESETS.find((item) => item.id === selectedPreset) || PRESETS[3]
    setWeights(preset.weights)
  }

  const seniorClass = mode === 'senior' ? 'text-lg md:text-xl' : 'text-base'
  const topLimit = mode === 'senior' ? 5 : 5

  return (
    <div className={`min-h-screen bg-[#edf1f3] text-slate-900 ${seniorClass}`}>
      <main className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <Header apiState={apiState} mode={mode} />

        <StatusBanner loading={loading} error={error} apiState={apiState} dataVersion={dataVersion} metrics={metrics} />

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr_420px]">
          <aside className="flex flex-col gap-5">
            <PresetPanel selectedPreset={selectedPreset} onSelect={handlePreset} mode={mode} />
            <WeightPanel weights={weights} setWeights={setWeights} resetWeights={resetWeights} mode={mode} />
          </aside>

          <section className="flex flex-col gap-5">
            <ModeTabs mode={mode} setMode={setMode} />
            <MapPanel
              recommendations={activeRecommendations.slice(0, 5)}
              openRegion={openRegion}
              mapProvider={mapProvider}
              setMapProvider={setMapProvider}
              mode={mode}
            />
            <VisualizationPanel chartData={chartData} primaryRegion={primaryRegion} mode={mode} />
            <BottomInsights mode={mode} />
          </section>

          <aside className="flex flex-col gap-5">
            <RecommendationPanel
              title={currentText.headline}
              sub={currentText.sub}
              runLabel={currentText.run}
              shareLabel={currentText.share}
              recommendations={activeRecommendations.slice(0, topLimit)}
              onRun={runRecommendation}
              onShare={shareRecommendation}
              onDetail={openRegion}
              loading={recommendLoading}
              mode={mode}
            />
            <SharePanel shareUrl={shareUrl} dataVersion={dataVersion} mode={mode} />
          </aside>
        </section>
      </main>

      <AnimatePresence>
        {selectedRegion && (
          <RegionModal
            region={selectedRegion}
            details={selectedDetails}
            mode={mode}
            onClose={() => {
              setSelectedRegion(null)
              setSelectedDetails(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Header({ apiState, mode }) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex items-center gap-4">
        <img src="/assets/meomum-logo.png" alt="머묾 MEOMUM 로고" className="h-20 w-80 object-contain object-left" />
      </div>
      <nav className="flex flex-wrap items-center gap-3" aria-label="기본 네비게이션">
        {[
          [Home, 'Home'],
          [Compass, 'Discover'],
          [Bookmark, 'Saved Places'],
          [User, 'My Profile'],
        ].map(([Icon, label]) => (
          <button key={label} className={`soft-button flex items-center gap-3 px-6 py-4 font-semibold ${mode === 'senior' ? 'min-h-16 text-lg' : ''}`}>
            <Icon size={19} aria-hidden="true" /> {label}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap gap-3">
        <span className="tech-chip"><Zap size={17} aria-hidden="true" /> FastAPI</span>
        <span className="tech-chip"><Zap size={17} aria-hidden="true" /> Supabase</span>
        <span className={`status-pill ${apiState === 'connected' ? 'connected' : ''}`}>
          {apiState === 'connected' ? 'Live API' : apiState === 'partial' ? 'Partial API' : 'Mock'}
        </span>
      </div>
    </header>
  )
}

function StatusBanner({ loading, error, apiState, dataVersion, metrics }) {
  if (loading) {
    return (
      <section className="glass-card flex items-center gap-3 p-4 text-slate-600">
        <Loader2 className="animate-spin" size={19} />
        FastAPI / Supabase 데이터를 확인하는 중입니다.
      </section>
    )
  }

  return (
    <section className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div className={`glass-card flex items-center gap-3 p-4 ${error ? 'text-amber-700' : 'text-emerald-700'}`}>
        {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
        <span className="font-bold">
          {error || (apiState === 'connected' ? 'API 비동기 연동 성공: 지역·점수 데이터를 반영했습니다.' : '목업 데이터 모드: API 연결 후 자동으로 실제 데이터가 반영됩니다.')}
        </span>
      </div>
      <div className="glass-card flex items-center gap-3 p-4 text-sm font-bold text-slate-500">
        <Database size={18} />
        Data {dataVersion?.version_id || dataVersion?.version_name || 'v1.0 mock'} · Metrics {metrics?.length || 'fallback'}
      </div>
    </section>
  )
}

function PresetPanel({ selectedPreset, onSelect, mode }) {
  return (
    <section className="glass-card p-5">
      <PanelTitle icon={Sparkles} title={mode === 'english' ? 'Preset' : '프리셋'} />
      <div className="mt-4 flex flex-col gap-3">
        {PRESETS.map((preset) => {
          const Icon = preset.icon
          const active = selectedPreset === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`soft-button flex items-center gap-4 px-5 py-4 text-left ${active ? 'ring-2 ring-emerald-200' : ''} ${mode === 'senior' ? 'min-h-16 text-lg' : ''}`}
              aria-pressed={active}
            >
              <span className="icon-bubble"><Icon size={20} aria-hidden="true" /></span>
              <span>
                <span className="block font-extrabold">{preset.label}</span>
                <span className="text-sm text-slate-500">{preset.labelKo}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function WeightPanel({ weights, setWeights, resetWeights, mode }) {
  const total = weightTotal(weights)
  return (
    <section className="glass-card p-5">
      <PanelTitle icon={PieChart} title={mode === 'english' ? 'Weighted Indicators' : '5대 카테고리 가중치'} />
      <div className="mt-3 rounded-2xl bg-white/45 p-3 text-sm font-semibold text-slate-600 shadow-insetSoft">
        {mode === 'english'
          ? `Total weight ${total}. Values are normalized automatically for scoring.`
          : `가중치 합계 ${total}. 합계가 100이 아니어도 자동 정규화하여 계산합니다.`}
      </div>
      <div className="mt-5 flex flex-col gap-5">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <div key={category.id} className="grid grid-cols-[44px_1fr_42px] items-center gap-3">
              <span className="icon-bubble"><Icon size={20} aria-hidden="true" /></span>
              <label className="block">
                <span className="mb-1 flex items-center justify-between font-semibold">
                  {mode === 'english' ? category.en : category.ko}
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights[category.id] || 0}
                  onChange={(event) => setWeights((prev) => ({ ...prev, [category.id]: Number(event.target.value) }))}
                  className="slider"
                  aria-label={`${category.label} weight`}
                />
                <span className="flex justify-between text-xs text-slate-500"><span>Low</span><span>High</span></span>
              </label>
              <span className="text-right font-bold text-slate-700">{weights[category.id] || 0}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/70 pt-4 text-sm text-slate-500">
        <span>{mode === 'english' ? 'Normalized scoring' : '정규화 계산 적용'}</span>
        <button onClick={resetWeights} className="mini-button"><RotateCcw size={16} /> Reset</button>
      </div>
    </section>
  )
}

function ModeTabs({ mode, setMode }) {
  const tabs = [
    ['simple', Sparkles, '간편'],
    ['detail', ListChecks, '꼼꼼'],
    ['senior', User, '시니어'],
    ['english', Globe2, 'English'],
  ]
  return (
    <section className="glass-card p-2">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {tabs.map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`mode-tab ${mode === id ? 'active' : ''} ${mode === 'senior' ? 'min-h-16 text-xl' : ''}`}
            aria-pressed={mode === id}
          >
            <Icon size={21} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
    </section>
  )
}

function MapPanel({ recommendations, openRegion, mapProvider, setMapProvider, mode }) {
  return (
    <section className="glass-card relative min-h-[570px] overflow-hidden p-4 lg:p-5">
      <div className="absolute left-6 top-5 z-20 rounded-2xl bg-white/85 px-4 py-3 text-sm font-semibold shadow-soft-sm backdrop-blur">
        <span className="inline-flex items-center gap-2">
          <MapIcon size={17} aria-hidden="true" />
          {mode === 'english' ? 'Weighted Recommendation Map' : '가중치 기반 추천 지도'}
        </span>
      </div>
      <div className="absolute right-6 top-5 z-20 flex rounded-2xl bg-white/80 p-1 shadow-soft-sm backdrop-blur">
        {['Kakao', 'Naver'].map((provider) => (
          <button
            key={provider}
            className={`rounded-xl px-3 py-2 text-xs font-extrabold ${mapProvider === provider ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
            onClick={() => setMapProvider(provider)}
            aria-pressed={mapProvider === provider}
          >
            {provider}
          </button>
        ))}
      </div>
      <img
        src="/assets/korea-map.png"
        alt="대한민국 지역별 추천 점수를 표시하는 지도"
        className="h-full min-h-[540px] w-full rounded-[32px] object-cover opacity-95"
      />

      {recommendations.map((region, index) => {
        const pos = MAP_POSITIONS[region.region_id] || { left: `${28 + index * 10}%`, top: `${28 + index * 7}%` }
        return (
          <button
            key={region.region_id}
            className="map-marker"
            style={{ left: pos.left, top: pos.top }}
            onClick={() => openRegion(region)}
            aria-label={`${region.region_name_ko} 상세 보기`}
          >
            <span className="marker-rank">{index + 1}</span>
            <span className="marker-label">{region.region_name_ko}</span>
          </button>
        )
      })}

      <div className="absolute bottom-6 left-6 z-20 rounded-2xl bg-white/80 px-4 py-3 text-xs font-semibold text-slate-600 shadow-soft-sm backdrop-blur">
        {mode === 'english'
          ? `${mapProvider} Map API ready · heat color reflects score`
          : `${mapProvider} Map API 연동 슬롯 · 점수별 마커/히트맵 표현`}
      </div>
    </section>
  )
}

function VisualizationPanel({ chartData, primaryRegion, mode }) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="glass-card p-5">
        <PanelTitle icon={PieChart} title={mode === 'english' ? '5-category Radar Chart' : '5대 카테고리 방사형 차트'} />
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: '#334155' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name={primaryRegion?.region_name_ko || 'Region'} dataKey="score" fill="#475569" fillOpacity={0.22} stroke="#334155" strokeWidth={2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="glass-card p-5">
        <PanelTitle icon={ListChecks} title={mode === 'english' ? 'Indicator Contribution' : '지표 기여도 차트'} />
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 18, right: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 12, fill: '#334155' }} />
              <Tooltip />
              <Bar dataKey="contribution" radius={[0, 12, 12, 0]} fill="#475569" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function RecommendationPanel({ title, sub, runLabel, shareLabel, recommendations, onRun, onShare, onDetail, loading, mode }) {
  return (
    <section className="glass-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><Crown size={22} aria-hidden="true" /> {title}</h2>
          <p className="mt-1 text-sm text-slate-500">{sub}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <button onClick={onRun} className="soft-button flex items-center justify-center gap-2 px-4 py-4 font-extrabold" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          {runLabel}
        </button>
        <button onClick={onShare} className="soft-button flex items-center justify-center gap-2 px-4 py-4 font-extrabold">
          <Share2 size={18} />
          {shareLabel}
        </button>
      </div>

      {!recommendations.length && (
        <div className="rounded-3xl bg-white/60 p-6 text-center font-bold text-slate-500">
          {mode === 'english' ? 'No result. Please adjust weights.' : '추천 결과가 없습니다. 조건을 조정해 주세요.'}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {recommendations.map((region, index) => (
          <motion.article
            key={`${region.region_id}-${index}`}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="recommend-card"
          >
            <div className={`thumb ${region.tone || 'city'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold leading-tight">{region.region_name_ko}</h3>
                  <p className="text-xs font-semibold text-slate-600">{region.region_name_en}</p>
                </div>
                <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-bold text-slate-500">#{region.rank || index + 1}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                {mode === 'english' ? region.description : region.descriptionKo || region.description}
              </p>
              <p className="mt-2 text-xs font-bold text-emerald-700">{region.reason}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {topCategories(region, 3).map((category) => (
                  <span key={category.id} className="rounded-xl bg-white/70 px-2 py-1 text-center text-[11px] font-bold text-slate-600">
                    {mode === 'english' ? category.en : category.ko.split('·')[0]}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">finalScore {Math.round(region.finalScore)}%</p>
                  <p className="tracking-wide text-amber-400">{starText(region.finalScore)}</p>
                </div>
                <button className="mini-button whitespace-nowrap" onClick={() => onDetail(region)}>
                  {mode === 'english' ? 'View Details' : '상세 보기'}
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function SharePanel({ shareUrl, dataVersion, mode }) {
  return (
    <section className="glass-card p-5">
      <PanelTitle icon={Clipboard} title={mode === 'english' ? 'Share & Data Source' : '공유 및 데이터 출처'} />
      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <div className="rounded-2xl bg-white/55 p-3 shadow-insetSoft">
          {shareUrl
            ? <span className="break-all font-semibold text-slate-800">{shareUrl}</span>
            : mode === 'english' ? 'Click Share to copy a recommendation URL.' : '공유 버튼을 누르면 추천 결과 URL이 복사됩니다.'}
        </div>
        <div className="rounded-2xl bg-white/55 p-3 shadow-insetSoft">
          <p className="font-extrabold text-slate-800">{dataVersion?.version_name || dataVersion?.version_id || '머묾 MVP 데이터셋'}</p>
          <p>{mode === 'english' ? 'Source endpoint' : '출처 API'}: `/data-versions/latest`</p>
        </div>
      </div>
    </section>
  )
}

function BottomInsights({ mode }) {
  const items = [
    [Trophy, mode === 'english' ? 'Top 5 ranking' : 'Top 5 랭킹', mode === 'english' ? 'Best matched regions' : '추천 실행 결과 카드'],
    [PieChart, mode === 'english' ? '5-category weighting' : '5대 가중치', mode === 'english' ? 'Traffic, Culture, Convenience, Safety, Nature' : '교통·문화·생활·안전·자연'],
    [MapPinned, mode === 'english' ? 'Region detail' : '지역 상세', mode === 'english' ? 'Hospitals, Wi-Fi, parks, safety' : '병의원·약국·숙박·와이파이·공원·안전'],
    [Database, mode === 'english' ? 'Data source' : '데이터 출처', mode === 'english' ? 'FastAPI + Supabase endpoint' : 'FastAPI + Supabase 연동'],
  ]
  return (
    <section className="glass-card grid gap-2 p-4 md:grid-cols-4">
      {items.map(([Icon, title, desc], index) => (
        <div key={title} className={`flex items-center gap-4 px-3 ${index ? 'md:border-l md:border-slate-300/60' : ''}`}>
          <span className="icon-bubble"><Icon size={22} aria-hidden="true" /></span>
          <div>
            <p className="font-extrabold">{title}</p>
            <p className="text-sm text-slate-500">{desc}</p>
          </div>
        </div>
      ))}
    </section>
  )
}

function RegionModal({ region, details, mode, onClose }) {
  const detailRows = [
    [BriefcaseBusiness, mode === 'english' ? 'Hospitals' : '병의원', details?.hospitals || DEFAULT_DETAILS.hospitals],
    [ShieldCheck, mode === 'english' ? 'Pharmacies' : '약국', details?.pharmacies || DEFAULT_DETAILS.pharmacies],
    [Home, mode === 'english' ? 'Accommodation' : '숙박', details?.accommodation || DEFAULT_DETAILS.accommodation],
    [Wifi, mode === 'english' ? 'Wi-Fi / 5G' : '와이파이·5G', details?.wifi || DEFAULT_DETAILS.wifi],
    [Leaf, mode === 'english' ? 'Parks' : '공원·녹지', details?.parks || DEFAULT_DETAILS.parks],
    [Compass, mode === 'english' ? 'Air Quality' : '대기질', details?.airQuality || DEFAULT_DETAILS.airQuality],
    [MapPin, mode === 'english' ? 'Safety' : '안전', details?.safety || DEFAULT_DETAILS.safety],
  ]

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-[32px] bg-[#edf1f3] p-6 shadow-2xl" initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-emerald-700">{mode === 'english' ? 'Recommended Region Detail' : '지역 상세 패널'}</p>
            <h2 className="mt-1 text-3xl font-extrabold">{region.region_name_ko}</h2>
            <p className="text-slate-500">{region.region_name_en}</p>
          </div>
          <button onClick={onClose} className="icon-bubble" aria-label="닫기"><X size={22} /></button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <div>
            <div className={`thumb ${region.tone || 'city'} h-56 w-full rounded-[28px]`} />
            <p className="mt-4 rounded-3xl bg-white/65 p-4 font-medium leading-relaxed text-slate-700 shadow-insetSoft">
              {region.reason} {mode === 'english' ? region.description : region.descriptionKo || region.description}
            </p>
          </div>
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {detailRows.map(([Icon, label, value]) => (
                <div key={label} className="rounded-3xl border border-white/80 bg-white/50 p-4 shadow-soft-sm">
                  <div className="mb-2 flex items-center gap-2 font-extrabold"><Icon size={18} /> {label}</div>
                  <p className="text-sm leading-relaxed text-slate-600">{typeof value === 'object' ? JSON.stringify(value) : value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {CATEGORIES.map((category) => (
                <div key={category.id}>
                  <div className="mb-1 flex justify-between text-sm font-bold">
                    <span>{mode === 'english' ? category.en : category.ko} / {category.label}</span>
                    <span>{Math.round(region.scores?.[category.id] || 0)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-300/60">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.round(region.scores?.[category.id] || 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-3 text-lg font-extrabold"><Icon size={21} aria-hidden="true" /> {title}</h2>
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 text-sm font-bold text-slate-400">?</span>
    </div>
  )
}

function starText(score) {
  const full = Math.max(1, Math.min(5, Math.round(score / 20)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}
