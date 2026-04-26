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
      category_id INTEGER,
      description TEXT,
      tags TEXT,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
}

// 兼容已有数据：检查并添加 parent_id 列
function migrateDatabase() {
  try {
    const columns = db.exec('PRAGMA table_info(categories)');
    if (columns.length) {
      const hasParentId = columns[0].values.some(col => col[1] === 'parent_id');
      if (!hasParentId) {
        db.run('ALTER TABLE categories ADD COLUMN parent_id INTEGER DEFAULT NULL');
        console.log('Database migrated: added parent_id column');
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

export function getCommands(categoryId = null) {
  if (!db) return [];

  let sql = `
    SELECT c.id, c.name, c.content, c.description, c.tags, c.sort_order, c.category_id,
           cat.name as category_name, cat.color as category_color, cat.parent_id as category_parent_id,
           parent.name as parent_category_name, parent.color as parent_category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories parent ON cat.parent_id = parent.id
  `;
  const params = [];

  if (categoryId) {
    // 获取该分类及其子分类的 ID
    const categoryIds = getCategoryWithChildrenIds(categoryId);
    sql += ` WHERE c.category_id IN (${categoryIds.map(() => '?').join(',')}) `;
    params.push(...categoryIds);
  }

  sql += ' ORDER BY c.sort_order DESC, c.id DESC';

  const result = db.exec(sql, params);
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    content: row[2],
    description: row[3] || '',
    tags: row[4] || '',
    sortOrder: row[5],
    categoryId: row[6],
    categoryName: row[7] || '',
    categoryColor: row[8] || '#0066CC',
    categoryParentId: row[9],
    parentCategoryName: row[10] || '',
    parentCategoryColor: row[11] || '#0066CC'
  }));
}

export function addCommand(name, content, categoryId, description, tags) {
  const maxOrderResult = db.exec('SELECT MAX(sort_order) FROM commands');
  const maxOrder = maxOrderResult.length && maxOrderResult[0].values[0][0]
    ? maxOrderResult[0].values[0][0] + 1
    : 100;

  const finalCategoryId = (categoryId === null || categoryId === undefined || categoryId === 0) ? null : categoryId;

  db.run(
    `INSERT INTO commands (name, content, category_id, description, tags, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, content, finalCategoryId, description || '', tags || '', maxOrder]
  );
  const newId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  saveDB();
  return newId;
}

export function updateCommand(id, name, content, categoryId, description, tags) {
  db.run(
    `UPDATE commands SET name = ?, content = ?, category_id = ?, description = ?, tags = ? WHERE id = ?`,
    [name, content, categoryId || null, description || '', tags || '', id]
  );
  saveDB();
}

export function deleteCommand(id) {
  db.run('DELETE FROM commands WHERE id = ?', [id]);
  saveDB();
}

export function searchCommands(keyword) {
  if (!db) return [];
  if (!keyword.trim()) return getCommands();

  const result = db.exec(`
    SELECT c.id, c.name, c.content, c.description, c.tags, c.sort_order, c.category_id,
           cat.name as category_name, cat.color as category_color, cat.parent_id as category_parent_id,
           parent.name as parent_category_name, parent.color as parent_category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
    LEFT JOIN categories parent ON cat.parent_id = parent.id
    WHERE c.name LIKE ? OR c.content LIKE ? OR c.description LIKE ? OR c.tags LIKE ?
    ORDER BY c.sort_order DESC
  `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    content: row[2],
    description: row[3] || '',
    tags: row[4] || '',
    sortOrder: row[5],
    categoryId: row[6],
    categoryName: row[7] || '',
    categoryColor: row[8] || '#0066CC',
    categoryParentId: row[9],
    parentCategoryName: row[10] || '',
    parentCategoryColor: row[11] || '#0066CC'
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
  db.run('DELETE FROM commands');
  db.run('DELETE FROM categories');
  saveDB();
}