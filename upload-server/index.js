const koa = require('koa');
const routes = require('./router/idnex.js');
const koaBody = require('koa-body');

const app = new koa();

app.use(koaBody());

app.use(routes.routes(), routes.allowedMethods());

app.listen(3000);
