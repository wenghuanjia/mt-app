import passport from 'koa-passport';
// 本地策略
import LocalStrategy from 'passport-local';
import UserModel from '../../dbs/models/users';

passport.use(new LocalStrategy(async function (username, password, done) {
  let where = {
    username
  }
  let result = await UserModel.findOne(where)
  if (result != null) {
    if (result.password === password) {
      return done(null, result)
    } else {
      return done(null, false, '密码错误')
    }
  } else {
    return done(null, false, '用户不存在')
  }
}))

// 查到用户的信息 存储到中 session 中 序列化
passport.serializeUser(function (user, done) {
  done(null, user)
})

// 设置用户的信息 到 session 中 反序列化
passport.deserializeUser(function (user, done) {
  return done(null, user)
})

export default passport;