// P5 对话气泡 —— SillyTavern / TauriTavern UI 扩展
// 移植自阅读 App 段落脚本「奶茶のP5聚合(0904)」：对话气泡 / 论坛体 / 弹幕 + 10 套配色。
// 只改渲染后的 DOM，不改 chat 数据；消息文本一律走 textContent，不拼 innerHTML。

export const VERSION = '1.0.4';
const SETTINGS_KEY = 'p5Bubble';
const ERR_KEY = 'p5b_last_error';

/* ============================ 纯逻辑（可在 Node 中测试） ============================ */

// 颜色表原样搬自阅读脚本：l* = 左气泡/卡片，r* = 右气泡；B 底 T 字 S 描边 Sh 硬阴影；pal = 强调色
export const THEMES = {
    'P5柔和': { lB: '#DBD9DC', lT: '#555C67', lS: '#B0B6C0', lSh: '#B0B6C0', rB: '#3E4040', rT: '#EBEFF5', rS: '#B77B7B', rSh: '#AD7171', pal: ['#C17A7A', '#6C8AA3', '#B59765', '#6B9B7E', '#8C7AA3', '#B88562', '#5E9393'] },
    '温润奶咖': { lB: '#F2ECDE', lT: '#5C5248', lS: '#D4C4B7', lSh: '#D4C4B7', rB: '#E9DECE', rT: '#5D4F45', rS: '#C1A58D', rSh: '#C1A58D', pal: ['#AD1457', '#283593', '#2E7D32', '#E65100', '#455A64', '#6A1B9A', '#00695C'] },
    '冷萃青': { lB: '#ebf0ec', lT: '#5d6b63', lS: '#c4d1c9', lSh: '#c4d1c9', rB: '#cce3d8', rT: '#436357', rS: '#9abfb3', rSh: '#9abfb3', pal: ['#568A8C', '#6382B8', '#6D965E', '#B08851', '#A67A9E', '#B35B6A', '#7A6BA8'] },
    '樱粉手账': { lB: '#FFEFEF', lT: '#6B5D65', lS: '#F4D0DF', lSh: '#F4D0DF', rB: '#FFF9F5', rT: '#756362', rS: '#E6C3C3', rSh: '#E6C3C3', pal: ['#C47C8C', '#8FBCBB', '#A38B76', '#D08770', '#B48EAD', '#C96F6F', '#88C0D0'] },
    '绿森林': { lB: '#f2f7ef', lT: '#36522f', lS: '#d3e3cc', lSh: '#d3e3cc', rB: '#e4eedb', rT: '#1d401a', rS: '#b5cca9', rSh: '#b5cca9', pal: ['#2a7026', '#4c7314', '#1b5e20', '#636e1c', '#2e6927', '#3c5237', '#4a7a37'] },
    'P5暗黑': { lB: '#2E3239', lT: '#BCC4D1', lS: '#393F48', lSh: '#1A202C', rB: '#111112', rT: '#A5B0C2', rS: '#9A4242', rSh: '#823636', pal: ['#B56A6A', '#6593B8', '#B8A365', '#64A37A', '#977BB5', '#B58A61', '#5C9E97'] },
    '夜间Storm': { lB: '#24283b', lT: '#8c96c4', lS: '#414868', lSh: '#15161e', rB: '#2f3b61', rT: '#9ab0d4', rS: '#5a7bb5', rSh: '#3d59a1', pal: ['#6786C7', '#C96D7F', '#82A65F', '#B89560', '#9881C4', '#66A1C4', '#CC865E'] },
    'Latte深咖': { lB: '#2d2522', lT: '#d8ceca', lS: '#4a403d', lSh: '#1e1816', rB: '#3d332f', rT: '#e6deda', rS: '#5c4f4b', rSh: '#332a26', pal: ['#c77d54', '#8b9c73', '#b86a68', '#c9a05b', '#9e8293', '#6b9e95', '#7c8d9e'] },
    '复古红蓝': { lB: '#1d2029', lT: '#D9E0EE', lS: '#363a4f', lSh: '#11111b', rB: '#36292F', rT: '#E8D8DC', rS: '#5e4853', rSh: '#23181d', pal: ['#C0A8B3', '#9FAFE0', '#C296A1', '#8A9EC2', '#AD818C', '#A5B7E6', '#D9B4C0'] },
    '纯粹黑灰': { lB: '#242426', lT: '#aeb5c4', lS: '#3b3b3e', lSh: '#18181a', rB: '#47474A', rT: '#c2c8d6', rS: '#5e5e62', rSh: '#2f2f31', pal: ['#858d9e', '#939cac', '#a2abbc', '#b0b9ca', '#c0c8d8', '#caced8', '#dbe0e8'] },
};
export const DAY_PRESETS = ['P5柔和', '温润奶咖', '冷萃青', '樱粉手账', '绿森林'];
export const NIGHT_PRESETS = ['P5暗黑', '夜间Storm', 'Latte深咖', '复古红蓝', '纯粹黑灰'];

