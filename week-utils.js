(function(root) {
  'use strict';
  const meals = ['breakfast','lunch','dinner'];
  function dateValue(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('日期格式必须为 YYYY-MM-DD');
    const date = new Date(iso + 'T12:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== iso) throw new Error('日期不存在');
    return date;
  }
  function addDays(iso, days) { const date=dateValue(iso); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
  function weekday(iso) { return dateValue(iso).getUTCDay(); }
  function todayPacific(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const part = type => parts.find(x=>x.type===type).value;
    return part('year')+'-'+part('month')+'-'+part('day');
  }
  function pickWeek(weeks, today) {
    const list=[...weeks].sort((a,b)=>a.weekStart.localeCompare(b.weekStart));
    return list.find(w=>w.weekStart<=today && addDays(w.weekStart,6)>=today)
      || list.find(w=>w.weekStart>today) || list.at(-1);
  }
  function withDates(menu) {
    const copy=JSON.parse(JSON.stringify(menu));
    if (!copy.schedule) copy.schedule=copy.days.map((day,index)=>({date:addDays(copy.weekStart,index),meals:Object.fromEntries(meals.map((meal,j)=>[meal,day[j]]))}));
    copy.dates=copy.schedule.map(day=>day.date);
    return copy;
  }
  function validate(menu) {
    if (weekday(menu.weekStart)!==1) throw new Error('每周起始日期必须为周一');
    if (!Array.isArray(menu.schedule) || menu.schedule.length!==7) throw new Error('每周必须包含七个明确日期');
    const known=new Set([...menu.recipes,...(menu.dining||[])].map(r=>r.id));
    menu.schedule.forEach((day,i)=>{
      if (day.date!==addDays(menu.weekStart,i)) throw new Error('日期顺序或所属周不正确');
      meals.forEach((meal,j)=>{
        if (!Array.isArray(day.meals[meal]) || day.meals[meal].some(id=>!known.has(id))) throw new Error('餐次或菜品不存在');
        if (JSON.stringify(menu.days[i][j])!==JSON.stringify(day.meals[meal])) throw new Error('日期记录与旧数组不一致，禁止发布');
      });
    });
    return true;
  }
  function replaceMeal(menu, {date,meal,recipeIds,expectedWeekday}) {
    const copy=withDates(menu); validate(copy);
    if (weekday(date)!==expectedWeekday) throw new Error('指定星期与具体日期不一致');
    if (!meals.includes(meal)) throw new Error('餐次不存在');
    const index=copy.schedule.findIndex(day=>day.date===date);
    if (index<0) throw new Error('日期不属于当前选中的周');
    copy.schedule[index].meals[meal]=[...recipeIds];
    copy.days[index][meals.indexOf(meal)]=[...recipeIds];
    validate(copy); return copy;
  }
  root.WeekTools={meals,addDays,weekday,todayPacific,pickWeek,withDates,validate,replaceMeal};
})(typeof window!=='undefined'?window:globalThis);
