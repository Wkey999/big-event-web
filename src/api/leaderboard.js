import request from '@/utils/request'

export const getModelLeaderboard = dimension =>
  request.get('/leaderboard/models', { params: { dimension }, silent: true, timeout: 18000 })
