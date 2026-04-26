// sql.js 已在 HTML 中加载，使用本地 WASM 文件

let db = null;
let SQL = null;

const DB_KEY = 'quick_commands_db';

// 初始化数据库
export async function initDB() {
  // 等待 window.initSqlJs 可用
  let attempts = 0;
  while (!window.initSqlJs && attempts < 50) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (!window.initSqlJs) {
    throw new Error('sql.js 加载失败，请刷新页面重试');
  }

  SQL = await window.initSqlJs({
    locateFile: (file) => '/' + file
  });

  // 尝试从 localStorage 加载已有数据
  const savedData = localStorage.getItem(DB_KEY);
  if (savedData) {
    try {
      const binaryArray = new Uint8Array(JSON.parse(savedData));
      db = new SQL.Database(binaryArray);
      migrateDatabase(); // 兼容已有数据
      console.log('Database loaded from localStorage');
      return db;
    } catch (e) {
      console.error('Failed to load saved database:', e);
      localStorage.removeItem(DB_KEY);
    }
  }

  // 创建新数据库
  db = new SQL.Database();
  createTables();
  insertTestData();
  saveDB();
  console.log('New database created with test data');
  return db;
}

// 创建表结构
function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#0066CC',
      parent_id INTEGER DEFAULT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      centralized_content TEXT,
      distributed_content TEXT,
      category_id INTEGER,
      description TEXT,
      tags TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
}

// 兼容已有数据：检查并添加新列
function migrateDatabase() {
  try {
    // 检查 categories 表的 parent_id 列
    const catColumns = db.exec('PRAGMA table_info(categories)');
    if (catColumns.length) {
      const hasParentId = catColumns[0].values.some(col => col[1] === 'parent_id');
      if (!hasParentId) {
        db.run('ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL');
        console.log('Database migrated: added parent_id column to categories');
      }
      const hasSortOrder = catColumns[0].values.some(col => col[1] === 'sort_order');
      if (!hasSortOrder) {
        db.run('ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0');
        console.log('Database migrated: added sort_order column to categories');
      }
    }

    // 检查 commands 表的架构相关列
    const cmdColumns = db.exec('PRAGMA table_info(commands)');
    if (cmdColumns.length) {
      const hasCentralized = cmdColumns[0].values.some(col => col[1] === 'centralized_content');
      const hasDistributed = cmdColumns[0].values.some(col => col[1] === 'distributed_content');
      if (!hasCentralized) {
        db.run('ALTER TABLE commands ADD COLUMN centralized_content TEXT');
        console.log('Database migrated: added centralized_content column');
      }
      if (!hasDistributed) {
        db.run('ALTER TABLE commands ADD COLUMN distributed_content TEXT');
        console.log('Database migrated: added distributed_content column');
      }
    }
  } catch (e) {
    console.log('Migration check skipped:', e.message);
  }
}

