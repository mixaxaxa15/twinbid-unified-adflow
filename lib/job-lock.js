class JobLock {
  constructor(ttlMs=180000){this.ttlMs=ttlMs;this.jobs=new Map();}
  acquire(key,requestId,now=Date.now()){
    const safeKey=String(key||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100)||'default';
    const active=this.jobs.get(safeKey);
    if(active&&now-active.startedAt<this.ttlMs)return{ok:false,key:safeKey,active};
    const job={requestId,startedAt:now};this.jobs.set(safeKey,job);return{ok:true,key:safeKey,active:job};
  }
  release(key,requestId){const active=this.jobs.get(key);if(active?.requestId===requestId)this.jobs.delete(key);}
}
module.exports={JobLock};
