/* ============================================================
   J·LIFT 手机端 · 视图与交互 (components.js)
   所有图标为统一线性 SVG（禁用 emoji / 彩色图标，视觉约束 §4/§8）。
   核心动作均调用 store 的 mutation 并 notify，不依赖 toast 作唯一完成信号。
   ============================================================ */
'use strict';

/* ---------- 线性 SVG 图标库（24x24, stroke=currentColor） ---------- */
const ICON = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  records: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  data: '<path d="M4 18V12M9.3 18V7M14.7 18v-4M20 18V4"/>',
  profile: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21c.9-4 3.4-6 7.5-6s6.6 2 7.5 6"/>',
  play: '<path d="M8 5 L19 12 L8 19 Z"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  dumbbell: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  heart: '<path d="M12 20.5C12 20.5 4 14.5 4 8.8A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 1.8c0 5.7-8 11.7-8 11.7Z"/>',
  trend: '<path d="M4 18l5-7 4 4 7-9"/><path d="M16 6h4v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-3.5-3.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  check: '<path d="M5 12l5 5L20 6"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
  bluetooth: '<path d="M7 7l10 10-5 0 5 5-10-10 5 0-5-5"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14-4M4 13a8 8 0 0 0 14 4M18 4v3h-3M6 20v-3h3"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16Z"/><path d="M14 6l4 4"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  battery: '<rect x="3" y="8" width="16" height="8" rx="2"/><path d="M21 11v2"/><path d="M6 10v4M9 10v4"/>',
  signal: '<path d="M4 18v-3M9 18v-7M14 18v-11M19 18v-5"/>',
  x: '<path d="M6 6l12 12M18 6l-12 12"/>',
  warn: '<path d="M12 4l9 16H3Z"/><path d="M12 10v5M12 17.5v.5"/>',
  flame: '<path d="M12 23c-3.5 0-6-2.5-6-5.5 0-2.5 1.5-4 3-5.5.5-.5 1-1 1-2 0-1.5-1-3-2-4.5C9 4 10.5 2 12 2c1.5 0 3 2 4 3.5-1 1.5-2 3-2 4.5 0 1 .5 1.5 1 2 1.5 1.5 3 3 3 5.5 0 3-2.5 5.5-6 5.5Z"/>'
};
function svg(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>';
}

/* ---------- 导航定义（纯图标，无文字） ---------- */
const NAV = [
  { key: 'home', icon: 'home' },
  { key: 'records', icon: 'records' },
  { key: 'body', icon: 'data' },
  { key: 'profile', icon: 'profile' }
];

/* ---------- 路由 ---------- */
function go(page) { state.route = page; notify(); }

/* ============================================================
   页面渲染
   ============================================================ */
function render() {
  const screen = document.getElementById('screen');
  let html = '';
  if (state.route === 'home') html = renderHome();
  else if (state.route === 'records') html = renderRecords();
  else if (state.route === 'body') html = renderBody();
  else if (state.route === 'profile') html = renderProfile();
  else if (state.route === 'detail') html = renderDetail();
  screen.innerHTML = html;
  renderNav();
  bindPage();
  syncOverlays();

  // 同步右侧「演示控制」面板的状态读数（演示辅助，不进入产品实现）
  const rp = document.getElementById('rp-state-text');
  const rpLabel = document.getElementById('rp-hr-label');
  if (rp) {
    const hrStatus = state.hr.status === 'connected' ? '已连接' : '未连接';
    rp.textContent = hrStatus + (state.hr.status === 'connected' ? '（' + state.hr.deviceName + '）' : '');
  }
  if (rpLabel) {
    rpLabel.textContent = state.hr.status === 'connected' ? '已连接' : '未连接';
  }
}

function renderNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = '<div class="nav-logo">J</div>' +
    NAV.map(n =>
      '<button class="nav-btn ' + (state.route === n.key ? 'on' : '') + '" data-nav="' + n.key + '" aria-label="' + navLabel(n.key) + '">' + svg(n.icon) + '</button>'
    ).join('') +
    '<div class="nav-spacer"></div>';
  nav.querySelectorAll('.nav-btn').forEach(b => {
    b.addEventListener('click', () => go(b.dataset.nav));
  });
}
function navLabel(k) { return { home: '首页', records: '训练记录', body: '数据', profile: '我的' }[k]; }

/* ---------- 通用工具 ---------- */
function fmtDur(min) { min = Math.round(min || 0); const h = Math.floor(min / 60), m = min % 60; return h > 0 ? String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') : (m + ' 分'); }
function fmtClock(sec) { sec = Math.round(sec || 0); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); }
function weekdayOf(d) { const w = ['日', '一', '二', '三', '四', '五', '六'][new Date(d + 'T00:00:00').getDay()]; return '周' + w; }
function addMin(iso, min) { const t = new Date(iso); t.setMinutes(t.getMinutes() + min); return t.toTimeString().slice(0, 5); }
function actTypeLabel(t) { return { aerobic: '有氧', strength: '力量', mixed: '混合' }[t] || t; }
function firstName(rec) { return (rec.actions && rec.actions.length) ? rec.actions[0].name : rec.name; }
function hrColor(bpm) { return bpm ? hrZoneInfo(bpm).color : 'var(--text-tertiary)'; }

