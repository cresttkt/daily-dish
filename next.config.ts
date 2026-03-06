import type { NextConfig } from 'next'
const withPWA = require('next-pwa')({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
})

const nextConfig: NextConfig = {
    /* 既存の設定がある場合はここに追記 */
}

export default withPWA(nextConfig)
