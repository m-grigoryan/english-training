/* Four-second display clock; keys and generations reject stale callbacks. */
(function(root){
'use strict';
class QuickClock{
 constructor({now=()=>Date.now(),setTimer=root.setTimeout.bind(root),clearTimer=root.clearTimeout.bind(root)}={}){this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.generation=0;this.timer=null}
 stop(){this.generation++;if(this.timer!==null)this.clearTimer(this.timer);this.timer=null}
 arm(key,deadline,onExpire,onTick=()=>{}){this.stop();const token=this.generation;const tick=()=>{if(token!==this.generation)return;const remaining=Math.max(0,deadline-this.now());onTick(remaining);if(remaining===0){this.timer=null;this.generation++;onExpire(key);return}this.timer=this.setTimer(tick,Math.min(100,remaining))};tick()}
}
root.TrainingQuickClock=QuickClock;
})(globalThis);
