import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('hotbill_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    // Active business (multi-location) — scopes every request to the selected business.
    const businessId = localStorage.getItem('hotbill_business')
    if (businessId) config.headers['X-Business-Id'] = businessId
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hotbill_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
