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

  // 一级分类
  const categories = [
    { name: 'Git', color: '#0F7B6C', parentId: null },
    { name: 'NPM', color: '#E03E3E', parentId: null },
    { name: 'Docker', color: '#14B8A6', parentId: null },
    { name: '系统', color: '#7C3AED', parentId: null }
  ];

  categories.forEach(cat => {
    db.run('INSERT INTO categories (name, color, parent_id) VALUES (?, ?, ?)', [cat.name, cat.color, cat.parentId]);
  });

  // 二级分类
  const subCategories = [
    { name: '提交相关', color: '#0F7B6C', parentId: 1 },
    { name: '分支管理', color: '#0F7B6C', parentId: 1 },
    { name: '容器操作', color: '#14B8A6', parentId: 3 },
    { name: '镜像管理', color: '#14B8A6', parentId: 3 }
  ];

  subCategories.forEach(cat => {
    db.run('INSERT INTO categories (name, color, parent_id) VALUES (?, ?, ?)', [cat.name, cat.color, cat.parentId]);
  });

  // 命令（关联到二级分类）
  const commands = [
    { name: 'Git 提交', content: 'git commit -m "message"', categoryId: 5, description: '提交代码到本地仓库', tags: 'git,commit,基础' },
    { name: 'Git 推送', content: 'git push origin main', categoryId: 5, description: '推送代码到远程仓库', tags: 'git,push,远程' },
    { name: 'Git 拉取', content: 'git pull origin main', categoryId: 5, description: '拉取远程代码到本地', tags: 'git,pull,远程' },
    { name: 'Git 撤销修改', content: 'git checkout -- <file>', categoryId: 5, description: '撤销文件修改', tags: 'git,checkout,撤销' },
    { name: 'Git 创建分支', content: 'git branch <branch-name>', categoryId: 6, description: '创建新分支', tags: 'git,branch,分支' },
    { name: 'Git 切换分支', content: 'git checkout <branch-name>', categoryId: 6, description: '切换到指定分支', tags: 'git,checkout,分支' },
    { name: 'Git 合并分支', content: 'git merge <branch-name>', categoryId: 6, description: '合并指定分支到当前分支', tags: 'git,merge,分支' },
    { name: 'Git 查看状态', content: 'git status', categoryId: 5, description: '查看当前工作区状态', tags: 'git,status,查看' },
    { name: 'Git 查看日志', content: 'git log --oneline -10', categoryId: 5, description: '查看最近10条提交记录', tags: 'git,log,查看' },
    { name: 'NPM 安装依赖', content: 'npm install', categoryId: 2, description: '安装项目依赖', tags: 'npm,install,依赖' },
    { name: 'NPM 运行项目', content: 'npm run dev', categoryId: 2, description: '启动开发服务器', tags: 'npm,dev,运行' },
    { name: 'NPM 构建项目', content: 'npm run build', categoryId: 2, description: '构建生产版本', tags: 'npm,build,构建' },
    { name: 'NPM 清理缓存', content: 'npm cache clean --force', categoryId: 2, description: '清理npm缓存', tags: 'npm,cache,清理' },
    { name: 'Docker 查看容器', content: 'docker ps', categoryId: 7, description: '查看运行中的容器', tags: 'docker,ps,查看' },
    { name: 'Docker 启动容器', content: 'docker run -d --name <name> <image>', categoryId: 7, description: '启动一个新容器', tags: 'docker,run,启动' },
    { name: 'Docker 停止容器', content: 'docker stop <container_id>', categoryId: 7, description: '停止运行中的容器', tags: 'docker,stop,停止' },
    { name: 'Docker 进入容器', content: 'docker exec -it <container_id> bash', categoryId: 7, description: '进入容器终端', tags: 'docker,exec,终端' },
    { name: 'Docker 查看镜像', content: 'docker images', categoryId: 8, description: '查看所有镜像', tags: 'docker,images,查看' },
    { name: 'Docker 拉取镜像', content: 'docker pull <image>', categoryId: 8, description: '拉取远程镜像', tags: 'docker,pull,镜像' },
    { name: 'Docker 删除镜像', content: 'docker rmi <image_id>', categoryId: 8, description: '删除本地镜像', tags: 'docker,rmi,镜像' },
    { name: '查看端口占用', content: 'netstat -ano | findstr :<port>', categoryId: 4, description: 'Windows查看端口占用', tags: 'netstat,端口,Windows' },
    { name: '强制结束进程', content: 'taskkill /F /PID <pid>', categoryId: 4, description: '强制结束指定进程', tags: 'taskkill,进程,Windows' },
    { name: '查看系统信息', content: 'systeminfo', categoryId: 4, description: '查看系统详细信息', tags: 'systeminfo,系统,Windows' },
    { name: 'Ping 测试', content: 'ping <host>', categoryId: 4, description: '测试网络连通性', tags: 'ping,网络,测试' },
  ];

  commands.forEach(cmd => {
    db.run(
      'INSERT INTO commands (name, content, category_id, description, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [cmd.name, cmd.content, cmd.categoryId, cmd.description, cmd.tags, cmd.name.length * 10]
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
  const result = db.exec('SELECT id, name, color, parent_id FROM categories ORDER BY id');
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2],
    parentId: row[3]
  }));
}

// 获取树形分类结构
export function getCategoryTree() {
  if (!db) return [];
  const allCategories = getAllCategories();
  const tree = [];

  // 先构建一级分类
  allCategories.filter(c => c.parentId === null).forEach(parent => {
    const node = {
      id: parent.id,
      name: parent.name,
      color: parent.color,
      children: []
    };
    // 添加二级分类
    allCategories.filter(c => c.parentId === parent.id).forEach(child => {
      node.children.push({
        id: child.id,
        name: child.name,
        color: child.color,
        parentId: child.parentId
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

export function clearAllData() {
  // 删除数据库中的所有数据
  db.run('DELETE FROM commands');
  db.run('DELETE FROM categories');
  // 立即保存空数据库到 localStorage
  saveDB();
  // 删除 localStorage 缓存，让下次刷新重新生成测试数据
  localStorage.removeItem(DB_KEY);
}