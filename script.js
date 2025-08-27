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
  heart: document.getElementById('heart-stamp'),
};

function getToday(){ return new Date().toISOString().slice(0,10); }
function getPageDate(){
  const p = new URLSearchParams(window.location.search).get('date');
  return /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : null;
}

async function loadCategories(){
  const { data, error } = await supabase
    .from('find_categories')
    .select('id,name')
    .order('sort',{ascending:true});
  if(error){ console.error(error); return; }
  data.forEach(c=>{
    els.category.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`);
  });
}

async function loadMenusByCategory(categoryId){
  els.menu.innerHTML = `<option value="">メニューを選択してください</option>`;
  els.menu.disabled = true;
  if(!categoryId) return;
  const { data, error } = await supabase
    .from('find_menus')
    .select('id,name_jp')
    .eq('category_id', categoryId)
    .order('id',{ascending:true});
  if(error){ console.error(error); return; }
  data.forEach(m=>{
    els.menu.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.name_jp}</option>`);
  });
  els.menu.disabled = false;
}

window.addEventListener('DOMContentLoaded', async ()=>{
  const today = getToday();
  const pageDate = getPageDate();
  if(pageDate && pageDate !== today){
    els.submit.disabled = true;
    return;
  }
  await loadCategories();

  els.category.addEventListener('change', async e=>{
    await loadMenusByCategory(e.target.value);
  });

  // ハートクリックで切替
  els.heart.addEventListener('click', ()=>{
    els.heart.classList.add('stamped');
  });
});

els.form.addEventListener('submit', async e=>{
  e.preventDefault();
  const today = getToday();
  const pageDate = getPageDate();
  if(pageDate && pageDate !== today){ return; }

  const categoryId = Number(els.category.value);
  const menuId = Number(els.menu.value);
  const comment = els.txt.value.trim();
  if(!categoryId){ alert('カテゴリーを選択してください'); return; }
  if(!menuId){ alert('メニューを選択してください'); return; }
  if(!comment){ alert('クチコミを入力してください'); return; }

  const allPosts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const todayList = allPosts[today] || [];
  if(todayList.length >= MAX_PER_DAY){
    alert(`本日の上限(${MAX_PER_DAY}件)に達しました。`);
    return;
  }

  const payload = { menu_id: menuId, comment };
  const { error } = await supabase.from('find_comments').insert([payload]);
  if(error){ console.error(error); alert('保存失敗'); return; }

  todayList.push(menuId);
  allPosts[today] = todayList;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPosts));

  els.submit.textContent = '共有しました';
  els.submit.disabled = true;
});