export const DEFAULTS = Object.freeze({
    enabled: true,
    dialogue: true,
    forum: false,      // 「名字：内容」整行 → 论坛卡；易误伤状态行，默认关
    danmu: false,      // 整行被 【】/[]/［］ 包住 → 弹幕；易误伤系统提示，默认关
    processUser: false,
    strict: true,      // 跳过带 class/style 的卡片自带 HTML 容器
    startSide: 'left',
    splitLength: 10,   // 台词达到该字数后遇句末标点拆成新气泡；0 = 不拆
    danmuSplitLength: 24,  // 弹幕单条达到该字数后在标点处断开；0 = 不断
    fontScale: 100,
    bubbleWidth: 0,    // 气泡最大宽度占消息区百分比；0 = 不限制（仅受基础 max-width 约束）
    mode: 'day',
    dayPreset: 'P5柔和',
    nightPreset: '夜间Storm',
    disabledChats: [],
});

const DANMU_PAIRS = [['［', '］'], ['[', ']'], ['【', '】']];
const FORUM_RE = /^([a-zA-Z0-9_\-\u4e00-\u9fa5\s\[\]【】]{1,25})\s*[：:]\s*(.+)$/;
const FORUM_VERB_RE = /(说|道|问|喊|叫|答|笑|吼|骂|叹|念|唤|应|回|斥|哼|嘀咕|低语|轻声|喝道|惊|吟|叮嘱|催促|了想)[^”“"「」『』【】]{0,4}$/;
const DIALOGUE_VERB_RE = /(说|道|问|喊|叫|答|笑|吼|骂|叹|念|唤|应|回|斥|哼|嘀咕|低语|轻声|喝道|吟|叮嘱|催促|惊|喜|了想|不安)[^”“"「」『』【】]{0,6}$/;
// 成对匹配，避免 “…」 这种错配被吃掉
const QUOTE_RE = /“([^”]*)”|"([^"\n]*)"|「([^」]*)」|『([^』]*)』/g;
const SPLIT_PUNC_RE = /[。！；？!?…~—]/;
const DANMU_SOFT_RE = /[，,、；;。.！!？?…~—：:]/;

export function hashText(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h += text.charCodeAt(i);
    return h;
}

function trimBrackets(s) {
    return String(s).replace(/^[\s\u3000【\[［]+/, '').replace(/[】\]］\s\u3000]+$/, '');
}

/** 整行被弹幕标记包住时返回内部文本，否则 null */
export function parseDanmu(line) {
    const t = line.trim();
    for (const [open, close] of DANMU_PAIRS) {
        if (t.length > open.length + close.length && t.startsWith(open) && t.endsWith(close)) {
            const inner = t.slice(open.length, t.length - close.length).trim();
            return inner || null;
        }
    }
    return null;
}

/** 「名字：内容」→ {name, content}；名字以说话动词结尾（"他笑道："）视为叙述，返回 null */
export function parseForum(line) {
    const m = line.trim().match(FORUM_RE);
    if (!m) return null;
    const name = trimBrackets(m[1]);
    const content = trimBrackets(m[2]).trim();
    if (!name || !content || FORUM_VERB_RE.test(name)) return null;
    return { name, content };
}

/** 判定为"台词"的引号段；短词引用（“规则”）不算 */
export function findDialogues(line) {
    const out = [];
    QUOTE_RE.lastIndex = 0;
    let m;
    while ((m = QUOTE_RE.exec(line)) !== null) {
        const inner = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
        if (!inner.trim()) continue;
        const before = line.slice(0, m.index).replace(/\s+$/, '');
        const lastChar = before.charAt(before.length - 1);
        const isSpeech = lastChar === '：' || lastChar === ':'
            || DIALOGUE_VERB_RE.test(before.slice(-20))
            || /[，,。；！？…—!?]/.test(inner)
            || inner.length >= 8;
        if (isSpeech) out.push({ start: m.index, end: m.index + m[0].length, text: inner.trim() });
    }
    return out;
}