// 插入测试数据
function insertTestData() {
  const existing = db.exec('SELECT COUNT(*) FROM categories');
  if (existing.length && existing[0].values[0][0] > 0) {
    return;
  }

  // 一级分类（GaussDB 相关）
  const categories = [
    { name: 'Git', color: '#0F7B6C', sortOrder: 0 },      // 绿色
    { name: '集群', color: '#E03E3E', sortOrder: 1 },     // 红色
    { name: '实时会话', color: '#7C3AED', sortOrder: 2 }  // 紫色
  ];

  categories.forEach((cat, idx) => {
    db.run('INSERT INTO categories (name, color, parent_id, sort_order) VALUES (?, ?, NULL, ?)', [cat.name, cat.color, idx]);
  });

  // 颜色渐变函数（按索引调整亮度，形成渐变）
  function gradientColor(hex, index, total) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // 从原色到浅色渐变，index 从0开始
    const factor = 0.2 + (index / (total - 1 || 1)) * 0.5; // 20% ~ 70% 亮度增加
    const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * factor));
    return `#${lighten(r).toString(16).padStart(2, '0')}${lighten(g).toString(16).padStart(2, '0')}${lighten(b).toString(16).padStart(2, '0')}`;
  }

  // 二级分类（按索引渐变颜色）
  // Git(1) → 提交相关(4), 分支管理(5)
  // 集群(2) → 查询(6), 变更(7)
  // 实时会话(3) → 查询(8)
  const subCategoriesByParent = {
    1: [{ name: '提交相关' }, { name: '分支管理' }],
    2: [{ name: '查询' }, { name: '变更' }],
    3: [{ name: '查询' }]
  };
  const parentColors = { 1: '#0F7B6C', 2: '#E03E3E', 3: '#7C3AED' };

  Object.entries(subCategoriesByParent).forEach(([parentId, children]) => {
    const parentColor = parentColors[parentId];
    children.forEach((cat, idx) => {
      const gradient = gradientColor(parentColor, idx, children.length);
      db.run('INSERT INTO categories (name, color, parent_id) VALUES (?, ?, ?)', [cat.name, gradient, parseInt(parentId)]);
    });
  });

  // 命令数据
  // categoryId: Git提交相关=4, Git分支管理=5, 集群查询=6, 集群变更=7, 实时会话查询=8
  const commands = [
    // Git 提交相关
    { name: 'Git 查看日志', content: 'git log --oneline -10', categoryId: 4, description: '查看最近10条提交记录', tags: 'git,log,查看' },
    { name: 'Git 查看状态', content: 'git status', categoryId: 4, description: '查看当前工作区状态', tags: 'git,status,查看' },
    { name: 'Git 撤销修改', content: 'git checkout -- <file>', categoryId: 4, description: '撤销文件修改', tags: 'git,checkout,撤销' },
    { name: 'Git 拉取', content: 'git pull origin main', categoryId: 4, description: '拉取远程代码到本地', tags: 'git,pull,远程' },
    { name: 'Git 推送', content: 'git push origin main', categoryId: 4, description: '推送代码到远程仓库', tags: 'git,push,远程' },
    { name: 'Git 提交', content: 'git commit -m "message"', categoryId: 4, description: '提交代码到本地仓库', tags: 'git,commit,基础' },
    // Git 分支管理
    { name: 'Git 合并分支', content: 'git merge <branch-name>', categoryId: 5, description: '合并指定分支到当前分支', tags: 'git,merge,分支' },
    { name: 'Git 切换分支', content: 'git checkout <branch-name>', categoryId: 5, description: '切换到指定分支', tags: 'git,checkout,分支' },
    { name: 'Git 创建分支', content: 'git branch <branch-name>', categoryId: 5, description: '创建新分支', tags: 'git,branch,分支' },
    // 集群 查询
    { name: '查询状态', content: 'cm_ctl query -cv', categoryId: 6, description: '', tags: '' },
    // 集群 变更
    { name: '重平衡', content: 'cm_ctl query switchover -a', categoryId: 7, description: '', tags: '' },
    // 实时会话 查询（集中式/分布式）
    { name: '会话详情', content: '', centralizedContent: 'Select * from pg_stat_activity;', distributedContent: 'Select * from pgxc_stat_activity;', categoryId: 8, description: '', tags: '' },
    { name: '会话状态', content: '', centralizedContent: 'Select state, count(1) from pg_stat_activity group by 1 order by 2 desc;', distributedContent: 'Select state, count(1) from pgxc_stat_activity group by 1 order by 2 desc;', categoryId: 8, description: '', tags: '' }
  ];

  commands.forEach((cmd, idx) => {
    db.run(
      'INSERT INTO commands (name, content, centralized_content, distributed_content, category_id, description, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [cmd.name, cmd.content || '', cmd.centralizedContent || '', cmd.distributedContent || '', cmd.categoryId, cmd.description || '', cmd.tags || '', idx * 10]
    );
  });
}

// 保存数据库到本地存储
export function saveDB() {
  if (!db) return;
  const data = db.export();
  const arr = Array.from(data);
  localStorage.setItem(DB_KEY, JSON.stringify(arr));
}

// ========== 分类操作 ==========

// 获取一级分类列表
export function getCategories(parentId = null) {
  if (!db) return [];
  const sql = parentId === null
    ? 'SELECT id, name, color, parent_id FROM categories WHERE parent_id IS NULL ORDER BY id'
    : 'SELECT id, name, color, parent_id FROM categories WHERE parent_id = ? ORDER BY id';
  const params = parentId === null ? [] : [parentId];
  const result = db.exec(sql, params);
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    parentId: row[3]
  }));
}

