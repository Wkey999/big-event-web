<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { updatePassword, updateUserInfo, uploadImage } from '@/api/user'
import AppIcon from '@/components/AppIcon.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import PresetAvatarDialog from '@/components/PresetAvatarDialog.vue'
import { avatarPresets, featuredAvatars } from '@/utils/avatars'

const router = useRouter()
const userStore = useUserStore()

const infoRef = ref()
const pwdRef = ref()
const savingInfo = ref(false)
const savingPwd = ref(false)
const avatarUploading = ref(false)
const activeSection = ref('profile')
const savedInfo = ref(null)
const galleryOpen = ref(false)
const busy = computed(() => savingInfo.value || savingPwd.value || avatarUploading.value)

const infoForm = reactive({ nickname: '', email: '', avatar: '' })
const pwdForm = reactive({ old_pwd: '', new_pwd: '', re_pwd: '' })

const avatarText = computed(
  () => (infoForm.nickname || userStore.userInfo?.username || 'U').charAt(0).toUpperCase(),
)
const displayName = computed(() => infoForm.nickname || userStore.userInfo?.username || '社区成员')
const hasChanges = computed(
  () => savedInfo.value && Object.keys(infoForm).some((key) => infoForm[key] !== savedInfo.value[key]),
)
const currentAvatarName = computed(
  () =>
    avatarPresets.find((item) => item.src === infoForm.avatar)?.name ||
    (infoForm.avatar ? '自定义头像' : '默认头像'),
)
const additionalAvatarSelected = computed(
  () =>
    avatarPresets.some((item) => item.src === infoForm.avatar) &&
    !featuredAvatars.some((item) => item.src === infoForm.avatar),
)

// 布局会 fetch userInfo，但子页面比布局先 mounted，所以用 watch 等数据到位再回填，只填一次
let filled = false
watch(
  () => userStore.userInfo,
  (info) => {
    if (filled || !info) return
    filled = true
    Object.assign(infoForm, {
      nickname: info.nickname ?? '',
      email: info.email ?? '',
      avatar: info.avatar ?? '',
    })
    savedInfo.value = { ...infoForm }
  },
  { immediate: true },
)

// 规则与后端 UserUpdateDTO 一致：昵称 1-10 位非空字符，邮箱必填且格式正确
const infoRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { pattern: /^\S{1,10}$/, message: '昵称必须是1-10位非空字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
}

function validateRePwd(rule, value, callback) {
  if (value !== pwdForm.new_pwd) {
    callback(new Error('两次输入的密码不一致'))
    return
  }
  callback()
}

// 新密码被改动后重新校验确认密码，否则「先填确认密码再改新密码」会漏判
function validateNewPwd(rule, value, callback) {
  if (pwdForm.re_pwd) {
    pwdRef.value?.validateField('re_pwd').catch(() => {})
  }
  callback()
}

// 新密码规则与后端 UserUpdatePwdDTO 一致：6-20 位非空字符
const pwdRules = {
  old_pwd: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  new_pwd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { pattern: /^\S{6,20}$/, message: '新密码必须是6-20位非空字符', trigger: 'blur' },
    { validator: validateNewPwd, trigger: 'blur' },
  ],
  re_pwd: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateRePwd, trigger: 'blur' },
  ],
}

function beforeAvatarUpload(file) {
  if (busy.value) return false
  // 后端只认这几个后缀，先在本地拦一道省一次上传
  if (!/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
    ElMessage.error('只支持 jpg/png/gif/webp 格式的图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片不能超过 2MB')
    return false
  }
  if (!file.size || !/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
    ElMessage.error('请选择有效的 jpg/png/gif/webp 图片')
    return false
  }
  return true
}

// 不用 el-upload 默认的 action 上传：那样带不上 Authorization 头，也解不开 Result 包装。
// 上传成功只更新表单预览，点「保存修改」才随 nickname/email 一起落库
async function customAvatarUpload({ file }) {
  avatarUploading.value = true
  try {
    const res = await uploadImage(file)
    infoForm.avatar = res.data
    ElMessage.success('头像上传成功，记得点保存')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    avatarUploading.value = false
  }
}

