<script setup>
import BrandMark from './BrandMark.vue'
</script>
<template>
  <div class="auth-page">
    <header><BrandMark /><span>关于 AI，关于科技，关于新的可能。</span></header>
    <main>
      <section class="auth-intro"><span class="eyebrow">STAY CURIOUS. KEEP CREATING.</span><h1>好奇心，<br>值得被看见<span>。</span></h1><p>发现有意思的技术，记录亲手做过的实践。<br>和同样好奇的人，一起把想法变成内容。</p><div class="auth-art" aria-hidden="true"><span>AI</span><i>IDEAS</i><b>↗</b><small>MAKE SOMETHING NEW</small></div></section>
      <section class="auth-panel"><slot /></section>
    </main>
    <footer>BOOM · 大事件　 /　 给每一个正在探索的人</footer>
  </div>
</template>
<style scoped>
.auth-page{min-height:100vh;padding:32px 6%;background:#f3f6ef}.auth-page>header{display:flex;align-items:center;justify-content:space-between}.auth-page>header>span{font-size:12px;color:#839080}.auth-page>main{max-width:1120px;margin:75px auto 60px;display:grid;grid-template-columns:1.3fr 1fr;gap:90px;align-items:center}.auth-intro h1{font-size:62px;line-height:1.2;letter-spacing:-3px;margin:24px 0}.auth-intro h1>span{color:#638649}.auth-intro p{color:#77816f;font-size:14px;line-height:2}.auth-panel{background:white;border:1px solid #e1e7dc;border-radius:20px;padding:42px;box-shadow:0 15px 60px #27391e07}.auth-art{width:360px;height:150px;margin-top:36px;position:relative;background:#e5eddb;border-radius:8px;overflow:hidden}.auth-art>span{position:absolute;left:28px;top:2px;font-size:94px;font-weight:800;letter-spacing:-8px;color:#48673c}.auth-art>i{position:absolute;left:155px;top:52px;font-size:24px;font-family:Georgia,serif;font-style:normal;transform:rotate(-12deg);background:#f8faef;padding:5px 18px}.auth-art>b{position:absolute;right:15px;top:0;font-size:87px;font-weight:400;color:#8ca874}.auth-art>small{position:absolute;bottom:14px;left:30px;font-size:9px;letter-spacing:2px;color:#718861}.auth-page>footer{text-align:center;font-size:11px;color:#8d9786;letter-spacing:1px}
</style>
