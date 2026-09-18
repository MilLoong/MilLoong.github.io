
function fmtRange(start, end) {
  if (!start) return '日期待定';
  const a = fmtDate(start);
  const b = fmtDate(end);
  if (b && b !== a) return a + ' ~ ' + b;
  return a;
}
function renderGrades(data) {
  const grades = data.grades || {};
  const notices = grades.notices || [];
  const meta = document.getElementById('grades-meta');
  const feed = document.getElementById('grades-feed');
  const portal = grades.portal_url || 'https://v45lmyn1.yichafen.com/';
  if (!notices.length) {
    meta.innerHTML = '暂未抓到成绩查询条目。可打开 <a href="' + portal + '" target="_blank" rel="noopener">易查分门户</a> 手动查看。';
    feed.innerHTML = '';
    return;
  }
  meta.innerHTML =
    '来源：<a href="' + portal + '" target="_blank" rel="noopener">电子科大成绩查询（易查分）</a>' +
    ' · 最近条目 ' + (grades.latest_published_at || '日期未知') +
    ' · 共 ' + notices.length + ' 条';
  feed.innerHTML = notices.map(n => `
    <li class="grade-item">
      <a href="${n.url}" target="_blank" rel="noopener">${escapeHtml(n.title)}</a>
      <span class="meta">${escapeHtml(n.published_at || '日期未知')}</span>
    </li>`).join('');
}
async function main() {
  const data = await (await fetch('./data.json', { cache: 'no-store' })).json();
  document.getElementById('generated-at').textContent =
    '更新时间：' + (data.generated_at || '');
  const nodes = data.milestones || [];
  document.getElementById('stat-comp').textContent = data.competitions.length;
  document.getElementById('stat-node').textContent = nodes.length;
  document.getElementById('stat-group').textContent = data.milestone_groups.length;
  renderGrades(data);

  const feed = document.getElementById('feed');
  if (!data.milestone_groups.length) {
    feed.innerHTML = '<p class="meta">暂无赛程节点。</p>';
    return;
  }
  feed.innerHTML = data.milestone_groups.map(g => `
    <details class="cat-row">
      <summary class="cat-summary">
        <div class="cat-summary-left">
          <span class="cat-id">#${g.competition_id || '—'}</span>
          <span class="cat-name">${escapeHtml(g.name)}</span>
          <span class="cat-sub">${escapeHtml(g.full_name || '')}</span>
        </div>
        <div class="cat-summary-right">
          <span class="cat-range">${escapeHtml(fmtRange(g.range_start, g.range_end))}</span>
          <span class="cat-count">${g.count} 条</span>
        </div>
      </summary>
      <ul class="cat-messages">
        ${g.messages.map(m => `
          <li class="cat-msg">
            <div class="cat-msg-title">
              ${m.source_url ? `<a href="${m.source_url}" target="_blank" rel="noopener">${escapeHtml(m.title || m.event_label)}</a>` : escapeHtml(m.title || m.event_label)}
              <span class="badge">${escapeHtml(m.event_label)}</span>
              <span class="badge ${m.status === 'verified' ? 'ok' : 'warn'}">${escapeHtml(m.status)}</span>
            </div>
            <div class="cat-msg-meta">
              <span>${fmtDate(m.starts_at) || '待定'}${m.ends_at && m.ends_at !== m.starts_at ? ' ~ ' + fmtDate(m.ends_at) : ''}</span>
            </div>
          </li>`).join('')}
      </ul>
    </details>`).join('');
}
function fmtDate(s){ if(!s) return ''; return String(s).slice(0,10); }
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
main().catch(err => {
  document.getElementById('feed').innerHTML = '<p class="meta">加载失败：' + err + '</p>';
});
