const password_admin = 'admin123';
const password_fundi = 'fundi123';

async function hash(pw) {
  const enc = new TextEncoder();
  const salt = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);
  const hex = Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const saltHex = Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  return 'pbkdf2:'+saltHex+':'+hex;
}

const ah = await hash(password_admin);
const fh = await hash(password_fundi);
console.log('ADMIN_HASH=' + ah);
console.log('FUNDI_HASH=' + fh);
