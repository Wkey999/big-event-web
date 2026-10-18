import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getUserInfo as getUserInfoApi } from '@/api/user'
import { useAiSettingsStore } from '@/stores/aiSettings'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  let infoPromise = null
  let session = 0

  async function login(username, password) {
    useAiSettingsStore().clear()
    session++
    infoPromise = null
    userInfo.value = null
    const res = await loginApi({ username, password })
    token.value = res.data.token
    localStorage.setItem('token', token.value)
  }

  async function fetchUserInfo() {
    const current = session
    const res = await getUserInfoApi()
    if (current === session) userInfo.value = res.data
    return res.data
  }

  function ensureUserInfo() {
    if (userInfo.value) return Promise.resolve(userInfo.value)
    if (!infoPromise) {
      const current = session
      infoPromise = fetchUserInfo().finally(() => { if (current === session) infoPromise = null })
    }
    return infoPromise
  }

  function logout() {
    useAiSettingsStore().clear()
    session++
    infoPromise = null
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, login, fetchUserInfo, ensureUserInfo, logout }
})
