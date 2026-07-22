function summarizeProviderError(payload, status) {
  const error = payload && typeof payload === 'object' ? payload.error : null;
  return {
    status,
    message: String(error?.message || payload?.message || payload?.msg || `Atlas LLM HTTP ${status}`).slice(0, 1000),
    providerCode: String(error?.code || payload?.code || '').slice(0, 120),
    providerType: String(error?.type || payload?.type || '').slice(0, 120),
    providerRequestId: String(payload?.request_id || payload?.requestId || '').slice(0, 160),
  };
}

function retryable(error) {
  if (error?.name === 'AbortError' || error?.code === 'ATLAS_LLM_TIMEOUT') return true;
  return [400, 408, 409, 425, 429].includes(error?.status) || Number(error?.status) >= 500;
}

async function oneAttempt({ apiKey, model, messages, maxTokens, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl('https://api.atlascloud.ai/v1/chat/completions', {
      method:'POST', signal:controller.signal,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},
      body:JSON.stringify({model,messages,temperature:0,max_tokens:maxTokens,stream:false,response_format:{type:'json_object'}}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const summary = summarizeProviderError(payload,response.status);
      const error = new Error(summary.message); Object.assign(error,summary); throw error;
    }
    return { model, content:payload.choices?.[0]?.message?.content || '', usage:payload.usage || null, providerRequestId:payload.id || payload.request_id || '' };
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error(`Atlas LLM не ответил за ${Math.round(timeoutMs/1000)} секунд.`);
      timeout.code='ATLAS_LLM_TIMEOUT';timeout.status=408;throw timeout;
    }
    throw error;
  } finally { clearTimeout(timer); }
}

async function requestAtlasLlm(options) {
  const {
    apiKey,model,messages,maxTokens=2048,retryMessages=messages,retryMaxTokens=Math.min(maxTokens,2800),
    timeoutMs=60000,retryTimeoutMs=45000,fetchImpl=fetch,log=()=>{},requestId='',operation='llm',
  }=options;
  if(!apiKey)throw new Error('Добавьте ATLASCLOUD_API_KEY в .env.');
  const attempts=[{messages,maxTokens,timeoutMs,mode:'full'},{messages:retryMessages,maxTokens:retryMaxTokens,timeoutMs:retryTimeoutMs,mode:'compact'}];
  let lastError;
  for(let index=0;index<attempts.length;index++){
    const attempt=attempts[index],startedAt=Date.now();
    log('info','llm.attempt.start',{requestId,operation,attempt:index+1,mode:attempt.mode,model,maxTokens:attempt.maxTokens,timeoutMs:attempt.timeoutMs});
    try{
      const result=await oneAttempt({apiKey,model,fetchImpl,...attempt});
      log('info','llm.attempt.success',{requestId,operation,attempt:index+1,mode:attempt.mode,model,durationMs:Date.now()-startedAt,usage:result.usage,providerRequestId:result.providerRequestId});
      return {...result,attempt:index+1,mode:attempt.mode};
    }catch(error){
      lastError=error;
      log('error','llm.attempt.failed',{requestId,operation,attempt:index+1,mode:attempt.mode,model,durationMs:Date.now()-startedAt,status:error.status||0,code:error.code||'',providerCode:error.providerCode||'',providerType:error.providerType||'',providerRequestId:error.providerRequestId||'',message:String(error.message||error).slice(0,1000),willRetry:index===0&&retryable(error)});
      if(index===attempts.length-1||!retryable(error))break;
    }
  }
  throw lastError;
}

module.exports={summarizeProviderError,retryable,requestAtlasLlm};
