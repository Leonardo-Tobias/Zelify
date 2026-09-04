const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zelcon.vercel.app'

export const APP_URL = configuredUrl.replace(/\/$/, '')
export const APP_HOST = APP_URL.replace(/^https?:\/\//, '')
