/* ============================================================
   J·LIFT 手机端 · 单一状态源 (Store)
   架构：所有页面数据从一个 Store 读取；mutation 后 notify() 触发重渲染。
   设计令牌见 style.css；本文件不含任何颜色字面量。
   计算类逻辑均带 PRD 出处 / TODO 注释（自检 R5）。
   ============================================================ */
'use strict';

/* ---------- 工具 ---------- */
function nowHm() {
  const d = new Date();
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

/* ---------- 身体指标时间序列（PRD §9.3：各指标独立历史，趋势图随 Tab 切换） ----------
   来源：体重/体脂率/静息心率 = 华为同步；腰围/脐围/臀围/臂围/大腿围 = 纯手动录入（R9.1）。
   数据为 mock 示例，但结构真实（含日期、来源），符合“原型可含示例数值、来源须标注”原则。 */
function seedMetrics() {
  return {
    weight: [
      { date: '2026-06-20', value: 74.1, source: 'huawei' },
      { date: '2026-06-27', value: 73.6, source: 'huawei' },
      { date: '2026-07-04', value: 73.0, source: 'manual' },
      { date: '2026-07-10', value: 72.8, source: 'huawei' },
      { date: '2026-07-14', value: 72.6, source: 'manual' },
      { date: '2026-07-16', value: 72.5, source: 'huawei' },
      { date: '2026-07-18', value: 72.5, source: 'manual' }
    ],
    bodyFat: [
      { date: '2026-06-20', value: 22.8, source: 'huawei' },
      { date: '2026-07-04', value: 22.1, source: 'huawei' },
      { date: '2026-07-16', value: 21.4, source: 'huawei' }
    ],
    waist: [
      { date: '2026-06-20', value: 84, source: 'manual' },
      { date: '2026-07-04', value: 83, source: 'manual' },
      { date: '2026-07-14', value: 82, source: 'manual' },
      { date: '2026-07-18', value: 82, source: 'manual' }
    ],
    navel: [
      { date: '2026-06-20', value: 86, source: 'manual' },
      { date: '2026-07-14', value: 85, source: 'manual' },
      { date: '2026-07-18', value: 85, source: 'manual' }
    ],
    hip: [
      { date: '2026-06-20', value: 98, source: 'manual' },
      { date: '2026-07-14', value: 97, source: 'manual' },
      { date: '2026-07-18', value: 97, source: 'manual' }
    ],
    arm: [
      { date: '2026-06-20', value: 34.0, source: 'manual' },
      { date: '2026-07-14', value: 34.5, source: 'manual' },
      { date: '2026-07-18', value: 34.5, source: 'manual' }
    ],
    thigh: [
      { date: '2026-06-20', value: 56.0, source: 'manual' },
      { date: '2026-07-14', value: 55.5, source: 'manual' },
      { date: '2026-07-18', value: 55.5, source: 'manual' }
    ]
  };
}

/* ---------- Karvonen 心率区间（PRD §8.2 / §7.4.2 色块定义） ---------- */
const HR_ZONES = [
  { name: '热身', color: 'var(--zone-warm)', lo: 0.50, hi: 0.60 },
  { name: '燃脂', color: 'var(--zone-fat)', lo: 0.60, hi: 0.70 },
  { name: '有氧', color: 'var(--zone-aero)', lo: 0.70, hi: 0.80 },
  { name: '无氧', color: 'var(--zone-anaero)', lo: 0.80, hi: 0.90 },
  { name: '极限', color: 'var(--zone-max)', lo: 0.90, hi: 1.00 }
];
// 给定当前 bpm，返回所在区间（含索引、占比）
function hrZoneInfo(bpm) {
  const maxHr = 220 - (state.profile.age || 30);
  const rest = state.profile.restingHr || 60;
  const reserve = Math.max(1, maxHr - rest);
  const frac = (bpm - rest) / reserve;
  let idx = 0;
  if (frac <= HR_ZONES[0].lo) idx = 0;
  else if (frac >= HR_ZONES[4].lo) idx = 4;
  else { for (let i = 0; i < 5; i++) if (frac >= HR_ZONES[i].lo && frac < HR_ZONES[i].hi) { idx = i; break; } }
  return Object.assign({}, HR_ZONES[idx], { index: idx, frac: Math.max(0, Math.min(1, frac)) });
}

/* ---------- 身体指标读取（趋势图/最新卡共用） ---------- */
// PRD §9.3：按日聚合并取最新值；此处为原型 mock，真实公式/来源见 PRD。
function metricSeries(key) {
  const arr = (state.metrics[key] || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (key === 'bmi') {
    const w = metricSeries('weight');
    return w.map(p => ({ date: p.date, value: state.profile.height ? +(p.value / Math.pow(state.profile.height / 100, 2)).toFixed(1) : null, source: p.source }));
  }
  // 按日聚合：同日取最新（R9.2 / R9.8）
  const byDay = {};
  for (const p of arr) byDay[p.date] = p;
  return Object.keys(byDay).sort().map(d => byDay[d]);
}
function latestMetric(key) {
  const s = metricSeries(key);
  return s.length ? s[s.length - 1] : null;
}
// PRD §9.3：变化率为简化展示，真实趋势与去重逻辑见 PRD 说明。
function metricChange(key) {
  const s = metricSeries(key);
  if (s.length < 2) return null;
  const a = s[s.length - 2].value, b = s[s.length - 1].value;
  if (a == null || b == null) return null;
  return { delta: +(b - a).toFixed(1), pct: +(((b - a) / a) * 100).toFixed(1) };
}

/* ---------- 语音指令：模拟端侧 ASR+NLU（PRD §14，原型用预设语句驱动状态机） ---------- */
// 7 类意图：record / switch_action / switch_set / add_action / pause / resume / end
const VOICE_PRESETS = [
  { text: '卧推 10 次 60 公斤', intent: 'record', name: '卧推', reps: 10, weight: 60 },
  { text: '深蹲 12 次 80 公斤', intent: 'record', name: '深蹲', reps: 12, weight: 80 },
  { text: '切换到 硬拉', intent: 'switch_action', name: '硬拉' },
  { text: '下一个动作 引体', intent: 'switch_action', name: '引体' },
  { text: '下一组', intent: 'switch_set' },
  { text: '第 3 组', intent: 'switch_set', set: 3 },
  { text: '加一个动作 二头弯举', intent: 'add_action', name: '二头弯举' },
  { text: '暂停', intent: 'pause' },
  { text: '继续', intent: 'resume' },
  { text: '结束', intent: 'end' }
];
function parseVoiceIntent(text) {
  const t = (text || '').trim();
  for (const p of VOICE_PRESETS) if (p.text === t) return Object.assign({}, p);
  // 兜底：关键词 + 正则
  if (/结束/.test(t)) return { intent: 'end', text: t };
  if (/暂停/.test(t)) return { intent: 'pause', text: t };
  if (/继续/.test(t)) return { intent: 'resume', text: t };
  if (/切换|下一个动作|换.*动作/.test(t)) {
    const ex = state.exercises.find(e => t.includes(e.name));
    return { intent: 'switch_action', name: ex ? ex.name : (t.replace(/.*?([一-龥]{2,4})$/, '$1')) };
  }
  if (/下一组|第\s*(\d+)\s*组/.test(t)) {
    const m = t.match(/第\s*(\d+)\s*组/); return { intent: 'switch_set', set: m ? Number(m[1]) : null };
  }
  if (/加.*动作|新增动作|加一个/.test(t)) {
    const ex = state.exercises.find(e => t.includes(e.name));
    return { intent: 'add_action', name: ex ? ex.name : (t.replace(/.*?([一-龥]{2,4})/, '$1')) };
  }
  // 默认按 record 解析（动作名 + 次数 + 重量）
  const ex = state.exercises.find(e => t.includes(e.name));
  const reps = (t.match(/(\d+)\s*次/) || [])[1];
  const weight = (t.match(/(\d+)\s*(?:公斤|kg|KG)/) || [])[1];
  return { intent: 'record', name: ex ? ex.name : null, reps: reps ? Number(reps) : null, weight: weight ? Number(weight) : null };
}
function execVoiceIntent(parsed) {
  const L = state.live;
  let confirm = '';
  switch (parsed.intent) {
    case 'record': {
      const name = parsed.name || L.actions[L.current].name;
      if (parsed.name) setCurrentAction(name);
      if (parsed.reps) addSet(parsed.reps, parsed.weight || 0);
      confirm = '已录入：' + name + ' ' + (parsed.reps || '?') + ' 次' + (parsed.weight ? ' ' + parsed.weight + ' kg' : '');
      break;
    }
    case 'switch_action': setCurrentAction(parsed.name); confirm = '切换到 ' + parsed.name; break;
    case 'add_action': addAction(parsed.name); confirm = '新增动作 ' + parsed.name; break;
    case 'switch_set': L.currentSet = parsed.set ? parsed.set - 1 : (L.currentSet + 1); confirm = '第 ' + (L.currentSet + 1) + ' 组'; notify(); break;
    case 'pause': pauseLive(); confirm = '已暂停'; break;
    case 'resume': resumeLive(); confirm = '继续训练'; break;
    case 'end': endLive(); confirm = '正在汇总…'; break;
  }
  if (state.voice.broadcast && confirm) { state.voice.confirm = confirm; clearTimeout(execVoiceIntent._t); execVoiceIntent._t = setTimeout(() => { state.voice.confirm = ''; notify(); }, 1800); }
}
// 模拟一次识别：监听中 → 识别中(显示文本) → 执行 → 回到监听
function simulateVoice(text) {
  if (!state.live.active) return;
  state.voice.recognizing = true; state.voice.utterance = text; state.voice.listening = false; notify();
  clearTimeout(simulateVoice._t);
  simulateVoice._t = setTimeout(() => {
    const parsed = parseVoiceIntent(text);
    state.voice.recognizing = false;
    execVoiceIntent(parsed);
    state.voice.listening = state.voice.command; // 命令开则回到持续监听
    notify();
  }, 900);
}
function setCurrentAction(name) {
  const i = state.live.actions.findIndex(a => a.name === name);
  if (i >= 0) {
    state.live.current = i;
  } else {
    state.live.actions.push({ name: name, sets: [] });
    state.live.current = state.live.actions.length - 1;
  }
  state.live.currentSet = 0;
  notify();
}
function addAction(name) {
  const exists = state.live.actions.some(a => a.name === name);
  if (exists) { toast('动作已存在'); return; }
  state.live.actions.push({ name: name, sets: [] });
  state.live.current = state.live.actions.length - 1;
  state.live.currentSet = 0;
  notify();
}

/* ---------- 状态 ---------- */
const state = {
  route: 'home',                 // home | records | body | profile
  profile: {
    gender: '男',
    age: 30,
    weight: 72.5,                // kg
    height: 178,                 // cm（影响 BMI）
    restingHr: 62,               // 静息心率（影响 Karvonen 精度）
    bodyFat: 21.4,               // %（华为同步）
    waist: 82,                   // cm（手动录入）
    periodOn: false
  },
  huawei: {
    connected: false,
    auth: 'none',                // none | ok | expired
    lastSync: ''
  },
  hr: {
    status: 'connected',         // disconnected / connecting / connected / failed / timeout（默认已连接）
    deviceName: 'HR-Band X1',
    bpm: 128                     // 默认连接态下的实时心率基线
  },
  // 同步状态机：六个候选值均需在代码中可达（自检 R2）
  syncState: 'idle',             // idle / syncing / success / failure / offline / unauthorized
  voice: { broadcast: true, command: true, volume: 80, listening: false, recognizing: false, utterance: '', confirm: '' },
  metrics: seedMetrics(),
  body: { tab: 'weight', period: '30' },
  settings: { autoSync: true, periodOn: false },

  // 动作库（含自定义）
  exercises: [
    { id: 'ex-bench', name: '卧推', category: '胸', met: 6, custom: false },
    { id: 'ex-squat', name: '深蹲', category: '腿', met: 7, custom: false },
    { id: 'ex-pull', name: '引体', category: '背', met: 6, custom: false },
    { id: 'ex-row', name: '划船', category: '背', met: 5, custom: false }
  ],

  // 训练记录：覆盖四种来源组合（工作准则 §3.3）
  sessions: [
    {
      id: 'rec-001', dataSource: 'app', activityType: 'strength', basis: 'hr',
      name: '上肢力量 · 第 3 天', date: '2026-07-14T19:20:00', durationMin: 45,
      avgHr: 138, calories: 312, overlapKey: null,
      sets: [
        { reps: 10, weight: 60 }, { reps: 10, weight: 60 }, { reps: 8, weight: 65 }
      ]
    },
    {
      id: 'rec-002', dataSource: 'app', activityType: 'strength', basis: 'met',
      name: '下肢力量', date: '2026-07-12T08:10:00', durationMin: 38,
      avgHr: 120, calories: 268, overlapKey: null, metValue: 7,
      sets: [ { reps: 12, weight: 80 }, { reps: 12, weight: 80 } ]
    },
    {
      id: 'rec-003', dataSource: 'huawei', activityType: 'aerobic', basis: 'huawei',
      name: '华为跑步', hwRecordId: 'hw-run-7731', date: '2026-07-16T07:00:00',
      durationMin: 52, avgHr: 145, huaweiCalories: 540, calories: 540, overlapKey: 'ov-0716'
    },
    {
      id: 'rec-004', dataSource: 'huawei', activityType: 'strength', basis: 'huawei',
      name: '华为力量', hwRecordId: 'hw-str-5520', date: '2026-07-10T18:00:00',
      durationMin: 30, avgHr: 110, huaweiCalories: 180, calories: 180, overlapKey: null
    },
    {
      // 与 rec-003 同日重叠的 App 实时记录：用于演示当日去重（PRD §8.4）
      id: 'rec-005', dataSource: 'app', activityType: 'aerobic', basis: 'hr',
      name: '晨跑（App 实时）', date: '2026-07-16T07:05:00', durationMin: 48,
      avgHr: 142, calories: 0, overlapKey: 'ov-0716',
      sets: []
    }
  ],

  // 实时训练草稿：多动作结构（语音切换动作是一等公民，PRD §14）
  live: {
    active: false, actions: [{ name: '卧推', sets: [] }], current: 0, currentSet: 0,
    startTime: 0, avgHr: 0, paused: false, summary: null
  },

  detailId: null, detailFrom: 'records',
  ui: { sheet: null, countdown: false }
};

/* ---------- 渲染订阅 ---------- */
let renderFn = null;
function setRenderer(fn) { renderFn = fn; }
function notify() { if (renderFn) renderFn(); }

/* ============================================================
   计算类逻辑（均带 PRD 出处 / TODO）
   ============================================================ */

// TODO: 真实心率热量公式见 PRD §8.3（ACSM / Karvonen 法）；此处为占位估算
function calcSessionCalorie(session) {
  if (session.dataSource === 'huawei') return session.huaweiCalories; // 华为原始值直接采用
  if (session.basis === 'hr') {
    const mins = session.durationMin;
    const avgHr = session.avgHr;
    // 占位：每分钟估算 = (avgHr-60)*0.1 kcal（真实公式见 PRD §8.3）
    return Math.round(mins * (avgHr - 60) * 0.1);
  }
  if (session.basis === 'met') {
    const met = session.metValue || 6;
    const kg = state.profile.weight || 70;
    // 占位：kcal = MET * 3.5 * kg / 200 * mins（PRD §8.3 MET 法）
    return Math.round(met * 3.5 * kg / 200 * session.durationMin);
  }
  return session.calories || 0;
}

// PRD §8.4 当日重叠去重：同一训练若同时有 App 实时与华为记录，只计一次
function dailyCalorieDedup(sessions, dateStr) {
  const day = sessions.filter(s => s.date.slice(0, 10) === dateStr);
  const hwOverlaps = new Set(day.filter(s => s.dataSource === 'huawei' && s.overlapKey).map(s => s.overlapKey));
  let total = 0;
  for (const s of day) {
    if (s.dataSource === 'app' && s.overlapKey && hwOverlaps.has(s.overlapKey)) continue; // 去重：跳过与华为重叠的 App 记录
    total += calcSessionCalorie(s);
  }
  return total;
}

// PRD §8.4 周消耗：对近 7 日去重后聚合（依赖 dailyCalorieDedup）
function weeklyCalorie() {
  let total = 0;
  const base = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    total += dailyCalorieDedup(state.sessions, ds);
  }
  return total;
}

// 每周训练次数目标（演示常量；正式值应来自用户目标设置）
const WEEKLY_SESSION_GOAL = 4;

// 近 7 日训练次数（与 weeklyCalorie 同窗口口径，用于首页“本周已训练 N 次”）
function weeklySessionCount() {
  let n = 0;
  const base = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() - i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    n += state.sessions.filter(s => s.date.slice(0, 10) === ds).length;
  }
  return n;
}