/** 长台词按句末标点拆成多个气泡（与阅读脚本 maxBubbleLength 行为一致） */
export function splitDialogue(text, maxLen) {
    if (!maxLen || maxLen <= 0) return [text];
    const parts = [];
    let cur = '';
    for (let i = 0; i < text.length; i++) {
        cur += text[i];
        if (cur.length >= maxLen && SPLIT_PUNC_RE.test(text[i])) {
            while (i + 1 < text.length && SPLIT_PUNC_RE.test(text[i + 1])) cur += text[++i];
            parts.push(cur);
            cur = '';
        }
    }
    if (cur.trim()) parts.push(cur);
    return parts.map(s => s.trim()).filter(Boolean);
}

/**
 * 弹幕切字：单条太长时在标点处断开，实在没标点就按 1.5 倍阈值硬切。
 * 与 splitDialogue 的区别是阈值一到就断（弹幕是一整行，没有句末语义）。
 * 0 或负数 = 不切。
 */
export function splitDanmuText(text, maxLen) {
    const src = String(text ?? '');
    const n = Number(maxLen) || 0;
    if (n <= 0 || src.length <= n) return [src];
    const hard = Math.ceil(n * 1.5);
    const out = [];
    let cur = '';
    for (let i = 0; i < src.length; i++) {
        cur += src[i];
        if (DANMU_SOFT_RE.test(src[i]) && cur.length >= n) {
            while (i + 1 < src.length && DANMU_SOFT_RE.test(src[i + 1]) && cur.length < hard) cur += src[++i];
            out.push(cur);
            cur = '';
        } else if (cur.length >= hard) {
            out.push(cur);
            cur = '';
        }
    }
    if (cur.trim()) out.push(cur);
    return out.map(s => s.trim()).filter(Boolean);
}

/**
 * 分析一行文本。返回：
 *  {kind:'plain'} | {kind:'danmu', text} | {kind:'forum', name, content}
 *  | {kind:'dialogue', parts:[{type:'text', text} | {type:'bubble', texts:[...]}]}
 */
export function analyzeLine(line, opts) {
    const text = String(line ?? '');
    if (!text.trim()) return { kind: 'plain' };

    if (opts.danmu) {
        const inner = parseDanmu(text);
        if (inner) {
            const f = opts.forum ? parseForum(inner) : null;
            return f ? { kind: 'forum', ...f } : { kind: 'danmu', text: inner };
        }
    }

    if (opts.dialogue) {
        const ds = findDialogues(text);
        if (ds.length) {
            const parts = [];
            let pos = 0;
            for (const d of ds) {
                const before = text.slice(pos, d.start);
                if (before.trim()) parts.push({ type: 'text', text: before });
                parts.push({ type: 'bubble', texts: splitDialogue(d.text, opts.splitLength) });
                pos = d.end;
            }
            const after = text.slice(pos);
            if (after.trim()) parts.push({ type: 'text', text: after });
            return { kind: 'dialogue', parts };
        }
    }

    if (opts.forum) {
        const f = parseForum(text);
        if (f) return { kind: 'forum', ...f };
    }
    return { kind: 'plain' };
}

/** 气泡外形（坐标相对气泡盒 0,0,w,h；k = 字号/52，即阅读脚本 1080 画布的缩放比） */
export function bubblePath(side, w, h, k) {
    const sx = 14 * k, sy = 8 * k, c = 24 * k;
    const f = n => Math.round(n * 10) / 10;
    const pts = side === 'left'
        ? [[c, -sy], [w + sx, 0], [w, h - c], [w - c, h + sy], [60 * k, h + sy * 0.5], [-20 * k, h + 55 * k], [35 * k, h - 10 * k], [-sx, h - c]]
        : [[-sx, 0], [w - c, -sy], [w + sx, c], [w, h - c], [w - 35 * k, h - 10 * k], [w + 20 * k, h + 55 * k], [w - 60 * k, h + sy * 0.5], [c, h + sy], [0, h - c]];
    return 'M ' + pts.map(([x, y]) => f(x) + ' ' + f(y)).join(' L ') + ' Z';
}

function hexToRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

export function themeCss(theme, scale, width = 0) {
    const vars = ['lB', 'lT', 'lS', 'lSh', 'rB', 'rT', 'rS', 'rSh'].map(k => `--p5b-${k}:${theme[k]};`).join('');
    const pal = theme.pal.map((c, i) => `--p5b-p${i}:${c};`).join('');
    const w = Math.max(0, Math.min(100, Number(width) || 0));
    // 是「上限」不是固定宽度：气泡本身 width:fit-content，短的照样收缩、长的才被卡在 w%。
    // 再套一层 min()，保留 style.css 里 calc(100% - 2.2em) 的左右留白。
    const widthRule = w > 0 ? `body .mes_text .p5b-bubble{max-width:min(${w}%, calc(100% - 2.2em));}` : '';
    return `:root{${vars}${pal}--p5b-stripe:${hexToRgba(theme.pal[0], 0.15)};--p5b-scale:${scale};}${widthRule}`;
}

