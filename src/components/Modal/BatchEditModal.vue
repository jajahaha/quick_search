<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { getCommands, getAllCategories, addCategory, batchReplaceCommands } from '../../utils/database.js'

const emit = defineEmits(['close', 'refresh', 'toast'])

// 标准字段列表
const STANDARD_FIELDS = ['一级分类', '二级分类', '名称', '通用命令', '集中式', '分布式', '描述', '标签']
const STANDARD_FIELD_KEYS = ['parentCategoryName', 'categoryName', 'name', 'content', 'centralizedContent', 'distributedContent', 'description', 'tags']

// 本地编辑数据
const localData = ref([])

// 所有分类（扁平列表）
const allCategories = ref([])

// 扩展列列表（动态添加）
const extraColumns = ref([])

// 新列名称输入
const newColumnName = ref('')

// 粘贴模式提示
const showPasteHint = ref(true)

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
  const row = {
    id: null,
    parentCategoryName: '',
    categoryName: '',
    name: '',
    content: '',
    centralizedContent: '',
    distributedContent: '',
    description: '',
    tags: '',
    extraFields: {}
  }
  extraColumns.value.forEach(col => {
    row.extraFields[col] = ''
  })
  return row
}

// 加载数据
function loadData() {
  const commands = getCommands()

  // 收集所有扩展字段名
  const allExtraFields = new Set()
  commands.forEach(cmd => {
    if (cmd.extraFields) {
      Object.keys(cmd.extraFields).forEach(key => allExtraFields.add(key))
    }
  })
  extraColumns.value = Array.from(allExtraFields).sort()

  localData.value = commands.map(cmd => ({
    id: cmd.id,
    parentCategoryName: cmd.parentCategoryName || '',
    categoryName: cmd.categoryName || '',
    name: cmd.name,
    content: cmd.content || '',
    centralizedContent: cmd.centralizedContent || '',
    distributedContent: cmd.distributedContent || '',
    description: cmd.description || '',
    tags: cmd.tags || '',
    extraFields: cmd.extraFields || {}
  }))
  localData.value.push(createEmptyRow())
  allCategories.value = getAllCategories()
}

// 添加新列
function addColumn() {
  const name = newColumnName.value.trim()
  if (!name) return
  if (extraColumns.value.includes(name)) {
    emit('toast', '列名已存在', 'warning')
    return
  }
  extraColumns.value.push(name)
  localData.value.forEach(row => {
    if (!row.extraFields) row.extraFields = {}
    row.extraFields[name] = ''
  })
  newColumnName.value = ''
}

// 删除列
function deleteColumn(colName) {
  const index = extraColumns.value.indexOf(colName)
  if (index > -1) {
    extraColumns.value.splice(index, 1)
    localData.value.forEach(row => {
      if (row.extraFields) delete row.extraFields[colName]
    })
  }
}

