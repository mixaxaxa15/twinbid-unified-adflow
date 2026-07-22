const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizeProviderError,requestAtlasLlm}=require('../lib/atlas-llm');
const {JobLock}=require('../lib/job-lock');

test('Atlas LLM logs provider error and retries with compact request',async()=>{
  const calls=[];const logs=[];
  const fetchImpl=async(_url,options)=>{calls.push(JSON.parse(options.body));if(calls.length===1)return{ok:false,status:400,json:async()=>({error:{message:'upstream timeout',code:'timeout'}})};return{ok:true,status:200,json:async()=>({id:'req-ok',choices:[{message:{content:'{"project":{}}'}}],usage:{total_tokens:12}})}};
  const result=await requestAtlasLlm({apiKey:'secret',model:'test',messages:[{role:'user',content:'large'}],retryMessages:[{role:'user',content:'small'}],maxTokens:5000,retryMaxTokens:2000,fetchImpl,log:(...args)=>logs.push(args),timeoutMs:100,retryTimeoutMs:100});
  assert.equal(result.attempt,2);assert.equal(calls[1].messages[0].content,'small');assert.equal(calls[1].max_tokens,2000);assert.ok(logs.some(([,event,details])=>event==='llm.attempt.failed'&&details.providerCode==='timeout'&&details.willRetry));
});

test('provider error summary excludes unrelated response data',()=>{const summary=summarizeProviderError({error:{message:'bad',code:'x'},secret:'do-not-log'},400);assert.deepEqual(summary,{status:400,message:'bad',providerCode:'x',providerType:'',providerRequestId:''})});

test('job lock rejects concurrent request and releases only its owner',()=>{const lock=new JobLock(1000);const first=lock.acquire('client','one',100);assert.equal(first.ok,true);assert.equal(lock.acquire('client','two',200).ok,false);lock.release(first.key,'two');assert.equal(lock.acquire('client','three',300).ok,false);lock.release(first.key,'one');assert.equal(lock.acquire('client','four',400).ok,true)});