/* ---------- 身体指标页（PRD §9.3） ---------- */
const BODY_TABS = [['weight', '体重'], ['bodyFat', '体脂率'], ['waist', '腰围'], ['navel', '脐围'], ['hip', '臀围'], ['arm', '臂围'], ['thigh', '大腿围'], ['bmi', 'BMI']];
const BODY_UNIT = { weight: 'kg', bodyFat: '%', waist: 'cm', navel: 'cm', hip: 'cm', arm: 'cm', thigh: 'cm', bmi: '' };
function tabLabel(k) { const m = BODY_TABS.find(t => t[0] === k); return m ? m[1] : k; }
function aggregatePeriod(series, period) {
  if (!series.length) return [];
  if (period === 'all') { const byM = {}; for (const p of series) { const m = p.date.slice(0, 7); (byM[m] = byM[m] || []).push(p); } return Object.keys(byM).sort().map(m => byM[m][byM[m].length - 1]); }
  if (period === '90') { const byW = {}; for (const p of series) { const dt = new Date(p.date + 'T00:00:00'); const wk = Math.floor((dt - new Date(dt.getFullYear() + '-01-01')) / (7 * 864e5)); (byW[wk] = byW[wk] || []).push(p); } return Object.keys(byW).sort().map(w => byW[w][byW[w].length - 1]); }
  return series; // 7 / 30 每日
}
function trendTicks(n) {
  if (n <= 1) return [];
  const max = 6, step = n <= max ? 1 : Math.ceil((n - 1) / (max - 1));
  const idx = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
  return idx;
}
function trendDateLabel(d) {
  return d.length >= 10 ? d.slice(5).replace('-', '/') : d.slice(2).replace('-', '/');
}
function buildTrend(pts, unit) {
  if (!pts.length) return '<div class="trend empty-mini">暂无数据，点击 + 录入</div>';
  const vals = pts.map(p => p.value).filter(v => v != null);
  const min = Math.min(...vals), max = Math.max(...vals), span = Math.max(1, max - min);
  const W = 300, H = 120, pad = 14;
  const x = i => pad + (pts.length === 1 ? W / 2 : (i / (pts.length - 1)) * (W - 2 * pad));
  const y = v => H - pad - ((v - min) / span) * (H - 2 * pad);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1)).join(' ');
  const dots = pts.map((p, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3" fill="var(--accent)"/>').join('');
  const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  const ticks = trendTicks(pts.length).map(i => {
    const left = (x(i) / W * 100).toFixed(1);
    const al = i === 0 ? 'translateX(0)' : (i === pts.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)');
    return '<span class="ax-lbl" style="left:' + left + '%;transform:' + al + '">' + trendDateLabel(pts[i].date) + '</span>';
  }).join('');
  return '<div class="trend"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="t-svg">' +
    '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' + dots +
    '</svg><div class="t-axis">' + ticks + '</div><div class="t-cap"><span>' + min + '–' + max + unit + ' · 均 ' + avg + unit + '</span><span>' + pts.length + ' 个数据点</span></div></div>';
}

/* ---------- 训练详情页（PRD §4.2.3：按心率和时间匹配动作） ---------- */
function hrZoneDist(rec) {
  if (!rec.hrSeries || rec.hrSeries.length < 2) return '';
  const counts = [0, 0, 0, 0, 0];
  for (let i = 1; i < rec.hrSeries.length; i++) { const zi = hrZoneInfo(rec.hrSeries[i].bpm).index; counts[zi] += (rec.hrSeries[i].t - rec.hrSeries[i - 1].t); }
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return '<div class="zone-dist">' + HR_ZONES.map((z, i) => {
    const pct = Math.round(counts[i] / total * 100);
    return '<div class="zd-row"><span class="zd-dot" style="background:' + z.color + '"></span><span class="zd-name">' + z.name + '</span><span class="zd-bar"><i style="width:' + pct + '%"></i></span><span class="zd-pct">' + pct + '%</span></div>';
  }).join('') + '</div>';
}
function hrTicks(n) {
  if (n <= 1) return [];
  const max = 5, step = n <= max ? 1 : Math.ceil((n - 1) / (max - 1));
  const idx = [];
  for (let i = 0; i < n; i += step) idx.push(i);
  if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
  return idx;
}
function buildHrCurve(series) {
  const W = 300, H = 110, pad = 10, max = Math.max(180, ...series.map(p => p.bpm));
  const x = i => pad + (series.length === 1 ? W / 2 : (i / (series.length - 1)) * (W - 2 * pad));
  const y = v => H - pad - (v / max) * (H - 2 * pad);
  const path = series.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.bpm).toFixed(1)).join(' ');
  const ticks = hrTicks(series.length).map(i => {
    const left = (x(i) / W * 100).toFixed(1);
    const al = i === 0 ? 'translateX(0)' : (i === series.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)');
    return '<span class="ax-lbl" style="left:' + left + '%;transform:' + al + '">' + fmtClock(series[i].t) + '</span>';
  }).join('');
  return '<div class="hr-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="hr-svg"><path d="' + path + '" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linejoin="round"/><circle cx="' + x(series.length - 1).toFixed(1) + '" cy="' + y(series[series.length - 1].bpm).toFixed(1) + '" r="3" fill="var(--danger)"/></svg><div class="hr-axis">' + ticks + '</div></div>';
}

/* ---------- 首页（设计源：ai-gym-home-redesign.html，应用视觉约束） ---------- */
function todayLabel() {
  const d = new Date();
  const wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()];
  return wd + '，' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
}

function renderHome() {
  const weekly = weeklyCalorie();
  const last = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date))[0];
  const lastDate = last ? last.date.slice(5, 10).replace('-', ' 月 ') + ' 日' : '';
  const wkCount = weeklySessionCount();
  return `
    <div class="home">
      <div class="home-left">
        <div class="topline">
          <div class="brand">J·LIFT</div>
        </div>
        <div class="date">${todayLabel()}</div>
        <h1 class="h-hero">该动一动了<br><em>现在开始</em></h1>
        <p class="hint">${daysSinceLastTraining() === null ? '还没有训练记录' : '距离上次训练，已经 ' + daysSinceLastTraining() + ' 天'}</p>

        <div class="section-head week-head"><b>本周概要</b></div>
        <section class="week" aria-label="本周概要">
          <div class="week-col">
            <span class="week-cap">消耗热量</span>
            <span class="week-val">${weekly} <small>kcal</small></span>
          </div>
          <div class="week-col">
            <span class="week-cap">锻炼次数</span>
            <span class="week-val">${wkCount} <small>次</small></span>
          </div>
        </section>

        <div class="section-head"><b>最近运动</b><button class="link-btn" data-nav="records">查看记录 →</button></div>
        ${last ? `
        <article class="card" data-open="${last.id}" aria-label="查看最近训练详情">
          <div class="card-icon">${svg('dumbbell')}</div>
          <div class="card-info"><b>${lastDate}</b><span>${last.durationMin} 分钟 · ${last.calories} kcal</span></div>
          <div class="card-right">${svg('chevron')}</div>
        </article>` : `
        <article class="card">
          <div class="card-icon">${svg('dumbbell')}</div>
          <div class="card-info"><b>还没有训练记录</b><span>开始第一次训练，记录你的动作与心率</span></div>
        </article>`}
      </div>
      <div class="home-orbit">
        <section class="start-orbit" aria-label="开始训练">
          <div class="ring one"></div><div class="ring two"></div><div class="ring three"></div>
          <button class="start-core" data-act="start" aria-label="开练">
            <span class="play">${svg('play')}</span><b>开练</b><span>自由训练</span>
          </button>
        </section>
      </div>
    </div>
  `;
}

