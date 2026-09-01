import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import {
  Shield, Plus, Minus, Compass, AlertTriangle, Play, Navigation, MapPin, Search,
  Check, Moon, Sun, CornerUpLeft, CornerUpRight, ArrowUp, RefreshCw, Layers,
  Cloud, Droplets, Wind, Thermometer, ChevronDown, ChevronUp, Radio, Zap,
  Tent, Building2, Map as MapIcon
} from 'lucide-react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { io } from 'socket.io-client'
import bbox from '@turf/bbox'
import { lineString } from '@turf/helpers'
import './LiveMapPage.css'

const DEMO_CONFIG = {
  start: [85.8341, 20.2858],
  dest: [85.8450, 20.2858],
  hazard: [85.8395, 20.2858]
};
// Backend API base. Set VITE_API_URL in your .env for anything beyond local dev.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Tunable thresholds / magic numbers, named so they're easy to find and adjust
const CONFIRM_CONFIDENCE_THRESHOLD = 91     // incident confidence % that triggers a reroute
const HAZARD_DISPLAY_THRESHOLD = 50         // min confidence % before we draw the hazard polygon
const HEAVY_RAIN_WEATHER_CODE_THRESHOLD = 51 // open-meteo weather code that counts as "heavy precipitation"
const WEATHER_REFRESH_INTERVAL_MS = 300000  // 5 minutes
const GEOLOCATION_TIMEOUT_MS = 8000
const HAZARD_POLYGON_HALF_SIZE_DEG = 0.002
const UNSAFE_ROAD_OFFSET_DEG = 0.003
const AVOID_OFFSET_DEG = 0.015              // how far off the hazard center we route the avoid-waypoint
const SEARCH_DEBOUNCE_MS = 300
const NOTICE_DURATION_MS = 4000

// ---- Stable Map Styles & Paint Objects ----
const MAP_STYLES = {
  hybrid: { label: 'Satellite', icon: '🛰️', tile: 'hybrid', ext: 'jpg' },
  'streets-dk': { label: 'Streets Dark', icon: '🌙', tile: 'streets-v2-dark', ext: 'png' },
  'streets-lt': { label: 'Streets Light', icon: '☀️', tile: 'streets-v2-light', ext: 'png' },
  outdoor: { label: 'Outdoor', icon: '🏔️', tile: 'outdoor-v2', ext: 'png' },
  topo: { label: 'Topographic', icon: '🗺️', tile: 'topo-v2', ext: 'png' },
}

const getStableMapStyle = (baseStyle, theme) => {
  const key = import.meta.env.VITE_MAPTILER_KEY || '8oJS7UaNGu6yuoJGxY7P'
  let sTile = baseStyle === 'streets-lt' ? 'streets-v2' : (baseStyle === 'streets-dk' ? 'streets-v2-dark' : 'streets-v2-dark')
  if (theme === 'light' && (!baseStyle || baseStyle === 'streets-dk')) sTile = 'streets-v2'
  if (baseStyle === 'hybrid') sTile = 'hybrid'
  if (baseStyle === 'outdoor') sTile = 'outdoor-v2'
  if (baseStyle === 'topo') sTile = 'topo-v2'
  
  const ext = sTile === 'hybrid' ? 'jpg' : 'png'
  const tileUrl = `https://api.maptiler.com/maps/${sTile}/256/{z}/{x}/{y}@2x.${ext}?key=${key}`

  return {
    version: 8,
    sources: {
      'maptiler-raster': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution: '&copy; MapTiler &copy; OpenStreetMap contributors',
        maxzoom: 22
      }
    },
    layers: [{ id: 'maptiler-base', type: 'raster', source: 'maptiler-raster' }]
  }
}

// Stable layout and paint objects so they don't recreate on every render
const routeLayout = { 'line-cap': 'round', 'line-join': 'round' }
const safeRoutePaint = { 'line-color': '#00D084', 'line-width': 6, 'line-opacity': 1 }
const safeRouteOutlinePaint = { 'line-color': '#07110D', 'line-width': 10, 'line-opacity': 0.9 }
const blockedRoutePaint = { 'line-color': '#FF4D4F', 'line-width': 5, 'line-opacity': 0.45, 'line-dasharray': [2, 2] }
const hazardFillPaint = { 'fill-color': '#ef4444', 'fill-opacity': 0.25 }
const hazardOutlinePaint = { 'line-color': '#ef4444', 'line-width': 3, 'line-dasharray': [2, 2] }
const unsafeLinePaint = { 'line-color': '#ef4444', 'line-width': 10, 'line-opacity': 0.85 }
const unsafeStripesPaint = { 'line-color': '#ffffff', 'line-width': 4, 'line-dasharray': [1, 1], 'line-opacity': 0.6 }
const unsafeStripesLayout = { 'line-cap': 'butt', 'line-join': 'round' }

let previousMapStyle = null;

