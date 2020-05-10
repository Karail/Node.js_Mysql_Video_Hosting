
import { EMAILconf, MAINconf } from '../../config/conf';

export default (email: string, token: string) => {
  return {
    to: email,
    from: EMAILconf.email,
    subject: 'Восстановление доступа',
    html: `
      <h1>Вы забыли пароль?</h1>
      <p>Если нет, то проигнорируйте данное письмо</p>
      <p>Иначе нажмите на ссылку ниже:</p>
      <p><a href="${MAINconf.url}/newPassword/${token}">Восстановить доступ</a></p>
      <hr />
      <a href="${MAINconf.url}">PornoFlow</a>
    `
  }
}