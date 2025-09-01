// components/map/navigation-card.js - 修正版本

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import NavigationCardUI from '../card/navigation-card-ui'
import { usePlaceData } from '@/app/map/_components/hooks/use-placedata'
import { usePlacePhotos } from '@/app/map/_components/hooks/use-photodata'
import { useNavigationData } from '@/app/map/_components/hooks/use-navigationdata'

// 取主圖（容忍 is_main / isMain / '1' / 'true'）
function pickMainPhoto(photos) {
  if (!Array.isArray(photos) || photos.length === 0) return null
  const isTrue = (v) => v === true || v === 1 || v === '1' || v === 'true'
  const main = photos.find(
    (p) => isTrue(p?.is_main) || isTrue(p?.isMain) || isTrue(p?.is_main_photo)
  )
  if (main?.url) return main
  const first = photos.find((p) => !!p?.url)
  return first || null
}

// 類別正規化為「字串陣列」
function normalizeCategories(data) {
  if (!data) return []
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    return data.categories
      .map((c) => (typeof c === 'string' ? c : c?.name || c?.label || ''))
      .filter(Boolean)
  }
  if (data.category) {
    return [
      typeof data.category === 'string'
        ? data.category
        : data.category.name || data.category.label || '',
    ].filter(Boolean)
  }
  return []
}

