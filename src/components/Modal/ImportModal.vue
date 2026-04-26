<script setup>
import { ref } from 'vue'
import { getCommands, getCategories, addCommand, addCategory, exportDatabaseFile, importDatabaseFile, clearAllData } from '../../utils/database.js'
import { exportToExcel, parseExcelFile } from '../../utils/excel.js'

const emit = defineEmits(['close', 'refresh', 'toast'])

const importMode = ref('excel')  // 'excel' | 'db'
const exportMode = ref('excel')  // 'excel' | 'db'

// 导入 Excel
async function handleImportExcel(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await parseExcelFile(file)
    const categories = getCategories()
    const categoryMap = new Map(categories.map(c => [c.name, c.id]))

    data.forEach(row => {
      let categoryId = null
      if (row['分类']) {
        if (categoryMap.has(row['分类'])) {
          categoryId = categoryMap.get(row['分类'])
        } else {
          const newId = addCategory(row['分类'])
          categoryMap.set(row['分类'], newId)
          categoryId = newId
        }
      }
      addCommand(
        row['名称'] || '',
        row['命令'] || '',
        categoryId,
        row['描述'] || '',
        row['标签'] || ''
      )
    })
    emit('toast', `成功导入 ${data.length} 条命令`)
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

// 清空数据
function handleClearAll() {
  if (confirm('确定清空所有数据？此操作不可恢复！')) {
    clearAllData()
    emit('toast', '数据已清空')
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
            支持 .xlsx/.xls 格式，字段：名称、命令、分类、描述、标签
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
        <button class="btn text-error hover:bg-error/10 w-full" @click="handleClearAll">
          清空所有数据
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