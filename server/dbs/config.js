export default {
  dbs: 'mongodb://127.0.0.1:27017/sutdent',
  redis: {
    get host() {
      return '127.0.0.1'
    },
    get port() {
      return 6379
    }
  },
  smtp: {
    get host() {
      return 'smtp.qq.com'
    },
    get user() {
      return '1752851362@qq.com'
    },
    get pass() {
      return 'fzuojgsrqrwbdigg'
    },
    // 邮箱验证码
    get code() {
      return () => {
        return Math.random().toString(16).slice(2, 6).toUpperCase()
      }
    },
    // 邮箱验证码过期时间
    get expire() {
      return () => {
        return new Date().getTime() * 60 * 60 * 1000
      }
    }
  }
}