// 处理粘贴事件（从Excel粘贴）
function handlePaste(event) {
  const clipboardData = event.clipboardData || window.clipboardData
  const pastedText = clipboardData.getData('Text')

  if (!pastedText) return

  // 解析粘贴的文本（Excel粘贴是制表符分隔，换行分隔行）
  const lines = pastedText.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) return

  // 解析每行的列数据
  const rows = lines.map(line => line.split('\t'))

  // 检测是否有标题行（第一行包含标准字段名）
  const firstRow = rows[0]
  const isHeaderRow = firstRow.some(cell => STANDARD_FIELDS.includes(cell.trim()) || cell.trim() === '集中式命令' || cell.trim() === '分布式命令')

  let columnMapping = []
  let dataRows = rows

  if (isHeaderRow) {
    // 第一行是标题，构建列映射
    columnMapping = firstRow.map(cell => {
      const cellName = cell.trim()
      // 标准字段映射
      if (cellName === '一级分类') return 'parentCategoryName'
      if (cellName === '二级分类') return 'categoryName'
      if (cellName === '名称') return 'name'
      if (cellName === '通用命令' || cellName === '命令') return 'content'
      if (cellName === '集中式命令' || cellName === '集中式') return 'centralizedContent'
      if (cellName === '分布式命令' || cellName === '分布式') return 'distributedContent'
      if (cellName === '描述') return 'description'
      if (cellName === '标签') return 'tags'
      // 扩展字段
      return 'extra:' + cellName
    })
    dataRows = rows.slice(1)

    // 添加新的扩展列
    columnMapping.forEach(mapping => {
      if (mapping.startsWith('extra:')) {
        const colName = mapping.substring(6)
        if (!extraColumns.value.includes(colName)) {
          extraColumns.value.push(colName)
        }
      }
    })
  } else {
    // 无标题行，按默认顺序映射
    columnMapping = STANDARD_FIELD_KEYS.slice(0, firstRow.length)
    // 多余的列作为扩展字段
    for (let i = STANDARD_FIELD_KEYS.length; i < firstRow.length; i++) {
      const colName = '扩展' + (i - STANDARD_FIELD_KEYS.length + 1)
      if (!extraColumns.value.includes(colName)) {
        extraColumns.value.push(colName)
      }
      columnMapping.push('extra:' + colName)
    }
  }

  // 移除最后的空行
  if (localData.value.length > 0 && localData.value[localData.value.length - 1].name === '' && !localData.value[localData.value.length - 1].content) {
    localData.value.pop()
  }

  // 插入数据行
  dataRows.forEach(rowData => {
    const newRow = createEmptyRow()
    rowData.forEach((cell, colIndex) => {
      const mapping = columnMapping[colIndex]
      if (!mapping) return
      if (mapping.startsWith('extra:')) {
        const colName = mapping.substring(6)
        newRow.extraFields[colName] = cell.trim()
      } else {
        newRow[mapping] = cell.trim()
      }
    })
    localData.value.push(newRow)
  })

  // 添加空行在末尾
  localData.value.push(createEmptyRow())

  showPasteHint.value = false
  event.preventDefault()
  emit('toast', `已粘贴 ${dataRows.length} 行数据`)
}

// 当一级分类改变时
function onParentCategoryChange(row) {}

// 检查最后一行是否有内容
function checkAndAddRow() {
  const lastRow = localData.value[localData.value.length - 1]
  const hasContent = lastRow && (
    lastRow.name.trim() ||
    lastRow.content.trim() ||
    lastRow.centralizedContent.trim() ||
    lastRow.distributedContent.trim() ||
    Object.values(lastRow.extraFields || {}).some(v => v.trim())
  )
  if (hasContent) {
    localData.value.push(createEmptyRow())
  }
}

// 监听输入变化
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
  if (index === localData.value.length - 1) return
  localData.value.splice(index, 1)
}

// 清空空行（保存前）
function filterEmptyRows() {
  localData.value = localData.value.filter(row =>
    row.name.trim() ||
    row.content.trim() ||
    row.centralizedContent.trim() ||
    row.distributedContent.trim() ||
    Object.values(row.extraFields || {}).some(v => v.trim())
  )
}

// 保存数据
async function handleSave() {
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

  batchReplaceCommands(localData.value, newCategoryMap)

  emit('toast', `成功保存 ${localData.value.length} 条命令`)
  emit('refresh')
  emit('close')
}

// 关闭
function handleClose() {
  emit('close')
}

