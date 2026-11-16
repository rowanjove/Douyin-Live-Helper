// ==UserScript==
// @name         直播间小助手（直播间 {{LIVE_ROOM_ID}}）
// @namespace    https://live.douyin.com/generic-live-helper/{{LIVE_ROOM_ID}}
// @version      1.0.0
// @description  自定义抖音直播间：通用梗库、快捷弹幕、弹幕悬停交互、小窗截图加字配文、福袋嗅探预约、快捷键发弹幕、刷屏折叠过滤、画质记忆、干扰精简、全量配置备份与声明式 JSON 插件
// @author       Live Helper Contributors
// @match        https://live.douyin.com/*
// @noframes
// @grant        unsafeWindow
// @run-at       document-start
// @license      Apache-2.0
// ==/UserScript==

/*
 * Copyright 2026 rowanjove and contributors.
 * Licensed under the Apache License, Version 2.0.
 * https://www.apache.org/licenses/LICENSE-2.0
 * Distributed on an AS IS basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.
 * Modified from the original 2.2.1 userscript: generic branding/memes,
 * configurable room routing and isolated storage.
 * Original MIT attribution and permission notice follow:
 * MIT License
 *
 * Original userscript author: Ryan (as declared in the original @author metadata).
 * The original source declares @license MIT and contains no separate copyright notice.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function bootstrap(startAssistant) {
    'use strict';

    // Firefox 的 USERSCRIPT_WORLD 需要显式导出页面将调用的函数。
    function toPageFunction(fn, page) {
        return typeof exportFunction === 'function' ? exportFunction(fn, page) : fn;
    }

    if (window.top !== window.self) {
        return;
    }
    if (location.origin !== 'https://live.douyin.com') return;
    // 由生成工具填写。模板未配置时直接退出，不安装任何功能或路由监听。
    const TARGET_ROOM_ID = '{{LIVE_ROOM_ID}}';
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(TARGET_ROOM_ID)) return;
    const entryMatches = () => location.pathname === '/' + TARGET_ROOM_ID || location.pathname === '/' + TARGET_ROOM_ID + '/';
    // 其他页面只装路由引导：不读取配置、不扫描 DOM、不创建 UI、不安装播放器/网络 Hook。
    // 保留域名级 @match，兼容同一文档从其他直播间首次 SPA 进入目标房间。
    if (entryMatches()) {
        startAssistant(toPageFunction, entryMatches, TARGET_ROOM_ID);
    } else if (!window.__tmLiveHelperEntryV2) {
        window.__tmLiveHelperEntryV2 = true;
        let watching = true;
        const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const restores = [];
        const cleanup = () => {
            watching = false;
            restores.forEach(restore => restore());
            window.removeEventListener('popstate', onRoute);
            window.removeEventListener('hashchange', onRoute);
            window.removeEventListener('pageshow', onRoute);
            window.removeEventListener('pagehide', onHide);
            delete window.__tmLiveHelperEntryV2;
        };
        const onRoute = () => { if (watching && entryMatches()) { cleanup(); startAssistant(toPageFunction, entryMatches, TARGET_ROOM_ID); } };
        const onHide = (e) => { if (!e.persisted) cleanup(); };
        for (const name of ['pushState', 'replaceState']) {
            const original = page.history[name];
            const wrapped = toPageFunction(function (...args) {
                const result = original.apply(this, args);
                onRoute();
                return result;
            }, page);
            try {
                page.history[name] = wrapped;
                restores.push(() => { if (page.history[name] === wrapped) page.history[name] = original; });
            } catch (_) {}
        }
        window.addEventListener('popstate', onRoute);
        window.addEventListener('hashchange', onRoute);
        window.addEventListener('pageshow', onRoute);
        window.addEventListener('pagehide', onHide);
    }

})(function startAssistant(toPageFunction, entryMatches, roomId) {
    'use strict';
    // 必须在读取存储和安装功能 Hook 前校验完整路径，拒绝房号前缀和子路径。
    if (!entryMatches()) return;

    const STREAMER_NAME = '直播间 ' + roomId;
    const STORAGE_PREFIX = 'generic_live_helper_' + roomId + '_';
    const BRAND_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDk2IDk2Ij48cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHJ4PSIyNCIgZmlsbD0iIzI1NjNlYiIvPjxyZWN0IHg9IjE4IiB5PSIyMyIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQ0IiByeD0iMTIiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTI5IDYzdjE0bDE4LTE0IiBmaWxsPSJ3aGl0ZSIvPjxjaXJjbGUgY3g9IjM0IiBjeT0iNDUiIHI9IjQiIGZpbGw9IiMyNTYzZWIiLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjMjU2M2ViIi8+PGNpcmNsZSBjeD0iNjIiIGN5PSI0NSIgcj0iNCIgZmlsbD0iIzI1NjNlYiIvPjwvc3ZnPg==';
    const STORAGE_KEY = STORAGE_PREFIX + 'custom_danmu_list'; // 我的梗（按直播间隔离，不读取专属版收藏）
    const STARRED_KEY = STORAGE_PREFIX + 'starred_phrases_v2'; // ★ 星标梗
    const EXT_LIBS_KEY = STORAGE_PREFIX + 'external_phrase_libs_v2'; // 导入的外部梗库
    const MAX_PRESET_MEMES = 30;
    const MAX_PLUGIN_MEMES_TOTAL = 100;
    const MAX_STARRED_PHRASES = 100;
    const MAX_MY_PHRASES = 100;
    const MAX_EXTERNAL_LIBS = 2; // 440px 面板单行标签栏最多容纳 2 个外部库（恰好顶到右侧）
    const MAX_EXTERNAL_LIB_ITEMS = 80;
    const MAX_EXTERNAL_LIB_NAME_LEN = 6;
    const MAX_PHRASE_LEN = 60;
    const MAX_TXT_FILE_BYTES = 256 * 1024;
    const MAX_JSON_FILE_BYTES = 1024 * 1024;
    const ROI_KEY = STORAGE_PREFIX + 'capture_roi_v2';
    const LEGACY_KEY = STORAGE_PREFIX + 'canvas_hover_opt_in_v2';
    const SHOT_CONFIG_KEY = STORAGE_PREFIX + 'shot_config_v2';
    const LOTTERY_CONFIG_KEY = STORAGE_PREFIX + 'lottery_config_v2';
    const HOTKEYS_CONFIG_KEY = STORAGE_PREFIX + 'hotkeys_v2';
    const FILTER_CONFIG_KEY = STORAGE_PREFIX + 'danmu_filter_v2';
    const QUALITY_CONFIG_KEY = STORAGE_PREFIX + 'quality_pref_v2';
    const CLEAN_MODE_KEY = STORAGE_PREFIX + 'clean_mode_v2';
    const JSON_PLUGINS_KEY = STORAGE_PREFIX + 'json_plugins_v2';
    const FAN_STATUS_CONFIG_KEY = STORAGE_PREFIX + 'fan_status_v2';
    const SHOT_DB_NAME = STORAGE_PREFIX + 'live_helper_db_v2';
    const SHOT_DB_STORE = 'handles';
    const SHOT_DIR_HANDLE_KEY = 'capture_dir';
    const INSTANCE_KEY = '__tm_room_assistant_v2__';
    const MIN_MESSAGE_INTERVAL = 2200;
    const DEFAULT_ROI = Object.freeze({ x: 0.72, y: 0.05, w: 0.24, h: 0.29 });
    const DEFAULT_SHOT_CONFIG = Object.freeze({
        configured: false,
        saveMode: 'directory', // 'directory' | 'download' | 'clipboard'
        alsoCopyClipboard: true,
        format: 'webp', // 'webp' | 'jpeg' | 'png'
        quality: 0.85,
        maxWidth: 640,
        shortcut: { alt: true, shift: true, ctrl: false, meta: false, key: 's' },
        captionEnabled: false,
        captionText: '高光时刻！',
        captionPosition: 'bottom', // 'bottom' | 'top' | 'corner'
        captionStyle: 'outline', // 'outline' | 'banner'
    });
    const DEFAULT_LOTTERY_CONFIG = Object.freeze({
        enabled: true,
        autoSend: false,
        timingMode: 'before_draw', // 'before_draw' | 'after_detect'
        offsetSeconds: 15,
        jitterSeconds: 2,
        fallbackCommand: '',
        captureCommandFromChat: true,
        captureDurationSec: 15,
    });
    const DEFAULT_FILTER_CONFIG = Object.freeze({
        blockEnabled: true,
        blockKeywords: [],
        highlightKeywords: [],
        collapseSpam: true,
        collapseWindowSec: 8,
    });
    const DEFAULT_QUALITY_CONFIG = Object.freeze({
        preferredQuality: 'auto', // 'auto' | '原画' | '蓝光' | '超清' | '高清' | '流畅'
        rememberManual: true,
    });
    const DEFAULT_CLEAN_MODE_CONFIG = Object.freeze({
        hideGiftEffects: false,
        hideEntrance: false,
        hideRecommend: false,
    });
    const SAMPLE_JSON_PLUGIN = Object.freeze({
        id: 'generic-starter-pack',
        name: '通用互动扩展包（示例）',
        version: '1.0.0',
        author: 'Live Helper Contributors',
        enabled: true,
        description: '补充通用梗库、快捷跟风键、关键词高亮与配文模板（纯声明式 JSON，无 eval 执行）',
        memes: [
            { tag: '插件联动', text: '主播今天状态拉满！' },
            { tag: '插件联动', text: '这波操作属实有点含金量' },
        ],
        hotkeys: [
            { shortcut: 'Alt+Shift+1', text: '好活，当赏！👏' },
        ],
        filters: {
            blockKeywords: [],
            highlightKeywords: ['高能', '好活'],
        },
        captions: ['高光时刻', '含金量拉满', '高光预警'],
        hideSelectors: [],
        autoReplies: [
            { match: '几点下播', reply: '以主播实际安排为准~', cooldownSec: 45, mode: 'toast' },
        ],
    });

    if (window[INSTANCE_KEY]) return;
    window[INSTANCE_KEY] = true;

    const isTargetRoom = () => location.origin === 'https://live.douyin.com' && entryMatches();
    let roomEpoch = 0;
    let roomSuspended = false;
    const isCurrentRoom = (epoch) => epoch === roomEpoch && !roomSuspended && isTargetRoom();

    // 弹幕悬停默认开启，仅当用户显式关闭（存储为 '0'）时禁用
    let legacyCanvasEnabled = true;
    try {
        const savedLegacy = localStorage.getItem(LEGACY_KEY);
        if (savedLegacy !== null) {
            legacyCanvasEnabled = savedLegacy === '1';
        }
    } catch (_) {}

    const CODE_BASE_KEY_MAP = Object.freeze({
        Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
        Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`',
        Space: ' ',
    });

    function normalizeShortcutKeyName(rawKey) {
        const trimmed = typeof rawKey === 'string' ? rawKey.trim() : '';
        if (!trimmed) return rawKey === ' ' ? ' ' : '';
        const low = trimmed.toLowerCase();
        if (low === 'space' || low === 'spacebar') return ' ';
        if (/^f\d{1,2}$/i.test(trimmed)) return trimmed.toUpperCase();
        return trimmed.length === 1 ? low : trimmed;
    }

    function codeToBaseKey(code) {
        if (typeof code !== 'string' || !code) return '';
        if (/^Digit[0-9]$/.test(code)) return code.slice(5);
        if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
        if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
        if (/^F([1-9]|1[0-2])$/.test(code)) return code;
        return CODE_BASE_KEY_MAP[code] || '';
    }

    function normalizeShortcutEventKey(e) {
        if (!e) return '';
        const byCode = codeToBaseKey(e.code);
        if (byCode) return byCode;
        return normalizeShortcutKeyName(typeof e.key === 'string' ? e.key : '');
    }

    function parseShortcutString(str, fallback = DEFAULT_SHOT_CONFIG.shortcut) {
        if (typeof str !== 'string' || !str.trim()) return { ...fallback };
        const parts = str.split('+').map(p => p.trim()).filter(Boolean);
        if (!parts.length) return { ...fallback };
        let ctrl = false;
        let alt = false;
        let shift = false;
        let meta = false;
        let key = '';
        for (const p of parts) {
            const low = p.toLowerCase();
            if (low === 'ctrl' || low === 'control') ctrl = true;
            else if (low === 'alt' || low === 'option') alt = true;
            else if (low === 'shift') shift = true;
            else if (low === 'win' || low === 'meta' || low === 'cmd') meta = true;
            else key = normalizeShortcutKeyName(p);
        }
        if (!key || (!ctrl && !alt && !shift && !meta)) return { ...fallback };
        return { alt, shift, ctrl, meta, key };
    }

    function normalizeShortcut(sc, fallback = DEFAULT_SHOT_CONFIG.shortcut) {
        if (typeof sc === 'string') return parseShortcutString(sc, fallback);
        if (!sc || typeof sc !== 'object') return { ...fallback };
        const key = normalizeShortcutKeyName(sc.key) || fallback.key;
        const alt = !!sc.alt;
        const shift = !!sc.shift;
        const ctrl = !!sc.ctrl;
        const meta = !!sc.meta;
        if (!alt && !shift && !ctrl && !meta) return { ...fallback };
        return { alt, shift, ctrl, meta, key };
    }

    function formatShortcut(sc) {
        const s = normalizeShortcut(sc);
        const parts = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.alt) parts.push('Alt');
        if (s.shift) parts.push('Shift');
        if (s.meta) parts.push('Win');
        const keyLabel = s.key === ' ' ? 'Space' : (s.key.length === 1 ? s.key.toUpperCase() : s.key);
        parts.push(keyLabel);
        return parts.join('+');
    }

    function isSameShortcut(a, b) {
        const sa = normalizeShortcut(a);
        const sb = normalizeShortcut(b);
        return sa.alt === sb.alt && sa.shift === sb.shift && sa.ctrl === sb.ctrl && sa.meta === sb.meta && sa.key === sb.key;
    }

    function matchesShortcut(e, sc) {
        const s = normalizeShortcut(sc);
        if (!!e.altKey !== s.alt || !!e.shiftKey !== s.shift || !!e.ctrlKey !== s.ctrl || !!e.metaKey !== s.meta) {
            return false;
        }
        const ek = normalizeShortcutKeyName(typeof e.key === 'string' ? e.key : '');
        if (ek === s.key) return true;
        const ck = codeToBaseKey(e.code);
        return !!ck && ck === s.key;
    }

    function loadJsonStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function saveJsonStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (_) {
            showToast('设置未能持久保存：浏览器存储不可用或空间不足');
            return false;
        }
    }

    function loadShotConfig(parsedOverride) {
        const parsed = parsedOverride || loadJsonStorage(SHOT_CONFIG_KEY, null);
        if (!parsed || typeof parsed !== 'object') {
            return {
                ...DEFAULT_SHOT_CONFIG,
                shortcut: { ...DEFAULT_SHOT_CONFIG.shortcut },
            };
        }
        const saveMode = ['directory', 'download', 'clipboard'].includes(parsed.saveMode)
            ? parsed.saveMode
            : DEFAULT_SHOT_CONFIG.saveMode;
        const format = ['webp', 'jpeg', 'png'].includes(parsed.format)
            ? parsed.format
            : DEFAULT_SHOT_CONFIG.format;
        const qualityNum = Number(parsed.quality);
        const quality = Number.isFinite(qualityNum) && qualityNum >= 0.4 && qualityNum <= 1
            ? qualityNum
            : DEFAULT_SHOT_CONFIG.quality;
        const maxWidthNum = Number(parsed.maxWidth);
        const maxWidth = [0, 480, 640, 960].includes(maxWidthNum)
            ? maxWidthNum
            : DEFAULT_SHOT_CONFIG.maxWidth;
        const captionPosition = ['bottom', 'top', 'corner'].includes(parsed.captionPosition)
            ? parsed.captionPosition
            : DEFAULT_SHOT_CONFIG.captionPosition;
        const captionStyle = ['outline', 'banner'].includes(parsed.captionStyle)
            ? parsed.captionStyle
            : DEFAULT_SHOT_CONFIG.captionStyle;
        return {
            configured: !!parsed.configured,
            saveMode,
            alsoCopyClipboard: parsed.alsoCopyClipboard !== false,
            format,
            quality,
            maxWidth,
            shortcut: normalizeShortcut(parsed.shortcut),
            captionEnabled: !!parsed.captionEnabled,
            captionText: typeof parsed.captionText === 'string' ? parsed.captionText.slice(0, 60) : DEFAULT_SHOT_CONFIG.captionText,
            captionPosition,
            captionStyle,
        };
    }

    let shotConfig = loadShotConfig();

    function saveShotConfig(next) {
        shotConfig = loadShotConfig({
            ...shotConfig,
            ...(next || {}),
            shortcut: normalizeShortcut((next && next.shortcut) || shotConfig.shortcut),
        });
        saveJsonStorage(SHOT_CONFIG_KEY, shotConfig);
        return shotConfig;
    }

    function normalizeLotteryConfig(parsed) {
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_LOTTERY_CONFIG };
        const timingMode = ['before_draw', 'after_detect'].includes(parsed.timingMode)
            ? parsed.timingMode
            : DEFAULT_LOTTERY_CONFIG.timingMode;
        const off = Math.round(Number(parsed.offsetSeconds));
        const jit = Math.round(Number(parsed.jitterSeconds));
        const capSec = Math.round(Number(parsed.captureDurationSec));
        return {
            enabled: parsed.enabled !== false,
            autoSend: !!parsed.autoSend,
            timingMode,
            offsetSeconds: Number.isFinite(off) ? Math.max(1, Math.min(300, off)) : DEFAULT_LOTTERY_CONFIG.offsetSeconds,
            jitterSeconds: Number.isFinite(jit) ? Math.max(0, Math.min(15, jit)) : DEFAULT_LOTTERY_CONFIG.jitterSeconds,
            fallbackCommand: typeof parsed.fallbackCommand === 'string' ? parsed.fallbackCommand.trim().slice(0, 80) : '',
            captureCommandFromChat: parsed.captureCommandFromChat !== false,
            captureDurationSec: Number.isFinite(capSec) ? Math.max(5, Math.min(60, capSec)) : DEFAULT_LOTTERY_CONFIG.captureDurationSec,
        };
    }

    let lotteryConfig = normalizeLotteryConfig(loadJsonStorage(LOTTERY_CONFIG_KEY, null));
    function saveLotteryConfig(next) {
        lotteryConfig = normalizeLotteryConfig({ ...lotteryConfig, ...(next || {}) });
        saveJsonStorage(LOTTERY_CONFIG_KEY, lotteryConfig);
        return lotteryConfig;
    }

    function getLocalDateStr(ts = Date.now()) {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function normalizeFanState(parsed) {
        const today = getLocalDateStr();
        const raw = parsed && typeof parsed === 'object' ? parsed : {};
        const sameDay = raw.dateStr === today;
        const levelNum = Number(raw.level);
        const intimacyNum = Number(raw.intimacy);
        const nextIntimacyNum = Number(raw.nextIntimacy);
        const joinDaysNum = Number(raw.joinDays);
        const joinTimeMsNum = Number(raw.joinTimeMs);
        const watchSecNum = sameDay ? Number(raw.watchSec) : 0;
        const platWatchNum = sameDay ? Number(raw.platformWatchMin) : 0;
        return {
            dateStr: today,
            nickname: typeof raw.nickname === 'string' ? raw.nickname.trim().slice(0, 48) : '',
            level: Number.isFinite(levelNum) && levelNum >= 0 ? Math.floor(levelNum) : null,
            intimacy: Number.isFinite(intimacyNum) && intimacyNum >= 0 ? Math.floor(intimacyNum) : null,
            nextIntimacy: Number.isFinite(nextIntimacyNum) && nextIntimacyNum > 0 ? Math.floor(nextIntimacyNum) : null,
            litToday: sameDay && raw.litToday === true ? true : (sameDay && raw.litToday === false ? false : null),
            watchSec: Number.isFinite(watchSecNum) && watchSecNum >= 0 ? Math.min(86400, Math.floor(watchSecNum)) : 0,
            platformWatchMin: Number.isFinite(platWatchNum) && platWatchNum >= 0 ? Math.min(120, Math.floor(platWatchNum)) : 0,
            watchCompleted: sameDay && !!raw.watchCompleted,
            joinDays: Number.isFinite(joinDaysNum) && joinDaysNum > 0 ? Math.floor(joinDaysNum) : null,
            joinTimeMs: Number.isFinite(joinTimeMsNum) && joinTimeMsNum > 1e11 ? joinTimeMsNum : null,
            autoRefresh: raw.autoRefresh !== false,
            lastRefreshAtMs: 0,
        };
    }

    let fanState = normalizeFanState(loadJsonStorage(FAN_STATUS_CONFIG_KEY, null));
    let fanStateDirty = false;
    let lastFanSaveAtMs = 0;

    function resetFanDailyIfDateChanged() {
        const today = getLocalDateStr();
        if (fanState.dateStr === today) return false;
        fanState = normalizeFanState({
            ...fanState,
            dateStr: today,
            litToday: null,
            watchSec: 0,
            platformWatchMin: 0,
            watchCompleted: false,
        });
        fanStateDirty = true;
        return true;
    }

    function saveFanState(force = false) {
        const now = Date.now();
        if (!force && (!fanStateDirty || now - lastFanSaveAtMs < 15000)) return;
        const persisted = saveJsonStorage(FAN_STATUS_CONFIG_KEY, {
            dateStr: fanState.dateStr,
            nickname: fanState.nickname,
            level: fanState.level,
            intimacy: fanState.intimacy,
            nextIntimacy: fanState.nextIntimacy,
            litToday: fanState.litToday,
            watchSec: fanState.watchSec,
            platformWatchMin: fanState.platformWatchMin,
            watchCompleted: fanState.watchCompleted,
            joinDays: fanState.joinDays,
            joinTimeMs: fanState.joinTimeMs,
            autoRefresh: fanState.autoRefresh,
        });
        if (persisted) {
            fanStateDirty = false;
            lastFanSaveAtMs = now;
        }
    }

    function createDefaultHotkeys() {
        return [
            { id: 'hk-1', enabled: false, shortcut: { alt: true, shift: false, ctrl: false, meta: false, key: '1' }, text: '好活，当赏！👏' },
            { id: 'hk-2', enabled: false, shortcut: { alt: true, shift: false, ctrl: false, meta: false, key: '2' }, text: '给主播点个赞！' },
            { id: 'hk-3', enabled: false, shortcut: { alt: true, shift: false, ctrl: false, meta: false, key: '3' }, text: '优雅，实在是太优雅了蕾姐' },
        ];
    }

    function normalizeHotkeys(list) {
        if (!Array.isArray(list)) return createDefaultHotkeys();
        return list.slice(0, 12).map((item, idx) => ({
            id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 32) : `hk-${idx + 1}`,
            enabled: !!item?.enabled,
            shortcut: normalizeShortcut(item?.shortcut, { alt: true, shift: false, ctrl: false, meta: false, key: String((idx % 9) + 1) }),
            text: typeof item?.text === 'string' ? normalizeSingleLineText(item.text).slice(0, 240) : '',
        }));
    }

    let hotkeyItems = normalizeHotkeys(loadJsonStorage(HOTKEYS_CONFIG_KEY, null));
    function saveHotkeyItems(nextList) {
        hotkeyItems = normalizeHotkeys(nextList);
        saveJsonStorage(HOTKEYS_CONFIG_KEY, hotkeyItems);
        return hotkeyItems;
    }

    function splitKeywordInputOutsideRegex(str) {
        const out = [];
        let cur = '';
        let inRegex = false;
        let inClass = false;
        let escaped = false;
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (ch === '\r' || ch === '\n') {
                if (cur.trim()) out.push(cur);
                cur = '';
                inRegex = false;
                inClass = false;
                escaped = false;
                continue;
            }
            if (inRegex) {
                cur += ch;
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === '[') {
                    inClass = true;
                } else if (ch === ']' && inClass) {
                    inClass = false;
                } else if (ch === '/' && !inClass) {
                    // 消费正则标志位，如 /.../i
                    while (i + 1 < str.length && /[gimsuy]/i.test(str[i + 1])) {
                        cur += str[++i];
                    }
                    inRegex = false;
                }
                continue;
            }
            if (ch === ',' || ch === '，') {
                if (cur.trim()) out.push(cur);
                cur = '';
                continue;
            }
            if (ch === '/' && cur.trim() === '') {
                inRegex = true;
            }
            cur += ch;
        }
        if (cur.trim()) out.push(cur);
        return out;
    }

    function normalizeKeywordArray(arr, limit = 80) {
        const list = Array.isArray(arr) ? arr : (typeof arr === 'string' ? splitKeywordInputOutsideRegex(arr) : []);
        return [...new Set(list.map(s => String(s || '').trim().slice(0, 80)).filter(Boolean))].slice(0, limit);
    }

    function normalizeFilterConfig(parsed) {
        if (!parsed || typeof parsed !== 'object') {
            return {
                ...DEFAULT_FILTER_CONFIG,
                blockKeywords: [],
                highlightKeywords: [],
            };
        }
        const winSec = Math.round(Number(parsed.collapseWindowSec));
        return {
            blockEnabled: parsed.blockEnabled !== false,
            blockKeywords: normalizeKeywordArray(parsed.blockKeywords, 100),
            highlightKeywords: normalizeKeywordArray(parsed.highlightKeywords, 60),
            collapseSpam: parsed.collapseSpam !== false,
            collapseWindowSec: Number.isFinite(winSec) ? Math.max(2, Math.min(60, winSec)) : DEFAULT_FILTER_CONFIG.collapseWindowSec,
        };
    }

    let filterConfig = normalizeFilterConfig(loadJsonStorage(FILTER_CONFIG_KEY, null));
    function saveFilterConfig(next) {
        filterConfig = normalizeFilterConfig({ ...filterConfig, ...(next || {}) });
        saveJsonStorage(FILTER_CONFIG_KEY, filterConfig);
        return filterConfig;
    }

    function normalizeQualityConfig(parsed) {
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_QUALITY_CONFIG };
        const allowed = ['auto', '原画', '蓝光', '超清', '高清', '流畅'];
        return {
            preferredQuality: allowed.includes(parsed.preferredQuality) ? parsed.preferredQuality : 'auto',
            rememberManual: parsed.rememberManual !== false,
        };
    }

    let qualityConfig = normalizeQualityConfig(loadJsonStorage(QUALITY_CONFIG_KEY, null));
    function saveQualityConfig(next) {
        qualityConfig = normalizeQualityConfig({ ...qualityConfig, ...(next || {}) });
        saveJsonStorage(QUALITY_CONFIG_KEY, qualityConfig);
        return qualityConfig;
    }

    function normalizeCleanModeConfig(parsed) {
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CLEAN_MODE_CONFIG };
        return {
            hideGiftEffects: !!parsed.hideGiftEffects,
            hideEntrance: !!parsed.hideEntrance,
            hideRecommend: !!parsed.hideRecommend,
        };
    }

    let cleanModeConfig = normalizeCleanModeConfig(loadJsonStorage(CLEAN_MODE_KEY, null));
    function saveCleanModeConfig(next) {
        cleanModeConfig = normalizeCleanModeConfig({ ...cleanModeConfig, ...(next || {}) });
        saveJsonStorage(CLEAN_MODE_KEY, cleanModeConfig);
        return cleanModeConfig;
    }

    // 声明式 JSON 插件引擎（无 eval，严格白名单校验）
    function isSafePluginCssSelector(sel) {
        if (typeof sel !== 'string') return false;
        const s = sel.trim();
        if (!s || s.length > 120) return false;
        if (/[{};@]|expression|url\(/i.test(s)) return false;
        const low = s.toLowerCase();
        if (['*', 'html', 'body', 'head', 'video', 'canvas', '#chatroom', '.douyin-player'].includes(low)) {
            return false;
        }
        if (low.includes('tm-') || /\bvideo\b/.test(low) || /:root\b/.test(low)) return false;
        if (!/^[.#a-zA-Z0-9_\-\s>\[\]="':*()~+]+$/.test(s)) return false;
        // 每个逗号分隔的选择器末段都必须包含明确的 #id、.class 或 [attr]，禁止裸标签/通配隐藏整页
        const parts = s.split(',').map(p => p.trim()).filter(Boolean);
        if (!parts.length) return false;
        for (const part of parts) {
            const tokens = part.split(/[\s>+~]+/).filter(Boolean);
            const subject = tokens[tokens.length - 1] || '';
            const cleanSubject = subject.replace(/:[a-zA-Z0-9_-]+(?:\([^)]*\))?/g, '');
            if (!/[#.[]/.test(cleanSubject)) return false;
            if (/^(?:html|body|head|div|span|button|img|svg|canvas|video)$/i.test(cleanSubject)) return false;
        }
        if (typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function') {
            try {
                document.createDocumentFragment().querySelector(s);
            } catch (_) {
                return false;
            }
        }
        return true;
    }

    function validateAndNormalizePlugin(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('插件 JSON 必须是一个对象');
        }
        const name = String(raw.name || '').trim().slice(0, 40);
        if (!name) throw new Error('插件缺少必填字段 name');
        const rawId = String(raw.id || name)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);
        const id = rawId || `plugin-${Date.now().toString(36)}`;

        const memes = Array.isArray(raw.memes)
            ? raw.memes
                .filter(m => m && typeof m === 'object' && typeof m.text === 'string')
                .map(m => ({
                    tag: String(m.tag || name).trim().slice(0, 16) || '插件弹幕',
                    text: normalizeSingleLineText(m.text).slice(0, MAX_PHRASE_LEN),
                }))
                .filter(m => m.text)
                .slice(0, 100)
            : [];

        const hotkeys = Array.isArray(raw.hotkeys)
            ? raw.hotkeys
                .filter(h => h && typeof h === 'object' && typeof h.text === 'string' && h.shortcut)
                .map(h => ({
                    shortcut: normalizeShortcut(h.shortcut),
                    text: normalizeSingleLineText(h.text).slice(0, 240),
                }))
                .filter(h => h.text)
                .slice(0, 20)
            : [];

        const filters = {
            blockKeywords: normalizeKeywordArray(raw.filters?.blockKeywords, 80),
            highlightKeywords: normalizeKeywordArray(raw.filters?.highlightKeywords, 40),
        };

        const captions = normalizeKeywordArray(raw.captions, 30).map(c => c.slice(0, 60));

        const hideSelectors = Array.isArray(raw.hideSelectors)
            ? [...new Set(raw.hideSelectors.map(s => String(s || '').trim()).filter(isSafePluginCssSelector))].slice(0, 40)
            : [];

        const autoReplies = Array.isArray(raw.autoReplies)
            ? raw.autoReplies
                .filter(r => r && typeof r === 'object' && typeof r.match === 'string' && typeof r.reply === 'string')
                .map(r => {
                    const cd = Math.round(Number(r.cooldownSec));
                    return {
                        match: r.match.trim().slice(0, 80),
                        reply: normalizeSingleLineText(r.reply).slice(0, 200),
                        cooldownSec: Number.isFinite(cd) ? Math.max(5, Math.min(600, cd)) : 30,
                        mode: ['toast', 'fill', 'send'].includes(r.mode) ? r.mode : 'toast',
                    };
                })
                .filter(r => r.match && r.reply)
                .slice(0, 20)
            : [];

        return {
            id,
            name,
            version: String(raw.version || '1.0.0').trim().slice(0, 16),
            author: String(raw.author || '匿名').trim().slice(0, 24),
            description: String(raw.description || '').trim().slice(0, 160),
            enabled: raw.enabled !== false,
            allowAutoSend: raw.allowAutoSend === true,
            memes,
            hotkeys,
            filters,
            captions,
            hideSelectors,
            autoReplies,
        };
    }

    function loadJsonPlugins(rawList) {
        const list = Array.isArray(rawList) ? rawList : loadJsonStorage(JSON_PLUGINS_KEY, []);
        if (!Array.isArray(list)) return [];
        const out = [];
        const seenIds = new Set();
        for (const item of list.slice(0, 20)) {
            try {
                const norm = validateAndNormalizePlugin(item);
                if (seenIds.has(norm.id)) continue;
                seenIds.add(norm.id);
                out.push(norm);
            } catch (_) {}
        }
        return out;
    }

    let jsonPlugins = loadJsonPlugins();
    function saveJsonPlugins(nextList) {
        jsonPlugins = loadJsonPlugins(nextList);
        libraryMemesCache = null;
        saveJsonStorage(JSON_PLUGINS_KEY, jsonPlugins);
        return jsonPlugins;
    }

    function getActiveJsonPlugins() {
        return jsonPlugins.filter(p => p.enabled);
    }

    let cachedDirHandle = null;
    let cachedDirPermission = 'unknown';

    function getShowDirectoryPicker() {
        if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
            return window.showDirectoryPicker.bind(window);
        }
        if (typeof unsafeWindow !== 'undefined' && typeof unsafeWindow.showDirectoryPicker === 'function') {
            return unsafeWindow.showDirectoryPicker.bind(unsafeWindow);
        }
        return null;
    }

    let directoryRevision = 0;
    function openShotDb() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') return reject(new Error('INDEXEDDB_UNAVAILABLE'));
            let settled = false;
            const finish = (error, db) => {
                if (settled) { db?.close(); return; }
                settled = true;
                clearTimeout(timer);
                if (error) reject(error);
                else { db.onversionchange = () => db.close(); resolve(db); }
            };
            const timer = setTimeout(() => finish(new Error('INDEXEDDB_TIMEOUT')), 4000);
            let req;
            try { req = indexedDB.open(SHOT_DB_NAME, 1); }
            catch (error) { finish(error); return; }
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(SHOT_DB_STORE)) req.result.createObjectStore(SHOT_DB_STORE);
            };
            req.onsuccess = () => finish(null, req.result);
            req.onerror = () => finish(req.error || new Error('INDEXEDDB_OPEN_FAILED'));
            req.onblocked = () => finish(new Error('INDEXEDDB_BLOCKED'));
        });
    }

    async function withShotStore(mode, operation) {
        const db = await openShotDb();
        try {
            return await new Promise((resolve, reject) => {
                const tx = db.transaction(SHOT_DB_STORE, mode);
                const req = operation(tx.objectStore(SHOT_DB_STORE));
                tx.oncomplete = () => resolve(req?.result);
                tx.onerror = tx.onabort = () => reject(tx.error || new Error('INDEXEDDB_TRANSACTION_FAILED'));
            });
        } finally { db.close(); }
    }

    async function queryDirPermission(handle, requestIfNeeded = false) {
        if (!handle || typeof handle.queryPermission !== 'function') return 'unknown';
        try {
            let status = await handle.queryPermission({ mode: 'readwrite' });
            if (status !== 'granted' && requestIfNeeded && typeof handle.requestPermission === 'function') {
                status = await handle.requestPermission({ mode: 'readwrite' });
            }
            if (handle === cachedDirHandle) cachedDirPermission = status;
            return status;
        } catch (_) {
            if (handle === cachedDirHandle) cachedDirPermission = 'denied';
            return 'denied';
        }
    }

    async function loadSavedDirectoryHandle() {
        const revision = directoryRevision;
        try {
            const handle = await withShotStore('readonly', store => store.get(SHOT_DIR_HANDLE_KEY));
            if (revision !== directoryRevision) return cachedDirHandle;
            cachedDirHandle = handle || null;
            cachedDirPermission = 'unknown';
            if (handle) await queryDirPermission(handle, false);
            return handle;
        } catch (_) {
            if (revision === directoryRevision) { cachedDirHandle = null; cachedDirPermission = 'unknown'; }
            return null;
        }
    }

    async function saveDirectoryHandle(handle) {
        const revision = ++directoryRevision;
        cachedDirHandle = handle || null;
        cachedDirPermission = 'unknown';
        if (!handle) return false;
        await queryDirPermission(handle, false);
        if (revision !== directoryRevision) return false;
        try {
            await withShotStore('readwrite', store => store.put(handle, SHOT_DIR_HANDLE_KEY));
            return true;
        } catch (_) { return false; }
    }

    async function clearSavedDirectoryHandle() {
        directoryRevision++;
        cachedDirHandle = null;
        cachedDirPermission = 'unknown';
        try { await withShotStore('readwrite', store => store.delete(SHOT_DIR_HANDLE_KEY)); } catch (_) {}
    }

    let cachedAvatarUrl = '';
    let avatarObjectUrl = '';
    function getAvatarUrl() {
        if (cachedAvatarUrl) return cachedAvatarUrl;
        try {
            const commaIdx = BRAND_AVATAR.indexOf(',');
            const header = BRAND_AVATAR.slice(0, commaIdx);
            const mimeMatch = header.match(/data:([^;]+);base64/i);
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const bin = atob(BRAND_AVATAR.slice(commaIdx + 1));
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i);
            }
            avatarObjectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            cachedAvatarUrl = avatarObjectUrl;
            return cachedAvatarUrl;
        } catch (_) {
            cachedAvatarUrl = BRAND_AVATAR;
            return cachedAvatarUrl;
        }
    }

    function applyAvatarSrc(imgEl) {
        if (!imgEl) return;
        let triedDataFallback = false;
        imgEl.onerror = () => {
            if (!triedDataFallback && imgEl.src !== BRAND_AVATAR) {
                triedDataFallback = true;
                imgEl.src = BRAND_AVATAR;
                return;
            }
            imgEl.onerror = null;
        };
        imgEl.src = getAvatarUrl();
    }


    // 内置梗库（上限 30 条）
    const PRESET_MEMES = [
        { tag: '梗库', text: '前方高能，请系好安全带' },
        { tag: '梗库', text: '好家伙，我直接好家伙' },
        { tag: '梗库', text: '这波啊，这波是细节' },
        { tag: '梗库', text: '有一说一，确实' },
        { tag: '梗库', text: '这谁顶得住啊' },
        { tag: '梗库', text: '节目效果拉满' },
        { tag: '梗库', text: '优雅，太优雅了' },
        { tag: '梗库', text: '好活，当赏！' },
        { tag: '梗库', text: '这操作我给满分' },
        { tag: '梗库', text: '这波属于是拿捏了' },
        { tag: '梗库', text: '学到了，但没完全学会' },
        { tag: '梗库', text: '看懂了，但我不会' },
        { tag: '梗库', text: '此时一位靓仔路过' },
        { tag: '梗库', text: '来了来了，前排就位' },
        { tag: '梗库', text: '小板凳已经搬好了' },
        { tag: '梗库', text: '弹幕护体' },
        { tag: '梗库', text: '这就是传说中的高手吗' },
        { tag: '梗库', text: '这下不得不扣个666了' },
        { tag: '梗库', text: '这不得来个回放' },
        { tag: '梗库', text: '这段我能看一百遍' },
        { tag: '梗库', text: '万万没想到' },
        { tag: '梗库', text: '事情开始变得有趣了' },
        { tag: '梗库', text: '笑不活了家人们' },
        { tag: '梗库', text: '合理中带着一丝离谱' },
        { tag: '梗库', text: '离谱中又带着一丝合理' },
        { tag: '梗库', text: '别急，让我先笑一会儿' },
        { tag: '梗库', text: '这也在你的计算之中吗' },
        { tag: '梗库', text: '格局打开了' },
        { tag: '梗库', text: '主打一个陪伴' },
        { tag: '梗库', text: '今日份快乐已到账' }
    ].slice(0, MAX_PRESET_MEMES);

    // ==========================================
    // 1. 主世界 SPA 路由监听 & 可选旧版主线程弹幕模式
    // 弹幕悬停模式依赖平台内部回退机制；设置变化可能需要刷新播放器。
    // ==========================================
    function installSpaRouteWatcher() {
        try {
            const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (page.__tmSpaWatcherV2) return;
            const history = page.history;
            const restores = [];
            const notify = () => window.dispatchEvent(new Event('tm-locationchange'));
            for (const method of ['pushState', 'replaceState']) {
                const orig = history[method];
                if (typeof orig !== 'function') continue;
                const replacement = toPageFunction(function (...args) {
                    const ret = orig.apply(this, args);
                    notify();
                    return ret;
                }, page);
                history[method] = replacement;
                restores.push(() => { if (history[method] === replacement) history[method] = orig; });
            }
            page.__tmSpaWatcherV2 = { restore() {
                restores.forEach(restore => restore());
                delete page.__tmSpaWatcherV2;
            } };
        } catch (error) { console.warn('[直播间小助手] 路由监听安装失败', error); }
    }

    function installMainWorldTransferHook() {
        if (!legacyCanvasEnabled || !isTargetRoom()) return;
        try {
            const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (page.__tmCanvasHookV2) return;
            const proto = page.HTMLCanvasElement?.prototype;
            const desc = proto && Object.getOwnPropertyDescriptor(proto, 'transferControlToOffscreen');
            if (!desc || typeof desc.value !== 'function' || (!desc.writable && !desc.configurable)) return;
            const original = desc.value;
            const replacement = toPageFunction(function (...args) {
                if (isTargetRoom() &&
                    this.closest?.('.CanvasDanmakuPlugin')) return undefined;
                return original.apply(this, args);
            }, page);
            try {
                Object.defineProperty(proto, 'transferControlToOffscreen', { ...desc, value: replacement });
                page.__tmCanvasHookV2 = {
                    restore() {
                        if (proto.transferControlToOffscreen === replacement) {
                            Object.defineProperty(proto, 'transferControlToOffscreen', desc);
                        }
                        delete page.__tmCanvasHookV2;
                    }
                };
            } catch (_) {}
        } catch (_) {}
    }

    function restoreMainWorldTransferHook() {
        try {
            (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).__tmCanvasHookV2?.restore?.();
        } catch (_) {}
    }

    function installMainWorldLotterySniffer() {
        if (!isTargetRoom()) return;
        try {
            const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
            if (page.__tmLotterySniffV2) return;
            const epoch = roomEpoch;
            let enabled = true;
            const LOTTERY_URL_RE = /lottery|lucky_?bag|red_?packet|fudai|lucky_?box/i;
            const FAN_URL_RE = /fansclub|fans_club|fans_?badge|user\/me|user\/self|account\/user|webcast\/room\/enter|webcast\/im\/fetch|intimacy|welfare|task\/info/i;
            const isRoom = () => enabled && isCurrentRoom(epoch);
            const dispatchSniff = (eventName, url, data) => {
                if (!isRoom() || !data || typeof data !== 'object') return;
                window.dispatchEvent(new CustomEvent(eventName, { detail: { url, data } }));
            };
            const routeSniffPayload = (url, data) => {
                if (LOTTERY_URL_RE.test(url)) dispatchSniff('tm-lottery-sniff', url, data);
                if (FAN_URL_RE.test(url)) dispatchSniff('tm-fan-sniff', url, data);
            };

            const origFetch = page.fetch;
            let wrappedFetch = null;
            if (typeof origFetch === 'function') {
                wrappedFetch = toPageFunction(function (...args) {
                    const startedInRoom = isRoom();
                    const result = origFetch.apply(this, args);
                    // 返回原页面 Promise；不改变 fetch 的兑现时序，也不泄漏沙箱 Promise。
                    result.then((res) => {
                        try {
                            const url = String(typeof args[0] === 'string' ? args[0] : (args[0]?.url || args[0] || ''));
                            const ctype = res?.headers?.get?.('content-type') || '';
                            if (
                                startedInRoom && isRoom() &&
                                (LOTTERY_URL_RE.test(url) || FAN_URL_RE.test(url)) &&
                                res && res.ok && (!ctype || /json/i.test(ctype)) &&
                                typeof res.clone === 'function'
                            ) {
                                res.clone().json().then((data) => routeSniffPayload(url, data)).catch(() => {});
                            }
                        } catch (_) {}
                    }).catch(() => {});
                    return result;
                }, page);
                try { page.fetch = wrappedFetch; } catch (_) { wrappedFetch = null; }
            }

            const xhrProto = page.XMLHttpRequest?.prototype;
            const origXhrOpen = xhrProto?.open;
            const origXhrSend = xhrProto?.send;
            let wrappedXhrOpen = null;
            let wrappedXhrSend = null;
            const pendingXhrs = new Map();
            const clearXhr = (xhr) => {
                const listener = pendingXhrs.get(xhr);
                if (!listener) return;
                xhr.removeEventListener('load', listener);
                xhr.removeEventListener('loadend', listener.cleanup);
                pendingXhrs.delete(xhr);
            };
            if (typeof origXhrOpen === 'function' && typeof origXhrSend === 'function') {
                wrappedXhrOpen = toPageFunction(function (method, url, ...rest) {
                    clearXhr(this);
                    try { this.__tmReqUrl = typeof url === 'string' ? url : String(url || ''); } catch (_) {}
                    return origXhrOpen.call(this, method, url, ...rest);
                }, page);
                wrappedXhrSend = toPageFunction(function (...args) {
                    try {
                        const url = this.__tmReqUrl || '';
                        if (isRoom() && (LOTTERY_URL_RE.test(url) || FAN_URL_RE.test(url))) {
                            clearXhr(this);
                            const listener = function () {
                                try {
                                    if (!isRoom()) return;
                                    if (this.status < 200 || this.status >= 300) return;
                                    if (this.responseType === 'json' && this.response) {
                                        routeSniffPayload(url, this.response);
                                        return;
                                    }
                                    if ((!this.responseType || this.responseType === 'text') && typeof this.responseText === 'string') {
                                        const parsed = JSON.parse(this.responseText);
                                        routeSniffPayload(url, parsed);
                                    }
                                } catch (_) {}
                            };
                            listener.cleanup = () => clearXhr(this);
                            pendingXhrs.set(this, listener);
                            this.addEventListener('load', listener, { once: true });
                            this.addEventListener('loadend', listener.cleanup, { once: true });
                        }
                    } catch (_) {}
                    try { return origXhrSend.apply(this, args); }
                    catch (error) { clearXhr(this); throw error; }
                }, page);
                try {
                    xhrProto.open = wrappedXhrOpen;
                    xhrProto.send = wrappedXhrSend;
                } catch (_) {
                    xhrProto.open = origXhrOpen;
                    xhrProto.send = origXhrSend;
                    wrappedXhrOpen = null;
                    wrappedXhrSend = null;
                }
            }

            page.__tmLotterySniffV2 = {
                restore() {
                    enabled = false;
                    for (const xhr of pendingXhrs.keys()) clearXhr(xhr);
                    if (wrappedFetch && page.fetch === wrappedFetch) page.fetch = origFetch;
                    if (xhrProto && wrappedXhrOpen && xhrProto.open === wrappedXhrOpen) xhrProto.open = origXhrOpen;
                    if (xhrProto && wrappedXhrSend && xhrProto.send === wrappedXhrSend) xhrProto.send = origXhrSend;
                    delete page.__tmLotterySniffV2;
                }
            };
        } catch (error) { console.warn('[直播间小助手] 数据监听安装失败', error); }
    }

    function restoreMainWorldLotterySniffer() {
        try {
            (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).__tmLotterySniffV2?.restore?.();
        } catch (_) {}
    }

    installSpaRouteWatcher();
    if (isTargetRoom()) {
        installMainWorldTransferHook();
        installMainWorldLotterySniffer();
    }

    // ==========================================
    // 2. 全局样式注入（延迟至进入目标直播间后注入，并检测 DOM 存活）
    // ==========================================
    function ensureGlobalStyles() {
        if (!isTargetRoom()) return false;
        const existing = document.getElementById('tm-danmu-styles');
        if (existing && existing.isConnected && existing.textContent === globalStyles) {
            return true;
        }
        const target = document.head || document.documentElement;
        if (!target) return false;
        const style = existing || document.createElement('style');
        style.id = 'tm-danmu-styles';
        style.type = 'text/css';
        if (style.textContent !== globalStyles) {
            style.textContent = globalStyles;
        }
        if (style.parentElement !== target) {
            target.appendChild(style);
        }
        return true;
    }

    const globalStyles = `
        /* 通用直播工作台 · 主题色板（固定白底，深蓝文字与浅蓝交互，不跟随站点暗色主题） */
        #tm-danmu-panel,
        .tm-shot-box,
        #tm-danmu-actions,
        #tm-toast {
            --tm-bg: #ffffff;
            --tm-bg-elevated: #ffffff;
            --tm-bg-subtle: #f4f8ff;
            --tm-bg-hover: #e8f1ff;
            --tm-border: #dce6f2;
            --tm-border-strong: #b9cce3;
            --tm-text: #17365d;
            --tm-text-muted: #526b88;
            --tm-text-dim: #667d98;
            --tm-accent: #1d4ed8;
            --tm-accent-solid: #2563eb;
            --tm-accent-hover: #1e40af;
            --tm-accent-soft: #eaf2ff;
            --tm-amber: #1e40af;
            --tm-amber-soft: #eaf2ff;
            --tm-success: #1d4ed8;
            --tm-success-soft: #eaf2ff;
            --tm-danger: #c53030;
            --tm-shadow: 0 16px 44px rgba(23, 54, 93, 0.16), 0 0 0 1px var(--tm-border);
            --tm-font: "PingFang SC", "Microsoft YaHei UI", "Segoe UI", system-ui, -apple-system, sans-serif;
            font-family: var(--tm-font);
            color: var(--tm-text);
        }

        /* 悬浮图标按钮 */
        #tm-danmu-ball {
            position: fixed;
            bottom: 136px;
            right: 16px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(255, 255, 255, 0.24);
            cursor: pointer;
            z-index: 2147483640;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
            user-select: none;
            pointer-events: auto !important;
            overflow: visible;
        }
        #tm-danmu-ball:hover {
            transform: scale(1.08);
            box-shadow: 0 10px 26px rgba(0, 0, 0, 0.58), 0 0 0 2px #3b82f6;
        }
        #tm-danmu-ball:active {
            transform: scale(0.95);
        }
        #tm-danmu-ball img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            pointer-events: none;
            display: block;
        }
        #tm-danmu-ball.tm-has-lottery::after {
            content: '';
            position: absolute;
            top: -1px;
            right: -1px;
            width: 11px;
            height: 11px;
            border-radius: 50%;
            background: #2563eb;
            border: 2px solid #ffffff;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
            animation: tm-pulse-amber 1.8s infinite;
        }
        @keyframes tm-pulse-amber {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.65); }
            70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        /* 播放器控制栏按钮 */
        .tm-ctrl-slot {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: auto !important;
            position: relative !important;
            z-index: 50 !important;
            margin: 0 8px !important;
            height: 32px !important;
        }
        .tm-toolbar-btn {
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            height: 26px !important;
            padding: 0 10px 0 6px !important;
            background: #ffffff !important;
            color: #17365d !important;
            font-size: 12px !important;
            font-weight: 500 !important;
            line-height: 1 !important;
            border-radius: 999px !important;
            border: 1px solid #b9cce3 !important;
            cursor: pointer !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35) !important;
            transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease !important;
            pointer-events: auto !important;
            user-select: none !important;
            white-space: nowrap !important;
            backdrop-filter: blur(8px) !important;
        }
        .tm-toolbar-btn:hover {
            transform: translateY(-1px) !important;
            background: #eaf2ff !important;
            border-color: rgba(59, 130, 246, 0.72) !important;
        }
        .tm-toolbar-btn:active {
            transform: scale(0.96) !important;
        }
        .tm-toolbar-btn.tm-has-lottery {
            border-color: rgba(59, 130, 246, 0.75) !important;
        }
        .tm-toolbar-btn img {
            width: 16px !important;
            height: 16px !important;
            border-radius: 50% !important;
            pointer-events: none !important;
            display: block !important;
            object-fit: cover !important;
        }
        .tm-toolbar-btn span {
            pointer-events: none !important;
            color: #17365d !important;
        }

        /* 主面板容器 */
        #tm-danmu-panel {
            position: fixed;
            top: 92px;
            right: 76px;
            width: min(448px, calc(100vw - 16px));
            height: min(600px, calc(100vh - 16px));
            max-height: calc(100vh - 20px);
            background: var(--tm-bg);
            border-radius: 12px;
            box-shadow: var(--tm-shadow);
            z-index: 2147483645;
            display: none;
            flex-direction: column;
            overflow: hidden;
            animation: tm-pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto !important;
        }
        #tm-danmu-panel * {
            box-sizing: border-box;
        }
        @keyframes tm-pop-in {
            from { opacity: 0; transform: scale(0.96) translateY(-6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tm-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--tm-border);
            cursor: move;
            user-select: none;
            flex-shrink: 0;
            background: transparent;
        }
        .tm-panel-title {
            display: flex;
            align-items: center;
            gap: 9px;
            font-weight: 600;
            font-size: 13.5px;
            letter-spacing: 0.01em;
            min-width: 0;
            white-space: nowrap;
        }
        #tm-panel-name { overflow: hidden; text-overflow: ellipsis; }
        .tm-panel-title img {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            flex-shrink: 0;
            object-fit: cover;
            box-shadow: 0 0 0 1px var(--tm-border-strong);
        }
        .tm-panel-title .sub-tag {
            font-size: 11px;
            padding: 1px 6px;
            border-radius: 999px;
            background: var(--tm-bg-subtle);
            border: 1px solid var(--tm-border);
            color: var(--tm-text-muted);
            font-weight: 400;
        }
        .tm-header-actions {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
        }
        .tm-header-shot-btn {
            font-size: 12px;
            font-weight: 500;
            color: var(--tm-text);
            border: 1px solid var(--tm-border);
            height: 26px;
            padding: 0 10px;
            border-radius: 8px;
            background: var(--tm-bg-subtle);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .tm-header-shot-btn:hover {
            background: var(--tm-accent-soft);
            border-color: var(--tm-accent);
            color: var(--tm-accent);
        }
        .tm-icon-btn {
            background: transparent;
            border: 1px solid transparent;
            width: 26px;
            height: 26px;
            border-radius: 8px;
            cursor: pointer;
            color: var(--tm-text-muted);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .tm-icon-btn:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-text);
        }
        .tm-icon-btn.active {
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.35);
            color: var(--tm-accent);
        }

        /* 顶栏下方个人与粉丝牌状态栏（与搜索栏等高） */
        .tm-fan-bar {
            height: 36px;
            min-height: 36px;
            padding: 0 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            border-bottom: 1px solid var(--tm-border);
            background: #f4f8ff;
            font-size: 11px;
            flex-shrink: 0;
        }
        .tm-fan-metrics {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 5px;
            overflow-x: auto;
            scrollbar-width: none;
            white-space: nowrap;
        }
        .tm-fan-metrics::-webkit-scrollbar {
            display: none;
        }
        .tm-fan-chip {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            height: 22px;
            padding: 0 7px;
            border-radius: 6px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            font-size: 11px;
            line-height: 1;
            flex-shrink: 0;
            user-select: none;
        }
        .tm-fan-chip.tm-fan-name {
            font-weight: 600;
            max-width: 84px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: inline-block;
            line-height: 20px;
        }
        .tm-fan-chip.is-ok {
            color: var(--tm-success);
            background: var(--tm-success-soft);
            border-color: rgba(59, 130, 246, 0.32);
        }
        .tm-fan-chip.is-warn {
            color: var(--tm-amber);
            background: var(--tm-amber-soft);
            border-color: rgba(59, 130, 246, 0.32);
        }
        .tm-fan-chip.is-accent {
            color: var(--tm-accent);
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.32);
        }
        .tm-fan-chip.is-muted {
            color: var(--tm-text-muted);
        }
        .tm-fan-controls {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }
        .tm-fan-auto-btn {
            height: 22px;
            padding: 0 7px;
            border-radius: 6px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text-muted);
            font-size: 10.5px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .tm-fan-auto-btn.active {
            color: var(--tm-accent);
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.32);
        }
        .tm-fan-refresh-btn {
            width: 22px;
            height: 22px;
            padding: 0;
            border-radius: 6px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text-muted);
            font-size: 12px;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .tm-fan-refresh-btn:hover,
        .tm-fan-auto-btn:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-text);
            border-color: var(--tm-border-strong);
        }
        .tm-fan-refresh-btn.spinning {
            animation: tm-spin 0.45s linear;
            color: var(--tm-accent);
        }
        @keyframes tm-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* 福袋横幅 */
        #tm-lottery-banner {
            display: none;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 7px 14px;
            font-size: 12px;
            line-height: 1.4;
            background: var(--tm-amber-soft);
            color: var(--tm-amber);
            border-bottom: 1px solid rgba(59, 130, 246, 0.22);
            flex-shrink: 0;
        }
        .tm-lottery-info {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 500;
        }
        .tm-lottery-btns {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
        }
        .tm-lottery-btns button {
            padding: 3px 9px;
            border-radius: 6px;
            border: none;
            background: #2563eb;
            color: #ffffff;
            font-size: 11.5px;
            cursor: pointer;
            font-weight: 600;
        }
        .tm-lottery-btns button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }
        .tm-lottery-btns button.tm-lottery-capture {
            background: rgba(59, 130, 246, 0.18);
            color: var(--tm-amber);
            border: 1px solid rgba(59, 130, 246, 0.38);
        }
        .tm-lottery-btns button.tm-lottery-cancel {
            background: transparent;
            color: var(--tm-text-muted);
            border: 1px solid var(--tm-border-strong);
        }
        .tm-cap-preset-row {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .tm-cap-preset-btn {
            height: 24px;
            padding: 0 7px;
            border-radius: 6px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text-muted);
            font-size: 11px;
            cursor: pointer;
        }
        .tm-cap-preset-btn.active {
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.4);
            color: var(--tm-accent);
            font-weight: 600;
        }

        /* 搜索与直发输入栏 */
        .tm-search-area {
            padding: 10px 14px 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }
        .tm-search-box {
            flex: 1;
            min-width: 0;
            position: relative;
            display: flex;
            align-items: center;
        }
        .tm-search-input {
            width: 100%;
            height: 34px;
            padding: 0 26px 0 11px;
            border-radius: 9px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            font-size: 13px;
            outline: none;
            transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .tm-search-input::placeholder {
            color: var(--tm-text-dim);
        }
        .tm-search-input:focus {
            border-color: var(--tm-accent);
            background: var(--tm-bg-elevated);
            box-shadow: 0 0 0 2px var(--tm-accent-soft);
        }
        .tm-search-clear {
            position: absolute;
            right: 6px;
            width: 18px;
            height: 18px;
            border: none;
            border-radius: 50%;
            background: var(--tm-bg-hover);
            color: var(--tm-text-muted);
            font-size: 11px;
            line-height: 1;
            cursor: pointer;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 0;
        }
        .tm-search-clear.visible {
            display: inline-flex;
        }
        .tm-search-clear:hover {
            color: var(--tm-text);
            background: var(--tm-border-strong);
        }
        .tm-btn-primary {
            height: 34px;
            padding: 0 12px;
            border-radius: 9px;
            border: none;
            background: var(--tm-accent-solid);
            color: #ffffff;
            font-weight: 600;
            font-size: 12.5px;
            cursor: pointer;
            transition: background 0.15s ease, transform 0.1s ease;
            white-space: nowrap;
        }
        .tm-btn-primary:hover {
            background: var(--tm-accent-hover);
        }
        .tm-btn-primary:active {
            transform: scale(0.97);
        }
        .tm-btn-secondary {
            height: 34px;
            padding: 0 11px;
            border-radius: 9px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            font-weight: 500;
            font-size: 12.5px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
            white-space: nowrap;
        }
        .tm-btn-secondary:hover {
            background: var(--tm-bg-hover);
            border-color: var(--tm-border-strong);
        }

        /* 紧凑单行分段标签栏 */
        .tm-tags-bar {
            padding: 0 14px 8px;
            display: flex;
            align-items: center;
            gap: 5px;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
            flex-shrink: 0;
            border-bottom: 1px solid var(--tm-border);
        }
        .tm-tags-bar::-webkit-scrollbar {
            display: none;
        }
        .tm-tag-item {
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 8px;
            background: transparent;
            color: var(--tm-text-muted);
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
            user-select: none;
            border: 1px solid transparent;
        }
        .tm-tag-item:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-text);
        }
        .tm-tag-item.active {
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.35);
            color: var(--tm-accent);
            font-weight: 600;
        }
        .tm-tag-count {
            font-size: 10.5px;
            opacity: 0.72;
            font-weight: 400;
        }
        .tm-tag-star {
            padding: 4px 8px;
            color: var(--tm-amber);
        }
        .tm-tag-star.active {
            background: var(--tm-amber-soft);
            border-color: rgba(59, 130, 246, 0.35);
            color: var(--tm-amber);
        }
        .tm-tag-ext {
            padding: 4px 6px 4px 9px;
            max-width: 106px;
            min-width: 0;
            flex-shrink: 1;
        }
        .tm-tag-ext-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .tm-tag-ext-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border: none;
            border-radius: 50%;
            background: transparent;
            color: inherit;
            font-size: 11px;
            line-height: 1;
            padding: 0;
            cursor: pointer;
            opacity: 0.65;
            flex-shrink: 0;
        }
        .tm-tag-ext-close:hover {
            opacity: 1;
            background: var(--tm-bg-hover);
        }
        .tm-tag-add {
            padding: 3px 8px;
            font-weight: 600;
            color: var(--tm-text-muted);
            border: 1px dashed var(--tm-border-strong);
        }
        .tm-tag-add:hover {
            color: var(--tm-accent);
            border-color: var(--tm-accent);
            background: var(--tm-accent-soft);
        }
        .tm-tag-add.disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        /* 紧凑行式梗列表（去卡片堆砌感） */
        .tm-list-container {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 6px 10px 12px;
        }
        .tm-list-container::-webkit-scrollbar,
        #tm-settings-body::-webkit-scrollbar,
        .tm-shot-box::-webkit-scrollbar {
            width: 5px;
        }
        .tm-list-container::-webkit-scrollbar-thumb,
        #tm-settings-body::-webkit-scrollbar-thumb,
        .tm-shot-box::-webkit-scrollbar-thumb {
            background: var(--tm-border-strong);
            border-radius: 999px;
        }
        .tm-list-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 11px;
            color: var(--tm-text-dim);
            padding: 2px 6px 6px;
        }
        .tm-meta-actions {
            display: inline-flex;
            gap: 6px;
        }
        .tm-meta-link {
            background: transparent;
            border: none;
            padding: 2px 6px;
            border-radius: 5px;
            font-size: 11px;
            color: var(--tm-text-muted);
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
        }
        .tm-meta-link:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-accent);
        }

        .tm-meme-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 10px 6px;
            border-radius: 0;
            border: 0;
            border-bottom: 1px solid var(--tm-border);
            transition: background 0.12s ease, border-color 0.12s ease;
        }
        .tm-meme-card + .tm-meme-card {
            margin-top: 2px;
        }
        .tm-meme-card:hover {
            background: var(--tm-bg-subtle);
            border-color: var(--tm-border);
        }
        .tm-meme-text {
            background: transparent;
            border: 0;
            padding: 0;
            text-align: left;
            font-family: inherit;
            flex: 1;
            min-width: 0;
            font-size: 13px;
            line-height: 1.48;
            word-break: break-word;
            color: var(--tm-text);
            cursor: pointer;
        }
        .tm-meme-text:hover {
            color: var(--tm-accent);
        }
        .tm-meme-hit {
            background: var(--tm-accent-soft);
            color: var(--tm-accent);
            border-radius: 3px;
            padding: 0 2px;
            font-weight: 600;
        }
        .tm-meme-actions {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }
        .tm-btn-copy,
        .tm-btn-star,
        .tm-btn-del {
            opacity: 0.65;
            transition: opacity 0.12s ease, color 0.12s ease, background 0.12s ease;
        }
        .tm-meme-card:hover .tm-btn-copy,
        .tm-meme-card:hover .tm-btn-star,
        .tm-meme-card:hover .tm-btn-del,
        .tm-btn-star.starred {
            opacity: 1;
        }
        .tm-btn-copy {
            padding: 3px 8px;
            font-size: 11.5px;
            border-radius: 6px;
            border: 1px solid transparent;
            background: transparent;
            color: var(--tm-text-muted);
            cursor: pointer;
        }
        .tm-btn-copy:hover {
            background: var(--tm-bg-hover);
            border-color: var(--tm-border);
            color: var(--tm-text);
        }
        .tm-btn-send {
            padding: 4px 11px;
            font-size: 12px;
            font-weight: 600;
            border-radius: 7px;
            border: 1px solid rgba(59, 130, 246, 0.28);
            background: var(--tm-accent-soft);
            color: var(--tm-accent);
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease, transform 0.1s ease;
        }
        .tm-btn-send:hover {
            background: var(--tm-accent-solid);
            border-color: var(--tm-accent-solid);
            color: #ffffff;
        }
        .tm-btn-send:active {
            transform: scale(0.96);
        }
        .tm-btn-star {
            background: transparent;
            border: none;
            color: var(--tm-text-dim);
            cursor: pointer;
            font-size: 14px;
            padding: 3px 4px;
            line-height: 1;
            border-radius: 6px;
        }
        .tm-btn-star:hover,
        .tm-btn-star.starred {
            color: var(--tm-amber);
        }
        .tm-btn-del {
            background: transparent;
            border: none;
            color: var(--tm-text-dim);
            cursor: pointer;
            font-size: 13px;
            padding: 3px 5px;
            line-height: 1;
            border-radius: 6px;
        }
        .tm-btn-del:hover {
            color: var(--tm-danger);
            background: rgba(248, 113, 113, 0.12);
        }
        .tm-empty-state {
            text-align: center;
            padding: 42px 16px;
            color: var(--tm-text-dim);
            font-size: 12.5px;
            line-height: 1.6;
        }

        /* 提示 Toast */
        #tm-toast {
            position: fixed;
            top: 56px;
            left: 50%;
            transform: translateX(-50%) translateY(-14px);
            opacity: 0;
            background: var(--tm-bg-elevated);
            color: var(--tm-text);
            border: 1px solid var(--tm-border-strong);
            padding: 7px 16px;
            border-radius: 999px;
            font-size: 12.5px;
            font-weight: 500;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.42);
            z-index: 2147483647;
            pointer-events: none;
            transition: opacity 0.18s ease, transform 0.18s ease;
            backdrop-filter: blur(10px);
            max-width: min(460px, calc(100vw - 32px));
            text-align: center;
        }
        #tm-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        /* 原生飘屏弹幕暂停高亮框 */
        #tm-danmu-highlight-box {
            position: fixed;
            z-index: 2147483635;
            display: none;
            pointer-events: none;
            border: 1.5px solid rgba(59, 130, 246, 0.85);
            background: rgba(59, 130, 246, 0.12);
            border-radius: 6px;
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.28);
            box-sizing: border-box;
        }

        /* 悬停弹幕出现的 +1 与 回复 胶囊操作条 */
        #tm-danmu-actions {
            position: fixed;
            z-index: 2147483638;
            display: none;
            align-items: center;
            gap: 4px;
            padding: 3px;
            border-radius: 999px;
            background: var(--tm-bg-elevated);
            border: 1px solid var(--tm-border-strong);
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            pointer-events: auto !important;
            user-select: none;
        }
        .tm-danmu-action-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 22px;
            padding: 0 10px;
            border-radius: 999px;
            border: none;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            pointer-events: auto !important;
            white-space: nowrap;
            transition: background 0.12s ease, transform 0.1s ease;
        }
        .tm-danmu-action-btn:active {
            transform: scale(0.95);
        }
        #tm-plus1-btn {
            background: #2563eb;
            color: #ffffff;
        }
        #tm-plus1-btn:hover {
            background: #1e40af;
        }
        #tm-reply-btn {
            background: #eaf2ff;
            color: #17365d;
        }
        #tm-reply-btn:hover {
            background: #dbeafe;
        }

        /* 小窗截图设置/预览浮窗 */
        .tm-shot-box {
            position: fixed;
            z-index: 2147483645;
            width: min(352px, calc(100vw - 20px));
            max-height: calc(100vh - 28px);
            overflow-y: auto;
            top: 84px;
            right: 24px;
            background: var(--tm-bg);
            color: var(--tm-text);
            border-radius: 14px;
            box-shadow: var(--tm-shadow);
            padding: 12px 14px;
            font-size: 12.5px;
            line-height: 1.5;
            box-sizing: border-box;
            pointer-events: auto;
            backdrop-filter: blur(16px);
        }
        .tm-shot-box * { box-sizing: border-box; }
        .tm-shot-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--tm-border);
            cursor: move;
            user-select: none;
            touch-action: none;
        }
        .tm-shot-head strong { font-size: 13.5px; font-weight: 600; }
        .tm-shot-head button {
            background: transparent;
            border: none;
            color: var(--tm-text-muted);
            width: 24px;
            height: 24px;
            border-radius: 7px;
            cursor: pointer;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .tm-shot-head button:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-text);
        }
        .tm-shot-help {
            color: var(--tm-text-muted);
            margin: 8px 0 0;
            font-size: 11.5px;
        }
        .tm-shot-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 6px 0;
        }
        .tm-shot-row-label {
            font-size: 12px;
            color: var(--tm-text-muted);
            flex-shrink: 0;
        }
        .tm-shot-opt {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 8px 0;
            font-size: 12px;
            color: var(--tm-text);
            cursor: pointer;
        }
        .tm-shot-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 8px 0;
        }
        .tm-shot-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 11.5px;
            color: var(--tm-text-muted);
        }
        .tm-shot-field.full { grid-column: 1 / -1; }
        .tm-shot-field select,
        .tm-shot-field input[type="text"] {
            height: 30px;
            padding: 0 8px;
            border-radius: 7px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            font-size: 12px;
            outline: none;
        }
        .tm-shot-field select:focus,
        .tm-shot-field input[type="text"]:focus {
            border-color: var(--tm-accent);
        }
        .tm-shot-field select option,
        .tm-select-sm option {
            background: #ffffff;
            color: #17365d;
        }
        .tm-shot-dir-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .tm-shot-dir-pill {
            flex: 1;
            min-width: 120px;
            padding: 5px 8px;
            border-radius: 7px;
            background: var(--tm-bg-subtle);
            border: 1px solid var(--tm-border);
            color: var(--tm-text-muted);
            font-size: 11.5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .tm-shot-adv {
            margin: 8px 0;
            padding: 7px 9px;
            border-radius: 9px;
            border: 1px solid var(--tm-border);
            background: var(--tm-bg-subtle);
        }
        .tm-shot-adv summary {
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: var(--tm-text-muted);
            user-select: none;
            outline: none;
            list-style-position: inside;
        }
        .tm-shot-adv[open] summary {
            margin-bottom: 6px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--tm-border);
        }
        .tm-shot-preview {
            display: block;
            max-width: 100%;
            max-height: 186px;
            width: auto;
            margin: 8px auto 6px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid var(--tm-border);
        }
        .tm-shot-actions { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 2px; }
        .tm-shot-actions button, .tm-settings-btn {
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            border: 1px solid var(--tm-border);
            border-radius: 7px;
            cursor: pointer;
            font-size: 12px;
            padding: 5px 10px;
            transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .tm-shot-actions button:hover, .tm-settings-btn:hover {
            border-color: var(--tm-border-strong);
            background: var(--tm-bg-hover);
        }
        .tm-shot-actions button.tm-shot-primary,
        .tm-settings-btn.tm-shot-primary {
            background: var(--tm-accent-solid);
            color: #ffffff;
            border-color: var(--tm-accent-solid);
            font-weight: 600;
        }
        .tm-shot-actions button.tm-shot-primary:hover,
        .tm-settings-btn.tm-shot-primary:hover {
            background: var(--tm-accent-hover);
            border-color: var(--tm-accent-hover);
        }
        .tm-shot-actions button:disabled,
        .tm-settings-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        #tm-shot-frame {
            position: fixed;
            z-index: 2147483644;
            display: none;
            box-sizing: border-box;
            border: 2px solid #3b82f6;
            background: rgba(59, 130, 246, 0.08);
            outline: 1px solid rgba(15, 23, 42, 0.7);
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.26);
            cursor: move;
            touch-action: none;
            user-select: none;
            pointer-events: auto;
        }
        #tm-shot-frame-label {
            position: absolute;
            bottom: 100%;
            left: -2px;
            background: #1e40af;
            color: #ffffff;
            white-space: nowrap;
            font: 11.5px/1.6 var(--tm-font, sans-serif);
            padding: 2px 8px;
            border-radius: 5px 5px 0 0;
        }
        #tm-shot-resize {
            position: absolute;
            width: 16px;
            height: 16px;
            right: -8px;
            bottom: -8px;
            background: #ffffff;
            border: 3px solid #1e40af;
            border-radius: 4px;
            cursor: nwse-resize;
        }

        /* 设置页（分区列表布局 + 胶囊拨动开关，去除厚边框嵌套堆砌） */
        #tm-settings-view {
            display: none;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            flex-direction: column;
        }
        #tm-settings-tabs {
            display: flex;
            gap: 4px;
            padding: 8px 14px;
            border-bottom: 1px solid var(--tm-border);
            flex-shrink: 0;
            overflow-x: auto;
            scrollbar-width: none;
        }
        #tm-settings-tabs::-webkit-scrollbar { display: none; }
        .tm-settings-tab {
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            border: 1px solid transparent;
            background: transparent;
            color: var(--tm-text-muted);
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.15s ease, color 0.15s ease;
        }
        .tm-settings-tab:hover {
            background: var(--tm-bg-hover);
            color: var(--tm-text);
        }
        .tm-settings-tab.active {
            background: var(--tm-accent-soft);
            border-color: rgba(59, 130, 246, 0.32);
            color: var(--tm-accent);
            font-weight: 600;
        }
        #tm-settings-body {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 10px 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .tm-settings-pane { display: none; flex-direction: column; gap: 14px; }
        .tm-settings-pane.active { display: flex; }
        .tm-settings-card {
            padding: 0 0 12px;
            border-bottom: 1px solid var(--tm-border);
            background: transparent;
        }
        .tm-settings-card:last-child {
            border-bottom: none;
            padding-bottom: 2px;
        }
        .tm-settings-title {
            font-size: 12.5px;
            font-weight: 600;
            color: var(--tm-text);
            margin-bottom: 4px;
        }
        .tm-settings-desc {
            font-size: 11.5px;
            color: var(--tm-text-muted);
            line-height: 1.45;
            margin-bottom: 6px;
        }
        .tm-settings-sublabel {
            font-size: 11.5px;
            color: var(--tm-text-muted);
            margin: 8px 0 4px;
        }
        .tm-settings-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 7px;
            margin-top: 7px;
        }
        .tm-settings-check {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            cursor: pointer;
            font-size: 12px;
            line-height: 1.45;
            padding: 4px 0;
            color: var(--tm-text);
        }
        .tm-settings-check-inline {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            font-size: 12px;
            color: var(--tm-text);
        }
        /* 现代胶囊开关样式（兼容所有现有 checkbox id） */
        .tm-switch,
        .tm-settings-check input[type="checkbox"],
        .tm-shot-opt input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            position: relative;
            width: 32px;
            height: 18px;
            border-radius: 999px;
            background: rgba(148, 163, 184, 0.28);
            border: 1px solid var(--tm-border-strong);
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.16s ease, border-color 0.16s ease;
            order: 2;
        }
        .tm-switch::after,
        .tm-settings-check input[type="checkbox"]::after,
        .tm-shot-opt input[type="checkbox"]::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #e5e7eb;
            transition: transform 0.16s ease, background 0.16s ease;
        }
        .tm-switch:checked,
        .tm-settings-check input[type="checkbox"]:checked,
        .tm-shot-opt input[type="checkbox"]:checked {
            background: var(--tm-accent-solid);
            border-color: var(--tm-accent-solid);
        }
        .tm-switch:checked::after,
        .tm-settings-check input[type="checkbox"]:checked::after,
        .tm-shot-opt input[type="checkbox"]:checked::after {
            transform: translateX(14px);
            background: #ffffff;
        }
        .tm-input-sm, .tm-select-sm, .tm-textarea {
            border: 1px solid var(--tm-border);
            border-radius: 7px;
            background: var(--tm-bg-subtle);
            color: var(--tm-text);
            font-size: 12px;
            padding: 4px 8px;
            box-sizing: border-box;
            outline: none;
        }
        .tm-input-sm:focus, .tm-select-sm:focus, .tm-textarea:focus {
            border-color: var(--tm-accent);
        }
        .tm-input-sm, .tm-select-sm { height: 29px; }
        .tm-textarea {
            width: 100%;
            min-height: 54px;
            resize: vertical;
            font-family: inherit;
            line-height: 1.45;
        }
        .tm-hotkey-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
        }
        .tm-hotkey-key {
            width: 98px;
            text-align: center;
            cursor: pointer;
            flex-shrink: 0;
        }
        .tm-hotkey-text { flex: 1; min-width: 0; }
        .tm-plugin-card {
            border: 1px solid var(--tm-border);
            border-radius: 9px;
            padding: 9px 10px;
            background: var(--tm-bg-subtle);
            margin-top: 8px;
        }
        .tm-plugin-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            font-weight: 600;
            font-size: 12.5px;
        }
        .tm-plugin-meta {
            font-size: 11.5px;
            color: var(--tm-text-muted);
            margin-top: 4px;
            line-height: 1.45;
        }
        .tm-danmu-hidden { display: none !important; }
        .tm-danmu-highlight {
            outline: 1px solid rgba(59, 130, 246, 0.72) !important;
            background: rgba(59, 130, 246, 0.14) !important;
            border-radius: 6px !important;
        }
        .tm-spam-badge {
            display: inline-block;
            margin-left: 6px;
            padding: 0 6px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            background: #1e40af;
            color: #ffffff;
            vertical-align: middle;
        }
        /* 干扰动画精简模式（仅在目标直播间挂载对应 class，严禁影响 video 与小助手本身） */
        html.tm-clean-gifts [class*="gift-animation" i]:not([class*="player" i]):not([id^="tm-"]),
        html.tm-clean-gifts [class*="GiftAnimation" i]:not([id^="tm-"]),
        html.tm-clean-gifts [class*="GiftEffect" i]:not([id^="tm-"]),
        html.tm-clean-gifts [data-e2e*="gift-effect"]:not([id^="tm-"]) {
            opacity: 0 !important;
            pointer-events: none !important;
            visibility: hidden !important;
        }
        html.tm-clean-entrance [class*="EnterRoom" i]:not([id^="tm-"]),
        html.tm-clean-entrance [class*="enter-room" i]:not([id^="tm-"]),
        html.tm-clean-entrance [class*="PrivilegeBanner" i]:not([id^="tm-"]) {
            display: none !important;
        }
        html.tm-clean-recommend [class*="ecom-card" i]:not([id^="tm-"]),
        html.tm-clean-recommend [class*="shopping-card" i]:not([id^="tm-"]),
        html.tm-clean-recommend [data-e2e*="shopping-card"]:not([id^="tm-"]),
        html.tm-clean-recommend [class*="live-recommend-card" i]:not([id^="tm-"]) {
            display: none !important;
        }
        #tm-danmu-panel, .tm-shot-box { color-scheme: light; line-height: 1.5; }
        #tm-danmu-panel button, #tm-danmu-panel input, #tm-danmu-panel select,
        .tm-shot-box button, .tm-shot-box input, .tm-shot-box select { font-family: inherit; }
        #tm-danmu-panel :focus-visible, .tm-shot-box :focus-visible, #tm-danmu-ball:focus-visible {
            outline: 2px solid #2563eb; outline-offset: 2px;
        }
        .tm-panel-header, #tm-danmu-ball { touch-action: none; }
        #tm-list-container, #tm-settings-body, .tm-shot-box { overscroll-behavior: contain; scrollbar-width: thin; }
        .tm-list-meta { gap: 8px; flex-wrap: wrap; padding: 4px 6px 8px; }
        .tm-meme-card:focus-within { background: var(--tm-bg-subtle); }
        .tm-meme-card:focus-within .tm-meme-actions button { opacity: 1; }
        .tm-settings-pane { min-width: 0; }
        .tm-settings-row > input, .tm-settings-row > select { min-width: 0; max-width: 100%; }
        .tm-plugin-card { border: 0; border-top: 1px solid var(--tm-border); border-radius: 0; background: transparent; padding: 12px 0; }
        @media (max-width: 520px) {
            #tm-danmu-panel { right: 8px; top: 8px; max-height: calc(100vh - 16px); }
            .tm-panel-header { padding: 10px 12px; }
            .tm-panel-title { font-size: 12px; gap: 6px; }
            .tm-panel-title img { width: 20px; height: 20px; }
            .tm-header-actions { gap: 2px; }
            .tm-search-area { padding: 10px 12px 8px; flex-wrap: wrap; }
            .tm-search-box { flex-basis: calc(100% - 112px); }
            .tm-meme-card { align-items: flex-start; flex-wrap: wrap; gap: 6px; }
            .tm-meme-text { flex-basis: 100%; }
            .tm-meme-actions { margin-left: auto; }
            #tm-settings-tabs { overflow-x: auto; flex-shrink: 0; }
            .tm-settings-tab { flex-shrink: 0; padding: 6px 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
            #tm-danmu-panel, #tm-danmu-panel *, .tm-shot-box, .tm-shot-box *, #tm-danmu-ball, #tm-danmu-ball::after {
                animation: none !important; transition: none !important;
            }
        }
    `;

    // ==========================================

    // 3. 全局状态与基础工具函数
    // ==========================================
    let activeTag = 'lib'; // 'star' | 'lib' | 'mine' | 'ext:<id>'
    let searchKeyword = '';
    let searchRenderRaf = 0;
    let isRecordingShortcut = false;
    const msgMetaMap = new Map(); // msgId -> { text, sender }
    const emojiUrlToNameMap = new Map();
    let emojiReverseReady = false;

    function findShortcutConflict(sc, ignoreId = '') {
        if (ignoreId !== '__shot__' && isSameShortcut(sc, shotConfig.shortcut)) {
            return '小窗截图快捷键';
        }
        for (const item of hotkeyItems) {
            if (item.id === ignoreId || !item.enabled) continue;
            if (isSameShortcut(sc, item.shortcut)) {
                return `快捷弹幕「${item.text || item.id}」`;
            }
        }
        for (const plugin of getActiveJsonPlugins()) {
            if (plugin.hotkeys.some(item => isSameShortcut(sc, item.shortcut))) return `插件「${plugin.name}」`;
        }
        return '';
    }

    function bindShortcutRecorder(inputEl, { getCurrent, onSave, placeholder = '按组合键...', conflictIgnoreId = '' }) {
        inputEl.value = formatShortcut(getCurrent());
        inputEl.addEventListener('focus', () => {
            isRecordingShortcut = true;
            inputEl.value = placeholder;
        });
        inputEl.addEventListener('blur', () => {
            isRecordingShortcut = false;
            inputEl.value = formatShortcut(getCurrent());
        });
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') { e.stopPropagation(); return; }
            e.preventDefault();
            e.stopPropagation();
            if (e.isComposing || e.repeat) return;
            if (e.key === 'Escape') {
                isRecordingShortcut = false;
                inputEl.blur();
                return;
            }
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
            if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                showToast('快捷键需至少包含 Ctrl / Alt / Shift 之一');
                return;
            }
            const nextSc = normalizeShortcut({
                ctrl: e.ctrlKey,
                alt: e.altKey,
                shift: e.shiftKey,
                meta: e.metaKey,
                key: normalizeShortcutEventKey(e),
            });
            const conflict = findShortcutConflict(nextSc, conflictIgnoreId);
            if (conflict) {
                showToast(`该按键与「${conflict}」冲突，请换一组`, 2600);
                return;
            }
            onSave(nextSc);
            isRecordingShortcut = false;
            inputEl.value = formatShortcut(nextSc);
            inputEl.blur();
        });
    }

    function getOverlayRoot() {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (fsEl && fsEl.tagName !== 'VIDEO' && fsEl.tagName !== 'IFRAME') {
            return fsEl;
        }
        return document.body || document.documentElement;
    }

    function ensureInOverlayRoot(el) {
        if (!el) return;
        const root = getOverlayRoot();
        if (root && el.parentElement !== root) {
            root.appendChild(el);
        }
    }

    function showToast(message, duration = 2000) {
        if (!isCurrentRoom(roomEpoch)) return;
        let toast = document.getElementById('tm-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tm-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
        }
        ensureInOverlayRoot(toast);
        toast.innerText = message;
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function copyText(text) {
        const onCopied = () => {
            showToast('已复制：' + (text.length > 15 ? text.slice(0, 15) + '...' : text));
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onCopied).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        let temp;
        try {
            temp = document.createElement('textarea');
            temp.value = text;
            temp.style.cssText = 'position:fixed;opacity:0;left:-9999px';
            document.body.appendChild(temp);
            temp.select();
            if (!document.execCommand('copy')) throw new Error('copy failed');
            showToast('已复制：' + (text.length > 15 ? text.slice(0, 15) + '...' : text));
        } catch (_) { showToast('复制失败，请手动复制'); }
        finally { temp?.remove(); }
    }

    // ==========================================
    // 4. 梗库、星标梗与外部梗库本地持久化（严格 TXT UTF-8 / 字数 / 条数校验）
    // ==========================================
    function normalizePhraseList(rawList, maxItems = MAX_MY_PHRASES) {
        if (!Array.isArray(rawList)) return [];
        const seen = new Set();
        const out = [];
        for (const v of rawList) {
            if (typeof v !== 'string') continue;
            const clean = normalizeSingleLineText(v);
            if (!clean || clean.length > MAX_PHRASE_LEN || seen.has(clean)) continue;
            seen.add(clean);
            out.push(clean);
            if (out.length >= maxItems) break;
        }
        return out;
    }

    let customMemesCache = null;
    let starredPhrasesCache = null;
    let externalLibsCache = null;
    let libraryMemesCache = null;

    function getCustomMemes() {
        if (customMemesCache !== null) return customMemesCache;
        try {
            const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            customMemesCache = normalizePhraseList(list, MAX_MY_PHRASES);
            return customMemesCache;
        } catch (_) {
            customMemesCache = [];
            return customMemesCache;
        }
    }

    function saveCustomMemes(list) {
        try {
            const normalized = normalizePhraseList(list, MAX_MY_PHRASES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
            customMemesCache = normalized;
            return true;
        } catch (_) {
            showToast('我的梗保存失败：浏览器存储不可用');
            return false;
        }
    }

    function getStarredPhrases() {
        if (starredPhrasesCache !== null) return starredPhrasesCache;
        try {
            const list = JSON.parse(localStorage.getItem(STARRED_KEY) || '[]');
            starredPhrasesCache = normalizePhraseList(list, MAX_STARRED_PHRASES);
            return starredPhrasesCache;
        } catch (_) {
            starredPhrasesCache = [];
            return starredPhrasesCache;
        }
    }

    function saveStarredPhrases(list) {
        try {
            const normalized = normalizePhraseList(list, MAX_STARRED_PHRASES);
            localStorage.setItem(STARRED_KEY, JSON.stringify(normalized));
            starredPhrasesCache = normalized;
            return true;
        } catch (_) {
            showToast('星标梗保存失败：浏览器存储不可用');
            return false;
        }
    }

    function toggleStarredPhrase(text) {
        const clean = normalizeSingleLineText(text);
        if (!clean || clean.length > MAX_PHRASE_LEN) {
            showToast(`仅支持 ${MAX_PHRASE_LEN} 字以内有效梗加星标`);
            return false;
        }
        const starred = getStarredPhrases();
        const idx = starred.indexOf(clean);
        if (idx >= 0) {
            const next = starred.filter(v => v !== clean);
            if (saveStarredPhrases(next)) {
                showToast('已取消星标');
                renderTagsBar();
                renderMemeList();
                return true;
            }
            return false;
        }
        if (starred.length >= MAX_STARRED_PHRASES) {
            showToast(`★ 星标梗上限 ${MAX_STARRED_PHRASES} 条，请先取消部分旧星标`);
            return false;
        }
        if (saveStarredPhrases([clean, ...starred])) {
            showToast(`已加入 ★ 星标（${starred.length + 1}/${MAX_STARRED_PHRASES}）`);
            renderTagsBar();
            renderMemeList();
            return true;
        }
        return false;
    }

    function normalizeExternalLib(raw, fallbackIdx = 0) {
        if (!raw || typeof raw !== 'object') return null;
        const rawName = normalizeSingleLineText(raw.name || '');
        const name = (rawName || `词库${fallbackIdx + 1}`).slice(0, 24);
        const items = normalizePhraseList(raw.items, MAX_EXTERNAL_LIB_ITEMS);
        if (!items.length) return null;
        const id = String(raw.id || `ext_${Date.now()}_${fallbackIdx}`).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || `ext_${fallbackIdx}`;
        return { id, name, items };
    }

    function getExternalPhraseLibs() {
        if (externalLibsCache !== null) return externalLibsCache;
        try {
            const raw = JSON.parse(localStorage.getItem(EXT_LIBS_KEY) || '[]');
            if (!Array.isArray(raw)) {
                externalLibsCache = [];
                return externalLibsCache;
            }
            const libs = [];
            const seenIds = new Set();
            for (let i = 0; i < raw.length; i++) {
                const lib = normalizeExternalLib(raw[i], i);
                if (!lib || seenIds.has(lib.id)) continue;
                seenIds.add(lib.id);
                libs.push(lib);
                if (libs.length >= MAX_EXTERNAL_LIBS) break;
            }
            externalLibsCache = libs;
            return externalLibsCache;
        } catch (_) {
            externalLibsCache = [];
            return externalLibsCache;
        }
    }

    function saveExternalPhraseLibs(libs) {
        try {
            const out = [];
            const seenIds = new Set();
            const arr = Array.isArray(libs) ? libs : [];
            for (let i = 0; i < arr.length; i++) {
                const lib = normalizeExternalLib(arr[i], i);
                if (!lib || seenIds.has(lib.id)) continue;
                seenIds.add(lib.id);
                out.push(lib);
                if (out.length >= MAX_EXTERNAL_LIBS) break;
            }
            localStorage.setItem(EXT_LIBS_KEY, JSON.stringify(out));
            externalLibsCache = out;
            return true;
        } catch (_) {
            showToast('外部梗库保存失败：浏览器存储不可用');
            return false;
        }
    }

    function removeExternalPhraseLib(libId) {
        const libs = getExternalPhraseLibs();
        const target = libs.find(l => l.id === libId);
        if (!target) return;
        const next = libs.filter(l => l.id !== libId);
        if (saveExternalPhraseLibs(next)) {
            if (activeTag === `ext:${libId}`) activeTag = 'lib';
            renderTagsBar();
            renderMemeList();
            showToast(`已移除外部梗库「${target.name}」`);
        }
    }

    function addCustomMeme(text) {
        const clean = normalizeSingleLineText(text);
        if (!clean) {
            showToast('梗内容不能为空');
            return false;
        }
        if (clean.length > MAX_PHRASE_LEN) {
            showToast(`单条梗最多 ${MAX_PHRASE_LEN} 字（当前 ${clean.length} 字）`);
            return false;
        }
        const list = getCustomMemes();
        if (list.includes(clean)) {
            showToast('该梗已在我的梗中');
            return false;
        }
        if (list.length >= MAX_MY_PHRASES) {
            showToast(`我的梗上限 ${MAX_MY_PHRASES} 条，请先删除旧梗`);
            return false;
        }
        if (saveCustomMemes([clean, ...list])) {
            showToast(`已添加至我的梗（${list.length + 1}/${MAX_MY_PHRASES}）`);
            renderTagsBar();
            renderMemeList();
            return true;
        }
        return false;
    }

    function removeCustomMeme(text) {
        if (saveCustomMemes(getCustomMemes().filter(v => v !== text))) {
            showToast('已从我的梗移除');
            renderTagsBar();
            renderMemeList();
        }
    }

    function decodeStrictUtf8Buffer(arrayBuffer) {
        const bytes = arrayBuffer instanceof Uint8Array ? arrayBuffer : new Uint8Array(arrayBuffer || 0);
        if (!bytes.length) {
            return { ok: false, error: '导入失败：文件内容为空' };
        }
        if (bytes.length > MAX_TXT_FILE_BYTES) {
            return { ok: false, error: `导入失败：TXT 文件超过 ${Math.round(MAX_TXT_FILE_BYTES / 1024)}KB 上限` };
        }
        // 检测 UTF-16 / UTF-32 BOM
        if (
            (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) ||
            (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF)
        ) {
            return { ok: false, error: '导入失败：请将 TXT 保存为 UTF-8 编码（不支持 UTF-16）' };
        }
        // 检测 NUL 与不可见控制字符（允许 \t \r \n）
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b === 0x00 || (b < 0x20 && b !== 0x09 && b !== 0x0A && b !== 0x0D) || b === 0x7F) {
                return { ok: false, error: '导入失败：检测到二进制或异常控制字符，仅支持纯文本 TXT' };
            }
        }
        // 剥离 UTF-8 BOM (EF BB BF)
        const payload = (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF)
            ? bytes.subarray(3)
            : bytes;
        if (!payload.length) {
            return { ok: false, error: '导入失败：文件内容为空' };
        }
        try {
            const decoder = new TextDecoder('utf-8', { fatal: true });
            const text = decoder.decode(payload);
            if (text.includes('\uFFFD')) {
                return { ok: false, error: '导入失败：文件编码存在乱码字符，请使用 UTF-8 保存' };
            }
            return { ok: true, text };
        } catch (_) {
            return { ok: false, error: '导入失败：文件非 UTF-8 编码（如为 GBK 请先转存 UTF-8）' };
        }
    }

    function parseTxtPhrases(rawText, options = {}) {
        const {
            existingList = [],
            maxTotal = MAX_MY_PHRASES,
            maxLen = MAX_PHRASE_LEN,
        } = options;
        const lines = String(rawText || '').split(/\r?\n/);
        const seen = new Set(existingList);
        const added = [];
        let skippedTooLong = 0;
        let skippedDuplicate = 0;
        let skippedOverCap = 0;

        for (const line of lines) {
            const clean = normalizeSingleLineText(line);
            if (!clean) continue;
            if (clean.length > maxLen) {
                skippedTooLong++;
                continue;
            }
            if (seen.has(clean)) {
                skippedDuplicate++;
                continue;
            }
            if (seen.size >= maxTotal) {
                skippedOverCap++;
                continue;
            }
            seen.add(clean);
            added.push(clean);
        }
        return {
            added,
            skippedTooLong,
            skippedDuplicate,
            skippedOverCap,
        };
    }

    function readStrictUtf8TxtFile(file, onDecoded) {
        if (!file) return;
        const fileName = String(file.name || '');
        const fileType = String(file.type || '').toLowerCase();
        const extOk = !fileName || /\.txt$/i.test(fileName);
        const typeOk = !fileType || fileType === 'text/plain';
        if (!extOk || !typeOk) {
            showToast('导入失败：仅支持 .txt UTF-8 纯文本文件（一行一条）');
            return;
        }
        if (typeof file.size === 'number' && file.size > MAX_TXT_FILE_BYTES) {
            showToast(`导入失败：文件超过 ${Math.round(MAX_TXT_FILE_BYTES / 1024)}KB 上限`);
            return;
        }
        const reader = new FileReader();
        const epoch = roomEpoch;
        reader.onload = () => {
            if (!isCurrentRoom(epoch)) return;
            const decoded = decodeStrictUtf8Buffer(reader.result);
            if (!decoded.ok) {
                showToast(decoded.error, 3200);
                return;
            }
            onDecoded(decoded.text, fileName);
        };
        reader.onerror = () => showToast('读取 TXT 文件失败');
        reader.readAsArrayBuffer(file);
    }

    function downloadBlobFile(blob, filename) {
        if (!isCurrentRoom(roomEpoch)) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function exportPhrasesAsTxt(list, labelName, filenamePrefix) {
        const cleanList = normalizePhraseList(list, Math.max(MAX_MY_PHRASES, MAX_STARRED_PHRASES));
        if (!cleanList.length) {
            showToast(`暂无${labelName}可导出`);
            return;
        }
        const content = cleanList.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        downloadBlobFile(blob, `${filenamePrefix}-${cleanList.length}条.txt`);
        showToast(`已导出 ${cleanList.length} 条${labelName}（UTF-8 TXT）`);
    }

    function exportCustomMemes() {
        exportPhrasesAsTxt(getCustomMemes(), '我的梗', `${STREAMER_NAME}-我的梗`);
    }

    function importCustomMemesFromFile(file) {
        readStrictUtf8TxtFile(file, (rawText) => {
            const existing = getCustomMemes();
            const res = parseTxtPhrases(rawText, {
                existingList: existing,
                maxTotal: MAX_MY_PHRASES,
                maxLen: MAX_PHRASE_LEN,
            });
            if (!res.added.length) {
                if (existing.length >= MAX_MY_PHRASES) {
                    showToast(`我的梗已满 ${MAX_MY_PHRASES} 条上限，未新增`);
                } else if (res.skippedTooLong > 0) {
                    showToast(`未导入：${res.skippedTooLong} 条超过 ${MAX_PHRASE_LEN} 字上限`, 3000);
                } else {
                    showToast('没有可新增的有效梗（可能全部重复或为空行）');
                }
                return;
            }
            const merged = [...existing, ...res.added];
            if (saveCustomMemes(merged)) {
                activeTag = 'mine';
                renderTagsBar();
                renderMemeList();
                const notes = [];
                if (res.skippedTooLong) notes.push(`超${MAX_PHRASE_LEN}字跳过${res.skippedTooLong}`);
                if (res.skippedDuplicate) notes.push(`重复跳过${res.skippedDuplicate}`);
                if (res.skippedOverCap) notes.push(`超${MAX_MY_PHRASES}上限截断${res.skippedOverCap}`);
                const suffix = notes.length ? `（${notes.join('，')}）` : '';
                showToast(`我的梗导入 ${res.added.length} 条（${merged.length}/${MAX_MY_PHRASES}）${suffix}`, 3200);
            }
        });
    }

    function importExternalPhraseLibFromFile(file) {
        const libs = getExternalPhraseLibs();
        if (libs.length >= MAX_EXTERNAL_LIBS) {
            showToast(`最多导入 ${MAX_EXTERNAL_LIBS} 个外部梗库（已顶满标签栏，请先点 × 移除后再导入）`, 3200);
            return;
        }
        readStrictUtf8TxtFile(file, (rawText, fileName) => {
            const res = parseTxtPhrases(rawText, {
                existingList: [],
                maxTotal: MAX_EXTERNAL_LIB_ITEMS,
                maxLen: MAX_PHRASE_LEN,
            });
            if (!res.added.length) {
                showToast(
                    res.skippedTooLong > 0
                        ? `外部梗库导入失败：所有词条均超过 ${MAX_PHRASE_LEN} 字上限`
                        : '外部梗库导入失败：TXT 中没有有效梗行',
                    3200
                );
                return;
            }
            const baseName = normalizeSingleLineText(fileName.replace(/\.txt$/i, '')) || `外库${libs.length + 1}`;
            const newLib = {
                id: `ext_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: baseName.slice(0, 24),
                items: res.added,
            };
            const nextLibs = [...libs, newLib];
            if (saveExternalPhraseLibs(nextLibs)) {
                activeTag = `ext:${newLib.id}`;
                renderTagsBar();
                renderMemeList();
                const notes = [];
                if (res.skippedTooLong) notes.push(`超${MAX_PHRASE_LEN}字跳过${res.skippedTooLong}`);
                if (res.skippedDuplicate) notes.push(`去重${res.skippedDuplicate}`);
                if (res.skippedOverCap) notes.push(`限${MAX_EXTERNAL_LIB_ITEMS}条截断${res.skippedOverCap}`);
                const suffix = notes.length ? `（${notes.join('，')}）` : '';
                showToast(`已导入梗库「${newLib.name}」${newLib.items.length}/${MAX_EXTERNAL_LIB_ITEMS} 条${suffix}`, 3200);
            }
        });
    }

    function syncPluginDynamicStyles() {
        const existing = document.getElementById('tm-plugin-styles');
        if (!isTargetRoom()) {
            existing?.remove();
            return;
        }
        const selectors = [];
        for (const p of getActiveJsonPlugins()) {
            for (const sel of p.hideSelectors) {
                for (const part of sel.split(',').map(v => v.trim()).filter(Boolean)) {
                    selectors.push(`${part}:not([id^="tm-"]):not([class*="tm-"])`);
                }
            }
        }
        if (!selectors.length) {
            existing?.remove();
            return;
        }
        const target = document.head || document.documentElement;
        if (!target) return;
        const nextCss = `${selectors.join(',\n')} { display: none !important; }`;
        const style = existing || document.createElement('style');
        style.id = 'tm-plugin-styles';
        style.type = 'text/css';
        if (style.textContent !== nextCss) style.textContent = nextCss;
        if (!style.parentElement) target.appendChild(style);
    }

    function applyAllRuntimeConfigs() {
        invalidateMatcherCache();
        reprocessChatroomMessages();
        applyCleanModeClasses();
        syncPluginDynamicStyles();
        renderTagsBar();
        renderMemeList();
        refreshShotConfigDisplays();
        syncCapturePanelFormFromConfig();
        refreshAllSettingsUi();
    }

    function installJsonPluginFromRaw(rawObjOrText) {
        const parsed = typeof rawObjOrText === 'string'
            ? JSON.parse(String(rawObjOrText || '').replace(/^\uFEFF/, ''))
            : rawObjOrText;
        const normalized = validateAndNormalizePlugin(parsed);
        const existingIdx = jsonPlugins.findIndex(p => p.id === normalized.id);
        const nextList = [...jsonPlugins];
        if (existingIdx >= 0) nextList[existingIdx] = normalized;
        else {
            if (nextList.length >= 20) throw new Error('最多同时安装 20 个 JSON 插件');
            nextList.unshift(normalized);
        }
        saveJsonPlugins(nextList);
        applyAllRuntimeConfigs();
        showToast(`${existingIdx >= 0 ? '已更新' : '已安装'}插件：${normalized.name}`);
        return normalized;
    }

    function toggleJsonPlugin(id, enabled) {
        const next = jsonPlugins.map(p => (p.id === id ? { ...p, enabled: !!enabled } : p));
        saveJsonPlugins(next);
        applyAllRuntimeConfigs();
    }

    function toggleJsonPluginAutoSend(id, allowAutoSend) {
        const next = jsonPlugins.map(p => (p.id === id ? { ...p, allowAutoSend: !!allowAutoSend } : p));
        saveJsonPlugins(next);
        applyAllRuntimeConfigs();
    }

    function removeJsonPlugin(id) {
        const target = jsonPlugins.find(p => p.id === id);
        if (!target) return;
        saveJsonPlugins(jsonPlugins.filter(p => p.id !== id));
        applyAllRuntimeConfigs();
        showToast(`已移除插件：${target.name}`);
    }

    function exportJsonPlugin(id) {
        const target = jsonPlugins.find(p => p.id === id);
        if (!target) return;
        const blob = new Blob([JSON.stringify(target, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadBlobFile(blob, `tm-plugin-${target.id}.json`);
        showToast(`已导出插件：${target.name}`);
    }

    function exportAllConfigs() {
        const bundle = {
            schema: 'tm-live-helper-backup-v2',
            version: 2,
            exportedAt: new Date().toISOString(),
            streamer: STREAMER_NAME,
            customMemes: getCustomMemes(),
            starredPhrases: getStarredPhrases(),
            externalLibs: getExternalPhraseLibs(),
            captureRoi: { ...captureRoi },
            legacyCanvasEnabled: !!legacyCanvasEnabled,
            shotConfig: { ...shotConfig },
            lotteryConfig: { ...lotteryConfig },
            hotkeyItems: hotkeyItems.map(h => ({ ...h })),
            filterConfig: { ...filterConfig },
            qualityConfig: { ...qualityConfig },
            cleanModeConfig: { ...cleanModeConfig },
            jsonPlugins: jsonPlugins.map(p => ({ ...p })),
        };
        const d = new Date();
        const stamp = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('');
        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadBlobFile(blob, `${STREAMER_NAME}-小助手全量配置-${stamp}.json`);
        showToast('已导出全量配置备份（JSON）');
    }

    function importAllConfigsFromFile(file) {
        if (!file) return;
        if (typeof file.size === 'number' && file.size > MAX_JSON_FILE_BYTES) {
            showToast(`全量导入失败：JSON 文件超过 ${Math.round(MAX_JSON_FILE_BYTES / 1024)}KB 上限`);
            return;
        }
        const reader = new FileReader();
        const epoch = roomEpoch;
        reader.onload = () => {
            if (!isCurrentRoom(epoch)) return;
            try {
                const raw = String(reader.result || '').replace(/^\uFEFF/, '');
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    showToast('全量导入失败：JSON 根结构无效');
                    return;
                }
                let appliedCount = 0;
                if (Array.isArray(parsed.customMemes)) {
                    saveCustomMemes(normalizePhraseList(parsed.customMemes, MAX_MY_PHRASES));
                    appliedCount++;
                }
                if (Array.isArray(parsed.starredPhrases)) {
                    saveStarredPhrases(normalizePhraseList(parsed.starredPhrases, MAX_STARRED_PHRASES));
                    appliedCount++;
                }
                if (Array.isArray(parsed.externalLibs)) {
                    saveExternalPhraseLibs(parsed.externalLibs);
                    appliedCount++;
                }
                if (parsed.captureRoi && typeof parsed.captureRoi === 'object') {
                    captureRoi = normalizeRoi(parsed.captureRoi);
                    saveRoi();
                    appliedCount++;
                }
                if (typeof parsed.legacyCanvasEnabled === 'boolean') {
                    legacyCanvasEnabled = parsed.legacyCanvasEnabled;
                    try { localStorage.setItem(LEGACY_KEY, legacyCanvasEnabled ? '1' : '0'); } catch (_) {}
                    appliedCount++;
                }
                if (parsed.shotConfig && typeof parsed.shotConfig === 'object') {
                    saveShotConfig(parsed.shotConfig);
                    appliedCount++;
                }
                if (parsed.lotteryConfig && typeof parsed.lotteryConfig === 'object') {
                    saveLotteryConfig(parsed.lotteryConfig);
                    appliedCount++;
                }
                if (Array.isArray(parsed.hotkeyItems)) {
                    saveHotkeyItems(parsed.hotkeyItems);
                    appliedCount++;
                }
                if (parsed.filterConfig && typeof parsed.filterConfig === 'object') {
                    saveFilterConfig(parsed.filterConfig);
                    appliedCount++;
                }
                if (parsed.qualityConfig && typeof parsed.qualityConfig === 'object') {
                    saveQualityConfig(parsed.qualityConfig);
                    appliedCount++;
                }
                if (parsed.cleanModeConfig && typeof parsed.cleanModeConfig === 'object') {
                    saveCleanModeConfig(parsed.cleanModeConfig);
                    appliedCount++;
                }
                if (Array.isArray(parsed.jsonPlugins)) {
                    saveJsonPlugins(parsed.jsonPlugins);
                    appliedCount++;
                }
                if (!appliedCount) {
                    showToast('未识别到可恢复的配置字段');
                    return;
                }
                applyAllRuntimeConfigs();
                rescheduleActiveLotteryIfNeeded();
                showToast(`已恢复 ${appliedCount} 项配置（若悬停模式有变更需刷新直播间）`, 3500);
            } catch (_) {
                showToast('全量配置导入失败：无效的 JSON 文件');
            }
        };
        reader.onerror = () => showToast('读取全量配置文件失败');
        reader.readAsText(file, 'utf-8');
    }

    // ==========================================
    // 5. 抖音输入框与弹幕发送/回复驱动
    // ==========================================
    function normalizeSingleLineText(str) {
        return String(str || '')
            .replace(/[\r\n\u200B\u200C\u200D\uFEFF]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isElementVisible(el) {
        if (!el || !el.isConnected) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isExcludedInputElement(el) {
        if (!el) return true;
        if (el.closest('#tm-danmu-panel, [role="dialog"], .semi-modal')) return true;
        const placeholder = el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '';
        return placeholder.includes('搜索') || placeholder.includes('举报');
    }

    function getChatInput() {
        if (!isTargetRoom()) return null;
        const selectors = [
            '#chatroom [contenteditable="true"]',
            '[data-e2e="live-chatting"] [contenteditable="true"]',
            '#chatroom textarea',
            '[data-e2e="live-chatting"] textarea',
            '.webcast-chatroom___input-container [contenteditable="true"]',
            '.webcast-chatroom___textarea textarea'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && isElementVisible(el) && !isExcludedInputElement(el)) return el;
        }
        return null; // 禁止回退到页面上任意 textarea，以免误填搜索或私信框
    }

    function getReactFiber(el) {
        if (!el || typeof el !== 'object') return null;
        el = el.wrappedJSObject || el;
        const fk = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
        return fk ? el[fk] : null;
    }

    function findRichTextEditorInstance(input) {
        if (!input) return null;
        try {
            const candidates = [
                input,
                input.closest('.sTr4hX9T'),
                input.closest('[data-e2e="live-chatting"]'),
                document.querySelector('[data-e2e="live-chatting"]'),
                document.getElementById('chatroom')
            ].filter(Boolean);

            const isEditorLike = (obj) => Boolean(
                obj &&
                typeof obj === 'object' &&
                typeof obj.getContentState === 'function' &&
                typeof obj.setText === 'function' &&
                typeof obj.isEmpty === 'function'
            );

            for (const el of candidates) {
                let fiber = getReactFiber(el);
                let steps = 0;
                while (fiber && steps < 18) {
                    const props = fiber.memoizedProps;
                    if (props) {
                        if (isEditorLike(props.editor)) return props.editor;
                        if (isEditorLike(props.value)) return props.value;
                        if (props.value && isEditorLike(props.value.editor)) return props.value.editor;
                    }
                    let hook = fiber.memoizedState;
                    let hookSteps = 0;
                    while (hook && hookSteps < 20) {
                        const st = hook.memoizedState;
                        if (isEditorLike(st)) return st;
                        if (st && typeof st === 'object') {
                            if (isEditorLike(st.editor)) return st.editor;
                            if (isEditorLike(st.current)) return st.current;
                        }
                        hook = hook.next;
                        hookSteps++;
                    }
                    let dep = fiber.dependencies?.firstContext;
                    let depSteps = 0;
                    while (dep && depSteps < 10) {
                        const cv = dep.context?._currentValue;
                        if (isEditorLike(cv)) return cv;
                        if (cv && typeof cv === 'object' && isEditorLike(cv.editor)) return cv.editor;
                        dep = dep.next;
                        depSteps++;
                    }
                    fiber = fiber.return;
                    steps++;
                }
            }
        } catch (e) {}
        return null;
    }

    function placeCaretAtEnd(el) {
        try {
            const sel = window.getSelection();
            if (!sel) return;
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (e) {}
    }

    function readEditablePlainText(el) {
        if (!el) return '';
        const walk = (node) => {
            if (!node) return '';
            if (node.nodeType === 3) return node.nodeValue || '';
            if (node.nodeType !== 1) return '';
            if (node.tagName === 'IMG') {
                const src = node.getAttribute?.('src') || node.src || '';
                return (src && emojiUrlToNameMap.get(src)) || node.getAttribute?.('alt') || node.getAttribute?.('title') || '';
            }
            if (node.tagName === 'BR') return '\n';
            let txt = '';
            const kids = node.childNodes;
            if (kids && kids.length) {
                for (let i = 0; i < kids.length; i++) txt += walk(kids[i]);
                return txt;
            }
            return node.textContent || '';
        };
        const walked = walk(el);
        const raw = walked || el.innerText || el.textContent || '';
        return String(raw)
            .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
            .replace(/\r/g, '');
    }

    function setChatInputValue(input, text) {
        if (!input) return false;
        const cleanVal = String(text ?? '').replace(/^[\r\n\u200B\uFEFF]+/, '');

        try {
            input.focus({ preventScroll: true });
        } catch (e) {
            try { input.focus(); } catch (err) {}
        }

        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            const proto = input.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

            if (nativeSetter) {
                nativeSetter.call(input, cleanVal);
            } else {
                input.value = cleanVal;
            }

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            try {
                if (input.setSelectionRange && typeof input.value === 'string') {
                    const len = input.value.length;
                    input.setSelectionRange(len, len);
                }
            } catch (e) {}
            return true;
        }

        if (input.isContentEditable) {
            const editor = findRichTextEditorInstance(input);
            if (editor) {
                try {
                    if (typeof editor.reset === 'function') editor.reset();
                    editor.setText(cleanVal);
                    if (typeof editor.focusAtEnd === 'function') {
                        editor.focusAtEnd();
                    } else if (typeof editor.focus === 'function') {
                        editor.focus(true);
                    }
                    const modelText = typeof editor.getText === 'function'
                        ? String(editor.getText() || '').replace(/[\r\n\u200B]+$/, '')
                        : '';
                    if (
                        modelText === cleanVal ||
                        readEditablePlainText(input).trim() === cleanVal.trim() ||
                        (typeof editor.getText !== 'function' && !editor.isEmpty())
                    ) {
                        return true;
                    }
                } catch (e) {}
            }

            try {
                const sel = window.getSelection();
                if (sel) {
                    const range = document.createRange();
                    range.selectNodeContents(input);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            } catch (e) {}

            try {
                if (typeof DataTransfer === 'function' && typeof ClipboardEvent === 'function') {
                    const dt = new DataTransfer();
                    dt.setData('text/plain', cleanVal);
                    const pasteEvt = new ClipboardEvent('paste', {
                        bubbles: true,
                        cancelable: true,
                        clipboardData: dt
                    });
                    input.dispatchEvent(pasteEvt);
                    if (readEditablePlainText(input).replace(/\n+$/, '') === cleanVal) {
                        placeCaretAtEnd(input);
                        return true;
                    }
                }
            } catch (e) {}

            try {
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, cleanVal);
                if (readEditablePlainText(input).replace(/\n+$/, '') === cleanVal) {
                    placeCaretAtEnd(input);
                    return true;
                }
            } catch (e) {}

            input.textContent = cleanVal;
            placeCaretAtEnd(input);
            try {
                input.dispatchEvent(new InputEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    data: cleanVal,
                    inputType: 'insertText'
                }));
            } catch (e) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return true;
        }

        return false;
    }

    function getSendButton(input) {
        const scope = input?.closest('#chatroom, [data-e2e="live-chatting"]') ||
            input?.closest('.webcast-chatroom___input-container, .webcast-chatroom___textarea');
        if (!scope) return null;
        const selectors = [
            '.webcast-chatroom___send-btn', '[data-e2e="live-chatting-send"]',
            'button[aria-label="发送"]', 'button[class*="send"]', '[role="button"][aria-label="发送"]'
        ];
        for (const sel of selectors) {
            const el = scope.querySelector(sel);
            if (el && isElementVisible(el)) return el;
        }
        return Array.from(scope.querySelectorAll('button, [role="button"]'))
            .find(el => isElementVisible(el) && (el.textContent || '').trim() === '发送') || null;
    }
    function readChatInput(input) {
        if (!input) return '';
        if (!input.isContentEditable) return String(input.value || '');
        const editor = findRichTextEditorInstance(input);
        if (editor && typeof editor.getText === 'function') {
            try {
                const modelText = String(editor.getText() || '').replace(/[\u200B\u200C\u200D\uFEFF\r]/g, '');
                if (modelText.trim()) return modelText;
            } catch (_) {}
        }
        return readEditablePlainText(input);
    }
    function isButtonDisabled(el) {
        return !el || el.disabled || el.getAttribute('aria-disabled') === 'true' ||
            el.classList.contains('disabled') || el.matches(':disabled');
    }
    function sendCurrentInput(input) {
        if (!input?.isConnected || !isTargetRoom()) return { attempted: false, reason: '输入框已失效' };
        const btn = getSendButton(input);
        try {
            if (btn) {
                if (isButtonDisabled(btn)) return { attempted: false, retryable: true, reason: '发送按钮不可用，已保留输入内容' };
                btn.click(); // 只使用一次点击，绝不与回车兜底叠加
                return { attempted: true, method: 'button' };
            }
            // 仅在确实没有发送按钮时尝试平台监听的 Enter（合成事件可能被拒绝）
            input.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
            }));
            return { attempted: true, method: 'enter' };
        } catch (error) {
            return { attempted: false, reason: String(error?.message || '发送动作失败') };
        }
    }

    let nextAllowedSendAt = 0;
    let isSending = false;
    let sendTimerId = 0;
    const recentSelfSentMap = new Map(); // normText -> timestamp
    function recordSelfSentText(text) {
        const key = normalizeSingleLineText(text).toLowerCase();
        if (!key) return;
        const now = Date.now();
        recentSelfSentMap.set(key, now);
        if (recentSelfSentMap.size > 40) {
            for (const [k, ts] of recentSelfSentMap) {
                if (now - ts > 60000) recentSelfSentMap.delete(k);
            }
        }
    }
    function isRecentSelfSentText(text) {
        const key = normalizeSingleLineText(text).toLowerCase();
        const ts = recentSelfSentMap.get(key);
        return typeof ts === 'number' && (Date.now() - ts) < 15000;
    }

    function sendBarrage(text, { silentSuccessToast = false, isAuto = false, onResult = () => {}, canDispatch = () => true } = {}) {
        if (!isTargetRoom()) return false;
        const cleanText = normalizeSingleLineText(text);
        if (!cleanText) {
            if (!isAuto) showToast('弹幕内容不能为空');
            return false;
        }
        const now = Date.now();
        if (isSending) {
            if (!isAuto) showToast('正在发送中，请稍候');
            return false;
        }
        if (now < nextAllowedSendAt) {
            if (!isAuto) {
                const waitSec = Math.max(1, Math.ceil((nextAllowedSendAt - now) / 1000));
                showToast(`发送冷却中，请 ${waitSec} 秒后再试`);
            }
            return false;
        }
        const input = getChatInput();
        if (!input) {
            if (!isAuto) showToast('未找到直播间聊天输入框');
            return false;
        }
        const existing = normalizeSingleLineText(readChatInput(input));
        if (existing && existing !== cleanText) {
            showToast(isAuto ? '输入框已有草稿，已跳过自动发弹幕' : '输入框已有草稿，请先发送或清空草稿');
            return false;
        }
        isSending = true;
        if (!setChatInputValue(input, cleanText)) {
            isSending = false;
            if (!isAuto) showToast('写入输入框失败，请手动输入');
            return false;
        }
        const attemptDispatch = (retriesLeft) => {
            sendTimerId = 0;
            let dispatched = false;
            let retrying = false;
            try {
                if (!isTargetRoom() || !canDispatch()) {
                    if (!isAuto) showToast('已离开目标直播间，取消发送');
                    isSending = false;
                    return;
                }
                if (!input.isConnected) {
                    if (!isAuto) showToast('聊天输入框已刷新，请重试');
                    isSending = false;
                    return;
                }
                if (normalizeSingleLineText(readChatInput(input)) !== cleanText) {
                    if (!isAuto) showToast('输入未生效或已被修改，请检查输入框');
                    isSending = false;
                    return;
                }
                const result = sendCurrentInput(input);
                if (!result.attempted && result.retryable && retriesLeft > 0) {
                    retrying = true;
                    sendTimerId = setTimeout(() => attemptDispatch(retriesLeft - 1), 120);
                    return;
                }
                if (result.attempted) {
                    dispatched = true;
                    nextAllowedSendAt = Date.now() + MIN_MESSAGE_INTERVAL;
                    recordSelfSentText(cleanText);
                    if (!silentSuccessToast) {
                        showToast('已尝试发送，请以直播间实际显示为准');
                    }
                } else {
                    showToast(result.reason || '发送未成功，文字已留在输入框');
                }
                isSending = false;
            } catch (_) {
                isSending = false;
            } finally {
                if (!retrying) {
                    isSending = false;
                    onResult(dispatched);
                }
            }
        };
        sendTimerId = setTimeout(() => attemptDispatch(1), 180);
        return true;
    }

    function fillReplyToChatInput(sender, content) {
        const cleanContent = normalizeSingleLineText(content);
        if (!cleanContent) return;
        const input = getChatInput();
        if (!input) return showToast('未找到直播间聊天输入框');
        if (normalizeSingleLineText(readChatInput(input))) {
            return showToast('输入框已有草稿，请先发送或清空后再回复');
        }
        const senderName = normalizeSingleLineText(sender);
        const replyText = senderName ? `@${senderName}：${cleanContent}` : cleanContent;
        if (setChatInputValue(input, replyText)) {
            showToast(senderName ? '已填入文本回复（不保证触发平台@通知）' : '已填入回复，请确认发送');
        } else {
            showToast('填入回复失败');
        }
    }

    // ==========================================
    // 6. 弹幕面板与悬浮球 UI 构建
    // ==========================================
    let panelEl = null;
    let listContainerEl = null;
    let searchInputEl = null;
    let tagsBarEl = null;

    function getLibraryMemes() {
        if (libraryMemesCache !== null) return libraryMemesCache;
        const out = [];
        const seen = new Set();
        const pushItem = (text, extra = {}) => {
            const clean = normalizeSingleLineText(text);
            if (!clean || clean.length > MAX_PHRASE_LEN || seen.has(clean)) return;
            seen.add(clean);
            out.push({ tag: '梗库', text: clean, ...extra });
        };
        for (const m of PRESET_MEMES.slice(0, MAX_PRESET_MEMES)) pushItem(m.text);
        let pluginAdded = 0;
        for (const plugin of getActiveJsonPlugins()) {
            for (const m of plugin.memes) {
                if (pluginAdded >= MAX_PLUGIN_MEMES_TOTAL) break;
                const prevLen = out.length;
                pushItem(m.text, { isPlugin: true });
                if (out.length > prevLen) pluginAdded++;
            }
            if (pluginAdded >= MAX_PLUGIN_MEMES_TOTAL) break;
        }
        libraryMemesCache = out;
        return out;
    }

    function formatShortLibName(name) {
        const clean = normalizeSingleLineText(name) || '外部词库';
        if (clean.length <= MAX_EXTERNAL_LIB_NAME_LEN) return clean;
        return clean.slice(0, MAX_EXTERNAL_LIB_NAME_LEN - 1) + '…';
    }

    function appendHighlightedText(container, text, keyword) {
        if (!keyword) {
            container.textContent = text;
            return;
        }
        const lowText = text.toLowerCase();
        const lowKw = keyword.toLowerCase();
        const idx = lowText.indexOf(lowKw);
        if (idx < 0) {
            container.textContent = text;
            return;
        }
        let cursor = 0;
        let matchIdx = idx;
        while (matchIdx >= 0) {
            if (matchIdx > cursor) {
                container.appendChild(document.createTextNode(text.slice(cursor, matchIdx)));
            }
            const mark = document.createElement('span');
            mark.className = 'tm-meme-hit';
            mark.textContent = text.slice(matchIdx, matchIdx + keyword.length);
            container.appendChild(mark);
            cursor = matchIdx + keyword.length;
            matchIdx = lowText.indexOf(lowKw, cursor);
        }
        if (cursor < text.length) {
            container.appendChild(document.createTextNode(text.slice(cursor)));
        }
    }

    function renderTagsBar() {
        if (!tagsBarEl) return;
        tagsBarEl.innerHTML = '';

        const libs = getExternalPhraseLibs();
        const starredCount = getStarredPhrases().length;
        const libCount = getLibraryMemes().length;
        const mineCount = getCustomMemes().length;

        const validIds = new Set(['star', 'lib', 'mine', ...libs.map(l => `ext:${l.id}`)]);
        if (!validIds.has(activeTag)) activeTag = 'lib';

        const makeTagPill = ({ id, label, count, title, className = '' }) => {
            const item = document.createElement('span');
            item.className = 'tm-tag-item' + (className ? ' ' + className : '') + (activeTag === id ? ' active' : '');
            item.setAttribute('data-tag', id);
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            item.appendChild(labelSpan);
            if (typeof count === 'number') {
                const countSpan = document.createElement('span');
                countSpan.className = 'tm-tag-count';
                countSpan.textContent = String(count);
                item.appendChild(countSpan);
            }
            if (title) item.title = title;
            item.addEventListener('click', () => {
                activeTag = id;
                renderTagsBar();
                renderMemeList({ resetScroll: true });
            });
            return item;
        };

        // 1. 最左侧：★ 星标梗
        tagsBarEl.appendChild(makeTagPill({
            id: 'star',
            label: '★',
            count: starredCount,
            title: `星标梗（${starredCount}/${MAX_STARRED_PHRASES}）`,
            className: 'tm-tag-star',
        }));

        // 2. 梗库
        tagsBarEl.appendChild(makeTagPill({
            id: 'lib',
            label: '梗库',
            count: libCount,
            title: `梗库（共 ${libCount} 条，含内置与已启用插件词条）`,
        }));

        // 3. 导入的外部梗库（最多 2 个）
        libs.forEach((lib) => {
            const pillId = `ext:${lib.id}`;
            const pill = document.createElement('span');
            pill.className = 'tm-tag-item tm-tag-ext' + (activeTag === pillId ? ' active' : '');
            pill.setAttribute('data-tag', pillId);
            pill.title = `${lib.name}（${lib.items.length}/${MAX_EXTERNAL_LIB_ITEMS}）`;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'tm-tag-ext-name';
            nameSpan.innerText = formatShortLibName(lib.name);

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'tm-tag-ext-close';
            closeBtn.innerText = '×';
            closeBtn.title = `移除「${lib.name}」`;
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeExternalPhraseLib(lib.id);
            });

            pill.addEventListener('click', () => {
                activeTag = pillId;
                renderTagsBar();
                renderMemeList({ resetScroll: true });
            });
            pill.appendChild(nameSpan);
            pill.appendChild(closeBtn);
            tagsBarEl.appendChild(pill);
        });

        // 4. 我的梗左侧：+ 导入外部梗库按钮
        const addLibBtn = document.createElement('span');
        addLibBtn.id = 'tm-tag-add-lib';
        addLibBtn.className = 'tm-tag-item tm-tag-add' + (libs.length >= MAX_EXTERNAL_LIBS ? ' disabled' : '');
        addLibBtn.innerText = '+';
        addLibBtn.title = libs.length >= MAX_EXTERNAL_LIBS
            ? `已导入 ${libs.length}/${MAX_EXTERNAL_LIBS} 个外部梗库（先点 × 移除后可继续导入）`
            : `导入别人的梗库（UTF-8 TXT 一行一条，最多 ${MAX_EXTERNAL_LIBS} 个）`;
        addLibBtn.addEventListener('click', () => {
            if (getExternalPhraseLibs().length >= MAX_EXTERNAL_LIBS) {
                showToast(`最多导入 ${MAX_EXTERNAL_LIBS} 个外部梗库（已顶满标签栏，请先点 × 移除后再导入）`, 3000);
                return;
            }
            const extInput = panelEl?.querySelector('#tm-extlib-import-file');
            if (extInput) extInput.click();
        });
        tagsBarEl.appendChild(addLibBtn);

        // 5. 最右侧：我的梗
        tagsBarEl.appendChild(makeTagPill({
            id: 'mine',
            label: '我的',
            count: mineCount,
            title: `我的梗（${mineCount}/${MAX_MY_PHRASES}）`,
        }));
    }

    function renderMemeList({ resetScroll = false } = {}) {
        if (!listContainerEl) return;
        if (searchRenderRaf) { cancelAnimationFrame(searchRenderRaf); searchRenderRaf = 0; }
        const prevScrollTop = resetScroll ? 0 : listContainerEl.scrollTop;
        listContainerEl.innerHTML = '';

        const starredSet = new Set(getStarredPhrases());
        const libs = getExternalPhraseLibs();

        let sourceList = [];
        let metaText = '';
        let emptyHint = '没有找到匹配的梗';

        if (activeTag === 'star') {
            sourceList = getStarredPhrases().map(text => ({ tag: 'star', text }));
            metaText = `★ 星标 ${sourceList.length}/${MAX_STARRED_PHRASES} · 单条 ≤${MAX_PHRASE_LEN} 字`;
            emptyHint = searchKeyword ? '没有匹配的星标梗' : '暂无星标梗，点击任意词条右侧 ☆ 即可加入';
        } else if (activeTag === 'mine') {
            sourceList = getCustomMemes().map(text => ({ tag: 'mine', text, isCustom: true }));
            metaText = `我的梗 ${sourceList.length}/${MAX_MY_PHRASES} · 单条 ≤${MAX_PHRASE_LEN} 字`;
            emptyHint = searchKeyword ? '没有匹配的我的梗' : '暂无我的梗，在上方输入后按 Ctrl+Enter 或点「收藏」添加';
        } else if (activeTag.startsWith('ext:')) {
            const targetId = activeTag.slice(4);
            const extLib = libs.find(l => l.id === targetId);
            if (!extLib) {
                activeTag = 'lib';
                renderTagsBar();
                renderMemeList({ resetScroll: true });
                return;
            }
            sourceList = extLib.items.map(text => ({ tag: activeTag, text }));
            metaText = `「${extLib.name}」${sourceList.length}/${MAX_EXTERNAL_LIB_ITEMS} · 单条 ≤${MAX_PHRASE_LEN} 字`;
            emptyHint = '该梗库中无匹配内容';
        } else {
            sourceList = getLibraryMemes();
            const pluginCount = sourceList.filter(m => m.isPlugin).length;
            metaText = pluginCount > 0
                ? `共 ${sourceList.length} 条（内置 ${sourceList.length - pluginCount} + 插件 ${pluginCount}）`
                : `共 ${sourceList.length}/${MAX_PRESET_MEMES} 条 · 点击文本即可复制`;
            emptyHint = '梗库中无匹配内容';
        }

        const metaBar = document.createElement('div');
        metaBar.className = 'tm-list-meta';
        const metaLeft = document.createElement('span');
        metaLeft.innerText = metaText;
        metaBar.appendChild(metaLeft);
        if (activeTag === 'mine') {
            const metaRight = document.createElement('span');
            metaRight.className = 'tm-meta-actions';
            const quickImp = document.createElement('button');
            quickImp.type = 'button';
            quickImp.className = 'tm-meta-link';
            quickImp.innerText = '导入 TXT';
            quickImp.addEventListener('click', () => panelEl?.querySelector('#tm-import-file')?.click());

            const quickExp = document.createElement('button');
            quickExp.type = 'button';
            quickExp.className = 'tm-meta-link';
            quickExp.innerText = '导出 TXT';
            quickExp.addEventListener('click', exportCustomMemes);

            metaRight.appendChild(quickImp);
            metaRight.appendChild(quickExp);
            metaBar.appendChild(metaRight);
        }
        listContainerEl.appendChild(metaBar);

        let list = sourceList;
        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            list = list.filter(item => item.text.toLowerCase().includes(kw));
        }

        if (list.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'tm-empty-state';
            emptyDiv.innerText = emptyHint;
            listContainerEl.appendChild(emptyDiv);
            return;
        }

        const frag = document.createDocumentFragment();
        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'tm-meme-card';

            const textSpan = document.createElement('button');
            textSpan.type = 'button';
            textSpan.className = 'tm-meme-text';
            appendHighlightedText(textSpan, item.text, searchKeyword);
            textSpan.title = '点击直接复制此梗';
            textSpan.addEventListener('click', () => copyText(item.text));

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'tm-meme-actions';

            const isStarred = starredSet.has(item.text);
            const starBtn = document.createElement('button');
            starBtn.type = 'button';
            starBtn.className = 'tm-btn-star' + (isStarred ? ' starred' : '');
            starBtn.innerText = isStarred ? '★' : '☆';
            starBtn.title = isStarred ? '取消星标' : `加入 ★ 星标栏（上限 ${MAX_STARRED_PHRASES} 条）`;
            starBtn.setAttribute('aria-label', starBtn.title);
            starBtn.setAttribute('aria-pressed', String(isStarred));
            starBtn.addEventListener('click', () => toggleStarredPhrase(item.text));

            const copyBtn = document.createElement('button');
            copyBtn.className = 'tm-btn-copy';
            copyBtn.type = 'button';
            copyBtn.innerText = '复制';
            copyBtn.addEventListener('click', () => copyText(item.text));

            const sendBtn = document.createElement('button');
            sendBtn.className = 'tm-btn-send';
            sendBtn.type = 'button';
            sendBtn.innerText = '发送';
            sendBtn.title = '填入并立即发送';
            sendBtn.addEventListener('click', () => sendBarrage(item.text));

            actionsDiv.appendChild(starBtn);
            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(sendBtn);

            if (item.isCustom) {
                const delBtn = document.createElement('button');
                delBtn.className = 'tm-btn-del';
                delBtn.type = 'button';
                delBtn.title = '从我的梗中移除';
                delBtn.innerText = '✕';
                delBtn.addEventListener('click', () => removeCustomMeme(item.text));
                actionsDiv.appendChild(delBtn);
            }

            card.appendChild(textSpan);
            card.appendChild(actionsDiv);
            frag.appendChild(card);
        });

        listContainerEl.appendChild(frag);
        if (!resetScroll && prevScrollTop > 0) {
            listContainerEl.scrollTop = Math.min(prevScrollTop, listContainerEl.scrollHeight);
        }
    }

    let refreshAllSettingsUi = () => {};
    function refreshFilterStatsUi() {
        const statsEl = panelEl?.querySelector('#tm-filter-stats');
        if (statsEl) {
            statsEl.textContent = `当前场次统计：已屏蔽 ${danmuFilterStats.blocked} 条 ｜ 已折叠刷屏 ${danmuFilterStats.collapsed} 条`;
        }
    }

    function createPanel() {
        if (panelEl) {
            ensureInOverlayRoot(panelEl);
            return panelEl;
        }

        panelEl = document.createElement('div');
        panelEl.id = 'tm-danmu-panel';
        panelEl.setAttribute('role', 'dialog');
        panelEl.setAttribute('aria-labelledby', 'tm-panel-name');
        panelEl.innerHTML = `
            <div class="tm-panel-header" id="tm-panel-header">
                <div class="tm-panel-title">
                    <img id="tm-panel-avatar" alt="头像">
                    <span id="tm-panel-name"></span>
                </div>
                <div class="tm-header-actions">
                    <button class="tm-header-shot-btn" id="tm-btn-shot" type="button" title="截图">截图</button>
                    <button class="tm-icon-btn" id="tm-btn-settings" type="button" title="设置" aria-label="设置" aria-expanded="false">⚙</button>
                    <button class="tm-icon-btn" id="tm-btn-close" type="button" title="关闭 (Esc)" aria-label="关闭小助手">✕</button>
                </div>
            </div>

            <div class="tm-fan-bar" id="tm-fan-bar">
                <div class="tm-fan-metrics">
                    <span class="tm-fan-chip tm-fan-name" id="tm-fan-name" title="当前登录网名">--</span>
                    <span class="tm-fan-chip is-muted" id="tm-fan-level" title="粉丝灯牌等级">牌 --</span>
                    <span class="tm-fan-chip is-muted" id="tm-fan-intimacy" title="粉丝团亲密度">亲密 --</span>
                    <span class="tm-fan-chip is-muted" id="tm-fan-lit" title="今日灯牌点亮状态">未点</span>
                    <span class="tm-fan-chip is-muted" id="tm-fan-online" title="今日直播间在线 20 分钟进度">0/20m</span>
                    <span class="tm-fan-chip is-muted" id="tm-fan-days" title="加入粉丝团时长" style="display:none"></span>
                </div>
                <div class="tm-fan-controls">
                    <button class="tm-fan-auto-btn active" id="tm-fan-auto" type="button" title="点击切换自动刷新（每 60 秒）">自动</button>
                    <button class="tm-fan-refresh-btn" id="tm-fan-refresh" type="button" title="立即刷新粉丝牌与任务状态">↻</button>
                </div>
            </div>

            <div id="tm-lottery-banner">
                <span class="tm-lottery-info" id="tm-lottery-banner-text">发现福袋</span>
                <div class="tm-lottery-btns">
                    <button class="tm-lottery-capture" id="tm-lottery-capture" type="button" title="从公屏高频弹幕捕捉口令">抓口令</button>
                    <button id="tm-lottery-send-now" type="button">立即发</button>
                    <button class="tm-lottery-cancel" id="tm-lottery-cancel" type="button">取消</button>
                </div>
            </div>

            <div class="tm-search-area" id="tm-search-area">
                <div class="tm-search-box">
                    <input type="text" class="tm-search-input" id="tm-search-input" aria-label="搜索梗或输入弹幕" placeholder="搜索或写弹幕 · Enter 发送" maxlength="240" />
                    <button class="tm-search-clear" id="tm-search-clear" type="button" title="清空输入">✕</button>
                </div>
                <button class="tm-btn-secondary" id="tm-btn-search" type="button" title="直接发送输入框里的弹幕">直发</button>
                <button class="tm-btn-primary" id="tm-btn-add" type="button" title="将输入框内容添加到我的梗">收藏</button>
            </div>

            <div class="tm-tags-bar" id="tm-tags-bar"></div>
            <input id="tm-extlib-import-file" type="file" accept=".txt,text/plain" style="display:none" />

            <div class="tm-list-container" id="tm-list-container"></div>

            <div id="tm-settings-view">
                <div id="tm-settings-tabs">
                    <button class="tm-settings-tab active" data-tab="base" type="button">基础</button>
                    <button class="tm-settings-tab" data-tab="lottery" type="button">福袋与过滤</button>
                    <button class="tm-settings-tab" data-tab="hotkey" type="button">快捷键与画质</button>
                    <button class="tm-settings-tab" data-tab="plugin" type="button">插件与备份</button>
                </div>
                <div id="tm-settings-body">
                    <div class="tm-settings-pane active" data-pane="base">
                        <div class="tm-settings-card">
                            <div class="tm-settings-title">我的梗导入导出</div>
                            <div class="tm-settings-desc">UTF-8 纯文本，每行一条，单条最多 60 字。</div>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn" id="tm-import-btn" type="button">导入 TXT</button>
                                <button class="tm-settings-btn" id="tm-export-btn" type="button">导出 TXT</button>
                                <input id="tm-import-file" type="file" accept=".txt,text/plain" style="display:none" />
                            </div>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">弹幕悬停交互</div>
                            <label class="tm-settings-check">
                                <span>悬停弹幕时暂停并支持 +1 / 回复（切换后刷新生效）</span>
                                <input type="checkbox" id="tm-hover-opt" />
                            </label>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">截图设置</div>
                            <div class="tm-settings-desc" id="tm-shot-settings-summary"></div>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn tm-shot-primary" id="tm-shot-entry" type="button">打开截图设置</button>
                                <button class="tm-settings-btn" id="tm-shot-reset-cfg" type="button">重置</button>
                            </div>
                        </div>
                    </div>

                    <div class="tm-settings-pane" data-pane="lottery">
                        <div class="tm-settings-card">
                            <div class="tm-settings-title">福袋提醒与自动发口令</div>
                            <div class="tm-settings-desc">自动发送有吞弹幕或验证码风险，建议按需开启。</div>
                            <label class="tm-settings-check">
                                <span>检测福袋并显示倒计时</span>
                                <input type="checkbox" id="tm-lottery-enabled" />
                            </label>
                            <label class="tm-settings-check">
                                <span>到时间自动发送口令</span>
                                <input type="checkbox" id="tm-lottery-autosend" />
                            </label>
                            <label class="tm-settings-check">
                                <span>未拿到口令时自动捕捉公屏高频口令</span>
                                <input type="checkbox" id="tm-lottery-capture-chat" />
                            </label>
                            <div class="tm-settings-row">
                                <span style="font-size:12px;color:var(--tm-text-muted)">捕捉窗口</span>
                                <div class="tm-cap-preset-row">
                                    <button class="tm-cap-preset-btn" data-sec="10" type="button">10s</button>
                                    <button class="tm-cap-preset-btn" data-sec="15" type="button">15s</button>
                                    <button class="tm-cap-preset-btn" data-sec="20" type="button">20s</button>
                                    <button class="tm-cap-preset-btn" data-sec="30" type="button">30s</button>
                                </div>
                                <input class="tm-input-sm" id="tm-lottery-capture-sec" type="number" min="5" max="60" style="width:52px;margin-left:auto" title="公屏捕捉秒数 (5~60)" />
                                <span style="font-size:12px;color:var(--tm-text-muted)">秒</span>
                            </div>
                            <div class="tm-settings-row">
                                <select class="tm-select-sm" id="tm-lottery-timing-mode">
                                    <option value="before_draw">开奖前 N 秒</option>
                                    <option value="after_detect">发现后 N 秒</option>
                                </select>
                                <input class="tm-input-sm" id="tm-lottery-offset" type="number" min="1" max="300" style="width:66px" title="秒数" />
                                <span style="font-size:12px;color:var(--tm-text-muted)">秒 ±</span>
                                <input class="tm-input-sm" id="tm-lottery-jitter" type="number" min="0" max="15" style="width:52px" title="随机抖动秒数" />
                                <span style="font-size:12px;color:var(--tm-text-muted)">秒</span>
                            </div>
                            <div class="tm-settings-row">
                                <input class="tm-input-sm" id="tm-lottery-fallback" type="text" placeholder="未识别出口令时的兜底词" style="flex:1;min-width:120px" />
                                <button class="tm-settings-btn" id="tm-lottery-capture-now" type="button" title="立即捕捉公屏高频弹幕作为福袋口令">抓口令</button>
                                <button class="tm-settings-btn" id="tm-lottery-test" type="button">测试</button>
                            </div>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">弹幕过滤与刷屏折叠</div>
                            <label class="tm-settings-check">
                                <span>公屏同内容刷屏折叠</span>
                                <input type="checkbox" id="tm-filter-collapse" />
                            </label>
                            <label class="tm-settings-check">
                                <span>启用关键词屏蔽</span>
                                <input type="checkbox" id="tm-filter-block-enabled" />
                            </label>
                            <div class="tm-settings-row">
                                <span style="font-size:12px;color:var(--tm-text-muted)">折叠去重时间窗口</span>
                                <input class="tm-input-sm" id="tm-filter-window" type="number" min="2" max="60" style="width:60px;margin-left:auto" />
                                <span style="font-size:12px;color:var(--tm-text-muted)">秒</span>
                            </div>
                            <div class="tm-settings-sublabel">屏蔽词（逗号或换行分隔，支持 /简单正则/；复杂表达式按字面匹配）</div>
                            <textarea class="tm-textarea" id="tm-filter-block-words" placeholder="例：广告词, /代练/i"></textarea>
                            <div class="tm-settings-sublabel">高亮词</div>
                            <textarea class="tm-textarea" id="tm-filter-highlight-words" style="min-height:42px" placeholder="例：高能, 好活"></textarea>
                            <div class="tm-settings-desc" id="tm-filter-stats" style="margin:6px 0 0"></div>
                        </div>
                    </div>

                    <div class="tm-settings-pane" data-pane="hotkey">
                        <div class="tm-settings-card">
                            <div class="tm-settings-title">快捷键发弹幕</div>
                            <div class="tm-settings-desc">需含 Ctrl / Alt / Shift，非输入框状态下触发。</div>
                            <div id="tm-hotkey-list"></div>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn" id="tm-hotkey-add" type="button">新增快捷键</button>
                            </div>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">画质偏好</div>
                            <div class="tm-settings-row">
                                <select class="tm-select-sm" id="tm-quality-pref">
                                    <option value="auto">不自动切换</option>
                                    <option value="原画">原画</option>
                                    <option value="蓝光">蓝光</option>
                                    <option value="超清">超清</option>
                                    <option value="高清">高清</option>
                                    <option value="流畅">流畅</option>
                                </select>
                                <button class="tm-settings-btn" id="tm-quality-apply-now" type="button">立即应用</button>
                            </div>
                            <label class="tm-settings-check" style="margin-top:6px">
                                <span>记住手动切换的画质</span>
                                <input type="checkbox" id="tm-quality-remember" />
                            </label>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">界面精简</div>
                            <label class="tm-settings-check">
                                <span>隐藏全屏礼物特效</span>
                                <input type="checkbox" id="tm-clean-gifts" />
                            </label>
                            <label class="tm-settings-check">
                                <span>隐藏进场飘屏与入场横幅</span>
                                <input type="checkbox" id="tm-clean-entrance" />
                            </label>
                            <label class="tm-settings-check">
                                <span>隐藏带货卡片与推荐浮窗</span>
                                <input type="checkbox" id="tm-clean-recommend" />
                            </label>
                        </div>
                    </div>

                    <div class="tm-settings-pane" data-pane="plugin">
                        <div class="tm-settings-card">
                            <div class="tm-settings-title">配置备份</div>
                            <div class="tm-settings-desc">导出或还原全部本地设置与已安装插件。</div>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn tm-shot-primary" id="tm-backup-export" type="button">导出备份</button>
                                <button class="tm-settings-btn" id="tm-backup-import" type="button">导入备份</button>
                                <input id="tm-backup-file" type="file" accept=".json,application/json" style="display:none" />
                            </div>
                        </div>

                        <div class="tm-settings-card">
                            <div class="tm-settings-title">JSON 扩展插件</div>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn" id="tm-plugin-import-btn" type="button">导入插件</button>
                                <button class="tm-settings-btn" id="tm-plugin-sample" type="button">加载示例</button>
                                <input id="tm-plugin-import-file" type="file" accept=".json,application/json" style="display:none" />
                            </div>
                            <textarea class="tm-textarea" id="tm-plugin-paste-area" style="margin-top:8px" placeholder="粘贴插件 JSON 内容..."></textarea>
                            <div class="tm-settings-row">
                                <button class="tm-settings-btn" id="tm-plugin-install-paste" type="button">从粘贴安装</button>
                            </div>
                            <div id="tm-plugin-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        applyAvatarSrc(panelEl.querySelector('#tm-panel-avatar'));
        panelEl.querySelector('#tm-panel-name').textContent = `${STREAMER_NAME} · 小助手`;

        ensureInOverlayRoot(panelEl);

        listContainerEl = panelEl.querySelector('#tm-list-container');
        tagsBarEl = panelEl.querySelector('#tm-tags-bar');
        searchInputEl = panelEl.querySelector('#tm-search-input');

        const searchAreaEl = panelEl.querySelector('#tm-search-area');
        const settingsViewEl = panelEl.querySelector('#tm-settings-view');
        const searchClearBtn = panelEl.querySelector('#tm-search-clear');
        const directSendBtn = panelEl.querySelector('#tm-btn-search');
        const addBtn = panelEl.querySelector('#tm-btn-add');
        const shotBtn = panelEl.querySelector('#tm-btn-shot');
        const settingsBtn = panelEl.querySelector('#tm-btn-settings');
        const closeBtn = panelEl.querySelector('#tm-btn-close');
        const exportBtn = panelEl.querySelector('#tm-export-btn');
        const importBtn = panelEl.querySelector('#tm-import-btn');
        const importFile = panelEl.querySelector('#tm-import-file');
        const extLibImportFile = panelEl.querySelector('#tm-extlib-import-file');
        const resetShotCfgBtn = panelEl.querySelector('#tm-shot-reset-cfg');

        let settingsOpen = false;
        const setSettingsViewOpen = (open) => {
            settingsOpen = !!open;
            if (!settingsOpen) isRecordingShortcut = false;
            searchAreaEl.style.display = settingsOpen ? 'none' : 'flex';
            tagsBarEl.style.display = settingsOpen ? 'none' : 'flex';
            listContainerEl.style.display = settingsOpen ? 'none' : 'block';
            settingsViewEl.style.display = settingsOpen ? 'flex' : 'none';
            settingsBtn.classList.toggle('active', settingsOpen);
            settingsBtn.setAttribute('aria-expanded', String(settingsOpen));
            if (settingsOpen) {
                refreshAllSettingsUi();
                refreshShotConfigDisplays();
            }
        };

        // 设置视图子标签切换
        const tabBtns = panelEl.querySelectorAll('.tm-settings-tab');
        const tabPanes = panelEl.querySelectorAll('.tm-settings-pane');
        tabBtns.forEach((tabBtn) => {
            tabBtn.addEventListener('click', () => {
                isRecordingShortcut = false;
                const targetTab = tabBtn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.toggle('active', b === tabBtn));
                tabPanes.forEach(p => p.classList.toggle('active', p.getAttribute('data-pane') === targetTab));
            });
        });

        const syncSearchClearBtn = () => {
            searchClearBtn.classList.toggle('visible', Boolean(searchInputEl.value));
        };

        searchInputEl.addEventListener('input', (e) => {
            searchKeyword = e.target.value.trim();
            syncSearchClearBtn();
            if (!searchRenderRaf) searchRenderRaf = requestAnimationFrame(() => {
                searchRenderRaf = 0;
                if (isTargetRoom()) renderMemeList({ resetScroll: true });
            });
        });

        searchInputEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || e.isComposing || e.repeat) return;
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                addBtn.click();
            } else {
                const val = searchInputEl.value.trim();
                if (val) sendBarrage(val);
            }
        });

        searchClearBtn.addEventListener('click', () => {
            searchInputEl.value = '';
            searchKeyword = '';
            syncSearchClearBtn();
            renderMemeList({ resetScroll: true });
            searchInputEl.focus();
        });

        directSendBtn.addEventListener('click', () => {
            const val = searchInputEl.value.trim();
            if (!val) {
                showToast('请先输入要发送的弹幕内容');
                searchInputEl.focus();
                return;
            }
            sendBarrage(val);
        });

        addBtn.addEventListener('click', () => {
            const val = searchInputEl.value.trim();
            if (!val) {
                showToast('请先输入梗内容');
                return;
            }
            if (addCustomMeme(val)) {
                searchInputEl.value = '';
                searchKeyword = '';
                syncSearchClearBtn();
                activeTag = 'mine';
                renderTagsBar();
                renderMemeList({ resetScroll: true });
            }
        });

        shotBtn.addEventListener('click', () => {
            triggerCaptureAction();
        });
        settingsBtn.addEventListener('click', () => {
            setSettingsViewOpen(!settingsOpen);
        });
        exportBtn.addEventListener('click', exportCustomMemes);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', () => {
            const file = importFile.files?.[0];
            importFile.value = '';
            if (file) importCustomMemesFromFile(file);
        });
        extLibImportFile.addEventListener('change', () => {
            const file = extLibImportFile.files?.[0];
            extLibImportFile.value = '';
            if (file) importExternalPhraseLibFromFile(file);
        });

        closeBtn.addEventListener('click', togglePanel);
        panelEl.querySelector('#tm-shot-entry').addEventListener('click', () => { openCapturePanel({ forceConfig: true }); });
        resetShotCfgBtn.addEventListener('click', async () => {
            saveShotConfig({
                ...DEFAULT_SHOT_CONFIG,
                shortcut: { ...DEFAULT_SHOT_CONFIG.shortcut },
                configured: false,
            });
            await clearSavedDirectoryHandle();
            refreshShotConfigDisplays();
            showToast('已重置截图配置，下次点击“截图”将重新打开配置');
        });
        const legacyOpt = panelEl.querySelector('#tm-hover-opt');
        legacyOpt.checked = legacyCanvasEnabled;
        legacyOpt.addEventListener('change', () => {
            legacyCanvasEnabled = legacyOpt.checked;
            try {
                localStorage.setItem(LEGACY_KEY, legacyCanvasEnabled ? '1' : '0');
            } catch (_) {
                showToast('设置保存失败');
                return;
            }
            if (!legacyCanvasEnabled) {
                unlockPausedBarrage();
                releaseDomBarrage();
                restoreBarragePrototypes();
                restoreMainWorldTransferHook();
                cachedManager = null;
            } else {
                installMainWorldTransferHook();
            }
            showToast('悬停模式设置已保存，请刷新当前直播间生效', 3500);
        });

        // 粉丝牌与个人状态栏操作
        panelEl.querySelector('#tm-fan-auto').addEventListener('click', () => {
            fanState.autoRefresh = !fanState.autoRefresh;
            fanStateDirty = true;
            saveFanState(true);
            if (fanState.autoRefresh) startFanRefreshTimer();
            else stopFanRefreshTimer();
            renderFanBar();
            showToast(fanState.autoRefresh ? '已开启状态栏自动刷新（60秒）' : '已暂停状态栏自动刷新');
        });
        panelEl.querySelector('#tm-fan-refresh').addEventListener('click', () => {
            refreshFanStatus({ manual: true });
        });

        // 福袋 banner 快捷操作
        panelEl.querySelector('#tm-lottery-capture').addEventListener('click', () => {
            startLotteryCommandCapture({ durationSec: lotteryConfig.captureDurationSec, manual: true });
        });
        panelEl.querySelector('#tm-lottery-send-now').addEventListener('click', () => sendActiveLotteryNow(true));
        panelEl.querySelector('#tm-lottery-cancel').addEventListener('click', () => cancelActiveLotterySchedule(true));

        // 福袋配置事件
        const lotEnabledEl = panelEl.querySelector('#tm-lottery-enabled');
        const lotAutoEl = panelEl.querySelector('#tm-lottery-autosend');
        const lotCapChatEl = panelEl.querySelector('#tm-lottery-capture-chat');
        const lotCapSecEl = panelEl.querySelector('#tm-lottery-capture-sec');
        const capPresetBtns = [...panelEl.querySelectorAll('.tm-cap-preset-btn')];
        const lotModeEl = panelEl.querySelector('#tm-lottery-timing-mode');
        const lotOffsetEl = panelEl.querySelector('#tm-lottery-offset');
        const lotJitterEl = panelEl.querySelector('#tm-lottery-jitter');
        const lotFallbackEl = panelEl.querySelector('#tm-lottery-fallback');
        const syncCapturePresetActive = () => {
            capPresetBtns.forEach((btn) => {
                btn.classList.toggle('active', Number(btn.getAttribute('data-sec')) === lotteryConfig.captureDurationSec);
            });
        };
        const syncLotteryFromForm = () => {
            saveLotteryConfig({
                enabled: lotEnabledEl.checked,
                autoSend: lotAutoEl.checked,
                captureCommandFromChat: lotCapChatEl.checked,
                captureDurationSec: Number(lotCapSecEl.value),
                timingMode: lotModeEl.value,
                offsetSeconds: Number(lotOffsetEl.value),
                jitterSeconds: Number(lotJitterEl.value),
                fallbackCommand: lotFallbackEl.value,
            });
            lotCapSecEl.value = String(lotteryConfig.captureDurationSec);
            syncCapturePresetActive();
            rescheduleActiveLotteryIfNeeded();
        };
        [lotEnabledEl, lotAutoEl, lotCapChatEl, lotCapSecEl, lotModeEl, lotOffsetEl, lotJitterEl, lotFallbackEl].forEach((el) => {
            el.addEventListener('change', syncLotteryFromForm);
        });
        capPresetBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                lotCapSecEl.value = btn.getAttribute('data-sec') || '15';
                syncLotteryFromForm();
                showToast(`公屏捕捉窗口已设为 ${lotteryConfig.captureDurationSec} 秒`);
            });
        });
        panelEl.querySelector('#tm-lottery-capture-now').addEventListener('click', () => {
            startLotteryCommandCapture({ durationSec: lotteryConfig.captureDurationSec, manual: true });
        });
        panelEl.querySelector('#tm-lottery-test').addEventListener('click', () => {
            handleDetectedLottery({
                id: `test-${Date.now()}`,
                command: lotteryConfig.fallbackCommand || '好活，当赏！👏',
                drawAtMs: Date.now() + 30000,
                remainingSec: 30,
                source: 'manual-test',
                forceUpdate: true,
            });
            showToast('已触发 30 秒模拟福袋（上方黄条可查看倒计时与预约状态）');
        });

        // 刷屏折叠与过滤事件
        const fltBlockEnabledEl = panelEl.querySelector('#tm-filter-block-enabled');
        const fltCollapseEl = panelEl.querySelector('#tm-filter-collapse');
        const fltWindowEl = panelEl.querySelector('#tm-filter-window');
        const fltBlockWordsEl = panelEl.querySelector('#tm-filter-block-words');
        const fltHighlightWordsEl = panelEl.querySelector('#tm-filter-highlight-words');
        const syncFilterFromForm = () => {
            saveFilterConfig({
                blockEnabled: fltBlockEnabledEl.checked,
                collapseSpam: fltCollapseEl.checked,
                collapseWindowSec: Number(fltWindowEl.value),
                blockKeywords: fltBlockWordsEl.value,
                highlightKeywords: fltHighlightWordsEl.value,
            });
            invalidateMatcherCache();
            reprocessChatroomMessages();
            showToast('弹幕过滤与折叠规则已保存');
        };
        [fltBlockEnabledEl, fltCollapseEl, fltWindowEl, fltBlockWordsEl, fltHighlightWordsEl].forEach((el) => {
            el.addEventListener('change', syncFilterFromForm);
        });

        // 快捷键列表渲染与交互
        const hotkeyListEl = panelEl.querySelector('#tm-hotkey-list');
        function renderHotkeyRows() {
            isRecordingShortcut = false;
            hotkeyListEl.innerHTML = '';
            hotkeyItems.forEach((item, idx) => {
                const row = document.createElement('div');
                row.className = 'tm-hotkey-row';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = !!item.enabled;
                chk.title = '启用/禁用该快捷键';
                chk.addEventListener('change', () => {
                    if (chk.checked) {
                        const ignoreId = hotkeyItems[idx]?.id || `hk-${idx}`;
                        const conflict = findShortcutConflict(hotkeyItems[idx]?.shortcut, ignoreId);
                        if (conflict) {
                            chk.checked = false;
                            showToast(`无法启用：与「${conflict}」按键冲突`, 2600);
                            return;
                        }
                    }
                    hotkeyItems[idx].enabled = chk.checked;
                    saveHotkeyItems(hotkeyItems);
                });

                const keyInput = document.createElement('input');
                keyInput.type = 'text';
                keyInput.readOnly = true;
                keyInput.className = 'tm-input-sm tm-hotkey-key';
                keyInput.title = '点击录制组合键';
                bindShortcutRecorder(keyInput, {
                    getCurrent: () => hotkeyItems[idx]?.shortcut,
                    placeholder: '按组合键...',
                    conflictIgnoreId: hotkeyItems[idx]?.id || `hk-${idx}`,
                    onSave: (nextSc) => {
                        hotkeyItems[idx].shortcut = nextSc;
                        saveHotkeyItems(hotkeyItems);
                    },
                });

                const textInput = document.createElement('input');
                textInput.type = 'text';
                textInput.className = 'tm-input-sm tm-hotkey-text';
                textInput.placeholder = '输入直发弹幕内容...';
                textInput.value = item.text || '';
                textInput.addEventListener('change', () => {
                    hotkeyItems[idx].text = normalizeSingleLineText(textInput.value).slice(0, 240);
                    saveHotkeyItems(hotkeyItems);
                });

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'tm-settings-btn';
                delBtn.textContent = '✕';
                delBtn.title = '删除该槽位';
                delBtn.addEventListener('click', () => {
                    saveHotkeyItems(hotkeyItems.filter((_, i) => i !== idx));
                    renderHotkeyRows();
                });

                row.appendChild(chk);
                row.appendChild(keyInput);
                row.appendChild(textInput);
                row.appendChild(delBtn);
                hotkeyListEl.appendChild(row);
            });
        }
        panelEl.querySelector('#tm-hotkey-add').addEventListener('click', () => {
            if (hotkeyItems.length >= 12) {
                showToast('最多配置 12 个快捷键槽位');
                return;
            }
            const nextNum = String((hotkeyItems.length % 9) + 1);
            saveHotkeyItems([
                ...hotkeyItems,
                { id: `hk-${Date.now().toString(36)}`, enabled: false, shortcut: { alt: true, shift: false, ctrl: false, meta: false, key: nextNum }, text: '' },
            ]);
            renderHotkeyRows();
        });

        // 画质与干扰精简事件
        const qualityPrefEl = panelEl.querySelector('#tm-quality-pref');
        const qualityRememberEl = panelEl.querySelector('#tm-quality-remember');
        qualityPrefEl.addEventListener('change', () => {
            saveQualityConfig({ preferredQuality: qualityPrefEl.value });
            syncQualityPreference({ force: true });
        });
        qualityRememberEl.addEventListener('change', () => {
            saveQualityConfig({ rememberManual: qualityRememberEl.checked });
        });
        panelEl.querySelector('#tm-quality-apply-now').addEventListener('click', () => {
            const switched = syncQualityPreference({ force: true });
            if (!switched) showToast('当前已是偏好画质或未找到清晰度菜单');
        });

        const cleanGiftsEl = panelEl.querySelector('#tm-clean-gifts');
        const cleanEntranceEl = panelEl.querySelector('#tm-clean-entrance');
        const cleanRecommendEl = panelEl.querySelector('#tm-clean-recommend');
        const syncCleanFromForm = () => {
            saveCleanModeConfig({
                hideGiftEffects: cleanGiftsEl.checked,
                hideEntrance: cleanEntranceEl.checked,
                hideRecommend: cleanRecommendEl.checked,
            });
            applyCleanModeClasses();
        };
        [cleanGiftsEl, cleanEntranceEl, cleanRecommendEl].forEach(el => el.addEventListener('change', syncCleanFromForm));

        // 全量备份与 JSON 插件中心事件
        const backupFileEl = panelEl.querySelector('#tm-backup-file');
        panelEl.querySelector('#tm-backup-export').addEventListener('click', exportAllConfigs);
        panelEl.querySelector('#tm-backup-import').addEventListener('click', () => backupFileEl.click());
        backupFileEl.addEventListener('change', () => {
            const file = backupFileEl.files?.[0];
            backupFileEl.value = '';
            if (file) importAllConfigsFromFile(file);
        });

        const pluginFileEl = panelEl.querySelector('#tm-plugin-import-file');
        const pluginPasteEl = panelEl.querySelector('#tm-plugin-paste-area');
        const pluginListEl = panelEl.querySelector('#tm-plugin-list');

        function renderPluginCards() {
            pluginListEl.innerHTML = '';
            if (!jsonPlugins.length) {
                const empty = document.createElement('div');
                empty.className = 'tm-settings-desc';
                empty.style.marginTop = '8px';
                empty.textContent = '暂无已安装插件，可点击「加载示例」或导入 JSON。';
                pluginListEl.appendChild(empty);
                return;
            }
            jsonPlugins.forEach((plugin) => {
                const card = document.createElement('div');
                card.className = 'tm-plugin-card';

                const head = document.createElement('div');
                head.className = 'tm-plugin-head';
                const titleSpan = document.createElement('span');
                titleSpan.textContent = `${plugin.name} v${plugin.version}`;
                const toggleLabel = document.createElement('label');
                toggleLabel.style.cssText = 'display:inline-flex;align-items:center;gap:4px;font-weight:500;cursor:pointer;';
                const toggleChk = document.createElement('input');
                toggleChk.type = 'checkbox';
                toggleChk.checked = !!plugin.enabled;
                toggleChk.addEventListener('change', () => toggleJsonPlugin(plugin.id, toggleChk.checked));
                const toggleTxt = document.createElement('span');
                toggleTxt.textContent = plugin.enabled ? '已启用' : '已停用';
                toggleLabel.appendChild(toggleChk);
                toggleLabel.appendChild(toggleTxt);
                head.appendChild(titleSpan);
                head.appendChild(toggleLabel);

                const meta = document.createElement('div');
                meta.className = 'tm-plugin-meta';
                const caps = [];
                if (plugin.memes.length) caps.push(`弹幕+${plugin.memes.length}`);
                if (plugin.hotkeys.length) caps.push(`快捷键+${plugin.hotkeys.length}`);
                if (plugin.filters.blockKeywords.length || plugin.filters.highlightKeywords.length) caps.push('过滤/高亮');
                if (plugin.captions.length) caps.push(`配文+${plugin.captions.length}`);
                if (plugin.hideSelectors.length) caps.push(`隐藏规则+${plugin.hideSelectors.length}`);
                if (plugin.autoReplies.length) caps.push(`触发规则+${plugin.autoReplies.length}`);
                meta.textContent = `${plugin.description || '无描述'}（作者: ${plugin.author} | 能力: ${caps.join('、') || '无'}）`;

                const actions = document.createElement('div');
                actions.className = 'tm-settings-row';
                if (plugin.autoReplies.some(r => r.mode === 'send')) {
                    const sendOptLabel = document.createElement('label');
                    sendOptLabel.className = 'tm-settings-check';
                    sendOptLabel.style.margin = '0 auto 0 0';
                    const sendOptChk = document.createElement('input');
                    sendOptChk.type = 'checkbox';
                    sendOptChk.checked = !!plugin.allowAutoSend;
                    sendOptChk.addEventListener('change', () => toggleJsonPluginAutoSend(plugin.id, sendOptChk.checked));
                    const sendOptTxt = document.createElement('span');
                    sendOptTxt.textContent = '允许自动发弹幕';
                    sendOptTxt.title = '安全开关：未勾选时插件的自动发送规则仅提示或填入草稿，不直接发送';
                    sendOptLabel.appendChild(sendOptChk);
                    sendOptLabel.appendChild(sendOptTxt);
                    actions.appendChild(sendOptLabel);
                }
                const expBtn = document.createElement('button');
                expBtn.type = 'button';
                expBtn.className = 'tm-settings-btn';
                expBtn.textContent = '导出 JSON';
                expBtn.addEventListener('click', () => exportJsonPlugin(plugin.id));
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'tm-settings-btn';
                delBtn.textContent = '卸载';
                delBtn.addEventListener('click', () => removeJsonPlugin(plugin.id));
                actions.appendChild(expBtn);
                actions.appendChild(delBtn);

                card.appendChild(head);
                card.appendChild(meta);
                card.appendChild(actions);
                pluginListEl.appendChild(card);
            });
        }

        panelEl.querySelector('#tm-plugin-import-btn').addEventListener('click', () => pluginFileEl.click());
        pluginFileEl.addEventListener('change', () => {
            const file = pluginFileEl.files?.[0];
            pluginFileEl.value = '';
            if (!file) return;
            if (typeof file.size === 'number' && file.size > MAX_JSON_FILE_BYTES) {
                showToast(`插件导入失败：文件超过 ${Math.round(MAX_JSON_FILE_BYTES / 1024)}KB 上限`);
                return;
            }
            const reader = new FileReader();
            const epoch = roomEpoch;
            reader.onload = () => {
                if (!isCurrentRoom(epoch)) return;
                try {
                    installJsonPluginFromRaw(String(reader.result || ''));
                } catch (err) {
                    showToast(`插件安装失败：${err?.message || 'JSON 无效'}`);
                }
            };
            reader.onerror = () => showToast('读取插件文件失败');
            reader.readAsText(file, 'utf-8');
        });
        panelEl.querySelector('#tm-plugin-sample').addEventListener('click', () => {
            try {
                installJsonPluginFromRaw(SAMPLE_JSON_PLUGIN);
                pluginPasteEl.value = JSON.stringify(SAMPLE_JSON_PLUGIN, null, 2);
            } catch (err) {
                showToast(`安装示例插件失败：${err?.message || err}`);
            }
        });
        panelEl.querySelector('#tm-plugin-install-paste').addEventListener('click', () => {
            try {
                installJsonPluginFromRaw(pluginPasteEl.value);
            } catch (err) {
                showToast(`安装失败：${err?.message || '请检查 JSON 格式'}`);
            }
        });

        refreshAllSettingsUi = () => {
            if (!panelEl) return;
            legacyOpt.checked = legacyCanvasEnabled;
            lotEnabledEl.checked = lotteryConfig.enabled;
            lotAutoEl.checked = lotteryConfig.autoSend;
            lotCapChatEl.checked = lotteryConfig.captureCommandFromChat;
            lotCapSecEl.value = String(lotteryConfig.captureDurationSec);
            syncCapturePresetActive();
            lotModeEl.value = lotteryConfig.timingMode;
            lotOffsetEl.value = String(lotteryConfig.offsetSeconds);
            lotJitterEl.value = String(lotteryConfig.jitterSeconds);
            lotFallbackEl.value = lotteryConfig.fallbackCommand;

            fltBlockEnabledEl.checked = filterConfig.blockEnabled;
            fltCollapseEl.checked = filterConfig.collapseSpam;
            fltWindowEl.value = String(filterConfig.collapseWindowSec);
            fltBlockWordsEl.value = filterConfig.blockKeywords.join(', ');
            fltHighlightWordsEl.value = filterConfig.highlightKeywords.join(', ');
            refreshFilterStatsUi();

            qualityPrefEl.value = qualityConfig.preferredQuality;
            qualityRememberEl.checked = qualityConfig.rememberManual;
            cleanGiftsEl.checked = cleanModeConfig.hideGiftEffects;
            cleanEntranceEl.checked = cleanModeConfig.hideEntrance;
            cleanRecommendEl.checked = cleanModeConfig.hideRecommend;

            renderHotkeyRows();
            renderPluginCards();
        };

        refreshAllSettingsUi();
        refreshShotConfigDisplays();
        renderLotteryBanner();
        renderFanBar();
        refreshFanStatus({ manual: false });

        panelEl.addEventListener('keydown', (e) => {
            if (isRecordingShortcut) return;
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                panelEl.style.display = 'none';
            }
        });
        panelEl.addEventListener('keyup', (e) => e.stopPropagation());
        panelEl.addEventListener('keypress', (e) => e.stopPropagation());
        panelEl.addEventListener('mousedown', (e) => e.stopPropagation());
        panelEl.addEventListener('pointerdown', (e) => e.stopPropagation());
        panelEl.addEventListener('click', (e) => e.stopPropagation());

        setupDraggable(panelEl, panelEl.querySelector('#tm-panel-header'));

        renderTagsBar();
        renderMemeList();

        return panelEl;
    }

    function clampElementToViewport(el) {
        if (!el || !el.isConnected || el.style.display === 'none') return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        if (vw < 200 || vh < 200) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (!w || !h) return;
        const rect = el.getBoundingClientRect();
        if (rect.right > vw - 8 || rect.left < 8 || rect.bottom > vh - 8 || rect.top < 8) {
            el.style.left = `${Math.max(8, Math.min(Math.max(8, vw - w - 8), rect.left))}px`;
            el.style.top = `${Math.max(8, Math.min(Math.max(8, vh - h - 8), rect.top))}px`;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
    }

    function clampAllFloatingToViewport() {
        for (const id of ['tm-danmu-ball', 'tm-danmu-panel', 'tm-shot-panel']) {
            clampElementToViewport(document.getElementById(id));
        }
    }

    function togglePanel(e) {
        if (!isTargetRoom()) return;
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        const panel = createPanel();
        ensureInOverlayRoot(panel);

        if (panel.style.display === 'flex') {
            isRecordingShortcut = false;
            panel.style.display = 'none';
        } else {
            panel.style.display = 'flex';
            clampElementToViewport(panel);
            refreshFanStatus({ manual: false });
            if (searchInputEl) {
                const epoch = roomEpoch;
                setTimeout(() => { if (isCurrentRoom(epoch) && panel.style.display === 'flex') searchInputEl.focus(); }, 60);
            }
        }
    }

    function setupDraggable(target, handle, onDragStateChange) {
        let dragState = null;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target.closest('button, a, input, label, textarea, select') && handle !== target) return;
            const rect = target.getBoundingClientRect();
            dragState = {
                pointerId: e.pointerId,
                hasMoved: false,
                startX: e.clientX,
                startY: e.clientY,
                origX: rect.left,
                origY: rect.top
            };
            try {
                handle.setPointerCapture(e.pointerId);
            } catch (_) {}
        });

        handle.addEventListener('pointermove', (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            if (!dragState.hasMoved) {
                if (Math.hypot(dx, dy) <= 4) return;
                dragState.hasMoved = true;
            }
            const maxLeft = Math.max(8, window.innerWidth - target.offsetWidth - 8);
            const maxTop = Math.max(8, window.innerHeight - target.offsetHeight - 8);
            target.style.left = `${Math.max(8, Math.min(maxLeft, dragState.origX + dx))}px`;
            target.style.top = `${Math.max(8, Math.min(maxTop, dragState.origY + dy))}px`;
            target.style.right = 'auto';
            target.style.bottom = 'auto';
            target.dataset.tmDragged = '1';
        });

        const endDrag = (e) => {
            if (!dragState || e.pointerId !== dragState.pointerId) return;
            const moved = dragState.hasMoved;
            dragState = null;
            try {
                if (handle.hasPointerCapture?.(e.pointerId)) {
                    handle.releasePointerCapture(e.pointerId);
                }
            } catch (_) {}
            if (onDragStateChange) onDragStateChange(moved);
        };

        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);
    }

    function mountIconButtons() {
        // 1. 悬浮球
        let ball = document.getElementById('tm-danmu-ball');
        if (!ball) {
            ball = document.createElement('div');
            ball.id = 'tm-danmu-ball';
            ball.setAttribute('role', 'button');
            ball.setAttribute('aria-label', '打开直播间小助手');
            ball.tabIndex = 0;
            ball.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') togglePanel(e);
            });
            ball.title = `${STREAMER_NAME} · 直播间小助手 (点击打开/关闭)`;
            const ballImg = document.createElement('img');
            applyAvatarSrc(ballImg);
            ballImg.alt = STREAMER_NAME;
            ball.appendChild(ballImg);

            let skipNextClick = false;
            setupDraggable(ball, ball, (moved) => {
                skipNextClick = moved;
                if (moved) {
                    setTimeout(() => { skipNextClick = false; }, 120);
                }
            });
            ball.addEventListener('pointerdown', (e) => e.stopPropagation());
            ball.addEventListener('mousedown', (e) => e.stopPropagation());
            ball.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (skipNextClick) return;
                togglePanel(e);
            });
        } else {
            const ballImg = ball.querySelector('img');
            if (ballImg && !ballImg.getAttribute('src')) applyAvatarSrc(ballImg);
        }
        ensureInOverlayRoot(ball);
        ball.style.display = 'flex';
        if (ball.dataset.tmDragged === '1') {
            clampElementToViewport(ball);
        }

        // 截图功能已并入小助手面板右上角，移除遗留的独立截图悬浮球
        document.getElementById('tm-shot-fab')?.remove();

        // 2. 播放器控制栏按钮（截图已并入小助手面板右上角）
        const controlsRights = document.querySelectorAll('.douyin-player-controls-right');
        controlsRights.forEach((controlsRight) => {
            if (controlsRight.querySelector('.tm-ctrl-slot')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'tm-ctrl-slot';

            const btn = document.createElement('button');
            btn.className = 'tm-toolbar-btn';
            btn.type = 'button';
            const btnImg = document.createElement('img');
            applyAvatarSrc(btnImg);
            btnImg.alt = '';
            const btnLabel = document.createElement('span');
            btnLabel.textContent = '小助手';
            btn.appendChild(btnImg);
            btn.appendChild(btnLabel);
            btn.title = `打开 ${STREAMER_NAME} 直播间小助手`;

            const blockBubble = (e) => e.stopPropagation();
            btn.addEventListener('pointerdown', blockBubble);
            btn.addEventListener('mousedown', blockBubble);
            btn.addEventListener('mouseup', blockBubble);
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePanel(e);
            });

            wrapper.appendChild(btn);

            const qualityEl = controlsRight.querySelector('.QualitySwitchNewPlugin');
            const qualitySlot = qualityEl ? qualityEl.closest('slot') || qualityEl : null;
            if (qualitySlot && qualitySlot.parentElement === controlsRight) {
                controlsRight.insertBefore(wrapper, qualitySlot.nextSibling);
            } else {
                controlsRight.appendChild(wrapper);
            }
        });
        updateLotteryIndicators(Boolean(activeLottery));
    }

    function handleFullscreenChange() {
        if (!isTargetRoom()) return;
        ensureInOverlayRoot(document.getElementById('tm-danmu-ball'));
        ensureInOverlayRoot(document.getElementById('tm-danmu-panel'));
        ensureInOverlayRoot(document.getElementById('tm-toast'));
        ensureInOverlayRoot(document.getElementById('tm-danmu-highlight-box'));
        ensureInOverlayRoot(document.getElementById('tm-danmu-actions'));
        ensureInOverlayRoot(document.getElementById('tm-shot-panel'));
        ensureInOverlayRoot(document.getElementById('tm-shot-frame'));
        clampAllFloatingToViewport();
        if (captureEditing) positionCaptureFrame();
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // ==========================================
    // 7. 原生弹幕消息提取与 Store 监听
    // ==========================================
    function extractSenderFromMsgPayload(msg) {
        const u = msg?.payload?.user;
        if (!u || typeof u !== 'object') return '';
        return normalizeSingleLineText(u.nickname || u.desensitized_nickname || u.display_id || u.short_id || u.id_str || u.id || '');
    }

    function extractTextFromMsgPayload(msg) {
        const payload = msg?.payload;
        if (!payload) return '';
        if (payload.content && (!payload.rtf_content_v2 || !Array.isArray(payload.rtf_content_v2.pieces))) {
            return normalizeSingleLineText(payload.content);
        }
        if (payload.rtf_content_v2 && Array.isArray(payload.rtf_content_v2.pieces)) {
            let text = '';
            payload.rtf_content_v2.pieces.forEach(p => {
                if (p.string_value) {
                    text += p.string_value;
                } else if (p.image_value) {
                    const url = p.image_value?.image?.url_list?.[0];
                    if (url && emojiUrlToNameMap.has(url)) {
                        text += emojiUrlToNameMap.get(url);
                    }
                } else if (p.user_value && p.user_value.user) {
                    text += `${p.user_value.left_additional_content || ''}${p.user_value.user.nickname || ''}${p.user_value.right_additional_content || ''}`;
                }
            });
            if (text) return normalizeSingleLineText(text);
        }
        return normalizeSingleLineText(payload.content || '');
    }

    function getChatroomContainer() {
        return document.getElementById('chatroom')
            || document.querySelector('[data-e2e="live-chatting"], .webcast-chatroom');
    }

    function findSenderFromChatDom(text) {
        if (!text) return '';
        try {
            const chatroom = getChatroomContainer();
            if (!chatroom) return '';
            const items = chatroom.querySelectorAll('.webcast-chatroom___item, [data-danmu-id]');
            const candidates = new Set();
            const minIdx = Math.max(0, items.length - 30);
            for (let i = items.length - 1; i >= minIdx; i--) {
                const el = items[i];
                const raw = (el.textContent || '').trim();
                if (!raw || !raw.includes(text)) continue;
                // 文本只是模糊关联。不同用户发送同样的弹幕时禁止猜测发送者。

                let f = getReactFiber(el);
                let steps = 0;
                let foundByFiber = false;
                let fiberMsgText = '';
                let fiberSender = '';
                while (f && steps < 6) {
                    const msg = f.memoizedProps?.message || f.memoizedProps?.item || f.memoizedProps?.data;
                    if (msg?.payload) {
                        fiberMsgText = extractTextFromMsgPayload(msg);
                        fiberSender = extractSenderFromMsgPayload(msg);
                        foundByFiber = true;
                        break;
                    }
                    f = f.return;
                    steps++;
                }
                if (foundByFiber) {
                    if (fiberMsgText === text && fiberSender) {
                        candidates.add(fiberSender);
                    }
                    continue;
                }

                const clean = normalizeSingleLineText(raw);
                const colonMatch = clean.match(/[:：]\s*(.+)$/);
                if (colonMatch && normalizeSingleLineText(colonMatch[1]) === text) {
                    const pos = clean.lastIndexOf(text);
                    const before = clean.slice(0, pos).replace(/[：:]\s*$/, '').trim();
                    const tokens = before.split(' ').filter(Boolean);
                    const lastToken = tokens[tokens.length - 1] || '';
                    if (lastToken && !/^\d+$/.test(lastToken)) {
                        candidates.add(normalizeSingleLineText(lastToken));
                    }
                }
            }
            if (candidates.size === 1) return [...candidates][0];
        } catch (e) {}
        return '';
    }

    function extractBarrageInfo(options) {
        if (!options) return null;

        if (options.id) {
            const rawId = String(options.id);
            if (msgMetaMap.has(rawId)) {
                return msgMetaMap.get(rawId);
            }
            if (rawId.length > 15) {
                const maybePrefix = rawId.slice(0, rawId.length - 13);
                if (msgMetaMap.has(maybePrefix)) {
                    return msgMetaMap.get(maybePrefix);
                }
            }
        }

        if (options.color === '#ff4471') return null;

        const pieces = [];
        function walk(node) {
            if (!node) return;
            if (Array.isArray(node)) {
                node.forEach(walk);
                return;
            }
            if (node.type === 'text' && node.text) {
                pieces.push(node.text);
            } else if (node.type === 'image' && node.src && emojiUrlToNameMap.has(node.src)) {
                pieces.push(emojiUrlToNameMap.get(node.src));
            } else if (Array.isArray(node.content)) {
                walk(node.content);
            }
        }
        walk(options.content);

        let text = normalizeSingleLineText(pieces.join(''));
        if (!text) return null;

        let sender = '';
        const firstTextNode = Array.isArray(options.content)
            ? (options.content[0]?.type === 'text' ? options.content[0].text : options.content[0]?.content?.[0]?.text)
            : '';
        if (typeof firstTextNode === 'string' && /:\s{2}$/.test(firstTextNode)) {
            sender = normalizeSingleLineText(firstTextNode.replace(/:\s{2}$/, ''));
            if (text.startsWith(firstTextNode.trim())) {
                text = normalizeSingleLineText(text.slice(firstTextNode.trim().length));
            }
        }

        if (text.startsWith('管理') && Array.isArray(options.content) && options.content[0]?.content?.[0]?.text === '管理') {
            text = normalizeSingleLineText(text.slice(2));
        }

        if (!text) return null;
        if (shouldBlockDanmuText(text)) return null;
        if (!sender) {
            sender = findSenderFromChatDom(text);
        }
        return { text: normalizeSingleLineText(text), sender: normalizeSingleLineText(sender) };
    }

    const messageBusHandlers = new Map();
    function detachMessageBus(bus, eventMap) {
        for (const [eventName, fn] of eventMap) {
            try {
                if (typeof bus.off === 'function') bus.off(eventName, fn);
                else if (typeof bus.removeListener === 'function') bus.removeListener(eventName, fn);
            } catch (_) {}
        }
        messageBusHandlers.delete(bus);
    }
    function cleanupMessageListeners() {
        for (const [bus, eventMap] of messageBusHandlers) {
            detachMessageBus(bus, eventMap);
        }
        messageBusHandlers.clear();
        msgMetaMap.clear();
    }

    function mayContainLotteryField(obj) {
        if (!obj || typeof obj !== 'object') return false;
        return Boolean(
            obj.lottery_id_str || obj.lottery_id ||
            obj.prize_command || obj.lottery_command ||
            obj.lucky_time || obj.draw_time ||
            obj.lottery || obj.lottery_info || obj.payload?.lottery || obj.payload?.lottery_info
        );
    }

    function hookDanmuMessageStore() {
        if (!isTargetRoom()) return;
        const activeBuses = new Set();
        for (const cp of document.querySelectorAll('.CanvasDanmakuPlugin')) {
            try {
                let fiber = getReactFiber(cp);
                let store = null;
                let steps = 0;
                while (fiber && steps++ < 12) {
                    if (fiber.memoizedProps?.store) {
                        store = fiber.memoizedProps.store;
                        break;
                    }
                    fiber = fiber.return;
                }
                if (!store) continue;
                if (!emojiReverseReady && store.roomStore?.emojiReflex) {
                    emojiReverseReady = true;
                    for (const [name, url] of Object.entries(store.roomStore.emojiReflex)) {
                        if (url) emojiUrlToNameMap.set(url, name);
                    }
                }
                const storeLottery = store.roomStore?.lotteryInfo || store.roomStore?.lottery || store.lotteryStore?.lotteryInfo;
                if (storeLottery && typeof storeLottery === 'object') {
                    extractLotteryFromPayload(storeLottery);
                }
                const storeUser = store.userStore?.userInfo || store.userStore?.user || store.commonStore?.userInfo || store.roomStore?.selfInfo || store.roomStore?.userInfo;
                if (storeUser && typeof storeUser === 'object') {
                    extractFanStatusFromPayload({ self_info: storeUser }, 'store:user');
                }
                const storeFan = store.fansClubStore || store.roomStore?.fansClubInfo || store.roomStore?.fansclub;
                if (storeFan && typeof storeFan === 'object') {
                    extractFanStatusFromPayload(storeFan, 'store:fansclub');
                }
                const bus = store.singletonStore?.message;
                if (!bus || typeof bus.on !== 'function' || (typeof bus.off !== 'function' && typeof bus.removeListener !== 'function')) continue;
                activeBuses.add(bus);
                if (!messageBusHandlers.has(bus)) {
                    const eventMap = new Map();
                    const events = ['ChatMessage', 'ScreenChatMessage', 'PrivilegeScreenChatMessage', 'LotteryEventMessage', 'WebcastLotteryEventMessage'];
                    for (const eventName of events) {
                        const isLotteryEvent = /Lottery/i.test(eventName);
                        const fn = (list) => {
                            if (!isTargetRoom() || !Array.isArray(list)) return;
                            for (const m of list) {
                                if (isLotteryEvent || mayContainLotteryField(m)) {
                                    extractLotteryFromPayload(m);
                                }
                                const msgId = m?.msg_id || m?.payload?.common?.msg_id;
                                const txt = extractTextFromMsgPayload(m);
                                const sender = extractSenderFromMsgPayload(m);
                                const userObj = m?.user || m?.payload?.user;
                                if (userObj && m?.is_self) {
                                    const fc = userObj.fans_club?.data || userObj.fans_club || userObj.fansclub;
                                    if (fc && typeof fc === 'object') {
                                        extractFanStatusFromPayload({ fans_club: { data: fc }, self_info: { nickname: userObj.nickname } }, 'bus:self-chat');
                                    }
                                }
                                if (txt) {
                                    feedLotteryCommandCapture(txt, {
                                        msgId: msgId ? String(msgId) : '',
                                        sender: sender || '',
                                    });
                                }
                                if (!msgId || !txt) continue;
                                msgMetaMap.set(String(msgId), { text: txt, sender });
                                if (msgMetaMap.size > 800) msgMetaMap.delete(msgMetaMap.keys().next().value);
                                processIncomingTextForPluginReplies(txt, String(msgId));
                            }
                        };
                        bus.on(eventName, fn);
                        eventMap.set(eventName, fn);
                    }
                    messageBusHandlers.set(bus, eventMap);
                }
            } catch (_) { /* 内部 Store 接口随平台升级变化，跳过即可 */ }
        }
        for (const [bus, handlers] of messageBusHandlers) {
            if (!activeBuses.has(bus)) detachMessageBus(bus, handlers);
        }
    }

    // ==========================================
    // 7B. 弹幕屏蔽与刷屏折叠、福袋自动嗅探、画质记忆与干扰精简
    // ==========================================
    let danmuFilterStats = { blocked: 0, collapsed: 0 };
    let cachedMatchers = null;

    function invalidateMatcherCache() {
        cachedMatchers = null;
    }

    function isPotentiallyUnsafeRegexPattern(pattern) {
        // 主线程只接受简单正则；拒绝分组、反向引用及多个可变重复以避免回溯阻塞。
        const structural = pattern.replace(/\\[1-9]/g, '(').replace(/\\./g, 'x').replace(/\[(?:\\.|[^\]\\])*\]/g, 'x');
        return /[()]/.test(structural) || (structural.match(/[+*?]|\{\d+,\d*\}/g) || []).length > 1 || /\{\d{4,}/.test(structural);
    }

    function compileKeywordMatchers(list) {
        const out = [];
        for (const raw of list || []) {
            const s = String(raw || '').trim();
            if (!s) continue;
            const regexLike = s.match(/^\/(.+)\/([gimsuy]*)$/);
            if (regexLike) {
                const body = regexLike[1].slice(0, 80);
                if (!isPotentiallyUnsafeRegexPattern(body)) {
                    try {
                        const flags = regexLike[2].replace(/[gy]/g, '');
                        const re = new RegExp(body, flags);
                        out.push((text) => re.test(text.slice(0, 300)));
                        continue;
                    } catch (_) {}
                }
            }
            const low = s.toLowerCase();
            out.push((text) => text.toLowerCase().includes(low));
        }
        return out;
    }

    function getCompiledMatchers() {
        if (cachedMatchers) return cachedMatchers;
        const pluginBlocks = [];
        const pluginHighlights = [];
        for (const p of getActiveJsonPlugins()) {
            pluginBlocks.push(...p.filters.blockKeywords);
            pluginHighlights.push(...p.filters.highlightKeywords);
        }
        cachedMatchers = {
            block: filterConfig.blockEnabled
                ? compileKeywordMatchers([...filterConfig.blockKeywords, ...pluginBlocks])
                : [],
            highlight: compileKeywordMatchers([...filterConfig.highlightKeywords, ...pluginHighlights]),
        };
        return cachedMatchers;
    }

    function shouldBlockDanmuText(text) {
        if (!text) return false;
        const { block } = getCompiledMatchers();
        return block.some((fn) => fn(text));
    }

    function shouldHighlightDanmuText(text) {
        if (!text) return false;
        const { highlight } = getCompiledMatchers();
        return highlight.some((fn) => fn(text));
    }

    const pluginReplyCooldownMap = new Map();
    const recentPluginTriggerMap = new Map();
    function processIncomingTextForPluginReplies(text, msgId = '') {
        if (!text || !isTargetRoom() || isRecentSelfSentText(text)) return;
        const now = Date.now();
        const dedupeKey = msgId ? `id:${msgId}` : `txt:${text.toLowerCase()}`;
        const prevTs = recentPluginTriggerMap.get(dedupeKey);
        if (typeof prevTs === 'number' && now - prevTs < 1500) return;
        recentPluginTriggerMap.set(dedupeKey, now);
        if (recentPluginTriggerMap.size > 200) {
            for (const [k, ts] of recentPluginTriggerMap) {
                if (now - ts > 5000) recentPluginTriggerMap.delete(k);
            }
        }
        for (const plugin of getActiveJsonPlugins()) {
            for (let i = 0; i < plugin.autoReplies.length; i++) {
                const rule = plugin.autoReplies[i];
                if (!text.toLowerCase().includes(rule.match.toLowerCase())) continue;
                const key = `${plugin.id}:${i}`;
                const nextAllowed = pluginReplyCooldownMap.get(key) || 0;
                if (now < nextAllowed) continue;
                pluginReplyCooldownMap.set(key, now + rule.cooldownSec * 1000);
                if (rule.mode === 'send' && plugin.allowAutoSend) {
                    sendBarrage(rule.reply, { isAuto: true,
                        canDispatch: () => jsonPlugins.includes(plugin) && plugin.enabled && plugin.allowAutoSend,
                    });
                } else if (rule.mode === 'fill' || (rule.mode === 'send' && !plugin.allowAutoSend)) {
                    fillReplyToChatInput('', rule.reply);
                } else {
                    showToast(`插件提示「${plugin.name}」：${rule.reply}`, 3200);
                }
                return;
            }
        }
    }

    let chatroomObserver = null;
    let observedChatroomEl = null;
    let processedChatItems = new WeakMap(); // itemEl -> { sig }
    const recentChatSpamMap = new Map(); // normText -> { ts, count, anchorEl, badgeEl }

    function readChatItemTextWithoutBadge(el) {
        if (!el) return '';
        if (!el.querySelector?.('.tm-spam-badge')) return el.textContent || '';
        const walk = (node) => {
            if (!node) return '';
            if (node.nodeType === 3) return node.textContent || '';
            if (node.classList?.contains('tm-spam-badge')) return '';
            const kids = node.childNodes;
            if (!kids || !kids.length) return node.textContent || '';
            let txt = '';
            for (let i = 0; i < kids.length; i++) txt += walk(kids[i]);
            return txt;
        };
        return walk(el);
    }

    function extractChatItemMeta(itemEl) {
        if (!itemEl) return { text: '', msgId: '', sender: '' };
        const attrId = itemEl.getAttribute('data-danmu-id') || itemEl.getAttribute('data-msg-id') || '';
        let f = getReactFiber(itemEl);
        let steps = 0;
        while (f && steps++ < 6) {
            const msg = f.memoizedProps?.message || f.memoizedProps?.item || f.memoizedProps?.data;
            const txt = extractTextFromMsgPayload(msg);
            if (txt) {
                return {
                    text: txt,
                    msgId: String(msg?.msg_id || attrId || ''),
                    sender: extractSenderFromMsgPayload(msg),
                };
            }
            f = f.return;
        }
        const raw = normalizeSingleLineText(readChatItemTextWithoutBadge(itemEl));
        const colonIdx = raw.search(/[：:]/);
        const sender = colonIdx > 0 && colonIdx < 28 ? normalizeSingleLineText(raw.slice(0, colonIdx)) : '';
        const fallbackTxt = colonIdx >= 0 && colonIdx < 28 ? normalizeSingleLineText(raw.slice(colonIdx + 1)) : raw;
        return { text: fallbackTxt, msgId: String(attrId || ''), sender };
    }

    function updateSpamBadge(record) {
        if (!record?.anchorEl || !record.anchorEl.isConnected) return;
        if (!record.badgeEl || record.badgeEl.parentElement !== record.anchorEl) {
            const badge = document.createElement('span');
            badge.className = 'tm-spam-badge';
            record.anchorEl.appendChild(badge);
            record.badgeEl = badge;
        }
        const label = `×${record.count}`;
        if (record.badgeEl.textContent !== label) {
            record.badgeEl.textContent = label;
        }
    }

    function processChatItemElement(itemEl, { forceReprocess = false, countStats = !forceReprocess, skipAutoReplies = false } = {}) {
        if (!itemEl || !isTargetRoom()) return;
        const { text, msgId, sender } = extractChatItemMeta(itemEl);
        if (!text) {
            processedChatItems.delete(itemEl);
            itemEl.classList.remove('tm-danmu-hidden', 'tm-danmu-highlight');
            itemEl.querySelectorAll('.tm-spam-badge').forEach(b => b.remove());
            return;
        }
        const key = text.toLowerCase();
        const sig = msgId ? `${msgId}:${text}` : text;
        const prev = processedChatItems.get(itemEl);
        if (!forceReprocess && prev && prev.sig === sig) return;
        processedChatItems.set(itemEl, { sig, textKey: key });

        // 清理复用节点或重处理时的旧标记
        itemEl.classList.remove('tm-danmu-hidden', 'tm-danmu-highlight');
        const oldBadges = itemEl.querySelectorAll('.tm-spam-badge');
        if (oldBadges.length) oldBadges.forEach(b => b.remove());

        if (shouldBlockDanmuText(text)) {
            itemEl.classList.add('tm-danmu-hidden');
            if (countStats) {
                danmuFilterStats.blocked++;
                refreshFilterStatsUi();
            }
            return;
        }

        if (!forceReprocess && !skipAutoReplies) {
            feedLotteryCommandCapture(text, { msgId, sender, itemEl });
        }

        if (shouldHighlightDanmuText(text)) {
            itemEl.classList.add('tm-danmu-highlight');
        }

        if (!skipAutoReplies) {
            processIncomingTextForPluginReplies(text, msgId);
        }

        if (filterConfig.collapseSpam) {
            const now = Date.now();
            const winMs = filterConfig.collapseWindowSec * 1000;
            const existing = recentChatSpamMap.get(key);
            if (existing && (now - existing.ts) <= winMs) {
                existing.count++;
                existing.ts = now;
                const anchorMeta = existing.anchorEl ? processedChatItems.get(existing.anchorEl) : null;
                if (
                    existing.anchorEl &&
                    existing.anchorEl !== itemEl &&
                    existing.anchorEl.isConnected &&
                    !existing.anchorEl.classList.contains('tm-danmu-hidden') &&
                    anchorMeta?.textKey === key
                ) {
                    itemEl.classList.add('tm-danmu-hidden');
                    updateSpamBadge(existing);
                    if (countStats) {
                        danmuFilterStats.collapsed++;
                        refreshFilterStatsUi();
                    }
                } else {
                    existing.anchorEl = itemEl;
                    existing.badgeEl = null;
                    updateSpamBadge(existing);
                }
            } else {
                recentChatSpamMap.set(key, { ts: now, count: 1, anchorEl: itemEl, badgeEl: null });
                if (recentChatSpamMap.size > 150) {
                    for (const [k, v] of recentChatSpamMap) {
                        if (now - v.ts > winMs) recentChatSpamMap.delete(k);
                    }
                    while (recentChatSpamMap.size > 300) recentChatSpamMap.delete(recentChatSpamMap.keys().next().value);
                }
            }
        }
    }

    function reprocessChatroomMessages() {
        if (!isTargetRoom()) return;
        const chatroom = getChatroomContainer();
        if (!chatroom) return;
        recentChatSpamMap.clear();
        chatroom.querySelectorAll('.webcast-chatroom___item, [data-danmu-id]').forEach((el) => {
            processChatItemElement(el, { forceReprocess: true, countStats: false, skipAutoReplies: true });
        });
    }

    function isOnlySpamBadgeMutation(mutation) {
        if (!mutation) return false;
        if (mutation.target instanceof Element && mutation.target.closest('.tm-spam-badge')) {
            return true;
        }
        const added = [...(mutation.addedNodes || [])];
        const removed = [...(mutation.removedNodes || [])];
        if (!added.length && !removed.length) return false;
        const allBadge = (nodes) => nodes.every(
            n => n instanceof Element && n.classList?.contains('tm-spam-badge')
        );
        return allBadge(added) && allBadge(removed);
    }

    function observeChatroomMessages() {
        if (!isTargetRoom()) return;
        const chatroom = getChatroomContainer();
        if (!chatroom) return;
        if (observedChatroomEl === chatroom && chatroomObserver) return;
        disconnectChatroomObserver();
        observedChatroomEl = chatroom;

        const collectItems = (node, bag) => {
            if (!(node instanceof Element) || node.classList?.contains('tm-spam-badge')) return;
            if (node.matches('.webcast-chatroom___item, [data-danmu-id]')) {
                bag.add(node);
            }
            node.querySelectorAll?.('.webcast-chatroom___item, [data-danmu-id]').forEach((el) => bag.add(el));
        };
        const initialBag = new Set();
        collectItems(chatroom, initialBag);
        initialBag.forEach((el) => processChatItemElement(el, { skipAutoReplies: true }));

        chatroomObserver = new MutationObserver((mutations) => {
            if (!isTargetRoom()) return;
            const batchItems = new Set();
            for (const m of mutations) {
                if (isOnlySpamBadgeMutation(m)) continue;
                for (const node of m.addedNodes) {
                    if (node instanceof Element) collectItems(node, batchItems);
                }
                const host = m.target instanceof Element ? m.target : m.target.parentElement;
                const hostItem = host?.closest('.webcast-chatroom___item, [data-danmu-id]');
                if (hostItem) batchItems.add(hostItem);
            }
            batchItems.forEach((el) => processChatItemElement(el));
        });
        chatroomObserver.observe(chatroom, { childList: true, characterData: true, subtree: true });
    }

    function disconnectChatroomObserver() {
        if (chatroomObserver) {
            try { chatroomObserver.disconnect(); } catch (_) {}
            chatroomObserver = null;
        }
        observedChatroomEl = null;
        recentChatSpamMap.clear();
    }

    // 福袋嗅探、公屏高频口令捕捉与预约发送调度
    let activeLottery = null; // { key, id, command, drawAtMs, detectedAtMs, scheduledSendAtMs, sent, cancelled, source }
    let activeLotteryCapture = null; // { startedAtMs, endsAtMs, durationSec, counts: Map, seenIds: Set, recentNoId: Map, capturedEls: WeakSet, bestText, bestCount, manual }
    let lotteryTickerId = 0;
    const handledLotteryKeys = new Set();

    function rememberHandledLotteryKey(key) {
        if (!key) return;
        if (handledLotteryKeys.has(key)) handledLotteryKeys.delete(key);
        handledLotteryKeys.add(key);
        while (handledLotteryKeys.size > 200) {
            const oldest = handledLotteryKeys.values().next().value;
            if (oldest === undefined) break;
            handledLotteryKeys.delete(oldest);
        }
    }

    function stopLotteryTicker() {
        if (lotteryTickerId) {
            clearInterval(lotteryTickerId);
            lotteryTickerId = 0;
        }
    }

    function formatCountdownMMSS(msLeft) {
        const sec = Math.max(0, Math.ceil(msLeft / 1000));
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function isEligibleLotteryCandidate(rawText) {
        const clean = normalizeSingleLineText(rawText);
        if (!clean || clean.length > 48) return '';
        if (clean.length < 2 && !/^[\u4e00-\u9fa5]$/.test(clean)) return '';
        if (/^[\s\p{P}\p{S}]+$/u.test(clean)) return '';
        if (isRecentSelfSentText(clean) || shouldBlockDanmuText(clean)) return '';
        if (/^(来了|进入直播间|欢迎|关注了主播|点赞了|送出了|加入了粉丝团|分享了直播间|为主播点赞)/.test(clean)) {
            return '';
        }
        return clean;
    }

    function pickBestCapturedCommand(capState) {
        if (!capState || !capState.counts.size) return null;
        const ranked = [...capState.counts.values()].sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            if (b.senders.size !== a.senders.size) return b.senders.size - a.senders.size;
            return b.lastTs - a.lastTs;
        });
        const best = ranked[0];
        const second = ranked[1] || null;
        if (!best || best.count < 3) return null;
        if (best.senders.size === 1 && capState.hasSenderInfo && best.count < 5) return null;
        const clearLead = !second || best.count >= second.count * 1.4 || (best.count - second.count) >= 2;
        if (!clearLead) return null;
        return best;
    }

    function startLotteryCommandCapture({ durationSec = lotteryConfig.captureDurationSec, manual = false } = {}) {
        if (!isTargetRoom()) return false;
        const sec = Math.max(5, Math.min(60, Math.round(Number(durationSec) || lotteryConfig.captureDurationSec || 15)));
        const now = Date.now();
        if (!activeLottery) {
            const key = `capture-${now}`;
            activeLottery = {
                key,
                id: key,
                command: '',
                drawAtMs: 0,
                detectedAtMs: now,
                scheduledSendAtMs: 0,
                sent: false,
                cancelled: false,
                source: 'capture',
            };
        } else if (manual) {
            activeLottery.command = '';
            activeLottery.sent = false;
            activeLottery.cancelled = false;
            activeLottery.scheduledSendAtMs = 0;
        }
        activeLotteryCapture = {
            startedAtMs: now,
            endsAtMs: now + sec * 1000,
            durationSec: sec,
            counts: new Map(),
            seenIds: new Set(),
            recentNoId: new Map(),
            capturedEls: new WeakSet(),
            hasSenderInfo: false,
            bestText: '',
            bestCount: 0,
            manual: !!manual,
        };
        startLotteryTicker();
        renderLotteryBanner();
        if (manual) {
            showToast(`🎯 已开启 ${sec} 秒公屏口令捕捉，统计高频重复弹幕中…`, 2800);
        }
        return true;
    }

    function feedLotteryCommandCapture(rawText, { msgId = '', sender = '', itemEl = null } = {}) {
        if (!activeLotteryCapture || !isTargetRoom()) return;
        const now = Date.now();
        if (now > activeLotteryCapture.endsAtMs) return;
        if (itemEl) {
            if (activeLotteryCapture.capturedEls.has(itemEl)) return;
            activeLotteryCapture.capturedEls.add(itemEl);
        }
        if (msgId) {
            const idKey = `id:${msgId}`;
            if (activeLotteryCapture.seenIds.has(idKey)) return;
            activeLotteryCapture.seenIds.add(idKey);
        }
        const clean = isEligibleLotteryCandidate(rawText);
        if (!clean) return;
        const normKey = clean.toLowerCase();
        const cleanSender = normalizeSingleLineText(sender || '');
        if (!msgId && cleanSender) {
            const dedupeKey = `${cleanSender}|${normKey}`;
            const prevTs = activeLotteryCapture.recentNoId.get(dedupeKey) || 0;
            if (now - prevTs < 1200) return;
            activeLotteryCapture.recentNoId.set(dedupeKey, now);
        }
        let rec = activeLotteryCapture.counts.get(normKey);
        if (!rec) {
            rec = { text: clean, count: 0, senders: new Set(), lastTs: now };
            activeLotteryCapture.counts.set(normKey, rec);
        }
        rec.count++;
        rec.lastTs = now;
        if (cleanSender) {
            rec.senders.add(cleanSender);
            activeLotteryCapture.hasSenderInfo = true;
        }
        let top = null;
        for (const entry of activeLotteryCapture.counts.values()) {
            if (!top || entry.count > top.count) top = entry;
        }
        if (top) {
            activeLotteryCapture.bestText = top.text;
            activeLotteryCapture.bestCount = top.count;
        }
    }

    function finalizeLotteryCommandCapture() {
        const cap = activeLotteryCapture;
        if (!cap) return;
        activeLotteryCapture = null;
        if (!activeLottery || !isTargetRoom()) return;

        const winner = pickBestCapturedCommand(cap);
        if (winner) {
            activeLottery.command = winner.text.slice(0, 80);
            activeLottery.key = `${activeLottery.id || 'cap'}:${activeLottery.command}`;
            if (lotteryConfig.autoSend && !activeLottery.sent && !activeLottery.cancelled) {
                activeLottery.scheduledSendAtMs = computeLotteryScheduleMs(activeLottery.drawAtMs, activeLottery.detectedAtMs);
            }
            renderLotteryBanner();
            showToast(`🎯 已捕捉福袋口令「${activeLottery.command}」（出现 ${winner.count} 次）`, 3200);
            return;
        }

        if (lotteryConfig.fallbackCommand) {
            activeLottery.command = normalizeSingleLineText(lotteryConfig.fallbackCommand).slice(0, 80);
            rescheduleActiveLotteryIfNeeded();
            showToast(`未发现明显高频口令，已回退兜底词「${activeLottery.command}」`, 2800);
        } else {
            renderLotteryBanner();
            showToast('捕捉窗口结束，未发现明显高频口令，可点横幅「抓口令」重捕', 3000);
        }
    }

    function updateLotteryIndicators(active) {
        const on = Boolean(active && lotteryConfig.enabled && isTargetRoom());
        const ball = document.getElementById('tm-danmu-ball');
        if (ball) ball.classList.toggle('tm-has-lottery', on);
        document.querySelectorAll('.tm-toolbar-btn').forEach((btn) => {
            btn.classList.toggle('tm-has-lottery', on);
        });
    }

    function renderLotteryBanner() {
        updateLotteryIndicators(Boolean(activeLottery));
        const banner = panelEl?.querySelector('#tm-lottery-banner');
        if (!banner) return;
        if (!activeLottery || !lotteryConfig.enabled || !isTargetRoom()) {
            banner.style.display = 'none';
            return;
        }
        const infoEl = banner.querySelector('#tm-lottery-banner-text');
        const capBtn = banner.querySelector('#tm-lottery-capture');
        const sendNowBtn = banner.querySelector('#tm-lottery-send-now');
        const cancelBtn = banner.querySelector('#tm-lottery-cancel');
        const now = Date.now();
        const isCapturing = Boolean(activeLotteryCapture && now < activeLotteryCapture.endsAtMs);
        const effectiveCmd = activeLottery.command || (isCapturing ? '' : lotteryConfig.fallbackCommand);
        let cmdLabel = '';
        if (isCapturing) {
            const capLeft = Math.max(1, Math.ceil((activeLotteryCapture.endsAtMs - now) / 1000));
            const lead = activeLotteryCapture.bestText ? `（候选「${activeLotteryCapture.bestText}」×${activeLotteryCapture.bestCount}）` : '';
            cmdLabel = `捕捉口令 ${capLeft}s${lead}`;
        } else {
            cmdLabel = effectiveCmd ? `口令「${effectiveCmd}」` : '未识别口令(点抓口令或填兜底词)';
        }
        const drawLeft = activeLottery.drawAtMs ? ` · 开奖 ${formatCountdownMMSS(activeLottery.drawAtMs - now)}` : '';
        let statusText = '';
        if (activeLottery.sent) {
            statusText = ' · 已触发发送';
        } else if (activeLottery.cancelled) {
            statusText = ' · 已取消自动发送';
        } else if (isCapturing) {
            statusText = lotteryConfig.autoSend ? ' · 捕获后自动参与' : '';
        } else if (lotteryConfig.autoSend && activeLottery.scheduledSendAtMs) {
            const sendInSec = Math.max(0, Math.ceil((activeLottery.scheduledSendAtMs - now) / 1000));
            statusText = ` · ${sendInSec}s 后自动发`;
        } else {
            statusText = ' · 仅提醒';
        }
        infoEl.textContent = `🎁 福袋 · ${cmdLabel}${drawLeft}${statusText}`;
        if (capBtn) {
            capBtn.textContent = isCapturing ? '重抓' : '抓口令';
        }
        sendNowBtn.disabled = !effectiveCmd && !activeLotteryCapture?.bestText;
        cancelBtn.style.display = lotteryConfig.autoSend && !activeLottery.sent && !activeLottery.cancelled ? 'inline-block' : 'none';
        banner.style.display = 'flex';
    }

    function computeLotteryScheduleMs(drawAtMs, detectedAtMs) {
        const jitterMax = lotteryConfig.jitterSeconds * 1000;
        const jitter = jitterMax ? Math.round((Math.random() * 2 - 1) * jitterMax) : 0;
        const now = Date.now();
        let target;
        if (lotteryConfig.timingMode === 'before_draw' && drawAtMs && drawAtMs > now) {
            target = drawAtMs - lotteryConfig.offsetSeconds * 1000 + jitter;
        } else {
            target = detectedAtMs + lotteryConfig.offsetSeconds * 1000 + jitter;
        }
        return Math.max(now + 600, target);
    }

    function sendActiveLotteryNow(fromManual = false) {
        if (!activeLottery || activeLottery.pending || !isTargetRoom()) return false;
        if (activeLottery.drawAtMs && Date.now() >= activeLottery.drawAtMs) return false;
        const cmd = activeLottery.command || (!activeLotteryCapture ? lotteryConfig.fallbackCommand : '') || activeLotteryCapture?.bestText || '';
        if (!cmd) {
            showToast('尚未识别到福袋口令，请等待捕捉或填写兜底口令');
            return false;
        }
        if (!activeLottery.command) activeLottery.command = cmd;
        if (fromManual && activeLotteryCapture) activeLotteryCapture = null;
        const lottery = activeLottery;
        if (fromManual) lottery.cancelled = false;
        const onResult = (dispatched) => {
            if (activeLottery !== lottery) return;
            lottery.pending = false;
            if (lottery.cancelled || !lotteryConfig.enabled) { renderLotteryBanner(); return; }
            if (dispatched) {
                lottery.sent = true;
                rememberHandledLotteryKey(lottery.key);
                renderLotteryBanner();
                showToast(`已尝试发送福袋口令：${cmd}，请以公屏实际显示为准`, 2800);
                return;
            }
            if (!fromManual) {
                activeLottery.autoRetries = (activeLottery.autoRetries || 0) + 1;
                if (activeLottery.autoRetries >= 5) {
                    activeLottery.cancelled = true;
                    activeLottery.scheduledSendAtMs = 0;
                    showToast('福袋自动发送连续受阻，已暂停自动发送', 3000);
                } else {
                    activeLottery.scheduledSendAtMs = Date.now() + 2500;
                }
            }
            renderLotteryBanner();
        };
        lottery.pending = true;
        const ok = sendBarrage(cmd, {
            isAuto: !fromManual, silentSuccessToast: true, onResult,
            canDispatch: () => activeLottery === lottery && !lottery.cancelled && lotteryConfig.enabled &&
                (fromManual || lotteryConfig.autoSend) && (!lottery.drawAtMs || Date.now() < lottery.drawAtMs),
        });
        if (!ok) onResult(false);
        return ok;
    }

    function cancelActiveLotterySchedule(toastTip = false) {
        if (!activeLottery) return;
        activeLottery.cancelled = true;
        activeLottery.scheduledSendAtMs = 0;
        activeLotteryCapture = null;
        renderLotteryBanner();
        if (toastTip) showToast('已取消本次福袋自动发送');
    }

    function rescheduleActiveLotteryIfNeeded() {
        if (!lotteryConfig.enabled) {
            activeLottery = null;
            activeLotteryCapture = null;
            stopLotteryTicker();
        }
        if (!activeLottery) {
            renderLotteryBanner();
            return;
        }
        if (!activeLottery.command && !activeLotteryCapture && lotteryConfig.fallbackCommand) {
            activeLottery.command = normalizeSingleLineText(lotteryConfig.fallbackCommand).slice(0, 80);
        }
        if (activeLottery.sent || activeLottery.cancelled || activeLottery.pending) {
            renderLotteryBanner();
            return;
        }
        activeLottery.scheduledSendAtMs = (lotteryConfig.autoSend && !activeLotteryCapture)
            ? computeLotteryScheduleMs(activeLottery.drawAtMs, activeLottery.detectedAtMs)
            : 0;
        renderLotteryBanner();
    }

    function startLotteryTicker() {
        if (lotteryTickerId) return;
        lotteryTickerId = window.setInterval(() => {
            if (!isTargetRoom() || !activeLottery || !lotteryConfig.enabled) {
                activeLotteryCapture = null;
                stopLotteryTicker();
                renderLotteryBanner();
                return;
            }
            const now = Date.now();
            if (activeLotteryCapture && now >= activeLotteryCapture.endsAtMs) {
                finalizeLotteryCommandCapture();
            }
            // 后台计时器可能被节流数分钟；先判断过期，避免补发已开奖口令。
            if (activeLottery.drawAtMs && now >= activeLottery.drawAtMs) {
                activeLottery = null;
                activeLotteryCapture = null;
                stopLotteryTicker();
                renderLotteryBanner();
                return;
            }
            if (
                !activeLotteryCapture &&
                lotteryConfig.autoSend &&
                !activeLottery.sent &&
                !activeLottery.cancelled &&
                activeLottery.scheduledSendAtMs &&
                now >= activeLottery.scheduledSendAtMs
            ) {
                sendActiveLotteryNow();
            }
            const expiredWithDraw = Boolean(activeLottery.drawAtMs && now > activeLottery.drawAtMs + 15000);
            const detectedAt = activeLottery.detectedAtMs || now;
            const expiredWithoutDraw = Boolean(
                !activeLottery.drawAtMs &&
                !activeLotteryCapture &&
                (
                    now - detectedAt > 10 * 60 * 1000 ||
                    (activeLottery.sent && now - detectedAt > 30000)
                )
            );
            if (expiredWithDraw || expiredWithoutDraw) {
                activeLottery = null;
                activeLotteryCapture = null;
                stopLotteryTicker();
            }
            renderLotteryBanner();
        }, 1000);
    }

    function handleDetectedLottery({ id = '', command = '', drawAtMs = 0, remainingSec = 0, source = 'dom', forceUpdate = false } = {}) {
        if (!lotteryConfig.enabled || !isTargetRoom()) return;
        const now = Date.now();
        const computedDrawAt = drawAtMs || (remainingSec > 0 ? now + remainingSec * 1000 : 0);
        if (!forceUpdate && computedDrawAt > 0 && computedDrawAt <= now) return;

        const explicitCmd = normalizeSingleLineText(command).slice(0, 80);
        const shouldCaptureChat = Boolean(!explicitCmd && lotteryConfig.captureCommandFromChat && !forceUpdate);
        const cleanCmd = explicitCmd || (shouldCaptureChat ? '' : normalizeSingleLineText(lotteryConfig.fallbackCommand).slice(0, 80));
        const key = `${id || (computedDrawAt ? Math.round(computedDrawAt / 10000) : 'active')}:${cleanCmd}`;

        if (!forceUpdate) {
            if (handledLotteryKeys.has(key)) return;
            if (activeLottery && (!activeLottery.drawAtMs || activeLottery.drawAtMs > now)) {
                const sameKey = activeLottery.key === key;
                const sameCmd = Boolean(cleanCmd && activeLottery.command === cleanCmd);
                const nearDrawTime = Boolean(computedDrawAt && activeLottery.drawAtMs && Math.abs(computedDrawAt - activeLottery.drawAtMs) <= 20000);
                const canBackfillPartial = Boolean(
                    (!activeLottery.drawAtMs && computedDrawAt && (!cleanCmd || !activeLottery.command || cleanCmd === activeLottery.command)) ||
                    (!activeLottery.command && cleanCmd && (!computedDrawAt || !activeLottery.drawAtMs || Math.abs(computedDrawAt - activeLottery.drawAtMs) <= 20000))
                );
                const differentIds = Boolean(id && activeLottery.id && id !== activeLottery.id);
                if (!differentIds && (sameKey || sameCmd || nearDrawTime || canBackfillPartial)) {
                    const oldDrawAt = activeLottery.drawAtMs;
                    if (id && (!activeLottery.id || activeLottery.source !== 'payload')) {
                        activeLottery.id = id;
                    }
                    if (cleanCmd && !activeLottery.command) {
                        activeLottery.command = cleanCmd;
                        if (activeLotteryCapture) activeLotteryCapture = null;
                    }
                    if (computedDrawAt && (!activeLottery.drawAtMs || (source === 'payload' && activeLottery.source !== 'payload'))) {
                        activeLottery.drawAtMs = computedDrawAt;
                    }
                    if (source === 'payload') activeLottery.source = 'payload';
                    activeLottery.key = `${activeLottery.id || key.split(':')[0]}:${activeLottery.command || cleanCmd}`;
                    if (activeLottery.sent) {
                        rememberHandledLotteryKey(key);
                        rememberHandledLotteryKey(activeLottery.key);
                        renderLotteryBanner();
                    } else if (!activeLottery.scheduledSendAtMs || oldDrawAt !== activeLottery.drawAtMs) {
                        rescheduleActiveLotteryIfNeeded();
                    }
                    return;
                }
            }
        }

        const isNewAlert = !activeLottery || activeLottery.key !== key;
        activeLottery = {
            key,
            id,
            command: cleanCmd,
            drawAtMs: computedDrawAt,
            detectedAtMs: now,
            scheduledSendAtMs: (lotteryConfig.autoSend && !shouldCaptureChat) ? computeLotteryScheduleMs(computedDrawAt, now) : 0,
            sent: false,
            cancelled: false,
            source,
        };
        if (shouldCaptureChat) {
            startLotteryCommandCapture({ durationSec: lotteryConfig.captureDurationSec, manual: false });
        } else {
            activeLotteryCapture = null;
            startLotteryTicker();
            renderLotteryBanner();
        }
        if (isNewAlert && !forceUpdate) {
            const secHint = computedDrawAt ? `（约 ${Math.max(1, Math.round((computedDrawAt - now) / 1000))} 秒后开奖）` : '';
            const capHint = shouldCaptureChat ? `，正在捕捉公屏高频口令（${lotteryConfig.captureDurationSec}秒）` : '';
            showToast(`🎁 嗅探到福袋${cleanCmd ? `：口令「${cleanCmd}」` : ''}${secHint}${capHint}`, 3500);
        }
    }

    function extractCommandFromLotteryNode(obj) {
        const direct = obj.command || obj.prize_command || obj.lottery_command || obj.key_word || obj.lucky_word || obj.word || obj.comment || '';
        if (typeof direct === 'string' && direct.trim()) return direct.trim();
        const conds = obj.conditions || obj.condition_list || obj.lottery_conditions;
        if (Array.isArray(conds)) {
            for (const c of conds) {
                if (!c || typeof c !== 'object') continue;
                const cand = String(c.command || c.content || c.word || '').trim();
                if (cand && !/^(发送评论|评论参与|加入粉丝团|关注主播|点赞)$/.test(cand)) {
                    return cand;
                }
            }
        }
        return '';
    }

    function extractLotteryFromPayload(obj, depth = 0, ctx = { visited: new WeakSet(), steps: 0 }) {
        if (!obj || typeof obj !== 'object' || depth > 5 || ctx.steps > 60) return;
        if (obj.nodeType || obj.window === obj || ctx.visited.has(obj)) return;
        ctx.visited.add(obj);
        ctx.steps++;
        try {
            const idRaw = obj.lottery_id_str || obj.lottery_id || obj.activity_id || '';
            const cmdRaw = extractCommandFromLotteryNode(obj);
            const tsRaw = Number(obj.lucky_time || obj.draw_time || obj.end_time || 0);
            const remRaw = Number(obj.countdown || obj.remain_time || obj.left_time || 0);

            if ((idRaw || cmdRaw) && (tsRaw > 0 || remRaw > 0 || cmdRaw)) {
                const drawAtMs = tsRaw > 0 ? (tsRaw < 1e12 ? tsRaw * 1000 : tsRaw) : 0;
                if (drawAtMs > 0 && drawAtMs <= Date.now()) return;
                handleDetectedLottery({
                    id: String(idRaw || ''),
                    command: String(cmdRaw || ''),
                    drawAtMs,
                    remainingSec: remRaw > 0 ? remRaw : 0,
                    source: 'payload',
                });
                return;
            }
            const values = Array.isArray(obj) ? obj.slice(0, 12) : Object.values(obj).slice(0, 16);
            for (const child of values) {
                if (child && typeof child === 'object') {
                    extractLotteryFromPayload(child, depth + 1, ctx);
                    if (ctx.steps > 60) return;
                }
            }
        } catch (_) {}
    }

    function scanLotteryFromDom() {
        if (!lotteryConfig.enabled || !isTargetRoom()) return;
        if (activeLottery?.source === 'payload' && activeLottery.command && activeLottery.drawAtMs > Date.now()) {
            return;
        }
        const candidates = document.querySelectorAll('[class*="lottery" i], [class*="fudai" i], [data-e2e*="lottery"]');
        for (const el of candidates) {
            if (el.closest?.('[id^="tm-"]') || !isElementVisible(el)) continue;
            const text = (el.textContent || '').trim();
            if (!text || text.length > 260) continue;
            const hmsMatch = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})\s*[:：]\s*(\d{2})/);
            const timeMatch = hmsMatch ? null : text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
            if (!hmsMatch && !timeMatch && !/福袋|开奖|参与口令/.test(text)) continue;
            const sec = hmsMatch
                ? (parseInt(hmsMatch[1], 10) * 3600 + parseInt(hmsMatch[2], 10) * 60 + parseInt(hmsMatch[3], 10))
                : (timeMatch ? (parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10)) : 0);
            const cmdMatch = text.match(/(?:参与口令|发送弹幕|口令)\s*[:：]?\s*[“"「]?([^\n\r”"」]{1,40})/);
            const sanitizedCmd = cmdMatch?.[1]
                ? normalizeSingleLineText(cmdMatch[1].replace(/\s*(?:\d{1,2}\s*[:：]\s*\d{2}(?:\s*[:：]\s*\d{2})?|去参与|立即参与|后开奖).*$/, ''))
                : '';
            if (sec > 0 || sanitizedCmd) {
                handleDetectedLottery({
                    command: sanitizedCmd,
                    remainingSec: sec,
                    source: 'dom',
                });
                break;
            }
        }
    }

    window.addEventListener('tm-lottery-sniff', (e) => {
        if (!isTargetRoom() || !lotteryConfig.enabled) return;
        extractLotteryFromPayload(e?.detail?.data);
    });

    // ==========================================
    // 7C. 个人网名 / 粉丝灯牌 / 在线20分钟状态条
    // ==========================================
    const FAN_SKIP_KEYS = new Set(['owner', 'anchor', 'host', 'room_owner', 'author', 'streamer', 'broadcaster', 'members', 'ranks', 'rank_list', 'user_list', 'contributors']);
    let lastWatchTickMs = 0;
    let nextFanRefreshAtMs = 0;
    let renderDataFanChecked = false;

    function parseCompactCount(raw) {
        if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
        const s = String(raw || '').trim();
        if (!s) return null;
        const m = s.match(/^(\d+(?:\.\d+)?)\s*([wW万kK])?$/);
        if (!m) return null;
        const n = parseFloat(m[1]);
        if (!Number.isFinite(n)) return null;
        if (m[2] === 'w' || m[2] === 'W' || m[2] === '万') return Math.round(n * 10000);
        if (m[2] === 'k' || m[2] === 'K') return Math.round(n * 1000);
        return Math.floor(n);
    }

    function formatCompactNumber(num) {
        if (!Number.isFinite(num) || num < 0) return '--';
        if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`;
        return String(Math.floor(num));
    }

    function applyParsedFanPatch(patch = {}) {
        resetFanDailyIfDateChanged();
        let changed = false;
        if (typeof patch.nickname === 'string' && patch.nickname.trim()) {
            const nextNick = patch.nickname.trim().slice(0, 48);
            if (nextNick !== fanState.nickname) {
                fanState.nickname = nextNick;
                changed = true;
            }
        }
        if (typeof patch.level === 'number' && Number.isFinite(patch.level) && patch.level >= 0 && patch.level <= 40) {
            const lvl = Math.floor(patch.level);
            if (lvl !== fanState.level) {
                fanState.level = lvl;
                changed = true;
            }
        }
        if (typeof patch.intimacy === 'number' && Number.isFinite(patch.intimacy) && patch.intimacy >= 0) {
            const val = Math.floor(patch.intimacy);
            if (val !== fanState.intimacy) {
                fanState.intimacy = val;
                changed = true;
            }
        }
        if (typeof patch.nextIntimacy === 'number' && Number.isFinite(patch.nextIntimacy) && patch.nextIntimacy > 0) {
            const nextVal = Math.floor(patch.nextIntimacy);
            if (nextVal !== fanState.nextIntimacy) {
                fanState.nextIntimacy = nextVal;
                changed = true;
            }
        }
        if (typeof patch.litToday === 'boolean' && patch.litToday !== fanState.litToday) {
            fanState.litToday = patch.litToday;
            changed = true;
        }
        if (typeof patch.joinTimeMs === 'number' && Number.isFinite(patch.joinTimeMs) && patch.joinTimeMs > 1e11) {
            if (patch.joinTimeMs !== fanState.joinTimeMs) {
                fanState.joinTimeMs = patch.joinTimeMs;
                fanState.joinDays = Math.max(1, Math.floor((Date.now() - patch.joinTimeMs) / 86400000));
                changed = true;
            }
        }
        if (typeof patch.joinDays === 'number' && Number.isFinite(patch.joinDays) && patch.joinDays > 0) {
            const days = Math.floor(patch.joinDays);
            if (days !== fanState.joinDays) {
                fanState.joinDays = days;
                changed = true;
            }
        }
        if (typeof patch.platformWatchMin === 'number' && Number.isFinite(patch.platformWatchMin) && patch.platformWatchMin >= 0) {
            const m = Math.min(120, Math.floor(patch.platformWatchMin));
            if (m > fanState.platformWatchMin) {
                fanState.platformWatchMin = m;
                changed = true;
            }
        }
        if (patch.watchCompleted === true && !fanState.watchCompleted) {
            fanState.watchCompleted = true;
            fanState.platformWatchMin = Math.max(fanState.platformWatchMin || 0, 20);
            changed = true;
        }
        if (changed) fanStateDirty = true;
        return changed;
    }

    function extractFanStatusFromPayload(obj, url = '', depth = 0, ctx = { visited: new WeakSet(), steps: 0 }) {
        if (!obj || typeof obj !== 'object' || depth > 5 || ctx.steps > 90) return false;
        if (obj.nodeType || obj.window === obj || ctx.visited.has(obj)) return false;
        ctx.visited.add(obj);
        ctx.steps++;
        let anyUpdated = false;
        try {
            if (Array.isArray(obj)) {
                for (const item of obj.slice(0, 20)) {
                    if (!item || typeof item !== 'object') continue;
                    const taskName = String(item.title || item.name || item.task_name || item.desc || '');
                    if (/观看|在线|20\s*分钟/.test(taskName)) {
                        const finished = Boolean(
                            item.is_finish || item.completed || item.done ||
                            item.status === 2 || item.status === 3 || item.task_status === 2
                        );
                        const cur = Number(item.current ?? item.progress ?? item.cur_value ?? item.finished_count);
                        const target = Number(item.target ?? item.total ?? item.max_value ?? 20);
                        if (finished) {
                            anyUpdated = applyParsedFanPatch({ watchCompleted: true, platformWatchMin: 20 }) || anyUpdated;
                        } else if (Number.isFinite(cur) && cur >= 0) {
                            const mins = target > 60 ? Math.floor(cur / 60) : cur;
                            anyUpdated = applyParsedFanPatch({ platformWatchMin: mins, watchCompleted: mins >= 20 }) || anyUpdated;
                        }
                    }
                    anyUpdated = extractFanStatusFromPayload(item, url, depth + 1, ctx) || anyUpdated;
                }
                return anyUpdated;
            }

            const lowerUrl = String(url || '').toLowerCase();
            const isFanEndpoint = /fansclub|fans_club|fans_?badge|intimacy/.test(lowerUrl);
            const isSelfEndpoint = /user\/me|user\/self|account\/user|store:user|bus:self/.test(lowerUrl);

            const fanContainer = obj.fans_club?.data || obj.fans_club_info || obj.fansclub_info || obj.my_fans_club || obj.fansclub || obj.club_info;
            const fc = (fanContainer && typeof fanContainer === 'object')
                ? fanContainer
                : ((isFanEndpoint || typeof obj.user_fans_club_status === 'number' || typeof obj.intimacy === 'number') ? obj : null);

            if (fc && typeof fc === 'object') {
                const patch = {};
                const lvl = Number(fc.level ?? fc.club_level ?? fc.fans_level);
                if (Number.isFinite(lvl) && lvl >= 0) patch.level = lvl;

                const intim = Number(fc.intimacy ?? fc.cur_intimacy ?? fc.current_intimacy ?? fc.total_intimacy ?? fc.score);
                if (Number.isFinite(intim) && intim >= 0) patch.intimacy = intim;

                const nextIntim = Number(fc.next_level_intimacy ?? fc.next_intimacy ?? fc.level_max_intimacy ?? fc.target_intimacy);
                if (Number.isFinite(nextIntim) && nextIntim > 0) patch.nextIntimacy = nextIntim;

                if (typeof fc.is_light === 'boolean') patch.litToday = fc.is_light;
                else if (typeof fc.light_up === 'boolean') patch.litToday = fc.light_up;
                else if (typeof fc.is_lit === 'boolean') patch.litToday = fc.is_lit;
                else if (typeof fc.today_light === 'boolean') patch.litToday = fc.today_light;
                else if (fc.user_fans_club_status === 1 || fc.badge_status === 1 || fc.light_status === 1) patch.litToday = true;
                else if (fc.user_fans_club_status === 2 || fc.badge_status === 2 || fc.light_status === 2) patch.litToday = false;
                else if (isFanEndpoint && fc.status === 1) patch.litToday = true;
                else if (isFanEndpoint && fc.status === 2) patch.litToday = false;

                const jDays = Number(fc.join_days ?? fc.fans_club_days ?? fc.guard_days ?? fc.accompany_days);
                if (Number.isFinite(jDays) && jDays > 0) patch.joinDays = jDays;

                const jTs = Number(fc.join_time ?? fc.create_time ?? fc.first_join_time);
                if (Number.isFinite(jTs) && jTs > 1e9) {
                    patch.joinTimeMs = jTs < 1e12 ? jTs * 1000 : jTs;
                }

                if (Object.keys(patch).length) {
                    anyUpdated = applyParsedFanPatch(patch) || anyUpdated;
                }
            }

            if (isSelfEndpoint || obj.self_info || obj.my_info) {
                const userNode = obj.self_info || obj.my_info || obj;
                const nick = userNode?.nickname || userNode?.nick_name;
                if (typeof nick === 'string' && nick.trim()) {
                    anyUpdated = applyParsedFanPatch({ nickname: nick }) || anyUpdated;
                }
            } else if ((obj.user_info || obj.login_user || obj.user) && typeof (obj.user_info || obj.login_user || obj.user)?.nickname === 'string') {
                const u = obj.user_info || obj.login_user || obj.user;
                if (isFanEndpoint || /room\/enter/.test(lowerUrl)) {
                    anyUpdated = applyParsedFanPatch({ nickname: u.nickname }) || anyUpdated;
                }
            }

            const watchSecRaw = Number(obj.watch_seconds ?? obj.stay_seconds);
            const watchMinRaw = Number(obj.watch_minutes ?? obj.online_minutes);
            if (Number.isFinite(watchSecRaw) && watchSecRaw >= 0) {
                const m = Math.floor(watchSecRaw / 60);
                anyUpdated = applyParsedFanPatch({ platformWatchMin: m, watchCompleted: m >= 20 }) || anyUpdated;
            } else if (Number.isFinite(watchMinRaw) && watchMinRaw >= 0) {
                anyUpdated = applyParsedFanPatch({ platformWatchMin: watchMinRaw, watchCompleted: watchMinRaw >= 20 }) || anyUpdated;
            }

            for (const [k, val] of Object.entries(obj).slice(0, 20)) {
                if (FAN_SKIP_KEYS.has(k.toLowerCase())) continue;
                if (val && typeof val === 'object') {
                    anyUpdated = extractFanStatusFromPayload(val, url, depth + 1, ctx) || anyUpdated;
                    if (ctx.steps > 90) break;
                }
            }
        } catch (_) {}
        return anyUpdated;
    }

    function scanFansclubPanelDom() {
        let updated = false;
        const fanContainers = document.querySelectorAll('[class*="fansclub" i], [class*="fans-club" i], [data-e2e*="fansclub" i]');
        for (const el of fanContainers) {
            if (el.closest?.('[id^="tm-"]') || !isElementVisible(el)) continue;
            const txt = normalizeSingleLineText(el.textContent || '');
            if (!txt || txt.length > 600) continue;
            const patch = {};
            const lvlMatch = txt.match(/(?:Lv\.?|等级)\s*(\d{1,2})/i);
            if (lvlMatch) patch.level = parseInt(lvlMatch[1], 10);
            const intimMatch = txt.match(/(?:当前)?亲密度\s*[:：]?\s*(\d+(?:\.\d+)?[wW万kK]?)(?:\s*\/\s*(\d+(?:\.\d+)?[wW万kK]?))?/);
            if (intimMatch) {
                const cur = parseCompactCount(intimMatch[1]);
                const next = intimMatch[2] ? parseCompactCount(intimMatch[2]) : null;
                if (cur !== null) patch.intimacy = cur;
                if (next !== null && next > 0) patch.nextIntimacy = next;
            }
            const daysMatch = txt.match(/(?:已加入|加入粉丝团)\s*(\d{1,5})\s*天/);
            if (daysMatch) patch.joinDays = parseInt(daysMatch[1], 10);
            if (/今日已点亮|灯牌已点亮/.test(txt)) patch.litToday = true;
            else if (/今日未点亮|去点亮/.test(txt)) patch.litToday = false;
            if (/观看(?:直播)?\s*20\s*分钟.*?(?:已完成|已满|已领取|20\s*\/\s*20)/.test(txt)) {
                patch.watchCompleted = true;
                patch.platformWatchMin = 20;
            } else {
                const wm = txt.match(/(\d{1,2})\s*\/\s*20\s*分钟/);
                if (wm) {
                    const mins = parseInt(wm[1], 10);
                    patch.platformWatchMin = mins;
                    if (mins >= 20) patch.watchCompleted = true;
                }
            }
            if (Object.keys(patch).length) {
                updated = applyParsedFanPatch(patch) || updated;
            }
        }
        return updated;
    }

    function collectFanStatusFromPage() {
        let updated = false;
        // 1. 页面 React Store（弹幕插件、聊天室、粉丝团容器）
        const fiberRoots = document.querySelectorAll('.CanvasDanmakuPlugin, #chatroom, [data-e2e="live-chatting"], [class*="fansclub" i]');
        for (const el of fiberRoots) {
            if (el.closest?.('[id^="tm-"]')) continue;
            try {
                let fiber = getReactFiber(el);
                let steps = 0;
                while (fiber && steps++ < 10) {
                    const store = fiber.memoizedProps?.store;
                    if (store && typeof store === 'object') {
                        const selfUser = store.userStore?.userInfo || store.userStore?.user || store.commonStore?.userInfo || store.roomStore?.selfInfo || store.roomStore?.userInfo;
                        if (selfUser && typeof selfUser === 'object') {
                            updated = extractFanStatusFromPayload({ self_info: selfUser }, 'store:user') || updated;
                        }
                        const fcStore = store.fansClubStore || store.roomStore?.fansClubInfo || store.roomStore?.fansclub;
                        if (fcStore && typeof fcStore === 'object') {
                            updated = extractFanStatusFromPayload(fcStore, 'store:fansclub') || updated;
                        }
                        break;
                    }
                    fiber = fiber.return;
                }
            } catch (_) {}
        }

        // 2. 一次性读取页面内嵌 RENDER_DATA（如存在）
        if (!renderDataFanChecked) {
            renderDataFanChecked = true;
            try {
                const rdEl = document.getElementById('RENDER_DATA');
                if (rdEl?.textContent) {
                    const decoded = decodeURIComponent(rdEl.textContent);
                    if (decoded.length < 350000) {
                        const parsed = JSON.parse(decoded);
                        updated = extractFanStatusFromPayload(parsed, 'render_data') || updated;
                    }
                }
            } catch (_) {}
        }

        // 3. 登录用户导航栏 DOM 回退读取网名
        if (!fanState.nickname) {
            for (const sel of ['[data-e2e="user-info"]', '[class*="header-user" i]', '[class*="user-nick" i]']) {
                const node = document.querySelector(sel);
                if (!node || node.closest?.('[id^="tm-"]')) continue;
                const candidate = normalizeSingleLineText(node.textContent || '');
                if (candidate && candidate.length <= 32 && !/登录|注册/.test(candidate)) {
                    updated = applyParsedFanPatch({ nickname: candidate }) || updated;
                    break;
                }
            }
        }

        // 4. 可见粉丝团弹窗 DOM 解析
        updated = scanFansclubPanelDom() || updated;
        return updated;
    }

    function tickFanWatchTime() {
        if (!isTargetRoom() || document.hidden || !getVisibleVideos().some(video => !video.paused && !video.ended)) {
            lastWatchTickMs = 0;
            return;
        }
        resetFanDailyIfDateChanged();
        const now = Date.now();
        if (lastWatchTickMs > 0 && now > lastWatchTickMs) {
            const deltaSec = Math.min(10, (now - lastWatchTickMs) / 1000);
            const prevMin = Math.floor(fanState.watchSec / 60);
            fanState.watchSec = Math.min(86400, fanState.watchSec + deltaSec);
            const nextMin = Math.floor(fanState.watchSec / 60);
            if (fanState.watchSec >= 20 * 60 && !fanState.watchCompleted) {
                fanState.watchCompleted = true;
                fanStateDirty = true;
            } else if (nextMin !== prevMin) {
                fanStateDirty = true;
            }
        }
        lastWatchTickMs = now;
        saveFanState(false);
    }

    function renderFanBar() {
        if (!panelEl || !isTargetRoom()) return;
        resetFanDailyIfDateChanged();
        const nameEl = panelEl.querySelector('#tm-fan-name');
        const levelEl = panelEl.querySelector('#tm-fan-level');
        const intimEl = panelEl.querySelector('#tm-fan-intimacy');
        const litEl = panelEl.querySelector('#tm-fan-lit');
        const onlineEl = panelEl.querySelector('#tm-fan-online');
        const daysEl = panelEl.querySelector('#tm-fan-days');
        const autoBtn = panelEl.querySelector('#tm-fan-auto');
        const refreshBtn = panelEl.querySelector('#tm-fan-refresh');
        if (!nameEl) return;

        const nick = fanState.nickname || '未登录/未获取';
        nameEl.textContent = fanState.nickname ? nick : '游客/未获取';
        nameEl.title = fanState.nickname ? `网名：${nick}` : '暂未读取到当前登录网名（点击刷新或登录抖音后同步）';
        nameEl.className = `tm-fan-chip tm-fan-name${fanState.nickname ? '' : ' is-muted'}`;

        if (fanState.level !== null && fanState.level > 0) {
            levelEl.textContent = `Lv.${fanState.level}`;
            levelEl.className = 'tm-fan-chip is-accent';
            levelEl.title = `灯牌等级：${fanState.level} 级`;
        } else if (fanState.level === 0) {
            levelEl.textContent = '未入团';
            levelEl.className = 'tm-fan-chip is-muted';
            levelEl.title = '当前未加入该主播粉丝团';
        } else {
            levelEl.textContent = '牌 --';
            levelEl.className = 'tm-fan-chip is-muted';
            levelEl.title = '灯牌等级暂未获取（打开直播间粉丝团面板后可自动同步）';
        }

        if (fanState.intimacy !== null) {
            const shortCur = formatCompactNumber(fanState.intimacy);
            intimEl.textContent = fanState.nextIntimacy
                ? `亲密 ${shortCur}/${formatCompactNumber(fanState.nextIntimacy)}`
                : `亲密 ${shortCur}`;
            intimEl.className = 'tm-fan-chip';
            intimEl.title = fanState.nextIntimacy
                ? `当前亲密度：${fanState.intimacy} / 下一级 ${fanState.nextIntimacy}`
                : `当前亲密度：${fanState.intimacy}`;
        } else {
            intimEl.textContent = '亲密 --';
            intimEl.className = 'tm-fan-chip is-muted';
            intimEl.title = '亲密度暂未获取';
        }

        if (fanState.litToday === true) {
            litEl.textContent = '今日已点';
            litEl.className = 'tm-fan-chip is-ok';
            litEl.title = '今日粉丝灯牌已点亮';
        } else if (fanState.litToday === false) {
            litEl.textContent = '今日未点';
            litEl.className = 'tm-fan-chip is-warn';
            litEl.title = '今日粉丝灯牌尚未点亮';
        } else {
            litEl.textContent = '点亮 --';
            litEl.className = 'tm-fan-chip is-muted';
            litEl.title = '今日是否点亮暂未读取到（发一条带灯牌弹幕或打开粉丝团面板可同步）';
        }

        const localMin = Math.floor((fanState.watchSec || 0) / 60);
        const effectiveMin = Math.max(fanState.platformWatchMin || 0, localMin);
        const is20Done = Boolean(fanState.watchCompleted || effectiveMin >= 20);
        if (is20Done) {
            onlineEl.textContent = '20m已满';
            onlineEl.className = 'tm-fan-chip is-ok';
            onlineEl.title = `今日已满 20 分钟（本页累计 ${localMin} 分钟）`;
        } else {
            onlineEl.textContent = `在线 ${effectiveMin}/20m`;
            onlineEl.className = effectiveMin > 0 ? 'tm-fan-chip is-accent' : 'tm-fan-chip is-muted';
            onlineEl.title = `今日在线进度 ${effectiveMin}/20 分钟（本地活跃停留累计 ${Math.floor(fanState.watchSec || 0)} 秒）`;
        }

        const joinDays = fanState.joinDays || (fanState.joinTimeMs ? Math.max(1, Math.floor((Date.now() - fanState.joinTimeMs) / 86400000)) : null);
        if (daysEl) {
            if (joinDays && joinDays > 0) {
                daysEl.textContent = `入团${joinDays}天`;
                daysEl.title = `加入粉丝团已满 ${joinDays} 天`;
                daysEl.style.display = 'inline-flex';
            } else {
                daysEl.style.display = 'none';
            }
        }

        if (autoBtn) {
            autoBtn.classList.toggle('active', !!fanState.autoRefresh);
            autoBtn.title = fanState.autoRefresh ? '自动刷新开启中（每 60 秒），点击关闭' : '自动刷新已暂停，点击开启';
        }
        if (refreshBtn && fanState.lastRefreshAtMs) {
            const d = new Date(fanState.lastRefreshAtMs);
            const t = [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, '0')).join(':');
            refreshBtn.title = `点击立即刷新（上次刷新 ${t}）`;
        }
    }

    function refreshFanStatus({ manual = false } = {}) {
        if (!isTargetRoom()) return;
        tickFanWatchTime();
        collectFanStatusFromPage();
        fanState.lastRefreshAtMs = Date.now();
        nextFanRefreshAtMs = Date.now() + 60000;
        saveFanState(manual);
        renderFanBar();
        if (manual) {
            const refreshBtn = panelEl?.querySelector('#tm-fan-refresh');
            if (refreshBtn) {
                refreshBtn.classList.remove('spinning');
                void refreshBtn.offsetWidth;
                refreshBtn.classList.add('spinning');
                setTimeout(() => refreshBtn.classList?.remove('spinning'), 460);
            }
            const missingCore = !fanState.nickname || fanState.level === null || fanState.intimacy === null;
            if (missingCore) {
                showToast('已刷新状态（若等级/亲密度未显示，点一下直播间「粉丝团」面板即可同步）', 3200);
            } else {
                showToast(`已刷新：${fanState.nickname} · Lv.${fanState.level} · 亲密 ${formatCompactNumber(fanState.intimacy)}`, 2400);
            }
        }
    }

    function startFanRefreshTimer() {
        nextFanRefreshAtMs = Date.now() + 60000;
    }

    function stopFanRefreshTimer() {
        nextFanRefreshAtMs = 0;
    }

    window.addEventListener('tm-fan-sniff', (e) => {
        if (!isTargetRoom()) return;
        const updated = extractFanStatusFromPayload(e?.detail?.data, e?.detail?.url || '');
        if (updated) {
            saveFanState(true);
            renderFanBar();
        }
    });

    // 干扰动画精简 & 画质记忆锁定
    function applyCleanModeClasses() {
        const root = document.documentElement;
        if (!root) return;
        const active = isTargetRoom();
        root.classList.toggle('tm-clean-gifts', active && !!cleanModeConfig.hideGiftEffects);
        root.classList.toggle('tm-clean-entrance', active && !!cleanModeConfig.hideEntrance);
        root.classList.toggle('tm-clean-recommend', active && !!cleanModeConfig.hideRecommend);
    }

    const QUALITY_LEVELS = ['原画', '蓝光', '超清', '高清', '流畅'];
    const hookedQualityNodes = new WeakSet();
    let autoSwitchingQuality = false;
    let qualitySwitchAttempts = 0;
    let lastQualityAttemptAt = 0;
    let qualityRetryTimerId = 0;
    let currentQualityPlugin = null;

    function resetQualityAttemptState() {
        autoSwitchingQuality = false;
        qualitySwitchAttempts = 0;
        lastQualityAttemptAt = 0;
        if (qualityRetryTimerId) {
            clearTimeout(qualityRetryTimerId);
            qualityRetryTimerId = 0;
        }
    }

    function matchQualityLabel(text) {
        const clean = normalizeSingleLineText(text || '');
        if (!clean) return '';
        for (const q of QUALITY_LEVELS) {
            if (clean === q || clean.startsWith(q)) return q;
        }
        return '';
    }

    function getQualitySwitchState(pluginEl) {
        if (!pluginEl) return { nodes: [], currentTrigger: null, currentLabel: '' };
        const nodes = [...pluginEl.querySelectorAll('button, span, div, li')];
        const currentTrigger = nodes.find((el) => {
            const cls = String(el.className || '');
            return /btn|current|title|label|selected/i.test(cls) && matchQualityLabel(el.textContent);
        }) || nodes.find((el) => el.children.length === 0 && matchQualityLabel(el.textContent));
        return {
            nodes,
            currentTrigger,
            currentLabel: matchQualityLabel(currentTrigger?.textContent || ''),
        };
    }

    function hookQualityPluginListener(pluginEl) {
        if (!pluginEl || hookedQualityNodes.has(pluginEl)) return;
        hookedQualityNodes.add(pluginEl);
        pluginEl.addEventListener('click', (e) => {
            if (autoSwitchingQuality || !qualityConfig.rememberManual || !isTargetRoom()) return;
            const target = e.target instanceof Element ? e.target : null;
            const clickedNode = target?.closest('button, li, span, div') || target;
            const rawText = (clickedNode?.textContent || '').trim();
            if (!rawText || rawText.length > 16) return;
            const clickedLabel = matchQualityLabel(rawText);
            if (!clickedLabel || clickedLabel === qualityConfig.preferredQuality) return;
            const beforeState = getQualitySwitchState(pluginEl);
            if (beforeState.currentTrigger && clickedNode === beforeState.currentTrigger) return;
            const epoch = roomEpoch;
            setTimeout(() => {
                if (!isCurrentRoom(epoch) || !pluginEl.isConnected || autoSwitchingQuality || !qualityConfig.rememberManual) return;
                const livePlugin = pluginEl.isConnected ? pluginEl : document.querySelector('.QualitySwitchNewPlugin');
                const afterState = getQualitySwitchState(livePlugin);
                if (afterState.currentLabel === clickedLabel && clickedLabel !== qualityConfig.preferredQuality) {
                    saveQualityConfig({ preferredQuality: clickedLabel });
                    refreshAllSettingsUi();
                    showToast(`已记住偏好画质：${clickedLabel}`);
                }
            }, 180);
        }, true);
    }

    function findQualityOptionNode(nodes, currentTrigger, targetQuality) {
        return (
            nodes.find((el) => el !== currentTrigger && el.children.length === 0 && matchQualityLabel(el.textContent) === targetQuality)
            || nodes.find((el) => el !== currentTrigger && (el.textContent || '').trim().length <= 16 && matchQualityLabel(el.textContent) === targetQuality)
            || null
        );
    }

    function clickQualityOption(plugin, targetOption, targetQuality) {
        if (!plugin || !targetOption || autoSwitchingQuality) return false;
        const epoch = roomEpoch;
        autoSwitchingQuality = true;
        lastQualityAttemptAt = Date.now();
        qualitySwitchAttempts++;
        try {
            targetOption.click();
        } finally {
            setTimeout(() => {
                if (!isCurrentRoom(epoch) || currentQualityPlugin !== plugin) return;
                autoSwitchingQuality = false;
                const livePlugin = plugin.isConnected ? plugin : document.querySelector('.QualitySwitchNewPlugin');
                if (getQualitySwitchState(livePlugin).currentLabel === targetQuality) {
                    showToast(`已切换画质为：${targetQuality}`);
                }
            }, 160);
        }
        return true;
    }

    function syncQualityPreference({ force = false } = {}) {
        if (!isTargetRoom()) return false;
        const plugins = document.querySelectorAll('.QualitySwitchNewPlugin');
        plugins.forEach(hookQualityPluginListener);
        if (currentQualityPlugin !== (plugins[0] || null)) {
            currentQualityPlugin = plugins[0] || null;
            resetQualityAttemptState();
        }

        const targetQuality = qualityConfig.preferredQuality;
        if (!targetQuality || targetQuality === 'auto') return false;
        if (!force && (qualitySwitchAttempts >= 3 || Date.now() - lastQualityAttemptAt < 3500)) {
            return false;
        }

        const plugin = plugins[0];
        if (!plugin) return false;
        let { nodes, currentTrigger, currentLabel } = getQualitySwitchState(plugin);
        if (currentLabel === targetQuality) return false;

        let targetOption = findQualityOptionNode(nodes, currentTrigger, targetQuality);
        if (!targetOption || !isElementVisible(targetOption)) {
            const hoverTarget = currentTrigger || plugin;
            try {
                hoverTarget.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                hoverTarget.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            } catch (_) {}
            ({ nodes, currentTrigger, currentLabel } = getQualitySwitchState(plugin));
            if (currentLabel === targetQuality) return false;
            targetOption = findQualityOptionNode(nodes, currentTrigger, targetQuality);
        }

        if (targetOption && plugin.contains(targetOption)) {
            return clickQualityOption(plugin, targetOption, targetQuality);
        }

        // 部分版本在 hover 后异步挂载菜单项，100ms 后补扫一次
        lastQualityAttemptAt = Date.now();
        qualitySwitchAttempts++;
        if (!qualityRetryTimerId) {
            qualityRetryTimerId = window.setTimeout(() => {
                qualityRetryTimerId = 0;
                if (!isTargetRoom() || autoSwitchingQuality) return;
                const wanted = qualityConfig.preferredQuality;
                if (!wanted || wanted === 'auto') return;
                const livePlugin = plugin.isConnected ? plugin : document.querySelector('.QualitySwitchNewPlugin');
                if (!livePlugin) return;
                const state = getQualitySwitchState(livePlugin);
                if (state.currentLabel === wanted) return;
                const opt = findQualityOptionNode(state.nodes, state.currentTrigger, wanted);
                if (opt && livePlugin.contains(opt)) {
                    clickQualityOption(livePlugin, opt, wanted);
                }
            }, 100);
        }
        return false;
    }

    // ==========================================
    // 8. 原生飘屏弹幕悬停即停并显示 +1 与 回复
    // ==========================================
    let highlightBoxEl = null;
    let danmuActionsEl = null;
    let activePausedBarrage = null;
    let activeChannelIdx = -1;
    let activeText = '';
    let activeSender = '';
    let activeCanvasEl = null;
    let activeInstance = null;
    let lastMouseX = -9999;
    let lastMouseY = -9999;
    let rafTrackId = null;
    let lastOverlayRectKey = '';

    function getHighlightBox() {
        if (!highlightBoxEl) {
            highlightBoxEl = document.createElement('div');
            highlightBoxEl.id = 'tm-danmu-highlight-box';
        }
        ensureInOverlayRoot(highlightBoxEl);
        return highlightBoxEl;
    }

    function getDanmuActionsBar() {
        if (!danmuActionsEl) {
            danmuActionsEl = document.createElement('div');
            danmuActionsEl.id = 'tm-danmu-actions';

            const plus1Btn = document.createElement('button');
            plus1Btn.id = 'tm-plus1-btn';
            plus1Btn.className = 'tm-danmu-action-btn';
            plus1Btn.type = 'button';
            plus1Btn.innerText = '+1';
            plus1Btn.title = '跟发这条弹幕 (+1)';

            const replyBtn = document.createElement('button');
            replyBtn.id = 'tm-reply-btn';
            replyBtn.className = 'tm-danmu-action-btn';
            replyBtn.type = 'button';
            replyBtn.innerText = '回复';
            replyBtn.title = '填入 @发送者：内容 到输入框';

            const stopEvt = (e) => e.stopPropagation();
            danmuActionsEl.addEventListener('pointerdown', stopEvt);
            danmuActionsEl.addEventListener('mousedown', stopEvt);
            danmuActionsEl.addEventListener('mouseup', stopEvt);
            danmuActionsEl.addEventListener('click', stopEvt);

            plus1Btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const text = activeText;
                unlockPausedBarrage();
                releaseDomBarrage();
                if (text) {
                    sendBarrage(text);
                }
            });

            replyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const sender = activeSender;
                const text = activeText;
                unlockPausedBarrage();
                releaseDomBarrage();
                if (text) {
                    fillReplyToChatInput(sender, text);
                }
            });

            danmuActionsEl.addEventListener('mouseleave', () => {
                setTimeout(() => { checkPointerStillOverActive(); checkPointerStillOverDom(); }, 80);
            });

            danmuActionsEl.appendChild(plus1Btn);
            danmuActionsEl.appendChild(replyBtn);
        }
        ensureInOverlayRoot(danmuActionsEl);
        return danmuActionsEl;
    }

    let cachedManager = null;
    function findMainThreadDanmakuManager() {
        if (!legacyCanvasEnabled || !isTargetRoom()) return null;
        if (
            cachedManager &&
            cachedManager.danmakuManagerInMainThread?.instance &&
            cachedManager.canvasDom?.isConnected
        ) {
            const cr = cachedManager.canvasDom.getBoundingClientRect();
            if (cr.width > 0 && cr.height > 0) return cachedManager;
        }
        cachedManager = null;

        const cps = document.querySelectorAll('.CanvasDanmakuPlugin');
        for (const cp of cps) {
            const canvas = cp.querySelector('canvas');
            if (canvas) {
                const r = canvas.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;
            }
            const compFiber = getReactFiber(cp)?.return;
            let st = compFiber?.memoizedState;
            let stSteps = 0;
            while (st && stSteps++ < 64) {
                const val = st.memoizedState;
                if (val && typeof val === 'object' && 'current' in val && val.current && val.current.danmakuManagerInMainThread) {
                    cachedManager = val.current;
                    return cachedManager;
                }
                st = st.next;
            }
        }
        return null;
    }

    const originalMoveDescriptors = new Map();
    function ensureBarrageProtoHooked(barrage) {
        if (!legacyCanvasEnabled || !barrage) return false;
        const proto = Object.getPrototypeOf(barrage);
        if (!proto || proto === Object.prototype) return false;
        if (originalMoveDescriptors.has(proto)) return true;
        const desc = Object.getOwnPropertyDescriptor(proto, 'move');
        if (!desc || typeof desc.value !== 'function' || (!desc.configurable && !desc.writable)) return false;
        const original = desc.value;
        try {
            Object.defineProperty(proto, 'move', {...desc, value:function (...args) {
                if (this._tm_paused) return;
                return original.apply(this, args);
            }});
            originalMoveDescriptors.set(proto, desc);
            return true;
        } catch (_) { return false; }
    }
    function restoreBarragePrototypes() {
        for (const [proto, desc] of originalMoveDescriptors) {
            try { Object.defineProperty(proto, 'move', desc); } catch (_) {}
        }
        originalMoveDescriptors.clear();
    }

    function getBarrageScreenRect(barrage, chIdx, inst, canvas) {
        if (!barrage || !inst || !canvas) return null;
        const canvasRect = canvas.getBoundingClientRect();
        if (!canvasRect.width || !canvasRect.height || !canvas.width || !canvas.height) return null;

        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;
        const pxLeft = canvas.width - barrage.deltaX;
        const pxTop = chIdx * inst.channelHeightDpr + 2;
        const pxW = barrage.size?.widthWithDpr || 0;
        const pxH = barrage.size?.heightWithDpr || 0;
        if (!pxW || !pxH) return null;

        return {
            left: canvasRect.left + pxLeft * scaleX,
            top: canvasRect.top + pxTop * scaleY,
            width: pxW * scaleX,
            height: pxH * scaleY,
            canvasRect
        };
    }

    function positionOverlayForBarrage(rect) {
        const rectKey = `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}:${Math.round(rect.canvasRect?.left ?? 0)}:${Math.round(rect.canvasRect?.right ?? window.innerWidth)}`;
        const box = getHighlightBox();
        const bar = getDanmuActionsBar();
        if (
            rectKey === lastOverlayRectKey &&
            box.style.display === 'block' &&
            bar.style.display === 'inline-flex'
        ) {
            return;
        }
        lastOverlayRectKey = rectKey;

        box.style.left = `${rect.left - 3}px`;
        box.style.top = `${rect.top - 2}px`;
        box.style.width = `${rect.width + 6}px`;
        box.style.height = `${rect.height + 4}px`;
        box.style.display = 'block';

        bar.style.display = 'inline-flex';
        const barHeight = bar.offsetHeight || 28;
        const barWidth = bar.offsetWidth || 98;

        let barLeft = rect.left + rect.width + 6;
        let barTop = rect.top + (rect.height - barHeight) / 2;

        if (barLeft + barWidth > rect.canvasRect.right - 8) {
            barLeft = Math.max(rect.canvasRect.left + 8, rect.left - barWidth - 6);
        }
        if (barTop < 6) {
            barTop = rect.top + rect.height + 4;
        }

        bar.style.left = `${barLeft}px`;
        bar.style.top = `${barTop}px`;
    }

    function lockBarrage(barrage, chIdx, info, inst, canvas, rect) {
        if (activePausedBarrage && activePausedBarrage !== barrage) {
            activePausedBarrage._tm_paused = false;
        }
        if (!ensureBarrageProtoHooked(barrage)) return;
        barrage._tm_paused = true;

        activePausedBarrage = barrage;
        activeChannelIdx = chIdx;
        activeText = info.text;
        activeSender = info.sender || '';
        activeInstance = inst;
        activeCanvasEl = canvas;

        positionOverlayForBarrage(rect);
        startOverlaySyncLoop();
    }

    function unlockPausedBarrage() {
        if (activePausedBarrage) {
            activePausedBarrage._tm_paused = false;
            activePausedBarrage = null;
        }
        activeChannelIdx = -1;
        activeInstance = null;
        activeCanvasEl = null;
        activeText = '';
        activeSender = '';
        lastOverlayRectKey = '';
        if (highlightBoxEl) highlightBoxEl.style.display = 'none';
        if (danmuActionsEl) danmuActionsEl.style.display = 'none';
        if (rafTrackId) {
            cancelAnimationFrame(rafTrackId);
            rafTrackId = null;
        }
    }

    function startOverlaySyncLoop() {
        if (rafTrackId) return;
        const tick = () => {
            rafTrackId = null;
            if (!activePausedBarrage || !activeInstance || !activeCanvasEl) {
                unlockPausedBarrage();
                return;
            }
            if (activePausedBarrage.isExpired || !activePausedBarrage.bookedChannel) {
                unlockPausedBarrage();
                return;
            }
            const rect = getBarrageScreenRect(activePausedBarrage, activeChannelIdx, activeInstance, activeCanvasEl);
            if (!rect) {
                unlockPausedBarrage();
                return;
            }
            positionOverlayForBarrage(rect);
            rafTrackId = requestAnimationFrame(tick);
        };
        rafTrackId = requestAnimationFrame(tick);
    }

    function isPointInSafeActiveUnion(x, y) {
        if (!activePausedBarrage || !activeInstance || !activeCanvasEl) return false;
        const rect = getBarrageScreenRect(activePausedBarrage, activeChannelIdx, activeInstance, activeCanvasEl);
        if (!rect) return false;

        const inBarrage =
            x >= rect.left - 6 &&
            x <= rect.left + rect.width + 6 &&
            y >= rect.top - 6 &&
            y <= rect.top + rect.height + 6;
        if (inBarrage) return true;

        if (danmuActionsEl && danmuActionsEl.style.display !== 'none') {
            const br = danmuActionsEl.getBoundingClientRect();
            const unionLeft = Math.min(rect.left, br.left) - 4;
            const unionRight = Math.max(rect.left + rect.width, br.right) + 6;
            const unionTop = Math.min(rect.top, br.top) - 4;
            const unionBottom = Math.max(rect.top + rect.height, br.bottom) + 4;
            if (x >= unionLeft && x <= unionRight && y >= unionTop && y <= unionBottom) {
                return true;
            }
        }
        return false;
    }

    function checkPointerStillOverActive() {
        if (!activePausedBarrage) return;
        if (!isPointInSafeActiveUnion(lastMouseX, lastMouseY)) {
            unlockPausedBarrage();
        }
    }

    function handleCanvasDanmuMouseMove(x, y, targetEl) {
        lastMouseX = x;
        lastMouseY = y;

        if (targetEl && (
            targetEl.closest?.('#tm-danmu-panel') ||
            targetEl.closest?.('#tm-shot-panel') ||
            targetEl.closest?.('#tm-shot-frame') ||
            targetEl.closest?.('#tm-danmu-ball') ||
            targetEl.closest?.('.tm-ctrl-slot') ||
            targetEl.closest?.('.douyin-player-controls')
        )) {
            if (activePausedBarrage) unlockPausedBarrage();
            return;
        }

        if (activePausedBarrage && isPointInSafeActiveUnion(x, y)) {
            return;
        }

        const manager = findMainThreadDanmakuManager();
        const inst = manager?.danmakuManagerInMainThread?.instance;
        const canvas = manager?.canvasDom;

        if (!inst || !canvas) {
            if (activePausedBarrage) unlockPausedBarrage();
            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        if (x < canvasRect.left || x > canvasRect.right || y < canvasRect.top || y > canvasRect.bottom) {
            if (activePausedBarrage) unlockPausedBarrage();
            return;
        }

        const channels = inst._channels || inst.channels || [];
        for (let chIdx = 0; chIdx < channels.length; chIdx++) {
            const ch = channels[chIdx];
            if (!Array.isArray(ch)) continue;
            for (let i = 0; i < ch.length; i++) {
                const b = ch[i];
                if (!b || (typeof b.needDraw === 'function' && !b.needDraw(chIdx))) continue;
                const rect = getBarrageScreenRect(b, chIdx, inst, canvas);
                if (!rect) continue;

                if (
                    x >= rect.left - 4 &&
                    x <= rect.left + rect.width + 4 &&
                    y >= rect.top - 4 &&
                    y <= rect.top + rect.height + 4
                ) {
                    const info = extractBarrageInfo(b.options);
                    if (!info || !info.text) continue;

                    lockBarrage(b, chIdx, info, inst, canvas, rect);
                    return;
                }
            }
        }

        if (activePausedBarrage) {
            unlockPausedBarrage();
        }
    }

    const boundDomBarrage = new WeakSet();
    const danmuObservers = new Map();
    let activeDomBarrage = null;
    let originalDomAnimationState = '';
    let domLeaveTimer = 0;
    const DOM_DANMU_SELECTOR = '.XdO7mq0W, .BIDz2ikw, .SF8xNeY5, [data-danmu-id]';

    function extractDomBarrageInfo(el) {
        if (!el) return null;
        const rawId = el.getAttribute('data-danmu-id') || el.getAttribute('data-msg-id') || '';
        if (rawId && msgMetaMap.has(rawId)) {
            return msgMetaMap.get(rawId);
        }

        let fiber = getReactFiber(el);
        let steps = 0;
        while (fiber && steps < 6) {
            const props = fiber.memoizedProps;
            const msg = props?.message || props?.item || props?.data;
            if (msg?.payload) {
                const txt = extractTextFromMsgPayload(msg);
                if (txt) return { text: txt, sender: extractSenderFromMsgPayload(msg) };
            }
            const opts = props?.options || props?.barrage?.options;
            if (opts) {
                const info = extractBarrageInfo(opts);
                if (info) return info;
            }
            fiber = fiber.return;
            steps++;
        }

        const pieces = [];
        const walkDom = (node) => {
            if (!node) return;
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.nodeValue) pieces.push(node.nodeValue);
                return;
            }
            if (!(node instanceof Element)) return;
            if (node.tagName === 'IMG') {
                const src = node.getAttribute('src') || node.src || '';
                const mapped = (src && emojiUrlToNameMap.get(src)) || node.getAttribute('alt') || node.getAttribute('title') || '';
                if (mapped) pieces.push(mapped);
                return;
            }
            const cls = typeof node.className === 'string' ? node.className : '';
            if (cls && /\b(badge|level|medal)\b/i.test(cls)) return;
            for (const child of node.childNodes) {
                walkDom(child);
            }
        };
        walkDom(el);

        let text = normalizeSingleLineText(pieces.join(''));
        if (!text) return null;

        let sender = '';
        const firstChild = el.firstElementChild;
        const firstChildText = normalizeSingleLineText(firstChild?.textContent || '');
        if (firstChildText === '管理' && text.startsWith('管理')) {
            text = normalizeSingleLineText(text.slice(2));
        } else if (firstChildText && /[:：]$/.test(firstChildText) && text.startsWith(firstChildText)) {
            sender = normalizeSingleLineText(firstChildText.replace(/[:：]$/, ''));
            text = normalizeSingleLineText(text.slice(firstChildText.length));
        }
        if (!text) return null;
        if (!sender) {
            sender = findSenderFromChatDom(text);
        }
        return { text, sender };
    }

    function releaseDomBarrage() {
        if (domLeaveTimer) {
            clearTimeout(domLeaveTimer);
            domLeaveTimer = 0;
        }
        if (!activeDomBarrage) return;
        try {
            activeDomBarrage.style.animationPlayState = originalDomAnimationState;
        } catch (_) {}
        activeDomBarrage = null;
        if (!activePausedBarrage) {
            activeText = '';
            activeSender = '';
            lastOverlayRectKey = '';
            if (highlightBoxEl) highlightBoxEl.style.display = 'none';
            if (danmuActionsEl) danmuActionsEl.style.display = 'none';
        }
    }

    function checkPointerStillOverDom() {
        if (!activeDomBarrage) return;
        if (!activeDomBarrage.isConnected) {
            releaseDomBarrage();
            return;
        }
        const r = activeDomBarrage.getBoundingClientRect();
        const bar = danmuActionsEl?.getBoundingClientRect();
        const near = (rect) => rect && rect.width > 0 && rect.height > 0 &&
            lastMouseX >= rect.left - 10 && lastMouseX <= rect.right + 10 &&
            lastMouseY >= rect.top - 10 && lastMouseY <= rect.bottom + 10;
        if (!near(r) && !near(bar)) {
            releaseDomBarrage();
        }
    }

    function bindNativeDomDanmuHover(el) {
        if (!el || boundDomBarrage.has(el) || !el.closest('.CanvasDanmakuPlugin, [data-e2e*="danmu"]')) return;
        boundDomBarrage.add(el);
        el.addEventListener('mouseenter', () => {
            if (!legacyCanvasEnabled || !isTargetRoom() || captureEditing) return;
            const info = extractDomBarrageInfo(el);
            if (!info || !info.text || shouldBlockDanmuText(info.text)) return;
            if (activeDomBarrage && activeDomBarrage !== el) releaseDomBarrage();
            if (activePausedBarrage) unlockPausedBarrage();
            if (domLeaveTimer) {
                clearTimeout(domLeaveTimer);
                domLeaveTimer = 0;
            }
            activeDomBarrage = el;
            originalDomAnimationState = el.style.animationPlayState;
            el.style.animationPlayState = 'paused';
            activeText = info.text;
            activeSender = info.sender || '';
            const rect = el.getBoundingClientRect();
            positionOverlayForBarrage({
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                canvasRect: { left: 0, right: window.innerWidth }
            });
        });
        el.addEventListener('mouseleave', () => {
            if (domLeaveTimer) clearTimeout(domLeaveTimer);
            domLeaveTimer = setTimeout(checkPointerStillOverDom, 140);
        });
    }

    function disconnectDanmuObservers() {
        for (const obs of danmuObservers.values()) {
            try { obs.disconnect(); } catch (_) {}
        }
        danmuObservers.clear();
    }

    function observeNativeDomFallback() {
        if (!isTargetRoom() || !document.body) return;
        for (const [container, observer] of danmuObservers) {
            if (!container.isConnected) {
                observer.disconnect();
                danmuObservers.delete(container);
            }
        }
        const scan = (node) => {
            if (!(node instanceof Element)) return;
            if (node.matches(DOM_DANMU_SELECTOR)) bindNativeDomDanmuHover(node);
            node.querySelectorAll?.(DOM_DANMU_SELECTOR).forEach(bindNativeDomDanmuHover);
        };
        const containers = document.querySelectorAll('.CanvasDanmakuPlugin, [data-e2e*="danmu"]');
        for (const container of containers) {
            if (container.matches(DOM_DANMU_SELECTOR)) {
                bindNativeDomDanmuHover(container);
                continue;
            }
            if (danmuObservers.has(container)) continue;
            const parentContainer = container.parentElement?.closest('.CanvasDanmakuPlugin, [data-e2e*="danmu"]');
            if (parentContainer && danmuObservers.has(parentContainer)) continue;
            scan(container);
            const observer = new MutationObserver((mutations) => {
                if (!isTargetRoom()) return;
                if (activeDomBarrage && !activeDomBarrage.isConnected) {
                    releaseDomBarrage();
                }
                for (const change of mutations) {
                    for (const node of change.addedNodes) {
                        scan(node);
                    }
                }
            });
            observer.observe(container, { childList: true, subtree: true });
            danmuObservers.set(container, observer);
        }
    }

    // ==========================================
    // 9. 主播小窗截图：播放器相对坐标，支持拖拽与缩放
    // 不依赖截图服务和外部库。跨域视频可由用户主动授权标签页截取。
    // ==========================================
    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

    function normalizeRoi(roi) {
        if (!roi || !['x', 'y', 'w', 'h'].every(k => Number.isFinite(roi[k]))) {
            return { ...DEFAULT_ROI };
        }
        const x = clamp(roi.x, 0, 0.95);
        const y = clamp(roi.y, 0, 0.95);
        return { x, y, w: clamp(roi.w, 0.04, 1 - x), h: clamp(roi.h, 0.04, 1 - y) };
    }

    function loadRoi() {
        try {
            return normalizeRoi(JSON.parse(localStorage.getItem(ROI_KEY)));
        } catch (_) {
            return { ...DEFAULT_ROI };
        }
    }

    let captureRoi = loadRoi();
    let captureEditing = false;
    let captureBusy = false;
    let activeCaptureStream = null;
    let capturePanelEl = null;
    let captureFrameEl = null;
    let lastCaptureBlob = null;
    let lastCaptureUrl = null;

    function saveRoi() {
        try {
            localStorage.setItem(ROI_KEY, JSON.stringify(captureRoi));
        } catch (_) {
            showToast('截图区域未能保存到浏览器');
        }
    }

    function getVisibleVideos() {
        return [...document.querySelectorAll('video')].filter((video) => {
            const r = video.getBoundingClientRect();
            return video.videoWidth > 0 &&
                video.videoHeight > 0 &&
                video.readyState >= 2 &&
                isElementVisible(video) &&
                r.width >= 60 &&
                r.height >= 50 &&
                r.right > 0 &&
                r.bottom > 0 &&
                r.left < window.innerWidth &&
                r.top < window.innerHeight;
        });
    }

    function getCaptureAnchor() {
        const videos = getVisibleVideos().sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            return br.width * br.height - ar.width * ar.height;
        });
        if (videos.length) return videos[0].getBoundingClientRect();
        // 播放器未找到 video 时，依旧允许使用标签页捕获。
        const containers = [...document.querySelectorAll(
            '.douyin-player, .douyin-player-container, [class*="player-container"], [data-e2e="live-player"]'
        )].filter(isElementVisible)
            .map(el => el.getBoundingClientRect())
            .filter(r => r.width > 250 && r.height > 180)
            .sort((a, b) => b.width * b.height - a.width * a.height);
        return containers[0] || null;
    }

    function getCaptureRect() {
        const anchor = getCaptureAnchor();
        if (!anchor) return null;
        return {
            left: anchor.left + captureRoi.x * anchor.width,
            top: anchor.top + captureRoi.y * anchor.height,
            width: captureRoi.w * anchor.width,
            height: captureRoi.h * anchor.height,
            right: anchor.left + (captureRoi.x + captureRoi.w) * anchor.width,
            bottom: anchor.top + (captureRoi.y + captureRoi.h) * anchor.height
        };
    }

    function positionCaptureFrame() {
        if (!captureEditing || !captureFrameEl) return;
        const r = getCaptureRect();
        if (!r) return;
        captureFrameEl.style.left = `${r.left}px`;
        captureFrameEl.style.top = `${r.top}px`;
        captureFrameEl.style.width = `${r.width}px`;
        captureFrameEl.style.height = `${r.height}px`;
        captureFrameEl.style.display = 'block';
    }

    function createCaptureFrame() {
        if (captureFrameEl) return captureFrameEl;
        const frame = document.createElement('div');
        frame.id = 'tm-shot-frame';
        frame.innerHTML = '<span id="tm-shot-frame-label">拖动定位 · 右下角缩放 · 回面板截取</span><span id="tm-shot-resize"></span>';
        let drag = null;
        frame.addEventListener('pointerdown', (e) => {
            if (!isTargetRoom() || e.button !== 0) return;
            const anchor = getCaptureAnchor();
            if (!anchor || !anchor.width || !anchor.height) return;
            e.preventDefault();
            e.stopPropagation();
            drag = {
                id: e.pointerId,
                x: e.clientX,
                y: e.clientY,
                initial: { ...captureRoi },
                mode: e.target.closest('#tm-shot-resize') ? 'resize' : 'move',
                anchorW: anchor.width,
                anchorH: anchor.height
            };
            frame.setPointerCapture(e.pointerId);
        });
        frame.addEventListener('pointermove', (e) => {
            if (!drag || drag.id !== e.pointerId) return;
            const dx = (e.clientX - drag.x) / drag.anchorW;
            const dy = (e.clientY - drag.y) / drag.anchorH;
            const o = drag.initial;
            if (drag.mode === 'move') {
                captureRoi = {
                    ...o,
                    x: clamp(o.x + dx, 0, 1 - o.w),
                    y: clamp(o.y + dy, 0, 1 - o.h)
                };
            } else {
                captureRoi = {
                    ...o,
                    w: clamp(o.w + dx, 0.04, 1 - o.x),
                    h: clamp(o.h + dy, 0.04, 1 - o.y)
                };
            }
            positionCaptureFrame();
        });
        const stopDrag = (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            drag = null;
            saveRoi();
        };
        frame.addEventListener('pointerup', stopDrag);
        frame.addEventListener('pointercancel', stopDrag);
        captureFrameEl = frame;
        ensureInOverlayRoot(frame);
        return frame;
    }

    function stopCaptureSelection() {
        captureEditing = false;
        if (captureFrameEl) captureFrameEl.style.display = 'none';
        saveRoi();
        if (capturePanelEl) {
            const toggle = capturePanelEl.querySelector('#tm-shot-select');
            if (toggle) toggle.textContent = '调整选区';
        }
    }

    function startCaptureSelection() {
        if (!getCaptureAnchor()) {
            showToast('未找到播放器，请等视频画面出现后再调整');
            return;
        }
        unlockPausedBarrage();
        releaseDomBarrage();
        captureEditing = true;
        createCaptureFrame();
        positionCaptureFrame();
        const btn = capturePanelEl?.querySelector('#tm-shot-select');
        if (btn) btn.textContent = '完成选区';
        showToast('拖动蓝框对准主播区域，拖右下角改大小', 2800);
    }

    function findInsetFaceVideo() {
        const videos = getVisibleVideos();
        if (videos.length < 2) {
            showToast('未检测到独立视频小窗；请手动框选右上角人脸');
            return;
        }
        const big = getCaptureAnchor();
        if (!big) return;
        const face = videos.slice().sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return ra.width * ra.height - rb.width * rb.height;
        }).find((v) => {
            const r = v.getBoundingClientRect();
            return r.width * r.height < big.width * big.height * 0.42 &&
                r.left >= big.left + big.width * 0.4 &&
                r.top < big.top + big.height * 0.6 &&
                r.right <= big.right + 20 &&
                r.bottom <= big.bottom + 20;
        });
        if (!face) {
            showToast('没有找到可自动识别的小视频窗，请拖动蓝框校准');
            return;
        }
        const r = face.getBoundingClientRect();
        captureRoi = normalizeRoi({
            x: clamp((r.left - big.left) / big.width, 0, 0.95),
            y: clamp((r.top - big.top) / big.height, 0, 0.95),
            w: r.width / big.width,
            h: r.height / big.height
        });
        saveRoi();
        if (captureEditing) positionCaptureFrame();
        showToast('已按独立视频小窗定位；可继续微调');
    }

    let lastCapturePngBlob = null;
    let lastCaptureExt = 'webp';
    let lastRawCaptureCanvas = null;
    let reencodePreviewTimerId = 0;
    let reencodeSeq = 0;
    let shotPanelMovedByUser = false;

    function getSaveModeLabel(mode) {
        if (mode === 'directory') return '本地文件夹';
        if (mode === 'download') return '浏览器下载';
        return '仅剪贴板';
    }

    function getFormatDisplay(format, quality, maxWidth) {
        const fmt = (format || 'webp').toUpperCase();
        const qPart = format === 'png' ? '无损' : `${Math.round((quality || 0.85) * 100)}%`;
        const wPart = maxWidth ? `≤${maxWidth}px` : '原图';
        return `${fmt} ${qPart} ${wPart}`;
    }

    function refreshShotConfigDisplays() {
        const scText = formatShortcut(shotConfig.shortcut);
        const triggerTip = shotConfig.configured
            ? `截图（${getFormatDisplay(shotConfig.format, shotConfig.quality, shotConfig.maxWidth)}，${scText}）`
            : '设置截图参数';

        const headerShotBtn = panelEl?.querySelector('#tm-btn-shot');
        if (headerShotBtn) headerShotBtn.title = triggerTip;

        const summaryEl = panelEl?.querySelector('#tm-shot-settings-summary');
        if (summaryEl) {
            const dirText = shotConfig.saveMode === 'directory'
                ? (cachedDirHandle
                    ? `目录「${cachedDirHandle.name}」`
                    : '未选目录（回退下载）')
                : getSaveModeLabel(shotConfig.saveMode);
            summaryEl.textContent = shotConfig.configured
                ? `${dirText} · ${getFormatDisplay(shotConfig.format, shotConfig.quality, shotConfig.maxWidth)} · ${scText}`
                : '尚未配置截图参数。';
        }

        if (!capturePanelEl) return;
        const dirLabel = capturePanelEl.querySelector('#tm-shot-dir-label');
        const dirAuthBtn = capturePanelEl.querySelector('#tm-shot-dir-auth');
        const dirPickBtn = capturePanelEl.querySelector('#tm-shot-dir-pick');
        const hasPicker = !!getShowDirectoryPicker();
        if (dirPickBtn) dirPickBtn.disabled = !hasPicker;
        if (dirLabel) {
            if (!hasPicker) {
                dirLabel.textContent = '浏览器不支持目录授权，将直接下载';
            } else if (!cachedDirHandle) {
                dirLabel.textContent = '未选目录（保存时回退下载）';
            } else if (cachedDirPermission === 'granted') {
                dirLabel.textContent = `目录：${cachedDirHandle.name}`;
            } else {
                dirLabel.textContent = `${cachedDirHandle.name}（待授权）`;
            }
        }
        if (dirAuthBtn) {
            dirAuthBtn.style.display = hasPicker && cachedDirHandle && cachedDirPermission !== 'granted' ? 'inline-block' : 'none';
        }
        const dlBtn = capturePanelEl.querySelector('#tm-shot-download');
        if (dlBtn) dlBtn.textContent = `保存 ${(shotConfig.format || 'webp').toUpperCase()}`;
    }

    function readCapturePanelFormIntoConfig({ markConfigured = false } = {}) {
        if (!capturePanelEl) return shotConfig;
        const saveMode = capturePanelEl.querySelector('#tm-shot-save-mode')?.value || shotConfig.saveMode;
        const alsoCopyClipboard = !!capturePanelEl.querySelector('#tm-shot-also-copy')?.checked;
        const format = capturePanelEl.querySelector('#tm-shot-format')?.value || shotConfig.format;
        const quality = parseFloat(capturePanelEl.querySelector('#tm-shot-quality')?.value || String(shotConfig.quality));
        const maxWidth = parseInt(capturePanelEl.querySelector('#tm-shot-maxwidth')?.value || String(shotConfig.maxWidth), 10);
        const captionEnabled = !!capturePanelEl.querySelector('#tm-shot-caption-enable')?.checked;
        const captionText = (capturePanelEl.querySelector('#tm-shot-caption-text')?.value ?? shotConfig.captionText).slice(0, 60);
        const captionPosition = capturePanelEl.querySelector('#tm-shot-caption-pos')?.value || shotConfig.captionPosition;
        const captionStyle = capturePanelEl.querySelector('#tm-shot-caption-style')?.value || shotConfig.captionStyle;
        return saveShotConfig({
            configured: markConfigured ? true : shotConfig.configured,
            saveMode,
            alsoCopyClipboard,
            format,
            quality,
            maxWidth,
            shortcut: shotConfig.shortcut,
            captionEnabled,
            captionText,
            captionPosition,
            captionStyle,
        });
    }

    function rebuildCaptionPresetSelect(selectEl) {
        if (!selectEl) return;
        const presets = ['高光时刻！', '优雅，太优雅了', '节目效果拉满', '？', '好活', '666', '前方高能'];
        for (const p of getActiveJsonPlugins()) {
            for (const c of p.captions) {
                if (c && !presets.includes(c)) presets.push(c);
            }
        }
        selectEl.replaceChildren();
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = '快捷梗词模版...';
        selectEl.appendChild(placeholderOpt);
        for (const t of presets) {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            selectEl.appendChild(opt);
        }
    }

    function syncCapturePanelFormFromConfig() {
        if (!capturePanelEl) return;
        const modeEl = capturePanelEl.querySelector('#tm-shot-save-mode');
        const copyEl = capturePanelEl.querySelector('#tm-shot-also-copy');
        const fmtEl = capturePanelEl.querySelector('#tm-shot-format');
        const qEl = capturePanelEl.querySelector('#tm-shot-quality');
        const wEl = capturePanelEl.querySelector('#tm-shot-maxwidth');
        const scEl = capturePanelEl.querySelector('#tm-shot-shortcut');
        const dirRowEl = capturePanelEl.querySelector('#tm-shot-dir-row');
        const capEnableEl = capturePanelEl.querySelector('#tm-shot-caption-enable');
        const capTextEl = capturePanelEl.querySelector('#tm-shot-caption-text');
        const capPosEl = capturePanelEl.querySelector('#tm-shot-caption-pos');
        const capStyleEl = capturePanelEl.querySelector('#tm-shot-caption-style');
        const capPresetEl = capturePanelEl.querySelector('#tm-shot-caption-preset');

        if (modeEl) modeEl.value = shotConfig.saveMode;
        if (copyEl) {
            copyEl.checked = shotConfig.saveMode === 'clipboard' ? true : !!shotConfig.alsoCopyClipboard;
            copyEl.disabled = shotConfig.saveMode === 'clipboard';
        }
        if (fmtEl) fmtEl.value = shotConfig.format;
        if (qEl) {
            qEl.value = String(shotConfig.quality);
            qEl.disabled = shotConfig.format === 'png';
        }
        if (wEl) wEl.value = String(shotConfig.maxWidth);
        if (scEl) scEl.value = formatShortcut(shotConfig.shortcut);
        if (dirRowEl) dirRowEl.style.display = shotConfig.saveMode === 'directory' ? 'flex' : 'none';
        if (capEnableEl) capEnableEl.checked = !!shotConfig.captionEnabled;
        const capBoxEl = capturePanelEl.querySelector('#tm-shot-caption-box');
        if (capBoxEl) capBoxEl.style.display = shotConfig.captionEnabled ? 'block' : 'none';
        if (capTextEl) capTextEl.value = shotConfig.captionText || '';
        if (capPosEl) capPosEl.value = shotConfig.captionPosition || 'bottom';
        if (capStyleEl) capStyleEl.value = shotConfig.captionStyle || 'outline';
        rebuildCaptionPresetSelect(capPresetEl);
        refreshShotConfigDisplays();
    }

    function positionCapturePanelNearHelper(panel) {
        if (!panel || shotPanelMovedByUser) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pRect = panel.getBoundingClientRect();
        const shotW = pRect.width || Math.min(348, vw - 20);
        const shotH = pRect.height || 340;
        let left = Math.max(10, vw - shotW - 24);
        let top = 84;

        if (panelEl && panelEl.style.display !== 'none') {
            const hr = panelEl.getBoundingClientRect();
            if (hr.width > 0 && hr.height > 0) {
                if (hr.left - shotW - 10 >= 10) {
                    left = hr.left - shotW - 10;
                    top = hr.top;
                } else if (hr.right + shotW + 10 <= vw - 10) {
                    left = hr.right + 10;
                    top = hr.top;
                } else {
                    left = Math.max(10, hr.right - shotW);
                    top = Math.min(Math.max(10, hr.bottom + 8), Math.max(10, vh - shotH - 10));
                }
            }
        }
        panel.style.left = `${Math.round(left)}px`;
        panel.style.top = `${Math.round(top)}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
    }

    function createCapturePanel() {
        if (capturePanelEl) {
            ensureInOverlayRoot(capturePanelEl);
            syncCapturePanelFormFromConfig();
            return capturePanelEl;
        }
        const panel = document.createElement('div');
        panel.id = 'tm-shot-panel';
        panel.className = 'tm-shot-box';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', '小窗截图');
        panel.innerHTML = `
            <div class="tm-shot-head" id="tm-shot-head">
                <strong>小窗截图</strong>
                <button id="tm-shot-close" type="button" aria-label="关闭">✕</button>
            </div>

            <div class="tm-shot-row">
                <span class="tm-shot-row-label">截取范围</span>
                <div class="tm-shot-actions" style="margin:0;">
                    <button id="tm-shot-select" type="button">调整选区</button>
                    <button id="tm-shot-reset" type="button">重置右上角</button>
                </div>
            </div>

            <div class="tm-shot-grid">
                <label class="tm-shot-field">
                    <span>保存方式</span>
                    <select id="tm-shot-save-mode">
                        <option value="directory">本地文件夹</option>
                        <option value="download">浏览器下载</option>
                        <option value="clipboard">仅剪贴板</option>
                    </select>
                </label>
                <label class="tm-shot-field">
                    <span>快捷键</span>
                    <input id="tm-shot-shortcut" type="text" readonly title="点击录入组合键" />
                </label>
            </div>

            <div class="tm-shot-dir-row" id="tm-shot-dir-row" style="margin:4px 0 6px;">
                <span class="tm-shot-dir-pill" id="tm-shot-dir-label"></span>
                <button class="tm-settings-btn" id="tm-shot-dir-pick" type="button">选择</button>
                <button class="tm-settings-btn tm-shot-primary" id="tm-shot-dir-auth" type="button" style="display:none">授权</button>
            </div>

            <label class="tm-shot-opt">
                <input type="checkbox" id="tm-shot-caption-enable" />
                <span>添加文字配文</span>
            </label>
            <div id="tm-shot-caption-box" style="display:none;margin:4px 0 6px;">
                <div class="tm-shot-field">
                    <div class="tm-shot-dir-row">
                        <input id="tm-shot-caption-text" type="text" placeholder="配文内容" style="flex:1;min-width:110px" />
                        <select id="tm-shot-caption-preset" style="width:112px"></select>
                    </div>
                </div>
            </div>

            <details class="tm-shot-adv" id="tm-shot-adv">
                <summary>高级选项</summary>
                <div class="tm-shot-grid">
                    <label class="tm-shot-field">
                        <span>格式</span>
                        <select id="tm-shot-format">
                            <option value="webp">WebP</option>
                            <option value="jpeg">JPEG</option>
                            <option value="png">PNG 无损</option>
                        </select>
                    </label>
                    <label class="tm-shot-field">
                        <span>质量</span>
                        <select id="tm-shot-quality">
                            <option value="0.85">85%</option>
                            <option value="0.92">92%</option>
                            <option value="0.72">72%</option>
                        </select>
                    </label>
                    <label class="tm-shot-field full">
                        <span>最大宽度</span>
                        <select id="tm-shot-maxwidth">
                            <option value="640">640px</option>
                            <option value="480">480px</option>
                            <option value="960">960px</option>
                            <option value="0">原始尺寸</option>
                        </select>
                    </label>
                    <label class="tm-shot-field">
                        <span>配文位置</span>
                        <select id="tm-shot-caption-pos">
                            <option value="bottom">底部居中</option>
                            <option value="top">顶部居中</option>
                            <option value="corner">右下角</option>
                        </select>
                    </label>
                    <label class="tm-shot-field">
                        <span>文字样式</span>
                        <select id="tm-shot-caption-style">
                            <option value="outline">白字描边</option>
                            <option value="banner">黑底条</option>
                        </select>
                    </label>
                </div>
                <label class="tm-shot-opt">
                    <input type="checkbox" id="tm-shot-also-copy" />
                    <span>保存文件时顺便复制 PNG 到剪贴板</span>
                </label>
                <div class="tm-shot-actions" style="margin-top:6px;">
                    <button id="tm-shot-find" type="button">定位独立小窗</button>
                    <button id="tm-shot-tab" type="button">标签页截图（跨域备选）</button>
                </div>
            </details>

            <div class="tm-shot-actions">
                <button class="tm-shot-primary" id="tm-shot-capture" type="button">保存并截图</button>
                <button id="tm-shot-save-cfg" type="button">仅保存设置</button>
            </div>

            <div id="tm-shot-status" class="tm-shot-help" style="display:none"></div>
            <img id="tm-shot-preview" class="tm-shot-preview" alt="截图预览" style="display:none" />
            <div class="tm-shot-actions" id="tm-shot-result-actions" style="display:none">
                <button id="tm-shot-copy" type="button" disabled>复制 PNG</button>
                <button id="tm-shot-download" type="button" disabled>保存 WEBP</button>
            </div>
        `;
        panel.addEventListener('click', (e) => e.stopPropagation());
        panel.addEventListener('pointerdown', (e) => e.stopPropagation());
        panel.addEventListener('keydown', (e) => {
            if (isRecordingShortcut) return;
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                if (captureEditing) stopCaptureSelection();
                else panel.style.display = 'none';
            }
        });
        panel.querySelector('#tm-shot-close').addEventListener('click', () => {
            isRecordingShortcut = false;
            stopCaptureSelection();
            panel.style.display = 'none';
        });
        panel.querySelector('#tm-shot-select').addEventListener('click', () => {
            if (captureEditing) stopCaptureSelection();
            else startCaptureSelection();
        });
        panel.querySelector('#tm-shot-find').addEventListener('click', findInsetFaceVideo);
        panel.querySelector('#tm-shot-reset').addEventListener('click', () => {
            captureRoi = { ...DEFAULT_ROI };
            saveRoi();
            positionCaptureFrame();
            showToast('已重置为右上角选区');
        });

        panel.querySelector('#tm-shot-save-mode').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            syncCapturePanelFormFromConfig();
        });
        panel.querySelector('#tm-shot-format').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            syncCapturePanelFormFromConfig();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-quality').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            refreshShotConfigDisplays();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-maxwidth').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            refreshShotConfigDisplays();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-also-copy').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            refreshShotConfigDisplays();
        });
        panel.querySelector('#tm-shot-caption-enable').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            syncCapturePanelFormFromConfig();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-caption-text').addEventListener('input', () => {
            readCapturePanelFormIntoConfig();
            scheduleReencodeLastCapturePreview(160);
        });
        panel.querySelector('#tm-shot-caption-text').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            scheduleReencodeLastCapturePreview(0);
        });
        panel.querySelector('#tm-shot-caption-pos').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-caption-style').addEventListener('change', () => {
            readCapturePanelFormIntoConfig();
            reencodeLastCapturePreview();
        });
        panel.querySelector('#tm-shot-caption-preset').addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) return;
            panel.querySelector('#tm-shot-caption-text').value = val;
            panel.querySelector('#tm-shot-caption-enable').checked = true;
            e.target.value = '';
            readCapturePanelFormIntoConfig();
            syncCapturePanelFormFromConfig();
            reencodeLastCapturePreview();
        });

        panel.querySelector('#tm-shot-dir-pick').addEventListener('click', async () => {
            const epoch = roomEpoch;
            const picker = getShowDirectoryPicker();
            if (!picker) {
                showToast('当前浏览器不支持目录授权，将直接下载');
                return;
            }
            try {
                const handle = await picker({ id: 'tm-shot-dir', mode: 'readwrite' });
                if (!handle || !isCurrentRoom(epoch)) return;
                await saveDirectoryHandle(handle);
                if (!isCurrentRoom(epoch)) return;
                await queryDirPermission(handle, true);
                if (!isCurrentRoom(epoch)) return;
                saveShotConfig({ saveMode: 'directory' });
                syncCapturePanelFormFromConfig();
                showToast(`已选择目录：${handle.name}`);
            } catch (err) {
                if (err?.name !== 'AbortError') {
                    showToast('选择目录失败');
                }
            }
        });

        panel.querySelector('#tm-shot-dir-auth').addEventListener('click', async () => {
            if (!cachedDirHandle) return;
            const epoch = roomEpoch;
            const status = await queryDirPermission(cachedDirHandle, true);
            if (!isCurrentRoom(epoch)) return;
            syncCapturePanelFormFromConfig();
            showToast(status === 'granted' ? `已授权目录：${cachedDirHandle.name}` : '未获得读写权限');
        });

        const shortcutInput = panel.querySelector('#tm-shot-shortcut');
        bindShortcutRecorder(shortcutInput, {
            getCurrent: () => shotConfig.shortcut,
            placeholder: '按下组合键（Esc 取消）',
            conflictIgnoreId: '__shot__',
            onSave: (nextShortcut) => {
                saveShotConfig({ shortcut: nextShortcut });
                refreshShotConfigDisplays();
                showToast(`截图快捷键：${formatShortcut(shotConfig.shortcut)}`);
            },
        });

        panel.querySelector('#tm-shot-save-cfg').addEventListener('click', () => {
            readCapturePanelFormIntoConfig({ markConfigured: true });
            stopCaptureSelection();
            syncCapturePanelFormFromConfig();
            panel.style.display = 'none';
            showToast('截图设置已保存', 2400);
        });

        panel.querySelector('#tm-shot-capture').addEventListener('click', async () => {
            readCapturePanelFormIntoConfig({ markConfigured: true });
            syncCapturePanelFormFromConfig();
            await captureFromVideo({ direct: false });
        });
        panel.querySelector('#tm-shot-copy').addEventListener('click', () => copyCapturedImage());
        panel.querySelector('#tm-shot-download').addEventListener('click', () => downloadCapturedImage());
        panel.querySelector('#tm-shot-tab').addEventListener('click', async () => {
            readCapturePanelFormIntoConfig({ markConfigured: true });
            syncCapturePanelFormFromConfig();
            await captureUsingTab();
        });

        setupDraggable(panel, panel.querySelector('#tm-shot-head'), (moved) => {
            if (moved) shotPanelMovedByUser = true;
        });
        capturePanelEl = panel;
        ensureInOverlayRoot(panel);
        syncCapturePanelFormFromConfig();
        return panel;
    }

    function openCapturePanel({ forceConfig = false } = {}) {
        if (!isTargetRoom()) return null;
        const panel = createCapturePanel();
        ensureInOverlayRoot(panel);
        syncCapturePanelFormFromConfig();
        panel.style.display = 'block';
        positionCapturePanelNearHelper(panel);
        clampElementToViewport(panel);
        if (forceConfig && !shotConfig.configured) {
            const statusEl = panel.querySelector('#tm-shot-status');
            if (statusEl) {
                statusEl.textContent = '配置保存位置和快捷键后，点「截图」即可直接出图。';
                statusEl.style.display = 'block';
            }
        }
        return panel;
    }

    function triggerCaptureAction() {
        if (!isTargetRoom() || captureBusy) return;
        if (!shotConfig.configured) {
            openCapturePanel({ forceConfig: true });
            return;
        }
        captureFromVideo({ direct: true });
    }

    function setCaptureStatus(message) {
        const panel = openCapturePanel();
        if (panel) {
            const statusEl = panel.querySelector('#tm-shot-status');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.display = message ? 'block' : 'none';
            }
        }
    }

    function setCaptureBusy(busy) {
        captureBusy = busy;
        if (busy) {
            reencodeSeq++;
            clearTimeout(reencodePreviewTimerId);
            reencodePreviewTimerId = 0;
        }
        capturePanelEl?.querySelectorAll('#tm-shot-capture, #tm-shot-tab')?.forEach((btn) => {
            btn.disabled = busy;
        });
    }

    function rectangleIntersection(a, b) {
        const left = Math.max(a.left, b.left);
        const top = Math.max(a.top, b.top);
        const right = Math.min(a.right, b.right);
        const bottom = Math.min(a.bottom, b.bottom);
        return right > left && bottom > top
            ? { left, top, right, bottom, width: right - left, height: bottom - top }
            : null;
    }

    function displayVideoContentRect(video, rect) {
        const fit = getComputedStyle(video).objectFit || 'fill';
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (fit === 'fill') return rect;
        let scale;
        if (fit === 'cover') scale = Math.max(rect.width / vw, rect.height / vh);
        else if (fit === 'contain') scale = Math.min(rect.width / vw, rect.height / vh);
        else if (fit === 'none') scale = 1;
        else scale = Math.min(1, Math.min(rect.width / vw, rect.height / vh));
        const width = vw * scale;
        const height = vh * scale;
        const positions = (getComputedStyle(video).objectPosition || '50% 50%').split(/\s+/);
        const parsePos = (s) => (s?.endsWith('%') ? clamp(parseFloat(s) / 100, 0, 1) : 0.5);
        const x = parsePos(positions[0]);
        const y = parsePos(positions[1] ?? positions[0]);
        const left = rect.left + (rect.width - width) * x;
        const top = rect.top + (rect.height - height) * y;
        return { left, top, width, height, right: left + width, bottom: top + height };
    }

    function canvasForRoi(rect, scale) {
        const canvas = document.createElement('canvas');
        // 同比限边/限像素，避免超宽画面变形以及高 DPI 下的内存峰值。
        const factor = Math.min(scale, 4096 / Math.max(rect.width, rect.height), Math.sqrt(8 * 1024 * 1024 / (rect.width * rect.height)));
        canvas.width = Math.max(1, Math.round(rect.width * factor));
        canvas.height = Math.max(1, Math.round(rect.height * factor));
        return canvas;
    }

    function drawVideoIntersection(ctx, video, roi, output) {
        const box = video.getBoundingClientRect();
        const displayed = displayVideoContentRect(video, box);
        const roiBox = rectangleIntersection(roi, box);
        const intersect = roiBox && rectangleIntersection(roiBox, displayed);
        if (!intersect) return false;
        const sx = (intersect.left - displayed.left) / displayed.width * video.videoWidth;
        const sy = (intersect.top - displayed.top) / displayed.height * video.videoHeight;
        const sw = intersect.width / displayed.width * video.videoWidth;
        const sh = intersect.height / displayed.height * video.videoHeight;
        const dx = (intersect.left - roi.left) / roi.width * output.width;
        const dy = (intersect.top - roi.top) / roi.height * output.height;
        const dw = intersect.width / roi.width * output.width;
        const dh = intersect.height / roi.height * output.height;
        ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
        return true;
    }

    function canvasToBlob(canvas, mime = 'image/png', quality) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('浏览器未生成图片'));
                }, mime, quality);
            } catch (error) {
                reject(error);
            }
        });
    }

    function createCompressedCanvas(sourceCanvas, maxWidth) {
        const limit = Number(maxWidth) || 0;
        if (!limit || sourceCanvas.width <= limit) return sourceCanvas;
        const ratio = limit / sourceCanvas.width;
        const out = document.createElement('canvas');
        out.width = Math.max(32, Math.round(sourceCanvas.width * ratio));
        out.height = Math.max(32, Math.round(sourceCanvas.height * ratio));
        const ctx = out.getContext('2d');
        if (!ctx) return sourceCanvas;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, 0, 0, out.width, out.height);
        return out;
    }

    function getFormatSpec(format) {
        if (format === 'jpeg') return { mime: 'image/jpeg', ext: 'jpg' };
        if (format === 'png') return { mime: 'image/png', ext: 'png' };
        return { mime: 'image/webp', ext: 'webp' };
    }

    function applyCaptionToCanvas(canvas, cfg = shotConfig) {
        if (!cfg?.captionEnabled) return canvas;
        const text = String(cfg.captionText || '').trim();
        if (!text) return canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const w = canvas.width;
        const h = canvas.height;
        let fontSize = Math.max(16, Math.min(44, Math.round(w * 0.075)));
        const basePadX = Math.max(10, Math.round(fontSize * 0.55));
        const baseMaxW = Math.max(40, w - basePadX * 2);

        ctx.save();
        ctx.font = `700 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        const initialWidth = ctx.measureText(text)?.width || 0;
        if (initialWidth > baseMaxW) {
            fontSize = Math.max(13, Math.floor(fontSize * (baseMaxW / initialWidth)));
            ctx.font = `700 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
        }
        const padX = Math.max(10, Math.round(fontSize * 0.55));
        const padY = Math.max(10, Math.round(fontSize * 0.45));
        const maxTextW = Math.max(40, w - padX * 2);
        ctx.textBaseline = 'middle';

        const pos = cfg.captionPosition || 'bottom';
        let x = w / 2;
        let y = h - fontSize * 0.85 - padY;
        ctx.textAlign = 'center';
        if (pos === 'top') {
            y = fontSize * 0.85 + padY;
        } else if (pos === 'corner') {
            ctx.textAlign = 'right';
            x = w - padX;
            y = h - fontSize * 0.8 - padY * 0.8;
        }

        if (cfg.captionStyle === 'banner') {
            const metrics = ctx.measureText(text);
            const textW = Math.min(maxTextW, metrics.width || text.length * fontSize);
            const boxH = Math.round(fontSize * 1.45);
            const boxY = Math.round(y - boxH / 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.64)';
            if (pos === 'corner') {
                const boxW = textW + padX * 1.4;
                ctx.fillRect(w - boxW - padX * 0.4, boxY, boxW, boxH);
            } else {
                ctx.fillRect(0, boxY, w, boxH);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x, y, maxTextW);
        } else {
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.16));
            ctx.strokeStyle = '#0f172a';
            ctx.strokeText(text, x, y, maxTextW);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x, y, maxTextW);
        }
        ctx.restore();
        return canvas;
    }

    function cloneCanvas(src) {
        if (!src || !src.width || !src.height) return null;
        const copy = document.createElement('canvas');
        copy.width = src.width;
        copy.height = src.height;
        const ctx = copy.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(src, 0, 0);
        return copy;
    }

    async function reencodeLastCapturePreview() {
        if (captureBusy || !lastRawCaptureCanvas || !isTargetRoom()) return;
        if (!capturePanelEl || capturePanelEl.style.display === 'none') return;
        const seq = ++reencodeSeq;
        try {
            const encoded = await encodeCanvasForConfig(lastRawCaptureCanvas, shotConfig);
            if (seq !== reencodeSeq || !lastRawCaptureCanvas || !isTargetRoom()) return;
            storeCaptureResult(encoded);
            updateCapturePreviewUi(encoded, { openPanel: false });
        } catch (_) {}
    }

    function scheduleReencodeLastCapturePreview(delayMs = 0) {
        if (!lastRawCaptureCanvas) return;
        if (reencodePreviewTimerId) {
            clearTimeout(reencodePreviewTimerId);
            reencodePreviewTimerId = 0;
        }
        if (delayMs <= 0) {
            reencodeLastCapturePreview();
        } else {
            reencodePreviewTimerId = window.setTimeout(() => {
                reencodePreviewTimerId = 0;
                reencodeLastCapturePreview();
            }, delayMs);
        }
    }

    async function encodeCanvasForConfig(sourceCanvas, cfg = shotConfig) {
        let outCanvas = createCompressedCanvas(sourceCanvas, cfg.maxWidth);
        if (outCanvas === sourceCanvas && cfg?.captionEnabled && String(cfg.captionText || '').trim()) {
            outCanvas = cloneCanvas(sourceCanvas) || sourceCanvas;
        }
        applyCaptionToCanvas(outCanvas, cfg);
        const spec = getFormatSpec(cfg.format);
        const primaryBlob = await canvasToBlob(
            outCanvas,
            spec.mime,
            spec.mime === 'image/png' ? undefined : cfg.quality
        );
        const actualExt = primaryBlob.type === 'image/png'
            ? 'png'
            : primaryBlob.type === 'image/jpeg'
                ? 'jpg'
                : 'webp';
        let pngBlob = primaryBlob.type === 'image/png' ? primaryBlob : null;
        if (!pngBlob && (cfg.saveMode === 'clipboard' || cfg.alsoCopyClipboard)) {
            pngBlob = await canvasToBlob(outCanvas, 'image/png');
        }
        return { primaryBlob, pngBlob, ext: actualExt, width: outCanvas.width, height: outCanvas.height };
    }

    function formatCaptureFilename(ext = lastCaptureExt) {
        const d = new Date();
        const stamp = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('') +
            '-' + [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, '0')).join('') + '-' + String(d.getMilliseconds()).padStart(3, '0');
        return `直播间-${roomId}-${stamp}.${ext || 'webp'}`;
    }

    function assertCurrentRoom(epoch) {
        if (!isCurrentRoom(epoch)) throw new DOMException('已离开目标直播间，操作取消', 'AbortError');
    }

    async function writeBlobToAuthorizedDir(dirHandle, filename, blob, epoch = roomEpoch) {
        assertCurrentRoom(epoch);
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        assertCurrentRoom(epoch);
        const writable = await fileHandle.createWritable();
        try {
            assertCurrentRoom(epoch);
            await writable.write(blob);
            assertCurrentRoom(epoch);
            await writable.close();
        } catch (error) {
            try { await writable.abort(); } catch (_) {}
            throw error;
        }
    }

    function storeCaptureResult(encoded) {
        if (!encoded?.primaryBlob || !isTargetRoom()) return;
        if (lastCaptureUrl) URL.revokeObjectURL(lastCaptureUrl);
        lastCaptureBlob = encoded.primaryBlob;
        lastCapturePngBlob = encoded.pngBlob || (encoded.primaryBlob.type === 'image/png' ? encoded.primaryBlob : null);
        lastCaptureExt = encoded.ext || 'webp';
        lastCaptureUrl = URL.createObjectURL(encoded.primaryBlob);
    }

    function updateCapturePreviewUi(encoded, { openPanel = true } = {}) {
        if (!encoded?.primaryBlob || !isTargetRoom()) return;
        const panel = openPanel ? openCapturePanel() : capturePanelEl;
        if (!panel) return;
        const img = panel.querySelector('#tm-shot-preview');
        img.src = lastCaptureUrl;
        img.style.display = 'block';
        const resActions = panel.querySelector('#tm-shot-result-actions');
        if (resActions) resActions.style.display = 'flex';
        panel.querySelector('#tm-shot-copy').disabled = false;
        panel.querySelector('#tm-shot-download').disabled = false;
        panel.querySelector('#tm-shot-download').textContent = `保存 ${lastCaptureExt.toUpperCase()}`;
        const statusEl = panel.querySelector('#tm-shot-status');
        if (statusEl) {
            statusEl.textContent = `${encoded.width}×${encoded.height} · ${(encoded.primaryBlob.size / 1024).toFixed(1)} KB · ${lastCaptureExt.toUpperCase()}`;
            statusEl.style.display = 'block';
        }
    }

    async function finalizeCapturedResult(encoded, { direct = false, epoch = roomEpoch, cfg = shotConfig } = {}) {
        if (!isCurrentRoom(epoch)) return;
        storeCaptureResult(encoded);
        updateCapturePreviewUi(encoded, { openPanel: !direct });
        stopCaptureSelection();

        const sizeKb = (encoded.primaryBlob.size / 1024).toFixed(1);
        const filename = formatCaptureFilename(encoded.ext);
        let saveSummary = '';

        if (cfg.saveMode === 'directory') {
            if (cachedDirHandle && cachedDirPermission === 'granted') {
                try {
                    await writeBlobToAuthorizedDir(cachedDirHandle, filename, encoded.primaryBlob, epoch);
                    if (!isCurrentRoom(epoch)) return;
                    saveSummary = `已保存到「${cachedDirHandle.name}/${filename}」(${sizeKb} KB)`;
                } catch (_) {
                    if (!isCurrentRoom(epoch)) return;
                    downloadCapturedImage({ silent: true, filename });
                    saveSummary = `文件夹写入失败，已下载 ${filename} (${sizeKb} KB)`;
                }
            } else {
                downloadCapturedImage({ silent: true, filename });
                saveSummary = cachedDirHandle
                    ? `文件夹未授权，已通过浏览器下载 ${filename} (${sizeKb} KB)`
                    : `未选择文件夹，已通过浏览器下载 ${filename} (${sizeKb} KB)`;
            }
        } else if (cfg.saveMode === 'download') {
            downloadCapturedImage({ silent: true, filename });
            saveSummary = `已下载 ${filename} (${sizeKb} KB)`;
        }

        let copyOk = false;
        if (!isCurrentRoom(epoch)) return;
        if (cfg.saveMode === 'clipboard' || cfg.alsoCopyClipboard) {
            copyOk = await copyCapturedImage({ silentOnError: true, suppressToast: true });
            if (!isCurrentRoom(epoch)) return;
            if (cfg.saveMode === 'clipboard') {
                saveSummary = copyOk
                    ? `已复制 PNG 到剪贴板 (${sizeKb} KB)`
                    : `剪贴板复制受限，已打开预览窗`;
            } else if (copyOk) {
                saveSummary += '（已同时复制）';
            }
        }

        if (direct && cfg.saveMode === 'clipboard' && !copyOk) {
            updateCapturePreviewUi(encoded, { openPanel: true });
        }
        if (saveSummary) {
            if (capturePanelEl && capturePanelEl.style.display !== 'none') {
                const statusEl = capturePanelEl.querySelector('#tm-shot-status');
                if (statusEl) statusEl.textContent = saveSummary;
            }
            showToast(saveSummary, 3200);
        }
    }

    async function captureFromVideo({ direct = false } = {}) {
        if (captureBusy || !isTargetRoom()) return;
        if (!direct) openCapturePanel();
        const epoch = roomEpoch;
        const cfg = { ...shotConfig };
        setCaptureBusy(true);
        try {

            // 在耗时异步操作前先尝试恢复/申请目录授权，保住用户点击激活态
            if (cfg.saveMode === 'directory' && cachedDirHandle && cachedDirPermission !== 'granted') {
                await queryDirPermission(cachedDirHandle, true);
                assertCurrentRoom(epoch);
                refreshShotConfigDisplays();
            }

            const roi = getCaptureRect();
            if (!roi || roi.width < 20 || roi.height < 20) {
                setCaptureStatus('无法定位播放器；确认正在直播，或改用「标签页截图（跨域备选）」。');
                return;
            }
            const videos = getVisibleVideos();
            if (!videos.length) {
                setCaptureStatus('页面没有可直接读取的视频，可尝试「标签页截图（跨域备选）」。');
                return;
            }
            const main = videos.reduce((best, v) => (v.videoWidth > (best?.videoWidth || 0) ? v : best), null);
            const css = main?.getBoundingClientRect();
            const scale = clamp(css?.width ? main.videoWidth / css.width : (window.devicePixelRatio || 1), 1, 3);
            const canvas = canvasForRoi(roi, scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D 不可用');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 大视频绘制在底层，独立摄像头小窗在上层。尽量还原两层视频。
            const sorted = videos.sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return rb.width * rb.height - ra.width * ra.height;
            });
            let drawn = false;
            for (const video of sorted) {
                try {
                    drawn = drawVideoIntersection(ctx, video, roi, canvas) || drawn;
                } catch (error) {
                    if (!drawn) throw error;
                }
            }
            if (!drawn) throw new Error('选区与视频画面没有交集');
            lastRawCaptureCanvas = canvas;
            const encoded = await encodeCanvasForConfig(canvas, cfg);
            await finalizeCapturedResult(encoded, { direct, epoch, cfg });
        } catch (error) {
            if (!isCurrentRoom(epoch)) return;
            setCaptureStatus('直接截取失败：' + (
                error?.name === 'SecurityError'
                    ? '受视频跨域限制，请点击下方「标签页截图（跨域备选）」。'
                    : String(error?.message || error)
            ));
        } finally {
            if (isCurrentRoom(epoch)) setCaptureBusy(false);
        }
    }

    async function captureUsingTab() {
        if (captureBusy || !isTargetRoom()) return;
        const epoch = roomEpoch;
        const cfg = { ...shotConfig };
        const roi = getCaptureRect();
        if (!roi) {
            setCaptureStatus('尚未找到播放器，无法确定截图范围。');
            return;
        }
        if (typeof navigator.mediaDevices?.getDisplayMedia !== 'function') {
            setCaptureStatus('浏览器不支持标签页截图，请尝试较新版本 Chrome/Edge。');
            return;
        }
        // 必须由按钮直接触发；不能先 await，否则会丢失浏览器用户激活。
        let stream = null;
        let tabVideo = null;
        setCaptureBusy(true);
        try {
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30, displaySurface: 'browser' },
                audio: false,
                preferCurrentTab: true,
                selfBrowserSurface: 'include',
                surfaceSwitching: 'exclude'
            });
            assertCurrentRoom(epoch);
            activeCaptureStream = stream;
            const surface = stream.getVideoTracks()[0]?.getSettings?.().displaySurface;
            if (surface && surface !== 'browser') throw new Error('请选择当前浏览器标签页，不要选择整个屏幕或窗口');
            tabVideo = document.createElement('video');
            tabVideo.srcObject = stream;
            tabVideo.muted = true;
            tabVideo.playsInline = true;
            let playTimer;
            try {
                await Promise.race([tabVideo.play(), new Promise((_, reject) => {
                    playTimer = setTimeout(() => reject(new Error('等待共享画面超时，请重试')), 8000);
                })]);
            } finally { clearTimeout(playTimer); }
            assertCurrentRoom(epoch);
            if (!tabVideo.videoWidth || !tabVideo.videoHeight) {
                throw new Error('共享画面尚未就绪');
            }
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const clampedLeft = Math.max(0, Math.min(vw, roi.left));
            const clampedTop = Math.max(0, Math.min(vh, roi.top));
            const clampedRight = Math.max(0, Math.min(vw, roi.left + roi.width));
            const clampedBottom = Math.max(0, Math.min(vh, roi.top + roi.height));
            const clampedRoi = {
                left: clampedLeft,
                top: clampedTop,
                width: Math.round(clampedRight - clampedLeft),
                height: Math.round(clampedBottom - clampedTop),
            };
            if (clampedRoi.width <= 0 || clampedRoi.height <= 0) {
                throw new Error('选区超出可视窗口范围');
            }
            // 只截取选定区域；用户必须在共享选择框中选择「当前标签页」。
            // 临时隐藏全部助手浮层，防止截图拍到插件自身 UI。
            const hiddenEls = [
                capturePanelEl,
                captureFrameEl,
                panelEl,
                document.getElementById('tm-toast'),
                document.getElementById('tm-danmu-ball'),
                document.getElementById('tm-danmu-actions'),
                document.getElementById('tm-danmu-highlight-box')
            ].filter(Boolean).map(el => [el, el.style.visibility]);
            hiddenEls.forEach(([el]) => { el.style.visibility = 'hidden'; });
            try {
                await new Promise((resolve) => {
                    let settled = false;
                    const done = () => {
                        if (settled) return;
                        settled = true;
                        resolve();
                    };
                    const fallbackTimer = setTimeout(done, 250);
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        if (typeof tabVideo.requestVideoFrameCallback === 'function') {
                            tabVideo.requestVideoFrameCallback(() => {
                                clearTimeout(fallbackTimer);
                                done();
                            });
                        } else {
                            setTimeout(() => {
                                clearTimeout(fallbackTimer);
                                done();
                            }, 120);
                        }
                    }));
                });
                const out = canvasForRoi(clampedRoi, clamp(tabVideo.videoWidth / vw, 1, 3));
                assertCurrentRoom(epoch);
                const ctx = out.getContext('2d');
                if (!ctx) throw new Error('Canvas 2D 不可用');
                ctx.drawImage(
                    tabVideo,
                    clampedRoi.left / vw * tabVideo.videoWidth,
                    clampedRoi.top / vh * tabVideo.videoHeight,
                    clampedRoi.width / vw * tabVideo.videoWidth,
                    clampedRoi.height / vh * tabVideo.videoHeight,
                    0, 0, out.width, out.height
                );
                lastRawCaptureCanvas = out;
                const encoded = await encodeCanvasForConfig(out, cfg);
                await finalizeCapturedResult(encoded, { direct: false, epoch, cfg });
            } finally {
                hiddenEls.forEach(([el, visibility]) => { el.style.visibility = visibility; });
            }
        } catch (error) {
            if (!isCurrentRoom(epoch)) return;
            setCaptureStatus(
                error?.name === 'NotAllowedError'
                    ? '已取消标签页共享。'
                    : `标签页截图失败：${String(error?.message || error)}`
            );
        } finally {
            if (stream) {
                for (const track of stream.getTracks()) track.stop();
            }
            if (tabVideo) tabVideo.srcObject = null;
            if (activeCaptureStream === stream) activeCaptureStream = null;
            if (isCurrentRoom(epoch)) setCaptureBusy(false);
        }
    }

    async function copyCapturedImage({ silentOnError = false, suppressToast = false } = {}) {
        const epoch = roomEpoch;
        if (!isCurrentRoom(epoch)) return false;
        let pngBlob = lastCapturePngBlob || (lastCaptureBlob?.type === 'image/png' ? lastCaptureBlob : null);
        if (!pngBlob && lastRawCaptureCanvas) {
            try {
                const encodedPng = await encodeCanvasForConfig(lastRawCaptureCanvas, { ...shotConfig, format: 'png' });
                if (!isCurrentRoom(epoch)) return false;
                pngBlob = encodedPng.primaryBlob;
                lastCapturePngBlob = pngBlob;
            } catch (_) {}
        }
        if (!pngBlob) return false;
        if (!navigator.clipboard?.write || !window.ClipboardItem) {
            if (!silentOnError) showToast('浏览器不支持图片剪贴板，请使用文件保存');
            return false;
        }
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
            if (!suppressToast) showToast('已复制 PNG 图片，可以粘贴到聊天或图片编辑器');
            return true;
        } catch (_) {
            if (!silentOnError) showToast('浏览器拒绝复制图片，可改用文件保存');
            return false;
        }
    }

    function downloadCapturedImage({ silent = false, filename = '' } = {}) {
        if (!isCurrentRoom(roomEpoch)) return;
        if (!lastCaptureBlob || !lastCaptureUrl) return;
        const a = document.createElement('a');
        a.download = filename || formatCaptureFilename(lastCaptureExt);
        a.href = lastCaptureUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (!silent) showToast(`已发起 ${lastCaptureExt.toUpperCase()} 下载`);
    }

    function onWindowResize() {
        if (!isTargetRoom()) return;
        clampAllFloatingToViewport();
        if (captureEditing) positionCaptureFrame();
    }
    function onWindowScroll() {
        if (!isTargetRoom()) return;
        if (captureEditing) positionCaptureFrame();
    }
    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('scroll', onWindowScroll, { passive: true });

    // ==========================================
    // 10. 生命周期与性能控制
    // ==========================================
    let mouseRaf = 0;
    let latestMouseTarget = null;
    let lastScan = 0;

    function onMouseMove(e) {
        if (!isTargetRoom()) return;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        latestMouseTarget = e.target;
        if (activeDomBarrage) checkPointerStillOverDom();
        if (!legacyCanvasEnabled || !isTargetRoom() || captureEditing) return;
        if (mouseRaf) return;
        mouseRaf = requestAnimationFrame(() => {
            mouseRaf = 0;
            const now = performance.now();
            if (now - lastScan < 85) return;
            lastScan = now;
            handleCanvasDanmuMouseMove(lastMouseX, lastMouseY, latestMouseTarget);
        });
    }

    function onDocumentKeyDown(e) {
        if (isRecordingShortcut || !isTargetRoom()) return;
        if (e.key === 'Escape') {
            if (captureEditing) stopCaptureSelection();
            else if (capturePanelEl) capturePanelEl.style.display = 'none';
            if (panelEl) panelEl.style.display = 'none';
            unlockPausedBarrage();
            releaseDomBarrage();
        }
        if (
            e.repeat ||
            e.isComposing ||
            captureEditing ||
            e.target?.isContentEditable ||
            e.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')
        ) {
            return;
        }
        if (matchesShortcut(e, shotConfig.shortcut)) {
            e.preventDefault();
            triggerCaptureAction();
            return;
        }
        for (const item of hotkeyItems) {
            if (item.enabled && item.text && matchesShortcut(e, item.shortcut)) {
                e.preventDefault();
                sendBarrage(item.text);
                return;
            }
        }
        for (const plugin of getActiveJsonPlugins()) {
            for (const hk of plugin.hotkeys) {
                if (hk.text && matchesShortcut(e, hk.shortcut)) {
                    e.preventDefault();
                    sendBarrage(hk.text);
                    return;
                }
            }
        }
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('keydown', onDocumentKeyDown);

    let initialized = false;
    let lifecycleTimer = 0;
    let dirHandleLoaded = false;

    function stopLifecycleTimer() {
        if (lifecycleTimer) {
            clearInterval(lifecycleTimer);
            lifecycleTimer = 0;
        }
    }

    function startLifecycleTimer() {
        if (!lifecycleTimer && isTargetRoom() && !document.hidden) {
            lifecycleTimer = window.setInterval(syncRoom, 2500);
        }
    }

    function deactivateOnRoomExit() {
        roomEpoch++;
        if (activeCaptureStream) {
            activeCaptureStream.getTracks().forEach(track => track.stop());
            activeCaptureStream = null;
        }
        setCaptureBusy(false);
        if (searchRenderRaf) { cancelAnimationFrame(searchRenderRaf); searchRenderRaf = 0; }
        stopLifecycleTimer();
        isRecordingShortcut = false;
        shotPanelMovedByUser = false;
        if (sendTimerId) {
            clearTimeout(sendTimerId);
            sendTimerId = 0;
        }
        if (reencodePreviewTimerId) {
            clearTimeout(reencodePreviewTimerId);
            reencodePreviewTimerId = 0;
        }
        reencodeSeq++;
        if (mouseRaf) {
            cancelAnimationFrame(mouseRaf);
            mouseRaf = 0;
        }
        isSending = false;
        unlockPausedBarrage();
        releaseDomBarrage();
        restoreBarragePrototypes();
        restoreMainWorldTransferHook();
        restoreMainWorldLotterySniffer();
        cleanupMessageListeners();
        disconnectDanmuObservers();
        disconnectChatroomObserver();
        processedChatItems = new WeakMap();
        document.querySelectorAll('.tm-danmu-hidden, .tm-danmu-highlight').forEach(el => el.classList.remove('tm-danmu-hidden', 'tm-danmu-highlight'));
        document.querySelectorAll('.tm-spam-badge').forEach(el => el.remove());
        recentPluginTriggerMap.clear();
        danmuFilterStats = { blocked: 0, collapsed: 0 };
        refreshFilterStatsUi();
        stopLotteryTicker();
        activeLottery = null;
        activeLotteryCapture = null;
        lastWatchTickMs = 0;
        stopFanRefreshTimer();
        saveFanState(true);
        renderLotteryBanner();
        updateLotteryIndicators(false);
        document.documentElement?.classList?.remove('tm-clean-gifts', 'tm-clean-entrance', 'tm-clean-recommend');
        resetQualityAttemptState();
        cachedManager = null;
        if (captureEditing) stopCaptureSelection();
        lastRawCaptureCanvas = null;
        lastCaptureBlob = null;
        lastCapturePngBlob = null;
        if (lastCaptureUrl) {
            URL.revokeObjectURL(lastCaptureUrl);
            lastCaptureUrl = null;
        }
        if (capturePanelEl) {
            const previewImg = capturePanelEl.querySelector('#tm-shot-preview');
            if (previewImg) {
                previewImg.removeAttribute('src');
                previewImg.style.display = 'none';
            }
            const resActions = capturePanelEl.querySelector('#tm-shot-result-actions');
            if (resActions) resActions.style.display = 'none';
            const statusEl = capturePanelEl.querySelector('#tm-shot-status');
            if (statusEl) statusEl.style.display = 'none';
            const copyBtn = capturePanelEl.querySelector('#tm-shot-copy');
            if (copyBtn) copyBtn.disabled = true;
            const dlBtn = capturePanelEl.querySelector('#tm-shot-download');
            if (dlBtn) dlBtn.disabled = true;
        }
        const toast = document.getElementById('tm-toast');
        if (toast) {
            clearTimeout(toast._timer);
            toast.classList.remove('show');
        }
        for (const sel of ['#tm-danmu-ball', '#tm-danmu-panel', '#tm-shot-panel', '#tm-danmu-actions', '#tm-danmu-highlight-box']) {
            document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
        }
        document.getElementById('tm-shot-fab')?.remove();
        document.querySelectorAll('.tm-ctrl-slot').forEach((el) => el.remove());
        document.getElementById('tm-plugin-styles')?.remove();
        document.getElementById('tm-danmu-styles')?.remove();
    }

    let lastRoomActive = false;
    function syncRoom() {
        const active = isTargetRoom();
        if (!active) {
            if (lastRoomActive) deactivateOnRoomExit();
            else stopLifecycleTimer();
            lastRoomActive = false;
            return;
        }
        ensureGlobalStyles();
        if (!dirHandleLoaded) {
            dirHandleLoaded = true;
            loadSavedDirectoryHandle().then(() => {
                refreshShotConfigDisplays();
            });
        }
        if (!lastRoomActive) {
            lastRoomActive = true;
            lastWatchTickMs = Date.now();
            if (fanState.autoRefresh) startFanRefreshTimer();
            installMainWorldTransferHook();
            installMainWorldLotterySniffer();
            resetQualityAttemptState();
            if (panelEl) panelEl.style.display = 'none';
            if (capturePanelEl) capturePanelEl.style.display = 'none';
        }
        if (document.hidden) {
            stopLifecycleTimer();
            return;
        }
        startLifecycleTimer();
        tickFanWatchTime();
        if (fanState.autoRefresh && (!nextFanRefreshAtMs || Date.now() >= nextFanRefreshAtMs)) {
            refreshFanStatus({ manual: false });
        } else if (panelEl && panelEl.style.display === 'flex') {
            renderFanBar();
        }
        applyCleanModeClasses();
        syncPluginDynamicStyles();
        mountIconButtons();
        hookDanmuMessageStore();
        observeNativeDomFallback();
        observeChatroomMessages();
        scanLotteryFromDom();
        syncQualityPreference();
    }

    let bootstrapObserver = null;
    let bootstrapTimer = 0;
    function stopBootstrapWatchers() {
        document.removeEventListener('DOMContentLoaded', init);
        document.removeEventListener('readystatechange', init);
        window.removeEventListener('load', init);
        if (bootstrapObserver) {
            try { bootstrapObserver.disconnect(); } catch (_) {}
            bootstrapObserver = null;
        }
        if (bootstrapTimer) {
            clearTimeout(bootstrapTimer);
            bootstrapTimer = 0;
        }
    }

    function onVisibilityChange() {
        if (!isTargetRoom()) return;
        if (document.hidden) {
            lastWatchTickMs = 0;
            saveFanState(true);
            stopLifecycleTimer();
            unlockPausedBarrage();
            releaseDomBarrage();
        } else {
            lastWatchTickMs = Date.now();
            syncRoom();
        }
    }

    function onPageShow() {
        roomSuspended = false;
        window[INSTANCE_KEY] = true;
        syncRoom();
    }

    function onPageHide(e) {
        roomSuspended = true;
        stopLifecycleTimer();
        if (lastRoomActive) deactivateOnRoomExit();
        lastRoomActive = false;
        if (!e?.persisted) {
            try { (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window).__tmSpaWatcherV2?.restore(); } catch (_) {}
            window.removeEventListener('tm-locationchange', syncRoom);
            window.removeEventListener('popstate', syncRoom);
            window.removeEventListener('hashchange', syncRoom);
            window.removeEventListener('resize', onWindowResize);
            window.removeEventListener('scroll', onWindowScroll);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('pagehide', onPageHide);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('keydown', onDocumentKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            if (avatarObjectUrl) {
                URL.revokeObjectURL(avatarObjectUrl);
                avatarObjectUrl = '';
                cachedAvatarUrl = '';
            }
            delete window[INSTANCE_KEY];
        }
    }

    function init() {
        if (initialized || !document.body) return false;
        initialized = true;
        stopBootstrapWatchers();
        installSpaRouteWatcher();
        syncRoom();
        window.addEventListener('tm-locationchange', syncRoom);
        window.addEventListener('popstate', syncRoom);
        window.addEventListener('hashchange', syncRoom);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('pagehide', onPageHide);
        return true;
    }

    function scheduleInit() {
        if (init()) return;
        document.addEventListener('DOMContentLoaded', init);
        document.addEventListener('readystatechange', init);
        window.addEventListener('load', init);
        if (typeof MutationObserver === 'function' && document.documentElement) {
            bootstrapObserver = new MutationObserver(() => {
                if (document.body) init();
            });
            bootstrapObserver.observe(document.documentElement, { childList: true });
        }
        const retryWait = () => {
            if (initialized) return;
            if (init()) return;
            bootstrapTimer = setTimeout(retryWait, 60);
        };
        bootstrapTimer = setTimeout(retryWait, 60);
    }

    scheduleInit();

});