async function handleSaveInfo() {
  if (busy.value || !hasChanges.value) return
  const valid = await infoRef.value.validate().catch(() => false)
  if (!valid || busy.value) return
  savingInfo.value = true
  try {
    const snapshot = { ...infoForm }
    await updateUserInfo(snapshot)
    savedInfo.value = snapshot
    ElMessage.success('保存成功')
    // 刷新 store，头部头像和昵称才会同步
    await userStore.fetchUserInfo()
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    savingInfo.value = false
  }
}

async function handleChangePwd() {
  if (busy.value) return
  const valid = await pwdRef.value.validate().catch(() => false)
  if (!valid || busy.value) return
  savingPwd.value = true
  try {
    await updatePassword({ old_pwd: pwdForm.old_pwd, new_pwd: pwdForm.new_pwd })
    // JWT 是无状态的，旧令牌在过期前依然有效，所以改完密码直接踢回登录页重新认证
    userStore.logout()
    ElMessage.success('密码修改成功，请重新登录')
    router.push('/login')
  } catch {
    // 错误提示已由 axios 拦截器统一弹出
  } finally {
    savingPwd.value = false
  }
}

function resetInfo() {
  if (busy.value || !savedInfo.value) return
  Object.assign(infoForm, savedInfo.value)
  infoRef.value?.clearValidate()
}

function selectAvatar(src) {
  if (!busy.value) infoForm.avatar = src
}

function switchSection(section) {
  if (busy.value) return
  if (activeSection.value === 'security' && section !== 'security') {
    Object.assign(pwdForm, { old_pwd: '', new_pwd: '', re_pwd: '' })
  }
  activeSection.value = section
}
</script>