/* ============================ 运行时（仅浏览器） ============================ */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR = 'M50,5 L61,39 L97,39 L68,59 L79,93 L50,71 L21,93 L32,59 L3,39 L39,39 Z';
const BLOCKED_DESC = 'img,iframe,video,audio,svg,canvas,input,textarea,select,button,a,div,table,pre,code,ul,ol,details,script,style,p';
const BLOCKED_ANCESTOR = 'pre,code,table,details,summary,iframe,button,a,li,blockquote';

const state = {
    started: false,
    mo: null,               // #chat 的 MutationObserver：兜底捕获任何重绘
    retry: 0,               // 流式中的轮询定时器
    originals: new Map(),   // 改写过的 <p> → 原 innerHTML（用于还原/重渲染）
    seen: new WeakSet(),    // 已检查过的 <p>
    bubbles: new Set(),
    ro: null,
    listeners: [],
    timer: 0,
    relayout: 0,            // applyTheme 的 rAF 句柄（合并逐字输入的重画）
    styleEl: null,
};

const ctx = () => globalThis.SillyTavern.getContext();

function settings() {
    const c = ctx();
    const all = c.extensionSettings;
    const cur = all[SETTINGS_KEY] && typeof all[SETTINGS_KEY] === 'object' ? all[SETTINGS_KEY] : {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
        if (cur[k] === undefined) cur[k] = Array.isArray(v) ? [] : v;
    }
    if (!Array.isArray(cur.disabledChats)) cur.disabledChats = [];
    all[SETTINGS_KEY] = cur;
    return cur;
}

function save() { ctx().saveSettingsDebounced?.(); }

function chatKey() {
    const c = ctx();
    if (c.groupId) return 'group:' + c.groupId;
    const ch = c.characters?.[c.characterId];
    return ch?.avatar ? 'char:' + ch.avatar : '';
}

function activeForChat(s) {
    const key = chatKey();
    return s.enabled && !(key && s.disabledChats.includes(key));
}

function currentThemeName(s) {
    const name = s.mode === 'night' ? s.nightPreset : s.dayPreset;
    return THEMES[name] ? name : (s.mode === 'night' ? '夜间Storm' : 'P5柔和');
}

function applyTheme() {
    const s = settings();
    if (!state.styleEl) {
        state.styleEl = document.createElement('style');
        state.styleEl.id = 'p5b-theme';
        document.head.appendChild(state.styleEl);
    }
    const scale = Math.min(1.5, Math.max(0.6, Number(s.fontScale) / 100 || 1));
    state.styleEl.textContent = themeCss(THEMES[currentThemeName(s)], scale, s.bubbleWidth);
    // 宽度/字号变了要立刻重画 SVG 底形。ResizeObserver 要等下一帧，这里同步补一次；
    // 但面板是 input 事件驱动，逐字都会进来，所以用 rAF 合并到一帧内只画一次。
    if (!state.relayout) {
        state.relayout = requestAnimationFrame(() => {
            state.relayout = 0;
            state.bubbles.forEach(b => { if (b.isConnected) layoutBubble(b); });
        });
    }
    updateWandLabel();
}

function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}
function svgEl(tag, attrs) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
    return e;
}

function layoutBubble(b) {
    const w = b.offsetWidth, h = b.offsetHeight;
    if (!w || !h) return;
    const fs = parseFloat(getComputedStyle(b).fontSize) || 16;
    const k = fs / 52;
    const side = b.classList.contains('p5b-right') ? 'right' : 'left';
    const d = bubblePath(side, w, h, k);
    const svg = b.firstChild;
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    const [shadow, main, star] = svg.childNodes;
    shadow.setAttribute('d', d);
    shadow.setAttribute('transform', `translate(${14 * k} ${14 * k})`);
    main.setAttribute('d', d);
    main.setAttribute('stroke-width', 8 * k);
    const sx = side === 'left' ? 25 * k : w - 45 * k;
    star.setAttribute('transform', `translate(${sx} ${12 * k}) scale(${0.22 * k})`);
}

