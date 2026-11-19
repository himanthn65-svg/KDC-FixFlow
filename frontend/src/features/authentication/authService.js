import api from '../../services/api'

const TOKEN_KEY = 'kdc_access_token'
const USER_KEY = 'kdc_user'

function saveSession(data) {
  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data.user
}

export function getStoredUser() {
  try {
    const user = localStorage.getItem(USER_KEY)
    return user ? JSON.parse(user) : null
  } catch {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
    return null
  }
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function loginUser(credentials) {
  const response = await api.post('/auth/login', credentials)
  return saveSession(response.data)
}

export async function loginAdmin(credentials) {
  const response = await api.post('/auth/admin/login', credentials)
  return saveSession(response.data)
}

export async function registerStudent(details) {
  const response = await api.post('/auth/register', details)
  return response.data
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