/* ---------- 训练记录 ---------- */
const REC_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'aerobic', label: '有氧' },
  { key: 'strength', label: '力量' },
  { key: 'mixed', label: '混合' }
];
let recFilter = 'all';
let recQuery = '';
function renderRecords() {
  let list = state.sessions.slice();
  if (recFilter !== 'all') list = list.filter(s => s.activityType === recFilter);
  list.sort((a, b) => b.date.localeCompare(a.date)); // 按日期倒序（§4.2.2 展示规则）

  const groups = {};
  for (const s of list) { const d = s.date.slice(0, 10); (groups[d] = groups[d] || []).push(s); }
  const keys = Object.keys(groups).sort().reverse();

  const chips = REC_FILTERS.map(f => '<button class="chip ' + (recFilter === f.key ? 'on' : '') + '" data-filter="' + f.key + '">' + f.label + '</button>').join('');

  let body;
  if (keys.length === 0) {
    body = '<div class="empty"><div class="em">暂无训练记录</div><div>开始第一次训练，记录你的动作与心率</div><button class="btn-ghost" data-act="start">去开练</button></div>';
  } else {
    body = keys.map(d => {
      const items = groups[d];
      const totalMin = items.reduce((a, s) => a + (s.durationMin || 0), 0);
      const totalCal = items.reduce((a, s) => a + (s.calories || 0), 0);
      const sum = items.length + ' 次 · ' + fmtDur(totalMin) + ' · ' + totalCal + ' kcal';
      const dd = d.slice(5).replace('-', '/');
      const cards = items.map(s => {
        const badge = s.dataSource === 'huawei' ? '<span class="badge hw">华为</span>' : '';
        const actName = (s.actions && s.actions.length) ? (s.actions.length > 1 ? s.actions[0].name + ' 等 ' + s.actions.length + ' 项' : s.actions[0].name) : s.name;
        return `<article class="card" data-open="${s.id}" aria-label="查看 ${actName} 训练详情">
          <div class="card-icon">${svg('dumbbell')}</div>
          <div class="card-info"><b>${actName} ${badge}</b><span>${dd} · ${s.durationMin} 分钟 · ${s.calories} kcal · 心率 ${s.avgHr}</span></div>
          ${canDelete(s) ? '<button class="card-right del-btn" data-del="' + s.id + '" aria-label="删除">' + svg('trash') + '</button>' : '<div class="card-right"></div>'}
        </article>`;
      }).join('');
      return '<div class="rec-group"><div class="rec-group-head"><span>' + dd + ' ' + weekdayOf(d) + '</span><span class="rec-group-sum">' + sum + '</span></div>' + cards + '</div>';
    }).join('');
  }

  // 搜索框按用户要求移除（与 PIA §4.2.2 的 P1 搜索框冲突，已标注待确认）；时间分组 + 类型筛选为主视图
  return `
    <div class="topline"><div class="brand">训练记录</div></div>
    <div class="chips">${chips}</div>
    ${body}`;
}

/* ---------- 身体数据 ---------- */
function renderBody() {
  const tab = state.body.tab, period = state.body.period;
  const grey = (k) => (k === 'bodyFat' && metricSeries('bodyFat').length === 0) || (k === 'bmi' && !state.profile.height);
  const series = aggregatePeriod(metricSeries(tab), period);
  const latest = latestMetric(tab);
  const chg = metricChange(tab);
  const unit = BODY_UNIT[tab];
  const tabsHtml = BODY_TABS.map(t => '<button class="mtab ' + (tab === t[0] ? 'on' : '') + (grey(t[0]) ? ' grey' : '') + '" data-mtab="' + t[0] + '"' + (grey(t[0]) ? ' disabled' : '') + '>' + t[1] + '</button>').join('');
  const periods = [['7', '7 天'], ['30', '30 天'], ['90', '90 天'], ['all', '全部']];
  const periodHtml = periods.map(p => '<button class="chip ' + (period === p[0] ? 'on' : '') + '" data-period="' + p[0] + '">' + p[1] + '</button>').join('');
  const latestHtml = latest
    ? '<div class="metric-latest"><div class="ml-val">' + latest.value + (unit ? '<small>' + unit + '</small>' : '') + '</div>' +
      '<div class="ml-chg ' + (chg && chg.delta < 0 ? 'down' : 'up') + '">' + (chg ? (chg.delta > 0 ? '↑ ' : '↓ ') + Math.abs(chg.delta) + unit + '（' + chg.pct + '%）' : '—') + '</div>' +
      '<div class="ml-src">' + (latest.source === 'huawei' ? '华为同步' : '手动录入') + '</div></div>'
    : '<div class="metric-latest empty-mini">暂无数据，点击 + 录入</div>';
  const isCirc = ['waist', 'navel', 'hip', 'arm', 'thigh'].includes(tab);
  return `
    <div class="topline"><div class="brand">身体数据</div></div>
    <div class="metric-tabs">${tabsHtml}</div>
    <div class="period-bar">${periodHtml}</div>
    ${buildTrend(series, unit)}
    ${latestHtml}
    ${isCirc ? '<div class="section-head"><b>' + tabLabel(tab) + ' · 历史记录</b><button class="link-btn" data-act="body-history">查看</button></div>' : ''}
    <button class="fab" data-act="body-add" aria-label="录入身体数据">${svg('plus')}</button>`;
}

/* ---------- 我的 / 设置 ---------- */
function renderProfile() {
  const hw = state.huawei;
  const hr = state.hr;
  const p = state.profile;
  const syncLabel = { idle: '未同步', syncing: '同步中', success: '已同步', failure: '同步失败', offline: '离线', unauthorized: '授权过期' }[state.syncState];
  const syncClass = state.syncState === 'failure' || state.syncState === 'offline' || state.syncState === 'unauthorized' ? 'warn' : 'ok';
  const hrLabel = { disconnected: '未连接', connecting: '连接中', connected: '已连接', failed: '连接失败', timeout: '连接超时' }[hr.status];

  return `
    <div class="topline"><div class="brand">我的</div></div>

    <div class="group">
      <p class="group-title">华为健康</p>
      <div class="card-list">
        <div class="row-item" data-act="hw-sync">
          <div class="ri-icon">${svg('sync')}</div>
          <div class="ri-main"><b>${hw.connected ? '已连接' : (hw.auth === 'expired' ? '授权已过期' : '未连接')}</b><span>${hw.lastSync ? '最后同步 ' + hw.lastSync : '点击发起同步'}</span></div>
          <span class="state-pill ${syncClass}">${syncLabel}</span>
        </div>
      </div>
    </div>

    <div class="group">
      <p class="group-title">个人参数</p>
      <div class="card-list">
        <div class="row-item" data-act="edit-profile">
          <div class="ri-icon">${svg('profile')}</div>
          <div class="ri-main"><b>年龄 / 性别 / 体重</b><span>${p.age} 岁 · ${p.gender} · ${p.weight} kg${p.height ? ' · ' + p.height + ' cm' : ''}</span></div>
          <div class="ri-side">${svg('chevron')}</div>
        </div>
      </div>
    </div>

    <div class="group">
      <p class="group-title">训练设备</p>
      <div class="card-list">
        <div class="row-item" data-act="hr-toggle">
          <div class="ri-icon">${svg('bluetooth')}</div>
          <div class="ri-main"><b>心率带 ${hr.deviceName ? '· ' + hr.deviceName : ''}</b><span>${hrLabel}</span></div>
          <span class="state-pill ${hr.status === 'connected' ? 'ok' : ''}">${hr.status === 'connected' ? '断开' : '连接'}</span>
        </div>
      </div>
    </div>

    <div class="group">
      <p class="group-title">语音</p>
      <div class="card-list">
        <div class="row-item" data-act="voice-broadcast">
          <div class="ri-icon">${svg('volume')}</div>
          <div class="ri-main"><b>语音播报</b><span>录入后播报结果</span></div>
          <div class="toggle ${state.voice.broadcast ? 'on' : ''}"><i></i></div>
        </div>
        <div class="row-item" data-act="voice-command">
          <div class="ri-icon">${svg('mic')}</div>
          <div class="ri-main"><b>语音指令</b><span>卧推 10 次 60 公斤</span></div>
          <div class="toggle ${state.voice.command ? 'on' : ''}"><i></i></div>
        </div>
        <div class="row-item">
          <div class="ri-icon">${svg('volume')}</div>
          <div class="ri-main"><b>播报音量</b><span>语音播报音量</span></div>
          <input class="ri-range" type="range" min="0" max="100" value="${state.voice.volume}" data-vol aria-label="播报音量">
        </div>
      </div>
    </div>

    <div class="group">
      <p class="group-title">动作库</p>
      <div class="card-list">
        <div class="row-item" data-act="open-library">
          <div class="ri-icon">${svg('dumbbell')}</div>
          <div class="ri-main"><b>动作库</b><span>${state.exercises.length} 个动作 · 含自定义</span></div>
          <div class="ri-side">${svg('chevron')}</div>
        </div>
      </div>
    </div>

    <!-- 状态机演示已移至手机框外的「原型核对辅助」面板 -->`;

}

