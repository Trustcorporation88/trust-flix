import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: node scripts/hash-password.mjs "senha-com-8-ou-mais-caracteres"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 10));
