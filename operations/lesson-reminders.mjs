import { pathToFileURL } from 'node:url';

export async function runReminderJob({env=process.env,send=fetch,log=console.log}={}){
 const endpoint=new URL(env.LESSON_REMINDER_URL||'');
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!/^[a-f0-9]{64}$/.test(env.LESSON_REMINDER_TOKEN||''))throw new Error('Configure the HTTPS reminder endpoint and its dedicated service token.');
 let last;
 for(let batch=0;batch<5;batch++){
  const response=await send(endpoint.href,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${env.LESSON_REMINDER_TOKEN}`},signal:AbortSignal.timeout(65000)});
  if(!response.ok)throw new Error(`Reminder check failed with HTTP ${response.status}. Check service configuration.`);
  const result=await response.json();for(const k of ['sent','waiting','suppressed','skipped','failed','uncertain','remaining'])if(!Number.isInteger(result[k])||result[k]<0)throw new Error('The reminder service returned an invalid summary.');
  log(JSON.stringify({batch:batch+1,...Object.fromEntries(['sent','waiting','suppressed','skipped','failed','uncertain','remaining'].map(k=>[k,result[k]]))}));last=result;
  if(result.waiting||result.failed||result.uncertain)throw new Error('Reminder delivery needs review in instructor scheduling settings.');
  if(!result.remaining)return result;
 }
 return last;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)runReminderJob().catch(e=>{console.error(e instanceof Error?e.message:'The reminder check failed.');process.exitCode=1;});
