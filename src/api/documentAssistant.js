import request from '@/utils/request'

export const analyzeDocument = (
  text,
  question = '',
  { mode = 'extractive', strategy = 'bm25', aiConfig = null } = {},
) =>
  request.post(
    '/document/analyze',
    {
      text,
      question,
      mode,
      strategy,
      ...(mode === 'custom' && aiConfig ? { aiConfig } : {}),
    },
    { timeout: mode === 'extractive' ? 15000 : 35000 },
  )

export const extractDocumentFile = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/document/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 20000,
  })
}
