<script setup>
import { ref } from 'vue'
import { getCommands, getCategories, getAllCategories, addCommand, addCategory, findCategoryByName, exportDatabaseFile, importDatabaseFile, restoreDefaultData, clearAllData } from '../../utils/database.js'
import { exportToExcel, parseExcelFile, parseRowData, STANDARD_FIELDS } from '../../utils/excel.js'

const emit = defineEmits(['close', 'refresh', 'toast'])

const importMode = ref('excel')  // 'excel' | 'db'
const exportMode = ref('excel')  // 'excel' | 'db'

// 预定义的一级分类颜色
const categoryColors = [
  '#0F7B6C', '#E03E3E', '#14B8A6', '#7C3AED', '#EC4899', '#F59E0B', '#3B82F6', '#10B981'
]

// 生成随机颜色
function getRandomColor(usedColors) {
  const available = categoryColors.filter(c => !usedColors.includes(c))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]
  }
  // 如果预定义颜色都用完了，生成随机颜色
  const r = Math.floor(Math.random() * 128 + 64)
  const g = Math.floor(Math.random() * 128 + 64)
  const b = Math.floor(Math.random() * 128 + 64)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// 颜色渐变函数（按索引调整亮度，形成渐变）
function gradientColor(hex, index) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // 从原色到浅色渐变，亮度递增
  const factor = 0.2 + index * 0.15 // 每个递增15%，从20%开始
  const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * factor))
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
}

// 导入 Excel（支持二级分类和架构）
async function handleImportExcel(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await parseExcelFile(file)
    const allCategories = getAllCategories()

    // 构建分类映射：key 为 "一级分类/二级分类" 或 "一级分类"
    const categoryMap = new Map()
    // 存储一级分类的颜色，用于二级分类继承
    const parentColorMap = new Map()
    // 记录已使用的颜色
    const usedColors = []
    // 记录每个一级分类下已创建的二级分类数量（用于渐变）
    const parentChildIndexMap = new Map()

    allCategories.forEach(c => {
      if (c.parentId === null) {
        // 一级分类
        categoryMap.set(c.name.trim(), c.id)
        categoryMap.set(c.name.trim().toLowerCase(), c.id)
        parentColorMap.set(c.id, c.color)
        usedColors.push(c.color)
        parentChildIndexMap.set(c.id, 0) // 初始化二级分类计数
      } else {
        // 二级分类，找到父分类名
        const parent = allCategories.find(p => p.id === c.parentId)
        if (parent) {
          const key = `${parent.name.trim()}/${c.name.trim()}`
          categoryMap.set(key, c.id)
          categoryMap.set(key.toLowerCase(), c.id)
          // 增加父分类的二级分类计数
          const count = parentChildIndexMap.get(c.parentId) || 0
          parentChildIndexMap.set(c.parentId, count + 1)
        }
      }
    })

    let importedCount = 0
    data.forEach(row => {
      // 使用 parseRowData 解析行数据（支持扩展字段）
      const parsed = parseRowData(row)
      const { parentCategoryName, categoryName, name, content, centralizedContent, distributedContent, description, tags, extraFields } = parsed

      // 处理分类
      let categoryId = null

      if (categoryName) {
        // 有二级分类
        const key = `${parentCategoryName}/${categoryName}`
        const lowerKey = key.toLowerCase()

        if (categoryMap.has(key)) {
          categoryId = categoryMap.get(key)
        } else if (categoryMap.has(lowerKey)) {
          categoryId = categoryMap.get(lowerKey)
        } else {
          // 需要创建二级分类，先确保一级分类存在
          let parentId = null

          if (parentCategoryName) {
            if (categoryMap.has(parentCategoryName)) {
              parentId = categoryMap.get(parentCategoryName)
            } else if (categoryMap.has(parentCategoryName.toLowerCase())) {
              parentId = categoryMap.get(parentCategoryName.toLowerCase())
            } else {
              // 创建一级分类，分配随机颜色
              const parentColor = getRandomColor(usedColors)
              parentId = addCategory(parentCategoryName, parentColor)
              categoryMap.set(parentCategoryName, parentId)
              categoryMap.set(parentCategoryName.toLowerCase(), parentId)
              parentColorMap.set(parentId, parentColor)
              parentChildIndexMap.set(parentId, 0) // 初始化二级分类计数
              usedColors.push(parentColor)
            }
          }

          // 创建二级分类，使用渐变颜色
          const parentColor = parentColorMap.get(parentId) || '#0066CC'
          const childIndex = parentChildIndexMap.get(parentId) || 0
          const childColor = gradientColor(parentColor, childIndex)
          categoryId = addCategory(categoryName, childColor, parentId)
          parentChildIndexMap.set(parentId, childIndex + 1) // 更新计数
          categoryMap.set(key, categoryId)
          categoryMap.set(lowerKey, categoryId)
        }
      } else if (parentCategoryName) {
        // 只有一级分类
        if (categoryMap.has(parentCategoryName)) {
          categoryId = categoryMap.get(parentCategoryName)
        } else if (categoryMap.has(parentCategoryName.toLowerCase())) {
          categoryId = categoryMap.get(parentCategoryName.toLowerCase())
        } else {
          // 创建一级分类，分配随机颜色
          const parentColor = getRandomColor(usedColors)
          categoryId = addCategory(parentCategoryName, parentColor)
          categoryMap.set(parentCategoryName, categoryId)
          categoryMap.set(parentCategoryName.toLowerCase(), categoryId)
          parentColorMap.set(categoryId, parentColor)
          parentChildIndexMap.set(categoryId, 0) // 初始化二级分类计数
          usedColors.push(parentColor)
        }
      }

      // 创建命令（支持扩展字段）
      if (name && (content || centralizedContent || distributedContent)) {
        addCommand(
          name,
          content,
          categoryId,
          description,
          tags,
          centralizedContent,
          distributedContent,
          extraFields
        )
        importedCount++
      }
    })

    emit('toast', `成功导入 ${importedCount} 条命令`)
    emit('refresh')
    emit('close')
  } catch (e) {
    emit('toast', '导入失败：' + e.message, 'error')
  }
}