<template>
  <section class="profile-page">
    <header class="profile-page-heading">
      <div>
        <span class="eyebrow">PERSONAL SPACE · MAKE IT YOURS</span>
        <h1>个人中心</h1>
        <p>定制你的社区数字名片，管理个人资料与安全凭据。</p>
      </div>
      <RouterLink to="/" class="button button-secondary">
        回到社区
        <AppIcon name="arrow" :size="15" />
      </RouterLink>
    </header>

    <div class="settings-layout">
      <!-- 左侧得物潮流铭牌 + 导航卡 -->
      <aside class="identity-card surface">
        <div class="identity-cover" aria-hidden="true">
          <span>BOOM ID // PASS</span>
        </div>
        <div class="identity-summary">
          <UserAvatar :size="104" :src="infoForm.avatar || undefined" class="identity-avatar">
            {{ avatarText }}
          </UserAvatar>
          <h2>{{ displayName }}</h2>
          <p>@{{ userStore.userInfo?.username || '—' }}</p>
          <span class="identity-role">
            <span></span>
            {{ userStore.userInfo?.role === 1 ? '管理员' : '社区认证成员' }}
          </span>
        </div>

        <nav class="settings-nav" aria-label="资料设置">
          <button
            type="button"
            :class="{ active: activeSection === 'profile' }"
            :aria-current="activeSection === 'profile' ? 'page' : undefined"
            :disabled="busy"
            @click="switchSection('profile')"
          >
            <AppIcon name="user" :size="18" />
            <span>
              基本资料
              <small>头像、昵称与邮箱</small>
            </span>
            <AppIcon name="arrow" :size="14" />
          </button>
          <button
            type="button"
            :class="{ active: activeSection === 'security' }"
            :aria-current="activeSection === 'security' ? 'page' : undefined"
            :disabled="busy"
            @click="switchSection('security')"
          >
            <AppIcon name="lock" :size="18" />
            <span>
              账号安全
              <small>管理你的登录密码</small>
            </span>
            <AppIcon name="arrow" :size="14" />
          </button>
        </nav>

        <RouterLink to="/creator" class="identity-creator">
          <AppIcon name="pen" :size="15" />
          去看看我的创作
          <AppIcon name="external" :size="14" />
        </RouterLink>
      </aside>

      <!-- 右侧基本资料雾透玻璃工作台 -->
      <section
        v-if="activeSection === 'profile'"
        class="settings-panel surface"
        aria-labelledby="profile-section-title"
      >
        <header class="settings-panel-heading">
          <div>
            <h2 id="profile-section-title">基本资料</h2>
            <p>这些信息将组成你在社区里的个人名片。</p>
          </div>
          <span class="sync-status" :class="{ pending: hasChanges }">
            <span></span>
            {{ hasChanges ? '有未保存的修改' : '资料已同步' }}
          </span>
        </header>

        <el-form
          ref="infoRef"
          :model="infoForm"
          :rules="infoRules"
          label-position="top"
          :disabled="busy"
          @submit.prevent="handleSaveInfo"
        >
          <section class="avatar-studio" aria-labelledby="avatar-studio-title">
            <div class="avatar-preview">
              <div class="avatar-preview-content">
                <UserAvatar :size="112" :src="infoForm.avatar || undefined">
                  {{ avatarText }}
                </UserAvatar>
                <strong>{{ currentAvatarName }}</strong>
                <span>头像预览</span>
                <button
                  v-if="infoForm.avatar"
                  class="text-action"
                  type="button"
                  :disabled="busy"
                  @click="selectAvatar('')"
                >
                  恢复默认
                </button>
              </div>
            </div>

            <div class="avatar-choices">
              <div class="avatar-studio-heading">
                <h3 id="avatar-studio-title">选个新形象</h3>
                <p>喜欢哪一个？也可以上传自己的照片。</p>
              </div>
              <div class="avatar-preset-list">
                <button
                  v-for="preset in featuredAvatars"
                  :key="preset.src"
                  type="button"
                  class="avatar-preset"
                  :class="{ selected: infoForm.avatar === preset.src }"
                  :aria-label="`选择${preset.name}头像`"
                  :aria-pressed="infoForm.avatar === preset.src"
                  :disabled="busy"
                  @click="selectAvatar(preset.src)"
                >
                  <span class="preset-art">
                    <img :src="preset.src" :alt="preset.name" width="104" height="104" />
                    <span v-if="infoForm.avatar === preset.src" class="preset-check">
                      <AppIcon name="check" :size="12" />
                    </span>
                  </span>
                  <span>{{ preset.name }}</span>
                </button>

                <button
                  class="avatar-preset avatar-more"
                  type="button"
                  :class="{ selected: additionalAvatarSelected }"
                  aria-haspopup="dialog"
                  :aria-expanded="galleryOpen"
                  :aria-label="`查看更多预设头像，共 ${avatarPresets.length} 款`"
                  :disabled="busy"
                  @click="galleryOpen = true"
                >
                  <span class="more-tile-art">
                    <AppIcon name="grid" :size="24" />
                    <span>查看更多</span>
                    <span v-if="additionalAvatarSelected" class="preset-check">
                      <AppIcon name="check" :size="12" />
                    </span>
                  </span>
                  <span>
                    {{ additionalAvatarSelected ? currentAvatarName : `${avatarPresets.length} 款预设` }}
                  </span>
                </button>

                <el-upload
                  class="avatar-upload"
                  :show-file-list="false"
                  :before-upload="beforeAvatarUpload"
                  :http-request="customAvatarUpload"
                  :disabled="busy"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                >
                  <span class="upload-tile" :aria-busy="avatarUploading">
                    <span class="upload-tile-art">
                      <AppIcon :name="avatarUploading ? 'refresh' : 'upload'" :size="24" />
                      <span>{{ avatarUploading ? '上传中…' : '上传图片' }}</span>
                    </span>
                    <span>不超过 2 MB</span>
                  </span>
                </el-upload>
              </div>
            </div>
          </section>

          <div class="profile-fields">
            <div class="account-detail">
              <span>登录账号</span>
              <strong>{{ userStore.userInfo?.username }}</strong>
              <span class="account-readonly">
                <AppIcon name="lock" :size="12" />
                注册后不可修改
              </span>
            </div>

            <div class="profile-field-grid">
              <el-form-item label="社区昵称" prop="nickname">
                <el-input
                  v-model="infoForm.nickname"
                  aria-label="社区昵称"
                  maxlength="10"
                  show-word-limit
                  placeholder="想让大家怎么称呼你？"
                  autocomplete="nickname"
                />
                <span class="field-note">1–10 个字符，不含空格</span>
              </el-form-item>

              <el-form-item label="联系邮箱" prop="email">
                <el-input
                  v-model="infoForm.email"
                  aria-label="联系邮箱"
                  type="email"
                  placeholder="填写你的邮箱"
                  autocomplete="email"
                />
              </el-form-item>
            </div>
          </div>

          <footer class="settings-savebar">
            <span>
              <AppIcon name="shield" :size="15" />
              选择或上传后，保存才会生效
            </span>
            <div>
              <button
                class="button button-secondary"
                type="button"
                :disabled="busy || !hasChanges"
                @click="resetInfo"
              >
                撤销修改
              </button>
              <el-button
                type="primary"
                native-type="submit"
                :loading="savingInfo"
                :disabled="avatarUploading || !hasChanges"
              >
                保存修改
                <AppIcon name="arrow" :size="15" />
              </el-button>
            </div>
          </footer>
        </el-form>
      </section>

      <!-- 账号安全设置面板 -->
      <section
        v-else
        class="settings-panel security-panel surface"
        aria-labelledby="security-section-title"
      >
        <header class="settings-panel-heading">
          <div>
            <h2 id="security-section-title">账号安全</h2>
            <p>定期更新密码，让你的创作和账号更安心。</p>
          </div>
          <span class="security-symbol">
            <AppIcon name="shield" :size="22" />
          </span>
        </header>

        <div class="security-content">
          <div class="security-notice">
            <AppIcon name="lock" :size="20" />
            <div>
              <strong>更新登录密码</strong>
              <p>修改成功后，需要使用新密码重新登录。</p>
            </div>
          </div>

          <el-form
            ref="pwdRef"
            :model="pwdForm"
            :rules="pwdRules"
            label-position="top"
            :disabled="savingPwd"
            @submit.prevent="handleChangePwd"
          >
            <el-form-item label="当前密码" prop="old_pwd">
              <el-input
                v-model="pwdForm.old_pwd"
                aria-label="当前密码"
                type="password"
                show-password
                placeholder="输入当前登录密码"
                autocomplete="current-password"
              />
            </el-form-item>

            <div class="password-field-grid">
              <el-form-item label="新密码" prop="new_pwd">
                <el-input
                  v-model="pwdForm.new_pwd"
                  aria-label="新密码"
                  type="password"
                  show-password
                  placeholder="6–20 位，不含空格"
                  autocomplete="new-password"
                />
              </el-form-item>

              <el-form-item label="确认新密码" prop="re_pwd">
                <el-input
                  v-model="pwdForm.re_pwd"
                  aria-label="确认新密码"
                  type="password"
                  show-password
                  placeholder="再次输入新密码"
                  autocomplete="new-password"
                />
              </el-form-item>
            </div>

            <div class="password-guidance">
              <span></span>
              建议使用字母、数字和符号的组合。
            </div>

            <footer class="security-savebar">
              <el-button type="primary" native-type="submit" :loading="savingPwd">
                更新密码
                <AppIcon name="arrow" :size="15" />
              </el-button>
            </footer>
          </el-form>
        </div>
      </section>
    </div>
  </section>

  <PresetAvatarDialog
    v-model="galleryOpen"
    :current="infoForm.avatar"
    :busy="busy"
    @select="selectAvatar"
  />
