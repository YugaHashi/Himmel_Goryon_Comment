import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://labmhtrafdslfwqmzgky.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhYm1odHJhZmRzbGZ3cW16Z2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2OTAzNzksImV4cCI6MjA2NTI2NjM3OX0.CviQ3lzngfvqDFwEtDw5cTRSEICWliunXngYCokhbNs'
);

const MAX_PER_DAY = 1;
const STORAGE_KEY = 'posts_by_date';

const els = {
  form: document.getElementById('comment-form'),
  category: document.getElementById('form-category'),
  menu: document.getElementById('form-menu'),
  txt: document.getElementById('comment'),
  submit: document.getElementById('submit-btn'),
  latest: document.getElementById('latest-comment'),
  heartBtn: document.getElementById('heart-stamp'),
  heartEmoji: document.getElementById('heart-emoji'),
};

function getToday(){
  return new Date().toISOString().slice(0,10);
}
function getPageDate(){
  const p = new URLSearchParams(window.location.search).get('date');
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : null;
}

async function loadCategories(){
  // categories は find_categories テーブルから取得
  const { data, error } = await supabase
    .from('find_categories')
    .select('id,name')
    .order('id', { ascending: true });

  if(error){ console.error('カテゴリ取得エラー', error); alert('カテゴリーの読み込みに失敗しました。'); return; }

  data.forEach(c=>{
    els.category.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  });
}

async function loadMenusByCategory(categoryId){
  els.menu.innerHTML = `<option value="">メニューを選択してください</option>`;
  els.menu.disabled = true;

  if(!categoryId) return;

  // find_menus から category_id でフィルタ
  const { data, error } = await supabase
    .from('find_menus')
    .select('id,name_jp')
    .eq('category_id', Number(categoryId))
    .order('id', { ascending: true });

  if(error){ console.error('メニュー取得エラー', error); alert('メニューの読み込みに失敗しました。'); return; }

  data.forEach(m=>{
    els.menu.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.name_jp}</option>`);
  });
  els.menu.disabled = false;
}

window.addEventListener('DOMContentLoaded', async () => {
  const today = getToday();
  const pageDate = getPageDate();
  if (pageDate && pageDate !== today) {
    alert('このページは本日用ではありません。');
    els.submit.disabled = true;
    return;
  }

  // カテゴリー読込 → 連動メニューはカテゴリ選択時にロード
  await loadCategories();

  // ハートの挙動（押す→発光＆ポン＆振動）
  els.heartBtn.addEventListener('click', () => {
    if(!els.heartBtn.classList.contains('stamped')){
      els.heartBtn.classList.add('stamped');
      // 軽いバイブレーション（対応端末のみ）
      if (navigator.vibrate) navigator.vibrate([16, 40, 16]);
    } else {
      // 2回目以降はトグルでもOKなら以下を有効化
      // els.heartBtn.classList.remove('stamped');
    }
  });

  // カテゴリー変更でメニューを絞り込み
  els.category.addEventListener('change', async (e)=>{
    const cid = e.target.value;
    await loadMenusByCategory(cid);
  });
});

els.form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const today = getToday();
  const pageDate = getPageDate();
  if (pageDate && pageDate !== today) {
    alert('このページは本日用ではありません。');
    return;
  }

  // 入力チェック
  const categoryId = Number(els.category.value);
  const menuId = Number(els.menu.value);
  const comment = els.txt.value.trim();

  if(!categoryId){ alert('カテゴリーを選択してください。'); return; }
  if(!menuId){ alert('メニューを選択してください。'); return; }
  if(!comment){ alert('クチコミを入力してください。'); return; }

  // 1回/日のチェック
  const allPosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const todayList = allPosts[today] || [];
  if(todayList.length >= MAX_PER_DAY){
    alert(`本日の上限(${MAX_PER_DAY}件)に達しました。`);
    return;
  }

  // Supabase 挿入（年代・性別・ニックネームは削除済み）
  const payload = {
    menu_id: menuId,
    comment
  };

  const { error } = await supabase
    .from('find_comments')
    .insert([payload], { returning: 'minimal' });

  if(error){
    console.error('保存エラー', error);
    alert(`保存に失敗しました：${error.message}`);
    return;
  }

  // ローカル履歴更新
  todayList.push(menuId);
  allPosts[today] = todayList;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPosts));

  // ボタン＆メッセージ切替
  els.submit.textContent = 'ランキングに反映されました';
  els.submit.disabled = true;

  // 最新投稿を表示
  els.latest.innerHTML = `
    <div class="review-item">
      <div class="review-header">
        <span class="meta">${today}</span>
      </div>
      <div class="body">${comment}</div>
    </div>
  `;
});
