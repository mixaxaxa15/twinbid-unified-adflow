(function () {
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
  function go(url) { if (url) window.location.href = url; }

  function setTheme(config) {
    document.title = config.meta?.title || "Prelander";
    if (config.theme?.accent) document.documentElement.style.setProperty("--accent", config.theme.accent);
    if (config.theme?.accent2) document.documentElement.style.setProperty("--accent-2", config.theme.accent2);
    if (config.assets?.background) document.documentElement.style.setProperty("--bg-image", `url('${config.assets.background}')`);
    document.body.classList.toggle("blur-bg", !!config.behavior?.blurBackground);
  }

  function modalHtml() { return `<div class="modal" id="modal"><div class="modal-card" id="modal-card"></div></div>`; }

  function showModal(html) {
    const modal = qs("#modal"), card = qs("#modal-card");
    if (!modal || !card) return;
    card.innerHTML = html;
    modal.classList.add("show");
  }

  function bindModalGo(config, url) {
    setTimeout(() => qs("#modal-go")?.addEventListener("click", () => go(url || config.links?.primary)), 0);
  }

  function renderAgeGate(config) {
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "18+"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="row"><button class="btn btn-primary" id="primary-action">${config.texts.primaryCta || "Да"}</button><button class="btn btn-secondary" id="secondary-action">${config.texts.secondaryCta || "Нет"}</button></div></div></div></div>${modalHtml()}`;
  }
  function bindAgeGate(config) { qs("#primary-action")?.addEventListener("click", () => go(config.links.primary)); qs("#secondary-action")?.addEventListener("click", () => go(config.links.secondary)); }

  function renderProgressiveReveal(config) {
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "18+"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="preview-box" id="reveal-box"><img class="preview-img" src="${config.assets.revealImage}" alt=""><div class="tiles" id="tiles"></div></div><div style="height:12px"></div><button class="btn btn-primary" id="reveal-btn">${config.texts.primaryCta || "Открыть ещё"}</button></div></div></div>${modalHtml()}`;
  }
  function bindProgressiveReveal(config) {
    const tiles = qs("#tiles"), btn = qs("#reveal-btn"); let clicks = 0; const total = config.behavior?.tiles || 9;
    for (let i = 0; i < total; i++) { const tile = document.createElement("div"); tile.className = "tile"; tiles.appendChild(tile); }
    const tileEls = qsa(".tile", tiles); const maxClicks = config.behavior?.revealClicks || 3;
    btn?.addEventListener("click", () => {
      clicks++;
      if (clicks <= maxClicks) {
        const perStep = Math.ceil(total / maxClicks);
        for (let i = (clicks - 1) * perStep; i < Math.min(total, clicks * perStep); i++) tileEls[i]?.classList.add("hidden");
      } else go(config.links.primary);
    });
  }

  function renderFakePlayer(config) {
    return `<div class="screen"><div class="container"><div class="card center"><div class="preview-box" id="player-box"><img class="preview-img ${config.behavior?.blurPreview ? 'blurred' : ''}" src="${config.assets.previewImage}" alt=""><div class="overlay-center"><button class="play-btn" id="play-btn">▶</button></div></div><div style="height:14px"></div><div class="badge">${config.texts.badge || "18+"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div></div></div>${modalHtml()}`;
  }
  function bindFakePlayer(config) { qs("#player-box")?.addEventListener("click", () => go(config.links.primary)); }

  function renderLoading(config) {
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Подготовка"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="progress"><div class="progress-bar" id="progress-bar"></div></div><div style="height:14px"></div><div class="small" id="progress-text">${config.texts.loadingText || "0%"}</div></div></div></div>${modalHtml()}`;
  }
  function bindLoading(config) {
    const bar = qs("#progress-bar"), text = qs("#progress-text"); let p = 0;
    const interval = setInterval(() => { p += 5; bar.style.width = `${p}%`; text.textContent = `${config.texts.loadingPrefix || "Загрузка"} ${p}%`; if (p >= 100) { clearInterval(interval); setTimeout(() => go(config.links.primary), 450); } }, config.behavior?.speed || 90);
  }

  function renderCategorySelect(config) {
    const items = (config.items || []).map(item => `<div class="choice-card" data-url="${item.url || config.links.primary}">${item.image ? `<img src="${item.image}" alt="">` : ""}<div class="choice-card-title">${item.title}</div>${item.subtitle ? `<div class="choice-card-sub">${item.subtitle}</div>` : ""}</div>`).join("");
    return `<div class="screen"><div class="container"><div class="card"><div class="center"><div class="badge">${config.texts.badge || "Выберите вариант"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="grid-2">${items}</div></div></div></div>${modalHtml()}`;
  }
  function bindCategorySelect() { qsa(".choice-card").forEach(card => card.addEventListener("click", () => go(card.dataset.url))); }

  function renderPremiumUnlock(config) {
    const lockVisual = config.assets.lockImage ? `<img class="lock-image" src="${config.assets.lockImage}" alt="">` : `<div class="lock-icon">${config.texts.lockIcon || "🔒"}</div>`;
    return `<div class="screen"><div class="container"><div class="card center"><div class="preview-box">${config.assets.previewImage ? `<img class="preview-img ${config.behavior?.blurPreview ? 'blurred' : ''}" src="${config.assets.previewImage}" alt="">` : ""}<div class="overlay-center">${lockVisual}</div></div><div style="height:14px"></div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><button class="btn btn-primary" id="unlock-btn">${config.texts.primaryCta || "Разблокировать"}</button></div></div></div>${modalHtml()}`;
  }
  function bindPremiumUnlock(config) { qs("#unlock-btn")?.addEventListener("click", () => go(config.links.primary)); }

  function renderQuiz(config) {
    return `<div class="screen"><div class="container"><div class="card" id="quiz-card"><div class="center"><div class="badge">${config.texts.badge || "Квиз"}</div><h1 class="title" id="quiz-title"></h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="col" id="quiz-options"></div></div></div></div>${modalHtml()}`;
  }
  function bindQuiz(config) {
    let step = 0; const title = qs("#quiz-title"), options = qs("#quiz-options");
    function renderStep() { const q = config.questions[step]; title.textContent = q.title; options.innerHTML = ""; q.options.forEach(opt => { const btn = document.createElement("button"); btn.className = "btn btn-secondary"; btn.textContent = opt.label; btn.addEventListener("click", () => { if (step < config.questions.length - 1) { step++; renderStep(); } else { if (config.behavior?.resultBeforeRedirect) { showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Готово"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || config.texts.primaryCta || "Перейти"}</button>`); bindModalGo(config); } else go(config.links.primary); } }); options.appendChild(btn); }); }
    renderStep();
  }

  function renderNearby(config) {
    const profiles = (config.items || []).map(item => `<div class="profile-card" data-url="${item.url || config.links.primary}">${item.image ? `<img class="${config.behavior?.blurCards ? 'blurred' : ''}" src="${item.image}" alt="">` : ""}<div class="profile-name">${item.title}</div>${item.subtitle ? `<div class="profile-meta">${item.subtitle}</div>` : ""}</div>`).join("");
    return `<div class="screen"><div class="container"><div class="card"><div class="center"><div class="badge">${config.texts.badge || "Nearby"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="progress"><div class="progress-bar" id="nearby-progress"></div></div><div style="height:12px"></div><div class="grid-2" id="nearby-grid" style="opacity:.55; pointer-events:none;">${profiles}</div></div></div></div>${modalHtml()}`;
  }
  function bindNearby() { const bar = qs("#nearby-progress"), grid = qs("#nearby-grid"); let p = 0; const i = setInterval(() => { p += 10; bar.style.width = `${p}%`; if (p >= 100) { clearInterval(i); grid.style.opacity = "1"; grid.style.pointerEvents = "auto"; } }, 110); qsa(".profile-card").forEach(card => card.addEventListener("click", () => go(card.dataset.url))); }

  function renderCarousel(config) {
    const top = config.items[0];
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Profiles"}</div><div class="carousel"><div class="carousel-card"><img src="${top.image}" alt=""><div class="carousel-info"><div class="title" style="font-size:24px;margin-bottom:6px" id="carousel-name">${top.title}</div><div class="subtitle" style="margin:0" id="carousel-meta">${top.subtitle || ""}</div></div></div></div><div style="height:14px"></div><div class="row"><button class="btn btn-secondary" id="skip-btn">${config.texts.secondaryCta || "Пропустить"}</button><button class="btn btn-primary" id="like-btn">${config.texts.primaryCta || "Нравится"}</button></div></div></div></div>${modalHtml()}`;
  }
  function bindCarousel(config) { const name = qs("#carousel-name"), meta = qs("#carousel-meta"), img = qs(".carousel-card img"); let idx = 0, actions = 0; function next() { idx = (idx + 1) % config.items.length; const item = config.items[idx]; img.src = item.image; name.textContent = item.title; meta.textContent = item.subtitle || ""; actions++; if (actions >= (config.behavior?.actionsBeforeRedirect || 3)) go(config.links.primary); } qs("#skip-btn")?.addEventListener("click", next); qs("#like-btn")?.addEventListener("click", next); }

  function renderGridUnlock(config) {
    const items = (config.items || []).map(item => `<div class="profile-card">${item.image ? `<img class="${config.behavior?.blurCards ? 'blurred' : ''}" src="${item.image}" alt="">` : ""}<div class="profile-name">${item.title}</div></div>`).join("");
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Profiles"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="grid-2">${items}</div><div style="height:14px"></div><button class="btn btn-primary" id="grid-unlock">${config.texts.primaryCta || "Открыть"}</button></div></div></div>${modalHtml()}`;
  }
  function bindGridUnlock(config) { qs("#grid-unlock")?.addEventListener("click", () => go(config.links.primary)); }

  function renderChatPreview(config) {
    const name = config.texts.title || "Новый контакт";
    const initial = String(name).trim().charAt(0).toUpperCase() || "●";
    const avatar = config.assets.avatarImage ? `<img src="${config.assets.avatarImage}" alt="">` : `<span>${initial}</span>`;
    const intro = config.texts.subtitle ? `<div class="chat-message-row incoming"><div class="chat-mini-avatar">${avatar}</div><div class="chat-bubble chat-incoming"><span>${config.texts.subtitle}</span><small class="chat-time">сейчас</small></div></div>` : "";
    const messages = (config.items || []).map((item,index) => { const outgoing=item.side==="outgoing"; return `<div class="chat-message-row ${outgoing?'outgoing':'incoming'}" style="--message-index:${index}">${!outgoing&&index===0?'':!outgoing?'<span class="chat-avatar-spacer"></span>':''}<div class="chat-bubble ${outgoing?'chat-outgoing':'chat-incoming'}"><span>${item.title}</span><small class="chat-time">${item.time || "сейчас"}</small></div></div>`; }).join("");
    return `<div class="screen"><div class="container chat-container"><div class="card chat-card"><div class="chat-app"><div class="chat-header"><span class="chat-back">‹</span><div class="chat-avatar">${avatar}<i></i></div><div class="chat-person"><strong class="chat-name">${name}</strong><span class="chat-status">в сети</span></div><span class="chat-more">•••</span></div><div class="chat-thread"><div class="chat-day">${config.texts.badge || "Сегодня"}</div>${intro}${messages}<div class="chat-message-row incoming chat-typing-row"><span class="chat-avatar-spacer"></span><div class="chat-bubble chat-incoming chat-typing"><i></i><i></i><i></i></div></div></div><button class="chat-composer" id="chat-open"><span>${config.texts.primaryCta || "Написать сообщение"}</span><b class="chat-send">➤</b></button></div></div></div></div>${modalHtml()}`;
  }
  function bindChatPreview(config) { qs("#chat-open")?.addEventListener("click", () => go(config.links.primary)); }

  function renderWheel(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Bonus"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="wheel-wrap"><div class="pointer"></div><div class="wheel" id="wheel">${config.assets?.wheelSkin ? `<img class="archive-wheel-skin" src="${config.assets.wheelSkin}" alt="">` : ""}</div></div><div style="height:14px"></div><button class="btn btn-primary" id="spin-btn">${config.texts.primaryCta || "Крутить"}</button></div></div></div>${modalHtml()}`; }
  function bindWheel(config) { let spun = false; qs("#spin-btn")?.addEventListener("click", () => { if (spun) return; spun = true; qs("#wheel").style.transform = `rotate(${config.behavior?.rotation || 1830}deg)`; setTimeout(() => { showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Бонус активирован"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`); bindModalGo(config); }, 4100); }); }

  function renderScratch(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Bonus"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="scratch-area"><div class="scratch-reveal">${config.assets?.revealImage ? `<img class="scratch-visual" src="${config.assets.revealImage}" alt="">` : ""}<span class="scratch-reveal-text">${config.texts.revealText || "BONUS"}</span></div><div class="scratch-cover" id="scratch-cover">${config.assets?.coverTexture ? `<img class="scratch-cover-texture" src="${config.assets.coverTexture}" alt="">` : ""}<span class="scratch-cover-label">${config.texts.coverText || "Стереть"}</span></div></div></div></div></div>${modalHtml()}`; }
  function bindScratch(config) { qs("#scratch-cover")?.addEventListener("click", e => { e.currentTarget.classList.add("hidden"); setTimeout(() => { showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Ваш бонус найден"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`); bindModalGo(config); }, 420); }); }

  function renderSlot(config) {
    const settings=config.slotSettings||{},initial=settings.initialSymbol||"?",style=settings.animationStyle||"slide";
    const cells=[1,2,3].map(index=>`<div class="slot-cell slot-direction-${settings[`reel${index}Direction`]||'down'}" id="s${index}"><div class="slot-reel-window"><div class="slot-symbol"><span>${initial}</span></div></div></div>`).join("");
    return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Spin"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="slot slot-animation-${style}">${config.assets?.slotFrame ? `<img class="slot-frame" src="${config.assets.slotFrame}" alt="">` : ""}${cells}</div><button class="btn btn-primary" id="slot-spin">${config.texts.primaryCta || "Spin"}</button></div></div></div>${modalHtml()}`;
  }
  function bindSlot(config) {
    let done=false;const settings=config.slotSettings||{},pool=(config.items||[]).length?config.items:(config.behavior?.symbols||["7","7","7"]).map(label=>({label}));
    const mode=settings.symbolMode||"text",button=qs("#slot-spin"),cells=[qs("#s1"),qs("#s2"),qs("#s3")];
    function showSymbol(cell,item){
      const host=qs(".slot-symbol",cell);if(!host)return;host.replaceChildren();
      if(mode==="image"&&item?.image){const image=document.createElement("img");image.className="slot-symbol-image";image.src=item.image;image.alt="";host.appendChild(image);}
      else{const span=document.createElement("span");span.textContent=item?.label??"?";host.appendChild(span);}
      cell.classList.remove("slot-tick");void cell.offsetWidth;cell.classList.add("slot-tick");
    }
    button?.addEventListener("click",()=>{
      if(done)return;done=true;button.disabled=true;window.TwinBidTracking?.track('slot_spin');
      const base=Math.max(300,Number(settings.spinDuration)||1800),stops=[];
      cells.forEach((cell,index)=>{
        if(!cell)return;cell.classList.add("spinning");let tick=index;
        const interval=Math.max(30,Number(settings[`reel${index+1}TickInterval`])||70);
        const timer=setInterval(()=>{tick=(tick+1)%pool.length;showSymbol(cell,pool[tick]);},interval);
        const stopAt=base+Math.max(0,Number(settings[`reel${index+1}ExtraDuration`])||0);stops.push(stopAt);
        setTimeout(()=>{clearInterval(timer);cell.classList.remove("spinning","slot-tick");const resultIndex=Math.max(0,Math.min(pool.length-1,Number(settings[`reel${index+1}ResultIndex`])||0));showSymbol(cell,pool[resultIndex]);},stopAt);
      });
      const finish=Math.max(...stops,base)+Math.max(0,Number(settings.resultDelay)||0);
      setTimeout(()=>{showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Бонус активирован"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`);bindModalGo(config);},finish);
    });
  }

  function renderPickBox(config) { const items = (config.items || []).map((item, idx) => `<div class="choice-card" data-index="${idx}">${item.image ? `<img class="pick-visual" src="${item.image}" alt="">` : `<div style="font-size:54px;text-align:center;">${item.emoji || "🎁"}</div>`}</div>`).join(""); return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Pick one"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="grid-3" id="pick-grid">${items}</div></div></div></div>${modalHtml()}`; }
  function bindPickBox(config) { qsa("#pick-grid .choice-card").forEach(card => card.addEventListener("click", () => { const item = config.items[+card.dataset.index]; showModal(`<h2 class="title" style="font-size:22px">${item.resultTitle || config.texts.resultTitle || "Результат"}</h2><p class="subtitle">${item.resultText || config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`); bindModalGo(config, item.url || config.links?.primary); })); }

  function renderToplist(config) { const items = (config.items || []).map(item => `<div class="top-card"><div class="product-row">${item.image ? `<img src="${item.image}" alt="">` : ""}<div style="flex:1"><div class="top-name">${item.title}</div>${item.subtitle ? `<div class="top-meta">${item.subtitle}</div>` : ""}${item.rating ? `<div class="rating">★ ${item.rating}</div>` : ""}</div></div><div style="height:10px"></div><button class="btn btn-primary item-link" data-url="${item.url || config.links?.primary}">${item.cta || config.texts.finalCta || "Перейти"}</button></div>`).join(""); return `<div class="screen"><div class="container"><div class="card"><div class="center"><div class="badge">${config.texts.badge || "Top"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="col">${items}</div></div></div></div>${modalHtml()}`; }
  function bindToplist() { qsa(".item-link").forEach(btn => btn.addEventListener("click", () => go(btn.dataset.url))); }

  function renderPrediction(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Прогноз"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="row"><button class="btn btn-secondary pick-prediction">${config.items[0].title}</button><button class="btn btn-secondary pick-prediction">${config.items[1].title}</button></div></div></div></div>${modalHtml()}`; }
  function bindPrediction(config) { qsa(".pick-prediction").forEach(btn => btn.addEventListener("click", () => { showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Прогноз принят"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`); bindModalGo(config); })); }

  function renderFreebet(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Bonus"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><button class="btn btn-primary" id="freebet-btn">${config.texts.finalCta || "Забрать"}</button></div></div></div>${modalHtml()}`; }
  function bindFreebet(config) { qs("#freebet-btn")?.addEventListener("click", () => go(config.links.primary)); }

  function renderCountdown(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Limited time"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="countdown" id="countdown">00:${String(config.behavior?.seconds || 30).padStart(2,'0')}</div><button class="btn btn-primary" id="countdown-btn">${config.texts.finalCta || "Перейти"}</button></div></div></div>${modalHtml()}`; }
  function bindCountdown(config) { let total = config.behavior?.seconds || 30; const el = qs("#countdown"); const timer = setInterval(() => { total--; if (el) { const mm = String(Math.floor(total/60)).padStart(2,"0"), ss = String(total%60).padStart(2,"0"); el.textContent = `${mm}:${ss}`; } if (total <= 0) clearInterval(timer); }, 1000); qs("#countdown-btn")?.addEventListener("click", () => go(config.links.primary)); }

  function renderBeforeAfter(config) { return `<div class="screen"><div class="container"><div class="card"><div class="center"><div class="badge">${config.texts.badge || "Story"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="before-after"><div class="item"><img src="${config.assets.beforeImage}" alt=""><div class="small">${config.texts.beforeLabel || "До"}</div></div><div class="item"><img src="${config.assets.afterImage}" alt=""><div class="small">${config.texts.afterLabel || "После"}</div></div></div><div style="height:12px"></div><div class="notice">${config.texts.storyText || ""}</div><div style="height:14px"></div><button class="btn btn-primary" id="story-btn">${config.texts.finalCta || "Посмотреть"}</button></div></div></div>${modalHtml()}`; }
  function bindBeforeAfter(config) { qs("#story-btn")?.addEventListener("click", () => go(config.links.primary)); }

  function renderProductTimer(config) { return `<div class="screen"><div class="container"><div class="card"><div class="product-row">${config.assets.productImage ? `<img src="${config.assets.productImage}" alt="">` : ""}<div style="flex:1"><div class="badge">${config.texts.badge || "Offer"}</div><h1 class="title" style="font-size:22px">${config.texts.title}</h1><p class="subtitle" style="margin:0">${config.texts.subtitle || ""}</p></div></div><div style="height:12px"></div><div class="countdown" id="countdown">00:${String(config.behavior?.seconds || 45).padStart(2,'0')}</div><button class="btn btn-primary" id="product-btn">${config.texts.finalCta || "Получить"}</button></div></div></div>${modalHtml()}`; }
  function bindProductTimer(config) { let total = config.behavior?.seconds || 45; const el = qs("#countdown"); const timer = setInterval(() => { total--; if (el) el.textContent = `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`; if (total <= 0) clearInterval(timer); }, 1000); qs("#product-btn")?.addEventListener("click", () => go(config.links.primary)); }

  function renderCalculator(config) { return `<div class="screen"><div class="container"><div class="card"><div class="center"><div class="badge">${config.texts.badge || "Calculator"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p></div><div class="col"><input class="input" id="amount" type="number" placeholder="${config.texts.amountPlaceholder || 'Сумма'}"><input class="input" id="months" type="number" placeholder="${config.texts.monthsPlaceholder || 'Срок'}"><button class="btn btn-primary" id="calc-btn">${config.texts.primaryCta || "Рассчитать"}</button></div></div></div></div>${modalHtml()}`; }
  function bindCalculator(config) { qs("#calc-btn")?.addEventListener("click", () => { const amount = +qs("#amount").value || 0, months = +qs("#months").value || 1, rate = config.behavior?.monthlyRate || 0.12, monthly = Math.round((amount * (1 + rate)) / months); showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Результат"}</h2><div class="kv"><span>${config.texts.kvAmount || "Сумма"}</span><strong>${amount}</strong></div><div class="kv"><span>${config.texts.kvMonths || "Срок"}</span><strong>${months}</strong></div><div class="kv"><span>${config.texts.kvPayment || "Платёж"}</span><strong>${monthly}</strong></div><div style="height:12px"></div><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Перейти"}</button>`); bindModalGo(config); }); }

  function renderResultCheck(config) { return `<div class="screen"><div class="container"><div class="card center"><div class="badge">${config.texts.badge || "Check"}</div><h1 class="title">${config.texts.title}</h1><p class="subtitle">${config.texts.subtitle || ""}</p><div class="progress"><div class="progress-bar" id="progress-bar"></div></div><div style="height:12px"></div><div class="small" id="progress-text">${config.texts.loadingText || "Запуск проверки"}</div></div></div></div>${modalHtml()}`; }
  function bindResultCheck(config) { const bar = qs("#progress-bar"), text = qs("#progress-text"), steps = config.behavior?.steps || ["Запуск проверки","Проверка данных","Анализ","Подготовка результата"]; let idx = 0, percent = 0; const int = setInterval(() => { percent += 25; idx = Math.min(idx+1, steps.length-1); bar.style.width = `${percent}%`; text.textContent = steps[idx]; if (percent >= 100) { clearInterval(int); showModal(`<h2 class="title" style="font-size:22px">${config.texts.resultTitle || "Проверка завершена"}</h2><p class="subtitle">${config.texts.resultText || ""}</p><button class="btn btn-primary" id="modal-go">${config.texts.finalCta || "Открыть результат"}</button>`); bindModalGo(config); } }, 450); }

  function renderByType(config) {
    const map = { age_gate: renderAgeGate, progressive_reveal: renderProgressiveReveal, fake_player: renderFakePlayer, loading: renderLoading, category_select: renderCategorySelect, premium_unlock: renderPremiumUnlock, quiz: renderQuiz, nearby_profiles: renderNearby, profile_carousel: renderCarousel, grid_unlock: renderGridUnlock, chat_preview: renderChatPreview, wheel: renderWheel, scratch: renderScratch, slot: renderSlot, pick_box: renderPickBox, toplist: renderToplist, prediction: renderPrediction, freebet: renderFreebet, countdown: renderCountdown, survey: renderQuiz, before_after: renderBeforeAfter, product_timer: renderProductTimer, calculator: renderCalculator, approval: renderQuiz, result_check: renderResultCheck };
    return (map[config.type] || (() => `<div class="screen"><div class="container"><div class="card center"><h1 class="title">Unknown template</h1></div></div></div>`))(config);
  }
  function bindByType(config) {
    const map = { age_gate: bindAgeGate, progressive_reveal: bindProgressiveReveal, fake_player: bindFakePlayer, loading: bindLoading, category_select: bindCategorySelect, premium_unlock: bindPremiumUnlock, quiz: bindQuiz, nearby_profiles: bindNearby, profile_carousel: bindCarousel, grid_unlock: bindGridUnlock, chat_preview: bindChatPreview, wheel: bindWheel, scratch: bindScratch, slot: bindSlot, pick_box: bindPickBox, toplist: bindToplist, prediction: bindPrediction, freebet: bindFreebet, countdown: bindCountdown, survey: bindQuiz, before_after: bindBeforeAfter, product_timer: bindProductTimer, calculator: bindCalculator, approval: bindQuiz, result_check: bindResultCheck };
    return (map[config.type] || function(){ })(config);
  }

  window.__renderPrelander = function(config) { setTheme(config); const app = document.getElementById("app"); app.innerHTML = renderByType(config); bindByType(config); };
})();