export default function LiveMapPage() {
  const mapRef = useRef(null)
  const location = useLocation()

  const [theme, setTheme] = useState(() => localStorage.getItem('s32-theme') || 'dark')
  const [viewState, setViewState] = useState({
    longitude: 0, latitude: 0,
    zoom: 2, pitch: 0, bearing: 0
  })

  useEffect(() => {
    if (location.state && location.state.centerTo) {
      const { lat, lng } = location.state.centerTo
      setViewState({
        longitude: lng,
        latitude: lat,
        zoom: 15,
        pitch: 0,
        bearing: 0
      })
      setUserLocation([lng, lat])
    }
  }, [location.state])

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownRect, setDropdownRect] = useState(null)
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

  // Non-blocking replacement for alert() — { message, tone: 'info' | 'error' }
  const [notice, setNotice] = useState(null)
  const noticeTimeoutRef = useRef(null)

  // Map style
  const [mapBaseStyle, setMapBaseStyle] = useState(() => localStorage.getItem('s32-mapstyle') || 'streets-dk')
  const [showStylePicker, setShowStylePicker] = useState(false)
  const [mapStyleUrl, setMapStyleUrl] = useState(() => getStableMapStyle(mapBaseStyle, theme))

  // Legend collapse
  const [legendExpanded, setLegendExpanded] = useState(true)

  // Weather
  const [weather, setWeather] = useState(null)

  // Mode: 'live' or 'demo'
  const [appMode, setAppMode] = useState('live')

  // Emergency Destinations
  const [nearbyDestinations, setNearbyDestinations] = useState({ official_shelters: [], temporary_camps: [] })
  const [designateCampMode, setDesignateCampMode] = useState(false)
  const [showCampForm, setShowCampForm] = useState(false)
  const [campForm, setCampForm] = useState({ name: '', capacity: '', notes: '', lat: 0, lng: 0 })


  // Refs mirroring the latest state, so long-lived callbacks (socket handlers,
  // the memoized recalculateRoute) never read stale values from a closure
  // captured at mount time.
  const userLocationRef = useRef(null)
  const destinationRef = useRef(null)
  const avoidWaypointRef = useRef(null)
  const routeDataRef = useRef(null)

  
  const fetchNearbyDestinations = async (lat, lng) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/shelters/nearby?lat=${lat}&lng=${lng}&radius=15000`)
      if (res.ok) {
        const data = await res.json()
        setNearbyDestinations(data)
      }
    } catch (e) {
      console.error('Failed to fetch nearby destinations', e)
    }
  }

  const isFallbackDemo = appMode === 'demo' && !destination;
  const activeUserLocation = isFallbackDemo ? DEMO_CONFIG.start : userLocation;
  const activeDestination = isFallbackDemo ? DEMO_CONFIG.dest : destination;

  useEffect(() => {
    if (activeUserLocation) {
      fetchNearbyDestinations(activeUserLocation[1], activeUserLocation[0])
    }
  }, [activeUserLocation])

  useEffect(() => { userLocationRef.current = activeUserLocation }, [activeUserLocation])
  useEffect(() => { destinationRef.current = activeDestination }, [activeDestination])
  useEffect(() => { avoidWaypointRef.current = avoidWaypoint }, [avoidWaypoint])
  useEffect(() => { routeDataRef.current = routeData }, [routeData])

  const showNotice = useCallback((message, tone = 'info') => {
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    setNotice({ message, tone })
    noticeTimeoutRef.current = setTimeout(() => setNotice(null), NOTICE_DURATION_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current)
    }
  }, [])

  // ---- Theme Effect ----
  useEffect(() => {
    localStorage.setItem('s32-theme', theme)
    document.documentElement.classList.toggle('hl-dark', theme === 'dark')
  }, [theme])

  // Sync stable map style object/url ONLY when base style or theme changes
  useEffect(() => {
    localStorage.setItem('s32-mapstyle', mapBaseStyle)
    setMapStyleUrl(getStableMapStyle(mapBaseStyle, theme))
  }, [mapBaseStyle, theme])

  const routeOutlineRef = useRef(null);
  const routeLineRef = useRef(null);
  const routeHighlightRef = useRef(null);

  // Keep route coords synced and force immediate update
  useEffect(() => {
    const hasRecommendedRoute = !!(routeData?.recommended_route || routeData?.route);

    if (routeData && hasRecommendedRoute) {
      const coords = routeData.recommended_route?.geometry?.coordinates || routeData.route?.geometry?.coordinates;
      console.log("[ROUTE SVG DEBUG]");
      console.log(`route exists: ${!!coords}`);
      if (coords) {
        console.log(`geometry type: ${routeData.recommended_route?.geometry?.type || routeData.route?.geometry?.type}`);
        console.log(`coordinate count: ${coords.length}`);
        console.log(`first coordinate:`, coords[0]);
        console.log(`last coordinate:`, coords[coords.length - 1]);
      }
    }

    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    const clearSvgElement = (el) => {
      if (el) {
        el.setAttribute("d", "");
        el.style.display = 'none';
      }
    };

    const updateSvgRoute = () => {
      if (typeof map.project !== 'function') return;

      const coords = hasRecommendedRoute ? (routeData?.recommended_route?.geometry?.coordinates || routeData?.route?.geometry?.coordinates) : null;
      if (coords && coords.length > 1) {
        const points = coords.map(c => {
          const p = map.project(c);
          return `${p.x},${p.y}`;
        }).join(" L ");
        const pathData = "M " + points;
        if (routeOutlineRef.current) {
          routeOutlineRef.current.setAttribute("d", pathData);
          routeOutlineRef.current.style.display = 'block';
        }
        if (routeLineRef.current) {
          routeLineRef.current.setAttribute("d", pathData);
          routeLineRef.current.style.display = 'block';
        }
        if (routeHighlightRef.current) {
          routeHighlightRef.current.setAttribute("d", pathData);
          routeHighlightRef.current.style.display = 'block';
        }
      } else {
        clearSvgElement(routeOutlineRef.current);
        clearSvgElement(routeLineRef.current);
        clearSvgElement(routeHighlightRef.current);
      }

      const maxAlternatives = Math.max((routeData?.alternatives || []).length, 5);
      for (let idx = 0; idx < maxAlternatives; idx++) {
        const alt = routeData?.alternatives?.[idx];
        const altCoords = alt?.geometry?.coordinates;
        const altOutlineEl = document.getElementById(`alt-route-outline-${idx}`);
        const altLineEl = document.getElementById(`alt-route-line-${idx}`);
        const altHighlightEl = document.getElementById(`alt-route-highlight-${idx}`);
        if (altCoords && altCoords.length > 1) {
          const points = altCoords.map(c => {
            const p = map.project(c);
            return `${p.x},${p.y}`;
          }).join(" L ");
          const pathData = "M " + points;
          if (altOutlineEl) { altOutlineEl.setAttribute("d", pathData); altOutlineEl.style.display = 'block'; }
          if (altLineEl) { altLineEl.setAttribute("d", pathData); altLineEl.style.display = 'block'; }
          if (altHighlightEl) { altHighlightEl.setAttribute("d", pathData); altHighlightEl.style.display = 'block'; }
        } else {
          clearSvgElement(altOutlineEl);
          clearSvgElement(altLineEl);
          clearSvgElement(altHighlightEl);
        }
      }

      const maxUnsafe = Math.max((routeData?.unsafe_routes || []).length, 5);
      for (let idx = 0; idx < maxUnsafe; idx++) {
        const alt = routeData?.unsafe_routes?.[idx];
        const unsafeCoords = alt?.geometry?.coordinates;
        const unsafeOutlineEl = document.getElementById(`unsafe-route-outline-${idx}`);
        const unsafeLineEl = document.getElementById(`unsafe-route-line-${idx}`);
        const unsafeHighlightEl = document.getElementById(`unsafe-route-highlight-${idx}`);
        if (unsafeCoords && unsafeCoords.length > 1) {
          const points = unsafeCoords.map(c => {
            const p = map.project(c);
            return `${p.x},${p.y}`;
          }).join(" L ");
          const pathData = "M " + points;
          if (unsafeOutlineEl) { unsafeOutlineEl.setAttribute("d", pathData); unsafeOutlineEl.style.display = 'block'; }
          if (unsafeLineEl) { unsafeLineEl.setAttribute("d", pathData); unsafeLineEl.style.display = 'block'; }
          if (unsafeHighlightEl) { unsafeHighlightEl.setAttribute("d", pathData); unsafeHighlightEl.style.display = 'block'; }
        } else {
          clearSvgElement(unsafeOutlineEl);
          clearSvgElement(unsafeLineEl);
          clearSvgElement(unsafeHighlightEl);
        }
      }
    };

    updateSvgRoute();
    map.on('render', updateSvgRoute);
    map.on('move', updateSvgRoute);
    map.on('zoom', updateSvgRoute);

    return () => {
      map.off('render', updateSvgRoute);
      map.off('move', updateSvgRoute);
      map.off('zoom', updateSvgRoute);
    };
  }, [routeData]);

  // ---- Weather (OpenMeteo - free, no key needed) ----
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

  // Refresh weather periodically
  useEffect(() => {
    if (!userLocation) return
    const interval = setInterval(() => fetchWeather(userLocation[1], userLocation[0]), WEATHER_REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [userLocation])

  const weatherDesc = (code) => {
    if (code === 0) return 'Clear'
    if (code <= 3) return 'Cloudy'
    if (code <= 48) return 'Foggy'
    if (code <= 67) return 'Rain'
    if (code <= 77) return 'Snow'
    if (code <= 82) return 'Showers'
    if (code <= 99) return 'Storm'
    return 'Unknown'
  }

  const weatherIcon = (code) => {
    if (code === 0) return '☀️'
    if (code <= 3) return '⛅'
    if (code <= 48) return '🌫️'
    if (code <= 67) return '🌧️'
    if (code <= 77) return '❄️'
    if (code <= 82) return '🌦️'
    return '⛈️'
  }

  // ---- Routing (defined early so effects below can safely reference it) ----
  const fetchRoute = async (start, end, waypoint = null) => {
    try {
      let hazardQuery = ''
      if (waypoint) {
        hazardQuery = `&hazardLng=${waypoint[0]}&hazardLat=${waypoint[1]}`
      }
      const res = await fetch(`${API_BASE_URL}/api/routes?startLng=${start[0]}&startLat=${start[1]}&endLng=${end[0]}&endLat=${end[1]}${hazardQuery}`)
      const data = await res.json()

      if (waypoint && !data.recommended_route && data.route) {
        showNotice("⚠️ HazardLens AI service unavailable. Falling back to standard route.", "error");
      }

      if (data.recommended_route || data.alternatives || data.unsafe_routes || data.route) {

        let routeGeoJSON = null;
        const mainRoute = data.recommended_route || data.route;

        if (mainRoute?.geometry) {
          routeGeoJSON = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: mainRoute.geometry }] };
        }

        return {
          geojson: routeGeoJSON,
          recommended_route: data.recommended_route || null,
          route: data.route || null, // fallback for legacy
          alternatives: data.alternatives || [],
          unsafe_routes: data.unsafe_routes || [],
          hazards: data.hazards || [],
          // For legacy panel compatibility:
          distance: mainRoute?.distance,
          duration: mainRoute?.duration,
          steps: mainRoute?.steps || [],
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

  // Reads current start/end/waypoint from refs (never stale), so it's safe
  // to call from the socket effect below without resubscribing on every
  // location/destination change. Pass an explicit waypoint to override the
  // stored avoidWaypoint (used when a live incident just supplied one).
  const recalculateRoute = useCallback(async (waypointOverride) => {
    const start = userLocationRef.current
    const end = destinationRef.current
    if (!start || !end) return
    setRecalculating(true)
    setOldRouteData(routeDataRef.current)
    const waypoint = waypointOverride !== undefined ? waypointOverride : avoidWaypointRef.current
    const newRoute = await fetchRoute(start, end, waypoint)
    setRecalculating(false)
    setOldRouteData(null)
    if (newRoute) {
      setRouteData(newRoute)
      if (newRoute.recommended_route || newRoute.route) {
        fitMapToRoute(newRoute.geojson)
      }
    } else {
      setRouteData(null)
      showNotice('Could not find safe route. Fallback to default.', 'error')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Geolocation + Socket ----
  useEffect(() => {
    let watchId = null
    let hasCentered = false

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lng = pos.coords.longitude
          const lat = pos.coords.latitude
          setUserLocation([lng, lat])
          // Only auto-center the map and pull weather on the *first* fix —
          // otherwise every GPS update would yank the view and re-fetch weather.
          if (!hasCentered && appMode !== 'demo') {
            hasCentered = true
            setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 15 }))
            fetchWeather(lat, lng)
            if (destinationRef.current) recalculateRoute()
          }
        },
        () => {
          // Geolocation unavailable. Show nothing (handled by UI state)
        },
        { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS }
      )
    }

    const socket = io(API_BASE_URL)

    socket.on('incident:update', (data) => {
      setIncident(prev => ({ ...prev, ...data }))

      const isConfirmedHazard = data.status === 'CONFIRMED' && data.confidence >= CONFIRM_CONFIDENCE_THRESHOLD
      if (!isConfirmedHazard) return

      if (data.hazardCenter) {
        // We now just set the avoidWaypoint to the actual hazard center and let the backend evaluate intersection
        const [hazardLng, hazardLat] = data.hazardCenter
        setAvoidWaypoint([hazardLng, hazardLat])
        recalculateRoute([hazardLng, hazardLat])
      } else {
        recalculateRoute()
      }
    })

    socket.on('evidence:new', (data) => {
      setEvidenceStream(prev => [...prev, data])
    })

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      socket.disconnect()
    }
  }, [recalculateRoute])

  // ---- Search ----
  const geocode = async (query, { limit } = {}) => {
    let localResults = [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.results?.length > 0) {
          localResults = data.results.map(r => ({
            ...r,
            display_name: r.display_name,
            lat: String(r.lat),
            lon: String(r.lon),
            source: 'local'
          }));
        }
      }
    } catch (err) {
      console.warn("Local search failed", err);
    }

    // If local database returns plenty of results, return them immediately
    if (localResults.length >= (limit || 6)) {
      return localResults.slice(0, limit || 6);
    }

    let nomResults = [];
    try {
      const params = new URLSearchParams({ format: 'json', q: query, addressdetails: '1', countrycodes: 'in' });
      // Request enough to fill the remaining slots
      const nomLimit = limit ? limit - localResults.length : 6;
      params.set('limit', String(Math.max(1, nomLimit)));

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) {
          nomResults = data.map(r => ({ ...r, source: 'nominatim' }));
        }
      }
    } catch (err) {
      console.warn("Nominatim search failed", err);
    }

    // Merge and deduplicate
    const combined = [...localResults];
    const seenNames = new Set(localResults.map(r => r.display_name.toLowerCase().trim()));

    for (const nr of nomResults) {
      const nameKey = nr.display_name.toLowerCase().trim();
      const nrLat = parseFloat(nr.lat);
      const nrLon = parseFloat(nr.lon);

      const isNameDupe = Array.from(seenNames).some(seen =>
        nameKey.includes(seen) || seen.includes(nameKey)
      );
      const isCoordDupe = localResults.some(lr =>
        Math.abs(parseFloat(lr.lat) - nrLat) < 0.05 &&
        Math.abs(parseFloat(lr.lon) - nrLon) < 0.05
      );

      if (!isNameDupe && !isCoordDupe) {
        seenNames.add(nameKey);
        combined.push(nr);
      }
    }

    return combined.slice(0, limit || 6);
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setShowSuggestions(false)
    try {
      const data = await geocode(searchQuery, { limit: 1 })
      if (data?.length > 0) {
        const lng = parseFloat(data[0].lon)
        const lat = parseFloat(data[0].lat)
        setViewState(prev => ({ ...prev, longitude: lng, latitude: lat, zoom: 15 }))
        fetchWeather(lat, lng)
      } else {
        showNotice('Location not found', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotice('Search failed. Please try again.', 'error')
    }
    finally { setIsSearching(false) }
  }

  const fetchSuggestions = useCallback((query) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!query || query.trim().length < 2) {
      setSearchSuggestions([]); setShowSuggestions(false); return
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const data = await geocode(query, { limit: 6 })
        setSearchSuggestions(data || [])
        setShowSuggestions(data?.length > 0)
      } catch (err) { console.error('Suggestion error:', err) }
    }, SEARCH_DEBOUNCE_MS)
  }, [])

  // Clear any pending debounce on unmount so it can't call setState after unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
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

    // Route to the selected destination using existing logic
    handleMapClick({ lngLat: { lng, lat } })
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keep the portal dropdown's position glued to the search box, since it now
  // lives outside the normal DOM flow (appended to document.body) and can't
  // rely on CSS positioning relative to its original parent anymore.
  useEffect(() => {
    if (!showSuggestions) return
    const updateRect = () => {
      if (searchContainerRef.current) {
        setDropdownRect(searchContainerRef.current.getBoundingClientRect())
      }
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [showSuggestions, searchSuggestions])

  const handleMapClick = async (e) => {
    if (designateCampMode) {
      setCampForm({ ...campForm, lat: e.lngLat.lat, lng: e.lngLat.lng })
      setShowCampForm(true)
      setDesignateCampMode(false)
      return
    }

    if (!userLocation) {
      showNotice('Waiting for your location. Check browser location permissions.', 'error')
      return
    }
    const dest = [e.lngLat.lng, e.lngLat.lat]
    if (appMode === 'demo') {
      setAppMode('live')
      setAvoidWaypoint(null)
    }
    setDestination(dest)
    setIncident(null)
    setOldRouteData(null)
    setRouteData(null)
    setEvidenceStream([])
    const rData = await fetchRoute(userLocation, dest)
    setOldRouteData(null)
    if (rData) {
      setRouteData(rData)
      if (rData.recommended_route || rData.route) {
        fitMapToRoute(rData.geojson)
      }
    }
  }

  const formatDistance = (m) => m > 1000 ? (m / 1000).toFixed(1) + ' km' : Math.round(m) + ' m'
  const formatDuration = (s) => Math.round(s / 60) + ' min'

  const getStepIcon = (modifier) => {
    if (!modifier) return <ArrowUp size={16} />
    if (modifier.includes('left')) return <CornerUpLeft size={16} />
    if (modifier.includes('right')) return <CornerUpRight size={16} />
    return <ArrowUp size={16} />
  }

  // ---- Theme ----
  const isDark = theme === 'dark'
  const bgUI = isDark ? 'rgba(10, 17, 35, 0.96)' : 'rgba(255,255,255,0.96)'
  const borderUI = isDark ? 'rgba(51,65,85,0.8)' : '#e2e8f0'
  const textUI = isDark ? '#f1f5f9' : '#0f172a'
  const textSubUI = isDark ? '#94a3b8' : '#64748b'

  
  const handleCreateCamp = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE_URL}/api/relief-camps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campForm)
      })
      if (res.ok) {
        showNotice('Temporary relief camp created successfully', 'info')
        setShowCampForm(false)
        setCampForm({ name: '', capacity: '', notes: '', lat: 0, lng: 0 })
        if (activeUserLocation) {
          fetchNearbyDestinations(activeUserLocation[1], activeUserLocation[0])
        }
      } else {
        showNotice('Failed to create relief camp', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotice('Error creating relief camp', 'error')
    }
  }

  const startDemo = async () => {
    try {
      setAppMode('demo')
      setIncident(null)
      setEvidenceStream([])
      setOldRouteData(null)

      // Use selected location/destination for dynamic demo, or fallback to Bhubaneswar
      const isFallbackDemo = !destination;
      const demoStart = isFallbackDemo ? DEMO_CONFIG.start : userLocation;
      const demoDest = isFallbackDemo ? DEMO_CONFIG.dest : destination;

      let demoHazard = DEMO_CONFIG.hazard;
      if (!isFallbackDemo && routeData && (routeData.recommended_route || routeData.route)) {
        const coords = routeData.recommended_route?.geometry?.coordinates || routeData.route?.geometry?.coordinates;
        if (coords && coords.length > 0) {
          demoHazard = coords[Math.floor(coords.length / 2)];
        }
      } else if (!isFallbackDemo) {
        demoHazard = [(demoStart[0] + demoDest[0]) / 2, (demoStart[1] + demoDest[1]) / 2];
      }

      setAvoidWaypoint(demoHazard);
      setViewState(prev => ({ ...prev, longitude: demoStart[0], latitude: demoStart[1], zoom: 14.5 }));

      await fetch(`${API_BASE_URL}/api/demo/flood/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLng: demoStart[0], startLat: demoStart[1],
          destLng: demoDest[0], destLat: demoDest[1],
          hazardLng: demoHazard[0], hazardLat: demoHazard[1]
        })
      })
    } catch (err) {
      console.error(err)
      showNotice('Failed to start demo. Is the backend running?', 'error')
    }
  }

  // ---- Map Data ----
  const hazardPolygon = useMemo(() => {
    if (!incident || incident.confidence < HAZARD_DISPLAY_THRESHOLD || !incident.hazardCenter) return null
    const [lng, lat] = incident.hazardCenter
    const d = HAZARD_POLYGON_HALF_SIZE_DEG
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[lng - d, lat + d], [lng + d, lat + d], [lng + d, lat - d], [lng - d, lat - d], [lng - d, lat + d]]] } }] }
  }, [incident])

  const unsafeRoadGeoJSON = useMemo(() => {
    if (!incident || incident.status !== 'CONFIRMED' || !incident.hazardCenter) return null
    const [lng, lat] = incident.hazardCenter
    const d = UNSAFE_ROAD_OFFSET_DEG
    return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[lng - d, lat - d], [lng + d, lat + d]] } }] }
  }, [incident])

  const hasRecommendedRoute = !!(routeData?.recommended_route || routeData?.route);

  return (
    <div className="dash-v2" style={{ backgroundColor: isDark ? '#060d1f' : '#f8fafc', color: textUI, height: '100%', display: 'flex', flexDirection: 'column' }}>

      <div className="dash-filterbar" style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.98)' : '#ffffff', borderBottom: `1px solid ${borderUI}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', height: '52px', backdropFilter: 'blur(12px)', zIndex: 50, position: 'relative' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <Shield size={20} color="#3b82f6" />
          <span style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '14px' }}>S32 LIVE OPS</span>
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button onClick={() => setAppMode('live')} aria-label="Switch to live mode" aria-pressed={appMode === 'live'} style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', border: 'none', cursor: 'pointer', background: appMode === 'live' ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9'), color: appMode === 'live' ? 'white' : textSubUI, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={10} /> LIVE
            </button>
            <button onClick={() => setDesignateCampMode(!designateCampMode)} aria-label="Designate Camp" aria-pressed={designateCampMode} style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', border: 'none', cursor: 'pointer', background: designateCampMode ? '#f59e0b' : (isDark ? '#1e293b' : '#f1f5f9'), color: designateCampMode ? 'white' : textSubUI, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tent size={10} /> {designateCampMode ? 'CLICK MAP' : '+ CAMP'}
            </button>

            <button onClick={() => setAppMode('demo')} aria-label="Switch to demo mode" aria-pressed={appMode === 'demo'} style={{ padding: '3px 10px', fontSize: '11px', fontWeight: 700, borderRadius: '20px', border: 'none', cursor: 'pointer', background: appMode === 'demo' ? '#f59e0b' : (isDark ? '#1e293b' : '#f1f5f9'), color: appMode === 'demo' ? 'white' : textSubUI, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={10} /> DEMO
            </button>
          </div>
        </div>

        {/* Search — lives directly in the map's own filter bar (previously portaled into TopBar,
            which caused a second, non-functional search box to appear next to this one).
            The suggestions dropdown itself is rendered via a React Portal into document.body
            (see below) so it always paints above the MapLibre canvas, regardless of the
            stacking-context/z-index relationship between .dash-filterbar and .dash-main. */}
        <div ref={searchContainerRef} style={{ position: 'relative', flex: 1, maxWidth: '440px', margin: '0 20px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: showSuggestions ? '8px 8px 0 0' : '8px', border: `1px solid ${showSuggestions ? '#3b82f6' : borderUI}`, padding: '6px 12px', width: '100%', transition: 'all 0.2s', boxShadow: showSuggestions ? 'none' : '0 1px 3px rgba(0,0,0,0.15)' }}>
            <Search size={14} color={isSearching ? '#3b82f6' : textSubUI} />
            <input
              type="text"
              placeholder="Search map or location..."
              aria-label="Search map or location"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
              style={{ background: 'transparent', border: 'none', color: textUI, marginLeft: '8px', width: '100%', outline: 'none', fontSize: '14px' }}
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setSearchSuggestions([]); setShowSuggestions(false) }} aria-label="Clear search" style={{ background: 'transparent', border: 'none', color: textSubUI, cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 2px' }}>×</button>
            )}
          </form>
        </div>

        {/* Suggestions dropdown — portaled to document.body and positioned via
            getBoundingClientRect() so it renders in its own stacking context at
            the document root, above the map's WebGL canvas. */}
        {showSuggestions && searchSuggestions.length > 0 && dropdownRect && createPortal(
          <div style={{
            position: 'fixed',
            top: dropdownRect.bottom,
            left: dropdownRect.left,
            width: dropdownRect.width,
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid #3b82f6`,
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: 99999
          }}>
            {searchSuggestions.map((item, i) => {
              const parts = item.display_name.split(',')
              const mainName = parts[0]?.trim()
              const subText = parts.slice(1, 3).join(',').trim()
              return (
                <button key={item.place_id || i} onMouseDown={() => selectSuggestion(item)}
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
          </div>,
          document.body
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Weather widget */}
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: '8px', border: `1px solid ${borderUI}`, fontSize: '12px' }}>
              <span style={{ fontSize: '16px' }}>{weatherIcon(weather.code)}</span>
              <span style={{ fontWeight: 700, color: textUI }}>{weather.temp}°C</span>
              <span style={{ color: textSubUI }}>{weatherDesc(weather.code)}</span>
              {weather.rain > 0 && <span style={{ color: '#60a5fa', fontWeight: 600 }}>💧{weather.rain}mm</span>}
              <span style={{ color: textSubUI }}>💨{weather.wind}km/h</span>
            </div>
          )}

          {/* Map Style Picker */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowStylePicker(!showStylePicker)} aria-label="Change map style" aria-expanded={showStylePicker}
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

          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSubUI, display: 'flex', alignItems: 'center' }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button onClick={startDemo}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 14px rgba(16,185,129,0.4)', letterSpacing: '0.3px' }}>
            <Play size={13} fill="currentColor" /> RUN DEMO
          </button>
        </div>
      </div>

      {/* ---- MAP AREA ---- */}
      <div className="dash-main" style={{ position: 'relative' }}>

        {/* Non-blocking notice banner (replaces alert()) */}
        {notice && (
          <div role="status" style={{
            position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
            background: notice.tone === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
            color: 'white', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap'
          }}>
            {notice.message}
            <button onClick={() => setNotice(null)} aria-label="Dismiss notice" style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        {/* Left Panels */}
        <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none', maxWidth: '340px' }}>

          
          {/* Emergency Destinations Panel */}
          {activeUserLocation && appMode === 'live' && !incident && (
            <div style={{ pointerEvents: 'auto', backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${borderUI}`, borderRadius: '14px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', maxHeight: '350px', overflowY: 'auto' }}>
              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>EMERGENCY DESTINATIONS</div>
              
              {(!nearbyDestinations.official_shelters.length && !nearbyDestinations.temporary_camps.length) ? (
                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                  NO OFFICIAL OSDMA SHELTER FOUND NEARBY
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {nearbyDestinations.official_shelters.length === 0 && (
                     <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
                      NO OFFICIAL OSDMA SHELTER FOUND NEARBY
                    </div>
                  )}

                  {nearbyDestinations.official_shelters.slice(0,2).map(s => (
                    <div key={s.id} style={{ border: `1px solid rgba(16,185,129,0.3)`, borderRadius: '8px', padding: '10px', background: isDark ? 'rgba(16,185,129,0.05)' : '#f0fdf4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <Building2 size={16} color="#10b981" style={{ marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: textUI }}>OSDMA MULTIPURPOSE SHELTER</div>
                            <div style={{ fontSize: '11px', color: textSubUI, fontWeight: 600 }}>{formatDistance(s.distance)} · {s.district || s.block}</div>
                            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, marginTop: '2px' }}>OFFICIAL</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setDestination([s.longitude, s.latitude]); handleMapClick({ lngLat: { lng: s.longitude, lat: s.latitude }}) }} style={{ width: '100%', marginTop: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        ROUTE TO SHELTER
                      </button>
                    </div>
                  ))}

                  {nearbyDestinations.temporary_camps.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>TEMPORARY RELIEF CAMP AVAILABLE</div>
                  )}

                  {nearbyDestinations.temporary_camps.map(c => (
                    <div key={c.id} style={{ border: `1px solid rgba(245,158,11,0.3)`, borderRadius: '8px', padding: '10px', background: isDark ? 'rgba(245,158,11,0.05)' : '#fffbeb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <Tent size={16} color="#f59e0b" style={{ marginTop: '2px' }} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: textUI }}>TEMPORARY RELIEF CAMP</div>
                            <div style={{ fontSize: '11px', color: textSubUI, fontWeight: 600 }}>{formatDistance(c.distance)} · {c.name}</div>
                            <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, marginTop: '2px' }}>ACTIVE · Designated by {c.designated_by}</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setDestination([c.lng, c.lat]); handleMapClick({ lngLat: { lng: c.lng, lat: c.lat }}) }} style={{ width: '100%', marginTop: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', padding: '6px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                        ROUTE TO CAMP
                      </button>
                    </div>
                  ))}

                  <div style={{ fontSize: '9px', color: textSubUI, textAlign: 'center', marginTop: '4px' }}>
                    Source: Odisha State Disaster Management Authority (OSDMA)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weather Panel (live mode) */}
          {weather && appMode === 'live' && !incident && (
            <div style={{ pointerEvents: 'auto', backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${borderUI}`, borderRadius: '14px', padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>LIVE WEATHER CONDITIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Thermometer size={16} color="#f59e0b" />
                  <div>
                    <div style={{ fontSize: '11px', color: textSubUI }}>Temperature</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{weather.temp}°C</div>
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
              {weather.code >= HEAVY_RAIN_WEATHER_CODE_THRESHOLD && (
                <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(239,68,68,0.1)', borderLeft: '3px solid #ef4444', borderRadius: '4px', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                  ⚠️ Heavy precipitation — flood risk elevated
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
                  <div style={{ fontSize: '11px', color: textSubUI, fontWeight: 600, marginTop: '1px' }}>LIVE INCIDENT {appMode === 'demo' ? '· DEMO MODE' : ''}</div>
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
                  <div style={{ fontSize: '14px', color: textUI, fontWeight: 700 }}>AVOID AFFECTED ROAD · TAKE SAFE ROUTE</div>
                </div>
              )}

              <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, marginBottom: '10px', letterSpacing: '0.5px' }}>LIVE EVIDENCE STREAM</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {evidenceStream.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }}><Check size={13} strokeWidth={3} /></div>
                    <div>
                      <div style={{ color: textSubUI, fontSize: '10px', fontWeight: 600, marginBottom: '1px' }}>{ev.time} · {ev.source}</div>
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
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ backgroundColor: recalculating ? 'rgba(239,68,68,0.95)' : bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${recalculating ? 'transparent' : borderUI}`, borderRadius: '14px', padding: '14px 20px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', transition: 'all 0.3s ease', minWidth: '220px' }}>
              {recalculating ? (
                <div style={{ color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <RefreshCw size={16} className="spin" /> RECALCULATING...
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '11px', color: (routeData.recommended_route || routeData.route) ? textSubUI : '#ef4444', fontWeight: 700, marginBottom: '6px' }}>
                    {(routeData.recommended_route || routeData.route) ? 'RECOMMENDED SAFE ROUTE' : 'ROUTE SAFETY UNAVAILABLE'}
                  </div>

                  {(routeData.recommended_route || routeData.route) && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ fontSize: '30px', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>{formatDuration((routeData.recommended_route || routeData.route).duration)}</span>
                        <span style={{ fontSize: '16px', fontWeight: 600, color: textSubUI }}>{formatDistance((routeData.recommended_route || routeData.route).distance)}</span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '11px', color: textUI, fontWeight: 500 }}>
                        Hazard exposure: {routeData.recommended_route?.hazardExposure || 0}
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                        {routeData.recommended_route?.safety || 'SAFE'}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Alternatives List */}
            {routeData.alternatives && routeData.alternatives.length > 0 && !recalculating && (
              <div style={{ backgroundColor: bgUI, backdropFilter: 'blur(16px)', border: `1px solid ${borderUI}`, borderRadius: '10px', padding: '12px 16px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: '10px', color: textSubUI, fontWeight: 700, marginBottom: '8px' }}>ALTERNATIVE ROUTES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {routeData.alternatives.map((alt, i) => (
                    <div key={alt.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ fontWeight: 600, color: textUI }}>Route {i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: textSubUI, fontWeight: 500 }}>{formatDistance(alt.distance)}</span>
                        <span style={{ color: '#10b981', fontWeight: 800, fontSize: '10px' }}>SAFE</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unsafe Routes Avoided */}
            {routeData.unsafe_routes && routeData.unsafe_routes.length > 0 && !recalculating && (
              <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', backdropFilter: 'blur(16px)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 16px', boxShadow: '0 4px 12px rgba(239,68,68,0.1)' }}>
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800, marginBottom: '2px' }}>HAZARDOUS ROUTES AVOIDED</div>
                <div style={{ fontSize: '12px', color: textUI, fontWeight: 600 }}>{routeData.unsafe_routes.length} route{routeData.unsafe_routes.length > 1 ? 's' : ''} rejected</div>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Legend */}
        <div style={{ position: 'absolute', bottom: 28, left: 16, zIndex: 10, backgroundColor: bgUI, backdropFilter: 'blur(12px)', border: `1px solid ${borderUI}`, borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', overflow: 'hidden', minWidth: '145px' }}>
          <button onClick={() => setLegendExpanded(!legendExpanded)} aria-label={legendExpanded ? 'Collapse map legend' : 'Expand map legend'} aria-expanded={legendExpanded}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: textSubUI, fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
            MAP LEGEND {legendExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
          {legendExpanded && (
            <div style={{ padding: '2px 12px 10px', display: 'flex', flexDirection: 'column', gap: '7px', fontSize: '11px', color: textUI, fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', boxShadow: '0 0 0 2px rgba(59,130,246,0.3)', flexShrink: 0 }} /> YOU</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#00D084', borderRadius: '2px', flexShrink: 0 }} /> SAFE ROUTE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#eab308', borderRadius: '2px', flexShrink: 0 }} /> ALT ROUTE 1</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#64748b', borderRadius: '2px', flexShrink: 0 }} /> ALT ROUTE 2+</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#ef4444', borderRadius: '2px', flexShrink: 0 }} /> UNSAFE ROUTE</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '4px', background: '#FF4D4F', border: '1px dashed #FF4D4F', borderRadius: '2px', flexShrink: 0 }} /> BLOCKED ROUTE</div>
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
          mapStyle={mapStyleUrl}
          interactive={true}
          cursor={userLocation && !destination ? 'crosshair' : 'grab'}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Controls */}
          <div style={{ position: 'absolute', bottom: 28, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button onClick={() => setViewState(p => ({ ...p, zoom: p.zoom + 1 }))} aria-label="Zoom in" style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Plus size={17} /></button>
            <button onClick={() => setViewState(p => ({ ...p, zoom: p.zoom - 1 }))} aria-label="Zoom out" style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Minus size={17} /></button>
            <button onClick={() => setViewState(p => ({ ...p, bearing: 0, pitch: 45 }))} aria-label="Reset map orientation" style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: textUI, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Compass size={17} /></button>
            <button onClick={() => userLocation && setViewState(p => ({ ...p, longitude: userLocation[0], latitude: userLocation[1], zoom: 15 }))} aria-label="Recenter on my location" style={{ width: '36px', height: '36px', backgroundColor: bgUI, border: `1px solid ${borderUI}`, borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}><Navigation size={17} /></button>
          </div>

          
          {/* OFFICIAL SHELTERS MARKERS */}
          {nearbyDestinations.official_shelters.map(s => (
            <Marker key={s.id} longitude={s.longitude} latitude={s.latitude} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: activeDestination && activeDestination[0] === s.longitude ? 0.3 : 1 }}>
                <div style={{ backgroundColor: '#10b981', padding: '4px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  <Building2 size={14} color="white" />
                </div>
              </div>
            </Marker>
          ))}

          {/* TEMPORARY CAMPS MARKERS */}
          {nearbyDestinations.temporary_camps.map(c => (
            <Marker key={c.id} longitude={c.lng} latitude={c.lat} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: activeDestination && activeDestination[0] === c.lng ? 0.3 : 1 }}>
                <div style={{ backgroundColor: '#f59e0b', padding: '4px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  <Tent size={14} color="white" />
                </div>
              </div>
            </Marker>
          ))}

          {/* HAZARD POLYGON */}
          {hazardPolygon && (
            <Source id="hazard-zone" type="geojson" data={hazardPolygon}>
              <Layer id="hazard-fill" type="fill" paint={hazardFillPaint} />
              <Layer id="hazard-outline" type="line" layout={routeLayout} paint={hazardOutlinePaint} />
            </Source>
          )}

          {/* UNSAFE ROAD */}
          {unsafeRoadGeoJSON && (
            <Source id="unsafe-road-src" type="geojson" data={unsafeRoadGeoJSON}>
              <Layer id="unsafe-line" type="line" layout={routeLayout} paint={unsafeLinePaint} />
              <Layer id="unsafe-stripes" type="line" layout={unsafeStripesLayout} paint={unsafeStripesPaint} />
            </Source>
          )}

          {/* OLD BLOCKED ROUTE */}
          {oldRouteData && oldRouteData.geojson && (
            <Source id="s32-blocked-route" type="geojson" data={oldRouteData.geojson}>
              <Layer id="s32-blocked-route-line" type="line" layout={routeLayout} paint={blockedRoutePaint} />
            </Source>
          )}



          {/* USER MARKER */}
          {activeUserLocation && (
            <Marker longitude={activeUserLocation[0]} latitude={activeUserLocation[1]} anchor="center">
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'absolute', width: '40px', height: '40px', background: 'rgba(59,130,246,0.2)', borderRadius: '50%', top: '-10px', animation: 'pulse 2s infinite' }} />
                <div style={{ width: '22px', height: '22px', backgroundColor: '#3b82f6', border: '3px solid white', borderRadius: '50%', boxShadow: '0 3px 10px rgba(0,0,0,0.4)', zIndex: 2 }} />
                <div style={{ background: bgUI, color: textUI, fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', marginTop: '4px', border: `1px solid ${borderUI}`, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>YOU</div>
              </div>
            </Marker>
          )}

          {/* DESTINATION MARKER */}
          {activeDestination && (
            <Marker longitude={activeDestination[0]} latitude={activeDestination[1]} anchor="bottom">
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

        <svg
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 5
          }}
        >
          <defs>
            <filter id="route-glow-green" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="route-glow-red" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="route-glow-yellow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="route-glow-gray" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Unsafe Routes rendered at the very bottom */}
          {routeData && routeData.unsafe_routes && routeData.unsafe_routes.map((alt, idx) => (
            <g key={`unsafe-${alt.id || idx}`}>
              <path
                id={`unsafe-route-outline-${idx}`}
                fill="none"
                stroke="#ff0000"
                strokeWidth="10"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#route-glow-red)"
                style={{ display: 'none' }}
              />
              <path
                id={`unsafe-route-line-${idx}`}
                fill="none"
                stroke="#fca5a5"
                strokeWidth="4"
                strokeOpacity="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'none' }}
              />
              <path
                id={`unsafe-route-highlight-${idx}`}
                fill="none"
                stroke="transparent"
                style={{ display: 'none' }}
              />
              <text dy="4" fill="#ffffff" fontSize="14" fontWeight="900" opacity="0.9">
                <textPath href={`#unsafe-route-line-${idx}`} startOffset="0%">
                  {Array(100).fill('»').join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')}
                </textPath>
              </text>
            </g>
          ))}
          {/* Alternatives rendered above unsafe */}
          {routeData && routeData.alternatives && routeData.alternatives.map((alt, idx) => (
            <g key={`alt-${alt.id || idx}`}>
              <path
                id={`alt-route-outline-${idx}`}
                fill="none"
                stroke={idx === 0 ? '#eab308' : '#64748b'}
                strokeWidth="10"
                strokeOpacity="0.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={idx === 0 ? "url(#route-glow-yellow)" : "url(#route-glow-gray)"}
                style={{ display: 'none' }}
              />
              <path
                id={`alt-route-line-${idx}`}
                fill="none"
                stroke={idx === 0 ? '#fde047' : '#cbd5e1'}
                strokeWidth="4"
                strokeOpacity="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'none' }}
              />
              <path
                id={`alt-route-highlight-${idx}`}
                fill="none"
                stroke="transparent"
                style={{ display: 'none' }}
              />
              <text dy="4" fill="#ffffff" fontSize="14" fontWeight="900" opacity="0.9">
                <textPath href={`#alt-route-line-${idx}`} startOffset="0%">
                  {Array(100).fill('»').join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')}
                </textPath>
              </text>
            </g>
          ))}
          {/* Main safe route on top */}
          <path
            ref={routeOutlineRef}
            fill="none"
            stroke="#00ff00"
            strokeWidth="12"
            strokeOpacity="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#route-glow-green)"
            style={{ display: 'none' }}
          />
          <path
            ref={routeLineRef}
            id="main-route-path"
            fill="none"
            stroke="#86efac"
            strokeWidth="5"
            strokeOpacity="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'none' }}
          />
          <path
            ref={routeHighlightRef}
            fill="none"
            stroke="transparent"
            style={{ display: 'none' }}
          />
          <text dy="5" fill="#ffffff" fontSize="18" fontWeight="900" opacity="1">
            <textPath href="#main-route-path" startOffset="0%">
              {Array(150).fill('»').join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')}
            </textPath>
          </text>
        </svg>

        
        {/* Admin Form Modal */}
        {showCampForm && (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: bgUI, padding: '24px', borderRadius: '12px', width: '400px', border: `1px solid ${borderUI}` }}>
              <h2 style={{ marginTop: 0, color: textUI }}>Designate Relief Camp</h2>
              <form onSubmit={handleCreateCamp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input required placeholder="Camp Name" value={campForm.name} onChange={e => setCampForm({...campForm, name: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${borderUI}`, background: isDark ? '#1e293b' : '#fff', color: textUI }} />
                <input type="number" placeholder="Capacity (optional)" value={campForm.capacity} onChange={e => setCampForm({...campForm, capacity: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${borderUI}`, background: isDark ? '#1e293b' : '#fff', color: textUI }} />
                <textarea placeholder="Notes (optional)" value={campForm.notes} onChange={e => setCampForm({...campForm, notes: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${borderUI}`, background: isDark ? '#1e293b' : '#fff', color: textUI }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowCampForm(false)} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${borderUI}`, background: 'transparent', color: textUI, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Create Camp</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Helper hint */}
        {!activeDestination && activeUserLocation && (
          <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: 'white', padding: '12px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: 700, boxShadow: '0 10px 30px rgba(59,130,246,0.4)', pointerEvents: 'none', animation: 'bounce 2s infinite', whiteSpace: 'nowrap', zIndex: 10 }}>
            🖱️ Click anywhere on the map to set your destination
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="dash-statusbar" style={{ backgroundColor: isDark ? '#060d1f' : '#f1f5f9', borderTop: `1px solid ${borderUI}`, color: textSubUI, padding: '4px 16px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span>S32 Nav-Core Operational</span>
          <span>•</span>
          <span>Routing: OSRM</span>
          <span>•</span>
          <span style={{ color: appMode === 'demo' ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{appMode === 'demo' ? '⚡ DEMO MODE' : '🟢 LIVE MODE'}</span>
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