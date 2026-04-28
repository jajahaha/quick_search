<script setup>
import { ref, onMounted, computed } from 'vue'
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

// 二级分类按父分类分组
const childCategoriesByParent = computed(() => {
  const map = {}
  allCategories.value.forEach(c => {
    if (c.parentId !== null) {
      if (!map[c.parentId]) map[c.parentId] = []
      map[c.parentId].push(c)
    }
  })
  return map
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
  allCategories.value = getAllCategories()
}

// 获取选中一级分类的ID
function getParentIdByName(name) {
  const cat = allCategories.value.find(c => c.parentId === null && c.name === name)
  return cat ? cat.id : null
}

// 当一级分类改变时，清空二级分类（如果新的一级分类下没有匹配的二级分类）
function onParentCategoryChange(row) {
  const parentId = getParentIdByName(row.parentCategoryName)
  if (parentId) {
    const children = childCategoriesByParent.value[parentId] || []
    if (!children.find(c => c.name === row.categoryName)) {
      row.categoryName = ''
    }
  }
}

// 添加新行
function addRow() {
  localData.value.push({
    id: null,
    parentCategoryName: '',
    categoryName: '',
    name: '',
    content: '',
    centralizedContent: '',
    distributedContent: '',
    description: '',
    tags: ''
  })
}

// 删除行
function deleteRow(index) {
  localData.value.splice(index, 1)
}

// 保存数据
async function handleSave() {
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
        // 需要创建二级分类，先确保一级分类存在
        let parentId = newCategoryMap[parentCatName]
        if (!parentId && parentCatName) {
          // 创建一级分类
          const parentColor = getRandomColor(usedColors)
          parentId = addCategory(parentCatName, parentColor)
          newCategoryMap[parentCatName] = parentId
          usedColors.push(parentColor)
        }
        // 创建二级分类
        const parentColor = allCategories.value.find(c => c.id === parentId)?.color || '#0066CC'
        const childColor = gradientColor(parentColor, Object.keys(newCategoryMap).filter(k => k.startsWith(parentCatName + '/')).length)
        const childId = addCategory(catName, childColor, parentId)
        newCategoryMap[key] = childId
      }
    } else if (parentCatName && !newCategoryMap[parentCatName]) {
      // 只有一级分类，需要创建
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
          <span class="text-sm text-secondary">{{ localData.length }} 条命令</span>
          <button class="text-secondary hover:text-primary text-xl" @click="handleClose">×</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="px-5 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <button class="btn btn-primary text-sm" @click="addRow">
          + 添加行
        </button>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse">
          <!-- Fixed Header -->
          <thead class="sticky top-0 bg-bg-secondary z-10">
            <tr>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-12">#</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-20">一级分类</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-20">二级分类</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-24">名称 *</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-40">通用命令</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-40">集中式</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-40">分布式</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-28">描述</th>
              <th class="px-2 py-2 text-left text-xs font-medium text-secondary border-b border-border w-20">标签</th>
              <th class="px-2 py-2 text-center text-xs font-medium text-secondary border-b border-border w-10">操作</th>
            </tr>
          </thead>
          <!-- Body -->
          <tbody>
            <tr v-for="(row, index) in localData" :key="index" class="hover:bg-bg-secondary/50 group">
              <td class="px-2 py-1 text-xs text-secondary border-b border-border">{{ index + 1 }}</td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.parentCategoryName"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="一级分类"
                  list="parentCategories"
                  @change="onParentCategoryChange(row)"
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
                  placeholder="二级分类"
                  list="childCategories"
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
                />
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.content"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="通用命令"
                  rows="1"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.centralizedContent"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="集中式"
                  rows="1"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <textarea
                  v-model="row.distributedContent"
                  class="input text-sm w-full px-1 py-0.5 resize-none"
                  placeholder="分布式"
                  rows="1"
                ></textarea>
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.description"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="描述"
                />
              </td>
              <td class="px-2 py-1 border-b border-border">
                <input
                  v-model="row.tags"
                  type="text"
                  class="input text-sm w-full px-1 py-0.5"
                  placeholder="标签"
                />
              </td>
              <td class="px-2 py-1 text-center border-b border-border">
                <button
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