// 获取所有分类（扁平列表）
export function getAllCategories() {
  if (!db) return [];
  const result = db.exec('SELECT id, name, color, parent_id, sort_order FROM categories ORDER BY sort_order ASC, id ASC');
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    parentId: row[3],
    sortOrder: row[4] || 0
  }));
}

// 获取树形分类结构
export function getCategoryTree() {
  if (!db) return [];
  const allCategories = getAllCategories();
  const tree = [];

  // 先构建一级分类（已按 sort_order 排序）
  allCategories.filter(c => c.parentId === null).forEach((parent, index) => {
    const node = {
      id: parent.id,
      name: parent.name,
      color: parent.color,
      sortOrder: parent.sortOrder,
      index: index + 1, // 显示序号
      children: []
    };
    // 添加二级分类
    allCategories.filter(c => c.parentId === parent.id).forEach(child => {
      node.children.push({
        id: child.id,
        name: child.name,
        color: child.color,
        parentId: child.parentId,
        sortOrder: child.sortOrder
      });
    });
    tree.push(node);
  });

  return tree;
}

// 获取分类的子分类 ID 列表（包括自己）
export function getCategoryWithChildrenIds(categoryId) {
  if (!db) return [];
  const ids = [categoryId];
  const children = db.exec('SELECT id FROM categories WHERE parent_id = ?', [categoryId]);
  if (children.length) {
    children[0].values.forEach(row => ids.push(row[0]));
  }
  return ids;
}

// 添加分类（支持二级分类）
export function addCategory(name, color = '#0066CC', parentId = null) {
  db.run('INSERT INTO categories (name, color, parent_id) VALUES (?, ?, ?)', [name, color, parentId]);
  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  saveDB();
  return newId;
}

// 更新分类（支持修改父分类）
export function updateCategory(id, name, color, parentId = null) {
  db.run('UPDATE categories SET name = ?, color = ?, parent_id = ? WHERE id = ?', [name, color, parentId, id]);
  saveDB();
}

// 更新分类顺序（一级分类拖拽排序）
export function updateCategoryOrder(categoryIds) {
  categoryIds.forEach((id, index) => {
    db.run('UPDATE categories SET sort_order = ? WHERE id = ?', [index, id]);
  });
  saveDB();
}

// 冻结状态管理
const CATEGORY_ORDER_FROZEN_KEY = 'gaussdb_category_order_frozen';

export function isCategoryOrderFrozen() {
  return localStorage.getItem(CATEGORY_ORDER_FROZEN_KEY) === 'true';
}

export function setCategoryOrderFrozen(frozen) {
  localStorage.setItem(CATEGORY_ORDER_FROZEN_KEY, frozen ? 'true' : 'false');
}

// 删除分类
export function deleteCategory(id) {
  // 子分类的 parent_id 设为 NULL（变成一级分类）
  db.run('UPDATE categories SET parent_id = NULL WHERE parent_id = ?', [id]);
  // 该分类下的命令移到未分类
  db.run('UPDATE commands SET category_id = NULL WHERE category_id = ?', [id]);
  // 删除分类
  db.run('DELETE FROM categories WHERE id = ?', [id]);
  saveDB();
}

// 根据名称和父分类查找分类
export function findCategoryByName(name, parentId = null) {
  if (!db) return null;
  const sql = parentId === null
    ? 'SELECT id, name, color, parent_id FROM categories WHERE name = ? AND parent_id IS NULL'
    : 'SELECT id, name, color, parent_id FROM categories WHERE name = ? AND parent_id = ?';
  const params = parentId === null ? [name] : [name, parentId];
  const result = db.exec(sql, params);
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  return {
    id: row[0],
    name: row[1],
    color: row[2],
    parentId: row[3]
  };
}

// ========== 命令操作 ==========

