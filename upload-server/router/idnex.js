const router = require('koa-router')();
const koaBody = require('koa-body');

const uploadApi = require('../controller/index');


const upLoadParse = koaBody({
  multipart: true,
})

router.post('/api/upload', upLoadParse, uploadApi.upload);

module.exports = router;

