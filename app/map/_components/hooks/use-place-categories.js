// hooks/use-place-categories.js
'use client'

import { useState, useEffect, useCallback } from 'react'
import { serverURL } from '@/config'

const DEBUG = false
const dlog = (...args) => { if (DEBUG) console.log(...args) }

export function usePlaceCategories() {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const url = `${serverURL}/api/map/categories`
      
      console.log('🏷️ 正在請求分類資料:', url)
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 添加錯誤處理的超時
        signal: AbortSignal.timeout(10000), // 10秒超時
      })
      
      console.log('🏷️ 回應狀態:', res.status, res.statusText)
      
      if (!res.ok) {
        throw new Error(`載入分類失敗: ${res.status} ${res.statusText}`)
      }
      
      const data = await res.json()
      console.log('🏷️ API 完整回應:', data)
      
      if (data.status === 'success') {
        // 🔥 修正：處理不同的回應格式
        const categoriesData = data.categories || data.data || []
        
        console.log('🏷️ 提取的分類資料:', categoriesData)
        
        if (Array.isArray(categoriesData)) {
          // 確保資料格式正確，添加預設值
          const formattedCategories = categoriesData.map(category => ({
            id: category.id,
            name: category.name,
            color: category.color || '#6B7280', // 預設灰色
            icon: category.icon || null,
            pin_color: category.pin_color || category.color || '#6B7280',
            created_at: category.created_at,
            updated_at: category.updated_at
          }))
          
          setCategories(formattedCategories)
          console.log('✅ 成功載入分類:', formattedCategories.length, '個')
          console.log('🏷️ 格式化後的分類:', formattedCategories)
        } else {
          throw new Error('分類資料不是陣列格式')
        }
      } else {
        throw new Error(data.message || '載入分類失敗')
      }
    } catch (err) {
      console.error('❌ 載入分類失敗:', err)
      
      if (err.name === 'AbortError') {
        setError('請求超時，請重試')
      } else if (err.message.includes('Failed to fetch')) {
        setError('無法連接到伺服器，請檢查網路連線')
      } else if (err.message.includes('404')) {
        setError('找不到分類 API 路由，請檢查後端設定')
      } else {
        setError(err.message || '載入分類失敗')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // 根據 ID 取得分類資訊的輔助函數
  const getCategoryById = useCallback((id) => {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    return categories.find(category => category.id === numericId)
  }, [categories])

  // 根據名稱取得分類資訊的輔助函數
  const getCategoryByName = useCallback((name) => {
    return categories.find(category => category.name === name)
  }, [categories])

  // 🔥 新增：檢查路由是否正確的測試函數
  const testCategoriesAPI = useCallback(async () => {
    try {      
      // 測試不同可能的路由
      const possibleRoutes = [
        '/api/map/categories',
        '/api/categories', 
        '/categories',
        '/api/map/stats', // 有時候統計 API 也會包含分類資料
      ]
      
      for (const route of possibleRoutes) {
        try {
          console.log(`🧪 測試路由: ${serverURL}${route}`)
          const res = await fetch(`${serverURL}${route}`)
          console.log(`📊 ${route} 回應狀態:`, res.status)
          
          if (res.ok) {
            const data = await res.json()
            console.log(`✅ ${route} 可用，回應:`, data)
          }
        } catch (err) {
          console.log(`❌ ${route} 失敗:`, err.message)
        }
      }
    } catch (err) {
      console.error('測試 API 路由失敗:', err)
    }
  }, [])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
    getCategoryById,
    getCategoryByName,
    testCategoriesAPI, // 🔥 用於除錯的函數
  }
}