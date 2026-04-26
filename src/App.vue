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

// 加载数据
async function loadData() {
  try {
    categories.value = getCategoryTree() // 树形分类用于侧边栏
    commands.value = getCommands(null, archMode.value) // 加载所有命令
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
  <div class="min-h-screen flex flex-col">
    <!-- Title Bar -->
    <div
      class="relative text-white px-6 py-5 overflow-hidden"
      style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.85)), url('https://images.unsplash.com/photo-1557683316-973df3baf1c3?w=1200&q=80') center/cover no-repeat;"
    >
      <div class="absolute inset-0 bg-gradient-to-r from-slate-900/50 to-transparent"></div>
      <div class="relative flex items-center justify-center gap-3">
        <span class="text-3xl">⚡</span>
        <h1 class="text-2xl font-bold tracking-wide">GaussDB快捷命令管理器</h1>
      </div>
    </div>

    <!-- Header / Toolbar -->
    <header class="h-12 border-b border-border flex items-center px-4 gap-4 bg-background sticky top-0 z-10">
      <!-- Architecture Switch -->
      <div class="flex gap-1 flex-shrink-0 bg-bg-secondary rounded p-1">
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="archMode === 'centralized' ? 'bg-blue-600 text-white' : 'text-secondary hover:text-primary'"
          @click="switchArchMode('centralized')"
          title="集中式架构"
        >
          🔵 集中式
        </button>
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="archMode === 'distributed' ? 'bg-green-600 text-white' : 'text-secondary hover:text-primary'"
          @click="switchArchMode('distributed')"
          title="分布式架构"
        >
          🟢 分布式
        </button>
        <button
          class="px-3 py-1 rounded text-sm font-medium transition-colors"
          :class="archMode === 'both' ? 'bg-gray-600 text-white' : 'text-secondary hover:text-primary'"
          @click="switchArchMode('both')"
          title="显示全部"
        >
          ⚪ 全部
        </button>
      </div>

      <SearchBar
        :keyword="searchKeyword"
        @search="handleSearch"
        class="flex-1 max-w-md"
      />
      <div class="flex gap-2 flex-shrink-0 items-center">
        <!-- Theme Switcher -->
        <button
          class="btn btn-secondary flex items-center gap-1"
          @click="toggleTheme"
          title="切换皮肤"
        >
          <span>{{ currentTheme === 'default' ? '👔' : '🧥' }}</span>
        </button>
        <button class="btn btn-secondary" @click="openImportModal">
          导入/导出
        </button>
        <button class="btn btn-primary" @click="openAddCommand">
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
        @select="selectCategory"
        @add="openAddCategory"
        @edit="openEditCategory"
        @refresh="refreshData"
      />

      <!-- Command List -->
      <main class="flex-1 overflow-auto p-4 bg-bg-secondary">
        <div v-if="isLoading" class="flex items-center justify-center h-full">
          <span class="text-secondary">加载中...</span>
        </div>

        <div v-else-if="initError" class="flex flex-col items-center justify-center h-full gap-4">
          <span class="text-error">{{ initError }}</span>
          <button class="btn btn-primary" @click="retryInit">
            重试
          </button>
        </div>

        <div v-else-if="filteredCommands.length === 0" class="flex items-center justify-center h-full">
          <span class="text-secondary">暂无命令，点击"新增"添加</span>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <CommandCard
            v-for="cmd in filteredCommands"
            :key="cmd.id"
            :command="cmd"
            :archMode="archMode"
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