export default function NavigationCard({
  // 資料來源：擇一提供即可，兩者同時提供以 place 優先
  place,
  placeId,

  // 導航相關
  userLocation, // { latitude, longitude }
  routeProfile = 'driving', // 'driving' | 'walking' | ...
  onNavigate, // 外層監聽導航開始

  // UI
  onClose,
  className,
}) {
  const [selectedProfile, setSelectedProfile] = useState(routeProfile)
  const [isNavigationActive, setIsNavigationActive] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const actualPlaceId = place?.id ?? placeId ?? null

  // 若外面沒給 place，才去抓
  const { place: placeData, isLoading: isLoadingPlace } = usePlaceData(
    actualPlaceId && !place ? actualPlaceId : null
  )

  // 合併顯示資料（外部 place 優先，缺的用 hook 補）
  const displayData = useMemo(
    () => ({ ...placeData, ...place }),
    [placeData, place]
  )

  // 主圖來源：displayData.photos → usePlacePhotos → displayData.imageUrl → fallback
  const hasPhotoInData =
    !!pickMainPhoto(displayData?.photos)?.url || !!displayData?.imageUrl
  const { mainPhoto, isLoading: isLoadingPhoto } = usePlacePhotos(
    !hasPhotoInData && actualPlaceId ? actualPlaceId : null
  )

  const imageUrl = useMemo(() => {
    const picked = pickMainPhoto(displayData?.photos)
    if (picked?.url) return picked.url
    if (mainPhoto?.url) return mainPhoto.url
    if (displayData?.imageUrl) return displayData.imageUrl
    return 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=400&fit=crop&auto=format'
  }, [displayData?.photos, displayData?.imageUrl, mainPhoto?.url])

  const categories = useMemo(
    () => normalizeCategories(displayData),
    [displayData]
  )
  const primaryCategory = categories[0] || null

  // 路線資料
  const {
    routeInfo,
    isLoading: isLoadingRoute,
    error: routeError,
    fetchRoute,
  } = useNavigationData()

  const canRoute =
    !!userLocation?.latitude &&
    !!userLocation?.longitude &&
    !!displayData?.latitude &&
    !!displayData?.longitude

  const handleClose = () => {
    console.log('🚪 關閉導航卡片')
    setIsClosing(true)
    setIsNavigationActive(false)
    
    // 🔧 修正：使用我們的全局清除函數
    if (window.clearCurrentRoute) {
      window.clearCurrentRoute()
    }
    
    setTimeout(() => onClose?.(), 250)
  }

  const handleStartNavigation = async (profile) => {
    console.log('🚀 開始導航:', profile)
    console.log('📍 目的地資料:', displayData)
    
    setSelectedProfile(profile)
    setIsNavigationActive(true)
    onNavigate?.({ profile, place: displayData })

    // 🔧 修正：使用我們的全局導航函數
    if (window.triggerNavigation) {
      console.log('🗺️ 觸發地圖導航')
      window.triggerNavigation(profile)
    } else {
      console.error('❌ 全局導航函數不存在')
    }

    // 可選：仍然使用 hook 獲取路線資訊（用於顯示距離、時間等）
    if (canRoute) {
      try {
        console.log('📊 獲取路線資訊...')
        await fetchRoute?.({
          from: { lat: userLocation.latitude, lng: userLocation.longitude },
          to: {
            lat: Number(displayData.latitude),
            lng: Number(displayData.longitude),
          },
          profile,
        })
      } catch (err) {
        console.error('❌ 獲取路線資料失敗:', err)
      }
    }
  }

  const handleNavigationModeChange = async (profile) => {
    if (!isNavigationActive) return
    
    console.log('🔄 切換導航模式:', profile)
    setSelectedProfile(profile)

    // 🔧 修正：使用我們的全局導航函數
    if (window.triggerNavigation) {
      console.log('🗺️ 重新觸發地圖導航')
      window.triggerNavigation(profile)
    } else {
      console.error('❌ 全局導航函數不存在')
    }

    // 可選：重新獲取路線資訊
    if (canRoute) {
      try {
        await fetchRoute?.({
          from: { lat: userLocation.latitude, lng: userLocation.longitude },
          to: {
            lat: Number(displayData.latitude),
            lng: Number(displayData.longitude),
          },
          profile,
        })
      } catch (err) {
        console.error('❌ 重新獲取路線資料失敗:', err)
      }
    }
  }

  const handleEndNavigation = () => {
    console.log('🛑 結束導航')
    setIsNavigationActive(false)
    
    // 🔧 修正：使用我們的全局清除函數
    if (window.clearCurrentRoute) {
      window.clearCurrentRoute()
    }
    
    handleClose()
  }

  const handleExternalNavigation = () => {
    console.log('🌐 開啟外部導航')
    
    if (!displayData?.latitude || !displayData?.longitude) {
      alert('此地點沒有座標資訊')
      return
    }
    
    const mode = selectedProfile === 'walking' ? 'walking' : 'driving'
    const url = `https://www.google.com/maps/dir/?api=1&destination=${displayData.latitude},${displayData.longitude}&travelmode=${mode}`
    console.log('🌐 Google Maps URL:', url)
    
    window.open(url, '_blank')
  }

  // 保持外部 routeProfile 同步
  useEffect(() => {
    if (routeProfile !== selectedProfile) {
      console.log('🔄 同步路線模式:', routeProfile)
      setSelectedProfile(routeProfile)
    }
  }, [routeProfile, selectedProfile])

  // 卸載清理
  useEffect(() => () => {
    console.log('🧹 NavigationCard 卸載清理')
    if (window.clearCurrentRoute) {
      window.clearCurrentRoute()
    }
  }, [])

  const isLoading = (isLoadingPlace || isLoadingPhoto) && !place

  console.log('🎯 NavigationCard 渲染狀態:', {
    displayData: displayData?.name,
    selectedProfile,
    isNavigationActive,
    canRoute,
    hasGlobalFunction: !!window.triggerNavigation
  })

  return (
    <NavigationCardUI
      // 地點資料
      title={displayData?.name}
      imageUrl={imageUrl}
      imageAlt={`${displayData?.name || '地點'}的圖片`}
      rating={displayData?.rating}
      district={displayData?.district}
      address={displayData?.address}
      placeId={actualPlaceId}
      // 分類（交給 UI 呈現）
      categories={categories}
      primaryCategory={primaryCategory}
      // 路線狀態
      selectedProfile={selectedProfile}
      routeInfo={routeInfo}
      routeError={routeError}
      isLoadingRoute={isLoadingRoute}
      isNavigationActive={isNavigationActive}
      isClosing={isClosing}
      // 事件
      onClose={handleClose}
      onStartNavigation={handleStartNavigation}
      onNavigationModeChange={handleNavigationModeChange}
      onEndNavigation={handleEndNavigation}
      onExternalNavigation={handleExternalNavigation}
      // UI
      className={className}
      isLoading={isLoading}
    />
  )
}