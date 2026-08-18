<template>
  <transition name="slide-up">
    <div v-if="show" class="dating-app-container">
      <header class="dating-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="close-icon-btn" @click="$emit('close')">
            <svg viewBox="0 0 384 512" width="14" height="14" fill="currentColor"><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
          </div>
          <h1 class="header-title">{{ headerTitle }}</h1>
        </div>
      </header>

      <div class="dating-main-content">
        <DiscoverTab
          v-if="activeTab === 'discover'"
          @open-swipe="showSwipeModal = true"
          @open-random="showRandomModal = true"
          @open-chat="handleOpenChat"
        />
        <ChatsTab v-if="activeTab === 'chats'" @open-chat="handleOpenChat" />
        <ProfileTab
          v-if="activeTab === 'profile'"
          @open-settings="showSettingsModal = true"
          @open-chat="handleOpenChat"
        />
      </div>

      <nav class="dating-bottom-nav">
        <div class="nav-item" :class="{ active: activeTab === 'discover' }" @click="switchTab('discover', '冷推')">
          <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg><span>广场</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'chats' }" @click="switchTab('chats', '私聊')">
          <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor"><path d="M256 32C114.6 32 0 125.1 0 240c0 49.6 21.4 95 57 130.7C44.5 421.1 2.7 466 2.2 466.5c-2.2 2.3-2.8 5.7-1.5 8.7S4.8 480 8 480c66.3 0 116-31.8 140.6-51.4 32.7 12.3 69 19.4 107.4 19.4 141.4 0 256-93.1 256-208S397.4 32 256 32zM128 272c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128 0c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32zm128 0c-17.7 0-32-14.3-32-32s14.3-32 32-32 32 14.3 32 32-14.3 32-32 32z"/></svg><span>私聊</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'profile' }" @click="switchTab('profile', '我的')">
          <svg viewBox="0 0 448 512" width="20" height="20" fill="currentColor"><path d="M224 256A128 128 0 1 0 224 0a128 128 0 1 0 0 256zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z"/></svg><span>我的</span>
        </div>
      </nav>

      <SwipeModal :show="showSwipeModal" @close="showSwipeModal = false" @open-filter="showFilterModal = true" @start-chat="jumpToChat" />
      <FilterModal :show="showFilterModal" @close="showFilterModal = false" />
      <RandomSetupModal :show="showRandomModal" @close="showRandomModal = false" @start-chat="jumpToChat" />
      <DatingChatDetail :show="showChatDetail" :chatId="activeChatId" @close="showChatDetail = false" />
      <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />

      <div class="elegant-toast-container">
        <transition-group name="toast-pop">
          <div class="elegant-toast-item" v-for="t in toasts" :key="t.id">
            <div class="toast-icon-wrap">
              <i class="fas fa-info" v-if="!t.isError"></i>
              <i class="fas fa-exclamation-triangle" v-else style="color: #ff3b30;"></i>
            </div>
            <div class="toast-text">{{ t.msg }}</div>
          </div>
        </transition-group>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 冷推 App 外层容器
 *
 * 这次修复：
 * 1. 顶栏多出来一截的问题
 *    - 原因是内嵌 App 环境里重复吃了 safe-area-inset-top
 * 2. 这里逻辑不变，只保留布局修正
 */

import { ref, onMounted, onUnmounted } from 'vue'
import DiscoverTab from './tabs/DiscoverTab.vue'
import ChatsTab from './tabs/ChatsTab.vue'
import ProfileTab from './tabs/ProfileTab.vue'

import SwipeModal from './components/SwipeModal.vue'
import FilterModal from './components/FilterModal.vue'
import RandomSetupModal from './components/RandomSetupModal.vue'
import DatingChatDetail from './components/DatingChatDetail.vue'
import SettingsModal from './components/SettingsModal.vue'

import { useDatingPlayer } from '@/composables/useDatingPlayer'
import { useDatingPrefs } from '@/composables/useDatingPrefs'

defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const activeTab = ref('discover')
const headerTitle = ref('冷推')

const showSwipeModal = ref(false)
const showFilterModal = ref(false)
const showRandomModal = ref(false)
const showSettingsModal = ref(false)
const showChatDetail = ref(false)
const activeChatId = ref(null)

const { loadPlayer } = useDatingPlayer()
const { loadPrefs } = useDatingPrefs()

const toasts = ref([])
let toastIdCounter = 0

const handleSysToast = (e) => {
  e.stopPropagation()
  const msg = typeof e.detail === 'string' ? e.detail : (e.detail?.text || '操作成功')
  const isError = msg.includes('失败') || msg.includes('异常') || msg.includes('错误')
  const id = toastIdCounter++
  toasts.value.push({ id, msg, isError })

  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3000)
}

onMounted(async () => {
  await loadPlayer()
  await loadPrefs()
  window.addEventListener('sys-toast', handleSysToast)
})

onUnmounted(() => {
  window.removeEventListener('sys-toast', handleSysToast)
})

const switchTab = (tabId, title) => {
  activeTab.value = tabId
  headerTitle.value = title
}

const handleOpenChat = (chatId) => {
  if (!chatId) return
  activeTab.value = 'chats'
  headerTitle.value = '私聊'
  activeChatId.value = chatId
  showChatDetail.value = true
}

const jumpToChat = (newChatId) => {
  showSwipeModal.value = false
  showRandomModal.value = false
  switchTab('chats', '私聊')
  setTimeout(() => {
    activeChatId.value = newChatId
    showChatDetail.value = true
  }, 300)
}
</script>

<style scoped>
.dating-app-container {
  position: absolute;
  /* 整个容器下移到宿主状态栏之下：聊天室/速配等 absolute 全屏子页
     也一并避让（此前仅 padding 下移文档流内容，absolute 子页仍会盖住顶部）。
     偏移上限压到状态栏量级：宿主注入的 --ai-phone-app-safe-top 可能含悬浮胶囊
     高度，冷推只需避开状态栏，胶囊是宿主 UI 会浮在最上层，无需让位。 */
  top: min(var(--ai-phone-app-safe-top, 44px), 32px);
  left: 0;
  width: 100%;
  height: calc(100% - min(var(--ai-phone-app-safe-top, 44px), 32px));
  background-color: #f4f5f7;
  color: #1c1c1e;
  /* 去掉高 z-index，避免盖住宿主右上角的系统返回胶囊 */
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/**
 * 修复顶栏高出来一截：
 * 原来这里吃了 env(safe-area-inset-top)，但外层容器已经处理过安全区。
 * 所以这里改成固定 padding，避免重复向下顶。
 */
.dating-header {
  padding: 8px 16px 12px;
  background: #ffffff;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e5ea;
  z-index: 10;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  margin: 0;
}

.close-icon-btn {
  width: 30px;
  height: 30px;
  background: #f4f5f7;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
}

.close-icon-btn:active {
  background: #e5e5ea;
}

.dating-main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 80px;
}

.dating-bottom-nav {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid #e5e5ea;
  display: flex;
  justify-content: space-around;
  padding: 12px 0 calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #c7c7cc;
  cursor: pointer;
  gap: 4px;
  transition: color 0.2s;
}

.nav-item.active {
  color: #14CCCC;
}

.nav-item i {
  font-size: 20px;
}

.nav-item span {
  font-size: 10px;
  font-weight: 600;
}

.elegant-toast-container {
  position: absolute;
  top: 64px;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  pointer-events: none;
  z-index: 999999;
}

.elegant-toast-item {
  background: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 20px 12px 14px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast-icon-wrap {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #14CCCC;
  font-size: 10px;
}

.toast-text {
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-pop-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.9);
}

.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}
</style>
