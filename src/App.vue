<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from './components/Sidebar/Sidebar.vue'
import SearchBar from './components/SearchBar/SearchBar.vue'
import CommandCard from './components/CommandCard/CommandCard.vue'
import CommandModal from './components/Modal/CommandModal.vue'
import CategoryModal from './components/Modal/CategoryModal.vue'
import ImportModal from './components/Modal/ImportModal.vue'
import Toast from './components/common/Toast.vue'
import { initDB, getCommands, getCategoryTree, getAllCategories, searchCommands, addCommand, updateCommand, deleteCommand, updateCommandOrder, getCommandContentByArch, getCategoryWithChildrenIds } from './utils/database.js'
import { copyToClipboard } from './utils/clipboard.js'

// 皮肤主题配置
const THEME_KEY = 'gaussdb_theme'
const currentTheme = ref(localStorage.getItem(THEME_KEY) || 'default')

// 切换皮肤
function toggleTheme() {
  const newTheme = currentTheme.value === 'default' ? 'dark' : 'default'
  currentTheme.value = newTheme
  localStorage.setItem(THEME_KEY, newTheme)
  if (newTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

// 架构模式状态
const ARCH_MODE_KEY = 'gaussdb_arch_mode'
const archMode = ref(localStorage.getItem(ARCH_MODE_KEY) || 'both') // 'both' | 'centralized' | 'distributed'

// 切换架构模式
function switchArchMode(mode) {
  archMode.value = mode
  localStorage.setItem(ARCH_MODE_KEY, mode)
}

// 数据状态
const commands = ref([])
const categories = ref([])
const selectedCategoryId = ref(null)
const searchKeyword = ref('')
const isLoading = ref(true)
const initError = ref(null)
const lastRefreshTime = ref(Date.now()) // 刷新时间戳，用于触发子组件更新

// 弹窗状态
const showCommandModal = ref(false)
const showCategoryModal = ref(false)
const showImportModal = ref(false)
const editingCommand = ref(null)
const editingCategory = ref(null)

// Toast 提示
const toastMessage = ref('')
const toastType = ref('success')

// 筛选后的命令列表
const filteredCommands = computed(() => {
  if (initError.value) return []
  try {
    let result = commands.value
    // 搜索过滤
    if (searchKeyword.value.trim()) {
      result = searchCommands(searchKeyword.value, archMode.value)
    }
    // 分类过滤
    if (selectedCategoryId.value) {
      const categoryIds = getCategoryWithChildrenIds(selectedCategoryId.value)
      result = result.filter(cmd => categoryIds.includes(cmd.categoryId))
    }
    return result
  } catch (e) {
    return []
  }
})

// 分类编号映射（用于显示在命令卡片上）
const categoryIndexMap = computed(() => {
  const map = {}
  categories.value.forEach((cat, idx) => {
    // 一级分类编号
    const parentNum = (idx + 1).toString().padStart(2, '0')
    map[cat.id] = parentNum
    // 二级分类编号
    if (cat.children) {
      cat.children.forEach((child, childIdx) => {
        map[child.id] = parentNum + '-' + (childIdx + 1).toString().padStart(2, '0')
      })
    }
  })
  return map
})

// 加载数据
async function loadData() {
  try {
    categories.value = getCategoryTree() // 树形分类用于侧边栏
    commands.value = getCommands(null, archMode.value) // 加载所有命令
    lastRefreshTime.value = Date.now() // 更新刷新时间戳
  } catch (e) {
    console.error('Load data failed:', e)
  }
}

// 初始化
onMounted(async () => {
  // 应用保存的皮肤主题
  if (currentTheme.value === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  try {
    await initDB()
    await loadData()
    isLoading.value = false
  } catch (e) {
    console.error('Database init failed:', e)
    initError.value = e.message || '数据库初始化失败'
    isLoading.value = false
    showToast('数据库初始化失败，请刷新页面重试', 'error')
  }
})

// 重试初始化
async function retryInit() {
  isLoading.value = true
  initError.value = null
  try {
    await initDB()
    await loadData()
    isLoading.value = false
    showToast('数据库初始化成功')
  } catch (e) {
    isLoading.value = false
    initError.value = e.message
    showToast('数据库初始化失败', 'error')
  }
}

// 显示 Toast
function showToast(message, type = 'success') {
  toastMessage.value = message
  toastType.value = type
}

// 选择分类
function selectCategory(id) {
  selectedCategoryId.value = id
  searchKeyword.value = ''
}

// 搜索
function handleSearch(keyword) {
  searchKeyword.value = keyword
}

// 打开新增命令弹窗
function openAddCommand() {
  editingCommand.value = null
  showCommandModal.value = true
}

// 打开编辑命令弹窗
function openEditCommand(cmd) {
  editingCommand.value = { ...cmd }
  showCommandModal.value = true
}

// 保存命令
function saveCommand(data) {
  if (editingCommand.value) {
    updateCommand(
      editingCommand.value.id,
      data.name,
      data.content,
      data.categoryId,
      data.description,
      data.tags,
      data.centralizedContent || '',
      data.distributedContent || ''
    )
    showToast('命令已更新')
  } else {
    addCommand(
      data.name,
      data.content,
      data.categoryId,
      data.description,
      data.tags,
      data.centralizedContent || '',
      data.distributedContent || ''
    )
    showToast('命令已添加')
  }
  showCommandModal.value = false
  loadData()
}

// 删除命令
function handleDeleteCommand(id) {
  deleteCommand(id)
  showToast('命令已删除')
  loadData()
}

// 复制命令
async function handleCopyCommand(content) {
  const success = await copyToClipboard(content)
  if (success) {
    showToast('已复制到剪贴板')
  } else {
    showToast('复制失败', 'error')
  }
}

// 拖拽排序后更新
function handleDragEnd(event) {
  const newList = filteredCommands.value.map(cmd => cmd.id)
  updateCommandOrder(newList)
}

// 打开新增分类弹窗
function openAddCategory() {
  editingCategory.value = null
  showCategoryModal.value = true
}

// 打开编辑分类弹窗
function openEditCategory(cat) {
  editingCategory.value = { ...cat }
  showCategoryModal.value = true
}

// 打开导入弹窗
function openImportModal() {
  showImportModal.value = true
}

// 数据更新后刷新
function refreshData() {
  loadData()
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg-secondary">
    <!-- Title Bar - 简洁设计 -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-3">
      <div class="flex items-center justify-center gap-2">
        <span class="text-2xl">⚡</span>
        <h1 class="text-xl font-semibold tracking-wide">GaussDB 快捷命令管理器</h1>
      </div>
    </div>

    <!-- Header / Toolbar -->
    <header class="h-11 border-b border-border flex items-center px-4 gap-3 bg-background sticky top-0 z-10 shadow-sm">
      <!-- Architecture Switch - 紧凑按钮组 -->
      <div class="flex gap-0.5 flex-shrink-0 bg-bg-secondary rounded-lg p-0.5">
        <button
          class="px-2.5 py-1 rounded text-sm font-medium transition-all"
          :class="archMode === 'centralized' ? 'bg-blue-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-background'"
          @click="switchArchMode('centralized')"
          title="集中式架构"
        >
          🔵 集中式
        </button>
        <button
          class="px-2.5 py-1 rounded text-sm font-medium transition-all"
          :class="archMode === 'distributed' ? 'bg-green-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-background'"
          @click="switchArchMode('distributed')"
          title="分布式架构"
        >
          🟢 分布式
        </button>
        <button
          class="px-2.5 py-1 rounded text-sm font-medium transition-all"
          :class="archMode === 'both' ? 'bg-gray-500 text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-background'"
          @click="switchArchMode('both')"
          title="显示全部"
        >
          ⚪ 全部
        </button>
      </div>

      <SearchBar
        :keyword="searchKeyword"
        @search="handleSearch"
        class="flex-1 max-w-xl"
      />

      <!-- Right side buttons -->
      <div class="flex gap-1.5 flex-shrink-0 items-center ml-auto">
        <!-- Theme Switcher -->
        <button
          class="btn btn-secondary px-2 py-1 text-sm"
          @click="toggleTheme"
          title="切换皮肤"
        >
          {{ currentTheme === 'default' ? '👔' : '🧥' }}
        </button>
        <button class="btn btn-secondary px-2 py-1 text-sm" @click="openImportModal">
          📦
        </button>
        <button class="btn btn-primary px-3 py-1 text-sm" @click="openAddCommand">
          + 新增
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <Sidebar
        :categories="categories"
        :selectedId="selectedCategoryId"
        :refreshTime="lastRefreshTime"
        @select="selectCategory"
        @add="openAddCategory"
        @edit="openEditCategory"
        @refresh="refreshData"
      />

      <!-- Command List -->
      <main class="flex-1 overflow-auto p-3">
        <div v-if="isLoading" class="flex items-center justify-center h-full">
          <span class="text-secondary">加载中...</span>
        </div>

        <div v-else-if="initError" class="flex flex-col items-center justify-center h-full gap-4">
          <span class="text-error">{{ initError }}</span>
          <button class="btn btn-primary" @click="retryInit">
            重试
          </button>
        </div>

        <div v-else-if="filteredCommands.length === 0" class="flex flex-col items-center justify-center h-full gap-2">
          <span class="text-4xl">📭</span>
          <span class="text-secondary">暂无命令</span>
          <button class="btn btn-primary" @click="openAddCommand">添加第一条命令</button>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
          <CommandCard
            v-for="cmd in filteredCommands"
            :key="cmd.id"
            :command="cmd"
            :archMode="archMode"
            :categoryIndexMap="categoryIndexMap"
            @edit="openEditCommand"
            @delete="handleDeleteCommand"
            @copy="handleCopyCommand"
          />
        </div>
      </main>
    </div>

    <!-- Modals -->
    <CommandModal
      v-if="showCommandModal"
      :command="editingCommand"
      :categories="categories"
      :archMode="archMode"
      @close="showCommandModal = false"
      @save="saveCommand"
    />

    <CategoryModal
      v-if="showCategoryModal"
      :category="editingCategory"
      @close="showCategoryModal = false"
      @refresh="refreshData"
    />

    <ImportModal
      v-if="showImportModal"
      @close="showImportModal = false"
      @refresh="refreshData"
      @toast="showToast"
    />

    <!-- Toast -->
    <Toast
      v-if="toastMessage"
      :message="toastMessage"
      :type="toastType"
      @close="toastMessage = ''"
    />
  </div>
</template>