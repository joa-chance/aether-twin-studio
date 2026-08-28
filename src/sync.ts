import type { TwinApi } from './model';

type Status = 'connecting' | 'connected' | 'streaming' | 'screen' | 'disconnected' | 'error';

export class IPhoneSyncClient {
  private socket: WebSocket | null = null;
  private retryTimer = 0;
  private stopped = false;
  private pendingFrame: Blob | null = null;
  private decodingFrame = false;

  constructor(private twin: TwinApi, private onStatus: (status: Status) => void, private onOrientation?: (value:{x:number;y:number;z:number;w:number})=>void) {}

  connect(url: string) {
    this.stop(); this.stopped = false; this.onStatus('connecting');
    try {
      this.socket = new WebSocket(url);
      this.socket.binaryType = 'blob';
      this.socket.addEventListener('open', () => {
        this.onStatus('connected');
        this.socket?.send(JSON.stringify({ type: 'viewer', room: 'iphone16' }));
      });
      this.socket.addEventListener('message', event => this.handle(event.data));
      this.socket.addEventListener('close', () => this.reconnect(url));
      this.socket.addEventListener('error', () => this.onStatus('error'));
    } catch { this.reconnect(url); }
  }

  stop() { this.stopped = true; clearTimeout(this.retryTimer); this.socket?.close(); this.socket = null; this.pendingFrame = null; }

  async pairing() {
    const response = await fetch(`http://${location.hostname}:8765/pairing`);
    if (!response.ok) throw new Error('Unable to load pairing token');
    const {token} = await response.json();
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return {url:`${protocol}//${location.hostname}:8765?token=${token}`,token};
  }

  private reconnect(url: string) {
    this.onStatus('disconnected');
    if (!this.stopped) this.retryTimer = window.setTimeout(() => this.connect(url), 1800);
  }

  private handle(raw: string | ArrayBuffer | Blob) {
    if (raw instanceof Blob) {
      this.enqueueFrame(raw); return;
    }
    if (raw instanceof ArrayBuffer) {
      this.enqueueFrame(new Blob([raw], {type:'image/jpeg'})); return;
    }
    try {
      const message = JSON.parse(raw);
      if (message.type === 'orientation') {
        this.twin.setOrientation(message.x, message.y, message.z, message.w);
        this.onOrientation?.({x:message.x,y:message.y,z:message.z,w:message.w});
        this.onStatus('streaming');
      }
    } catch { /* Ignore malformed relay messages. */ }
  }

  private enqueueFrame(frame: Blob) {
    // Keep only the newest undecoded frame so temporary network/decoder stalls
    // cannot build a seconds-long playback queue.
    this.pendingFrame = frame;
    if (!this.decodingFrame) void this.drainFrames();
  }

  private async drainFrames() {
    this.decodingFrame = true;
    try {
      while (this.pendingFrame) {
        const frame = this.pendingFrame; this.pendingFrame = null;
        const bitmap = await createImageBitmap(frame);
        this.twin.setScreenFrame(bitmap);
        bitmap.close();
        this.onStatus('screen');
      }
    } finally { this.decodingFrame = false; }
  }
}