</template>

<style scoped>
.profile-page {
  max-width: 1180px;
  margin: auto;
}

.profile-page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 22px;
}

.profile-page-heading h1 {
  font-size: 28px;
  letter-spacing: -0.9px;
  font-weight: 800;
  margin: 4px 0;
  line-height: 1.3;
  color: var(--ink);
}

.profile-page-heading p {
  font-size: 13px;
  color: var(--muted);
  margin: 0;
}

.settings-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

/* 左侧碳黑科技感铭牌 */
.identity-card {
  overflow: hidden;
  border-radius: 20px;
}

.identity-cover {
  height: 92px;
  background: linear-gradient(135deg, #0a0d14 0%, #1e293b 65%, #0052cc 100%);
  position: relative;
  overflow: hidden;
}

.identity-cover::before,
.identity-cover::after {
  content: '';
  position: absolute;
  right: -28px;
  top: -78px;
  width: 185px;
  height: 185px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  transform: rotate(-25deg);
}

.identity-cover::after {
  right: 17px;
  top: -99px;
  width: 230px;
  height: 230px;
}

.identity-cover > span {
  position: absolute;
  top: 16px;
  left: 20px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: rgba(255, 255, 255, 0.72);
}

.identity-summary {
  text-align: center;
  padding: 0 20px 24px;
  position: relative;
}

.identity-avatar {
  border: 4px solid #ffffff;
  box-sizing: content-box;
  margin-top: -44px;
  box-shadow: 0 8px 24px rgba(10, 13, 20, 0.14);
}

.identity-summary h2 {
  font-size: 20px;
  font-weight: 800;
  margin: 10px 0 3px;
  overflow-wrap: anywhere;
  line-height: 1.35;
  color: var(--ink);
}

.identity-summary > p {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 12px;
}

.identity-role {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--brand);
  background: var(--soft);
  border: 1px solid rgba(0, 102, 255, 0.15);
  padding: 4px 12px;
  border-radius: 999px;
}

