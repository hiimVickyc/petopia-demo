// app/map/_components/map/petmap-component.js
'use client'
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { DEFAULT_MAP_STYLE } from '@/app/map/_components/map/maptile-styles'
import { createCustomIcon, createUserLocationIcon } from '@/app/map/_components/map/map-markers'
import { usePlaceCategories } from '@/app/map/_components/hooks/use-place-categories'

const EPS = 1e-6
const eq = (a, b) => Math.abs(a - b) < EPS
const isSameLL = (a, b) => !!a && !!b && eq(a.lat, b.lat) && eq(a.lng, b.lng)

export default function PetMapComponent({
  places = [],
  selectedPlace = null,
  userLocation = null,
  routeProfile = 'driving',
  onPlaceSelect,
  onMapMove,
  onLocationUpdate,
  selectedCategories = [],
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const routeLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const firstFitDoneRef = useRef(false)

  // 🔧 獲取類別資料來做 ID/名稱轉換
  const { getCategoryById } = usePlaceCategories()

  // 最新回呼存 ref，避免 effect re-bind
  const onMapMoveRef = useRef(onMapMove)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  useEffect(() => { onMapMoveRef.current = onMapMove }, [onMapMove])
  useEffect(() => { onLocationUpdateRef.current = onLocationUpdate }, [onLocationUpdate])

  // 🔧 提取地點的所有類別名稱（與 MapSearchPage 保持一致）
  const extractCategoryNames = (p) => {
    const names = []
    
    // 基本類別欄位
    if (p?.category) {
      const cat = typeof p.category === 'string' ? p.category : p.category?.name
      if (cat) names.push(String(cat))
    }
    if (p?.categoryName) names.push(String(p.categoryName))
    
    // categories 陣列
    if (Array.isArray(p?.categories)) {
      p.categories.forEach(c => {
        if (typeof c === 'string' && c) {
          names.push(c)
        } else if (c?.name) {
          names.push(String(c.name))
        } else if (c?.label) {
          names.push(String(c.label))
        }
      })
    }
    
    // 其他可能的類別欄位
    if (p?.place_category?.name) names.push(String(p.place_category.name))
    if (Array.isArray(p?.place_categories)) {
      p.place_categories.forEach(c => {
        const name = typeof c === 'string' ? c : c?.name
        if (name) names.push(String(name))
      })
    }
    
    // 關聯表資料
    if (Array.isArray(p?.place_category_relations)) {
      p.place_category_relations.forEach(rel => {
        if (rel?.categories?.name) names.push(String(rel.categories.name))
        if (rel?.category?.name) names.push(String(rel.category.name))
      })
    }
    
    // 去重並過濾空值
    return [...new Set(names.filter(Boolean))]
  }

  // 🔧 根據選中的類別來決定標記顏色
  const getMarkerCategoryForDisplay = (place) => {
    const placeCategories = extractCategoryNames(place)
    console.log('🎨 地點類別檢查:', place.name, {
      placeCategories,
      selectedCategories
    })
    
    if (selectedCategories.length === 0) {
      // 沒有選中任何類別，使用地點的第一個類別
      return placeCategories[0] || '未分類'
    }
    
    // 將選中的類別（可能是 ID）轉換為名稱
    const selectedCategoryNames = selectedCategories.map((c) => {
      const num = Number(c)
      if (Number.isFinite(num)) {
        const category = getCategoryById(num)
        return category?.name || String(c)
      }
      return String(c)
    }).filter(Boolean)
    
    console.log('🎨 選中類別名稱:', selectedCategoryNames)
    
    // 找到地點類別中第一個匹配選中類別的
    for (const selectedName of selectedCategoryNames) {
      if (placeCategories.some(placeCat => String(placeCat) === String(selectedName))) {
        console.log('🎨 匹配到類別:', selectedName)
        return selectedName
      }
    }
    
    // 如果沒有匹配到，使用地點的第一個類別
    const fallbackCategory = placeCategories[0] || '未分類'
    console.log('🎨 使用預設類別:', fallbackCategory)
    return fallbackCategory
  }

  // 初始化地圖
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    console.log('🗺️ 初始化地圖...')
    
    const map = L.map(containerRef.current, {
      center: [25.033, 121.5654],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    })

    // 白色底圖（CartoDB Positron）
    const base = DEFAULT_MAP_STYLE
    L.tileLayer(base.url, { maxZoom: 19, attribution: base.attribution }).addTo(map)

    // 兩個 LayerGroup：一個放 pins、一個放路線
    const markers = L.layerGroup().addTo(map)
    const route = L.layerGroup().addTo(map)

    // 地圖移動事件：只在中心改變時回報
    let lastCenter = null
    const handleMoveEnd = () => {
      const c = map.getCenter()
      const now = { lat: c.lat, lng: c.lng }
      if (!lastCenter || !isSameLL(lastCenter, now)) {
        lastCenter = now
        onMapMoveRef.current?.(now)
      }
    }
    map.on('moveend', handleMoveEnd)

    // 對外提供清除路線
    window.clearCurrentRoute = () => {
      console.log('🗺️ 清除路線被呼叫')
      route.clearLayers()
    }

    mapRef.current = map
    markersLayerRef.current = markers
    routeLayerRef.current = route

    console.log('✅ 地圖初始化完成')

    return () => {
      console.log('🗺️ 清理地圖...')
      map.off('moveend', handleMoveEnd)
      map.remove()
      mapRef.current = null
      markersLayerRef.current = null
      routeLayerRef.current = null
      window.clearCurrentRoute = undefined
    }
  }, [])

  // 使用者定位：生成/更新小藍點
  const lastUserRef = useRef(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !userLocation) {
      console.log('🔵 跳過用戶位置更新:', { hasMap: !!map, hasUserLocation: !!userLocation })
      return
    }

    console.log('🔵 更新用戶位置:', userLocation)

    const loc = userLocation
    const icon = createUserLocationIcon()

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([loc.lat, loc.lng], { icon }).addTo(map)
      console.log('🔵 創建用戶位置標記')
    } else {
      userMarkerRef.current.setLatLng([loc.lat, loc.lng])
      console.log('🔵 更新用戶位置標記')
    }

    if (!lastUserRef.current || !isSameLL(lastUserRef.current, loc)) {
      lastUserRef.current = loc
      onLocationUpdateRef.current?.(loc)
      if (!firstFitDoneRef.current) {
        firstFitDoneRef.current = true
        map.setView([loc.lat, loc.lng], Math.max(map.getZoom(), 13), { animate: false })
        console.log('🔵 首次設定地圖中心到用戶位置')
      }
    }
  }, [userLocation])

  // 🔧 pins：根據選中類別決定標記顏色，並且依賴 selectedCategories
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return
    
    console.log('📍 更新地點標記:', places.length, '個地點，選中類別:', selectedCategories)
    layer.clearLayers()

    places.forEach((p, index) => {
      const lat = Number(p.latitude ?? p.lat)
      const lng = Number(p.longitude ?? p.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.log(`📍 跳過無效座標的地點 ${index}:`, p.name, { lat, lng })
        return
      }

      // 🔧 使用新的邏輯決定標記顏色
      const categoryForIcon = getMarkerCategoryForDisplay(p)
      console.log(`📍 地點 ${index + 1} "${p.name}" 使用類別:`, categoryForIcon)
      
      const icon = createCustomIcon(categoryForIcon)
      const m = L.marker([lat, lng], { icon })
      m.on('click', () => {
        console.log('📍 地點標記被點擊:', p.name)
        onPlaceSelect?.(p)
      })
      m.addTo(layer)
    })
    
    console.log('✅ 地點標記更新完成')
  }, [places, onPlaceSelect, selectedCategories, getCategoryById]) // 🔧 新增 selectedCategories 依賴

  // 選中的地點：聚焦
  const lastSelectedRef = useRef(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPlace) {
      console.log('🎯 跳過地點聚焦:', { hasMap: !!map, hasSelectedPlace: !!selectedPlace })
      return
    }
    
    const lat = Number(selectedPlace.latitude ?? selectedPlace.lat)
    const lng = Number(selectedPlace.longitude ?? selectedPlace.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log('🎯 選中地點座標無效:', { lat, lng })
      return
    }

    const loc = { lat, lng }
    if (!isSameLL(lastSelectedRef.current, loc)) {
      lastSelectedRef.current = loc
      map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true })
      console.log('🎯 地圖聚焦到選中地點:', selectedPlace.name, loc)
    }
  }, [selectedPlace])

  // 🔍 路線繪製：加強調試
  const lastRouteKeyRef = useRef('')
  useEffect(() => {
    console.log('🛣️ 路線繪製 Effect 觸發')
    console.log('- userLocation:', userLocation)
    console.log('- selectedPlace:', selectedPlace)
    console.log('- routeProfile:', routeProfile)
    
    const map = mapRef.current
    const routeLayer = routeLayerRef.current
    if (!map || !routeLayer) {
      console.log('❌ 地圖或路線圖層不存在:', { hasMap: !!map, hasRouteLayer: !!routeLayer })
      return
    }

    console.log('🛣️ 清除現有路線')
    routeLayer.clearLayers()

    const u = userLocation
    const s = selectedPlace
    const lat = Number(s?.latitude ?? s?.lat)
    const lng = Number(s?.longitude ?? s?.lng)

    console.log('🛣️ 處理座標:')
    console.log('- 用戶位置:', u)
    console.log('- 目的地原始:', s ? { latitude: s.latitude, lng: s.longitude, lat: s.lat } : null)
    console.log('- 目的地處理後:', { lat, lng })

    if (!u || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.log('❌ 座標資料不完整，無法繪製路線')
      console.log('- 有用戶位置:', !!u)
      console.log('- 目的地經度有效:', Number.isFinite(lng))
      console.log('- 目的地緯度有效:', Number.isFinite(lat))
      return
    }

    const key = `${u.lat},${u.lng}->${lat},${lng}:${routeProfile}`
    console.log('🛣️ 路線快取鍵:', key)
    console.log('🛣️ 上次路線鍵:', lastRouteKeyRef.current)
    
    if (lastRouteKeyRef.current === key) {
      console.log('🛣️ 路線已存在，跳過')
      return
    }
    
    lastRouteKeyRef.current = key

    const profile = routeProfile === 'walking' ? 'walking' : 'driving'
    const url = `https://router.project-osrm.org/route/v1/${profile}/${u.lng},${u.lat};${lng},${lat}?overview=full&geometries=geojson`

    console.log('🛣️ OSRM 請求 URL:', url)

    ;(async () => {
      try {
        console.log('🛣️ 開始 OSRM 請求...')
        const res = await fetch(url)
        console.log('🛣️ OSRM 回應狀態:', res.status, res.statusText)
        
        if (!res.ok) throw new Error(`OSRM ${res.status}`)
        
        const data = await res.json()
        console.log('🛣️ OSRM 回應資料:', data)
        
        const coords = data.routes?.[0]?.geometry?.coordinates
        console.log('🛣️ 路線座標:', coords?.length || 0, '個點')
        
        if (Array.isArray(coords) && coords.length) {
          const latlngs = coords.map(([x, y]) => [y, x])
          console.log('✅ 開始繪製路線...')
          console.log('- 起點:', latlngs[0])
          console.log('- 終點:', latlngs[latlngs.length - 1])
          
          const polyline = L.polyline(latlngs, { weight: 5, opacity: 0.9, color: '#EE5A36' })
          polyline.addTo(routeLayer)
          
          const bounds = L.latLngBounds(latlngs).pad(0.2)
          map.fitBounds(bounds)
          
          console.log('✅ 路線繪製完成並調整視野')
          return
        }
        throw new Error('no geometry')
      } catch (e) {
        console.error('❌ OSRM 請求失敗:', e.message)
        console.log('🛣️ 使用備用直線路線')
        
        // 失敗就畫直線 fallback
        const line = L.polyline(
          [
            [u.lat, u.lng],
            [lat, lng],
          ],
          { weight: 5, dashArray: '6,6', color: '#FF6B6B' }
        )
        line.addTo(routeLayer)
        map.fitBounds(line.getBounds().pad(0.2))
        
        console.log('✅ 備用直線路線繪製完成')
      }
    })()
  }, [userLocation, selectedPlace, routeProfile])

  // 🌍 暴露全局導航函數
  useEffect(() => {
    window.triggerNavigation = (profile = 'driving') => {
      console.log('🌍 全局導航函數被呼叫:', profile)
      
      const map = mapRef.current
      const routeLayer = routeLayerRef.current
      const u = userLocation
      const s = selectedPlace
      
      if (!map || !routeLayer || !u || !s) {
        console.log('❌ 導航條件不足:', {
          hasMap: !!map,
          hasRouteLayer: !!routeLayer,
          hasUser: !!u,
          hasSelected: !!s
        })
        return
      }
      
      const lat = Number(s.latitude ?? s.lat)
      const lng = Number(s.longitude ?? s.lng)
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        console.log('❌ 目的地座標無效:', { lat, lng })
        return
      }
      
      console.log('🛣️ 開始繪製路線...')
      console.log('- 用戶位置:', u)
      console.log('- 目的地:', { lat, lng })
      console.log('- 路線模式:', profile)
      
      routeLayer.clearLayers()
      
      const profileType = profile === 'walking' ? 'walking' : 'driving'
      const url = `https://router.project-osrm.org/route/v1/${profileType}/${u.lng},${u.lat};${lng},${lat}?overview=full&geometries=geojson`
      
      console.log('🌍 OSRM URL:', url)
      
      // 使用測試成功的邏輯
      fetch(url)
        .then(res => {
          console.log('📡 回應狀態:', res.status)
          if (!res.ok) throw new Error(`OSRM ${res.status}`)
          return res.json()
        })
        .then(data => {
          console.log('📊 OSRM 資料:', data)
          const coords = data.routes?.[0]?.geometry?.coordinates
          if (Array.isArray(coords) && coords.length) {
            const latlngs = coords.map(([x, y]) => [y, x])
            console.log('✅ 繪製路線，共', latlngs.length, '個點')
            
            const polyline = L.polyline(latlngs, { 
              weight: 5, 
              opacity: 0.9, 
              color: profile === 'walking' ? '#4CAF50' : '#EE5A36',
              lineCap: 'round',
              lineJoin: 'round'
            })
            polyline.addTo(routeLayer)
            
            map.fitBounds(L.latLngBounds(latlngs).pad(0.1))
            console.log('✅ 路線繪製完成!')
            
            // 添加路線信息
            const route = data.routes[0]
            const distance = (route.distance / 1000).toFixed(1)
            const duration = Math.round(route.duration / 60)
            console.log(`📏 路線資訊: ${distance}km, ${duration}分鐘`)
          }
        })
        .catch(e => {
          console.error('❌ 路線繪製失敗:', e)
          // 顯示直線備用路線
          const line = L.polyline(
            [[u.lat, u.lng], [lat, lng]],
            { 
              weight: 5, 
              dashArray: '8,4', 
              color: '#FF6B6B',
              opacity: 0.8
            }
          )
          line.addTo(routeLayer)
          map.fitBounds(line.getBounds().pad(0.2))
          console.log('✅ 備用直線路線顯示完成')
        })
    }
    
    return () => {
      window.triggerNavigation = undefined
    }
  }, [userLocation, selectedPlace])

  return <div ref={containerRef} className="w-full h-full" />
}