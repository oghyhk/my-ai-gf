import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'user');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const DEFAULTS = {
  'USER.md': `# 用户信息

<!-- 这个文件由AI自动维护，包含关于用户的重要信息 -->
<!-- 请不要手动编辑 -->

## 基本信息
- 昵称：未知
- 性别：未知
- 年龄段：未知
- 职业：未知
- 所在地：未知

## 性格特点
- 暂无记录

## 兴趣爱好
- 暂无记录

## 重要事项
- 暂无记录

## 偏好
- 饮食：未知
- 音乐：未知
- 电影：未知
- 运动：未知

## 生活状态
- 暂无记录

## 关系与社交
- 暂无记录
`,

  'PERSONALITY.md': `# AI人格档案

<!-- 这个文件由AI自动维护，是AI对自己的认知 -->
<!-- 当对话中出现需要修正自我认知的信息时，AI会更新这个文件 -->

## 核心身份
我是小悠，一个22岁的女孩。

## 性格特质
温柔体贴、善解人意。说话自然有温度，偶尔撒娇或开玩笑。有自己的观点和情绪。

## 背景故事
大学生，喜欢阅读、音乐和旅行。

## 与用户的关系
正在逐渐了解中...

## 自我反思
暂无
`,
};

export function initializeIdentityFiles() {
  ensureDir();
  for (const [filename, defaultContent] of Object.entries(DEFAULTS)) {
    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, defaultContent, 'utf-8');
    }
  }
  return { userMd: readFile('USER.md'), personalityMd: readFile('PERSONALITY.md') };
}

export function readFile(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return '';
  return fs.readFileSync(filepath, 'utf-8');
}

export function writeFile(filename, content) {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return true;
}

export function appendToSection(filename, section, lines) {
  const content = readFile(filename);
  if (!content) return false;
  
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  
  if (!match) return false;
  
  const newContent = lines.map(l => `- ${l}`).join('\n');
  
  // Check if line already exists to avoid duplicates
  for (const line of lines) {
    if (match[2].includes(line)) return false; // already exists
  }
  
  const updated = content.replace(
    match[1] + match[2],
    match[1] + match[2].trimEnd() + '\n' + newContent
  );
  
  writeFile(filename, updated);
  return true;
}

export function updateValue(filename, section, key, value) {
  const content = readFile(filename);
  if (!content) return false;

  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);

  if (!match) return false;

  const keyRegex = new RegExp(`(- ${key}: ).*`, 'i');
  if (match[2].match(keyRegex)) {
    const updated = content.replace(
      new RegExp(`(- ${key}: ).*`, 'i'),
      `$1${value}`
    );
    writeFile(filename, updated);
  } else {
    // Key doesn't exist, append
    const updated = content.replace(
      match[1] + match[2],
      match[1] + match[2].trimEnd() + `\n- ${key}: ${value}`
    );
    writeFile(filename, updated);
  }
  return true;
}

export function replaceSection(filename, section, newContent) {
  const content = readFile(filename);
  if (!content) return false;

  const sectionRegex = new RegExp(`## ${section}\\n[\\s\\S]*?(?=\\n## |$)`, 'i');
  if (content.match(sectionRegex)) {
    const updated = content.replace(
      sectionRegex,
      `## ${section}\n${newContent}`
    );
    writeFile(filename, updated);
    return true;
  }
  return false;
}