/* ============================================================
   训练详情页（PRD §4.2.3；训练记录卡 / 首页最近训练卡点击进入）
   ============================================================ */
function renderDetail() {
  const rec = state.sessions.find(s => s.id === state.detailId);
  if (!rec) { state.route = state.detailFrom || 'records'; notify(); return ''; }
  const d = rec.date.slice(0, 10).replace(/-/g, '/');
  const dt0 = rec.date.slice(11, 16), dt1 = addMin(rec.date, rec.durationMin);

  // 华为数据区（仅华为记录；§4.2.3）
  const huaweiBlock = rec.dataSource === 'huawei'
    ? '<div class="dt-section"><div class="dt-sec-title">华为数据</div>' +
      '<div class="kv"><span>运动类型</span><b>' + actTypeLabel(rec.activityType) + '</b></div>' +
      '<div class="kv"><span>起止时间</span><b>' + dt0 + '–' + dt1 + '</b></div>' +
      '<div class="kv"><span>平均心率</span><b>' + rec.avgHr + ' bpm</b></div>' +
      '<div class="dt-sec-sub">心率区间分布</div>' + hrZoneDist(rec) +
      '</div>'
    : '';

  // 力量训练区：按时间轴排列动作，每组带 elapsed 时间与当时心率（§4.2.3「按心率和时间匹配动作」）
  const actionsBlock = (rec.actions && rec.actions.length)
    ? '<div class="dt-section"><div class="dt-sec-title">动作 · 按时间</div>' +
      rec.actions.map(a => {
        const total = a.sets.length;
        const setsHtml = a.sets.map((s, i) => '<div class="tl-row">' +
          '<span class="tl-time">' + fmtClock(s.t) + '</span>' +
          '<span class="tl-dot" style="background:' + hrColor(s.hr) + '"></span>' +
          '<span class="tl-main">第 ' + (i + 1) + ' 组 · ' + s.reps + ' 次 · ' + s.weight + ' kg</span>' +
          '<span class="tl-hr">' + (s.hr ? s.hr + ' bpm' : '') + '</span>' +
          '</div>').join('');
        return '<div class="act-block"><div class="act-name">' + a.name + ' <small>' + total + ' 组</small></div>' + (setsHtml || '<div class="empty-mini">无组别</div>') + '</div>';
      }).join('') +
      '</div>'
    : '';

  // 心率详情区（有 hrSeries 时；§4.2.3）
  const hrBlock = (rec.hrSeries && rec.hrSeries.length)
    ? '<div class="dt-section"><div class="dt-sec-title">心率曲线</div>' + buildHrCurve(rec.hrSeries) +
      '<div class="kv"><span>平均 / 最大</span><b>' + rec.avgHr + ' / ' + Math.max.apply(null, rec.hrSeries.map(p => p.bpm)) + ' bpm</b></div>' +
      '<div class="dt-sec-sub">心率区间分布</div>' + hrZoneDist(rec) + '</div>'
    : '';

  const canDel = canDelete(rec);
  const totalReps = (rec.sets || []).reduce((sum, x) => sum + (Number(x.reps) || 0), 0);
  const totalVolume = (rec.sets || []).reduce((sum, x) => sum + ((Number(x.reps) || 0) * (Number(x.weight) || 0)), 0);
  const actionSummary = (rec.actions || []).map(a => {
    const total = a.sets.length;
    const reps = a.sets.reduce((sum, x) => sum + (Number(x.reps) || 0), 0);
    const volume = a.sets.reduce((sum, x) => sum + ((Number(x.reps) || 0) * (Number(x.weight) || 0)), 0);
    return `<div class="dt-mini"><span>${a.name}</span><b>${total} 组 · ${reps} 次 · ${volume} kg·次</b></div>`;
  }).join('');
  return `
    <div class="detail-top">
      <button class="icon-btn" data-act="detail-back" aria-label="返回">${svg('back')}</button>
      <div class="dt-title">训练详情</div>
    </div>
    <article class="detail-hero">
      <div class="card-icon">${svg('dumbbell')}</div>
      <div class="card-info"><b>${firstName(rec)}</b><span>${d} · ${rec.durationMin} 分钟 · ${rec.calories} kcal</span></div>
    </article>
    <div class="metric-grid">
      <div class="metric"><div class="m-label">时长</div><div class="m-value">${rec.durationMin}<small>分</small></div></div>
      <div class="metric"><div class="m-label">热量</div><div class="m-value">${rec.calories}<small>kcal</small></div></div>
      <div class="metric"><div class="m-label">平均心率</div><div class="m-value">${rec.avgHr}<small>bpm</small></div></div>
      <div class="metric"><div class="m-label">总训练量</div><div class="m-value">${totalVolume}<small>kg·次</small></div></div>
    </div>
    <div class="dt-section">
      <div class="dt-sec-title">训练亮点</div>
      <div class="dt-mini-row">
        <div class="dt-mini"><span>总组数</span><b>${(rec.sets || []).length}</b></div>
        <div class="dt-mini"><span>总次数</span><b>${totalReps}</b></div>
        <div class="dt-mini"><span>动作数</span><b>${(rec.actions || []).length}</b></div>
      </div>
      ${actionSummary ? '<div class="dt-mini-list">' + actionSummary + '</div>' : ''}
    </div>
    ${huaweiBlock}
    ${actionsBlock}
    ${hrBlock}
    ${canDel ? '<div class="live-foot"><button class="btn-danger" data-act="detail-del">删除记录</button></div>' : ''}
  `;
}