// 导出 Excel
function handleExportExcel() {
  const commands = getCommands()
  exportToExcel(commands)
  emit('toast', '导出成功')
}

// 导入数据库文件
async function handleImportDb(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    await importDatabaseFile(file)
    emit('toast', '数据库导入成功')
    emit('refresh')
    emit('close')
  } catch (e) {
    emit('toast', '导入失败：' + e.message, 'error')
  }
}

// 导出数据库文件
function handleExportDb() {
  const blob = exportDatabaseFile()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'quick_commands.db'
  a.click()
  URL.revokeObjectURL(url)
  emit('toast', '数据库导出成功')
}

// 恢复默认数据
function handleRestoreDefault() {
  if (confirm('确定恢复默认数据？当前所有数据将被删除并恢复为初始测试数据！')) {
    restoreDefaultData()
    emit('toast', '已恢复默认数据')
    emit('refresh')
  }
}

// 清空所有数据
function handleClearAll() {
  if (confirm('确定清空所有数据？此操作不可恢复！')) {
    clearAllData()
    emit('toast', '已清空所有数据')
    emit('refresh')
  }
}

// 关闭
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-lg mx-4 overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 class="text-lg font-semibold">📦 数据管理</h2>
        <button class="text-secondary hover:text-primary text-xl" @click="handleClose">×</button>
      </div>

      <!-- Content -->
      <div class="p-5 space-y-5">
        <!-- Import Section -->
        <div class="bg-bg-secondary rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">📥</span>
            <h3 class="font-medium">导入数据</h3>
          </div>
          <div class="flex gap-2 mb-3">
            <button
              class="btn flex-1"
              :class="importMode === 'excel' ? 'btn-primary' : 'btn-secondary'"
              @click="importMode = 'excel'"
            >
              📊 Excel
            </button>
            <button
              class="btn flex-1"
              :class="importMode === 'db' ? 'btn-primary' : 'btn-secondary'"
              @click="importMode = 'db'"
            >
              🗄️ 数据库
            </button>
          </div>

          <div v-if="importMode === 'excel'" class="space-y-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              class="input"
              @change="handleImportExcel"
            />
            <p class="text-secondary text-xs">
              支持 .xlsx/.xls 格式，包含：一级分类、二级分类、名称、通用/集中式/分布式命令等
            </p>
          </div>

          <div v-else class="space-y-2">
            <input
              type="file"
              accept=".db"
              class="input"
              @change="handleImportDb"
            />
            <p class="text-secondary text-xs">
              支持 .db SQLite 数据库文件，导入后将覆盖当前数据
            </p>
          </div>
        </div>

        <!-- Export Section -->
        <div class="bg-bg-secondary rounded-lg p-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-lg">📤</span>
            <h3 class="font-medium">导出数据</h3>
          </div>
          <div class="flex gap-2 mb-3">
            <button
              class="btn flex-1"
              :class="exportMode === 'excel' ? 'btn-primary' : 'btn-secondary'"
              @click="exportMode = 'excel'"
            >
              📊 Excel
            </button>
            <button
              class="btn flex-1"
              :class="exportMode === 'db' ? 'btn-primary' : 'btn-secondary'"
              @click="exportMode = 'db'"
            >
              🗄️ 数据库
            </button>
          </div>

          <button
            v-if="exportMode === 'excel'"
            class="btn btn-primary w-full"
            @click="handleExportExcel"
          >
            ⬇️ 导出为 Excel 文件
          </button>

          <button
            v-else
            class="btn btn-primary w-full"
            @click="handleExportDb"
          >
            ⬇️ 导出为数据库文件
          </button>
        </div>

        <!-- Data Operations -->
        <div class="flex gap-3">
          <button
            class="btn flex-1 border border-error/30 text-error hover:bg-error/10"
            @click="handleClearAll"
          >
            🗑️ 清空数据
          </button>
          <button
            class="btn flex-1 border border-secondary/30 text-secondary hover:bg-secondary/10"
            @click="handleRestoreDefault"
          >
            🔄 恢复默认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>