// 获取命令列表，支持按架构筛选
export function getCommands(categoryId = null, archMode = 'both') {
  if (!db) return [];

  let sql = `
    SELECT c.id, c.name, c.content, c.centralized_content, c.distributed_content,
           c.description, c.tags, c.sort_order, c.category_id,
           cat.name as category_name, cat.color as category_color, cat.parent_id as category_parent_id,
           parent.name as parent_category_name, parent.color as parent_category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories parent ON cat.parent_id = parent.id
  `;
  const params = [];
  let hasWhere = false;

  // 分类筛选
  if (categoryId) {
    const categoryIds = getCategoryWithChildrenIds(categoryId);
    sql += ` WHERE c.category_id IN (${categoryIds.map(() => '?').join(',')}) `;
    params.push(...categoryIds);
    hasWhere = true;
  }

  // 架构筛选：
  // 集中式模式：显示有集中式内容 OR 有通用内容的命令
  // 分布式模式：显示有分布式内容 OR 有通用内容的命令
  if (archMode === 'centralized') {
    sql += hasWhere
      ? ' AND (c.centralized_content IS NOT NULL AND c.centralized_content != "" OR c.content IS NOT NULL AND c.content != "") '
      : ' WHERE (c.centralized_content IS NOT NULL AND c.centralized_content != "" OR c.content IS NOT NULL AND c.content != "") ';
    hasWhere = true;
  } else if (archMode === 'distributed') {
    sql += hasWhere
      ? ' AND (c.distributed_content IS NOT NULL AND c.distributed_content != "" OR c.content IS NOT NULL AND c.content != "") '
      : ' WHERE (c.distributed_content IS NOT NULL AND c.distributed_content != "" OR c.content IS NOT NULL AND c.content != "") ';
    hasWhere = true;
  }
  // archMode === 'both' 时显示所有命令

  sql += ' ORDER BY c.sort_order DESC, c.id DESC';

  const result = db.exec(sql, params);
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    content: row[2],
    centralizedContent: row[3] || '',
    distributedContent: row[4] || '',
    description: row[5] || '',
    tags: row[6] || '',
    sortOrder: row[7],
    categoryId: row[8],
    categoryName: row[9] || '',
    categoryColor: row[10] || '#0066CC',
    categoryParentId: row[11],
    parentCategoryName: row[12] || '',
    parentCategoryColor: row[13] || '#0066CC'
  }));
}

// 根据架构模式获取命令内容
export function getCommandContentByArch(cmd, archMode) {
  if (archMode === 'centralized') {
    // 集中式模式：优先显示集中式命令，否则显示通用命令
    if (cmd.centralizedContent && cmd.centralizedContent.trim()) {
      return cmd.centralizedContent;
    }
    return cmd.content || '';
  } else if (archMode === 'distributed') {
    // 分布式模式：优先显示分布式命令，否则显示通用命令
    if (cmd.distributedContent && cmd.distributedContent.trim()) {
      return cmd.distributedContent;
    }
    return cmd.content || '';
  }
  // 全部模式：返回所有可用内容（让组件决定如何显示）
  const contents = [];
  if (cmd.centralizedContent && cmd.centralizedContent.trim()) {
    contents.push({ type: 'centralized', content: cmd.centralizedContent, label: '集中式' });
  }
  if (cmd.distributedContent && cmd.distributedContent.trim()) {
    contents.push({ type: 'distributed', content: cmd.distributedContent, label: '分布式' });
  }
  if (cmd.content && cmd.content.trim()) {
    contents.push({ type: 'common', content: cmd.content, label: '通用' });
  }
  return contents;
}

// 获取命令的单一显示内容（用于简化场景）
export function getCommandDisplayContent(cmd, archMode) {
  if (archMode === 'centralized') {
    // 集中式：优先集中式，否则通用
    if (cmd.centralizedContent && cmd.centralizedContent.trim()) {
      return cmd.centralizedContent;
    }
    return cmd.content || '';
  } else if (archMode === 'distributed') {
    // 分布式：优先分布式，否则通用
    if (cmd.distributedContent && cmd.distributedContent.trim()) {
      return cmd.distributedContent;
    }
    return cmd.content || '';
  }
  // 全部模式：显示所有可用内容
  if (cmd.centralizedContent && cmd.centralizedContent.trim()) {
    return cmd.centralizedContent;
  }
  if (cmd.distributedContent && cmd.distributedContent.trim()) {
    return cmd.distributedContent;
  }
  return cmd.content || '';
}

// 判断命令是否有架构专用内容
export function hasArchContent(cmd) {
  return {
    hasCentralized: cmd.centralizedContent && cmd.centralizedContent.trim() !== '',
    hasDistributed: cmd.distributedContent && cmd.distributedContent.trim() !== '',
    hasCommon: cmd.content && cmd.content.trim() !== ''
  };
}

