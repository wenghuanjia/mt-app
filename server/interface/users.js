import Router from 'koa-router';
import Redis from 'koa-redis';
import nodeMailer from 'nodemailer';
import User from '../dbs/models/users';
import Passport from './utils/passport';
import Email from '../dbs/config';
import axios from './utils/axios';

let router = new Router({
  prefix: '/users'
})
// redis 客户端
let Store = new Redis().client;
// 用户 注册
router.post('/signup', async (ctx) => {
  const { username, password, email, code } = ctx.request.body;
  // 验证码
  if (code) {
    // 获取 存储 在 redis 中的code 验证码 和 过期时间 
    const saveCode = await Store.hget(`nodemail:${username}`, 'code');
    const saveExpire = await Store.hget(`nodemail:${username}`, 'expire');
    // 比较用户传递过来的验证码和存储在redis中的验证码是否一致
    if (code === saveCode) {
      // 检查 验证码是否过期
      if (new Date().getTime() - saveExpire > 0) {
        ctx.body = {
          code: -1,
          msg: '验证码已过期，请重新尝试'
        }
        return false;
      }
    } else {
      ctx.body = {
        code: -1,
        msg: '请填写正确的验证码'
      }
    }
  } else {
    ctx.body = {
      code: -1,
      msg: '请填写验证码'
    }
  }
  // 用户名
  let user = await User.find({
    username
  })
  // 如果在数据库 中查询到已有该用户名 说明该用户名已被注册
  if (user.length) {
    ctx.body = {
      code: -1,
      msg: '已被注册'
    }
    return;
  }
  // 创建一个 写入数据库的操作
  let nuser = await User.create({
    username,
    password,
    email
  })
  // 创建成功 后 执行 登录
  if (nuser) {
    let res = await axios.post('/users/signin', { username, password })
    // 登录成功 返回用户名
    if (res.data && res.data.code === 0) {
      ctx.body = {
        code: 0,
        msg: '注册成功',
        user: res.data.user
      }
    } else {
      ctx.body = {
        code: -1,
        msg: 'error'
      }
    }
    // ctx.body = {
    //   code: 0,
    //   msg: '注册成功'
    // }
  } else {
    // 数据库写入失败
    ctx.body = {
      code: -1,
      msg: '注册失败'
    }
  }
})

// 用户 登录
router.post('/signin', async (ctx, next) => {
  return Passport.authenticate('local', function (err, user, info, status) {
    // err 不为空，说明 出错
    if (err) {
      ctx.body = {
        code: -1,
        msg: err
      }
    } else {
      if (user) {
        ctx.body = {
          code: 0,
          msg: '登录成功',
          user
        }
        return ctx.login(user);
      } else {
        ctx.body = {
          code: 1,
          msg: info
        }
      }
    }
  })(ctx, next)
})

// 验证码
router.post('/verify', async (ctx, next) => {
  let username = ctx.request.body.username;
  const saveExpire = await Store.hget(`nodemail:${username}`, 'expire');
  if (saveExpire && new Date().getTime() - saveExpire < 0) {
    ctx.body = {
      code: -1,
      msg: '验证过于频繁，1分钟内1次'
    }
    return false
  }
  // 发邮件
  let transporter = nodeMailer.createTransport({
    host: Email.smtp.host,
    port: 587,
    secure: false,
    auth: {
      user: Email.smtp.user,
      pass: Email.smtp.pass
    }
  })
  // 接收
  let ko = {
    code: Email.smtp.code(),
    expire: Email.smtp.expire(),
    email: ctx.request.body.email,
    user: ctx.request.body.username
  }
  // 显示内容
  let mailOptaions = {
    from: `"认证邮件"<${Email.smtp.user}>`,
    to: ko.email,
    subject: '注册码',
    html: `您的注册码是${ko.code}`
  }
  // 发送
  await transporter.sendMail(mailOptaions, (error, info) => {
    if (error) {
      return console.log('error');
    } else {
      // 存储 code 验证码 redis
      Store.hmset(`nodemail:${ko.user}`, 'code', ko.code, 'expire', ko.expire, 'email', ko.email)
    }
  })
  // 成功响应
  ctx.body = {
    code: 0,
    msg: '验证码已发送，可能会有延迟，有效期1分钟'
  }
})

// 用户登出
router.get('/exit', async (ctx, next) => {
  // 执行退出操作
  await ctx.logout()
  // 检测是否还处于登录状态
  if (!ctx.isAuthenticated()) {
    ctx.body = {
      code: 0
    }
  } else {
    ctx.body = {
      code: -1
    }
  }
})

// 获取用户名
router.get('/getUser', async (ctx, next) => {
  // 检测是否还处于登录状态 已登录
  if (ctx.isAuthenticated()) {
    const { username, email } = ctx.session.passport.user;
    ctx.body = {
      user: username,
      email
    }
  } else {
    // 未登录
    ctx.body = {
      user: '',
      email: ''
    }
  }
})

// 导出
export default router;