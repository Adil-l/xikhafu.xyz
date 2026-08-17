
(() => {
  const KEY = "paoCadaDiaUnifiedV3";
  const CACHE_RESET_VERSION = "20260807-clean-slate-1";
  const SESSION_KEY = `${KEY}:session`;
  const CLOUD_SESSION_KEY = `${KEY}:cloudSession`;
  const DEVICE_KEY = `${KEY}:deviceId`;
  const SUPABASE_URL = "https://ybuibskdiynfoubqrczt.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlidWlic2tkaXluZm91YnFyY3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTU3MzAsImV4cCI6MjA5MTg3MTczMH0.9-F3RNTh-XA-wRu4aMGWlIrRzQMIthkVNgE8fWmS1hQ";
  const RECHARGE_NUMBER = "876760317";
  const REMOVED_PRODUCT_IDS = new Set([3,4,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);
  const OPENING_PHRASES = [
    "O estômago já enviou três notificações.",
    "O padeiro está a observar...",
    "Hoje promete muita badjia.",
    "A dieta começa segunda."
  ];
  const openingPhrase = OPENING_PHRASES[Math.floor(Math.random()*OPENING_PHRASES.length)];
  const USER_ROSTER = [
    {id:1,name:"Adilson Gavumende",avatar:"👨🏽‍💻",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:8,name:"Daniel Jacinto",avatar:"🐯",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:11,name:"Deolinda Nguenha",avatar:"🌻",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:15,name:"Dilma Lineco",avatar:"🌺",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:9,name:"Edson Mangaho",avatar:"😎",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:16,name:"Edson Vasconcelos",avatar:"🧑🏽‍💼",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:7,name:"Elias Bernado",avatar:"🦅",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:3,name:"Gisela Capitine",avatar:"🐼",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:17,name:"Isabel Pedro",avatar:"💐",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:12,name:"Jorge Pacule",avatar:"🐻",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:2,name:"Kelton Tesoura",avatar:"🦁",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:13,name:"Luisa Matola",avatar:"🦋",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:18,name:"Mr Guze",avatar:"👑",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:10,name:"Nehemias Tovela",avatar:"🐺",pin:"",pinConfigured:false,monthlyBalance:0,active:true},
    {id:14,name:"Wesley Ussene",avatar:"⚡",pin:"",pinConfigured:false,monthlyBalance:0,active:true}
  ];
  const MENU_PRODUCTS = [
    {id:1,name:"Bread",icon:"🥖",price:16,category:"Pães",active:true,options:[]},
    {id:2,name:"Badjia",icon:"🥟",price:3,category:"Salgados",active:true,options:[{key:"piri",label:"Piri-piri",choices:[{label:"Sem piri-piri"},{label:"Com piri-piri"}]}]},
    {id:5,name:"Chamuça",icon:"🔺",price:12,category:"Salgados",active:true,options:[{key:"piri",label:"Piri-piri",choices:[{label:"Sem piri-piri"},{label:"Com piri-piri"}]}]},
    {id:6,name:"Rissol",icon:"🥐",price:12,category:"Salgados",active:true,options:[{key:"piri",label:"Piri-piri",choices:[{label:"Sem piri-piri"},{label:"Com piri-piri"}]}]},
    {id:12,name:"Bolos",icon:"🍰",price:0,category:"Doces",active:true,contactForFlavor:true},
  ];
  const monthName = new Intl.DateTimeFormat("pt-PT",{month:"long",year:"numeric",timeZone:"Africa/Maputo"}).format(new Date());
  const seed = {
    settings:{balancePolicy:"block"},
    users:USER_ROSTER.map(u=>({...u})),
    products:MENU_PRODUCTS.map(p=>structuredClone(p)),
    orders:[],
    recharges:[],
    donationPledges:[],
    session:{mode:null,userId:null}
  };

  function clearClientCache(){
    let shouldClearCaches=false;
    try{
      const resetKey=`${KEY}:cacheReset`;
      if(localStorage.getItem(resetKey)!==CACHE_RESET_VERSION){
        shouldClearCaches=true;
        Object.keys(localStorage).filter(key=>key===KEY||key.startsWith(`${KEY}:`)).forEach(key=>localStorage.removeItem(key));
        localStorage.setItem(resetKey,CACHE_RESET_VERSION);
      }
      Object.keys(sessionStorage).filter(key=>key===KEY||key.startsWith(`${KEY}:`)).forEach(key=>sessionStorage.removeItem(key));
    }catch{}
    if(shouldClearCaches&&"caches" in window)void caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).catch(()=>{});
  }
  clearClientCache();

  let state = load();
  state.session = loadSession(state.session);
  save();
  let cloudCredentials = loadCloudCredentials();
  if(!["user","admin"].includes(state.session.mode)){state.session={mode:null,userId:null};save()}
  const cloudPinStates = new Map();
  const deviceId = loadDeviceId();
  ensureOperationalKeys();
  save();
  let page = "home";
  let cart = {};
  let cartChoices = {};
  let customRequest = "";
  let adminCart = {};
  let adminCartChoices = {};
  let adminCustomRequest = "";
  let customOpen = {user:false};
  let category = "Todos";
  let orderFilter = "Todos";
  let adminOrderDate = "";
  let adminSection = "dashboard";
  let pendingAdminDeduction = null;
  let orderSchedule = "today";
  let modalOpener = null;
  let modalCloseAction = null;

  const app = document.getElementById("app");
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const fmt = n => new Intl.NumberFormat("pt-PT").format(Math.round(n));
  const esc = value => String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  const byName = (a,b) => a.name.localeCompare(b.name,"pt",{sensitivity:"base"});
  const canOrderProduct = p => Boolean(p?.active);
  const isThisMonth = d => localDateKey(d).slice(0,7)===localDateKey().slice(0,7);
  const today = d => localDateKey(d)===localDateKey();
  const product = id => state.products.find(p=>p.id===Number(id));
  const user = id => state.users.find(u=>u.id===Number(id));
  const itemPrice = i => i.unitPrice!=null?Number(i.unitPrice||0):Number(product(i.productId)?.price||0);
  const orderTotal = o => (o.items||[]).reduce((s,i)=>s+itemPrice(i)*i.qty,0)+Number(o.customPrice||0)+Number(o.guestDonation||0);
  const orderTotalLabel = o => {const total=orderTotal(o);return o.needsContact?(total>0?`${fmt(total)} MT + confirmar`:"A confirmar"):`${fmt(total)} MT`};
  const localDateKey = (value=new Date()) => new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Maputo",year:"numeric",month:"2-digit",day:"2-digit"}).format(value instanceof Date?value:new Date(value));
  const activeUser = () => user(state.session.userId);

  function cleanRemovedProducts(data){
    const rosterUpdated=Number(data.settings?.userRosterVersion||0)>=2;
    const pinSetupUpdated=Number(data.settings?.pinSetupVersion||0)>=1;
    const menuUpdated=Number(data.settings?.menuVersion||0)>=1;
    const accountsReset=Number(data.settings?.accountsResetVersion||0)>=1;
    const cleanSlateUpdated=Number(data.settings?.cleanSlateVersion||0)>=1;
    const cloudPinUpdated=Number(data.settings?.cloudPinVersion||0)>=1;
    data.settings={...seed.settings,...(data.settings||{}),balancePolicy:"block"};
    delete data.settings.donationDay;
    delete data.settings.donationGoal;
    delete data.settings.adminPin;
    if(!rosterUpdated){
      const existing=data.users||[],rosterIds=new Set(USER_ROSTER.map(u=>Number(u.id)));
      const current=USER_ROSTER.map(def=>{const found=existing.find(u=>Number(u.id)===Number(def.id));return found?{...found,name:def.name,avatar:def.avatar,active:true,legacyHidden:false}:{...def}});
      const legacy=existing.filter(u=>!rosterIds.has(Number(u.id))).map(u=>({...u,active:false,legacyHidden:true}));
      data.users=[...current,...legacy];data.settings.userRosterVersion=2;
    }
    if(!pinSetupUpdated){data.users=(data.users||[]).map(u=>u.legacyHidden?u:{...u,pin:"",pinConfigured:false});data.settings.pinSetupVersion=1}
    if(!accountsReset){const resetAt=new Date().toISOString();data.users=(data.users||[]).map(u=>u.legacyHidden?u:{...u,monthlyBalance:0,pin:"",pinConfigured:false,balanceResetAt:resetAt});data.settings.accountsResetVersion=1;data.session={mode:null,userId:null}}
    if(!menuUpdated){
      const oldProducts=data.products||[];
      data.orders=(data.orders||[]).map(o=>({...o,items:(o.items||[]).map(i=>{if(i.unitPrice!=null)return i;const old=oldProducts.find(p=>Number(p.id)===Number(i.productId));return {...i,unitPrice:Number(old?.price||0)}})}));
      data.products=MENU_PRODUCTS.map(p=>structuredClone(p));data.settings.menuVersion=1;
    }
    if(!cleanSlateUpdated){
      const resetAt=new Date().toISOString();
      data.users=(data.users||[]).map(u=>({...u,monthlyBalance:0,pin:"",pinConfigured:false,balanceResetAt:resetAt}));
      data.orders=[];data.recharges=[];data.donationPledges=[];data.session={mode:null,userId:null};
      data.settings.cleanSlateVersion=1;
    }
    if(!cloudPinUpdated){data.users=(data.users||[]).map(u=>({...u,pin:"",pinConfigured:false}));data.session={mode:null,userId:null};data.settings.cloudPinVersion=1}
    const productIds=new Set(),productNames=new Set();
    data.products=(data.products||[]).filter(p=>{const id=Number(p.id),name=String(p.name||"").trim().toLocaleLowerCase("pt");if(REMOVED_PRODUCT_IDS.has(id)||productIds.has(id)||productNames.has(name))return false;productIds.add(id);productNames.add(name);return true});
    data.products=data.products.map(p=>Number(p.id)===1?{...p,name:"Bread",category:"Pães",price:16,options:[]}:Number(p.id)===2?{...p,name:"Badjia",price:3}:Number(p.id)===5?{...p,name:"Chamuça",price:12,options:(p.options||[]).filter(group=>group.key!=="preco")}:Number(p.id)===6?{...p,name:"Rissol",price:12}:p);
    data.orders=(data.orders||[]).map(o=>({...o,items:(o.items||[]).filter(i=>!REMOVED_PRODUCT_IDS.has(Number(i.productId)))}));
    data.donationPledges=data.donationPledges||[];
    return data;
  }
  function load(){try{return cleanRemovedProducts(JSON.parse(localStorage.getItem(KEY))||structuredClone(seed))}catch{return cleanRemovedProducts(structuredClone(seed))}}
  function loadSession(fallback={mode:null,userId:null}){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY))||fallback||{mode:null,userId:null}}catch{return fallback||{mode:null,userId:null}}}
  function loadCloudCredentials(){sessionStorage.removeItem(CLOUD_SESSION_KEY);return {}}
  function storeCloudCredentials(value){cloudCredentials=value||{};sessionStorage.removeItem(CLOUD_SESSION_KEY)}
  function loadDeviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;localStorage.setItem(DEVICE_KEY,id)}return id}
  function save(){
    const sharedState={...state,session:{mode:null,userId:null}};
    localStorage.setItem(KEY,JSON.stringify(sharedState));
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(state.session||{mode:null,userId:null}));
  }
  function reset(){localStorage.removeItem(KEY);sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(CLOUD_SESSION_KEY);cloudCredentials={};state=cleanRemovedProducts(structuredClone(seed));page="home";adminSection="dashboard";cart={};cartChoices={};adminCart={};adminCartChoices={};customRequest="";adminCustomRequest="";orderSchedule="today";save();render();focusMain()}
  async function cloudRpc(name,body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${SUPABASE_ANON_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller.signal});if(!response.ok)throw new Error(`Supabase ${name}: ${response.status}`);const text=await response.text();return text?JSON.parse(text):null}finally{clearTimeout(timeout)}}
  async function getCloudPinStatus(id){try{const status=await cloudRpc("user_pin_status",{p_user_id:Number(id)});cloudPinStates.set(Number(id),status);return status}catch{cloudPinStates.set(Number(id),"offline");return "offline"}}
  async function loadAdminPinStates(){if(!cloudCredentials.adminPin)return;try{const rows=await cloudRpc("admin_pin_states",{p_admin_pin:cloudCredentials.adminPin});(rows||[]).forEach(row=>cloudPinStates.set(Number(row.user_id),row.locked_until&&new Date(row.locked_until)>new Date()?"locked":row.pin_status));return rows||[]}catch{return []}}
  async function loadCloudRanking(){const rows=await cloudRpc("load_public_app_hall",{});if(!Array.isArray(rows))throw new Error("Hall indisponível");return rows}
  function stableSyncKey(kind,row){return row.syncKey||`${deviceId}:${kind}:${row.id||Date.parse(row.date)||Date.now()}:${Date.parse(row.date)||0}`}
  function ensureOperationalKeys(){
    state.orders=(state.orders||[]).map(row=>({...row,syncKey:stableSyncKey("order",row)}));
    state.recharges=(state.recharges||[]).map(row=>({...row,syncKey:stableSyncKey("recharge",row)}));
    state.donationPledges=(state.donationPledges||[]).map(row=>{const order=row.orderId?state.orders.find(o=>Number(o.id)===Number(row.orderId)):null;return {...row,syncKey:stableSyncKey("donation",row),orderSyncKey:row.orderSyncKey||order?.syncKey||null}});
  }
  function operationalSettingsPayload(){return {balancePolicy:"block"}}
  function operationalOrderPayload(o){return {sync_key:stableSyncKey("order",o),order_type:o.type,user_id:o.userId||null,guest_name:o.guestName||null,guest_phone:o.guestPhone||null,ordered_at:o.date,status:o.status,items:o.items||[],custom_request:o.customRequest||"",custom_price:Number(o.customPrice||0),needs_contact:Boolean(o.needsContact),guest_donation:Number(o.guestDonation||0),updated_at:o.updatedAt||o.priceAdjustedAt||o.date}}
  function operationalDonationPayload(p){return {sync_key:stableSyncKey("donation",p),order_sync_key:p.orderSyncKey||null,user_id:p.userId||null,donor_name:p.name||"Convidado",amount:Number(p.amount||0),created_at:p.date,updated_at:p.updatedAt||p.date}}
  function mergeCloudSettings(settings){if(!settings)return;Object.assign(state.settings,{balancePolicy:"block",cloudOperationalUpdatedAt:settings.updatedAt})}
  function mergeCloudUser(cloudUser){if(!cloudUser)return;const local=user(cloudUser.id),remoteTime=cloudUser.updatedAt?new Date(cloudUser.updatedAt):null;if(local?.updatedAt&&remoteTime&&remoteTime<new Date(local.updatedAt))return;const updates={name:cloudUser.name,avatar:cloudUser.avatar,active:cloudUser.active};if(cloudUser.monthlyBalance!=null)updates.monthlyBalance=Number(cloudUser.monthlyBalance||0);if("balanceResetAt" in cloudUser)updates.balanceResetAt=cloudUser.balanceResetAt;if(cloudUser.updatedAt)updates.cloudUpdatedAt=cloudUser.updatedAt;if(local)Object.assign(local,updates);else state.users.push({...cloudUser,...updates,pin:"",pinConfigured:true,monthlyBalance:Number(cloudUser.monthlyBalance||0)})}
  function mergeCloudProduct(cloudProduct){if(!cloudProduct||REMOVED_PRODUCT_IDS.has(Number(cloudProduct.id)))return;const normalized=Number(cloudProduct.id)===1?{...cloudProduct,name:"Bread",category:"Pães",price:16,options:[]}:Number(cloudProduct.id)===2?{...cloudProduct,name:"Badjia",price:3}:Number(cloudProduct.id)===5?{...cloudProduct,name:"Chamuça",price:12,options:(cloudProduct.options||[]).filter(group=>group.key!=="preco")}:Number(cloudProduct.id)===6?{...cloudProduct,name:"Rissol",price:12}:{...cloudProduct};const local=product(normalized.id);if(local)Object.assign(local,normalized);else state.products.push({...normalized,options:normalized.options||[]})}
  function mergeOperationalRows(localRows,cloudRows){const rows=new Map();(localRows||[]).forEach(row=>rows.set(row.syncKey,row));(cloudRows||[]).forEach(remote=>{const local=rows.get(remote.syncKey);if(!local||new Date(remote.updatedAt||remote.date||0)>=new Date(local.updatedAt||local.date||0))rows.set(remote.syncKey,remote)});return [...rows.values()]}
  function touchSettings(){state.settings.updatedAt=new Date().toISOString()}
  async function syncUserOperational(id,pin){
    if(!pin)return false;ensureOperationalKeys();
    const localOrders=state.orders.filter(o=>o.type==="user"&&Number(o.userId)===Number(id));
    const orderResults=await Promise.allSettled(localOrders.map(order=>submitUserOperational(order)));
    if(orderResults.some(result=>result.status==="rejected"))return false;
    const payload={orders:state.orders.filter(o=>o.type==="user"&&Number(o.userId)===Number(id)).map(operationalOrderPayload),donations:(state.donationPledges||[]).filter(p=>Number(p.userId)===Number(id)).map(operationalDonationPayload)};
    try{return await cloudRpc("sync_user_operational_state",{p_user_id:Number(id),p_pin:pin,payload})}catch{return false}
  }
  async function syncAdminOperational(){
    if(!cloudCredentials.adminPin)return false;ensureOperationalKeys();
    const pendingRecharges=(state.recharges||[]).filter(recharge=>recharge.pendingSync);
    if(pendingRecharges.length){const results=await Promise.allSettled(pendingRecharges.map(submitAdminRecharge));if(results.some(result=>result.status==="rejected"||!result.value?.ok))return false}
    const payload={settings:{...operationalSettingsPayload(),updatedAt:state.settings.updatedAt||state.settings.cloudOperationalUpdatedAt||new Date(0).toISOString()},users:state.users.filter(u=>!u.legacyHidden).map(u=>({user_id:Number(u.id),monthly_balance:Number(u.monthlyBalance||0),balance_reset_at:u.balanceResetAt||null,active:Boolean(u.active),updated_at:u.updatedAt||u.cloudUpdatedAt||new Date(0).toISOString()})),orders:state.orders.map(operationalOrderPayload),recharges:(state.recharges||[]).map(r=>({sync_key:stableSyncKey("recharge",r),user_id:Number(r.userId),created_at:r.date,amount:Number(r.amount||0),note:r.note||"Recarga",updated_at:r.updatedAt||r.date})),donations:(state.donationPledges||[]).map(operationalDonationPayload)};
    try{return await cloudRpc("admin_sync_operational_state",{p_admin_pin:cloudCredentials.adminPin,payload})}catch{return false}
  }
  async function hydrateUserOperational(id,pin){
    try{const cloud=await cloudRpc("load_user_operational_state",{p_user_id:Number(id),p_pin:pin});if(!cloud)return false;ensureOperationalKeys();mergeCloudUser(cloud.user);mergeCloudSettings(cloud.settings);state.orders=mergeOperationalRows(state.orders.filter(o=>!(o.type==="user"&&Number(o.userId)===Number(id))),cloud.orders||[]);state.recharges=mergeOperationalRows(state.recharges.filter(r=>Number(r.userId)!==Number(id)),cloud.recharges||[]);state.donationPledges=mergeOperationalRows((state.donationPledges||[]).filter(p=>Number(p.userId)!==Number(id)),cloud.donations||[]);ensureOperationalKeys();save();return true}catch{return false}
  }
  async function hydratePublicBootstrap(){try{const cloud=await cloudRpc("load_public_app_bootstrap",{});if(!cloud)return false;(cloud.users||[]).forEach(mergeCloudUser);(cloud.products||[]).forEach(mergeCloudProduct);mergeCloudSettings(cloud.settings);save();return true}catch{return false}}
  async function hydrateAdminOperational(pin=cloudCredentials.adminPin){
    try{let cloud=await cloudRpc("load_admin_operational_state",{p_admin_pin:pin});if(!cloud)return false;ensureOperationalKeys();const localOrders=state.orders.slice(),localRecharges=state.recharges.slice(),localDonations=state.donationPledges.slice();(cloud.users||[]).forEach(mergeCloudUser);mergeCloudSettings(cloud.settings);state.orders=mergeOperationalRows(localOrders,cloud.orders||[]);state.recharges=mergeOperationalRows(localRecharges,cloud.recharges||[]);state.donationPledges=mergeOperationalRows(localDonations,cloud.donations||[]);ensureOperationalKeys();save();return true}catch{return false}
  }
  async function submitUserOperational(order){try{const result=await cloudRpc("submit_user_order",{p_user_id:Number(order.userId),p_pin:cloudCredentials.userPin,payload:{syncKey:order.syncKey,date:order.date,items:order.items||[],customRequest:order.customRequest||"",needsContact:Boolean(order.needsContact)}});if(!result?.ok)return result||false;order.id=Number(result.id);order.status=result.status||order.status;order.pendingSync=false;order.updatedAt=new Date().toISOString();save();return result}catch{return false}}
  async function submitAdminRecharge(recharge){try{const result=await cloudRpc("admin_add_recharge",{p_admin_pin:cloudCredentials.adminPin,payload:{syncKey:recharge.syncKey,userId:Number(recharge.userId),amount:Number(recharge.amount),note:recharge.note||"Recarga"}});if(!result?.ok)return result||false;recharge.id=Number(result.id)||recharge.id;recharge.date=result.date||recharge.date;recharge.updatedAt=new Date().toISOString();recharge.pendingSync=false;save();return result}catch{return false}}
  async function submitAdminDeduction(movement){try{return await cloudRpc("admin_deduct_balance",{p_admin_pin:cloudCredentials.adminPin,payload:{syncKey:movement.syncKey,userId:Number(movement.userId),amount:Math.abs(Number(movement.amount)),note:movement.note||"Desconto administrativo"}})}catch{return false}}
  async function userSessionStatus(id,pin){try{return await cloudRpc("user_session_status",{p_user_id:Number(id),p_pin:pin})}catch{return null}}
  function toast(text){const e=$("#toast");e.textContent="";requestAnimationFrame(()=>{e.textContent=text;e.classList.add("show")});clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),3600)}
  function focusMain(){requestAnimationFrame(()=>$("#main")?.focus())}
  function openModal(html,onClose=null){const modal=$("#modal"),sheet=$(".sheet"),wasOpen=modal.classList.contains("open");if(!wasOpen)modalOpener=document.activeElement;modalCloseAction=onClose;$("#modalContent").innerHTML=`<div class="modal-brand"><span aria-hidden="true">🍞</span><strong>O Pão de Cada Dia</strong><button class="modal-close" data-close aria-label="Fechar janela"><span aria-hidden="true">×</span></button></div><div class="modal-body">${html}</div>`;const heading=$("#modalContent h3");if(heading){heading.id="modalTitle";heading.tabIndex=-1;sheet.setAttribute("aria-labelledby","modalTitle");sheet.removeAttribute("aria-label")}else{sheet.removeAttribute("aria-labelledby");sheet.setAttribute("aria-label","Janela de diálogo")}modal.classList.add("open");modal.setAttribute("aria-hidden","false");app.inert=true;document.body.classList.add("modal-open");requestAnimationFrame(()=>{(heading||sheet)?.focus()})}
  function closeModal(){const modal=$("#modal");if(!modal.classList.contains("open"))return;const fallback=modalCloseAction;modalCloseAction=null;modal.classList.remove("open");modal.setAttribute("aria-hidden","true");app.inert=false;document.body.classList.remove("modal-open");const restore=modalOpener;modalOpener=null;if(fallback){requestAnimationFrame(fallback);return}if(restore?.isConnected)requestAnimationFrame(()=>restore.focus())}
  function logout(){closeModal();state.session={mode:null,userId:null};storeCloudCredentials({});save();page="home";adminSection="dashboard";cart={};cartChoices={};adminCart={};adminCartChoices={};customRequest="";adminCustomRequest="";orderSchedule="today";customOpen={user:false};render();focusMain()}
  function statusText(s){return s==="paid"?"Pago":s==="debt"?"Dívida antiga":s==="cancelled"?"Cancelado":"Aguardando confirmação"}
  function empty(emoji,text){return `<div class="empty"><div class="emoji">${emoji}</div><p>${text}</p></div>`}
  function afterBalanceReset(id,date){const reset=user(id)?.balanceResetAt;return !reset||new Date(date)>=new Date(reset)}
  function userSpent(id){return state.orders.filter(o=>o.type==="user"&&o.userId===Number(id)&&isThisMonth(o.date)&&afterBalanceReset(id,o.date)&&o.status!=="cancelled").reduce((s,o)=>s+orderTotal(o),0)}
  function userRecharge(id){return state.recharges.filter(r=>r.userId===Number(id)&&Number(r.amount)>0&&isThisMonth(r.date)&&afterBalanceReset(id,r.date)).reduce((s,r)=>s+Number(r.amount||0),0)}
  function userDeduction(id){return state.recharges.filter(r=>r.userId===Number(id)&&Number(r.amount)<0&&isThisMonth(r.date)&&afterBalanceReset(id,r.date)).reduce((s,r)=>s+Math.abs(Number(r.amount||0)),0)}
  function userDonation(id){return (state.donationPledges||[]).filter(p=>p.userId===Number(id)&&isThisMonth(p.date)&&afterBalanceReset(id,p.date)).reduce((s,p)=>s+Number(p.amount||0),0)}
  function userAvailable(id){const u=user(id);return Number(u?.monthlyBalance||0)+userRecharge(id)-userDeduction(id)-userSpent(id)-userDonation(id)}
  function balanceProgress(used,funds){return funds>0?Math.max(0,Math.min(100,Number(used||0)/funds*100)):100}
  function userOrdersAll(id){return state.orders.filter(o=>o.type==="user"&&o.userId===Number(id)&&o.status!=="cancelled")}
  function userItemQty(id,test){return userOrdersAll(id).reduce((sum,o)=>sum+o.items.reduce((total,item)=>{const p=product(item.productId);return total+(p&&test(p)?Number(item.qty):0)},0),0)}
  function userAllSpent(id){return userOrdersAll(id).reduce((sum,o)=>sum+orderTotal(o),0)}
  function balanceMessage(amount){
    if(amount<0)return `O saldo está negativo em ${fmt(Math.abs(amount))} MT. Recarrega antes de fazer outro pedido.`;
    if(amount===0)return "Saldo esgotado. Recarrega para fazer um pedido.";
    if(amount<=50)return `Restam apenas ${fmt(amount)} MT. Escolhe a badjia com sabedoria.`;
    if(amount<=100)return "A carteira está de dieta.";
    if(amount<=150)return "Calma, campeão. O teu saldo já está a pedir água.";
    return `Ainda tens ${fmt(amount)} MT. Está nice!`;
  }
  function showConfetti(){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const layer=document.createElement("div");layer.className="celebration-layer";layer.setAttribute("aria-hidden","true");layer.innerHTML=Array.from({length:14},(_,i)=>`<i style="--i:${i};--x:${(i*37)%100}%;--delay:${(i%5)*35}ms"></i>`).join("");document.body.appendChild(layer);setTimeout(()=>layer.remove(),1500);
  }
  function celebrateOrder(message="Pedido criado com sucesso. 🎉"){showConfetti();toast(message)}
  function balanceRuleModal(total,available){
    openModal(`<div class="balance-decision blocked"><div class="feedback-emoji">🛑</div><div class="eyebrow">MOLA INSUFICIENTE</div><h3>Pedido bloqueado, boss</h3><p>O food custa <strong>${fmt(total)} MT</strong> e tens <strong>${fmt(available)} MT</strong> disponíveis. Recarrega o saldo antes de fazer este pedido.</p><div class="sheet-actions"><button class="primary orange" data-close>ENTENDI, BOSS</button></div></div>`);
  }
  function orderStatusFeedback(){
    showConfetti();
    openModal(`<div class="status-feedback paid"><div class="status-animation" aria-hidden="true"><span>💰</span><b>➜</b><span>🥖</span></div><div class="eyebrow">MAMBO FECHADO</div><h3>Pagamento confirmado!</h3><p>O pedido foi marcado como pago.</p><button class="primary" data-close>ESTÁ NICE ✅</button></div>`);
  }
  function resetPinConfirmModal(u){
    openModal(`<div class="confirm-card"><div class="feedback-emoji">🔐</div><div class="eyebrow">REINICIAR PIN</div><h3>Dar um novo começo a ${esc(u.name)}?</h3><p>No próximo acesso, esta pessoa terá de criar um PIN novo de 4 números.</p><div class="sheet-actions"><button class="secondary" data-close>DEIXAR COMO ESTÁ</button><button class="primary orange" id="confirmResetUserPin" data-id="${u.id}">REINICIAR PIN</button></div></div>`);
  }
  function resetSystemConfirmModal(){
    openModal(`<div class="confirm-card danger"><div class="feedback-emoji">♻️</div><div class="eyebrow">LIMPAR ESTE APARELHO</div><h3>Apagar os dados locais?</h3><p>Os dados guardados neste navegador serão limpos. Os PINs e os dados partilhados permanecem guardados.</p><div class="sheet-actions"><button class="secondary" data-close>CANCELAR</button><button class="primary orange" id="confirmSystemReset">LIMPAR APARELHO</button></div></div>`);
  }
  function orderOwner(o){return o.type==="guest" ? {name:o.guestName||"Convidado",avatar:"👤"} : user(o.userId)||{name:"Utilizador removido",avatar:"❔"}}
  function orderDateLabel(value){const date=new Date(value),dateKey=localDateKey(date),todayKey=localDateKey(),tomorrowKey=localDateKey(scheduledOrderDate()),time=new Intl.DateTimeFormat("pt-PT",{hour:"2-digit",minute:"2-digit",timeZone:"Africa/Maputo"}).format(date);if(dateKey===todayKey)return `Hoje • ${time}`;if(dateKey===tomorrowKey)return `Amanhã • ${time}`;return `${new Intl.DateTimeFormat("pt-PT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Africa/Maputo"}).format(date)} • ${time}`}
  function scheduledOrderDate(){const values=Object.fromEntries(new Intl.DateTimeFormat("en",{timeZone:"Africa/Maputo",year:"numeric",month:"numeric",day:"numeric"}).formatToParts(new Date()).filter(part=>part.type!=="literal").map(part=>[part.type,Number(part.value)]));return new Date(Date.UTC(values.year,values.month-1,values.day+1,4,0,0)).toISOString()}
  function itemSummary(o){const items=(o.items||[]).map(i=>{const choices=Object.values(i.choices||{}).join(", ");return `${esc(product(i.productId)?.icon||"❔")} ×${i.qty}${choices?` (${esc(choices)})`:""}`}).join("  ");const special=o.customRequest?`${items?"  • ":""}📝 ${esc(o.customRequest)}`:"";return `${items}${special}${o.guestDonation?`  • 🚗 ${fmt(o.guestDonation)} MT`:""}`}
  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const field=document.createElement("textarea");field.value=text;field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.select();document.execCommand("copy");field.remove();return Promise.resolve();
  }
  function rankingModal(cloudRows=null){
    const active=state.users.filter(u=>u.active!==false);
    const remote=new Map();
    if(cloudRows){cloudRows.filter(row=>row.status!=="cancelled").forEach(row=>{const id=Number(row.user_id),current=remote.get(id)||{spent:0,bread:0,badjia:0,salgados:0};current.spent+=Number(row.total||0);current.bread+=Number(row.bread_qty||0);current.badjia+=Number(row.badjia_qty||0);current.salgados+=Number(row.salgados_qty||0);remote.set(id,current)})}
    const metric=(u,key,local)=>cloudRows?(remote.get(Number(u.id))?.[key]||0):local(u);
    const score=fn=>active.map(u=>({u,value:fn(u)})).sort((a,b)=>b.value-a.value||a.u.name.localeCompare(b.u.name))[0];
    const bread=u=>metric(u,"bread",person=>userItemQty(person.id,p=>p.id===1||p.name.toLowerCase().includes("bread")));
    const badjia=u=>metric(u,"badjia",person=>userItemQty(person.id,p=>p.id===2||p.name.toLowerCase().includes("badjia")));
    const salgados=u=>metric(u,"salgados",person=>userItemQty(person.id,p=>p.id===5||p.id===6));
    const spent=u=>metric(u,"spent",person=>userAllSpent(person.id));
    const topThree=active.map(u=>({u,value:spent(u)})).filter(person=>person.value>0).sort((a,b)=>b.value-a.value||a.u.name.localeCompare(b.u.name)).slice(0,3);
    const podiumOrder=[topThree[1],topThree[0],topThree[2]];
    const podiumPlaces=[2,1,3];
    const leaders=[
      ["🥖","Maior consumidor de Bread",score(bread),"breads"],
      ["🥟","Rei das Badjias",score(badjia),"badjias"],
      ["🥐","Rei dos Rissóis e Chamuças",score(salgados),"salgados"],
      ["💎","Cliente VIP",score(spent),"MT consumidos"]
    ];
    const winnerRow=([icon,title,leader,suffix])=>{const won=leader&&leader.value>0;return `<div class="ranking-row ${won?"":"muted"}"><span>${icon}</span><div><strong>${title}</strong>${won?`<small><b class="ranking-person">${esc(leader.u.name)}</b><span>• ${fmt(leader.value)} ${suffix}</span></small>`:`<small>Ainda sem campeão</small>`}</div>${won?`<b>${leader.u.avatar}</b>`:"<b>—</b>"}</div>`};
    const podium=podiumOrder.map((person,index)=>{const place=podiumPlaces[index];return person?`<div class="podium-person place-${place}"><div class="podium-avatar">${person.u.avatar}<span>${place===1?"👑":place===2?"🥈":"🥉"}</span></div><strong>${esc(person.u.name)}</strong><small>${fmt(person.value)} MT</small><div class="podium-block"><b>${place}º</b></div></div>`:`<div class="podium-person place-${place} empty-place"><div class="podium-avatar">🙂</div><strong>Por ocupar</strong><small>0 MT</small><div class="podium-block"><b>${place}º</b></div></div>`}).join("");
    openModal(`<div class="ranking-modal"><div class="ranking-crown">🏆</div><div class="eyebrow">RANKING MANINGUE SÉRIO 😅</div><h3>🥇 Hall da Fome</h3><p>Aqui não há esquema: os pedidos é que mandam.</p><div class="podium-title"><strong>TOP 3 DOS BOSSES</strong><small>Quem queimou mais mola em food</small></div><div class="podium">${podium}</div><div class="ranking-section"><strong>Campeões da fome</strong><small>Os bosses de cada categoria.</small></div><div class="ranking-list">${leaders.map(winnerRow).join("")}</div><button class="primary orange" data-close>FECHAR O HALL</button></div>`);
    if(cloudRows===null)loadCloudRanking().then(rows=>{if($(".ranking-modal"))rankingModal(rows)}).catch(()=>toast("O Hall partilhado está offline. Mostrei os dados deste aparelho."));
  }

  function entryView(){
    return `<main id="main" class="entry-wrap" tabindex="-1">
      <div class="entry-logo">
        <div class="mascot">🍞</div>
        <h1>O Pão de Cada Dia</h1>
        <p>Pedidos, mola mensal e fome maningue séria.</p>
        <div class="opening-phrase"><span>💬</span>${esc(openingPhrase)}</div>
      </div>
      <div class="access-grid">
        <button class="access-card primary" data-entry="user" aria-label="Entrar como utilizador">
          <span class="access-icon" aria-hidden="true">🙂</span><span><strong>Entrar como boss da fome</strong><small>Ver a mola, mandar pedidos e acompanhar o teu food.</small></span><span class="access-arrow" aria-hidden="true">›</span>
        </button>
        <button class="access-card admin" data-entry="admin" aria-label="Entrar no painel administrativo">
          <span class="access-icon" aria-hidden="true">🧑🏽‍💼</span><span><strong>Cantinho do administrador</strong><small>Gerir pessoas, produtos, saldos e pedidos.</small></span><span class="access-arrow" aria-hidden="true">›</span>
        </button>
        <button class="access-card ranking" id="openRanking" aria-label="Abrir Hall da Fome">
          <span class="access-icon" aria-hidden="true">🏆</span><span><strong>Ver os bosses da fome</strong><small>Pódio e campeões maningue fortes da turma.</small></span><span class="access-arrow" aria-hidden="true">›</span>
        </button>
      </div>
      <div class="access-footnote">🔒 Mete o PIN certo, boss. Sem esquemas.</div>
    </main>`;
  }

  function shell(title,subtitle,right,content,nav){
    return `<header class="topbar"><div class="brand"><div class="brand-icon">🍞</div><div><h1>${title}</h1><small>${subtitle}</small></div></div>${right||""}</header>
      <main id="main" class="app-content" tabindex="-1">${content}</main>${nav||""}`;
  }

  function userNav(){
    const items=[["home","🏠","Início"],["orders","📋","Pedidos"],["menu","＋","Pedir","order-nav"],["balance","👛","Saldo"],["profile","🙂","Perfil"]];
    return `<nav class="bottom-nav cols-5" aria-label="Navegação do utilizador">${items.map(([id,icon,label,cls=""])=>`<button class="nav ${page===id?"active":""} ${cls}" data-user-page="${id}" ${page===id?'aria-current="page"':""}><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join("")}</nav>`;
  }

  function userView(){
    const u=activeUser();
    const content = page==="home"?userHome(u):page==="menu"?userMenu(u):page==="orders"?userOrders(u):page==="balance"?userBalance(u):userProfile(u);
    return shell("O Pão de Cada Dia",`${esc(u.name)} • ${monthName}`,`<button class="icon-btn logout-btn" data-logout title="Sair" aria-label="Terminar sessão"><span aria-hidden="true">↩️</span><span class="logout-label">Sair</span></button>`,content,userNav());
  }

  function userHome(u){
    const orders=state.orders.filter(o=>o.type==="user"&&o.userId===u.id&&isThisMonth(o.date));
    const qty=id=>orders.reduce((s,o)=>s+o.items.filter(i=>i.productId===id).reduce((a,i)=>a+i.qty,0),0);
    const spent=userSpent(u.id),recharged=userRecharge(u.id),deducted=userDeduction(u.id),donated=userDonation(u.id),available=userAvailable(u.id),funds=Number(u.monthlyBalance||0)+recharged;
    return `<div class="hero"><div class="eyebrow">Então, ${esc(u.name)}, está nice?</div><h2>Vamos txovar essa fome? 😋</h2><p>Escolhe o food, controla a mola e acompanha os teus pedidos.</p><div class="hero-chip">💬 ${esc(openingPhrase)}</div></div>
      <div class="stats"><div class="stat"><span class="emoji" aria-hidden="true">🥖</span><strong>${qty(1)}</strong><span>Breads</span></div><div class="stat"><span class="emoji" aria-hidden="true">🥟</span><strong>${qty(2)}</strong><span>Badjias</span></div><div class="stat"><span class="emoji" aria-hidden="true">🧾</span><strong>${orders.length}</strong><span>Pedidos</span></div></div>
      <div class="head"><div><h3>Meu saldo</h3><p>${monthName}</p></div><button class="link" data-user-page="balance">Ver detalhes →</button></div>
      <div class="card balance"><div class="balance-top"><div><div class="label">Saldo disponível</div><div class="money">${fmt(available)} <small>MT</small></div></div><div class="wallet">👛</div></div>
      <div class="split cols-5"><div><div class="label">Saldo mensal</div><div class="mini">${fmt(u.monthlyBalance)} MT</div></div><div><div class="label">Recargas</div><div class="mini available">+${fmt(recharged)} MT</div></div><div><div class="label">Descontos</div><div class="mini spent">−${fmt(deducted)} MT</div></div><div><div class="label">Compras</div><div class="mini spent">−${fmt(spent)} MT</div></div><div><div class="label">Ao padeiro</div><div class="mini donation-out">−${fmt(donated)} MT</div></div></div>
      <div class="progress"><span style="width:${balanceProgress(spent+deducted+donated,funds)}%"></span></div><div class="tip ${available<=0?"danger-tip":available<=100?"warning-tip":""}"><span>${available<=0?"🚨":available<=100?"😅":"💡"}</span><span>${balanceMessage(available)}</span></div></div>
      <div class="head"><div><h3>Atalhos, boss</h3><p>O mambo está todo aqui.</p></div></div>
      <div class="quick-grid"><button class="quick" data-user-page="menu"><span class="qicon">🛒</span><strong>Mandar pedido</strong><small>Escolher food e quantidades.</small></button><button class="quick" data-user-page="orders"><span class="qicon">📋</span><strong>Meus pedidos</strong><small>Ver onde anda o teu food.</small></button></div>
      <div class="head"><div><h3>Últimos pedidos</h3><p>Os teus pedidos mais recentes.</p></div></div>
      <div class="card orders">${orders.length?orders.slice(0,3).map(userOrderRow).join(""):empty("🍽️","Ainda nada, boss. Bora mandar um pedido?")}</div>`;
  }

  function choiceStore(mode){return mode==="admin"?adminCartChoices:cartChoices}
  function modeCart(mode){return mode==="admin"?adminCart:cart}
  function modeCustom(mode){return mode==="admin"?adminCustomRequest:customRequest}
  function selectedChoices(p,mode){const store=choiceStore(mode);if(!store[p.id])store[p.id]={};(p.options||[]).forEach(group=>{if(!store[p.id][group.key])store[p.id][group.key]=group.choices[0]?.label||""});return store[p.id]}
  function selectedUnitPrice(p,mode){let price=Number(p.price||0),selected=selectedChoices(p,mode);(p.options||[]).forEach(group=>{const choice=group.choices.find(c=>c.label===selected[group.key]);if(choice?.price!=null)price=Number(choice.price)});return price}
  function cartQty(c){return Object.values(c).reduce((sum,q)=>sum+Number(q||0),0)}
  function cartContentCount(c,mode){return cartQty(c)+(modeCustom(mode).trim()?1:0)}
  function cartTotal(c,mode){return Object.entries(c).reduce((s,[id,q])=>{const p=product(id);return s+(canOrderProduct(p)?selectedUnitPrice(p,mode):0)*q},0)}
  function cartNeedsContact(c,mode){return Object.entries(c).some(([id,q])=>q>0&&canOrderProduct(product(id))&&(Number(product(id)?.price||0)===0||product(id)?.contactForFlavor))||Boolean(modeCustom(mode).trim())}
  function orderHasContent(c,mode){return cartQty(c)>0||Boolean(modeCustom(mode).trim())}
  function checkoutMarkup(mode){
    const c=modeCart(mode),total=cartTotal(c,mode),count=cartContentCount(c,mode),hasContent=orderHasContent(c,mode),needsContact=cartNeedsContact(c,mode);
    const itemText=count?`${count} ${count===1?"item escolhido":"itens escolhidos"}`:"Nenhum item escolhido";
    const context=`Saldo disponível: ${fmt(userAvailable(activeUser().id))} MT`;
    const totalLabel=needsContact?"Total estimado":"Total do pedido";
    const amount=needsContact?(total>0?`${fmt(total)} MT + confirmar`:"A confirmar"):`${fmt(total)} MT`;
    const buttonText=hasContent?"REVER PEDIDO 😋":"ESCOLHE O FOOD PRIMEIRO";
    return `<div class="checkout-space" aria-hidden="true"></div><div class="checkout ${hasContent?"":"is-empty"}" data-checkout-mode="${mode}"><div class="checkout-summary"><div class="checkout-order"><span class="checkout-kicker">O TEU PEDIDO</span><strong data-checkout-count>${itemText}</strong><small data-checkout-context>${context}</small></div><div class="checkout-total"><span data-checkout-total-label>${totalLabel}</span><strong data-checkout-value aria-live="polite">${amount}</strong></div></div><button class="primary" id="reviewUserOrder" ${hasContent?"":"disabled"}>${buttonText}</button></div>`;
  }
  function refreshCheckout(mode){const c=modeCart(mode),total=cartTotal(c,mode),count=cartContentCount(c,mode),hasContent=orderHasContent(c,mode),needsContact=cartNeedsContact(c,mode),footer=$(`[data-checkout-mode="${mode}"]`),button=$("#reviewUserOrder");if(footer){$("[data-checkout-count]",footer).textContent=count?`${count} ${count===1?"item escolhido":"itens escolhidos"}`:"Nenhum item escolhido";$("[data-checkout-context]",footer).textContent=`Saldo disponível: ${fmt(userAvailable(activeUser().id))} MT`;$("[data-checkout-total-label]",footer).textContent=needsContact?"Total estimado":"Total do pedido";$("[data-checkout-value]",footer).textContent=needsContact?(total>0?`${fmt(total)} MT + confirmar`:"A confirmar"):`${fmt(total)} MT`;footer.classList.toggle("is-empty",!hasContent)}if(button){button.disabled=!hasContent;button.textContent=hasContent?"REVER PEDIDO 😋":"ESCOLHE O FOOD PRIMEIRO"}}
  function optionsMarkup(p,mode){const selected=selectedChoices(p,mode);return (p.options||[]).map(group=>`<label><span>${esc(group.label)}</span><select data-product-option="${p.id}" data-option-key="${esc(group.key)}" data-cart-mode="${mode}">${group.choices.map(choice=>`<option value="${esc(choice.label)}" ${selected[group.key]===choice.label?"selected":""}>${esc(choice.label)}</option>`).join("")}</select></label>`).join("")}
  function productPicker(currentCart,mode){
    const orderable=state.products.filter(canOrderProduct).sort(byName);
    const products=orderable.filter(p=>category==="Todos"||p.category===category);
    const cats=["Todos",...[...new Set(orderable.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,"pt",{sensitivity:"base"}))];
    return `<div class="categories" role="group" aria-label="Categorias do menu">${cats.map(c=>`<button class="chip ${c===category?"active":""}" data-category="${esc(c)}" aria-pressed="${c===category}">${esc(c)}</button>`).join("")}</div>
      <div class="card product-list">${products.map(p=>{const price=selectedUnitPrice(p,mode),qty=Number(currentCart[p.id]||0);return `<div class="product ${qty>0?"selected":""}"><div class="picon">${esc(p.icon)}</div><div class="product-main"><strong>${esc(p.name)}</strong><div class="price">${price>0?`${fmt(price)} MT`:"Preço a confirmar"}</div>${p.contactForFlavor?`<small class="contact-note">📞 Vamos contactar-te para confirmar sabor e disponibilidade.</small>`:""}<div class="product-options">${optionsMarkup(p,mode)}</div></div><div class="qty"><button data-cart-minus="${p.id}" data-cart-mode="${mode}" aria-label="Diminuir quantidade de ${esc(p.name)}">−</button><span aria-live="polite" aria-label="Quantidade de ${esc(p.name)}">${qty}</span><button data-cart-plus="${p.id}" data-cart-mode="${mode}" aria-label="Aumentar quantidade de ${esc(p.name)}">+</button></div></div>`}).join("")}</div>`;
  }
  function customRequestCard(mode){const open=customOpen[mode],value=modeCustom(mode);return `<div class="custom-request card"><button data-toggle-custom="${mode}" aria-expanded="${open}" aria-controls="custom-area-${mode}"><span aria-hidden="true">✍🏽</span><div><strong>Não encontraste? Escreve aí, boss</strong><small>Faz um pedido especial e confirmamos o preço.</small></div><b aria-hidden="true">${open?"−":"+"}</b></button><div class="custom-fee-alert" role="note"><span class="custom-fee-icon" aria-hidden="true">⚠️</span><div><strong>AVISO IMPORTANTE</strong><span>Pedidos fora da lista podem ter um acréscimo de <b>1 a 100 MT</b>, dependendo do produto e da dificuldade em encontrá-lo. O administrador confirmará o preço final, que será descontado do saldo.</span></div></div>${open?`<div class="custom-request-body" id="custom-area-${mode}"><label for="customRequest-${mode}">O QUE PROCURAS?</label><textarea id="customRequest-${mode}" data-custom-mode="${mode}" maxlength="160" placeholder="Ex.: Quero um bolo de chocolate...">${esc(value)}</textarea><small>O administrador vai contactar-te para confirmar o preço e a disponibilidade.</small></div>`:""}</div>`}
  function reviewOrderModal(mode){
    const currentCart=cart,total=cartTotal(currentCart,"user"),needsContact=cartNeedsContact(currentCart,"user"),special=customRequest.trim();
    const lines=Object.entries(currentCart).filter(([id,qty])=>qty>0&&canOrderProduct(product(id))).map(([id,qty])=>{const p=product(id),choices=Object.values(selectedChoices(p,mode)).join(", "),price=selectedUnitPrice(p,mode);return `<div class="review-line"><span class="review-icon">${esc(p.icon)}</span><div><strong>${esc(p.name)} × ${qty}</strong><small>${choices?esc(choices):esc(p.category)}</small></div><b>${price>0?`${fmt(price*qty)} MT`:"A confirmar"}</b></div>`}).join("");
    openModal(`<div class="review-modal"><div class="head" style="margin-top:0"><div><h3>Confirma o teu pedido</h3><p>Vê se está tudo nice antes de mandar.</p></div><span style="font-size:36px" aria-hidden="true">🧺</span></div><div class="review-schedule"><span aria-hidden="true">📅</span><div><strong>${orderSchedule==="tomorrow"?"Pedido agendado para amanhã às 06:00":"Pedido para hoje"}</strong><small>${orderDateLabel(orderSchedule==="tomorrow"?scheduledOrderDate():new Date())}</small></div></div><div class="review-list">${lines}${special?`<div class="review-line special"><span class="review-icon" aria-hidden="true">📝</span><div><strong>Pedido especial</strong><small>${esc(special)}</small></div><b>Preço a confirmar</b></div>`:""}</div>${needsContact?`<div class="review-warning"><span aria-hidden="true">📞</span><div><strong>Há detalhes para confirmar</strong><small>O administrador vai confirmar preço, sabor ou disponibilidade contigo.</small></div></div>`:""}<div class="review-total"><span>Total ${needsContact?"estimado":"do pedido"}</span><strong>${needsContact?(total>0?`${fmt(total)} MT + confirmar`:"Preço a confirmar"):`${fmt(total)} MT`}</strong></div><div class="sheet-actions"><button class="secondary" data-close>Voltar e ajustar</button><button class="primary orange" id="submitUserOrder">CONFIRMAR PEDIDO</button></div></div>`);
  }
  function userMenu(u){
    const available=userAvailable(u.id),total=cartTotal(cart,"user"),needsContact=cartNeedsContact(cart,"user");
    return `<div class="head" style="margin-top:2px"><div><h2>Manda vir o food</h2><p>Escolhe o que vai txovar essa fome.</p></div><span style="font-size:39px">🧺</span></div>
      ${available<=150?`<div class="balance-alert ${available<=0?"negative":""}"><span aria-hidden="true">${available<=0?"🚨":"👛"}</span><div><strong>${available<=0?"Saldo insuficiente":"Saldo a ficar baixo"}</strong><small>${balanceMessage(available)}</small></div></div>`:""}
      <div class="schedule-card card"><div><strong>Quando queres receber?</strong><small>Escolhe hoje ou agenda para amanhã às 06:00.</small></div><div class="schedule-options" role="group" aria-label="Data do pedido"><button class="schedule-option ${orderSchedule==="today"?"active":""}" data-order-schedule="today" aria-pressed="${orderSchedule==="today"}"><span aria-hidden="true">☀️</span><strong>Hoje</strong><small>${orderDateLabel(new Date())}</small></button><button class="schedule-option ${orderSchedule==="tomorrow"?"active":""}" data-order-schedule="tomorrow" aria-pressed="${orderSchedule==="tomorrow"}"><span aria-hidden="true">📅</span><strong>Amanhã às 06:00</strong><small>${orderDateLabel(scheduledOrderDate())}</small></button></div></div>
      ${productPicker(cart,"user")}
      ${customRequestCard("user")}
      ${checkoutMarkup("user")}`;
  }
  function userOrderRow(o){return `<div class="order"><div class="face">🧾</div><div><strong>Pedido #${o.id}</strong><small>${orderDateLabel(o.date)} • ${itemSummary(o)}</small></div><div class="side"><b>${orderTotalLabel(o)}</b><span class="status ${o.status}">${statusText(o.status)}</span></div></div>`}
  function userOrders(u){
    const map={"Aguardando confirmação":"pending","Pago":"paid","Dívida antiga":"debt","Cancelado":"cancelled"};
    const all=state.orders.filter(o=>o.type==="user"&&o.userId===u.id);
    const list=orderFilter==="Todos"?all:all.filter(o=>o.status===map[orderFilter]);
    return `<div class="head" style="margin-top:2px"><div><h2>Meus pedidos</h2><p>Acompanha os pedidos e o estado de cada um.</p></div><span style="font-size:39px" aria-hidden="true">📋</span></div>
      <div class="filters" role="group" aria-label="Filtrar pedidos">${["Todos","Aguardando confirmação","Pago","Dívida antiga","Cancelado"].map(f=>`<button class="chip ${f===orderFilter?"active":""}" data-order-filter="${f}" aria-pressed="${f===orderFilter}">${f}</button>`).join("")}</div>
      <div class="card orders">${list.length?list.map(userOrderRow).join(""):empty("🥖","Não há pedidos com este estado.")}</div>`;
  }
  function userBalance(u){
    const spent=userSpent(u.id),recharged=userRecharge(u.id),deducted=userDeduction(u.id),donated=userDonation(u.id),available=userAvailable(u.id),funds=Number(u.monthlyBalance||0)+recharged;
    const tx=[...state.orders.filter(o=>o.type==="user"&&o.userId===u.id&&isThisMonth(o.date)&&afterBalanceReset(u.id,o.date)&&o.status!=="cancelled").map(o=>({date:o.date,label:`Pedido #${o.id}`,icon:"🛒",amount:-orderTotal(o)})),...state.recharges.filter(r=>r.userId===u.id&&isThisMonth(r.date)&&afterBalanceReset(u.id,r.date)).map(r=>({date:r.date,label:r.note,icon:"💰",amount:r.amount})),...(state.donationPledges||[]).filter(p=>p.userId===u.id&&isThisMonth(p.date)&&afterBalanceReset(u.id,p.date)).map(p=>({date:p.date,label:"Contribuição ao padeiro",icon:"🚗",amount:-Number(p.amount||0)}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
    return `<div class="head" style="margin-top:2px"><div><h2>Meu saldo</h2><p>${monthName}</p></div><span style="font-size:43px">👛</span></div>
      <div class="card balance"><div class="balance-top"><div><div class="label">Saldo disponível</div><div class="money">${fmt(available)} <small>MT</small></div></div><div class="wallet">💵</div></div><div class="split cols-5"><div><div class="label">Saldo mensal</div><div class="mini">${fmt(u.monthlyBalance)} MT</div></div><div><div class="label">Recargas</div><div class="mini available">+${fmt(recharged)} MT</div></div><div><div class="label">Descontos</div><div class="mini spent">−${fmt(deducted)} MT</div></div><div><div class="label">Compras</div><div class="mini spent">−${fmt(spent)} MT</div></div><div><div class="label">Ao padeiro</div><div class="mini donation-out">−${fmt(donated)} MT</div></div></div><div class="balance-equation">${fmt(u.monthlyBalance)} + ${fmt(recharged)} − ${fmt(deducted)} − ${fmt(spent)} − ${fmt(donated)} = <strong>${fmt(available)} MT</strong></div><div class="progress"><span style="width:${balanceProgress(spent+deducted+donated,funds)}%"></span></div></div>
      <div class="card recharge-cta"><span>💸</span><div><strong>Precisas de mais mola?</strong><small>Escolhe o valor e copia o número para fazer a transferência.</small></div><button class="primary orange" id="openUserRecharge">QUERO RECARREGAR</button></div>
      <div class="head"><div><h3>Movimentos</h3><p>Entradas e saídas do mês.</p></div></div>
      <div class="card transactions">${tx.length?tx.map(t=>`<div class="tx"><div class="face">${t.icon}</div><div><strong>${t.label}</strong><small>${new Intl.DateTimeFormat("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(t.date))}</small></div><div class="tx-value ${t.amount<0?"neg":"pos"}">${t.amount>0?"+":"−"} ${fmt(Math.abs(t.amount))} MT</div></div>`).join(""):empty("👛","Ainda não há movimentos.")}</div>`;
  }
  function userProfile(u){
    const orders=state.orders.filter(o=>o.type==="user"&&o.userId===u.id&&isThisMonth(o.date));
    return `<div class="head" style="margin-top:2px"><div><h2>Meu perfil</h2><p>Resumo da conta.</p></div><span style="font-size:38px">🙂</span></div>
      <div class="card profile-card"><div class="profile-top"><div class="avatar">${esc(u.avatar)}</div><div><h3>${esc(u.name)}</h3><p>Fome nível: ${userSpent(u.id)>300?"Lendário":userSpent(u.id)>150?"Médio":"Leve"}</p></div></div>
      <div class="profile-info"><div class="info-row"><span>Plano mensal</span><span>${fmt(u.monthlyBalance)} MT</span></div><div class="info-row"><span>Total em compras</span><span>${fmt(userSpent(u.id))} MT</span></div><div class="info-row"><span>Contribuições ao padeiro</span><span>${fmt(userDonation(u.id))} MT</span></div><div class="info-row"><span>Saldo atual</span><span>${fmt(userAvailable(u.id))} MT</span></div><div class="info-row"><span>Pedidos do mês</span><span>${orders.length}</span></div></div></div>`;
  }

  function adminNav(){
    const items=[["dashboard","📊","Resumo"],["orders","📋","Pedidos"],["products","🧺","Produtos"],["users","👥","Utilizadores"],["settings","⚙️","Gestão"]];
    return `<nav class="bottom-nav cols-5" aria-label="Navegação administrativa">${items.map(([id,icon,label])=>`<button class="nav ${adminSection===id?"active":""}" data-admin-section="${id}" ${adminSection===id?'aria-current="page"':""}><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join("")}</nav>`;
  }
  function adminView(){
    const content=adminSection==="dashboard"?adminDashboard():adminSection==="orders"?adminOrders():adminSection==="products"?adminProducts():adminSection==="users"?adminUsers():adminSettings();
    return shell("Painel Administrativo",`Gestão • ${monthName}`,`<button class="icon-btn logout-btn" data-logout title="Sair" aria-label="Terminar sessão administrativa"><span aria-hidden="true">↩️</span><span class="logout-label">Sair</span></button>`,content,adminNav());
  }
  function adminDashboard(){
    const month=state.orders.filter(o=>isThisMonth(o.date)&&o.status!=="cancelled");
    const guest=month.filter(o=>o.type==="guest");
    const pending=month.filter(o=>o.status==="pending");
    const revenue=month.reduce((s,o)=>s+orderTotal(o),0);
    const todayOrders=state.orders.filter(o=>today(o.date));
    return `<div class="hero admin"><div class="eyebrow">Base do padeiro</div><h2>Todo o mambo num só sítio. 📊</h2><p>Pessoas, convidados, food e mola. Aqui não escapa nada.</p><div class="hero-chip">${pending.length} pedidos estão a fazer bichinha</div></div>
      <div class="head"><div><h3>Resumo do mês</h3><p>${monthName}</p></div></div>
      <div class="admin-kpis"><div class="card kpi"><div class="kicon" aria-hidden="true">🧾</div><strong>${month.length}</strong><span>Pedidos no mês</span></div><div class="card kpi"><div class="kicon" aria-hidden="true">👤</div><strong>${guest.length}</strong><span>Pedidos de convidados</span></div><div class="card kpi"><div class="kicon" aria-hidden="true">⏳</div><strong>${pending.length}</strong><span>Aguardam confirmação</span></div><div class="card kpi"><div class="kicon" aria-hidden="true">💰</div><strong>${fmt(revenue)} MT</strong><span>Valor total dos pedidos</span></div></div>
      <div class="head"><div><h3>Pedidos de hoje</h3><p>Utilizadores e convidados.</p></div><div class="action-row"><button class="primary orange" id="newAdminOrder">+ Novo pedido</button><button class="secondary receipt-open" id="openDailyReceipt">🧾 Recibo do dia</button></div></div>
      <div class="card orders">${todayOrders.length?todayOrders.slice(0,5).map(o=>adminOrderRow(o,false)).join(""):empty("🍽️","Hoje está calmo, boss. Ainda não entrou food.")}</div>`;
  }
  function adminOrderRow(o,canDelete=false){
    const owner=orderOwner(o);
    const tagClass=o.type==="guest"?"guest-tag":o.status;
    const tagText=o.type==="guest"?"Convidado":statusText(o.status);
    const row=`<button class="order order-button" data-admin-order="${o.id}" aria-label="Abrir pedido ${o.id} de ${esc(owner.name)}"><div class="face">${esc(owner.avatar)}</div><div><strong>${esc(owner.name)}</strong><small>${orderDateLabel(o.date)} • ${itemSummary(o)} ${o.type==="guest"?"• convidado":""}</small></div><div class="side"><b>${orderTotalLabel(o)}</b><span class="status ${tagClass}">${tagText}</span></div></button>`;
    return canDelete?`<div class="admin-order-row">${row}<button class="mini-btn delete" data-delete-order="${esc(o.id)}" aria-label="Eliminar pedido ${o.id}">🗑️</button></div>`:row;
  }
  function adminOrders(){
    const map={"Aguardando confirmação":"pending","Pago":"paid","Dívida antiga":"debt","Cancelado":"cancelled","Convidados":"guest"};
    let list=state.orders;
    if(orderFilter==="Convidados")list=list.filter(o=>o.type==="guest");else if(orderFilter!=="Todos")list=list.filter(o=>o.status===map[orderFilter]);
    if(adminOrderDate)list=list.filter(o=>localDateKey(o.date)===adminOrderDate);
    return `<div class="head" style="margin-top:2px"><div><h2>Gestão de pedidos</h2><p>Pedidos feitos pelo admin para qualquer pessoa.</p></div><div class="action-row"><button class="primary orange" id="newAdminOrder">+ Novo pedido</button><button class="secondary receipt-open" id="openDailyReceipt">🧾 Recibo diário</button></div></div>
      <div class="order-filter-tools"><div class="form-row"><label for="adminOrderDate">FILTRAR POR DIA</label><input id="adminOrderDate" type="date" value="${esc(adminOrderDate)}"></div><button class="secondary" id="clearAdminOrderDate" ${adminOrderDate?"":"disabled"}>Todos os dias</button></div>
      <div class="filters" role="group" aria-label="Filtrar pedidos">${["Todos","Aguardando confirmação","Pago","Dívida antiga","Convidados","Cancelado"].map(f=>`<button class="chip ${f===orderFilter?"active":""}" data-order-filter="${f}" aria-pressed="${f===orderFilter}">${f}</button>`).join("")}</div>
      <div class="order-filter-result" aria-live="polite">${list.length} ${list.length===1?"pedido encontrado":"pedidos encontrados"}</div><div class="card orders">${list.length?list.map(o=>adminOrderRow(o,true)).join(""):empty("🥖","Não há pedidos com este filtro.")}</div>`;
  }

  function adminProductPicker(){
    const products=state.products.filter(canOrderProduct).sort(byName);
    return `<div class="card product-list admin-order-products">${products.map(p=>{const price=selectedUnitPrice(p,"admin"),qty=Number(adminCart[p.id]||0);return `<div class="product ${qty>0?"selected":""}" data-admin-product-row="${p.id}"><div class="picon">${esc(p.icon)}</div><div class="product-main"><strong>${esc(p.name)}</strong><div class="price">${price>0?`${fmt(price)} MT`:"Preço a confirmar"}</div>${p.contactForFlavor?`<small class="contact-note">📞 Vamos confirmar sabor e disponibilidade.</small>`:""}<div class="product-options">${optionsMarkup(p,"admin")}</div></div><div class="qty"><button data-cart-minus="${p.id}" data-cart-mode="admin" aria-label="Diminuir quantidade de ${esc(p.name)}">−</button><span aria-live="polite" aria-label="Quantidade de ${esc(p.name)}">${qty}</span><button data-cart-plus="${p.id}" data-cart-mode="admin" aria-label="Aumentar quantidade de ${esc(p.name)}">+</button></div></div>`}).join("")}</div>`;
  }
  function refreshAdminOrderSummary(){const total=cartTotal(adminCart,"admin"),hasContent=orderHasContent(adminCart,"admin"),output=$("[data-admin-order-total]"),button=$("#saveAdminOrder");if(output)output.textContent=total>0?`${fmt(total)} MT`:(hasContent?"A confirmar":"0 MT");if(button)button.disabled=!hasContent}
  function adminOrderModal(){
    const users=state.users.filter(u=>u.active&&!u.legacyHidden).sort(byName);
    adminCart={};adminCartChoices={};adminCustomRequest="";
    openModal(`<div class="head" style="margin-top:0"><div><h3>Novo pedido pelo admin</h3><p>Regista o pedido de um utilizador ou de um convidado.</p></div><span style="font-size:34px">🧾</span></div>
      <div class="form-row"><label for="adminOrderType">PEDIDO PARA</label><select id="adminOrderType"><option value="user">Utilizador registado</option><option value="guest">Convidado</option></select></div>
      <div id="adminRegisteredTarget"><div class="form-row"><label for="adminOrderUser">UTILIZADOR</label><select id="adminOrderUser">${users.map(u=>`<option value="${u.id}">${esc(u.avatar)} ${esc(u.name)} • ${fmt(userAvailable(u.id))} MT disponíveis</option>`).join("")}</select></div></div>
      <div id="adminGuestTarget" hidden><div class="form-row"><label for="adminGuestName">NOME DO CONVIDADO *</label><input id="adminGuestName" maxlength="100" required aria-describedby="adminGuestNameError" placeholder="Ex.: Mokizzow"><small class="field-error" id="adminGuestNameError" hidden>Escreve o nome do convidado.</small></div><div class="form-row"><label for="adminGuestPhone">CONTACTO</label><input id="adminGuestPhone" maxlength="40" inputmode="tel" aria-describedby="adminGuestPhoneError" placeholder="Ex.: 84 000 0000"><small class="field-error" id="adminGuestPhoneError" hidden>Escreve um contacto para confirmar os detalhes deste pedido.</small></div></div>
      <div class="head"><div><h3>Escolhe o food</h3><p>O admin está a fazer o pedido por esta pessoa.</p></div></div>
      ${adminProductPicker()}
      <div class="custom-request card"><div class="custom-request-body" style="display:block"><label for="adminCustomRequest">PEDIDO FORA DA LISTA (OPCIONAL)</label><textarea id="adminCustomRequest" maxlength="160" placeholder="Ex.: Quero um bolo de chocolate..."></textarea><div class="custom-fee-alert" role="note"><span class="custom-fee-icon" aria-hidden="true">⚠️</span><div><strong>AVISO IMPORTANTE</strong><span>Pedidos fora da lista podem ter um acréscimo de <b>1 a 100 MT</b>, dependendo do produto e da dificuldade em encontrá-lo. Confirma o preço final antes de fechar o pedido.</span></div></div></div></div>
      <div class="review-total"><span>Total estimado</span><strong data-admin-order-total>0 MT</strong></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="saveAdminOrder" disabled>CRIAR PEDIDO</button></div>`);
  }

  function receiptOrders(dateKey){return state.orders.filter(o=>localDateKey(o.date)===dateKey&&o.status!=="cancelled")}
  function receiptGroups(dateKey){
    const groups=new Map();
    receiptOrders(dateKey).forEach(o=>{const owner=orderOwner(o),key=o.type==="user"?`user-${o.userId}`:`guest-${owner.name.toLocaleLowerCase("pt")}-${o.guestPhone||""}`;if(!groups.has(key))groups.set(key,{owner,orders:[]});groups.get(key).orders.push(o)});
    return [...groups.values()].sort((a,b)=>a.owner.name.localeCompare(b.owner.name,"pt",{sensitivity:"base"}));
  }
  function receiptMissingPrices(dateKey){
    const missing=[];
    receiptOrders(dateKey).forEach(order=>{
      const owner=orderOwner(order);
      (order.items||[]).forEach((item,index)=>{if(itemPrice(item)<=0){const p=product(item.productId);missing.push({order,owner,item,index,name:p?.name||"Produto",icon:p?.icon||"❔",qty:Number(item.qty||1),custom:false})}});
      if(order.customRequest&&Number(order.customPrice||0)<=0)missing.push({order,owner,name:order.customRequest,icon:"📝",qty:1,custom:true});
    });
    return missing;
  }
  function receiptPricingEditor(dateKey){
    const missing=receiptMissingPrices(dateKey);if(!missing.length)return "";
    const rows=missing.map(entry=>`<div class="receipt-price-row"><div><span>${entry.icon}</span><div><strong>${esc(entry.name)}${entry.custom?"":` × ${entry.qty}`}</strong><small>${esc(entry.owner.name)} • Pedido #${entry.order.id}</small></div></div><label><span>${entry.custom?"Valor cobrado":"Preço unitário"}</span><span class="receipt-price-input"><input data-receipt-price data-order-id="${entry.order.id}" ${entry.custom?'data-custom-price="true"':`data-item-index="${entry.index}"`} type="number" min="1" step="1" inputmode="numeric" placeholder="0" aria-label="${entry.custom?"Valor cobrado por":`Preço unitário de`} ${esc(entry.name)} no pedido ${entry.order.id}"><b>MT</b></span></label></div>`).join("");
    return `<section class="receipt-pricing"><div class="receipt-pricing-head"><span>✍🏽</span><div><strong>Completa os valores antes de imprimir</strong><small>${missing.length} ${missing.length===1?"valor está":"valores estão"} por confirmar. Preenche quanto foi realmente cobrado.</small></div></div><div class="receipt-price-list">${rows}</div><button class="primary orange" id="saveReceiptPrices" data-date="${dateKey}">GUARDAR VALORES DO RECIBO</button></section>`;
  }
  function saveReceiptPrices(dateKey){
    const inputs=$$("[data-receipt-price]");
    const invalid=inputs.find(input=>(Number(input.value)||0)<=0);
    if(invalid){invalid.setAttribute("aria-invalid","true");invalid.focus();toast("Preenche todos os valores cobrados antes de imprimir, boss.");return false}
    inputs.forEach(input=>{const order=state.orders.find(o=>o.id===Number(input.dataset.orderId)),value=Math.max(0,Number(input.value)||0);if(!order)return;if(input.dataset.customPrice)order.customPrice=value;else if(order.items[Number(input.dataset.itemIndex)])order.items[Number(input.dataset.itemIndex)].unitPrice=value});
    receiptOrders(dateKey).forEach(order=>{order.needsContact=(order.items||[]).some(item=>itemPrice(item)<=0)||Boolean(order.customRequest&&Number(order.customPrice||0)<=0);order.priceAdjustedAt=new Date().toISOString()});
    save();void syncAdminOperational().catch(()=>{});return true;
  }
  function receiptAmount(total,uncertain){return uncertain?(total>0?`${fmt(total)} MT + confirmar`:"A confirmar"):`${fmt(total)} MT`}
  function receiptQuantityGroups(dateKey){
    const groups=new Map();
    receiptOrders(dateKey).forEach(order=>(order.items||[]).forEach(item=>{
      const quantity=Math.max(0,Number(item.qty)||0);if(!quantity)return;
      const p=product(item.productId),key=String(item.productId);
      if(!groups.has(key))groups.set(key,{icon:p?.icon||"❔",name:p?.name||"Produto",total:0,variants:new Map()});
      const group=groups.get(key);group.total+=quantity;
      const choices=Object.values(item.choices||{}).map(choice=>String(choice).trim()).filter(Boolean);
      if(choices.length){const variant=choices.join(" • ");group.variants.set(variant,(group.variants.get(variant)||0)+quantity)}
    }));
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt",{sensitivity:"base"}));
  }
  function receiptQuantitySummary(dateKey){
    const groups=receiptQuantityGroups(dateKey);if(!groups.length)return "";
    const total=groups.reduce((sum,group)=>sum+group.total,0);
    const printStyles=`<style media="print">.receipt-quantity-summary{margin:16px 0;padding:12px;border:1px solid #ccc;border-radius:10px}.receipt-quantity-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding-bottom:9px;border-bottom:1px solid #ddd}.receipt-quantity-head>div{display:flex;align-items:center;gap:8px}.receipt-quantity-head strong,.receipt-quantity-head small{display:block}.receipt-quantity-head small{margin-top:3px;color:#777;font-size:10px}.receipt-quantity-head>b{white-space:nowrap}.receipt-quantity-group{border-bottom:1px solid #eee}.receipt-quantity-group:last-child{border-bottom:0}.receipt-quantity-row,.receipt-quantity-variant{display:flex;align-items:center;justify-content:space-between;gap:15px}.receipt-quantity-row{padding:6px 0;font-weight:bold}.receipt-quantity-row span{display:flex;align-items:center;gap:6px}.receipt-quantity-row i{font-style:normal}.receipt-quantity-variants{padding:0 0 5px 23px}.receipt-quantity-variant{padding:3px 0;color:#777;font-size:10px}</style>`;
    const rows=groups.map(group=>`<div class="receipt-quantity-group"><div class="receipt-quantity-row"><span><i>${esc(group.icon)}</i>${esc(group.name)}</span><b>${fmt(group.total)} un.</b></div>${group.variants.size?`<div class="receipt-quantity-variants">${[...group.variants.entries()].map(([variant,quantity])=>`<div class="receipt-quantity-variant"><span>↳ ${esc(variant)}</span><b>${fmt(quantity)} un.</b></div>`).join("")}</div>`:""}</div>`).join("");
    return `${printStyles}<section class="receipt-quantity-summary" aria-label="Resumo de quantidades"><div class="receipt-quantity-head"><div><span>📦</span><div><strong>Resumo de produção</strong><small>Total por produto e escolha.</small></div></div><b>${fmt(total)} un.</b></div><div class="receipt-quantity-list">${rows}</div></section>`;
  }
  function dailyReceiptBody(dateKey){
    const orders=receiptOrders(dateKey),groups=receiptGroups(dateKey),grandTotal=orders.reduce((sum,o)=>sum+orderTotal(o),0),uncertain=orders.some(o=>o.needsContact),dateLabel=new Intl.DateTimeFormat("pt-PT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date(`${dateKey}T12:00:00`));
    if(!orders.length)return `<div class="receipt-empty"><span>🧾</span><strong>Sem pedidos neste dia</strong><small>Escolhe outra data para extrair o recibo.</small></div>`;
    const groupHtml=groups.map(group=>{const personTotal=group.orders.reduce((sum,o)=>sum+orderTotal(o),0),personUncertain=group.orders.some(o=>o.needsContact);return `<section class="receipt-person"><div class="receipt-person-head"><div><span>${group.owner.avatar}</span><strong>${esc(group.owner.name)}</strong></div><b>${receiptAmount(personTotal,personUncertain)}</b></div>${group.orders.map(o=>`<div class="receipt-order"><div class="receipt-order-head"><span>Pedido #${o.id} • ${new Intl.DateTimeFormat("pt-PT",{hour:"2-digit",minute:"2-digit"}).format(new Date(o.date))}</span><b>${orderTotalLabel(o)}</b></div><div class="receipt-lines">${(o.items||[]).map(i=>{const p=product(i.productId),choices=Object.values(i.choices||{}).join(", "),price=itemPrice(i);return `<div><span>${p?.icon||"❔"} ${esc(p?.name||"Produto")}${choices?` <small>(${esc(choices)})</small>`:""} × ${i.qty}</span><b>${price>0?`${fmt(price*i.qty)} MT`:"A confirmar"}</b></div>`}).join("")}${o.customRequest?`<div><span>📝 ${esc(o.customRequest)}</span><b>${Number(o.customPrice||0)>0?`${fmt(o.customPrice)} MT`:"A confirmar"}</b></div>`:""}${o.guestDonation?`<div><span>🚗 Contribuição ao padeiro</span><b>${fmt(o.guestDonation)} MT</b></div>`:""}</div></div>`).join("")}</section>`}).join("");
    return `<div class="receipt-paper"><div class="receipt-brand"><span>🍞</span><div><strong>O Pão de Cada Dia</strong><small>Recibo diário • ${dateLabel}</small></div></div><div class="receipt-summary"><div><span>Pessoas</span><b>${groups.length}</b></div><div><span>Pedidos</span><b>${orders.length}</b></div><div><span>Total</span><b>${receiptAmount(grandTotal,uncertain)}</b></div></div>${receiptQuantitySummary(dateKey)}${groupHtml}<div class="receipt-grand"><span>Total do dia</span><strong>${receiptAmount(grandTotal,uncertain)}</strong></div><small class="receipt-note">Pedidos cancelados não entram neste recibo. Valores por confirmar devem ser preenchidos antes da impressão.</small></div>`;
  }
  function dailyReceiptModal(dateKey=localDateKey()){
    const missing=receiptMissingPrices(dateKey);
    openModal(`<div class="receipt-modal"><div class="head" style="margin-top:0"><div><h3>Recibo diário</h3><p>Pedidos e gastos de cada pessoa.</p></div><span style="font-size:36px">🧾</span></div><div class="form-row"><label for="dailyReceiptDate">DIA DO RECIBO</label><input id="dailyReceiptDate" type="date" value="${dateKey}"></div>${receiptPricingEditor(dateKey)}${dailyReceiptBody(dateKey)}<div class="sheet-actions"><button class="secondary" data-close>Fechar</button><button class="primary orange" id="printDailyReceipt" data-date="${dateKey}" ${missing.length?"disabled":""}>${missing.length?"PREENCHE OS VALORES PRIMEIRO":"IMPRIMIR / GUARDAR PDF"}</button></div></div>`);
  }
  function printReceiptContent(content,title){
    $("#printReceiptLayer")?.remove();
    const layer=document.createElement("div"),originalTitle=document.title;layer.id="printReceiptLayer";layer.innerHTML=content;document.body.appendChild(layer);document.body.classList.add("printing-receipt");document.title=title;
    let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;document.body.classList.remove("printing-receipt");layer.remove();document.title=originalTitle;window.removeEventListener("afterprint",cleanup)};
    window.addEventListener("afterprint",cleanup,{once:true});requestAnimationFrame(()=>window.print());setTimeout(cleanup,60000);
  }
  function printDailyReceipt(dateKey){printReceiptContent(dailyReceiptBody(dateKey),`Recibo diário - ${dateKey}`)}
  function balanceReceiptUsers(ids){const selected=new Set((ids||[]).map(Number));return state.users.filter(u=>!u.legacyHidden&&selected.has(Number(u.id))).sort(byName)}
  function balanceReceiptBody(ids){
    const users=balanceReceiptUsers(ids),issuedAt=new Date(),issuedLabel=new Intl.DateTimeFormat("pt-PT",{dateStyle:"long",timeStyle:"short",timeZone:"Africa/Maputo"}).format(issuedAt),totalAvailable=users.reduce((sum,u)=>sum+userAvailable(u.id),0),negativeCount=users.filter(u=>userAvailable(u.id)<0).length;
    const rows=users.map(u=>{const monthly=Number(u.monthlyBalance||0),recharged=userRecharge(u.id),deducted=userDeduction(u.id),spent=userSpent(u.id),donated=userDonation(u.id),available=userAvailable(u.id);return `<section class="receipt-person balance-receipt-person"><div class="receipt-person-head"><div><span>${esc(u.avatar)}</span><strong>${esc(u.name)}</strong></div><b>${fmt(available)} MT</b></div><div class="balance-receipt-grid"><div><span>Saldo mensal</span><b>${fmt(monthly)} MT</b></div><div><span>Recargas</span><b class="receipt-positive">+ ${fmt(recharged)} MT</b></div><div><span>Descontos</span><b class="receipt-negative">- ${fmt(deducted)} MT</b></div><div><span>Compras</span><b class="receipt-negative">- ${fmt(spent)} MT</b></div><div><span>Contribuições</span><b class="receipt-negative">- ${fmt(donated)} MT</b></div><div class="balance-receipt-available"><span>Saldo disponível</span><b>${fmt(available)} MT</b></div></div><small class="balance-receipt-status">Conta ${u.active?"ativa":"bloqueada"}</small></section>`}).join("");
    return `<div class="receipt-paper balance-receipt-paper"><div class="receipt-brand"><span>🍞</span><div><strong>O Pão de Cada Dia</strong><small>Recibo de saldos - ${esc(monthName)}</small></div></div><div class="receipt-summary"><div><span>Utilizadores</span><b>${users.length}</b></div><div><span>Saldo total</span><b>${fmt(totalAvailable)} MT</b></div><div><span>Saldos negativos</span><b>${negativeCount}</b></div></div>${rows}<div class="receipt-grand"><span>Saldo total selecionado</span><strong>${fmt(totalAvailable)} MT</strong></div><small class="receipt-note">Emitido em ${esc(issuedLabel)}, hora de Maputo. Valores do mês atual no momento da emissão; pedidos cancelados não são contabilizados.</small></div>`;
  }
  function refreshBalanceReceiptSelection(){
    const boxes=$$("[data-balance-receipt-user]"),selected=boxes.filter(box=>box.checked).map(box=>Number(box.value)),selectAll=$("#balanceReceiptSelectAll"),button=$("#previewBalanceReceipt"),summary=$("#balanceReceiptSelectionSummary"),total=selected.reduce((sum,id)=>sum+userAvailable(id),0);
    if(selectAll){selectAll.checked=boxes.length>0&&selected.length===boxes.length;selectAll.indeterminate=selected.length>0&&selected.length<boxes.length}
    if(button)button.disabled=!selected.length;
    if(summary)summary.textContent=selected.length?`${selected.length} ${selected.length===1?"utilizador selecionado":"utilizadores selecionados"} - Saldo total: ${fmt(total)} MT`:"Seleciona pelo menos um utilizador.";
    return selected;
  }
  function balanceReceiptSelectionModal(selectedIds=null){
    const users=state.users.filter(u=>!u.legacyHidden).sort(byName),selected=new Set((selectedIds===null?users.map(u=>u.id):selectedIds).map(Number));
    openModal(`<div class="balance-receipt-modal"><div class="head" style="margin-top:0"><div><h3>Recibo de saldos</h3><p>Escolhe quem deve aparecer no PDF.</p></div><span style="font-size:36px" aria-hidden="true">🧾</span></div><label class="check-row balance-select-all"><input id="balanceReceiptSelectAll" type="checkbox" ${users.length&&users.every(u=>selected.has(u.id))?"checked":""}><span><strong>Selecionar todos</strong><small>Inclui ou remove todos os utilizadores da lista.</small></span></label><div class="balance-receipt-selector">${users.map(u=>`<label class="check-row"><input type="checkbox" data-balance-receipt-user value="${u.id}" ${selected.has(u.id)?"checked":""}><span><strong>${esc(u.avatar)} ${esc(u.name)}</strong><small>Saldo disponível: ${fmt(userAvailable(u.id))} MT</small></span></label>`).join("")}</div><div class="balance-selection-summary" id="balanceReceiptSelectionSummary" role="status" aria-live="polite"></div><div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="previewBalanceReceipt">VER RECIBO</button></div></div>`);refreshBalanceReceiptSelection();
  }
  function balanceReceiptModal(ids){
    const users=balanceReceiptUsers(ids);if(!users.length){balanceReceiptSelectionModal([]);return}const encodedIds=users.map(u=>u.id).join(",");
    openModal(`<div class="receipt-modal"><div class="head" style="margin-top:0"><div><h3>Recibo de saldos</h3><p>Confirma os valores antes de guardar o PDF.</p></div><span style="font-size:36px" aria-hidden="true">🧾</span></div>${balanceReceiptBody(users.map(u=>u.id))}<div class="sheet-actions"><button class="secondary" id="editBalanceReceiptUsers" data-user-ids="${encodedIds}">ALTERAR SELEÇÃO</button><button class="primary orange" id="printBalanceReceipt" data-user-ids="${encodedIds}">IMPRIMIR / GUARDAR PDF</button></div></div>`);
  }
  function printBalanceReceipt(ids){printReceiptContent(balanceReceiptBody(ids),`Recibo de saldos - ${localDateKey()}`)}
  function adminProducts(){
    return `<div class="head" style="margin-top:2px"><div><h2>Produtos</h2><p>Menu, preços e disponibilidade.</p></div><button class="secondary" id="newProduct">+ Produto</button></div>
      <div class="card manage-list">${state.products.slice().sort(byName).map(p=>`<div class="manage-row"><div class="face">${esc(p.icon)}</div><div><strong>${esc(p.name)}</strong><small>${esc(p.category)} • ${p.price>0?`${fmt(p.price)} MT`:"Preço a confirmar"}${p.options?.length?" • Com opções":""} • ${p.active?"Ativo":"Oculto"}</small></div><div class="action-row"><button class="mini-btn" data-edit-product="${p.id}">Editar</button><button class="mini-btn ${p.active?"warn":"ok"}" data-toggle-product="${p.id}">${p.active?"Ocultar":"Ativar"}</button></div></div>`).join("")}</div>`;
  }
  function adminUsers(){
    return `<div class="head" style="margin-top:2px"><div><h2>Utilizadores</h2><p>Contas e saldos mensais.</p></div><div class="action-row"><button class="secondary receipt-open" id="openBalanceReceipt">🧾 Recibo de saldos</button><button class="secondary" id="newUser">+ Utilizador</button></div></div>
      <div class="card manage-list">${state.users.filter(u=>!u.legacyHidden).sort(byName).map(u=>{const pinStatus=cloudPinStates.get(Number(u.id))||"loading",pinLabel={unset:"Sem PIN",pending:"PIN pendente",active:"PIN ativo",locked:"PIN bloqueado",blocked:"Conta bloqueada",loading:"A confirmar"}[pinStatus]||"Sem PIN";return `<div class="manage-row"><div class="face">${esc(u.avatar)}</div><div><strong>${esc(u.name)}</strong><small>Saldo: ${fmt(userAvailable(u.id))} MT • ${u.active?"Ativo":"Bloqueado"} • ${pinLabel}</small></div><div class="action-row">${pinStatus==="pending"?`<button class="mini-btn ok" data-approve-pin="${u.id}">Aprovar PIN</button>`:""}<button class="mini-btn delete" data-deduct-user="${u.id}">Descontar saldo</button><button class="mini-btn" data-edit-user="${u.id}">Editar</button><button class="mini-btn ${u.active?"warn":"ok"}" data-toggle-user="${u.id}">${u.active?"Bloquear":"Ativar"}</button></div></div>`}).join("")}</div>`;
  }
  function adminSettings(){
    return `<div class="head" style="margin-top:2px"><div><h2>Gestão</h2><p>Configurações gerais.</p></div><span style="font-size:39px">⚙️</span></div>
      <div class="head"><div><h3>Regra de saldo</h3><p>Todos os pedidos exigem saldo positivo e suficiente para cobrir o valor total.</p></div></div>
      <div class="card balance-policy" role="group" aria-label="Regra para saldo insuficiente"><div class="policy-option active"><span>🛑</span><div><strong>Saldo obrigatório</strong><small>O pedido só entra quando o saldo disponível cobre o valor total.</small></div><b>ATIVA</b></div></div>
      <div class="head"><div><h3>Segurança administrativa</h3><p>Troca o PIN usado para entrar no painel administrativo.</p></div></div>
      <div class="card campaign-settings"><div class="form-row"><label for="newAdminPin">NOVO PIN ADMINISTRATIVO</label><input id="newAdminPin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" placeholder="4 a 8 números"></div><button class="primary dark" id="saveAdminPin">TROCAR PIN</button></div>
      <div class="head"><div><h3>Ações administrativas</h3><p>Ferramentas de saldo e deste aparelho.</p></div></div>
      <div class="quick-grid"><button class="quick" id="adminRecharge"><span class="qicon">💰</span><strong>Adicionar recarga</strong><small>Creditar saldo a um utilizador.</small></button><button class="quick" id="adminDeduction"><span class="qicon">➖</span><strong>Diminuir saldo</strong><small>Registar um desconto no saldo atual.</small></button><button class="quick" id="resetDemo"><span class="qicon">♻️</span><strong>Limpar este aparelho</strong><small>Apagar apenas os dados locais.</small></button></div>`;
  }

  function render(){
    app.classList.toggle("admin-shell",state.session.mode==="admin");app.dataset.mode=state.session.mode||"entry";
    if(!state.session.mode)app.innerHTML=entryView();
    else if(state.session.mode==="user")app.innerHTML=userView();
    else app.innerHTML=adminView();
    document.title=state.session.mode==="admin"?"Gestão — O Pão de Cada Dia":"O Pão de Cada Dia";
  }
  function renderWithFocus(selector){render();requestAnimationFrame(()=>$(selector)?.focus())}

  function loginPinFields(u,status="loading"){
    if(status==="loading")return `<div class="first-pin-note"><span>⏳</span><div><strong>A confirmar a tua conta</strong><small>Estamos a consultar o PIN guardado no sistema.</small></div></div>`;
    if(status==="offline")return `<div class="first-pin-note"><span>📡</span><div><strong>Sem ligação ao servidor</strong><small>Não deu para confirmar o teu PIN. Tenta novamente.</small></div></div>`;
    if(status==="blocked")return `<div class="first-pin-note"><span>🚫</span><div><strong>Conta bloqueada</strong><small>O administrador bloqueou esta conta. Fala com ele para voltar a entrar.</small></div></div>`;
    if(status==="pending")return `<div class="first-pin-note"><span aria-hidden="true">🕐</span><div><strong>PIN à espera do administrador</strong><small>O pedido de acesso foi enviado. Assim que o PIN for aprovado, poderás entrar em qualquer dispositivo.</small></div></div>`;
    if(status==="active"||status==="locked")return `<div class="first-pin-note ready"><span>${status==="locked"?"🔒":"🔐"}</span><div><strong>${status==="locked"?"Conta temporariamente bloqueada":"O teu PIN já está definido"}</strong><small>${status==="locked"?"Espera 15 minutos ou pede ajuda ao administrador.":"Mete os 4 números que escolheste. Funciona em qualquer dispositivo."}</small></div></div><div class="form-row"><label for="loginUserPin">TEU PIN</label><input id="loginUserPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="current-password" placeholder="••••" ${status==="locked"?"disabled":""}></div>`;
    return `<div class="first-pin-note"><span>🆕</span><div><strong>Primeiro acesso, boss!</strong><small>Cria um PIN de 4 números. O administrador vai aprová-lo antes da primeira entrada.</small></div></div><div class="form-grid"><div class="form-row"><label for="newUserPin">NOVO PIN</label><input id="newUserPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" placeholder="••••"></div><div class="form-row"><label for="confirmNewUserPin">CONFIRMAR PIN</label><input id="confirmNewUserPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="new-password" placeholder="••••"></div></div>`;
  }
  async function refreshLoginPinFields(){const u=user($("#loginUser")?.value),box=$("#loginPinFields"),button=$("#confirmUserLogin");if(!u||!box)return;box.innerHTML=loginPinFields(u,"loading");button.disabled=true;button.textContent="A CONFIRMAR...";const status=await getCloudPinStatus(u.id);if(!box.isConnected||Number($("#loginUser")?.value)!==Number(u.id))return;box.innerHTML=loginPinFields(u,status);button.disabled=["loading","offline","pending","locked","missing","blocked"].includes(status);button.textContent=status==="active"?"ENTRAR, BOSS":status==="unset"?"PEDIR APROVAÇÃO DO PIN":status==="pending"?"À ESPERA DO ADMIN":status==="locked"?"CONTA BLOQUEADA":status==="blocked"?"CONTA BLOQUEADA":"TENTAR NOVAMENTE"}
  function loginUserModal(){
    const loginUsers=state.users.filter(u=>u.active).sort(byName),first=loginUsers[0];
    openModal(`<div class="head" style="margin-top:0"><div><h3>Entrar como boss da fome</h3><p>Escolhe a tua conta. No primeiro acesso, crias o teu próprio PIN.</p></div><span style="font-size:34px">🙂</span></div>
      <div class="form-row"><label for="loginUser">UTILIZADOR</label><select id="loginUser">${loginUsers.map(u=>`<option value="${u.id}">${esc(u.avatar)} ${esc(u.name)}</option>`).join("")}</select></div>
      <div id="loginPinFields">${loginPinFields(first,"loading")}</div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="confirmUserLogin" disabled>A CONFIRMAR...</button></div>`);refreshLoginPinFields();
  }
  function loginAdminModal(){
    openModal(`<div class="head" style="margin-top:0"><div><h3>Cantinho do administrador</h3><p>Introduz o PIN administrativo.</p></div><span style="font-size:34px" aria-hidden="true">🧑🏽‍💼</span></div>
      <div class="form-row"><label for="adminPin">PIN DO ADMINISTRADOR</label><input id="adminPin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" placeholder="••••"></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary dark" id="confirmAdminLogin">ENTRAR NO PAINEL</button></div>`);
  }
  function editOrderModal(id){
    const o=state.orders.find(x=>x.id===Number(id)),owner=orderOwner(o);
    const priceRows=(o.items||[]).map((item,index)=>{const p=product(item.productId),choices=Object.values(item.choices||{}).join(", ");return `<div class="order-price-row"><div><span>${p?.icon||"❔"}</span><div><strong>${esc(p?.name||"Produto")} × ${item.qty}</strong><small>${choices?esc(choices):"Sem opções"}</small></div></div><label><span>Preço unitário</span><input data-order-price data-item-index="${index}" data-qty="${item.qty}" type="number" min="0" step="1" value="${itemPrice(item)}"><b>MT</b></label></div>`}).join("");
    openModal(`<div class="head" style="margin-top:0"><div><h3>Pedido #${o.id}</h3><p>${esc(owner.name)} • ${o.type==="guest"?"Convidado":"Utilizador"}</p></div><span style="font-size:34px">🧾</span></div>
      ${o.guestPhone?`<div class="order-contact">📞 Contacto: <strong>${esc(o.guestPhone)}</strong></div>`:""}
      <div class="order-price-editor"><div class="price-editor-title"><strong>Preços deste pedido</strong><small>Podes personalizar cada produto só para este pedido.</small></div>${priceRows}${o.customRequest?`<div class="order-price-row custom-line"><div><span>📝</span><div><strong>Pedido especial</strong><small>${esc(o.customRequest)}</small></div></div><label><span>Preço</span><input data-order-price data-custom-price data-qty="1" type="number" min="0" step="1" value="${Number(o.customPrice||0)}"><b>MT</b></label></div>`:""}${o.guestDonation?`<div class="order-fixed-row"><span>🚗 Contribuição ao padeiro</span><b>${fmt(o.guestDonation)} MT</b></div>`:""}<div class="order-edit-total"><span>Total do pedido</span><output id="editableOrderTotal" data-donation="${Number(o.guestDonation||0)}" aria-live="polite">${fmt(orderTotal(o))} MT</output></div></div>
      ${o.needsContact?`<div class="price contact-order">📞 Confirma os preços, sabores ou disponibilidade antes de fechar.</div>`:""}
      <div class="form-row"><label for="orderStatus">ESTADO</label><select id="orderStatus"><option value="pending" ${o.status==="pending"?"selected":""}>Aguardando confirmação</option><option value="paid" ${o.status==="paid"?"selected":""}>Pago</option>${o.status==="debt"?`<option value="debt" selected>Dívida antiga</option>`:""}<option value="cancelled" ${o.status==="cancelled"?"selected":""}>Cancelado</option></select></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary" id="saveOrderStatus" data-id="${o.id}">Guardar pedido e preços</button></div>`);
  }
  function deleteOrderConfirmModal(id){
    const o=state.orders.find(x=>x.id===Number(id));if(!o)return;
    const owner=orderOwner(o);
    openModal(`<div class="confirm-card danger"><div class="feedback-emoji">🗑️</div><div class="eyebrow">ELIMINAR PEDIDO</div><h3>Apagar o pedido #${o.id}?</h3><p>${esc(owner.name)} • Esta ação remove o pedido e as contribuições ligadas a ele. Não pode ser desfeita.</p><div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="confirmDeleteOrder" data-id="${o.id}">ELIMINAR PEDIDO</button></div></div>`);
  }
  function productModal(id=null){
    const p=id?product(id):{name:"",icon:"🍞",price:0,category:"Outros",active:true};
    openModal(`<div class="head" style="margin-top:0"><div><h3>${id?"Editar produto":"Novo produto"}</h3><p>Dados do menu.</p></div><span style="font-size:34px" aria-hidden="true">${esc(p.icon)}</span></div>
      <div class="form-row"><label for="productName">NOME</label><input id="productName" value="${esc(p.name)}"></div>
      <div class="form-grid"><div class="form-row"><label for="productIcon">ÍCONE</label><input id="productIcon" value="${esc(p.icon)}" maxlength="4"></div><div class="form-row"><label for="productPrice">PREÇO (MT)</label><input id="productPrice" type="number" min="0" value="${p.price}"></div></div>
      <div class="form-row"><label for="productCategory">CATEGORIA</label><input id="productCategory" value="${esc(p.category)}"></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary" id="saveProduct" data-id="${id||""}">Guardar produto</button></div>`);
  }
  function userModal(id=null){
    const u=id?user(id):{name:"",avatar:"🙂",pin:"",pinConfigured:false,monthlyBalance:500,active:true};
    const pinStatus=id?(cloudPinStates.get(Number(id))||"loading"):"unset",pinReady=pinStatus==="active"||pinStatus==="locked",pinPending=pinStatus==="pending",minimumBalance=id?Math.max(0,Number(u.monthlyBalance||0)-userAvailable(id)):0;
    openModal(`<div class="head" style="margin-top:0"><div><h3>${id?"Editar utilizador":"Novo utilizador"}</h3><p>Conta e saldo mensal.</p></div><span style="font-size:34px">${esc(u.avatar)}</span></div>
      <div class="form-row"><label for="userName">NOME</label><input id="userName" value="${esc(u.name)}"></div>
      <div class="form-row"><label for="userAvatar">AVATAR</label><input id="userAvatar" value="${esc(u.avatar)}" maxlength="4"></div>
      <div class="first-pin-note ${pinReady?"ready":""}"><span>${pinReady?"🔐":pinPending?"🕐":"🆕"}</span><div><strong>${pinReady?"PIN sincronizado e ativo":pinPending?"PIN à espera de aprovação":"PIN ainda não definido"}</strong><small>${pinReady?"Funciona em todos os dispositivos.":pinPending?"Aprova na lista de utilizadores.":"A pessoa vai pedir o PIN no primeiro acesso."}</small></div></div>
      ${id&&(pinReady||pinPending)?`<button class="secondary reset-pin" id="resetUserPin" data-id="${u.id}">REINICIAR PIN</button>`:""}
      <div class="form-row"><label for="userBalance">SALDO MENSAL (MT)</label><input id="userBalance" type="number" min="${minimumBalance}" max="1000000" value="${u.monthlyBalance}"><small class="field-hint">Mínimo atual: ${fmt(minimumBalance)} MT. Para retirar mola, usa “Descontar saldo”.</small></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary" id="saveUser" data-id="${id||""}">Guardar utilizador</button></div>`);
  }
  function rechargeModal(){
    openModal(`<div class="head" style="margin-top:0"><div><h3>Adicionar recarga</h3><p>Creditar saldo a um utilizador.</p></div><span style="font-size:34px">💰</span></div>
      <div class="form-row"><label for="rechargeUser">UTILIZADOR</label><select id="rechargeUser">${state.users.filter(u=>!u.legacyHidden).sort(byName).map(u=>`<option value="${u.id}">${esc(u.avatar)} ${esc(u.name)}</option>`).join("")}</select></div>
      <div class="form-row"><label for="rechargeAmount">VALOR (MT)</label><input id="rechargeAmount" type="number" min="1" placeholder="Ex.: 100"></div>
      <div class="form-row"><label for="rechargeNote">MOTIVO</label><input id="rechargeNote" value="Recarga extra"></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary" id="saveRecharge">Adicionar</button></div>`);
  }
  function deductionModal(selectedUserId=null){
    pendingAdminDeduction=null;
    const users=state.users.filter(u=>!u.legacyHidden).sort(byName),selected=users.find(u=>u.id===Number(selectedUserId))||users[0],available=selected?userAvailable(selected.id):0;
    openModal(`<div class="head" style="margin-top:0"><div><h3>Diminuir saldo</h3><p>Registar uma saída no saldo do utilizador.</p></div><span style="font-size:34px" aria-hidden="true">➖</span></div>
      <div class="form-row"><label for="deductionUser">UTILIZADOR</label><select id="deductionUser">${users.map(u=>`<option value="${u.id}" ${u.id===selected?.id?"selected":""}>${esc(u.avatar)} ${esc(u.name)}</option>`).join("")}</select></div>
      <div class="first-pin-note"><span aria-hidden="true">👛</span><div><strong>Saldo disponível</strong><small id="deductionAvailable" aria-live="polite">${fmt(available)} MT disponíveis. O saldo não pode ficar negativo.</small></div></div>
      <div class="form-row"><label for="deductionAmount">VALOR A DESCONTAR (MT)</label><input id="deductionAmount" type="number" min="1" max="${Math.max(0,available)}" step="1" inputmode="numeric" placeholder="Ex.: 25"></div>
      <div class="form-row"><label for="deductionNote">MOTIVO</label><input id="deductionNote" maxlength="200" value="Desconto administrativo"></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="saveDeduction" ${available<=0?"disabled":""}>DESCONTAR SALDO</button></div>`);
  }
  function refreshDeductionPreview(){
    const uid=Number($("#deductionUser")?.value),input=$("#deductionAmount"),button=$("#saveDeduction"),output=$("#deductionAvailable"),available=user(uid)?userAvailable(uid):0,amount=Number(input?.value||0),valid=Number.isInteger(amount)&&amount>0&&amount<=available;
    if(input){input.max=String(Math.max(0,available));input.removeAttribute("aria-invalid")}
    if(output)output.textContent=amount>0?`${fmt(available)} MT → ${fmt(available-amount)} MT depois do desconto.`:`${fmt(available)} MT disponíveis. O saldo não pode ficar negativo.`;
    if(button)button.disabled=!valid;
  }
  function userRechargeModal(value=""){
    openModal(`<div class="head" style="margin-top:0"><div><h3>Quero recarregar</h3><p>Escolhe quanta mola queres colocar no teu saldo.</p></div><span style="font-size:36px">💸</span></div>
      <div class="form-row"><label for="userRechargeAmount">VALOR DA RECARGA (MT)</label><input id="userRechargeAmount" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex.: 200" value="${esc(value)}" aria-describedby="userRechargeHint"><small class="field-hint" id="userRechargeHint">O saldo entra depois de o administrador confirmar a transferência.</small></div>
      <div class="sheet-actions"><button class="secondary" data-close>Cancelar</button><button class="primary orange" id="showRechargeNumber">CONTINUAR</button></div>`);
  }
  function userRechargePaymentModal(amount){
    openModal(`<div class="donation-pop"><div class="donation-emoji" aria-hidden="true">📲</div><div class="eyebrow">RECARGA DE SALDO</div><h3>Faz a transferência, boss</h3><p>Transfere <strong>${fmt(amount)} MT</strong> para o número abaixo e envia o comprovativo ao administrador.</p><div class="payment-number"><span>Número para transferência</span><strong>876 760 317</strong><button id="copyRechargeNumber" data-number="${RECHARGE_NUMBER}" data-amount="${amount}">📋 COPIAR NÚMERO</button></div><div class="recharge-pending-note"><span aria-hidden="true">⏳</span><div><strong>A recarga fica pendente</strong><small>O valor só aparece no saldo depois da confirmação do administrador.</small></div></div><div class="sheet-actions"><button class="secondary" id="editUserRecharge" data-amount="${amount}">ALTERAR VALOR</button><button class="primary" data-close>FECHAR</button></div></div>`);
  }
  async function placeUserOrder(){
    const items=Object.entries(cart).filter(([id,q])=>q>0&&canOrderProduct(product(id))).map(([id,qty])=>{const p=product(id);return {productId:Number(id),qty,choices:{...selectedChoices(p,"user")},unitPrice:selectedUnitPrice(p,"user")}});
    const special=customRequest.trim();if(!items.length&&!special){cart={};render();toast("Esse food hoje bazou, boss. Escolhe outro.");return}
    const total=items.reduce((s,i)=>s+itemPrice(i)*i.qty,0),u=activeUser(),available=userAvailable(u.id),insufficient=total>available;
    if(insufficient||available<=0){balanceRuleModal(total,available);return}
    const orderDate=orderSchedule==="tomorrow"?scheduledOrderDate():new Date().toISOString();
    const order={id:Math.max(0,...state.orders.map(o=>o.id))+1,type:"user",userId:u.id,date:orderDate,updatedAt:new Date().toISOString(),pendingSync:true,status:"pending",items,customRequest:special,needsContact:items.some(i=>product(i.productId)?.contactForFlavor||i.unitPrice===0)||Boolean(special)};order.syncKey=stableSyncKey("order",order);
    if(!cloudCredentials.userPin){toast("A tua sessão expirou. Entra novamente para enviar o pedido.");return}
    const cloudResult=await submitUserOperational(order);
    if(!cloudResult?.ok){
      if(cloudResult?.reason==="insufficient"){balanceRuleModal(total,Number(cloudResult.available||available));return}
      if(cloudResult?.reason==="invalid_schedule"){toast("Não foi possível agendar. Escolhe novamente amanhã às 06:00.");return}
      if(cloudResult?.reason==="unauthorized"){closeModal();logout();toast("A sessão expirou. Entra novamente para continuar.");return}
      toast("Não foi possível enviar o pedido. Verifica a ligação e tenta novamente.");return;
    }
    state.orders.unshift(order);cart={};cartChoices={};customRequest="";customOpen.user=false;orderSchedule="today";save();closeModal();page="home";render();celebrateOrder("Pedido criado e sincronizado. Já aparece nos teus pedidos. 🎉");
  }
  async function saveAdminOrder(){
    const type=$("#adminOrderType")?.value||"user",special=$("#adminCustomRequest")?.value.trim()||"",items=Object.entries(adminCart).filter(([id,q])=>q>0&&canOrderProduct(product(id))).map(([id,qty])=>{const p=product(id);return {productId:Number(id),qty,choices:{...selectedChoices(p,"admin")},unitPrice:selectedUnitPrice(p,"admin")}});
    const hasContent=items.length>0||Boolean(special);if(!hasContent){toast("Escolhe pelo menos um produto ou escreve um pedido especial, boss.");return}
    const selectedUser=type==="user"?user($("#adminOrderUser")?.value):null;
    const guestName=type==="guest"?$("#adminGuestName")?.value.trim():"",guestPhone=type==="guest"?$("#adminGuestPhone")?.value.trim():"";
    if(type==="user"&&!selectedUser){toast("Escolhe o utilizador do pedido.");return}
    if(type==="guest"&&guestName.length<2){const input=$("#adminGuestName"),error=$("#adminGuestNameError");input?.setAttribute("aria-invalid","true");if(error)error.hidden=false;input?.focus();toast("Escreve o nome do convidado.");return}
    const needsContact=items.some(i=>product(i.productId)?.contactForFlavor||i.unitPrice===0)||Boolean(special);
    if(type==="guest"&&needsContact&&!guestPhone){const input=$("#adminGuestPhone"),error=$("#adminGuestPhoneError");input?.setAttribute("aria-invalid","true");if(error)error.hidden=false;input?.focus();toast("Escreve um contacto para confirmarmos os detalhes.");return}
    const total=items.reduce((sum,item)=>sum+itemPrice(item)*item.qty,0),available=selectedUser?userAvailable(selectedUser.id):0;
    if(type==="user"&&(available<=0||total>available)){toast(`O utilizador só pode fazer pedidos com saldo suficiente. Disponível: ${fmt(available)} MT.`);return}
    const order={id:Math.max(0,...state.orders.map(o=>Number(o.id)||0))+1,type,userId:selectedUser?.id||null,guestName:type==="guest"?guestName:null,guestPhone:type==="guest"?guestPhone:null,date:new Date().toISOString(),updatedAt:new Date().toISOString(),pendingSync:false,status:"pending",items,customRequest:special,needsContact,guestDonation:0};
    order.syncKey=stableSyncKey("order",order);state.orders.unshift(order);save();const synced=await syncAdminOperational();
    if(!synced){state.orders=state.orders.filter(row=>row.syncKey!==order.syncKey);save();toast("Não foi possível criar o pedido no servidor. Verifica o saldo e a ligação, depois tenta novamente.");return}
    closeModal();render();celebrateOrder("Pedido criado e sincronizado em todos os dispositivos. 🎉");
  }

  document.addEventListener("click",async e=>{
    const entry=e.target.closest("[data-entry]");
    if(entry){
      if(entry.dataset.entry==="user")loginUserModal();
      if(entry.dataset.entry==="admin")loginAdminModal();
      return;
    }
    if(e.target.closest("#openRanking")){rankingModal();return}
    if(e.target.closest("[data-close]")){closeModal();return}
    if(e.target.closest("[data-logout]")){logout();return}

    const up=e.target.closest("[data-user-page]");if(up){page=up.dataset.userPage;if(cloudCredentials.userPin)await hydrateUserOperational(state.session.userId,cloudCredentials.userPin);renderWithFocus(`[data-user-page="${page}"]`);return}
    const ad=e.target.closest("[data-admin-section]");if(ad){adminSection=ad.dataset.adminSection;if(adminSection==="users")await loadAdminPinStates();await hydrateAdminOperational();renderWithFocus(`[data-admin-section="${adminSection}"]`);return}
    const cat=e.target.closest("[data-category]");if(cat){category=cat.dataset.category;renderWithFocus(`[data-category="${category}"]`);return}
    const of=e.target.closest("[data-order-filter]");if(of){orderFilter=of.dataset.orderFilter;renderWithFocus(`[data-order-filter="${orderFilter}"]`);return}
    const schedule=e.target.closest("[data-order-schedule]");if(schedule){orderSchedule=schedule.dataset.orderSchedule;renderWithFocus(`[data-order-schedule="${orderSchedule}"]`);return}
    if(e.target.id==="clearAdminOrderDate"){adminOrderDate="";renderWithFocus("#adminOrderDate");return}
    const customToggle=e.target.closest("[data-toggle-custom]");if(customToggle){const mode=customToggle.dataset.toggleCustom;customOpen[mode]=!customOpen[mode];renderWithFocus(`[data-toggle-custom="${mode}"]`);return}
    if(e.target.id==="openBalanceReceipt"){balanceReceiptSelectionModal();return}
    if(e.target.id==="previewBalanceReceipt"){balanceReceiptModal(refreshBalanceReceiptSelection());return}
    if(e.target.id==="editBalanceReceiptUsers"){balanceReceiptSelectionModal((e.target.dataset.userIds||"").split(",").filter(Boolean).map(Number));return}
    if(e.target.id==="printBalanceReceipt"){printBalanceReceipt((e.target.dataset.userIds||"").split(",").filter(Boolean).map(Number));return}
    if(e.target.closest("#openDailyReceipt")){dailyReceiptModal();return}
    if(e.target.id==="saveReceiptPrices"){const dateKey=e.target.dataset.date;if(saveReceiptPrices(dateKey)){dailyReceiptModal(dateKey);toast("Valores guardados. O recibo já está pronto para imprimir. 🧾")}return}
    if(e.target.id==="printDailyReceipt"){printDailyReceipt(e.target.dataset.date);return}
    if(e.target.id==="reviewUserOrder"){reviewOrderModal("user");return}
    if(e.target.id==="openUserRecharge"){userRechargeModal();return}
    if(e.target.id==="showRechargeNumber"){
      const input=$("#userRechargeAmount"),amount=Math.round(Number(input?.value||0));
      if(amount<=0){input?.setAttribute("aria-invalid","true");input?.focus();toast("Mete um valor válido para recarregar, boss.");return}
      userRechargePaymentModal(amount);return;
    }
    if(e.target.id==="editUserRecharge"){userRechargeModal(e.target.dataset.amount||"");return}
    if(e.target.id==="copyRechargeNumber"){
      copyText(e.target.dataset.number).then(()=>{e.target.textContent="✅ NÚMERO COPIADO";toast(`Número copiado. Transfere ${fmt(Number(e.target.dataset.amount))} MT e manda o comprovativo.`)}).catch(()=>{toast("Não deu para copiar. Usa o número 876 760 317.")});return;
    }
    if(e.target.id==="newAdminOrder"){adminOrderModal();return}

    const plus=e.target.closest("[data-cart-plus]");if(plus){const mode=plus.dataset.cartMode,id=plus.dataset.cartPlus,target=mode==="admin"?adminCart:cart;target[id]=(target[id]||0)+1;if(mode==="admin"){const row=plus.closest("[data-admin-product-row]");if(row){$(".qty span",row).textContent=target[id];row.classList.add("selected")}refreshAdminOrderSummary()}else renderWithFocus(`[data-cart-plus="${id}"][data-cart-mode="${mode}"]`);return}
    const minus=e.target.closest("[data-cart-minus]");if(minus){const mode=minus.dataset.cartMode,id=minus.dataset.cartMinus,target=mode==="admin"?adminCart:cart;target[id]=Math.max(0,(target[id]||0)-1);if(mode==="admin"){const row=minus.closest("[data-admin-product-row]");if(row){$(".qty span",row).textContent=target[id];row.classList.toggle("selected",target[id]>0)}refreshAdminOrderSummary()}else renderWithFocus(`[data-cart-minus="${id}"][data-cart-mode="${mode}"]`);return}

    if(e.target.id==="confirmUserLogin"){
      const u=user($("#loginUser").value);if(!u)return;
      const cloudStatus=cloudPinStates.get(Number(u.id))||await getCloudPinStatus(u.id);
      if(cloudStatus==="unset"){
        const pin=$("#newUserPin")?.value||"",confirmation=$("#confirmNewUserPin")?.value||"";
        if(!/^\d{4}$/.test(pin)){toast("O PIN deve ter exatamente 4 números, boss.");return}
        if(pin!==confirmation){toast("Os dois PINs não batem. Tenta outra vez.");return}
        const result=await cloudRpc("request_user_pin",{p_user_id:u.id,p_pin:pin}).catch(()=>"offline");cloudPinStates.set(Number(u.id),result);refreshLoginPinFields();toast(result==="pending"?"PIN enviado! Agora o administrador precisa aprovar. 🕐":"Não deu para guardar o PIN. Tenta novamente.");return;
      }
      if(cloudStatus!=="active"){toast(cloudStatus==="pending"?"O teu PIN ainda espera aprovação do administrador.":cloudStatus==="locked"?"Conta bloqueada por 15 minutos.":"Não deu para confirmar a conta.");return}
      const pin=$("#loginUserPin")?.value||"";if(!/^\d{4}$/.test(pin)){toast("Mete os 4 números do teu PIN.");return}
      const verified=await cloudRpc("verify_user_pin",{p_user_id:u.id,p_pin:pin}).catch(()=>"offline");
      if(verified!=="ok"){if(verified==="locked")cloudPinStates.set(Number(u.id),"locked");toast(verified==="locked"?"Muitas tentativas. A conta ficou bloqueada por 15 minutos.":verified==="offline"?"Sem ligação ao servidor. Tenta novamente.":"Eish, boss! Esse PIN não bate.");refreshLoginPinFields();return}
      u.pin="";u.pinConfigured=true;u.pinSetAt=new Date().toISOString();storeCloudCredentials({mode:"user",userId:u.id,userPin:pin});save();
      state.session={mode:"user",userId:u.id};save();await syncUserOperational(u.id,pin);await hydrateUserOperational(u.id,pin);closeModal();page="home";render();focusMain();return;
    }
    if(e.target.id==="confirmAdminLogin"){
      const adminPin=$("#adminPin").value.trim();if(!/^\d{4,8}$/.test(adminPin)){toast("Mete um PIN administrativo válido, boss.");return}
      const loaded=await cloudRpc("load_admin_operational_state",{p_admin_pin:adminPin}).catch(()=>null);if(!loaded){toast("Esse PIN não abre o mambo ou a conta está temporariamente bloqueada.");return}
      storeCloudCredentials({mode:"admin",adminPin});state.session={mode:"admin",userId:null};save();await loadAdminPinStates();await hydrateAdminOperational(adminPin);closeModal();adminSection="dashboard";render();focusMain();return;
    }
    if(e.target.id==="submitUserOrder"){await placeUserOrder();return}
    if(e.target.id==="saveAdminOrder"){await saveAdminOrder();return}

    const ao=e.target.closest("[data-admin-order]");if(ao){editOrderModal(ao.dataset.adminOrder);return}
    const removeOrder=e.target.closest("[data-delete-order]");if(removeOrder){deleteOrderConfirmModal(removeOrder.dataset.deleteOrder);return}
    if(e.target.id==="confirmDeleteOrder"){
      const o=state.orders.find(x=>x.id===Number(e.target.dataset.id));if(!o)return;
      const deleted=await cloudRpc("admin_delete_order",{p_admin_pin:cloudCredentials.adminPin,p_sync_key:o.syncKey}).catch(()=>false);
      if(!deleted){toast("Não deu para eliminar o pedido no servidor. Nada foi apagado.");return}
      state.orders=state.orders.filter(row=>row.syncKey!==o.syncKey);state.donationPledges=state.donationPledges.filter(pledge=>pledge.orderSyncKey!==o.syncKey);save();closeModal();render();toast("Pedido eliminado em todos os dispositivos.");return;
    }
    if(e.target.id==="saveOrderStatus"){
      const o=state.orders.find(x=>x.id===Number(e.target.dataset.id));if(!o)return;
      const previous=structuredClone(o),previousStatus=o.status,inputs=$$('[data-order-price]'),status=$("#orderStatus").value,unpriced=inputs.find(input=>(Number(input.value)||0)<=0);if(status==="paid"&&unpriced){unpriced.focus();toast("Define todos os preços antes de marcar como pago, boss.");return}
      inputs.forEach(input=>{const value=Math.max(0,Number(input.value)||0);if(input.hasAttribute("data-custom-price"))o.customPrice=value;else if(o.items[Number(input.dataset.itemIndex)])o.items[Number(input.dataset.itemIndex)].unitPrice=value});
      o.status=status;o.needsContact=(o.items||[]).some(item=>itemPrice(item)<=0)||Boolean(o.customRequest&&Number(o.customPrice||0)<=0);o.priceAdjustedAt=new Date().toISOString();o.updatedAt=o.priceAdjustedAt;save();
      const synced=await syncAdminOperational();if(!synced){Object.assign(o,previous);save();toast("Não foi possível atualizar o pedido. Confirma o saldo disponível e tenta novamente.");return}
      closeModal();render();if(status!==previousStatus&&status==="paid"){orderStatusFeedback()}else toast("Pedido e preços atualizados. 🧾");return
    }
    if(e.target.id==="newProduct"){productModal();return}
    const ep=e.target.closest("[data-edit-product]");if(ep){productModal(Number(ep.dataset.editProduct));return}
    const tp=e.target.closest("[data-toggle-product]");if(tp){const p=product(tp.dataset.toggleProduct),active=!p.active,saved=await cloudRpc("admin_toggle_product",{p_admin_pin:cloudCredentials.adminPin,p_product_id:Number(tp.dataset.toggleProduct),p_active:active}).catch(()=>false);if(!saved){toast("Não deu para atualizar o produto no servidor.");return}p.active=active;p.updatedAt=new Date().toISOString();save();render();return}
    if(e.target.id==="saveProduct"){
      const id=Number(e.target.dataset.id),name=$("#productName").value.trim(),icon=$("#productIcon").value.trim()||"🍞",price=Number($("#productPrice").value),category=$("#productCategory").value.trim()||"Outros",existing=id?product(id):null,next={id:id||Math.max(0,...state.products.map(p=>p.id))+1,name,icon,price,category,active:existing?.active!==false,contactForFlavor:Boolean(existing?.contactForFlavor),options:existing?.options||[]};
      if(!name||price<0){toast("Preenche nome e preço.");return}
      const saved=await cloudRpc("admin_upsert_product",{p_admin_pin:cloudCredentials.adminPin,p_product:next}).catch(()=>false);if(!saved){toast("Não deu para guardar o produto no servidor.");return}
      if(existing)Object.assign(existing,next,{updatedAt:new Date().toISOString()});else state.products.push({...next,updatedAt:new Date().toISOString()});
      save();closeModal();render();toast("Produto guardado em todos os dispositivos.");return;
    }
    if(e.target.id==="newUser"){userModal();return}
    const eu=e.target.closest("[data-edit-user]");if(eu){userModal(Number(eu.dataset.editUser));return}
    const tu=e.target.closest("[data-toggle-user]");if(tu){const u=user(tu.dataset.toggleUser),previous=structuredClone(u);u.active=!u.active;u.updatedAt=new Date().toISOString();const synced=await syncAdminOperational();if(!synced){Object.assign(u,previous);toast("Não deu para atualizar este utilizador no servidor.");return}save();render();return}
    if(e.target.id==="saveUser"){
      const id=Number(e.target.dataset.id),name=$("#userName").value.trim(),avatar=$("#userAvatar").value.trim()||"🙂",monthlyBalance=Number($("#userBalance").value),existing=id?user(id):null;
      if(!name||!Number.isFinite(monthlyBalance)||monthlyBalance<0||monthlyBalance>1000000){toast("Preenche os dados corretamente.");return}
      if(existing&&userAvailable(id)-Number(existing.monthlyBalance||0)+monthlyBalance<0){toast("Esse saldo mensal deixaria a conta negativa. Usa a ação de desconto ou escolhe um valor maior.");return}
      const uid=id||Math.max(0,...state.users.map(u=>u.id))+1,previous=existing?structuredClone(existing):null;
      const cloudSaved=await cloudRpc("admin_upsert_app_user",{p_admin_pin:cloudCredentials.adminPin,p_user_id:uid,p_user_name:name,p_avatar:avatar}).catch(()=>false);if(!cloudSaved){toast("Não deu para guardar este utilizador no servidor.");return}
      if(existing)Object.assign(existing,{name,avatar,monthlyBalance,updatedAt:new Date().toISOString()});else state.users.push({id:uid,name,avatar,pin:"",pinConfigured:false,monthlyBalance,active:true,updatedAt:new Date().toISOString()});
      const synced=await syncAdminOperational();if(!synced){if(previous)Object.assign(existing,previous);else state.users=state.users.filter(u=>u.id!==uid);await hydrateAdminOperational();toast("O utilizador foi criado, mas não deu para sincronizar o saldo. Tenta novamente.");return}
      cloudPinStates.set(uid,cloudPinStates.get(uid)||"unset");save();closeModal();render();toast("Utilizador e saldo guardados em todos os dispositivos.");return;
    }
    if(e.target.id==="resetUserPin"){
      const u=user(e.target.dataset.id);if(!u)return;
      resetPinConfirmModal(u);return;
    }
    if(e.target.id==="confirmResetUserPin"){
      const u=user(e.target.dataset.id);if(!u)return;
      const resetOk=await cloudRpc("reset_user_pin",{p_admin_pin:cloudCredentials.adminPin,p_user_id:u.id}).catch(()=>false);if(!resetOk){toast("Não deu para reiniciar o PIN no servidor.");return}u.pin="";u.pinConfigured=false;delete u.pinSetAt;cloudPinStates.set(Number(u.id),"unset");save();closeModal();render();toast(`PIN de ${u.name} reiniciado em todos os dispositivos.`);return;
    }
    const approvePin=e.target.closest("[data-approve-pin]");if(approvePin){const uid=Number(approvePin.dataset.approvePin),approved=await cloudRpc("approve_user_pin",{p_admin_pin:cloudCredentials.adminPin,p_user_id:uid}).catch(()=>false);if(!approved){toast("Não deu para aprovar este PIN.");return}cloudPinStates.set(uid,"active");render();toast(`PIN de ${user(uid)?.name||"utilizador"} aprovado. Já pode entrar! 🔐`);return}
    if(e.target.id==="saveAdminPin"){
      const newPin=$("#newAdminPin").value.trim();if(!/^\d{4,8}$/.test(newPin)){toast("O novo PIN deve ter 4 a 8 números.");return}
      const changed=await cloudRpc("admin_change_pin",{p_current_pin:cloudCredentials.adminPin,p_new_pin:newPin}).catch(()=>false);if(!changed){toast("Não foi possível trocar o PIN. Tenta novamente.");return}
      storeCloudCredentials({...cloudCredentials,adminPin:newPin});$("#newAdminPin").value="";toast("PIN administrativo trocado com sucesso. 🔐");return;
    }
    const removePledge=e.target.closest("[data-remove-pledge]");if(removePledge){
      const pledge=state.donationPledges.find(p=>p.id===Number(removePledge.dataset.removePledge));
      if(pledge?.orderId||pledge?.orderSyncKey){const order=state.orders.find(o=>Number(o.id)===Number(pledge.orderId)||o.syncKey===pledge.orderSyncKey);if(order){order.guestDonation=0;order.updatedAt=new Date().toISOString()}}
      state.donationPledges=state.donationPledges.filter(p=>p.id!==Number(removePledge.dataset.removePledge));save();if(pledge?.syncKey)await cloudRpc("admin_delete_donation",{p_admin_pin:cloudCredentials.adminPin,p_sync_key:pledge.syncKey}).catch(()=>false);await syncAdminOperational();render();toast(pledge?.userId?"Contribuição removida e saldo devolvido.":pledge?.orderId?"Contribuição removida do pedido.":"Contribuição diária removida.");return;
    }
    const deductUser=e.target.closest("[data-deduct-user]");if(deductUser){deductionModal(Number(deductUser.dataset.deductUser));return}
    if(e.target.id==="adminRecharge"){rechargeModal();return}
    if(e.target.id==="adminDeduction"){deductionModal();return}
    if(e.target.id==="saveRecharge"){
      const amount=Number($("#rechargeAmount").value),uid=Number($("#rechargeUser").value),note=$("#rechargeNote").value.trim()||"Recarga";
      if(!Number.isFinite(amount)||amount<=0||amount>1000000||!user(uid)){toast("Mete uma mola válida, boss.");return}
      const button=e.target;button.disabled=true;button.textContent="A GUARDAR...";
      const recharge={id:Date.now(),userId:uid,date:new Date().toISOString(),amount,note,pendingSync:false};
      recharge.syncKey=stableSyncKey("recharge",recharge);
      const synced=await submitAdminRecharge(recharge);
      if(!synced?.ok){button.disabled=false;button.textContent="Adicionar";toast("Não foi possível adicionar a recarga no servidor. Nada foi alterado.");return}
      state.recharges.unshift(recharge);save();closeModal();render();toast("Mola adicionada e sincronizada em todos os dispositivos. Está nice!");return;
    }
    if(e.target.id==="saveDeduction"){
      const uid=Number($("#deductionUser").value),amount=Number($("#deductionAmount").value),note=$("#deductionNote").value.trim()||"Desconto administrativo",available=user(uid)?userAvailable(uid):0,input=$("#deductionAmount");
      if(!user(uid)||!Number.isInteger(amount)||amount<=0||amount>available){input?.setAttribute("aria-invalid","true");input?.focus();toast(amount>available?`Só podes descontar até ${fmt(available)} MT.`:"Mete um valor inteiro válido para descontar.");return}
      const button=e.target;button.disabled=true;button.textContent="A DESCONTAR...";
      const fingerprint=`${uid}:${amount}:${note}`;
      if(!pendingAdminDeduction||pendingAdminDeduction.fingerprint!==fingerprint){const movement={id:Date.now(),userId:uid,date:new Date().toISOString(),amount:-amount,note,pendingSync:false};movement.syncKey=stableSyncKey("balance-deduction",movement);pendingAdminDeduction={fingerprint,movement}}
      const movement=pendingAdminDeduction.movement;
      const result=await submitAdminDeduction(movement);
      if(!result?.ok){button.disabled=false;button.textContent="DESCONTAR SALDO";if(result?.reason==="insufficient"){pendingAdminDeduction=null;await hydrateAdminOperational();refreshDeductionPreview();toast(`O saldo mudou noutro dispositivo. Disponível agora: ${fmt(Number(result.available||0))} MT.`)}else toast("Não foi possível diminuir o saldo. Nada foi alterado. Podes tentar novamente.");return}
      pendingAdminDeduction=null;movement.id=Number(result.id)||movement.id;movement.date=result.date||movement.date;movement.amount=Number(result.amount)||-amount;movement.updatedAt=movement.date;state.recharges.unshift(movement);save();await hydrateAdminOperational();closeModal();render();toast(`Saldo de ${user(uid)?.name||"utilizador"} diminuído para ${fmt(Number(result.available))} MT.`);return;
    }
    if(e.target.id==="resetDemo"){resetSystemConfirmModal();return}
    if(e.target.id==="confirmSystemReset"){closeModal();reset();toast("Dados locais limpos. Os dados partilhados no Supabase foram preservados. ♻️");return}
  });

  document.addEventListener("input",e=>{
    if(e.target.id==="adminGuestName"||e.target.id==="adminGuestPhone"){e.target.removeAttribute("aria-invalid");const error=$(e.target.id==="adminGuestName"?"#adminGuestNameError":"#adminGuestPhoneError");if(error)error.hidden=true}
    if(e.target.id==="userRechargeAmount")e.target.removeAttribute("aria-invalid");
    if(e.target.id==="deductionAmount"){pendingAdminDeduction=null;refreshDeductionPreview();return}
    if(e.target.id==="deductionNote"){pendingAdminDeduction=null;return}
    if(e.target.matches("[data-custom-mode]")){const mode=e.target.dataset.customMode;if(mode==="admin")adminCustomRequest=e.target.value;else customRequest=e.target.value;refreshCheckout(mode);return}
    if(e.target.id==="adminCustomRequest"){adminCustomRequest=e.target.value;refreshAdminOrderSummary();return}
    if(e.target.matches("[data-order-price]")){const total=$$("[data-order-price]").reduce((sum,input)=>sum+(Math.max(0,Number(input.value)||0)*Number(input.dataset.qty||1)),0)+Number($("#editableOrderTotal")?.dataset.donation||0),output=$("#editableOrderTotal");if(output)output.textContent=`${fmt(total)} MT`;return}
  });
  document.addEventListener("change",e=>{
    if(e.target.id==="loginUser"){refreshLoginPinFields();return}
    if(e.target.id==="dailyReceiptDate"){dailyReceiptModal(e.target.value||localDateKey());return}
    if(e.target.id==="balanceReceiptSelectAll"){$$("[data-balance-receipt-user]").forEach(box=>{box.checked=e.target.checked});refreshBalanceReceiptSelection();return}
    if(e.target.matches("[data-balance-receipt-user]")){refreshBalanceReceiptSelection();return}
    if(e.target.id==="adminOrderDate"){adminOrderDate=e.target.value;renderWithFocus("#adminOrderDate");return}
    if(e.target.id==="adminOrderType"){const guest=e.target.value==="guest";$("#adminRegisteredTarget").hidden=guest;$("#adminGuestTarget").hidden=!guest;return}
    if(e.target.id==="deductionUser"){pendingAdminDeduction=null;refreshDeductionPreview();return}
    if(e.target.matches("[data-product-option]")){const mode=e.target.dataset.cartMode,store=choiceStore(mode),id=e.target.dataset.productOption,key=e.target.dataset.optionKey;if(!store[id])store[id]={};store[id][key]=e.target.value;if(mode==="admin"){const row=e.target.closest("[data-admin-product-row]"),price=$(".price",row);if(price)price.textContent=selectedUnitPrice(product(id),mode)>0?`${fmt(selectedUnitPrice(product(id),mode))} MT`:"Preço a confirmar";refreshAdminOrderSummary();return}renderWithFocus(`[data-product-option="${id}"][data-option-key="${key}"][data-cart-mode="${mode}"]`)}
  });
  $("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
  window.addEventListener("keydown",e=>{const modal=$("#modal");if(!modal.classList.contains("open"))return;if(e.key==="Escape"){e.preventDefault();closeModal();return}if(e.key==="Tab"){const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])',modal).filter(el=>el.offsetParent!==null);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
  window.addEventListener("storage",e=>{
    if(e.key!==KEY||!e.newValue)return;
    const currentSession=state.session;
    state=load();
    state.session=currentSession;
    if($(".ranking-modal"))rankingModal();else render();
  });
  let cloudRefreshBusy=false;
  async function refreshOperationalState(){if(cloudRefreshBusy||document.hidden)return;cloudRefreshBusy=true;try{let refreshed=false;if(state.session.mode==="user"&&cloudCredentials.userPin){const sessionStatus=await userSessionStatus(state.session.userId,cloudCredentials.userPin);if(sessionStatus==="blocked"){logout();toast("A tua conta foi bloqueada pelo administrador.");return}if(sessionStatus!=="ok")return;await syncUserOperational(state.session.userId,cloudCredentials.userPin);refreshed=await hydrateUserOperational(state.session.userId,cloudCredentials.userPin)}else if(state.session.mode==="admin"&&cloudCredentials.adminPin){await syncAdminOperational();refreshed=await hydrateAdminOperational()}else{refreshed=await hydratePublicBootstrap()}if(refreshed&&!$("#modal").classList.contains("open"))render()}finally{cloudRefreshBusy=false}}
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void refreshOperationalState()});
  setInterval(refreshOperationalState,20000);
  if("serviceWorker" in navigator && location.protocol.startsWith("http")){navigator.serviceWorker.register("sw.js?v=75").catch(()=>{});}
  render();
  hydratePublicBootstrap().then(ok=>{if(ok&&!state.session.mode)render()});
})();
