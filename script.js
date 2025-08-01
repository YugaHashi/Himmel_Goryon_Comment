import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://labmhtrafdslfwqmzgky.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhYm1odHJhZmRzbGZ3cW16Z2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTAzNzksImV4cCI6MjA2NTI2NjM3OX0.CviQ3lzngfvqDFwEtDw5cTRSEICWliunXngYCokhbNs'
);

const MAX_PER_DAY  = 1;
const STORAGE_KEY  = 'posts_by_date';
const USERINFO_KEY = 'user_info_by_date';

const els = {
  form:    document.getElementById('comment-form'),
  menu:    document.getElementById('form-menu'),
  age:     document.getElementById('age-group'),
  gender:  document.getElementById('gender'),
  nick:    document.getElementById('nickname'),
  txt:     document.getElementById('comment'),
  submit:  document.getElementById('submit-btn'),
  latest:  document.getElementById('latest-comment'),
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getPageDate() {
  const p = new URLSearchParams(window.location.search).get('date');
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : null;
}

window.addEventListener('DOMContentLoaded', async () => {
  const today    = getToday();
  const pageDate = getPageDate();
  if (pageDate && pageDate !== today) {
    alert('このページは本日用ではありません。');
    els.submit.disabled = true;
    return;
  }

  // ── メニュー取得＆プルダウン生成 ──
  const { data: menus, error: menuErr } = await supabase
    .from('find_menus')
    .select('id,name_jp');
  if (menuErr) {
    console.error('メニュー取得エラー', menuErr);
    alert('メニュー読み込みに失敗しました。');
    return;
  }
  menus.forEach(m => {
    els.menu.insertAdjacentHTML(
      'beforeend',
      `<option value="${m.id}">${m.name_jp}</option>`
    );
  });

  // ── 任意情報（初回のみ）ロック設定 ──
  const infos = JSON.parse(localStorage.getItem(USERINFO_KEY) || '{}');
  if (infos[today]) {
    const saved = infos[today];
    els.age.value    = saved.age    || '';
    els.gender.value = saved.gender || '';
    els.nick.value   = saved.nick   || '';
    els.age.disabled = els.gender.disabled = els.nick.disabled = true;
  }
});

els.form.addEventListener('submit', async e => {
  e.preventDefault();
  const today    = getToday();
  const pageDate = getPageDate();
  if (pageDate && pageDate !== today) {
    alert('このページは本日用ではありません。');
    return;
  }

  // 入力値チェック
  const menuId  = +els.menu.value;
  const comment = els.txt.value.trim();
  if (!menuId)  { alert('メニューを選択してください。'); return; }
  if (!comment) { alert('クチコミを入力してください。'); return; }

  // 1回/日のチェック
  const allPosts  = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const todayList = allPosts[today] || [];
  if (todayList.length >= MAX_PER_DAY) {
    alert(`本日の上限(${MAX_PER_DAY}件)に達しました。`);
    return;
  }

  // 任意情報初回保存
  const allInfos = JSON.parse(localStorage.getItem(USERINFO_KEY) || '{}');
  if (!allInfos[today]) {
    allInfos[today] = {
      age:    els.age.value    || null,
      gender: els.gender.value || null,
      nick:   els.nick.value   || null
    };
    localStorage.setItem(USERINFO_KEY, JSON.stringify(allInfos));
    els.age.disabled = els.gender.disabled = els.nick.disabled = true;
  }

  // ── Supabaseに挿入 ──
  const payload = {
    menu_id:  menuId,
    nickname: els.nick.value   || null,
    age:      els.age.value    || null,
    gender:   els.gender.value || null,
    comment
  };
  const { error } = await supabase
    .from('find_comments')
    .insert([payload], { returning: 'minimal' });
  if (error) {
    console.error('保存エラー', error);
    alert(`保存に失敗しました：${error.message}`);
    return;
  }

  // ── ローカル履歴更新 ──
  todayList.push(menuId);
  allPosts[today] = todayList;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPosts));

  // ── ボタン＆メッセージ切り替え ──
  els.submit.textContent = 'ランキングに反映されました';
  els.submit.disabled    = true;

  // ── 最新投稿をそのまま表示 ──
  const nick = els.nick.value || '匿名';
  els.latest.innerHTML = `
    <div class="review-item">
      <div class="review-header">
        <span class="nick">${nick}</span>
        <span class="meta">${getToday()}</span>
      </div>
      <div class="body">${comment}</div>
    </div>
  `;
});
