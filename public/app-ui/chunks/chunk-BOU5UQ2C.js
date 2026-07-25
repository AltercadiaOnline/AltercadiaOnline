var o=!1,n=new Set;function t(e){if(o!==e){o=e;for(let r of n)r()}}function p(){return o}function d(e){return n.add(e),()=>n.delete(e)}export{t as a,p as b,d as c};