.identity-role > span {
  width: 6px;
  height: 6px;
  background: var(--brand);
  border-radius: 50%;
}

.settings-nav {
  display: grid;
  gap: 6px;
  padding: 16px 12px;
  border-top: 1px solid var(--line);
}

.settings-nav > button {
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  width: 100%;
  transition: all 0.18s ease;
}

.settings-nav > button:hover {
  background: rgba(15, 23, 42, 0.04);
  color: var(--ink);
}

.settings-nav > button.active {
  color: #ffffff;
  background: var(--ink);
  box-shadow: 0 6px 16px -4px rgba(10, 13, 20, 0.2);
}

.settings-nav > button.active small {
  color: rgba(255, 255, 255, 0.7);
}

.settings-nav > button > span {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
}

.settings-nav small {
  display: block;
  font-size: 10.5px;
  font-weight: 400;
  color: var(--muted);
  margin-top: 2px;
}

.settings-nav > button > svg:last-child {
  opacity: 0.7;
}

.identity-creator {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  padding: 16px 22px;
  border-top: 1px solid var(--line);
  transition: color 0.18s ease, background 0.18s ease;
}

.identity-creator > svg:last-child {
  margin-left: auto;
}

.identity-creator:hover {
  color: var(--brand);
  background: rgba(0, 102, 255, 0.04);
}

/* 右侧主设置面板 */
.settings-panel {
  border-radius: 20px;
  overflow: hidden;
}

.settings-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 28px;
  border-bottom: 1px solid var(--line);
}

.settings-panel-heading h2 {
  font-size: 18px;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.4px;
  color: var(--ink);
}

.settings-panel-heading p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
}

.sync-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.sync-status > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.sync-status.pending {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.sync-status.pending > span {
  background: #f59e0b;
}

/* 头像工作台 */
.avatar-studio {
  display: flex;
  gap: 26px;
  padding: 20px 28px;
  background: rgba(255, 255, 255, 0.55);
}

.avatar-preview {
  flex: 0 0 156px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--line);
  padding-right: 24px;
}

.avatar-preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview-content > .el-avatar {
  box-shadow:
    0 0 0 4px #ffffff,
    0 8px 24px rgba(10, 13, 20, 0.12);
  font-size: 30px;
}

.avatar-preview-content > strong {
  font-weight: 700;
  font-size: 12px;
  margin-top: 12px;
  color: var(--ink);
}

.avatar-preview-content > span:not(.el-avatar) {
  font-size: 10.5px;
  color: var(--muted);
  margin-top: 2px;
}

.avatar-preview-content > .text-action {
  font-size: 11px;
  margin-top: 7px;
}

.avatar-choices {
  flex: 1;
  min-width: 0;
}

.avatar-studio-heading h3 {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 3px;
  color: var(--ink);
}

.avatar-studio-heading p {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 14px;
}

.avatar-preset-list {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.avatar-preset {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}

.preset-art {
  display: block;
  width: 104px;
  height: 104px;
  position: relative;
  border-radius: 16px;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.preset-art > img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 16px;
  object-fit: cover;
}

.avatar-preset:hover .preset-art {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 102, 255, 0.15), 0 0 0 2px var(--brand);
}

.avatar-preset.selected {
  color: var(--brand);
  font-weight: 700;
}

.avatar-preset.selected .preset-art {
  box-shadow:
    0 0 0 3px #ffffff,
    0 0 0 5px var(--brand);
}

.preset-check {
  position: absolute;
  right: -5px;
  bottom: -5px;
  background: var(--brand);
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
}

