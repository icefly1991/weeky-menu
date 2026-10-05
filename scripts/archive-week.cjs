const fs=require('fs'),vm=require('vm'),path=require('path');
require('../week-utils.js');
function saveWeek(menu,directory=path.resolve(__dirname,'..')){
 const data=WeekTools.withDates(menu);WeekTools.validate(data);
 fs.mkdirSync(path.join(directory,'weeks'),{recursive:true});
 const manifestPath=path.join(directory,'weeks.js'),context={window:{}};
 if(fs.existsSync(manifestPath))vm.runInNewContext(fs.readFileSync(manifestPath,'utf8'),context);
 const index=context.window.WEEK_INDEX||[],entry={weekStart:data.weekStart,file:'weeks/'+data.weekStart+'.js',revision:data.revision};
 const position=index.findIndex(x=>x.weekStart===entry.weekStart);
 if(position<0)index.push(entry);else index[position]=entry;
 fs.writeFileSync(path.join(directory,entry.file),'window.MENU_DATA = '+JSON.stringify(data)+';\n');
 fs.writeFileSync(manifestPath,'window.WEEK_INDEX = '+JSON.stringify(index.sort((a,b)=>a.weekStart.localeCompare(b.weekStart)))+';\n');
 fs.writeFileSync(path.join(directory,'data.js'),'window.MENU_DATA = '+JSON.stringify(data)+';\n');
 return {data,count:index.length};
}
module.exports={saveWeek};
if(require.main===module){
 if(!process.argv[2])throw new Error('使用：node scripts/archive-week.cjs menu.json');
 const menu=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
 const result=saveWeek(menu);
 console.log('已保存 '+result.data.weekStart+'，共 '+result.count+' 周。');
}
