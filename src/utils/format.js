// 后端 LocalDateTime 序列化成 2026-09-05T03:55:27，去掉 T 更好读
export function formatTime(time) {
  return time ? time.replace('T', ' ') : ''
}
