// app/map/_components/btn/category-button.js (透明背景版)
'use client'

import React from 'react'
import { usePlaceCategories } from '@/app/map/_components/hooks/use-place-categories'

function OneCategoryButton({ category, pressed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        h-[24px] sm:h-[28px] lg:h-[32px]
        px-[6px] lg:px-[8px]
        rounded-[20px]
        font-medium
        text-[10px] sm:text-xs lg:text-sm
        transition-all duration-200 hover:opacity-90
        flex items-center justify-center gap-1.5
        ${
          pressed
            ? 'bg-gray-100 text-[#3E2E2E] border border-gray-300'
            : 'bg-gray-100 text-[#3E2E2E] border border-gray-300'
        }
      `}
      aria-pressed={pressed}
      aria-label={`${pressed ? '取消篩選' : '篩選'} ${category.name}`}
    >
      {pressed && (
        <span
          className="inline-block rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: category.color || '#fff',
          }}
          aria-hidden="true"
        />
      )}
      <span className="whitespace-nowrap">{category.name}</span>
    </button>
  )
}

export default function CategoryFilterButtons({
  selectedCategories = [],
  onCategoryToggle,
  className = '',
}) {
  const { categories, isLoading, error } = usePlaceCategories()

  const handleCategoryClick = (categoryId) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId]

    onCategoryToggle?.(newCategories)

    if (process.env.NODE_ENV === 'development') {
      const clickedCategory = categories.find((cat) => cat.id === categoryId)
      console.log('🏷️ 分類篩選更新:', {
        clickedCategory: clickedCategory?.name,
        clickedCategoryId: categoryId,
        oldCategories: selectedCategories,
        newCategories: newCategories,
      })
    }
  }

  // 載入中狀態
  if (isLoading) {
    return (
      <div className={`flex gap-2 flex-wrap ${className}`}>
        <div className="text-blue-500 text-sm flex items-center gap-2 bg-transparent">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          載入分類中...
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div className={`text-red-500 text-sm bg-transparent ${className}`}>
        載入分類失敗: {error}
      </div>
    )
  }

  // 無資料
  if (!categories || categories.length === 0) {
    return (
      <div className={`text-gray-500 text-sm bg-transparent ${className}`}>
        沒有可用的分類
      </div>
    )
  }

  // 正常顯示
  return (
    <div
      className={`flex gap-2 flex-wrap bg-transparent ${className}`}
      role="group"
      aria-label="地點分類篩選"
    >
      {/* 分類按鈕 */}
      {categories.map((category) => (
        <OneCategoryButton
          key={category.id}
          category={category}
          pressed={selectedCategories.includes(category.id)}
          onClick={() => handleCategoryClick(category.id)}
        />
      ))}
    </div>
  )
}
