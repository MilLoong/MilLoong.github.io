
async function main(){
  const data = await (await fetch('./data.json', { cache: 'no-store' })).json();
  const tb = document.querySelector('#comp-table tbody');
  tb.innerHTML = data.competitions.map(c => `
    <tr>
      <td><code>${c.id}</code></td>
      <td><strong>${c.short_name || c.name}</strong><div class="meta">${c.name}</div></td>
      <td class="meta">${(c.directions||[]).join('、')}</td>
      <td>${c.official_url ? `<a href="${c.official_url}" target="_blank" rel="noopener">打开</a>` : ''}</td>
    </tr>`).join('');
}
main();