function makeBubble(text, side) {
    const b = el('div', `p5b-bubble p5b-${side}`);
    const svg = svgEl('svg', { class: 'p5b-shape', 'aria-hidden': 'true', focusable: 'false' });
    const star = svgEl('g', { class: 'p5b-star' });
    star.append(svgEl('path', { d: STAR, class: 'p5b-star-fill' }), svgEl('path', { d: STAR, class: 'p5b-star-line' }));
    svg.append(svgEl('path', { class: 'p5b-shadow' }), svgEl('path', { class: 'p5b-main' }), star);
    b.append(svg, el('span', 'p5b-text', text));
    state.bubbles.add(b);
    state.ro?.observe(b);
    return b;
}

function makeForum(name, content) {
    const card = el('div', 'p5b-forum');
    const wm = svgEl('svg', { class: 'p5b-forum-star', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
    wm.append(svgEl('path', { d: STAR }));
    const head = el('div', 'p5b-forum-head');
    const avatar = el('span', 'p5b-avatar', Array.from(name)[0]);
    avatar.setAttribute('aria-hidden', 'true');
    avatar.style.setProperty('--p5b-accent', `var(--p5b-p${hashText(name) % 7})`);
    head.append(avatar, el('span', 'p5b-forum-name', name));
    card.append(wm, head, el('div', 'p5b-forum-body', content));
    return card;
}

function makeDanmu(text, index) {
    const hash = hashText(text) + index * 31;
    const track = el('div', 'p5b-danmu-track');
    track.style.paddingLeft = [2, 18, 10][index % 3] + (hash % 12) + '%';
    const pill = el('span', 'p5b-danmu');
    pill.style.setProperty('--p5b-accent', `var(--p5b-p${hash % 7})`);
    if (hash % 5 === 0 && text.length > 2) {
        const badge = svgEl('svg', { class: 'p5b-badge', viewBox: '0 0 100 100', 'aria-hidden': 'true', focusable: 'false' });
        badge.append(svgEl('path', { d: STAR }));
        pill.append(badge);
    }
    pill.append(el('span', 'p5b-danmu-text', text));
    track.append(pill);
    return track;
}

/** 把 <p> 按 <br> 切行；Q 元素若被去掉了引号则补回，保证引号识别 */
function splitLines(p) {
    const lines = [{ nodes: [], text: '' }];
    for (const n of Array.from(p.childNodes)) {
        if (n.nodeName === 'BR') { lines.push({ nodes: [], text: '' }); continue; }
        const cur = lines[lines.length - 1];
        cur.nodes.push(n);
        let t = (n.textContent || '').replace(/\n/g, '');
        if (n.nodeName === 'Q' && t && !/^[“"「『]/.test(t)) t = '“' + t + '”';
        cur.text += t;
    }
    return lines;
}

function eligible(p, root, s) {
    if (p.querySelector(BLOCKED_DESC)) return false;
    if (s.strict && (p.hasAttribute('class') || p.hasAttribute('style'))) return false;
    for (let a = p.parentElement; a && a !== root; a = a.parentElement) {
        if (a.matches(BLOCKED_ANCESTOR)) return false;
        if (s.strict && (a.hasAttribute('class') || a.hasAttribute('style'))) return false;
    }
    return true;
}

function transformParagraph(p, root, s, counter) {
    state.seen.add(p);
    if (!eligible(p, root, s)) return;
    const lines = splitLines(p);
    const results = lines.map(l => analyzeLine(l.text, s));
    if (results.every(r => r.kind === 'plain')) return;

    const original = p.innerHTML;
    const frag = document.createDocumentFragment();
    lines.forEach((line, i) => {
        const r = results[i];
        if (r.kind === 'plain') {
            const div = el('div', 'p5b-line');
            if (line.text.trim()) div.append(...line.nodes);
            else div.append(document.createElement('br'));
            frag.append(div);
        } else if (r.kind === 'danmu') {
            // 切字后每段各占一条弹幕轨，长句不会撑破弹幕框
            for (const t of splitDanmuText(r.text, s.danmuSplitLength)) frag.append(makeDanmu(t, counter.danmu++));
        } else if (r.kind === 'forum') {
            frag.append(makeForum(r.name, r.content));
        } else {
            const side = counter.side++ % 2 === 0 ? s.startSide : (s.startSide === 'left' ? 'right' : 'left');
            for (const part of r.parts) {
                if (part.type === 'text') frag.append(el('div', 'p5b-line', part.text.trim()));
                else for (const t of part.texts) frag.append(makeBubble(t, side));
            }
        }
    });
    p.replaceChildren(frag);
    p.classList.add('p5b-host');
    state.originals.set(p, original);
}

function prune() {
    for (const b of state.bubbles) if (!b.isConnected) { state.ro?.unobserve(b); state.bubbles.delete(b); }
    for (const p of state.originals.keys()) if (!p.isConnected) state.originals.delete(p);
}

/**
 * 是否正在流式输出。只看停止按钮是否可见：
 * GENERATION_STARTED 也会被 dry run（隐藏助手等扩展的模拟生成）触发且不配对 GENERATION_ENDED，
 * 用事件维护的 generating 标记会卡死在 true，导致最新一楼永远被跳过。
 */
function isStreaming() {
    const stop = document.getElementById('mes_stop');
    return !!stop && getComputedStyle(stop).display !== 'none';
}

function scanAll() {
    state.timer = 0;
    prune();
    const s = settings();
    if (!activeForChat(s) || !(s.dialogue || s.forum || s.danmu)) return;
    const mesList = document.querySelectorAll('#chat .mes');
    const streaming = isStreaming();
    mesList.forEach((mes, idx) => {
        if (mes.getAttribute('is_user') === 'true' && !s.processUser) return;
        if (streaming && idx === mesList.length - 1) {
            // 流式中的最后一楼：不处理也不记 seen，轮询到停止按钮消失再处理
            if (!state.retry) state.retry = setTimeout(() => { state.retry = 0; schedule(0); }, 700);
            return;
        }
        const root = mes.querySelector('.mes_text');
        if (!root) return;
        const ps = Array.from(root.querySelectorAll('p')).filter(p => !state.seen.has(p));
        if (!ps.length) return;
        const counter = { side: root.querySelectorAll('.p5b-bubble').length ? 1 : 0, danmu: 0 };
        for (const p of ps) {
            try { transformParagraph(p, root, s, counter); }
            catch (e) { reportError('render', e); }
        }
    });
    state.mo?.takeRecords(); // 丢弃自己改 DOM 产生的记录，避免自激
}

function observeChat() {
    const chat = document.getElementById('chat');
    if (!chat || state.mo) return;
    state.mo = new MutationObserver(records => {
        for (const r of records) {
            const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
            if (t && !t.closest('.p5b-host')) { schedule(150); return; }
        }
    });
    state.mo.observe(chat, { childList: true, subtree: true, characterData: true });
}

function schedule(delay = 80) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(scanAll, delay);
}

function restoreAll() {
    if (state.timer) { clearTimeout(state.timer); state.timer = 0; }
    if (state.retry) { clearTimeout(state.retry); state.retry = 0; }
    if (state.relayout) { cancelAnimationFrame(state.relayout); state.relayout = 0; }
    for (const [p, html] of state.originals) {
        if (p.isConnected) { p.innerHTML = html; p.classList.remove('p5b-host'); }
    }
    state.originals.clear();
    state.seen = new WeakSet();
    state.ro?.disconnect();
    state.bubbles.clear();
}

function rerender() { restoreAll(); scanAll(); }

function reportError(where, e) {
    const msg = `[P5气泡] ${where}: ${e?.message || e}`;
    console.error(msg, e);
    try { localStorage.setItem(ERR_KEY, new Date().toISOString() + ' ' + msg); } catch { /* ignore */ }
    const w = document.getElementById('p5b_wand_label');
    if (w) w.textContent = 'P5气泡出错：' + (e?.message || e);
}

/* ---------------------------- 设置面板 / 魔棒菜单 ---------------------------- */

function optionList(names, selected) {
    return names.map(n => `<option value="${n}"${n === selected ? ' selected' : ''}>${n}</option>`).join('');
}

function buildPanel() {
    const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!host || document.getElementById('p5b_settings')) return;
    const s = settings();
    const wrap = el('div');
    wrap.id = 'p5b_settings';
    wrap.innerHTML = `
<div class="inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>P5 对话气泡</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content p5b-panel">
    <label class="checkbox_label"><input type="checkbox" data-k="enabled"> 总开关</label>
    <label class="checkbox_label"><input type="checkbox" id="p5b_chat_off"> 对当前角色/群聊停用</label>
    <hr class="sysHR">
    <label class="checkbox_label"><input type="checkbox" data-k="dialogue"> 对话气泡（“” "" 「」 『』）</label>
    <label class="checkbox_label"><input type="checkbox" data-k="forum"> 论坛体（整行「名字：内容」）</label>
    <label class="checkbox_label"><input type="checkbox" data-k="danmu"> 弹幕（整行被【】/[]/［］包住）</label>
    <label class="checkbox_label"><input type="checkbox" data-k="processUser"> 也处理用户消息</label>
    <label class="checkbox_label" title="关闭后会进入卡片自带的 HTML 容器里找段落，可能破坏卡片排版"><input type="checkbox" data-k="strict"> 严格模式（跳过卡片自带 HTML 容器）</label>
    <hr class="sysHR">
    <div class="p5b-row"><label for="p5b_side">首个气泡</label>
      <select id="p5b_side" class="text_pole" data-k="startSide"><option value="left">左</option><option value="right">右</option></select></div>
    <div class="p5b-row"><label for="p5b_split">长台词拆分（字，0=不拆）</label>
      <input id="p5b_split" class="text_pole" type="number" min="0" max="200" step="1" data-k="splitLength"></div>
    <div class="p5b-row"><label for="p5b_danmu_split">弹幕切字（字，0=不切）</label>
      <input id="p5b_danmu_split" class="text_pole" type="number" min="0" max="60" step="1" data-k="danmuSplitLength"></div>
    <div class="p5b-row"><label for="p5b_scale">气泡字号 %</label>
      <input id="p5b_scale" class="text_pole" type="number" min="60" max="150" step="5" data-k="fontScale"></div>
    <div class="p5b-row"><label for="p5b_width">气泡最大宽度 %（0=自适应）</label>
      <input id="p5b_width" class="text_pole" type="number" min="0" max="100" step="5" data-k="bubbleWidth"></div>
    <hr class="sysHR">
    <div class="p5b-row"><label for="p5b_mode">模式</label>
      <select id="p5b_mode" class="text_pole" data-k="mode"><option value="day">☀️ 日间</option><option value="night">🌙 夜间</option></select></div>
    <div class="p5b-row"><label for="p5b_day">日间配色</label>
      <select id="p5b_day" class="text_pole" data-k="dayPreset">${optionList(DAY_PRESETS, s.dayPreset)}</select></div>
    <div class="p5b-row"><label for="p5b_night">夜间配色</label>
      <select id="p5b_night" class="text_pole" data-k="nightPreset">${optionList(NIGHT_PRESETS, s.nightPreset)}</select></div>
    <div class="p5b-preview" aria-hidden="true"><span class="p5b-sw p5b-sw-l"></span><span class="p5b-sw p5b-sw-r"></span><span class="p5b-sw-pal"></span></div>
    <div class="p5b-row"><div id="p5b_rerender" class="menu_button" role="button" tabindex="0">重新渲染当前聊天</div></div>
    <small class="p5b-hint">只改显示，不改聊天记录。格式要求见世界书「P5气泡格式」。v${VERSION}</small>
  </div>
</div>`;
    host.appendChild(wrap);

    const THEME_KEYS = new Set(['mode', 'dayPreset', 'nightPreset', 'fontScale', 'bubbleWidth']);
    const LIVE_KEYS = new Set(['fontScale', 'bubbleWidth']);
    wrap.querySelectorAll('[data-k]').forEach(input => {
        const k = input.dataset.k;
        if (input.type === 'checkbox') input.checked = !!s[k];
        else input.value = s[k];
        const commit = () => {
            // 数字框清空时先别写 0，等用户输完
            if (input.type === 'number' && input.value === '') return;
            const cur = settings();
            cur[k] = input.type === 'checkbox' ? input.checked
                : input.type === 'number' ? Math.max(Number(input.min) || 0, Math.min(Number(input.max) || 999, Number(input.value) || 0))
                : input.value;
            save();
            // 字号/宽度只改样式，重画即可，不重扫 DOM
            if (THEME_KEYS.has(k)) applyTheme();
            else rerender();
        };
        input.addEventListener('change', commit);
        if (LIVE_KEYS.has(k)) input.addEventListener('input', commit);
    });
    const chatOff = wrap.querySelector('#p5b_chat_off');
    chatOff.addEventListener('change', () => {
        const cur = settings(), key = chatKey();
        if (!key) { chatOff.checked = false; return; }
        cur.disabledChats = cur.disabledChats.filter(x => x !== key);
        if (chatOff.checked) cur.disabledChats.push(key);
        save();
        rerender();
    });
    const rr = wrap.querySelector('#p5b_rerender');
    rr.addEventListener('click', rerender);
    rr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); rerender(); } });
    syncChatToggle();
}