/* ============================================================
   覆盖层：实时训练 / 倒计时 / 汇总
   ============================================================ */
function syncOverlays() {
  const live = document.getElementById('live');
  const sum = document.getElementById('summary');
  live.classList.toggle('show', state.live.active || state.live.paused);
  if (state.live.active || state.live.paused) renderLiveOverlay();
  if (state.live.summary && !state.live.active) { sum.classList.add('show'); renderSummaryOverlay(); }
  else sum.classList.remove('show');
}

function renderLiveOverlay() {
  const L = state.live;
  const cur = liveAction();
  const setsHtml = cur.sets.map((s, i) =>
    `<div class="set-row"><span class="s-idx">${i + 1}</span><span class="s-main">${s.reps} 次 · ${s.weight} kg</span><button class="s-del" data-rmset="${i}" aria-label="删除组别">${svg('trash')}</button></div>`
  ).join('') || '<div class="empty">还没有组别，说“卧推 10 次 60 公斤”或点麦克风录入</div>';

  // 计时器按已用时间初始化，避免每次重渲染闪回 00:00
  const sec0 = L.startTime ? Math.floor((Date.now() - L.startTime) / 1000) : 0;
  const timerText = ('0' + Math.floor(sec0 / 60)).slice(-2) + ':' + ('0' + (sec0 % 60)).slice(-2);

  // 实时热量估算（与 calcSessionCalorie 一致公式：mins × (avgHr-60) × 0.1）
  const minsElapse = sec0 / 60;
  const calNow = state.hr.status === 'connected' ? Math.round(minsElapse * ((L.avgHr || 128) - 60) * 0.1) : 0;
  const hrOn = state.hr.status === 'connected';
  const hrVal = hrOn ? (state.hr.bpm || L.avgHr || 128) : '—';
  const hrDanger = hrOn && (state.hr.bpm || 0) > 160;
  const zone = hrOn ? hrZoneInfo(state.hr.bpm || L.avgHr) : null;

  document.getElementById('live').innerHTML = `
    <div class="live-top">
      <div class="live-title">实时训练</div>
      <div class="live-timer" id="live-timer">${timerText}</div>
      <div class="live-sub">${L.paused ? '已暂停 · 采集暂停' : '训练中'}</div>
      <div class="live-cal ${hrOn ? '' : 'off'}">${svg('flame')}<b id="live-cal-val">${calNow}</b><span class="cal-unit">kcal</span></div>
    </div>

    <div class="live-middle">
      <div class="voice-panel ${state.voice.listening ? 'listening' : ''} ${state.voice.recognizing ? 'recognizing' : ''} ${!state.voice.command ? 'off' : ''}">
        <button class="voice-close" data-act="voice-close" aria-label="关闭 / 开启监听">${svg('x')}</button>
        <div class="voice-bars"><i></i><i></i><i></i><i></i><i></i></div>
        <div class="voice-state">${state.voice.recognizing ? '识别中…『' + (state.voice.utterance || '') + '』' : (state.voice.command ? '监听中' : '语音已关闭')}</div>
        <button class="voice-mic" data-act="live-mic" aria-label="语音指令">${svg('mic')}</button>
      </div>
      ${state.voice.confirm ? '<div class="voice-confirm">' + svg('check') + '<span>' + state.voice.confirm + '</span></div>' : ''}

      <div class="live-hr ${hrOn ? '' : 'off'} ${hrDanger ? 'danger' : ''}">
        ${svg('heart')}<b id="live-hr-val">${hrVal}</b><span class="hr-unit">${hrOn ? 'bpm' : '未连接心率带'}</span>
      </div>
      <div class="hr-zone" ${zone ? '' : 'style="visibility:hidden"'}>
        <span class="hz-name" style="color:${zone ? zone.color : 'var(--text-tertiary)'}">${zone ? zone.name : '—'}</span>
        <span class="hz-bar"><i style="width:${zone ? Math.round(zone.frac * 100) : 0}%;background:${zone ? zone.color : 'transparent'}"></i></span>
      </div>

      <div class="action-card">
        <div class="action-head">
          <div class="action-meta">
            <div class="action-name">${cur.name}</div>
            <div class="action-sets">${cur.sets.length} 组 · ${cur.sets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0)} 次 · ${cur.sets.reduce((sum, s) => sum + ((Number(s.reps) || 0) * (Number(s.weight) || 0)), 0)} kg·次</div>
          </div>
          <button class="link-btn" data-act="live-switch">管理动作</button>
        </div>
        <div class="action-chips">
          ${L.actions.map((a, i) => `<button class="action-chip ${i === L.current ? 'on' : ''}" data-act="switch-action-chip" data-action-name="${a.name}">${a.name}${a.sets.length ? ' <small>' + a.sets.length + '组</small>' : ''}</button>`).join('')}
        </div>
      </div>
      <div class="sets" id="live-sets">${setsHtml}</div>
    </div>

    <div class="live-bottom">
      <div class="live-input">
        <input id="rep-in" type="number" inputmode="numeric" placeholder="次数">
        <input id="wt-in" type="number" inputmode="numeric" placeholder="重量 kg">
        <button class="btn-mint" data-act="add-set">录入</button>
      </div>
      <div class="live-foot">
        <button class="btn-ghost" data-act="live-pause">${L.paused ? '继续' : '暂停'}</button>
      </div>
      <div class="live-endhold">
        <div class="live-endstack">
          <button class="hold-btn" id="end-hold" data-act="end-live" aria-label="结束训练">
            <svg class="hold-ring" viewBox="0 0 80 80" aria-hidden="true">
              <circle class="hold-track" cx="40" cy="40" r="36"/>
              <circle class="hold-prog" cx="40" cy="40" r="36"/>
            </svg>
            <span class="hold-label"><strong>结束训练</strong><small>长按 0.8s</small></span>
          </button>
          <div class="live-endhint">长按确认后将进入汇总</div>
        </div>
      </div>
    </div>`;
  startLiveTimer();
  startHrSim();
  bindLive();
  bindEndHold();
}

