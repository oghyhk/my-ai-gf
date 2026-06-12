import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DIR = path.resolve(config.data.path, 'user');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function ensureUserDir() { ensureDir(USER_DIR); }

export function getUserMdPath(agentId) {
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

function defaultPersonalityMd(agentName = 'AI') {
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

export function ensureAgentFiles(agentId, agentName) {
  ensureUserDir();
  const up = getUserMdPath(agentId);
  if (!fs.existsSync(up)) fs.writeFileSync(up, USER_MD_TEMPLATE, 'utf-8');
  const pp = getPersonalityPath(agentId);
  if (!fs.existsSync(pp)) fs.writeFileSync(pp, defaultPersonalityMd(agentName), 'utf-8');
}

// ---- Read ----

export function readAgentUserMd(agentId) {
  const fp = getUserMdPath(agentId);
  if (!fs.existsSync(fp)) return USER_MD_TEMPLATE;
  return fs.readFileSync(fp, 'utf-8');
}

export function readAgentPersonality(agentId) {
  const fp = getPersonalityPath(agentId);
  if (!fs.existsSync(fp)) return defaultPersonalityMd('AI');
  return fs.readFileSync(fp, 'utf-8');
}

// ---- Write ----

export function writeAgentUserMd(agentId, content) {
  ensureUserDir();
  fs.writeFileSync(getUserMdPath(agentId), content, 'utf-8');
}

export function writeAgentPersonality(agentId, content) {
  ensureUserDir();
  fs.writeFileSync(getPersonalityPath(agentId), content, 'utf-8');
}

// ---- Section editing (target = 'user' or 'self') ----

function resolvePath(agentId, target) {
  if (target === 'user') return getUserMdPath(agentId);
  return getPersonalityPath(agentId);
}

function readResolved(agentId, target) {
  const fp = resolvePath(agentId, target);
  if (!fs.existsSync(fp)) return '';
  return fs.readFileSync(fp, 'utf-8');
}

export function appendToSection(agentId, target, section, lines) {
  const content = readResolved(agentId, target);
  if (!content) return false;
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;
  const newContent = lines.map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n');
  for (const line of lines) { if (match[2].includes(line.replace(/^- /, ''))) return false; }
  fs.writeFileSync(resolvePath(agentId, target), content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + '\n' + newContent), 'utf-8');
  return true;
}

export function updateValue(agentId, target, section, key, value) {
  const content = readResolved(agentId, target);
  if (!content) return false;
  const sectionRegex = new RegExp(`(## ${section}\\n)([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(sectionRegex);
  if (!match) return false;
  const keyRegex = new RegExp(`(- ${key}: ).*`, 'i');
  if (match[2].match(keyRegex)) {
    fs.writeFileSync(resolvePath(agentId, target), content.replace(new RegExp(`(- ${key}: ).*`, 'i'), `$1${value}`), 'utf-8');
  } else {
    fs.writeFileSync(resolvePath(agentId, target), content.replace(match[1] + match[2], match[1] + match[2].trimEnd() + `\n- ${key}: ${value}`), 'utf-8');
  }
  return true;
}

export function replaceSection(agentId, target, section, newContent) {
  const content = readResolved(agentId, target);
  if (!content) return false;
  const sectionRegex = new RegExp(`## ${section}\\n[\\s\\S]*?(?=\\n## |$)`, 'i');
  if (content.match(sectionRegex)) {
    fs.writeFileSync(resolvePath(agentId, target), content.replace(sectionRegex, `## ${section}\n${newContent}`), 'utf-8');
    return true;
  }
  return false;
}