// 距上次训练天数（首页提示文案用；无记录返回 null）
function daysSinceLastTraining() {
  if (!state.sessions.length) return null;
  const last = state.sessions.map(s => s.date.slice(0, 10)).sort().reverse()[0];
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}

// PRD §8.2 Karvonen 心率区间公式（占位实现，真实分区见 PRD）
function karvonenZones(profile) {
  const maxHr = 220 - (profile.age || 30);
  const restHr = profile.restingHr || 60;
  const reserve = maxHr - restHr;
  const zones = [];
  for (let i = 1; i <= 5; i++) {
    const lo = Math.round(restHr + reserve * (0.5 + (i - 1) * 0.1));
    const hi = Math.round(restHr + reserve * (0.6 + (i - 1) * 0.1));
    zones.push([lo, hi]);
  }
  return zones;
}

/* ============================================================
   权限 / 可见性：全部由数据字段实时计算（自检 R3 不得写死）
   ============================================================ */
function canDelete(record) { return record.dataSource === 'app'; }
function canAddStrength(record) {
  if (record.dataSource === 'huawei') return record.activityType === 'strength';
  return true; // app / 自由训练均可补录力量
}

/* ============================================================
   实时训练草稿：session + action + sets
   ============================================================ */
function startLive() {
  // 默认心率带已连接：进入训练即带实时心率基线（PRD §8.2 Karvonen 依赖真实 bpm）
  const seedHr = state.hr.status === 'connected' ? (state.hr.bpm || 128) : 0;
  state.live = { active: true, actions: [{ name: '卧推', sets: [] }], current: 0, currentSet: 0, startTime: Date.now(), avgHr: seedHr, paused: false, summary: null };
  state.voice.listening = state.voice.command; // 运动开始进入 VAD 持续监听（§14.4）
  notify();
}
function liveAction() { return state.live.actions[state.live.current]; }
function addSet(reps, weight) {
  const L = state.live;
  const t = L.startTime ? Math.floor((Date.now() - L.startTime) / 1000) : L.actions[L.current].sets.length * 120;
  const hr = state.hr.status === 'connected' ? (state.hr.bpm || L.avgHr) : L.avgHr;
  L.actions[L.current].sets.push({ reps: Number(reps) || 0, weight: Number(weight) || 0, t: t, hr: Math.round(hr) });
  notify();
}
function switchAction(name) { setCurrentAction(name); } // 触屏切换动作（语音路径见 execVoiceIntent）
function pauseLive() { state.live.paused = true; state.voice.listening = false; notify(); }
function resumeLive() { state.live.paused = false; state.voice.listening = state.voice.command; notify(); }
function endLive() {
  const mins = Math.max(1, Math.round((Date.now() - state.live.startTime) / 60000));
  const L = state.live;
  const flatSets = (L.actions || []).flatMap(a => (a.sets || []).map(s => Object.assign({}, s)));
  L.elapsed = mins;
  L.summary = {
    durationMin: mins,
    calories: calcSessionCalorie({ dataSource: 'app', basis: 'hr', durationMin: mins, avgHr: L.avgHr || 130 }),
    avgHr: L.avgHr || 130,
    actions: (L.actions || []).map(a => ({ name: a.name, sets: (a.sets || []).map(s => Object.assign({}, s)) })),
    sets: flatSets.slice()
  };
  L.active = false;
  state.voice.listening = false; state.voice.recognizing = false;
  notify();
}
function discardLive() {
  state.live = { active: false, actions: [{ name: '卧推', sets: [] }], current: 0, currentSet: 0, startTime: 0, avgHr: 0, paused: false, summary: null };
  state.voice.listening = false; state.voice.recognizing = false; state.voice.confirm = '';
  notify();
}

