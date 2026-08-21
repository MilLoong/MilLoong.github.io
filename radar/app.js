
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
    feed.innerHTML = '<p class="meta">该时间窗口内暂无赛程节点。等待下次 Actions 抓取，或查看 JSON 全量数据。</p>';
    return;
  }
  feed.innerHTML = data.milestone_groups.map(g => `
    <article class="cat-row">
      <aside class="cat-box">
        <div class="cat-id">#${g.competition_id || '—'}</div>
        <div class="cat-name">${escapeHtml(g.name)}</div>
        <div class="cat-sub">${escapeHtml(g.full_name || '')}</div>
        <div class="cat-count">${g.count} 条</div>
      </aside>
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
    </article>`).join('');
}
function fmtDate(s){ if(!s) return ''; return s.slice(0,10); }
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
main().catch(err => {
  document.getElementById('feed').innerHTML = '<p class="meta">加载失败：' + err + '</p>';
});