.more-tile-art {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 7px;
  width: 104px;
  height: 104px;
  position: relative;
  border: 1px solid rgba(0, 102, 255, 0.18);
  border-radius: 16px;
  background: var(--soft);
  color: var(--brand);
  font-size: 11px;
  font-weight: 600;
  transition: all 0.18s ease;
}

.avatar-more:hover .more-tile-art {
  background: rgba(0, 102, 255, 0.12);
  border-color: var(--brand);
  transform: translateY(-2px);
}

.avatar-more.selected .more-tile-art {
  box-shadow:
    0 0 0 3px #ffffff,
    0 0 0 5px var(--brand);
}

.upload-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  padding: 0;
  font-size: 11px;
  color: var(--muted);
}

.upload-tile-art {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 104px;
  height: 104px;
  border: 1.5px dashed rgba(15, 23, 42, 0.18);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  color: var(--text);
  font-size: 11px;
  font-weight: 600;
  transition: all 0.18s ease;
}

.upload-tile:hover .upload-tile-art {
  border-color: var(--brand);
  background: var(--soft);
  color: var(--brand);
  transform: translateY(-2px);
}

/* 资料表单字段 */
.profile-fields {
  padding: 0 28px 10px;
}

.account-detail {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 0;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--muted);
}

.account-detail > strong {
  font-weight: 700;
  color: var(--ink);
}

.account-readonly {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-size: 11px;
}

.profile-field-grid,
.password-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.profile-fields :deep(.el-form-item) {
  margin-bottom: 16px;
}

.settings-panel :deep(.el-form-item__label) {
  font-size: 12.5px;
  font-weight: 700;
  padding-bottom: 6px;
  line-height: 1.6;
  margin: 0;
  color: var(--ink);
}

.settings-panel :deep(.el-input__wrapper) {
  min-height: 44px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 11px;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1) inset;
  padding: 0 14px;
}

.settings-panel :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1.5px var(--brand) inset,
    0 0 0 3px rgba(0, 102, 255, 0.1);
  background: #ffffff;
}

.settings-panel :deep(.el-input__inner) {
  font-size: 13px;
}

.settings-panel :deep(.el-input__count-inner) {
  background: transparent;
  font-size: 11px;
  color: var(--muted);
}

.field-note {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.8;
  margin-top: 6px;
}

.settings-savebar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  border-top: 1px solid var(--line);
  padding: 16px 28px;
  background: rgba(255, 255, 255, 0.65);
}

.settings-savebar > span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--muted);
}

.settings-savebar > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-savebar .button {
  font-size: 12.5px;
  padding: 9px 15px;
}

.settings-savebar :deep(.el-button),
.security-savebar :deep(.el-button) {
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
}

.settings-savebar :deep(.el-button > span),
.security-savebar :deep(.el-button > span) {
  gap: 8px;
}

.security-symbol {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  background: var(--soft);
  border-radius: 12px;
  color: var(--brand);
}

.security-content {
  padding: 26px 28px 28px;
}

.security-notice {
  display: flex;
  gap: 12px;
  align-items: center;
  background: var(--soft);
  border: 1px solid rgba(0, 102, 255, 0.14);
  border-radius: 13px;
  padding: 15px 18px;
  margin-bottom: 24px;
  color: var(--brand);
}

.security-notice strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink);
}

.security-notice p {
  font-size: 12px;
  color: var(--muted);
  margin: 3px 0 0;
}

.security-content :deep(.el-form-item) {
  margin-bottom: 20px;
}

.password-guidance {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--muted);
  margin-top: 4px;
}

.password-guidance > span {
  width: 5px;
  height: 5px;
  background: var(--brand);
  border-radius: 50%;
}

.security-savebar {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--line);
  padding-top: 22px;
  margin-top: 26px;
}

.avatar-preset:disabled,
.upload-tile:disabled {
  opacity: 0.55;
}

.settings-nav > button:disabled {
  opacity: 0.7;
}

@media (min-width: 1400px) {
  .avatar-preset-list {
    gap: 20px;
  }
  .preset-art,
  .upload-tile-art,
  .more-tile-art {
    width: 112px;
    height: 112px;
  }
  .avatar-studio {
    gap: 30px;
    padding-top: 24px;
    padding-bottom: 24px;
  }
  .avatar-preview {
    flex-basis: 165px;
    padding-right: 30px;
  }
}
</style>
