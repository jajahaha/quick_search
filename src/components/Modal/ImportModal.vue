<script setup>
import { ref } from 'vue'
import { getCommands, getCategories, getAllCategories, addCommand, addCategory, findCategoryByName, exportDatabaseFile, importDatabaseFile, restoreDefaultData } from '../../utils/database.js'
import { exportToExcel, parseExcelFile } from '../../utils/excel.js'

const emit = defineEmits(['close', 'refresh', 'toast'])

const importMode = ref('excel')  // 'excel' | 'db'
const exportMode = ref('excel')  // 'excel' | 'db'

// 导入 Excel（支持二级分类和架构）
async function handleImportExcel(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await parseExcelFile(file)
    const allCategories = getAllCategories()

    // 构建分类映射：key 为 "一级分类/二级分类" 或 "一级分类"
    const categoryMap = new Map()
    allCategories.forEach(c => {
      if (c.parentId === null) {
        // 一级分类
        categoryMap.set(c.name.trim(), c.id)
        categoryMap.set(c.name.trim().toLowerCase(), c.id)
      } else {
        // 二级分类，找到父分类名
        const parent = allCategories.find(p => p.id === c.parentId)
        if (parent) {
          const key = `${parent.name.trim()}/${c.name.trim()}`
          categoryMap.set(key, c.id)
          categoryMap.set(key.toLowerCase(), c.id)
        }
      }
    })

    let importedCount = 0
    data.forEach(row => {
      const parentCategoryName = row['一级分类'] ? row['一级分类'].trim() : ''
      const childCategoryName = row['二级分类'] ? row['二级分类'].trim() : ''
      const commandName = row['名称'] ? row['名称'].trim() : ''
      // 支持新旧格式：通用命令 或 命令
      const commonContent = row['通用命令'] ? row['通用命令'].trim() : (row['命令'] ? row['命令'].trim() : '')
      const centralizedContent = row['集中式命令'] ? row['集中式命令'].trim() : ''
      const distributedContent = row['分布式命令'] ? row['分布式命令'].trim() : ''

      // 处理分类
      let categoryId = null

      if (childCategoryName) {
        // 有二级分类
        const key = `${parentCategoryName}/${childCategoryName}`
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
              // 创建一级分类
              parentId = addCategory(parentCategoryName)
              categoryMap.set(parentCategoryName, parentId)
              categoryMap.set(parentCategoryName.toLowerCase(), parentId)
            }
          }

          // 创建二级分类
          categoryId = addCategory(childCategoryName, '#0066CC', parentId)
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
          // 创建一级分类
          categoryId = addCategory(parentCategoryName)
          categoryMap.set(parentCategoryName, categoryId)
          categoryMap.set(parentCategoryName.toLowerCase(), categoryId)
        }
      }

      // 创建命令
      if (commandName && (commonContent || centralizedContent || distributedContent)) {
        addCommand(
          commandName,
          commonContent,
          categoryId,
          row['描述'] ? row['描述'].trim() : '',
          row['标签'] ? row['标签'].trim() : '',
          centralizedContent,
          distributedContent
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

// 关闭
function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-md mx-4 p-6">
      <h2 class="text-lg font-semibold mb-4">导入/导出数据</h2>

      <!-- Import Section -->
      <div class="mb-6">
        <h3 class="font-medium mb-2">导入</h3>
        <div class="flex gap-2 mb-2">
          <button
            class="btn"
            :class="importMode === 'excel' ? 'btn-primary' : 'btn-secondary'"
            @click="importMode = 'excel'"
          >
            Excel
          </button>
          <button
            class="btn"
            :class="importMode === 'db' ? 'btn-primary' : 'btn-secondary'"
            @click="importMode = 'db'"
          >
            数据库
          </button>
        </div>

        <div v-if="importMode === 'excel'">
          <input
            type="file"
            accept=".xlsx,.xls"
            class="input"
            @change="handleImportExcel"
          />
          <p class="text-secondary text-xs mt-1">
            支持 .xlsx/.xls 格式，字段：一级分类、二级分类、名称、通用命令、集中式命令、分布式命令、描述、标签
          </p>
        </div>

        <div v-else>
          <input
            type="file"
            accept=".db"
            class="input"
            @change="handleImportDb"
          />
          <p class="text-secondary text-xs mt-1">
            支持 .db SQLite 数据库文件，将覆盖当前数据
          </p>
        </div>
      </div>

      <!-- Export Section -->
      <div class="mb-6">
        <h3 class="font-medium mb-2">导出</h3>
        <div class="flex gap-2 mb-2">
          <button
            class="btn"
            :class="exportMode === 'excel' ? 'btn-primary' : 'btn-secondary'"
            @click="exportMode = 'excel'"
          >
            Excel
          </button>
          <button
            class="btn"
            :class="exportMode === 'db' ? 'btn-primary' : 'btn-secondary'"
            @click="exportMode = 'db'"
          >
            数据库
          </button>
        </div>

        <button
          v-if="exportMode === 'excel'"
          class="btn btn-primary w-full"
          @click="handleExportExcel"
        >
          导出为 Excel 文件
        </button>

        <button
          v-else
          class="btn btn-primary w-full"
          @click="handleExportDb"
        >
          导出为数据库文件
        </button>
      </div>

      <!-- Clear Data -->
      <div class="border-t border-border pt-4">
        <button class="btn text-error hover:bg-error/10 w-full" @click="handleRestoreDefault">
          恢复默认数据
        </button>
      </div>

      <!-- Close Button -->
      <div class="mt-4 flex justify-end">
        <button class="btn btn-secondary" @click="handleClose">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>