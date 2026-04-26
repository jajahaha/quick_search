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
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#0066CC'
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

// 插入测试数据
function insertTestData() {
  const existing = db.exec('SELECT COUNT(*) FROM categories');
  if (existing.length && existing[0].values[0][0] > 0) {
    return;
  }

  const categories = [
    { name: 'Git', color: '#0F7B6C' },
    { name: 'NPM', color: '#E03E3E' },
    { name: 'Docker', color: '#14B8A6' },
    { name: '系统', color: '#7C3AED' }
  ];

  categories.forEach(cat => {
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [cat.name, cat.color]);
  });

  const commands = [
    { name: 'Git 提交', content: 'git commit -m "message"', categoryId: 1, description: '提交代码到本地仓库', tags: 'git,commit,基础' },
    { name: 'Git 推送', content: 'git push origin main', categoryId: 1, description: '推送代码到远程仓库', tags: 'git,push,远程' },
    { name: 'Git 拉取', content: 'git pull origin main', categoryId: 1, description: '拉取远程代码到本地', tags: 'git,pull,远程' },
    { name: 'Git 查看状态', content: 'git status', categoryId: 1, description: '查看当前工作区状态', tags: 'git,status,查看' },
    { name: 'Git 查看日志', content: 'git log --oneline -10', categoryId: 1, description: '查看最近10条提交记录', tags: 'git,log,查看' },
    { name: 'Git 撤销修改', content: 'git checkout -- <file>', categoryId: 1, description: '撤销文件修改', tags: 'git,checkout,撤销' },
    { name: 'NPM 安装依赖', content: 'npm install', categoryId: 2, description: '安装项目依赖', tags: 'npm,install,依赖' },
    { name: 'NPM 运行项目', content: 'npm run dev', categoryId: 2, description: '启动开发服务器', tags: 'npm,dev,运行' },
    { name: 'NPM 构建项目', content: 'npm run build', categoryId: 2, description: '构建生产版本', tags: 'npm,build,构建' },
    { name: 'NPM 清理缓存', content: 'npm cache clean --force', categoryId: 2, description: '清理npm缓存', tags: 'npm,cache,清理' },
    { name: 'Docker 查看容器', content: 'docker ps', categoryId: 3, description: '查看运行中的容器', tags: 'docker,ps,查看' },
    { name: 'Docker 查看镜像', content: 'docker images', categoryId: 3, description: '查看所有镜像', tags: 'docker,images,查看' },
    { name: 'Docker 启动容器', content: 'docker run -d --name <name> <image>', categoryId: 3, description: '启动一个新容器', tags: 'docker,run,启动' },
    { name: 'Docker 停止容器', content: 'docker stop <container_id>', categoryId: 3, description: '停止运行中的容器', tags: 'docker,stop,停止' },
    { name: 'Docker 进入容器', content: 'docker exec -it <container_id> bash', categoryId: 3, description: '进入容器终端', tags: 'docker,exec,终端' },
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

export function getCategories() {
  if (!db) return [];
  const result = db.exec('SELECT id, name, color FROM categories ORDER BY id');
  if (!result.length) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    color: row[2]
  }));
}

export function addCategory(name, color = '#0066CC') {
  db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color]);
  saveDB();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

export function updateCategory(id, name, color) {
  db.run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [name, color, id]);
  saveDB();
}

export function deleteCategory(id) {
  db.run('UPDATE commands SET category_id = NULL WHERE category_id = ?', [id]);
  db.run('DELETE FROM categories WHERE id = ?', [id]);
  saveDB();
}

// ========== 命令操作 ==========

export function getCommands(categoryId = null) {
  if (!db) return [];
  let sql = `
    SELECT c.id, c.name, c.content, c.description, c.tags, c.sort_order, c.category_id,
           cat.name as category_name, cat.color as category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
  `;
  const params = [];
  if (categoryId) {
    sql += ' WHERE c.category_id = ?';
    params.push(categoryId);
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
    categoryColor: row[8] || '#0066CC'
  }));
}

export function addCommand(name, content, categoryId, description, tags) {
  db.run(
    `INSERT INTO commands (name, content, category_id, description, tags) VALUES (?, ?, ?, ?, ?)`,
    [name, content, categoryId || null, description || '', tags || '']
  );
  saveDB();
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
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
           cat.name as category_name, cat.color as category_color
    FROM commands c
    LEFT JOIN categories cat ON c.category_id = cat.id
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
    categoryColor: row[8] || '#0066CC'
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