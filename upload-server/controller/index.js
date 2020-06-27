const path = require('path');
const fse = require('fs-extra');


const public_path = path.resolve(__dirname, '..', 'public');


const upload = async (ctx) => {

  const file = ctx.request.files.chunk;
  console.log(file, '000')
  const { hash, name } = ctx.request.body;

  console.log(123)

  if (!file) {
    ctx.body = {
      code: 200,
      msg: 'success',
    }

    return;
  }

  const time = new Date().getTime();

  await fse.move(file.path, public_path + '/' + time + file.name);

  ctx.body = {
    code: 200,
    msg: 'success',
    url: `/public/${time}${file.name}`
  }
};

module.exports = {
  upload
}
