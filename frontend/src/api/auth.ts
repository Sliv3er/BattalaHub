import axios from './client'

export interface LoginRequest {
  identifier: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName?: string
}

export const authAPI = {
  login: (data: LoginRequest) => 
    axios.post('/auth/login', data),
  
  register: (data: RegisterRequest) => 
    axios.post('/auth/register', data),
  
  logout: () => 
    axios.post('/auth/logout'),
  
  getMe: () => 
    axios.get('/auth/me'),
}