export function addCommand(name, content, categoryId, description, tags, centralizedContent = '', distributedContent = '') {
  const maxOrderResult = db.exec('SELECT MAX(sort_order) FROM commands');
  const maxOrder = maxOrderResult.length && maxOrderResult[0].values[0][0]
    ? maxOrderResult[0].values[0][0] + 1
    : 100;

  const finalCategoryId = (categoryId === null || categoryId === undefined || categoryId === 0) ? null : categoryId;

  db.run(
    `INSERT INTO commands (name, content, centralized_content, distributed_content, category_id, description, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, content, centralizedContent, distributedContent, finalCategoryId, description || '', tags || '', maxOrder]
  );
  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  saveDB();
  return newId;
}

export function updateCommand(id, name, content, categoryId, description, tags, centralizedContent = '', distributedContent = '') {
  db.run(
    `UPDATE commands SET name = ?, content = ?, centralized_content = ?, distributed_content = ?, category_id = ?, description = ?, tags = ? WHERE id = ?`,
    [name, content, centralizedContent, distributedContent, categoryId || null, description || '', tags || '', id]
  );
  saveDB();
}

export function deleteCommand(id) {
  db.run('DELETE FROM commands WHERE id = ?', [id]);
  saveDB();
}

export function searchCommands(keyword, archMode = 'both') {
  if (!db) return [];
  if (!keyword.trim()) return getCommands(null, archMode);

  let sql = `
    SELECT c.id, c.name, c.content, c.centralized_content, c.distributed_content,
           c.description, c.tags, c.sort_order, c.category_id,
           cat.name as category_name, cat.color as category_color, cat.parent_id as category_parent_id,
           parent.name as parent_category_name, parent.color as parent_category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories parent ON cat.parent_id = parent.id
    WHERE (c.name LIKE ? OR c.content LIKE ? OR c.centralized_content LIKE ? OR c.distributed_content LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)
  `;
  const params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

  // 架构筛选：集中式显示集中式或通用，分布式显示分布式或通用
  if (archMode === 'centralized') {
    sql += ' AND (c.centralized_content IS NOT NULL AND c.centralized_content != "" OR c.content IS NOT NULL AND c.content != "") ';
  } else if (archMode === 'distributed') {
    sql += ' AND (c.distributed_content IS NOT NULL AND c.distributed_content != "" OR c.content IS NOT NULL AND c.content != "") ';
  }

  sql += ' ORDER BY c.sort_order DESC';

  const result = db.exec(sql, params);
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    content: row[2],
    centralizedContent: row[3] || '',
    distributedContent: row[4] || '',
    description: row[5] || '',
    tags: row[6] || '',
    sortOrder: row[7],
    categoryId: row[8],
    categoryName: row[9] || '',
    categoryColor: row[10] || '#0066CC',
    categoryParentId: row[11],
    parentCategoryName: row[12] || '',
    parentCategoryColor: row[13] || '#0066CC'
  }));
}

export function updateCommandOrder(idList) {
  const maxOrder = idList.length;
  idList.forEach((id, index) => {
    db.run('UPDATE commands SET sort_order = ? WHERE id = ?', [maxOrder - index, id]);
  });
  saveDB();
}

// ========== 数据库文件操作 ==========

export function exportDatabaseFile() {
  const data = db.export();
  const blob = new Blob([data], { type: 'application/octet-stream' });
  return blob;
}

export function importDatabaseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const binaryArray = new Uint8Array(e.target.result);
        db = new SQL.Database(binaryArray);
        saveDB();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 恢复默认数据（删除所有数据并重新生成测试数据）
export function restoreDefaultData() {
  // 删除数据库中的所有数据
  db.run('DELETE FROM commands');
  db.run('DELETE FROM categories');
  // 重置自增 ID
  db.run('DELETE FROM sqlite_sequence WHERE name="commands"');
  db.run('DELETE FROM sqlite_sequence WHERE name="categories"');
  // 重新生成测试数据
  insertTestData();
  saveDB();
}

// 清空所有数据（删除所有数据，不重新生成测试数据）
export function clearAllData() {
  db.run('DELETE FROM commands');
  db.run('DELETE FROM categories');
  saveDB();
}