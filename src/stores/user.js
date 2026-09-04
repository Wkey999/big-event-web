import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getUserInfo as getUserInfoApi } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  async function login(username, password) {
    const res = await loginApi({ username, password })
    token.value = res.data.token
    localStorage.setItem('token', token.value)
  }

  async function fetchUserInfo() {
    const res = await getUserInfoApi()
    userInfo.value = res.data
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, login, fetchUserInfo, logout }
})
