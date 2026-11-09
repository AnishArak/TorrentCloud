import axios from 'axios';
const url=process.env.ARIA2_RPC_URL||'http://127.0.0.1:6800/jsonrpc';
const secret=process.env.ARIA2_RPC_SECRET||'';
let id=1;
async function rpc(method,params=[]){
  const p=secret?[`token:${secret}`,...params]:params;
  const r=await axios.post(url,{jsonrpc:'2.0',id:id++,method:`aria2.${method}`,params:p},{timeout:10000});
  return r.data.result;
}
export const addTorrent=(base64,options={})=>rpc('addTorrent',[base64,[],options]);
export const addUri=(uri,options={})=>rpc('addUri',[[uri],options]);
export const tellStatus=(gid)=>rpc('tellStatus',[gid,['gid','status','totalLength','completedLength','downloadSpeed','uploadSpeed','bittorrent','files']]);
export const pause=(gid)=>rpc('pause',[gid]);
export const resume=(gid)=>rpc('unpause',[gid]);
export const cancel=(gid)=>rpc('forceRemove',[gid]);
export const changeOptions=(gid,options)=>rpc('changeOption',[gid,options]);
export const changeGlobalOptions=(options)=>rpc('changeGlobalOption',[options]);
