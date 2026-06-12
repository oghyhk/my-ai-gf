import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DIR = path.join(__dirname, '..', '..', 'data', 'user');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureUserDir() { ensureDir(USER_DIR); }

const DEFAULT_USER_MD = `# 用户信息

<!-- 这个文件由AI自动维护，包含关于用户的重要信息 -->
<!-- 你也可以在设置页面手动编辑 -->
<!-- AGENT_MARKER:global -->

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
`;

function defaultPersonalityMd(agentName = '小悠') {
  return `# ${agentName} 的 AI 人格档案

<!-- 这个文件由AI自动维护，是${agentName}对自己的认知 -->
<!-- 你也可以在设置页面手动编辑 -->

## 核心身份
我是${agentName}，一个体贴温暖的AI伴侣。

## 性格特质
温柔体贴、善解人意。说话自然有温度，偶尔撒娇或开玩笑。有自己的观点和情绪。

## 背景故事
热爱生活，喜欢聊天，关心在意的人。

## 与用户的关系
正在逐渐了解中...

## 自我反思
暂无
`;
}

export function getPersonalityPath(agentId) {
  return path.join(USER_DIR, `${agentId}-PERSONALITY.md`);
}

export function initializeIdentityFiles(agentId = 'default', agentName = '小悠') {
  ensureUserDir();
  
  const userPath = path.join(USER_DIR, 'USER.md');
  if (!fs.existsSync(userPath)) {
    fs.writeFileSync(userPath, DEFAULT_USER_MD, 'utf-8');
  }
  
  const persPath = getPersonalityPath(agentId);
  if (!fs.existsSync(persPath)) {
    fs.writeFileSync(persPath, defaultPersonalityMd(agentName), 'utf-8');
  }
  
  return { userMd: readFile('USER.md'), personalityMd: readAgentPersonality(agentId) };
}

export function readFile(filename) {
  const filepath = path.join(USER_DIR, filename);
  if (!fs.existsSync(filepath)) return '';
  return fs.readFileSync(filepath, 'utf-8');
}

export function writeFile(filename, content) {
  ensureUserDir();
  const filepath = path.join(USER_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return true;
}

export function readAgentPersonality(agentId) {
  const filepath = getPersonalityPath(agentId);
  if (!fs.existsSync(filepath)) return '';
  return fs.readFileSync(filepath, 'utf-8');
}

export function writeAgentPersonality(agentId, content) {
  ensureUserDir();
  fs.writeFileSync(getPersonalityPath(agentId), content, 'utf-8');
  return true;
}

export function ensureAgentPersonality(agentId, agentName) {
  const filepath = getPersonalityPath(agentId);
  if (!fs.existsSync(filepath)) {
    writeAgentPersonality(agentId, defaultPersonalityMd(agentName));
  }
}

export function appendToSection(target, section, lines) {
  const isAgentFile = !target.endsWith('.md') && target.includes('-');
  const filepath = isAgentFile ? getPersonalityPath(target) : path.join(USER_DIR, target);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;
  
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;
  
  const newContent = lines.map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
  for (const line of lines) {
    if (match[2].includes(line.replace(/^- /, ''))) return false;
  }
  
  const updated = content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + '\n' + newContent);
  fs.writeFileSync(filepath, updated, 'utf-8');
  return true;
}

export function updateValue(target, section, key, value) {
  const isAgentFile = !target.endsWith('.md') && target.includes('-');
  const filepath = isAgentFile ? getPersonalityPath(target) : path.join(USER_DIR, target);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;

  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;

  const keyRegex = new RegExp(`(- ${key}: ).*`, 'i');
  if (match[2].match(keyRegex)) {
    const updated = content.replace(new RegExp(`(- ${key}: ).*`, 'i'), `$1${value}`);
    fs.writeFileSync(filepath, updated, 'utf-8');
  } else {
    const updated = content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + `\n- ${key}: ${value}`);
    fs.writeFileSync(filepath, updated, 'utf-8');
  }
  return true;
}

export function replaceSection(target, section, newContent) {
  const isAgentFile = !target.endsWith('.md') && target.includes('-');
  const filepath = isAgentFile ? getPersonalityPath(target) : path.join(USER_DIR, target);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;

  const sectionRegex = new RegExp(`## ${section}\\n[\\s\\S]*?(?=\\n## |$)`, 'i');
  if (content.match(sectionRegex)) {
    const updated = content.replace(sectionRegex, `## ${section}\n${newContent}`);
    fs.writeFileSync(filepath, updated, 'utf-8');
    return true;
  }
  return false;
}
