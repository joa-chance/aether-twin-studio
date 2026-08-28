import http from 'node:http';
import crypto from 'node:crypto';

const port = Number(process.env.SYNC_PORT || 8765);
const token = process.env.SYNC_TOKEN || crypto.randomBytes(12).toString('hex');
const clients = new Set();

function encode(payload, opcode = 1) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;
  if (body.length < 126) header = Buffer.from([0x80 | opcode, body.length]);
  else if (body.length <= 0xffff) { header = Buffer.alloc(4); header[0]=0x80|opcode; header[1]=126; header.writeUInt16BE(body.length,2); }
  else { header = Buffer.alloc(10); header[0]=0x80|opcode; header[1]=127; header.writeBigUInt64BE(BigInt(body.length),2); }
  return Buffer.concat([header, body]);
}

function parse(buffer) {
  const frames=[]; let offset=0;
  while (buffer.length-offset >= 2) {
    const first=buffer[offset], second=buffer[offset+1], opcode=first&0x0f;
    let length=second&0x7f, head=2;
    if (length===126) { if(buffer.length-offset<4) break; length=buffer.readUInt16BE(offset+2); head=4; }
    else if(length===127) { if(buffer.length-offset<10) break; length=Number(buffer.readBigUInt64BE(offset+2)); head=10; }
    const masked=Boolean(second&0x80), total=head+(masked?4:0)+length;
    if(buffer.length-offset<total) break;
    let payload=Buffer.from(buffer.subarray(offset+head+(masked?4:0),offset+total));
    if(masked){const mask=buffer.subarray(offset+head,offset+head+4);for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];}
    frames.push({opcode,payload}); offset+=total;
  }
  return {frames,rest:buffer.subarray(offset)};
}

function broadcast(sender, payload, opcode) {
  const packet=encode(payload,opcode);
  for(const client of clients) {
    if(client===sender||client.destroyed) continue;
    // Video is real-time data: when a viewer falls behind, dropping an old frame
    // is preferable to accumulating latency. Text orientation packets stay lossless.
    if(opcode===2&&client.writableLength>1024*1024) continue;
    client.write(packet);
  }
}

const server=http.createServer((req,res)=>{
  const remote=req.socket.remoteAddress||'';
  if(req.url==='/pairing'&&(remote==='127.0.0.1'||remote==='::1'||remote==='::ffff:127.0.0.1')){
    res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'http://127.0.0.1:5174'});
    res.end(JSON.stringify({token}));return;
  }
  res.writeHead(200,{'content-type':'application/json','access-control-allow-origin':'*'});
  res.end(JSON.stringify({service:'iPhone Twin Relay',clients:clients.size,authentication:'required'}));
});

server.on('upgrade',(req,socket)=>{
  const supplied=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).searchParams.get('token');
  if(supplied!==token){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  const key=req.headers['sec-websocket-key'];if(!key)return socket.destroy();
  const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
  clients.add(socket);let pending=Buffer.alloc(0);
  socket.on('data',chunk=>{
    const result=parse(Buffer.concat([pending,chunk]));pending=result.rest;
    for(const item of result.frames){
      if(item.opcode===0x8){socket.end(encode(Buffer.alloc(0),0x8));continue;}
      if(item.opcode===0x9){socket.write(encode(item.payload,0xA));continue;}
      if(item.opcode===0x1||item.opcode===0x2)broadcast(socket,item.payload,item.opcode);
    }
  });
  socket.on('close',()=>clients.delete(socket));socket.on('error',()=>clients.delete(socket));
});

server.listen(port,'0.0.0.0',()=>{
  console.log(`iPhone Twin relay listening on ws://0.0.0.0:${port}`);
  console.log(`Pair token: ${token}`);
});
