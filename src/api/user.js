import request from '@/utils/request'

export const register = (data) => request.post('/user/register', data)

export const login = (data) => request.post('/user/login', data)

export const getUserInfo = () => request.get('/user/userInfo')

export const updateUserInfo = (data) => request.put('/user/update', data)

// body key 是后端 UserUpdatePwdDTO 约定的下划线命名，别改成驼峰
export const updatePassword = (data) => request.put('/user/updatePwd', data)

// 上传图片到 OSS，返回的 res.data 就是图片公网 URL
// 后端只有这一个上传接口，文章封面图也复用它；form-data 字段名必须是 file，
// 且只接受 jpg/jpeg/png/gif/webp，其它后缀后端会直接报错
export const uploadImage = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/user/upload', formData)
}
