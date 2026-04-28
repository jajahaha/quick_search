<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { getCommands, getAllCategories, addCategory, batchReplaceCommands } from '../../utils/database.js'

const emit = defineEmits(['close', 'refresh', 'toast'])

// 本地编辑数据
const localData = ref([])

// 所有分类（扁平列表）
const allCategories = ref([])

// 一级分类列表
const parentCategories = computed(() => {
  return allCategories.value.filter(c => c.parentId === null)
})

// 分类名称映射（用于查找ID）
const categoryMap = computed(() => {
  const map = {}
  allCategories.value.forEach(c => {
    if (c.parentId === null) {
      map[c.name] = c.id
    } else {
      const parent = allCategories.value.find(p => p.id === c.parentId)
      if (parent) {
        map[`${parent.name}/${c.name}`] = c.id
      }
    }
  })
  return map
})

// 预定义的一级分类颜色
const categoryColors = [
  '#0F7B6C', '#E03E3E', '#14B8A6', '#7C3AED', '#EC4899', '#F59E0B', '#3B82F6', '#10B981'
]

function getRandomColor(usedColors) {
  const available = categoryColors.filter(c => !usedColors.includes(c))
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)]
  const r = Math.floor(Math.random() * 128 + 64)
  const g = Math.floor(Math.random() * 128 + 64)
  const b = Math.floor(Math.random() * 128 + 64)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function gradientColor(hex, index) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const factor = 0.2 + index * 0.15
  const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * factor))
  return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`
}

// 创建空行
function createEmptyRow() {
  return {
    id: null,
    parentCategoryName: '',
    categoryName: '',
    name: '',
    content: '',
    centralizedContent: '',
    distributedContent: '',
    description: '',
    tags: ''
  }
}

// 加载数据
function loadData() {
  const commands = getCommands()
  localData.value = commands.map(cmd => ({
    id: cmd.id,
    parentCategoryName: cmd.parentCategoryName || '',
    categoryName: cmd.categoryName || '',
    name: cmd.name,
    content: cmd.content || '',
    centralizedContent: cmd.centralizedContent || '',
    distributedContent: cmd.distributedContent || '',
    description: cmd.description || '',
    tags: cmd.tags || ''
  }))
  // 添加一个空行在末尾
  localData.value.push(createEmptyRow())
  allCategories.value = getAllCategories()
}

// 当一级分类改变时
function onParentCategoryChange(row) {
  // 可以保持二级分类，或者清空
}

// 检查最后一行是否有内容，如果有则添加新空行
function checkAndAddRow() {
  const lastRow = localData.value[localData.value.length - 1]
  if (lastRow && (lastRow.name.trim() || lastRow.content.trim() || lastRow.centralizedContent.trim() || lastRow.distributedContent.trim())) {
    localData.value.push(createEmptyRow())
  }
}

// 监听输入变化，自动添加新行
function onInputChange(row) {
  checkAndAddRow()
}

// 批量添加多行
function addMultipleRows(count) {
  for (let i = 0; i < count; i++) {
    localData.value.push(createEmptyRow())
  }
}

// 删除行
function deleteRow(index) {
  // 不允许删除最后一个空行
  if (index === localData.value.length - 1) return
  localData.value.splice(index, 1)
}

// 清空空行（保存前）
function filterEmptyRows() {
  localData.value = localData.value.filter(row =>
    row.name.trim() || row.content.trim() || row.centralizedContent.trim() || row.distributedContent.trim()
  )
}

// 保存数据
async function handleSave() {
  // 过滤空行
  filterEmptyRows()

  if (localData.value.length === 0) {
    emit('toast', '没有数据需要保存', 'warning')
    return
  }

  // 验证数据
  let hasError = false
  localData.value.forEach((row, idx) => {
    if (!row.name.trim()) {
      hasError = true
      alert(`第 ${idx + 1} 行：名称不能为空`)
      return
    }
    if (!row.content.trim() && !row.centralizedContent.trim() && !row.distributedContent.trim()) {
      hasError = true
      alert(`第 ${idx + 1} 行：请至少填写一个命令内容`)
      return
    }
  })
  if (hasError) return

  // 构建分类映射，自动创建新分类
  const newCategoryMap = { ...categoryMap.value }
  const usedColors = allCategories.value.filter(c => c.parentId === null).map(c => c.color)

  // 检查需要创建的新分类
  for (const row of localData.value) {
    const parentCatName = row.parentCategoryName.trim()
    const catName = row.categoryName.trim()

    if (catName && parentCatName) {
      const key = `${parentCatName}/${catName}`
      if (!newCategoryMap[key]) {
        let parentId = newCategoryMap[parentCatName]
        if (!parentId && parentCatName) {
          const parentColor = getRandomColor(usedColors)
          parentId = addCategory(parentCatName, parentColor)
          newCategoryMap[parentCatName] = parentId
          usedColors.push(parentColor)
        }
        const parentColor = allCategories.value.find(c => c.id === parentId)?.color || '#0066CC'
        const childColor = gradientColor(parentColor, Object.keys(newCategoryMap).filter(k => k.startsWith(parentCatName + '/')).length)
        const childId = addCategory(catName, childColor, parentId)
        newCategoryMap[key] = childId
      }
    } else if (parentCatName && !newCategoryMap[parentCatName]) {
      const parentColor = getRandomColor(usedColors)
      const parentId = addCategory(parentCatName, parentColor)
      newCategoryMap[parentCatName] = parentId
      usedColors.push(parentColor)
    }
  }

  // 批量保存命令
  batchReplaceCommands(localData.value, newCategoryMap)

  emit('toast', `成功保存 ${localData.value.length} 条命令`)
  emit('refresh')
  emit('close')
}

// 关闭
function handleClose() {
  emit('close')
}

// 快捷键：Enter 在最后一行的名称列时添加新行
function onKeyDown(event, row, index) {
  if (event.key === 'Enter' && index === localData.value.length - 2) {
    // 在倒数第二行（最后一个有内容的行）按 Enter，跳到新空行
    checkAndAddRow()
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-6xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 class="text-lg font-semibold">📝 批量编辑</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-secondary">{{ localData.length - 1 }} 条命令（末尾空行自动添加）</span>
          <button class="text-secondary hover:text-primary text-xl" @click="handleClose">×</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="px-5 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <button class="btn btn-secondary text-sm" @click="addMultipleRows(1)">+ 1行</button>
        <button class="btn btn-secondary text-sm" @click="addMultipleRows(5)">+ 5行</button>
        <button class="btn btn-secondary text-sm" @click="addMultipleRows(10)">+ 10行</button>
        <span class="text-xs text-secondary ml-2">填写最后一行后自动添加新行</span>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse">
          <!-- Fixed Header -->
          <thead class="sticky top-0 bg-bg-secondary z-10">
            <tr>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-10">#</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-16">一级</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-16">二级</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-20">名称 *</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border min-w-[200px]">通用命令</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border min-w-[200px]">集中式</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border min-w-[200px]">分布式</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-24">描述</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-16">标签</th>
              <th class="px-2 py-2 text-center text-xs font-medium text-secondary border-b border-border w-8">删</th>
            </tr>
          </thead>
          <!-- Body -->
          <tbody>
            <tr v-for="(row, index) in localData" :key="index"
              :class="[
                'hover:bg-bg-secondary/50 group',
                index === localData.length - 1 ? 'bg-bg-secondary/30' : ''
              ]">
              <td class="px-2 py-1 text-xs text-secondary border-b border-border">
                {{ index === localData.length - 1 ? '+' : index + 1 }}
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.parentCategoryName"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="一级"
                  list="parentCategories"
                  @change="onParentCategoryChange(row); onInputChange(row)"
                  @keydown="onKeyDown($event, row, index)"
                />
                <datalist id="parentCategories">
                  <option v-for="cat in parentCategories" :key="cat.id" :value="cat.name" />
                </datalist>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.categoryName"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="二级"
                  list="childCategories"
                  @change="onInputChange(row)"
                  @keydown="onKeyDown($event, row, index)"
                />
                <datalist id="childCategories">
                  <option v-for="cat in allCategories.filter(c => c.parentId !== null)" :key="cat.id" :value="cat.name" />
                </datalist>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.name"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="名称"
                  @change="onInputChange(row)"
                  @keydown="onKeyDown($event, row, index)"
                />
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.content"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="通用"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.centralizedContent"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="集中式"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.distributedContent"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="分布式"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.description"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="描述"
                  @change="onInputChange(row)"
                />
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.tags"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="标签"
                  @change="onInputChange(row)"
                />
              </td>
              <td class="px-2 py-1 text-center border-b border-border">
                <button
                  v-if="index !== localData.length - 1"
                  class="text-error hover:text-error/80 text-sm opacity-0 group-hover:opacity-100"
                  @click="deleteRow(index)"
                  title="删除"
                >
                  ×
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actions -->
      <div class="px-5 py-4 border-t border-border flex justify-end gap-2 shrink-0">
        <button class="btn btn-secondary" @click="handleClose">
          取消
        </button>
        <button class="btn btn-primary" @click="handleSave">
          保存全部
        </button>
      </div>
    </div>
  </div>
</template>