function syncChatToggle() {
    const box = document.getElementById('p5b_chat_off');
    if (!box) return;
    const key = chatKey();
    box.disabled = !key;
    box.checked = !!key && settings().disabledChats.includes(key);
}

function buildWand() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu || document.getElementById('p5b_wand')) return;
    // 整项就是按钮：TT 的移动端菜单里塞不进跟着展开的下拉（原生 select 弹不出来），
    // 所以这里只做一件事——切日/夜，文案只留主题名。
    const item = el('div', 'list-group-item flex-container flexGap5 interactable p5b-wand');
    item.id = 'p5b_wand';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');

    const icon = el('div', 'fa-solid fa-sun extensionsMenuExtensionButton p5b-wand-icon');
    const text = el('span', 'p5b-wand-text');
    text.id = 'p5b_wand_text';

    // 出错时还得有地方写字（TT 没有控制台），正常时用 :empty 隐藏
    const label = el('span', 'p5b-wand-err');
    label.id = 'p5b_wand_label';

    item.append(icon, text, label);

    const toggle = () => {
        const s = settings();
        s.mode = s.mode === 'night' ? 'day' : 'night';
        save();
        applyTheme();
        syncPanelThemeSelects();
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

    menu.appendChild(item);
    updateWandLabel();
}

/** 面板里的模式下拉对齐到当前设置（从魔棒改过时用） */
function syncPanelThemeSelects() {
    const s = settings();
    const modeSel = document.getElementById('p5b_mode');
    if (modeSel) modeSel.value = s.mode;
    const day = document.getElementById('p5b_day');
    if (day) day.value = s.dayPreset;
    const night = document.getElementById('p5b_night');
    if (night) night.value = s.nightPreset;
}

