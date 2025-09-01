const speakeasy = require('speakeasy');
const secret = speakeasy.generateSecret({ length: 20 });
console.log(secret.base32);
