import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DIR = path.join(__dirname, '..', '..', 'data', 'user');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function ensureUserDir() { ensureDir(USER_DIR); }

export function getUserMdPath(agentId = 'global') {
  return path.join(USER_DIR, `${agentId}-USER.md`);
}

export function getPersonalityPath(agentId) {
  return path.join(USER_DIR, `${agentId}-PERSONALITY.md`);
}

const USER_MD_TEMPLATE = `# 用户信息
<!-- AI自动维护，记录关于用户的信息 -->

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
<!-- AI自动维护 -->

## 核心身份
我是${agentName}，一个体贴温暖的AI伴侣。

## 性格特质
温柔体贴、善解人意。说话自然有温度，偶尔撒娇或开玩笑。

## 背景故事
热爱生活，喜欢聊天，关心在意的人。

## 与用户的关系
正在逐渐了解中...

## 自我反思
暂无
`;
}

// ---- Init ----

export function initializeIdentityFiles(agentId = 'default', agentName = '小悠') {
  ensureUserDir();
  const userPath = getUserMdPath(agentId);
  if (!fs.existsSync(userPath)) fs.writeFileSync(userPath, USER_MD_TEMPLATE, 'utf-8');
  const persPath = getPersonalityPath(agentId);
  if (!fs.existsSync(persPath)) fs.writeFileSync(persPath, defaultPersonalityMd(agentName), 'utf-8');
}

export function ensureAgentFiles(agentId, agentName) {
  ensureUserDir();
  const up = getUserMdPath(agentId);
  if (!fs.existsSync(up)) fs.writeFileSync(up, USER_MD_TEMPLATE, 'utf-8');
  const pp = getPersonalityPath(agentId);
  if (!fs.existsSync(pp)) fs.writeFileSync(pp, defaultPersonalityMd(agentName), 'utf-8');
}

// ---- User MD (per-agent) ----

export function readAgentUserMd(agentId = 'default') {
  const fp = getUserMdPath(agentId);
  if (!fs.existsSync(fp)) return USER_MD_TEMPLATE;
  return fs.readFileSync(fp, 'utf-8');
}

export function writeAgentUserMd(agentId, content) {
  ensureUserDir();
  fs.writeFileSync(getUserMdPath(agentId), content, 'utf-8');
}

// ---- Global User MD (for settings backward compat) ----

export function readGlobalUserMd() {
  const fp = path.join(USER_DIR, 'USER.md');
  if (!fs.existsSync(fp)) return USER_MD_TEMPLATE;
  return fs.readFileSync(fp, 'utf-8');
}

export function writeGlobalUserMd(content) {
  ensureUserDir();
  fs.writeFileSync(path.join(USER_DIR, 'USER.md'), content, 'utf-8');
}

// ---- Personality MD ----

export function readAgentPersonality(agentId) {
  const fp = getPersonalityPath(agentId);
  if (!fs.existsSync(fp)) return defaultPersonalityMd('AI');
  return fs.readFileSync(fp, 'utf-8');
}

export function writeAgentPersonality(agentId, content) {
  ensureUserDir();
  fs.writeFileSync(getPersonalityPath(agentId), content, 'utf-8');
}

// ---- Section Editing ----

function resolveFilepath(target, agentId) {
  // target can be: 'USER.md', 'global-USER.md', or agentId (for agent personality)
  if (target === 'global' || target === 'USER.md' || target === 'global-USER.md') {
    return path.join(USER_DIR, 'USER.md');
  }
  if (target.includes('-')) {
    return path.join(USER_DIR, `${target.substring(0, target.lastIndexOf('-')) || target}${target.includes('PERSONALITY') ? '-PERSONALITY.md' : '-USER.md'}`);
  }
  return getPersonalityPath(target);
}

export function appendToSection(target, section, lines, agentId = 'default') {
  const filepath = resolveFilepath(target, agentId);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;
  const newContent = lines.map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
  for (const line of lines) { if (match[2].includes(line.replace(/^- /, ''))) return false; }
  fs.writeFileSync(filepath, content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + '\n' + newContent), 'utf-8');
  return true;
}

export function updateValue(target, section, key, value, agentId = 'default') {
  const filepath = resolveFilepath(target, agentId);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;
  const keyRegex = new RegExp(`(- ${key}: ).*`, 'i');
  if (match[2].match(keyRegex)) {
    fs.writeFileSync(filepath, content.replace(new RegExp(`(- ${key}: ).*`, 'i'), `$1${value}`), 'utf-8');
  } else {
    fs.writeFileSync(filepath, content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + `\n- ${key}: ${value}`), 'utf-8');
  }
  return true;
}

export function replaceSection(target, section, newContent, agentId = 'default') {
  const filepath = resolveFilepath(target, agentId);
  const content = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  if (!content) return false;
  const sectionRegex = new RegExp(`## ${section}\\n[\\s\\S]*?(?=\\n## |$)`, 'i');
  if (content.match(sectionRegex)) {
    fs.writeFileSync(filepath, content.replace(sectionRegex, `## ${section}\n${newContent}`), 'utf-8');
    return true;
  }
  return false;
}
