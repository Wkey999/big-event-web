import request from '@/utils/request'

export const getAiProviders = () => request.get('/article/ai/providers', { silent: true })
export const getAiStatus = () => request.get('/article/ai/status', { silent: true })
