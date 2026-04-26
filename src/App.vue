<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from './components/Sidebar/Sidebar.vue'
import SearchBar from './components/SearchBar/SearchBar.vue'
import CommandCard from './components/CommandCard/CommandCard.vue'
import CommandModal from './components/Modal/CommandModal.vue'
import CategoryModal from './components/Modal/CategoryModal.vue'
import ImportModal from './components/Modal/ImportModal.vue'
import Toast from './components/common/Toast.vue'
import { initDB, getCommands, getCategories, searchCommands, addCommand, updateCommand, deleteCommand, updateCommandOrder } from './utils/database.js'
import { copyToClipboard } from './utils/clipboard.js'

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
    if (searchKeyword.value.trim()) {
      return searchCommands(searchKeyword.value)
    }
    return getCommands(selectedCategoryId.value)
  } catch (e) {
    return []
  }
})

// 加载数据
async function loadData() {
  try {
    categories.value = getCategories()
    commands.value = getCommands()
  } catch (e) {
    console.error('Load data failed:', e)
  }
}

// 初始化
onMounted(async () => {
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
      data.tags
    )
    showToast('命令已更新')
  } else {
    addCommand(
      data.name,
      data.content,
      data.categoryId,
      data.description,
      data.tags
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
    <!-- Header -->
    <header class="h-14 border-b border-border flex items-center px-4 gap-4 bg-background sticky top-0 z-10">
      <h1 class="text-lg font-semibold flex-shrink-0">快捷命令</h1>
      <SearchBar
        :keyword="searchKeyword"
        @search="handleSearch"
        class="flex-1 max-w-md"
      />
      <div class="flex gap-2 flex-shrink-0">
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