/* 实时心率模拟：心率带已连接时，训练中持续小幅波动并更新累计均值与实时热量（默认流程有心率数据） */
function startHrSim() {
  clearInterval(startHrSim._t);
  if (state.hr.status !== 'connected') return;
  startHrSim._t = setInterval(() => {
    if (!state.live.active || state.live.paused) return;
    if (state.hr.status !== 'connected') return;
    const drift = Math.round((Math.random() - 0.5) * 12);
    state.hr.bpm = Math.max(95, Math.min(178, (state.hr.bpm || 128) + drift));
    state.live.avgHr = Math.round(state.live.avgHr * 0.7 + state.hr.bpm * 0.3);
    const el = document.getElementById('live-hr-val');
    if (el) {
      el.textContent = state.hr.bpm;
      el.parentElement.classList.toggle('danger', state.hr.bpm > 160);
      const z = hrZoneInfo(state.hr.bpm);
      const zn = document.querySelector('#live .hz-name'); if (zn) { zn.textContent = z.name; zn.style.color = z.color; }
      const zb = document.querySelector('#live .hz-bar i'); if (zb) { zb.style.width = Math.round(z.frac * 100) + '%'; zb.style.background = z.color; }
    }
    // 同步更新实时热量
    const sec = Math.floor((Date.now() - state.live.startTime) / 1000);
    const calEl = document.getElementById('live-cal-val');
    if (calEl) calEl.textContent = Math.round((sec / 60) * ((state.live.avgHr || 128) - 60) * 0.1);
  }, 1500);
}

function startLiveTimer() {
  clearInterval(startLiveTimer._t);
  startLiveTimer._t = setInterval(() => {
    if (!state.live.active || state.live.paused) return;
    const sec = Math.floor((Date.now() - state.live.startTime) / 1000);
    const el = document.getElementById('live-timer');
    if (el) el.textContent = ('0' + Math.floor(sec / 60)).slice(-2) + ':' + ('0' + (sec % 60)).slice(-2);
  }, 1000);
}

function renderSummaryOverlay() {
  const s = state.live.summary;
  const totalReps = (s.sets || []).reduce((sum, x) => sum + (Number(x.reps) || 0), 0);
  const totalVolume = (s.sets || []).reduce((sum, x) => sum + ((Number(x.reps) || 0) * (Number(x.weight) || 0)), 0);
  const actionRows = (s.actions || []).map(a => {
    const sets = a.sets || [];
    const reps = sets.reduce((sum, x) => sum + (Number(x.reps) || 0), 0);
    const volume = sets.reduce((sum, x) => sum + ((Number(x.reps) || 0) * (Number(x.weight) || 0)), 0);
    return `<div class="s-action-row"><span>${a.name}</span><b>${sets.length} 组 · ${reps} 次 · ${volume} kg·次</b></div>`;
  }).join('');
  document.getElementById('summary').innerHTML = `
    <h2>训练汇总</h2>
    <p class="s-hint">确认后保存到训练记录</p>
    <div class="s-kpis">
      <div class="s-kpi"><span>时长</span><b>${s.durationMin} 分</b></div>
      <div class="s-kpi"><span>总组数</span><b>${(s.sets || []).length}</b></div>
      <div class="s-kpi"><span>总次数</span><b>${totalReps}</b></div>
    </div>
    <div class="s-row"><span>热量（心率估算）</span><b>${s.calories} kcal</b></div>
    <div class="s-row"><span>平均心率</span><b>${s.avgHr} bpm</b></div>
    <div class="s-row"><span>总训练量</span><b>${totalVolume} kg·次</b></div>
    <div class="s-block"><div class="b-title">动作明细</div>${actionRows || '<div class="empty">无组别</div>'}</div>
    <div class="s-action">
      <button class="btn-ghost" data-act="sum-cancel">继续训练</button>
      <button class="btn-mint" data-act="sum-save">保存记录</button>
    </div>`;
  bindSummary();
}

/* ---------- 倒计时（3-2-1-GO） ---------- */
function runCountdown() {
  const ov = document.getElementById('countdown');
  const num = document.getElementById('countdown-number');
  ov.classList.add('show');
  let count = 3;
  num.classList.remove('countdown-word');
  num.textContent = count;
  num.style.animation = 'none'; void num.offsetWidth; num.style.animation = 'pop .78s ease-out';
  const timer = setInterval(() => {
    count--;
    num.style.animation = 'none'; void num.offsetWidth; num.style.animation = 'pop .78s ease-out';
    if (count > 0) { num.textContent = count; return; }
    clearInterval(timer);
    num.textContent = 'GO'; num.classList.add('countdown-word');
    setTimeout(() => {
      ov.classList.remove('show');
      num.classList.remove('countdown-word'); num.textContent = '3';
      startLive();
      if (state.hr.status !== 'connected') showHrPrompt();
    }, 600);
  }, 850);
}

/* ============================================================
   事件绑定
   ============================================================ */
function bindPage() {
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => handleAct(b.dataset.act, b)));
  document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => go(b.dataset.nav)));
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openDetail(b.dataset.open)));
  document.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); deleteSession(b.dataset.del); }));

  const search = document.getElementById('rec-search');
  if (search) search.addEventListener('input', (e) => { recQuery = e.target.value; renderRecordsLight(); });

  document.querySelectorAll('[data-vol]').forEach(i => i.addEventListener('input', (e) => { state.voice.volume = Number(e.target.value); }));

  document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { recFilter = b.dataset.filter; renderRecordsLight(); }));

  document.querySelectorAll('[data-mtab]').forEach(b => b.addEventListener('click', () => { if (b.disabled) return; state.body.tab = b.dataset.mtab; notify(); }));
  document.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => { state.body.period = b.dataset.period; notify(); }));

  // 键盘可达性：可点击但非 button 的容器（卡片 / 行项）补 tabindex + role + 键盘触发
  document.querySelectorAll('[data-open], [data-act]').forEach(el => {
    if (el.tagName === 'BUTTON') return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (el.getAttribute('role') !== 'button') el.setAttribute('role', 'button');
    el.addEventListener('keydown', e => {
      if (e.target !== el) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); el.click(); }
    });
  });
}
// 记录页轻量重渲染（保留输入焦点）
function renderRecordsLight() {
  const screen = document.getElementById('screen');
  const old = document.activeElement && document.activeElement.id;
  screen.innerHTML = renderRecords();
  renderNav(); bindPage();
  if (old === 'rec-search') { const s = document.getElementById('rec-search'); if (s) s.focus(); }
}

function openDetail(id) {
  const rec = state.sessions.find(s => s.id === id);
  if (!rec) return;
  state.detailFrom = state.route;
  state.detailId = id;
  state.route = 'detail';
  notify();
}