/* ============================================================
   保存 / 删除 / 新增：均真实改变状态并经 notify 重渲染
   ============================================================ */
function saveSession() {
  const s = state.live.summary;
  if (!s) return;
  const actions = (s.actions || []).map(a => ({ name: a.name, sets: (a.sets || []).map(x => Object.assign({}, x)) }));
  const firstName = actions.length ? actions[0].name : '力量训练';
  const rec = {
    id: 'rec-' + Date.now(), dataSource: 'app', activityType: 'strength', basis: 'hr',
    name: firstName + ' · 实时', date: new Date().toISOString().slice(0, 19),
    durationMin: s.durationMin, avgHr: s.avgHr, calories: s.calories, overlapKey: null,
    actions: actions,
    sets: (s.sets || []).map(x => Object.assign({}, x)),
    hrSeries: genHrSeries(s.avgHr, s.durationMin)
  };
  state.sessions.unshift(rec);
  discardLive();
  toast('训练已保存');
}
// 生成训练内心率曲线样本（mock，真实数据来自心率带采样，PRD §8.1）
function genHrSeries(avg, mins) {
  const n = Math.max(8, Math.min(48, mins));
  const arr = [];
  for (let i = 0; i < n; i++) {
    const t = Math.round(i / (n - 1) * mins * 60);
    const bpm = Math.round(avg + Math.sin(i / 3) * 7 + ((i * 13) % 7 - 3));
    arr.push({ t: t, bpm: bpm });
  }
  return arr;
}
function deleteSession(id) {
  const rec = state.sessions.find(s => s.id === id);
  if (rec && !canDelete(rec)) { toast('该记录不可删除'); return; }
  state.sessions = state.sessions.filter(s => s.id !== id);
  if (state.route === 'detail' && state.detailId === id) {
    state.route = state.detailFrom || 'records';
    state.detailId = null;
    state.detailFrom = null;
  }
  notify();
  toast('已删除');
}

