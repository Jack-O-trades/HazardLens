import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import {
  Shield, Plus, Minus, Compass, AlertTriangle, Play, Navigation, MapPin, Search,
  Check, Moon, Sun, CornerUpLeft, CornerUpRight, ArrowUp, RefreshCw, Layers,
  Cloud, Droplets, Wind, Thermometer, ChevronDown, ChevronUp, Radio, Zap
} from 'lucide-react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { io } from 'socket.io-client'
import bbox from '@turf/bbox'
import { lineString } from '@turf/helpers'
import './LiveMapPage.css'

const DEMO_FALLBACK = [-122.681, 45.520]

export default function LiveMapPage() {
  const mapRef = useRef(null)

  const [theme, setTheme] = useState(() => localStorage.getItem('s32-theme') || 'dark')
  const [viewState, setViewState] = useState({
    longitude: DEMO_FALLBACK[0], latitude: DEMO_FALLBACK[1],
    zoom: 13.5, pitch: 45, bearing: 0
  })

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchDebounceRef = useRef(null)
  const searchContainerRef = useRef(null)

  // S32 State
  const [userLocation, setUserLocation] = useState(null)
  const [destination, setDestination] = useState(null)
  const [routeData, setRouteData] = useState(null)
  const [oldRouteData, setOldRouteData] = useState(null)
  const [avoidWaypoint, setAvoidWaypoint] = useState(null)
  const [incident, setIncident] = useState(null)
  const [evidenceStream, setEvidenceStream] = useState([])
  const [recalculating, setRecalculating] = useState(false)

  // Map style
  const [mapBaseStyle, setMapBaseStyle] = useState(() => localStorage.getItem('s32-mapstyle') || 'hybrid')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Legend collapse
  const [legendExpanded, setLegendExpanded] = useState(true)

  // Weather
  const [weather, setWeather] = useState(null)

  // Mode: 'live' or 'demo'
  const [appMode, setAppMode] = useState('live')

  // ΓöÇΓöÇ Theme Effect ΓöÇΓöÇ
  useEffect(() => {
    localStorage.setItem('s32-theme', theme)
    document.documentElement.classList.toggle('hl-dark', theme === 'dark')
  }, [theme])

  useEffect(() => { localStorage.setItem('s32-mapstyle', mapBaseStyle) }, [mapBaseStyle])

  // ΓöÇΓöÇ Map Styles ΓöÇΓöÇ
  const MAP_STYLES = {
    hybrid:       { label: 'Satellite',     icon: '≡ƒ¢░∩╕Å', tile: 'hybrid',          ext: 'jpg' },
    'streets-dk': { label: 'Streets Dark',  icon: '≡ƒîÖ', tile: 'streets-v2-dark', ext: 'png' },
    'streets-lt': { label: 'Streets Light', icon: 'ΓÿÇ∩╕Å', tile: 'streets-v2-light', ext: 'png' },
    outdoor:      { label: 'Outdoor',       icon: '≡ƒÅö∩╕Å', tile: 'outdoor-v2',       ext: 'png' },
    topo:         { label: 'Topographic',   icon: '≡ƒù║∩╕Å', tile: 'topo-v2',          ext: 'png' },
  }

  const mapStyleUrl = useMemo(() => {
    const key = import.meta.env.VITE_MAPTILER_KEY
    const s = MAP_STYLES[mapBaseStyle] || MAP_STYLES['hybrid']
    if (key) {
      return {
        version: 8,
        sources: {
          'maptiler-raster': {
            type: 'raster',
            tiles: [`https://api.maptiler.com/maps/${s.tile}/256/{z}/{x}/{y}@2x.${s.ext}?key=${key}`],
            tileSize: 256,
            attribution: '&copy; MapTiler &copy; OpenStreetMap contributors',
            maxzoom: 22
          }
        },
        layers: [{ id: 'maptiler-base', type: 'raster', source: 'maptiler-raster' }]
      }
    }
    const basemap = theme === 'dark' ? 'dark_all' : 'voyager'
    return {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: [
            `https://a.basemaps.cartocdn.com/${basemap}/{z}/{x}/{y}@2x.png`,
            `https://b.basemaps.cartocdn.com/${basemap}/{z}/{x}/{y}@2x.png`,
          ],
          tileSize: 256
        }
      },
      layers: [{ id: 'carto-base', type: 'raster', source: 'carto' }]
    }
  }, [mapBaseStyle, theme])

  // ΓöÇΓöÇ Geolocation + Socket ΓöÇΓöÇ
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lng = pos.coords.longitude
          const lat = pos.coords.latitude
          setUserLocation([lng, lat])
          setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 15 }))
          fetchWeather(lat, lng)
        },
        () => {
          setUserLocation(DEMO_FALLBACK)
          fetchWeather(DEMO_FALLBACK[1], DEMO_FALLBACK[0])
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    } else {
      setUserLocation(DEMO_FALLBACK)
    }

    const socket = io('http://localhost:3001')
    socket.on('incident:update', (data) => {
      setIncident(prev => ({ ...prev, ...data }))
      if (data.confidence >= 91 && data.status === 'CONFIRMED') recalculateRoute()
    })
    socket.on('evidence:new', (data) => {
      setEvidenceStream(prev => [...prev, data])
    })
    return () => socket.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ΓöÇΓöÇ Weather (OpenMeteo - free, no key needed) ΓöÇΓöÇ
  const fetchWeather = async (lat, lng) => {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      if (data.current) {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          rain: data.current.precipitation,
          wind: Math.round(data.current.wind_speed_10m),
          code: data.current.weather_code
        })
      }
    } catch (e) { console.warn('Weather fetch failed', e) }
  }

  // Refresh weather every 5 mins
  useEffect(() => {
    if (!userLocation) return
    const interval = setInterval(() => fetchWeather(userLocation[1], userLocation[0]), 300000)
    return () => clearInterval(interval)
  }, [userLocation])

  const weatherDesc = (code) => {
    if (code === 0) return 'Clear'
    if (code <= 3) return 'Cloudy'
    if (code <= 48) return 'Foggy'
    if (code <= 67) return 'Rain'
    if (code <= 77) return 'Snow'
    if (code <= 82) return 'Showers'
    if (code <= 99) return 'Γ¢ê Storm'
    return 'Unknown'
  }

  const weatherIcon = (code) => {
    if (code === 0) return 'ΓÿÇ∩╕Å'
    if (code <= 3) return 'Γ¢à'
    if (code <= 48) return '≡ƒî½∩╕Å'
    if (code <= 67) return '≡ƒîº∩╕Å'
    if (code <= 77) return 'Γ¥ä∩╕Å'
    if (code <= 82) return '≡ƒîª∩╕Å'
    return 'Γ¢ê∩╕Å'
  }

  // ΓöÇΓöÇ Search ΓöÇΓöÇ
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setShowSuggestions(false)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data?.length > 0) {
        const lng = parseFloat(data[0].lon)
        const lat = parseFloat(data[0].lat)
        setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 15 }))
        fetchWeather(lat, lng)
      } else alert('Location not found')
    } catch (err) { console.error(err) }
    finally { setIsSearching(false) }
  }

  const fetchSuggestions = useCallback((query) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!query || query.trim().length < 2) {
      setSearchSuggestions([]); setShowSuggestions(false); return
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSearchSuggestions(data || [])
        setShowSuggestions(data?.length > 0)
      } catch (err) { console.error('Suggestion error:', err) }
    }, 300)
  }, [])

  const handleSearchInputChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    fetchSuggestions(val)
  }

  const selectSuggestion = (item) => {
    const lng = parseFloat(item.lon)
    const lat = parseFloat(item.lat)
    setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 16 }))
    setSearchQuery(item.display_name.split(',').slice(0, 2).join(','))
    setSearchSuggestions([])
    setShowSuggestions(false)
    fetchWeather(lat, lng)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ΓöÇΓöÇ Routing ΓöÇΓöÇ
  const handleMapClick = async (e) => {
    if (!userLocation) return alert('Waiting for your location. Check browser location permissions.')
    const dest = [e.lngLat.lng, e.lngLat.lat]
    setDestination(dest)
    setIncident(null)
    setOldRouteData(null)
    setEvidenceStream([])
    const rData = await fetchRoute(userLocation, dest)
    if (rData) { setRouteData(rData); fitMapToRoute(rData.geojson) }
  }

  const fetchRoute = async (start, end, waypoint = null) => {
    try {
      if (waypoint) {
        const [r1, r2] = await Promise.all([
          fetch(`http://localhost:3001/api/routes?startLng=${start[0]}&startLat=${start[1]}&endLng=${waypoint[0]}&endLat=${waypoint[1]}`).then(r => r.json()),
          fetch(`http://localhost:3001/api/routes?startLng=${waypoint[0]}&startLat=${waypoint[1]}&endLng=${end[0]}&endLat=${end[1]}`).then(r => r.json()),
        ])
        if (r1.route && r2.route) {
          return {
            geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [...r1.route.geometry.coordinates, ...r2.route.geometry.coordinates] } }] },
            distance: r1.route.distance + r2.route.distance,
            duration: r1.route.duration + r2.route.duration,
            steps: r1.route.steps || []
          }
        }
      }
      const res = await fetch(`http://localhost:3001/api/routes?startLng=${start[0]}&startLat=${start[1]}&endLng=${end[0]}&endLat=${end[1]}`)
      const data = await res.json()
      if (data.route) {
        return {
          geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data.route.geometry }] },
          distance: data.route.distance,
          duration: data.route.duration,
          steps: data.route.steps || []
        }
      }
    } catch (err) { console.error('Route error:', err) }
    return null
  }

  const fitMapToRoute = (geojson) => {
    if (!mapRef.current || !geojson) return
    try {
      const coords = geojson.features[0]?.geometry?.coordinates
      if (coords && coords.length > 1) {
        const routeBbox = bbox(lineString(coords))
        mapRef.current.fitBounds(routeBbox, { padding: 130, duration: 1500, maxZoom: 16 })
      }
    } catch (err) { console.warn('fitBounds error', err) }
  }

  const recalculateRoute = async () => {
    if (!userLocation || !destination) return
    setRecalculating(true)
    setOldRouteData(routeData)
    const newRoute = await fetchRoute(userLocation, destination, avoidWaypoint)
    setRecalculating(false)
    if (newRoute) { setRouteData(newRoute); fitMapToRoute(newRoute.geojson) }
    else {
      const fallback = await fetchRoute(userLocation, destination)
      if (fallback) setRouteData(fallback)
    }
  }



  const formatDistance = (m) => m > 1000 ? (m/1000).toFixed(1) + ' km' : Math.round(m) + ' m'
  const formatDuration = (s) => Math.round(s/60) + ' min'

  const getStepIcon = (modifier) => {
    if (!modifier) return <ArrowUp size={16} />
    if (modifier.includes('left')) return <CornerUpLeft size={16} />
    if (modifier.includes('right')) return <CornerUpRight size={16} />
    return <ArrowUp size={16} />
  }

  // ΓöÇΓöÇ Theme ΓöÇΓöÇ
  const isDark = theme === 'dark'
  const bgUI = isDark ? 'rgba(10, 17, 35, 0.96)' : 'rgba(255,255,255,0.96)'
  const borderUI = isDark ? 'rgba(51,65,85,0.8)' : '#e2e8f0'
  const textUI = isDark ? '#f1f5f9' : '#0f172a'
  const textSubUI = isDark ? '#94a3b8' : '#64748b'

  const startDemo = async () => {
    if (!userLocation || !routeData) return alert('Click on the map to set a destination first, then run demo.')
    try {
      setAppMode('demo')
      setIncident(null)
      setEvidenceStream([])
      setOldRouteData(null)
      const coords = routeData.geojson.features[0].geometry.coordinates
      const hazardIndex = Math.floor(coords.length * 0.4)
      const dynamicHazardCenter = coords[hazardIndex]
      setAvoidWaypoint([dynamicHazardCenter[0] - 0.015, dynamicHazardCenter[1] + 0.015])
      await fetch('http://localhost:3001/api/demo/flood/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLng: userLocation[0], startLat: userLocation[1],
          destLng: destination[0], destLat: destination[1],
          hazardLng: dynamicHazardCenter[0], hazardLat: dynamicHazardCenter[1]
        })
      })
    } catch (err) {
      console.error(err)
      alert('Failed to start demo. Is the backend running?')
    }
  }

  // ΓöÇΓöÇ Map Data ΓöÇΓöÇ
  const hazardPolygon = useMemo(() => {
    if (!incident || incident.confidence < 50 || !incident.hazardCenter) return null
    const [lng, lat] = incident.hazardCenter
    const d = 0.002
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[lng-d,lat+d],[lng+d,lat+d],[lng+d,lat-d],[lng-d,lat-d],[lng-d,lat+d]]] } }] }
  }, [incident])

  const unsafeRoadGeoJSON = useMemo(() => {
    if (!incident || incident.status !== 'CONFIRMED' || !incident.hazardCenter) return null
    const [lng, lat] = incident.hazardCenter
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[lng-0.003, lat-0.003],[lng+0.003, lat+0.003]] } }] }
  }, [incident])

  const routeLayout = { 'line-cap': 'round', 'line-join': 'round' }
  const safeRoutePaint = { 'line-color': '#06b6d4', 'line-width': 6, 'line-opacity': 1 }
  const safeRouteGlowPaint = { 'line-color': '#06b6d4', 'line-width': 14, 'line-opacity': 0.4, 'line-blur': 4 }
  
  const blockedRoutePaint = { 'line-color': '#f97316', 'line-width': 6, 'line-opacity': 1 }
  const blockedRouteGlowPaint = { 'line-color': '#f97316', 'line-width': 14, 'line-opacity': 0.4, 'line-blur': 4 }

  return (
    <div className="dash-v2" style={{ backgroundColor: isDark ? '#060d1f' : '#f8fafc', color: textUI, height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div className="dash-filterbar" style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.98)' : '#ffffff', borderBottom: `1px solid ${borderUI}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', height: '52px', backdropFilter: 'blur(12px)', zIndex: 50, position: 'relative' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color="#3b82f6" />
          <span style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '14px' }}>S32 LIVE OPS</span>
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button onClick={() => setAppMode('live')} style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', border: 'none', cursor: 'pointer', background: appMode === 'live' ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9'), color: appMode === 'live' ? 'white' : textSubUI, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={10} /> LIVE
            </button>
            <button onClick={() => setAppMode('demo')} style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', border: 'none', cursor: 'pointer', background: appMode === 'demo' ? '#f59e0b' : (isDark ? '#1e293b' : '#f1f5f9'), color: appMode === 'demo' ? 'white' : textSubUI, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> DEMO
            </button>
          </div>
        </div>

        {/* Search portal targeting the TopBar component */}
        {document.getElementById('topbar-search-target') && ReactDOM.createPortal(
          <div ref={searchContainerRef} style={{ position: 'relative', zIndex: 300, width: '100%' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderRadius: showSuggestions ? '8px 8px 0 0' : '8px', border: `1px solid ${showSuggestions ? '#3b82f6' : 'transparent'}`, padding: '6px 12px', width: '100%', transition: 'all 0.2s' }}>
              <Search size={14} color={isSearching ? '#3b82f6' : textSubUI} />
              <input
                type="text"
                placeholder="Search map or location..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                style={{ background: 'transparent', border: 'none', color: textUI, marginLeft: '8px', width: '100%', outline: 'none', fontSize: '14px' }}
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false) }} style={{ background: 'transparent', border: 'none', color: textSubUI, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
              )}
            </form>

            {/* Suggestions dropdown - high z-index, position fixed relative to container */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                border: `1px solid #3b82f6`, borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                overflow: 'hidden', zIndex: 9999
              }}>
                {searchSuggestions.map((item, i) => {
                  const parts = item.display_name.split(',')
                  const mainName = parts[0]?.trim()
                  const subText = parts.slice(1, 3).join(',').trim()
                  return (
                    <button key={item.place_id || i} onClick={() => selectSuggestion(item)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < searchSuggestions.length - 1 ? `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}` : 'none', cursor: 'pointer', textAlign: 'left', color: textUI }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.06)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin size={15} color="#3b82f6" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mainName}</div>
                        <div style={{ fontSize: '11px', color: textSubUI, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{subText}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>,
          document.getElementById('topbar-search-target')
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Weather widget */}
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '8px', border: `1px solid ${borderUI}`, fontSize: '12px' }}>
              <span style={{ fontSize: '16px' }}>{weatherIcon(weather.code)}</span>
              <span style={{ fontWeight: 700, color: textUI }}>{weather.temp}┬░C</span>
              <span style={{ color: textSubUI }}>{weatherDesc(weather.code)}</span>
              {weather.rain > 0 && <span style={{ color: '#60a5fa', fontWeight: 600 }}>≡ƒÆº{weather.rain}mm</span>}
              <span style={{ color: textSubUI }}>≡ƒÆ¿{weather.wind}km/h</span>
            </div>
          )}

          {/* Map Style Picker */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowStylePicker(!showStylePicker)}
              style={{ background: isDark ? '#1e293b' : '#f1f5f9', border: `1px solid ${borderUI}`, borderRadius: '8px', cursor: 'pointer', color: textSubUI, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600 }}>
              <Layers size={15} /> {MAP_STYLES[mapBaseStyle]?.icon}
            </button>
            {showStylePicker && (
              <div style={{ position: 'absolute', top: '110%', right: 0, backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '12px', padding: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 9999, minWidth: '175px', backdropFilter: 'blur(16px)' }}>
                <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, padding: '4px 8px 6px', letterSpacing: '0.5px' }}>MAP STYLE</div>
                {Object.entries(MAP_STYLES).map(([key, val]) => (
                  <button key={key} onClick={() => { setMapBaseStyle(key); setShowStylePicker(false) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 10px', background: mapBaseStyle === key ? 'rgba(59,130,246,0.15)' : 'transparent', border: mapBaseStyle === key ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent', borderRadius: '8px', cursor: 'pointer', color: textUI, fontSize: '13px', fontWeight: mapBaseStyle === key ? 700 : 500, marginBottom: '2px', textAlign: 'left' }}>
                    <span style={{ fontSize: '15px' }}>{val.icon}</span> {val.label}
                    {mapBaseStyle === key && <Check size={13} color="#3b82f6" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSubUI, display: 'flex', alignItems: 'center' }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={startDemo}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 14px rgba(16,185,129,0.4)', letterSpacing: '0.3px' }}>
            <Play size={13} fill="currentColor" /> RUN DEMO
          </button>
        </div>
      </div>

      {/* ΓöÇΓöÇ MAP AREA ΓöÇΓöÇ */}
      <div className="dash-main" style={{ position: 'relative' }}>

        {/* Left Panels */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none', maxWidth: '340px' }}>

          {/* Weather Panel (live mode) */}
          {weather && appMode === 'live' && !incident && (
            <div style={{ pointerEvents: 'auto', backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${borderUI}`, borderRadius: '14px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>LIVE WEATHER CONDITIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Thermometer size={16} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: '11px', color: textSubUI }}>Temperature</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{weather.temp}┬░C</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Droplets size={16} color="#3b82f6" />
                  <div>
                    <div style={{ fontSize: '11px', color: textSubUI }}>Humidity</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{weather.humidity}%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cloud size={16} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: '11px', color: textSubUI }}>Rainfall</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{weather.rain}mm</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wind size={16} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '11px', color: textSubUI }}>Wind</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{weather.wind} km/h</div>
                  </div>
                </div>
              </div>
              {weather.code >= 51 && (
                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                  ΓÜá∩╕Å Heavy precipitation ΓÇö flood risk elevated
                </div>
              )}
            </div>
          )}

          {/* Incident Panel */}
          {incident && (
            <div style={{ pointerEvents: 'auto', backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${incident.status === 'CONFIRMED' ? 'rgba(239,68,68,0.5)' : borderUI}`, borderRadius: '14px', padding: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ padding: '8px', background: incident.severity === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', borderRadius: '8px' }}>
                  <AlertTriangle color={incident.severity === 'high' ? '#ef4444' : '#f59e0b'} size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: textUI }}>{incident.title}</h3>
                  <div style={{ fontSize: '11px', color: textSubUI, fontWeight: 600, marginTop: '1px' }}>LIVE INCIDENT {appMode === 'demo' ? '┬╖ DEMO MODE' : ''}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', background: isDark ? 'rgba(0,0,0,0.2)' : '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700 }}>CONFIDENCE</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: incident.confidence > 80 ? '#ef4444' : '#f59e0b' }}>{incident.confidence}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700 }}>STATUS</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: incident.status === 'CONFIRMED' ? '#ef4444' : '#3b82f6', marginTop: '4px' }}>{incident.status}</div>
                </div>
              </div>

              {incident.status === 'CONFIRMED' && (
                <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid #ef4444', borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, marginBottom: '3px' }}>RECOMMENDED ACTION</div>
                  <div style={{ fontSize: '14px', color: textUI, fontWeight: 700 }}>AVOID AFFECTED ROAD ┬╖ TAKE SAFE ROUTE</div>
                </div>
              )}

              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, marginBottom: '10px', letterSpacing: '0.5px' }}>LIVE EVIDENCE STREAM</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {evidenceStream.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }}><Check size={13} strokeWidth={3} /></div>
                    <div>
                      <div style={{ color: textSubUI, fontSize: '10px', fontWeight: 600, marginBottom: '1px' }}>{ev.time} ┬╖ {ev.source}</div>
                      <div style={{ color: textUI, fontWeight: 500 }}>{ev.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Turn-by-Turn Navigation */}
          {routeData && routeData.steps?.length > 0 && incident?.status !== 'CONFIRMED' && !recalculating && (
            <div style={{ pointerEvents: 'auto', backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${borderUI}`, borderRadius: '14px', padding: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }}>NAVIGATION</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '50%', color: 'white', flexShrink: 0 }}>
                  {getStepIcon(routeData.steps[0]?.maneuver?.modifier)}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: textUI }}>{routeData.steps[0]?.maneuver?.instruction || routeData.steps[0]?.name || 'Head towards destination'}</div>
                  <div style={{ fontSize: '12px', color: textSubUI, fontWeight: 500, marginTop: '2px' }}>in {Math.round(routeData.steps[0]?.distance || 0)} m</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Route Summary (Top Right) */}
        {routeData && (
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, backgroundColor: recalculating ? 'rgba(239,68,68,0.95)' : bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${recalculating ? 'transparent' : borderUI}`, borderRadius: '14px', padding: '14px 20px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', transition: 'all 0.3s ease', minWidth: '160px' }}>
            {recalculating ? (
              <div style={{ color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <RefreshCw size={16} className="spin" /> RECALCULATING...
              </div>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: textSubUI, fontWeight: 700, marginBottom: '6px' }}>
                  {oldRouteData ? <span style={{ color: '#10b981' }}>Γ£ô SAFE ROUTE ACTIVE</span> : 'OPTIMAL ROUTE'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '30px', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{formatDuration(routeData.duration)}</span>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: textSubUI }}>{formatDistance(routeData.distance)}</span>
                </div>
                {oldRouteData && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={11} /> AVOIDS HAZARD ZONE
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Collapsible Legend */}
        <div style={{ position: 'absolute', bottom: 28, left: 16, zIndex: 10, backgroundColor: bgUI, backdropFilter: 'blur(12px)', border: `1px solid ${borderUI}`, borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: '145px' }}>
          <button onClick={() => setLegendExpanded(!legendExpanded)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: textSubUI, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
            MAP LEGEND {legendExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {legendExpanded && (
            <div style={{ padding: '2px 12px 10px', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px', color: textUI, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', boxShadow: '0 0 0 2px rgba(59,130,246,0.3)', flexShrink: 0 }} /> YOU</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#06b6d4', borderRadius: '2px', boxShadow: '0 0 4px rgba(6,182,212,0.5)', flexShrink: 0 }} /> OPTIMAL ROUTE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#f97316', borderRadius: '2px', boxShadow: '0 0 4px rgba(249,115,22,0.5)', flexShrink: 0 }} /> BLOCKED ROUTE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', background: 'rgba(239,68,68,0.2)', border: '1px dashed #ef4444', flexShrink: 0 }} /> HAZARD</div>
            </div>
          )}
        </div>

        {/* THE MAP */}
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          onLoad={() => setMapLoaded(true)}
          mapStyle={mapStyleUrl}
          interactive={true}
          cursor={userLocation && !destination ? 'crosshair' : 'grab'}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Controls */}
          <div style={{ position: 'absolute', bottom: 28, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={() => setViewState(p => ({...p, zoom: p.zoom+1}))} style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Plus size={17} /></button>
            <button onClick={() => setViewState(p => ({...p, zoom: p.zoom-1}))} style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Minus size={17} /></button>
            <button onClick={() => setViewState(p => ({...p, bearing: 0, pitch: 45}))} style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Compass size={17} /></button>
            <button onClick={() => userLocation && setViewState(p => ({...p, longitude: userLocation[0], latitude: userLocation[1], zoom: 15}))} style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Navigation size={17} /></button>
          </div>

          {/* HAZARD POLYGON */}
          {hazardPolygon && (
            <Source id="hazard-zone" type="geojson" data={hazardPolygon}>
              <Layer id="hazard-fill" type="fill" paint={{ 'fill-color': '#ef4444', 'fill-opacity': 0.25 }} />
              <Layer id="hazard-outline" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ef4444', 'line-width': 3, 'line-dasharray': [2, 2] }} />
            </Source>
          )}

          {/* UNSAFE ROAD */}
          {unsafeRoadGeoJSON && (
            <Source id="unsafe-road-src" type="geojson" data={unsafeRoadGeoJSON}>
              <Layer id="unsafe-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#ef4444', 'line-width': 10, 'line-opacity': 0.85 }} />
              <Layer id="unsafe-stripes" type="line" layout={{ 'line-cap': 'butt', 'line-join': 'round' }} paint={{ 'line-color': '#ffffff', 'line-width': 4, 'line-dasharray': [1, 1], 'line-opacity': 0.6 }} />
            </Source>
          )}

          {/* OLD BLOCKED ROUTE (Orange) */}
          {oldRouteData && oldRouteData.geojson && (
            <Source id="old-route-src" type="geojson" data={oldRouteData.geojson}>
              <Layer id="old-route-glow" type="line" layout={routeLayout} paint={blockedRouteGlowPaint} />
              <Layer id="old-route-line" type="line" layout={routeLayout} paint={blockedRoutePaint} />
            </Source>
          )}

          {/* CURRENT SAFE ROUTE (Cyan) */}
          {routeData && routeData.geojson && (
            <Source id="current-route-src" type="geojson" data={routeData.geojson}>
              <Layer id="current-route-glow" type="line" layout={routeLayout} paint={safeRouteGlowPaint} />
              <Layer id="current-route-line" type="line" layout={routeLayout} paint={safeRoutePaint} />
            </Source>
          )}

          {/* USER MARKER */}
          {userLocation && (
            <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'absolute', width: '40px', height: '40px', background: 'rgba(59,130,246,0.2)', borderRadius: '50%', top: '-10px', animation: 'pulse 2s infinite' }} />
                <div style={{ width: '22px', height: '22px', backgroundColor: '#3b82f6', border: '3px solid white', borderRadius: '50%', boxShadow: '0 3px 10px rgba(0,0,0,0.4)', zIndex: 2 }} />
                <div style={{ background: bgUI, color: textUI, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', marginTop: '4px', border: `1px solid ${borderUI}`, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>YOU</div>
              </div>
            </Marker>
          )}

          {/* DESTINATION MARKER */}
          {destination && (
            <Marker longitude={destination[0]} latitude={destination[1]} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: bgUI, color: textUI, fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', marginBottom: '4px', border: `1px solid ${borderUI}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>DESTINATION</div>
                <MapPin size={34} color="#ef4444" fill="#ef4444" />
              </div>
            </Marker>
          )}

          {/* HAZARD MARKER */}
          {incident && incident.status === 'CONFIRMED' && incident.hazardCenter && (
            <Marker longitude={incident.hazardCenter[0]} latitude={incident.hazardCenter[1]} anchor="bottom">
              <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, border: '2px solid white', boxShadow: '0 4px 16px rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} fill="#fff" /> UNSAFE ZONE
              </div>
            </Marker>
          )}
        </Map>

        {/* Helper hint */}
        {!destination && userLocation && (
          <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', padding: '12px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, boxShadow: '0 10px 30px rgba(59,130,246,0.4)', pointerEvents: 'none', animation: 'bounce 2s infinite', whiteSpace: 'nowrap', zIndex: 10 }}>
            ≡ƒû▒∩╕Å Click anywhere on the map to set your destination
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="dash-statusbar" style={{ backgroundColor: isDark ? '#060d1f' : '#f1f5f9', borderTop: `1px solid ${borderUI}`, color: textSubUI, padding: '4px 16px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>S32 Nav-Core Operational</span>
          <span>ΓÇó</span>
          <span>Routing: OSRM</span>
          <span>ΓÇó</span>
          <span style={{ color: appMode === 'demo' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{appMode === 'demo' ? 'ΓÜí DEMO MODE' : '≡ƒƒó LIVE MODE'}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Shield size={11} /> Live Multi-Hazard Monitoring
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0% { transform: scale(0.9); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }
        .spin { animation: spin 1.5s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