function handleAct(act, el) {
  switch (act) {
    case 'start': runCountdown(); break;
    case 'edit-weight': openSheet('weight'); break;
    case 'edit-profile': openSheet('profile'); break;
    case 'hw-sync': syncStart(); setTimeout(syncSuccess, 1200); break;
    case 'hr-toggle':
      if (state.hr.status === 'connected') hrDisconnectUser();
      else { hrConnect(); setTimeout(hrConnected, 1000); }
      break;
    case 'voice-broadcast': toggleVoice('broadcast'); break;
    case 'voice-command': toggleVoice('command'); break;
    case 'demo-hr': demoHr(); break;
    case 'live-back': requestLeave(); break;
    case 'live-close': requestLeave(); break;
    case 'hr-prompt-skip': hideHrPrompt(); break;
    case 'hr-prompt-connect': hideHrPrompt(); discardLive(); go('profile'); toast('请在「我的」页连接心率带'); break;
    case 'leave-cancel': cancelLeave(); break;
    case 'leave-confirm': confirmLeave(); break;
    case 'live-pause': state.live.paused ? resumeLive() : pauseLive(); break;
    case 'end-live': requestEndLive(); break;
    case 'end-confirm': confirmEndLive(); break;
    case 'end-cancel': cancelEndLive(); break;
    case 'live-switch': openSheet('action'); break;
    case 'switch-action-chip': {
      const name = el && el.dataset.actionName;
      if (name) { setCurrentAction(name); toast('切换到 ' + name); }
      break;
    }
    case 'open-library': openSheet('library'); break;
    case 'detail-back': go(state.detailFrom || 'records'); break;
    case 'detail-del': deleteSession(state.detailId); break;
    case 'rec-clear': recFilter = 'all'; recQuery = ''; renderRecordsLight(); break;
    case 'add-set': {
      const r = document.getElementById('rep-in'), w = document.getElementById('wt-in');
      if (r && w && r.value) { addSet(r.value, w.value || 0); r.value = ''; w.value = ''; r.focus(); }
      break;
    }
    case 'live-mic': openSheet('voicesim'); break;
    case 'voice-close': state.voice.command = !state.voice.command; state.voice.listening = state.voice.command && state.live.active && !state.live.paused; notify(); break;
    case 'body-add': openSheet('body'); break;
    case 'body-history': openSheet('body-history'); break;
    case 'edit-weight': openSheet('body'); break;
  }
}

function bindLive() {
  document.querySelectorAll('#live [data-act]').forEach(b => b.addEventListener('click', () => handleAct(b.dataset.act, b)));
  document.querySelectorAll('#live [data-rmset]').forEach(b => b.addEventListener('click', () => {
    const cur = liveAction();
    if (!cur || !cur.sets) return;
    cur.sets.splice(Number(b.dataset.rmset), 1);
    notify();
  }));
}
function bindSummary() {
  document.querySelectorAll('#summary [data-act]').forEach(b => b.addEventListener('click', () => handleAct(b.dataset.act, b)));
  // sum-cancel / sum-save：
  const cancel = document.querySelector('#summary [data-act="sum-cancel"]');
  const save = document.querySelector('#summary [data-act="sum-save"]');
  if (cancel) cancel.addEventListener('click', () => { state.live.active = true; state.live.paused = false; state.live.summary = null; if (!state.live.startTime) state.live.startTime = Date.now() - state.live.elapsed * 60000; notify(); });
  if (save) save.addEventListener('click', () => saveSession());
}

/* ---------- 实时训练：心率带未连接提示（可跳过） ---------- */
function showHrPrompt() {
  const m = document.getElementById('hr-prompt');
  if (m) m.classList.add('show');
}
function hideHrPrompt() {
  const m = document.getElementById('hr-prompt');
  if (m) m.classList.remove('show');
}

/* ---------- 实时训练：退出确认（手势返回二次弹窗） ---------- */
function requestLeave() {
  if (!state.live.active) return;
  const t = document.getElementById('leave-text');
  const totalSets = (state.live.actions || []).reduce((sum, a) => sum + (a.sets ? a.sets.length : 0), 0);
  if (t) t.textContent = '已录入 ' + totalSets + ' 组动作将不会被保存。';
  const m = document.getElementById('leave-confirm');
  if (m) m.classList.add('show');
}
function cancelLeave() {
  const m = document.getElementById('leave-confirm');
  if (m) m.classList.remove('show');
}
function confirmLeave() {
  const m = document.getElementById('leave-confirm');
  if (m) m.classList.remove('show');
  discardLive();
  toast('已退出训练');
}

/* ---------- 实时训练：长按结束（转圈 + 防误触确认） ---------- */
function requestEndLive() {
  if (!state.live.active && !state.live.paused) return;
  const m = document.getElementById('end-confirm');
  const t = document.getElementById('end-text');
  if (t) t.textContent = '长按确认后将汇总并保存为训练记录。';
  if (m) m.classList.add('show');
}
function cancelEndLive() {
  const m = document.getElementById('end-confirm');
  if (m) m.classList.remove('show');
  const btn = document.getElementById('end-hold');
  if (btn) btn.classList.remove('holding');
}
function confirmEndLive() {
  const m = document.getElementById('end-confirm');
  if (m) m.classList.remove('show');
  endLive();
}
function bindEndHold() {
  const btn = document.getElementById('end-hold');
  if (!btn) return;
  let timer = null;
  const fire = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); requestEndLive(); };
  const start = (e) => { e.preventDefault(); btn.classList.add('holding'); timer = setTimeout(fire, 900); };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
}

/* ---------- 状态机演示（演示控制面板；心率带已连接/未连接切换） ---------- */
function demoHr() {
  // 仅切换「已连接 ↔ 未连接」两个核心展示状态（中间态通过训练流程触发）
  if (state.hr.status === 'connected') {
    hrDisconnectUser();
  } else {
    hrConnected();
  }
}