// 注册粘贴事件监听
onMounted(() => {
  loadData()
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="handleClose">
    <div class="card w-full max-w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]" style="width: calc(100vw - 32px);">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h2 class="text-lg font-semibold">📝 批量编辑</h2>
        <div class="flex items-center gap-2">
          <span class="text-sm text-secondary">{{ localData.length - 1 }} 条 | {{ extraColumns.length }} 扩展列</span>
          <button class="text-secondary hover:text-primary text-xl" @click="handleClose">×</button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0 flex-wrap">
        <!-- 粘贴提示 -->
        <div v-if="showPasteHint" class="bg-accent/10 text-accent text-xs px-3 py-1 rounded flex items-center gap-1">
          <span>📋</span>
          <span>直接从Excel复制数据粘贴到此处</span>
          <button class="text-accent hover:text-accent/80 ml-1" @click="showPasteHint = false">×</button>
        </div>
        <span class="text-xs text-secondary">|</span>
        <button class="btn btn-secondary text-xs px-2" @click="addMultipleRows(1)">+1行</button>
        <button class="btn btn-secondary text-xs px-2" @click="addMultipleRows(5)">+5行</button>
        <button class="btn btn-secondary text-xs px-2" @click="addMultipleRows(10)">+10行</button>
        <button class="btn btn-secondary text-xs px-2" @click="addMultipleRows(50)">+50行</button>
        <span class="text-xs text-secondary mx-2">|</span>
        <input
          v-model="newColumnName"
          type="text"
          class="input text-xs px-2 py-1 w-24"
          placeholder="新列名"
        />
        <button class="btn btn-primary text-xs px-2" @click="addColumn">+ 添加列</button>
      </div>

      <!-- Table Container -->
      <div class="flex-1 overflow-auto">
        <table class="w-full border-collapse table-fixed" style="min-width: 100%;">
          <!-- Header -->
          <thead class="sticky top-0 bg-bg-secondary z-10">
            <tr>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-8">#</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-14">一级分类</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-14">二级分类</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-16">名称*</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-32">通用命令</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-32">集中式</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-32">分布式</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-20">描述</th>
              <th class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-14">标签</th>
              <!-- 动态扩展列 -->
              <th v-for="col in extraColumns" :key="col" class="px-1 py-1 text-left text-xs font-medium text-secondary border-b border-border w-24 relative group">
                {{ col }}
                <button
                  class="absolute right-0 top-0 text-error text-xs opacity-0 group-hover:opacity-100 px-1"
                  @click="deleteColumn(col)"
                  title="删除列"
                >×</button>
              </th>
              <th class="px-1 py-1 text-center text-xs font-medium text-secondary border-b border-border w-6">删</th>
            </tr>
          </thead>
          <!-- Body -->
          <tbody>
            <tr v-for="(row, index) in localData" :key="index"
              :class="[
                'hover:bg-bg-secondary/50 group',
                index === localData.length - 1 ? 'bg-bg-secondary/30' : ''
              ]">
              <td class="px-1 py-0.5 text-xs text-secondary border-b border-border">
                {{ index === localData.length - 1 ? '+' : index + 1 }}
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.parentCategoryName"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder="一级"
                  list="parentCategories"
                  @change="onParentCategoryChange(row); onInputChange(row)"
                />
                <datalist id="parentCategories">
                  <option v-for="cat in parentCategories" :key="cat.id" :value="cat.name" />
                </datalist>
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.categoryName"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder="二级"
                  list="childCategories"
                  @change="onInputChange(row)"
                />
                <datalist id="childCategories">
                  <option v-for="cat in allCategories.filter(c => c.parentId !== null)" :key="cat.id" :value="cat.name" />
                </datalist>
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.name"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder="名称"
                  @change="onInputChange(row)"
                />
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <textarea
                  v-model="row.content"
                  class="input text-xs w-full px-1 py-0.5 resize-none"
                  placeholder="通用"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <textarea
                  v-model="row.centralizedContent"
                  class="input text-xs w-full px-1 py-0.5 resize-none"
                  placeholder="集中式"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <textarea
                  v-model="row.distributedContent"
                  class="input text-xs w-full px-1 py-0.5 resize-none"
                  placeholder="分布式"
                  rows="1"
                  @change="onInputChange(row)"
                ></textarea>
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.description"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder="描述"
                  @change="onInputChange(row)"
                />
              </td>
              <td class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.tags"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder="标签"
                  @change="onInputChange(row)"
                />
              </td>
              <!-- 动态扩展列输入 -->
              <td v-for="col in extraColumns" :key="col" class="px-1 py-0.5 border-b border-border">
                <input
                  v-model="row.extraFields[col]"
                  type="text"
                  class="input text-xs w-full px-1 py-0.5"
                  placeholder=""
                  @change="onInputChange(row)"
                />
              </td>
              <td class="px-1 py-0.5 text-center border-b border-border">
                <button
                  v-if="index !== localData.length - 1"
                  class="text-error hover:text-error/80 text-xs opacity-0 group-hover:opacity-100"
                  @click="deleteRow(index)"
                  title="删除行"
                >×</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actions -->
      <div class="px-4 py-3 border-t border-border flex justify-between items-center shrink-0">
        <span class="text-xs text-secondary">
          标准列：一级分类、二级分类、名称、通用命令、集中式、分布式、描述、标签
        </span>
        <div class="flex gap-2">
          <button class="btn btn-secondary" @click="handleClose">取消</button>
          <button class="btn btn-primary" @click="handleSave">保存全部</button>
        </div>
      </div>
    </div>
  </div>
</template>