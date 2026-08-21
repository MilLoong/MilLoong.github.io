
function fmtRange(start, end) {
  if (!start) return '日期待定';
  const a = fmtDate(start);
  const b = fmtDate(end);
  if (b && b !== a) return a + ' ~ ' + b;
  return a;
}
async function main() {
  const data = await (await fetch('./data.json', { cache: 'no-store' })).json();
  document.getElementById('generated-at').textContent =
    '更新时间：' + (data.project.generated_at || '');
  const horizonNodes = data.horizon_milestones || data.milestones || [];
  document.getElementById('stat-comp').textContent = data.competitions.length;
  document.getElementById('stat-node').textContent = horizonNodes.length;
  document.getElementById('stat-group').textContent = data.milestone_groups.length;

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
            <div class="snippet">${escapeHtml(m.evidence_snippet || '')}</div>
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