// 新增自定义动作：重名校验（自检 R6）
function addCustomExercise(name, category, met) {
  if (state.exercises.some(e => e.name === name)) { toast('动作已存在'); return null; }
  const ex = { id: 'ex-' + Date.now(), name: name, category: category || '其他', met: met || 6, custom: true };
  state.exercises.push(ex);
  notify();
  toast('已添加动作');
  return ex;
}

// 身体指标保存：单字段（个人参数类，如 height/age 走 profile）
function saveBodyMetric(field, value) {
  // 演示简化：原型中直接写入 profile，正式开发需补确认弹窗。
  state.profile[field] = value;
  notify();
  toast('已保存');
}
// 身体指标手动录入：一次表单写入多个指标到各自历史（PRD §9.3.3，至少一项；上次值预填由 UI 提供）
function saveBodyEntry(values) {
  const date = (values.measureDate || todayStr()).slice(0, 10);
  for (const k of ['weight', 'bodyFat', 'waist', 'navel', 'hip', 'arm', 'thigh']) {
    if (values[k] === '' || values[k] == null) continue;
    const v = Number(values[k]);
    if (isNaN(v)) continue;
    const arr = state.metrics[k] || (state.metrics[k] = []);
    const existing = arr.find(p => p.date === date);
    if (existing) existing.value = v; else arr.push({ date: date, value: v, source: 'manual' });
  }
  if (values.weight !== '' && values.weight != null && !isNaN(Number(values.weight))) {
    // 演示简化：原型中同步更新 profile.weight，正式开发需补确认流。
    state.profile.weight = Number(values.weight);
  }
  notify();
  toast('已保存身体指标');
}
// 初始化：为已有 mock 记录补全 actions（时间轴动作）与 hrSeries（心率曲线）
function enrichSessions() {
  for (const s of state.sessions) {
    if (!s.actions) {
      s.actions = (s.sets && s.sets.length)
        ? [{ name: s.name, sets: s.sets.map((x, i) => Object.assign({}, x, { t: (i + 1) * 110, hr: s.avgHr ? s.avgHr - 5 + (i % 3) * 5 : null })) }]
        : [];
    }
    if (!s.hrSeries) s.hrSeries = genHrSeries(s.avgHr || 120, s.durationMin || 30);
  }
}
enrichSessions();