/* ---------- 录入 / 编辑弹层 ---------- */
function openSheet(kind) {
  const sheet = document.getElementById('sheet');
  let html = '';
  if (kind === 'weight') {
    html = `<h3>录入体重</h3>
      <div class="field"><label>体重 (kg)</label><input id="f-weight" type="number" value="${state.profile.weight}"></div>
      <div class="sheet-actions"><button class="btn-ghost" data-sheet-close>取消</button><button class="btn-mint" data-sheet-save="weight">保存</button></div>`;
  } else if (kind === 'profile') {
    html = `<h3>个人参数</h3>
      <div class="field"><label>年龄</label><input id="f-age" type="number" value="${state.profile.age}"></div>
      <div class="field"><label>体重 (kg)</label><input id="f-weight2" type="number" value="${state.profile.weight}"></div>
      <div class="field"><label>身高 (cm)</label><input id="f-height" type="number" value="${state.profile.height || ''}" placeholder="影响 BMI"></div>
      <div class="sheet-actions"><button class="btn-ghost" data-sheet-close>取消</button><button class="btn-mint" data-sheet-save="profile">保存</button></div>`;
  } else if (kind === 'action') {
    html = `<h3>切换动作</h3>
      <div class="field"><label>选择动作</label><select id="f-action">${state.exercises.map(e => `<option ${e.name === (liveAction() && liveAction().name) ? 'selected' : ''}>${e.name}</option>`).join('')}</select></div>
      <div class="field"><label>或新增自定义动作</label><input id="f-new" placeholder="动作名"></div>
      <div class="sheet-actions"><button class="btn-ghost" data-sheet-close>取消</button><button class="btn-mint" data-sheet-save="action">确定</button></div>`;
  } else if (kind === 'library') {
    html = `<h3>动作库</h3>
      <div class="lib-list">${state.exercises.map(e => `<div class="lib-item"><b>${e.name}</b><span>${e.category}${e.custom ? ' · 自定义' : ''}</span></div>`).join('')}</div>
      <div class="sheet-actions"><button class="btn-ghost" data-sheet-close>关闭</button></div>`;
  } else if (kind === 'voicesim') {
    const IL = { record: '录入动作组', switch_action: '切换动作', switch_set: '切换组', add_action: '新增动作', pause: '暂停', resume: '继续', end: '结束' };
    const items = VOICE_PRESETS.map(p => '<button class="voice-opt" data-voice="' + p.text + '"><b>' + p.text + '</b><span>' + (IL[p.intent] || p.intent) + '</span></button>').join('');
    html = '<h3>模拟语音指令</h3><p class="sheet-hint">点选一条，演示端侧 ASR → NLU → 状态机闭环（真实设备由 VAD 持续监听触发）</p><div class="voice-list">' + items + '</div><div class="sheet-actions"><button class="btn-ghost" data-sheet-close>关闭</button></div>';
  } else if (kind === 'body') {
    const last = d => { const s = metricSeries(d); return s.length ? s[s.length - 1].value : ''; };
    html = '<h3>录入身体指标</h3>' +
      '<div class="field"><label>测量日期</label><input id="b-date" type="date" value="' + todayStr() + '"></div>' +
      '<div class="field"><label>体重 (kg)</label><input id="b-weight" type="number" step="0.1" value="' + last('weight') + '"></div>' +
      '<div class="field"><label>体脂率 (%)</label><input id="b-fat" type="number" step="0.1" value="' + last('bodyFat') + '"></div>' +
      '<div class="field"><label>腰围 (cm)</label><input id="b-waist" type="number" step="0.1" value="' + last('waist') + '"></div>' +
      '<div class="field"><label>脐围 (cm)</label><input id="b-navel" type="number" step="0.1" value="' + last('navel') + '"></div>' +
      '<div class="field"><label>臀围 (cm)</label><input id="b-hip" type="number" step="0.1" value="' + last('hip') + '"></div>' +
      '<div class="field"><label>臂围 (cm)</label><input id="b-arm" type="number" step="0.1" value="' + last('arm') + '"></div>' +
      '<div class="field"><label>大腿围 (cm)</label><input id="b-thigh" type="number" step="0.1" value="' + last('thigh') + '"></div>' +
      '<div class="sheet-actions"><button class="btn-ghost" data-sheet-close>取消</button><button class="btn-mint" data-sheet-save="body">保存</button></div>';
  } else if (kind === 'body-history') {
    const keys = ['waist', 'navel', 'hip', 'arm', 'thigh'];
    const byDate = {};
    for (const k of keys) for (const p of (state.metrics[k] || [])) { (byDate[p.date] = byDate[p.date] || { date: p.date })[k] = p.value; }
    const dates = Object.keys(byDate).sort().reverse();
    const rows = dates.length ? dates.map(d => {
      const r = byDate[d];
      return '<div class="hist-row"><span class="hist-date">' + d.slice(5).replace('-', '/') + '</span>' + keys.map(k => '<span class="hist-cell">' + (r[k] != null ? r[k] : '—') + '</span>').join('') + '</div>';
    }).join('') : '<div class="empty">还没有围度记录</div>';
    const head = '<div class="hist-row head"><span class="hist-date">日期</span>' + keys.map(k => '<span class="hist-cell">' + tabLabel(k) + '</span>').join('') + '</div>';
    html = '<h3>体围历史记录</h3>' + head + '<div class="hist-list">' + rows + '</div><div class="sheet-actions"><button class="btn-ghost" data-sheet-close>关闭</button></div>';
  }
  sheet.innerHTML = html;
  sheet.classList.add('show');
  sheet.querySelectorAll('[data-sheet-close]').forEach(b => b.addEventListener('click', () => sheet.classList.remove('show')));
  sheet.querySelectorAll('[data-sheet-save]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.sheetSave;
    if (k === 'weight') saveBodyMetric('weight', Number(document.getElementById('f-weight').value));
    if (k === 'profile') { saveBodyMetric('age', Number(document.getElementById('f-age').value)); saveBodyMetric('weight', Number(document.getElementById('f-weight2').value)); if (document.getElementById('f-height').value) saveBodyMetric('height', Number(document.getElementById('f-height').value)); }
    if (k === 'action') {
      const nv = document.getElementById('f-new').value.trim();
      if (nv) { addCustomExercise(nv, '其他', 6); switchAction(nv); }
      else switchAction(document.getElementById('f-action').value);
    }
    if (k === 'body') {
      saveBodyEntry({
        measureDate: document.getElementById('b-date').value,
        weight: document.getElementById('b-weight').value,
        bodyFat: document.getElementById('b-fat').value,
        waist: document.getElementById('b-waist').value,
        navel: document.getElementById('b-navel').value,
        hip: document.getElementById('b-hip').value,
        arm: document.getElementById('b-arm').value,
        thigh: document.getElementById('b-thigh').value,
        restingHr: document.getElementById('b-hr').value
      });
    }
    sheet.classList.remove('show');
  }));
  sheet.querySelectorAll('[data-voice]').forEach(b => b.addEventListener('click', () => {
    const text = b.dataset.voice;
    sheet.classList.remove('show');
    if (!state.voice.command) { toast('语音指令已关闭，可在「我的」页开启'); return; }
    simulateVoice(text);
  }));
}

/* ---------- 初始化 ---------- */
function init() {
  setRenderer(render);
  render();

  // 右侧「演示控制」面板：仅心率带切换（首页不需要华为同步切换）
  const bHr = document.getElementById('rp-demo-hr');
  if (bHr) bHr.addEventListener('click', () => handleAct('demo-hr'));

  // 实时训练弹窗（心率提示 / 退出确认）：静态节点，一次性绑定
  document.querySelectorAll('#hr-prompt [data-act], #leave-confirm [data-act]').forEach(b =>
    b.addEventListener('click', () => handleAct(b.dataset.act, b)));
  // 手势返回（系统返回键 / Esc）等效触发二次确认
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.live.active) requestLeave();
  });
}
document.addEventListener('DOMContentLoaded', init);
