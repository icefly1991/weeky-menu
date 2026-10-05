(async function(){
  'use strict';
  const tools=window.WeekTools;
  const selector=document.getElementById('week-select'), status=document.getElementById('week-status');
  const load=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('菜单加载失败，请刷新重试'));document.head.append(script);});
  try {
    await load('./weeks.js?v='+Date.now());
    const weeks=window.WEEK_INDEX;
    if (!Array.isArray(weeks) || !weeks.length) throw new Error('还没有保存的周菜单');
    const today=tools.todayPacific(), requested=new URL(location.href).searchParams.get('week');
    const selected=weeks.find(w=>w.weekStart===requested)||tools.pickWeek(weeks,today);
    [...weeks].sort((a,b)=>b.weekStart.localeCompare(a.weekStart)).forEach(week=>{
      const option=document.createElement('option');
      option.value=week.weekStart;
      option.textContent=week.weekStart.replaceAll('-','/')+' — '+tools.addDays(week.weekStart,6).slice(5).replace('-','/');
      selector.append(option);
    });
    selector.value=selected.weekStart;
    status.textContent=selected.weekStart<=today && tools.addDays(selected.weekStart,6)>=today ? '本周' : selected.weekStart>today ? '已安排的周菜单' : '历史菜单';
    selector.addEventListener('change',()=>{
      const target=new URL(location.href); target.searchParams.set('week',selector.value); location.href=target.href;
    });
    if (!/^weeks\/\d{4}-\d{2}-\d{2}\.js$/.test(selected.file)) throw new Error('周菜单地址不正确');
    await load('./'+selected.file+'?v='+encodeURIComponent(selected.revision));
    if (window.MENU_DATA.weekStart!==selected.weekStart) throw new Error('周次与保存的数据不一致');
    tools.validate(window.MENU_DATA);
    await load('./app.js?v='+encodeURIComponent(selected.revision));
  }catch(error){status.textContent=error.message;}
})();