function updateWandLabel() {
    const s = settings();
    const night = s.mode === 'night';
    const item = document.getElementById('p5b_wand');
    if (item) {
        const hint = night ? '夜间配色（点按切到日间）' : '日间配色（点按切到夜间）';
        item.title = hint;
        item.setAttribute('aria-label', `P5气泡 ${currentThemeName(s)}：${hint}`);
    }
    const icon = document.querySelector('#p5b_wand .p5b-wand-icon');
    if (icon) {
        icon.classList.toggle('fa-moon', night);
        icon.classList.toggle('fa-sun', !night);
    }
    // 文案只留主题名：日间 5 套 / 夜间 5 套各自的名字已经能说明当前模式
    const text = document.getElementById('p5b_wand_text');
    if (text) text.textContent = currentThemeName(s);
    // 不在这里清空 #p5b_wand_label：它是 TT 上唯一能看到的错误出口，留着给 reportError 用
}

/* ---------------------------- 生命周期 ---------------------------- */

function on(event, fn) {
    if (!event) return;
    ctx().eventSource.on(event, fn);
    state.listeners.push([event, fn]);
}

function start() {
    if (state.started) return;
    state.started = true;
    try {
        settings();
        state.ro = new ResizeObserver(entries => {
            for (const e of entries) if (e.target.isConnected) layoutBubble(e.target);
        });
        applyTheme();
        buildPanel();
        buildWand();
        const ET = ctx().eventTypes || ctx().event_types || {};
        const later = () => schedule();
        [ET.CHARACTER_MESSAGE_RENDERED, ET.USER_MESSAGE_RENDERED, ET.MESSAGE_UPDATED, ET.MESSAGE_SWIPED, ET.MORE_MESSAGES_LOADED]
            .forEach(ev => on(ev, later));
        on(ET.CHAT_CHANGED, () => { syncChatToggle(); rerender(); });
        on(ET.MESSAGE_RECEIVED, later);
        on(ET.GENERATION_ENDED, later);
        on(ET.GENERATION_STOPPED, later);
        observeChat();
        schedule(0);
    } catch (e) {
        reportError('init', e);
    }
}

export function onDisable() {
    try {
        const es = ctx().eventSource;
        for (const [ev, fn] of state.listeners) (es.removeListener || es.off)?.call(es, ev, fn);
    } catch { /* ignore */ }
    state.listeners = [];
    state.mo?.disconnect();
    state.mo = null;
    restoreAll();
    state.ro = null;
    state.styleEl?.remove();
    state.styleEl = null;
    document.getElementById('p5b_settings')?.remove();
    document.getElementById('p5b_wand')?.remove();
    state.started = false;
}

export function onClean() {
    onDisable();
    try {
        delete ctx().extensionSettings[SETTINGS_KEY];
        save();
        localStorage.removeItem(ERR_KEY);
    } catch { /* ignore */ }
}

if (typeof document !== 'undefined' && globalThis.SillyTavern?.getContext) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
}