/* ============================================================
   同步状态机：六个候选值均通过以下函数可达（自检 R2）
   ============================================================ */
function syncStart() { state.syncState = 'syncing'; state.huawei.lastSync = nowHm(); notify(); toast('同步中…'); }
function syncSuccess() { state.syncState = 'success'; state.huawei.connected = true; state.huawei.auth = 'ok'; state.huawei.lastSync = nowHm(); notify(); toast('已同步华为健康'); }
function syncFailure() { state.syncState = 'failure'; notify(); }
function syncOffline() { state.syncState = 'offline'; notify(); }
function syncUnauthorized() { state.syncState = 'unauthorized'; state.huawei.auth = 'expired'; notify(); }
function syncIdle() { state.syncState = 'idle'; notify(); }

/* ============================================================
   心率带状态机：五个候选值均可达（审计 P0-03 / P1-03 / P1-04）
   ============================================================ */
function hrConnect() { state.hr.status = 'connecting'; state.hr.deviceName = 'HR-Band X1'; notify(); }
function hrConnected() { state.hr.status = 'connected'; state.hr.bpm = 128; notify(); }
function hrFailed() { state.hr.status = 'failed'; notify(); }
function hrTimeout() { state.hr.status = 'timeout'; notify(); }
function hrDisconnectUser() { state.hr.status = 'disconnected'; state.hr.deviceName = ''; state.hr.bpm = null; notify(); } // 用户主动断开：停重连

/* ============================================================
   设置开关：接入共享状态（审计 P1-12）
   ============================================================ */
function toggleVoice(kind) {
  if (kind === 'broadcast') state.voice.broadcast = !state.voice.broadcast;
  else state.voice.command = !state.voice.command;
  notify();
}
function togglePeriod() {
  // demo简化：跳过生理期同步的确认弹窗（个人项目，由用户主动切换，PRD §9 个人版最简配置）
  state.settings.periodOn = !state.settings.periodOn; state.profile.periodOn = state.settings.periodOn; notify();
}
function toggleAutoSync() { state.settings.autoSync = !state.settings.autoSync; notify(); }

/* 轻量反馈 toast（非核心写入的唯一信号；核心动作均先 mutate 再 toast） */
function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 1600);
}
