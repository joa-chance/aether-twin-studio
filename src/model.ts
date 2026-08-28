import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type TwinApi = {
  setOrientation: (x:number,y:number,z:number,w:number)=>void;
  setScreenStream: (source: HTMLVideoElement | MediaStream)=>HTMLVideoElement;
  setScreenFrame: (source: CanvasImageSource)=>void;
  resetOrientation: ()=>void;
  setScreenMode: (mode:'model'|'live'|'freeze')=>void;
};

const tag = <T extends THREE.Object3D>(o: T, id: string): T => { o.userData.part = id; return o; };

function screenSurface() {
  const c = document.createElement('canvas'); c.width = 828; c.height = 1792;
  const x = c.getContext('2d')!;
  x.scale(1.9714285714, 1.9911111111);
  const g = x.createLinearGradient(0, 0, 420, 900); g.addColorStop(0, '#0a1636'); g.addColorStop(.46, '#63256f'); g.addColorStop(1, '#e68058');
  x.fillStyle = g; x.fillRect(0,0,c.width,c.height);
  x.fillStyle = 'rgba(255,255,255,.94)'; x.font = '600 64px -apple-system, sans-serif'; x.textAlign='center'; x.fillText('9:41',210,142);
  x.font='500 19px -apple-system, sans-serif'; x.fillText('Tuesday, August 26',210,72);
  const apps=[['#4cc768','☎'],['#2488ff','✉'],['#f4f4f4','◉'],['#ff453a','♪'],['#6f5cff','✦'],['#fff','⌁'],['#ff9f0a','☀'],['#111','◐']];
  apps.forEach(([color,label],i)=>{ const col=i%4,row=Math.floor(i/4); const px=62+col*99,py=610+row*114; x.fillStyle=color; x.beginPath(); x.roundRect(px-34,py-34,68,68,16); x.fill(); x.fillStyle=color==='#fff'?'#111':'#fff'; x.font='32px sans-serif'; x.fillText(label,px,py+11); });
  x.fillStyle='rgba(255,255,255,.18)'; x.beginPath(); x.roundRect(31,812,358,75,30); x.fill();
  x.resetTransform();
  const t = new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; return {texture:t,canvas:c,context:x};
}

function lens(x:number,y:number,z:number, parent:THREE.Group, clickable:THREE.Object3D[]) {
  const ringMat = new THREE.MeshPhysicalMaterial({color:0xb2a89b,metalness:1,roughness:.2,clearcoat:.6});
  const glassMat = new THREE.MeshPhysicalMaterial({color:0x07111c,metalness:.25,roughness:.08,clearcoat:1,clearcoatRoughness:.04});
  const ring=tag(new THREE.Mesh(new THREE.CylinderGeometry(.62,.62,.21,64),ringMat),'Pro camera'); ring.rotation.x=Math.PI/2; ring.position.set(x,y,z); parent.add(ring); clickable.push(ring);
  const glass=new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,.235,64),glassMat); glass.rotation.x=Math.PI/2; glass.position.set(x,y,z-.05); parent.add(glass);
  const inner=new THREE.Mesh(new THREE.CylinderGeometry(.19,.27,.245,48),new THREE.MeshPhysicalMaterial({color:0x0c1627,metalness:.5,roughness:.05,iridescence:.55})); inner.rotation.x=Math.PI/2; inner.position.set(x,y,z-.08); parent.add(inner);
}

export function createIPhone() {
  const root = new THREE.Group(); root.name='iPhone 16 Pro Max';
  const clickable:THREE.Object3D[]=[];
  const titanium=new THREE.MeshPhysicalMaterial({color:0xa69d91,metalness:1,roughness:.26,clearcoat:.25,clearcoatRoughness:.18});
  const backMat=new THREE.MeshPhysicalMaterial({color:0xb8afa3,metalness:.12,roughness:.58,clearcoat:.35});
  const black=new THREE.MeshPhysicalMaterial({color:0x030407,metalness:.12,roughness:.12,clearcoat:1});
  const frame=tag(new THREE.Mesh(new RoundedBoxGeometry(7.76,16.3,.825,8,.55),titanium),'Titanium frame'); frame.castShadow=true; root.add(frame); clickable.push(frame);
  const back=tag(new THREE.Mesh(new RoundedBoxGeometry(7.52,16.05,.08,8,.48),backMat),'Back glass'); back.position.z=-.445; back.receiveShadow=true; root.add(back); clickable.push(back);
  const bezel=new THREE.Mesh(new RoundedBoxGeometry(7.5,16.03,.09,8,.47),black); bezel.position.z=.445; root.add(bezel);
  const screen=screenSurface();
  const displayMat=new THREE.MeshBasicMaterial({map:screen.texture,toneMapped:false});
  const display=tag(new THREE.Mesh(new RoundedBoxGeometry(7.22,15.72,.03,8,.39),displayMat),'Super Retina XDR display'); display.position.z=.505; root.add(display); clickable.push(display);
  const island=tag(new THREE.Mesh(new RoundedBoxGeometry(2.05,.55,.045,8,.26),new THREE.MeshBasicMaterial({color:0x000000})),'Dynamic Island'); island.position.set(0,6.55,.535); root.add(island); clickable.push(island);

  const plateau=tag(new THREE.Mesh(new RoundedBoxGeometry(3.82,4.08,.23,8,.48),backMat),'Camera plateau'); plateau.position.set(1.65,5.53,-.56); root.add(plateau); clickable.push(plateau);
  lens(2.45,6.45,-.78,root,clickable); lens(.88,6.43,-.78,root,clickable); lens(2.42,4.72,-.78,root,clickable);
  const flash=tag(new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.07,48),new THREE.MeshPhysicalMaterial({color:0xfff2cd,emissive:0xffd981,emissiveIntensity:.25,roughness:.25})),'True Tone flash'); flash.rotation.x=Math.PI/2; flash.position.set(.82,5.25,-.72); root.add(flash); clickable.push(flash);
  const lidar=tag(new THREE.Mesh(new THREE.CylinderGeometry(.24,.24,.075,40),black),'LiDAR scanner'); lidar.rotation.x=Math.PI/2; lidar.position.set(.85,4.45,-.71); root.add(lidar); clickable.push(lidar);
  const mic=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.08,20),black); mic.rotation.x=Math.PI/2; mic.position.set(1.35,5.45,-.72); root.add(mic);

  const buttonMat=new THREE.MeshPhysicalMaterial({color:0x8d857b,metalness:1,roughness:.2});
  const button=(id:string,w:number,h:number,x:number,y:number,z:number,rotY=0)=>{ const b=tag(new THREE.Mesh(new RoundedBoxGeometry(w,h,.14,5,.07),buttonMat),id); b.position.set(x,y,z); b.rotation.y=rotY; root.add(b); clickable.push(b); return b; };
  button('Action button',.14,.72,-3.94,5.15,0,Math.PI/2);
  button('Volume up',.14,1.15,-3.94,3.65,0,Math.PI/2);
  button('Volume down',.14,1.15,-3.94,2.10,0,Math.PI/2);
  button('Side button',.14,2.12,3.94,3.72,0,Math.PI/2);
  const cameraControl=button('Camera Control',.14,1.72,3.94,-2.9,0,Math.PI/2); cameraControl.material=new THREE.MeshPhysicalMaterial({color:0x6e6861,metalness:.8,roughness:.1,clearcoat:1});
  [-2.2,-1.7,-1.2,1.2,1.7,2.2].forEach(x=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.13,16),black);p.rotation.x=Math.PI/2;p.position.set(x,-8.18,.05);root.add(p)});
  const port=tag(new THREE.Mesh(new RoundedBoxGeometry(1.03,.12,.23,4,.05),black),'USB-C connector'); port.rotation.x=Math.PI/2; port.position.set(0,-8.18,0); root.add(port); clickable.push(port);
  const logo=tag(new THREE.Mesh(new THREE.CircleGeometry(.54,48),new THREE.MeshPhysicalMaterial({color:0x8d857b,metalness:.65,roughness:.32,transparent:true,opacity:.62})),'Apple mark'); logo.position.set(0,-.4,-.493); logo.rotation.y=Math.PI; root.add(logo); clickable.push(logo);

  let externalQ:THREE.Quaternion|null=null;let rawQ:THREE.Quaternion|null=null;let calibrationQ=new THREE.Quaternion(); let selected:THREE.Object3D|null=null; let videoTex:THREE.VideoTexture|null=null;let screenMode:'model'|'live'|'freeze'='model',manualScreenMode=false,liveMaterial:THREE.MeshBasicMaterial=displayMat;
  const api:TwinApi={
    setOrientation(x,y,z,w){rawQ=new THREE.Quaternion(x,y,z,w).normalize();externalQ=calibrationQ.clone().multiply(rawQ).normalize()},
    resetOrientation(){calibrationQ=rawQ?rawQ.clone().invert():new THREE.Quaternion();externalQ=new THREE.Quaternion()},
    setScreenMode(mode){manualScreenMode=true;screenMode=mode;if(mode==='model')display.material=displayMat;else if(mode==='live')display.material=liveMaterial},
    setScreenFrame(source){if(screenMode==='freeze')return;screen.context.drawImage(source,0,0,screen.canvas.width,screen.canvas.height);screen.texture.needsUpdate=true;liveMaterial=displayMat;if(!manualScreenMode&&screenMode==='model')screenMode='live';if(screenMode==='live')display.material=liveMaterial},
    setScreenStream(source){const video=source instanceof HTMLVideoElement?source:Object.assign(document.createElement('video'),{srcObject:source,muted:true,playsInline:true,autoplay:true}); video.play().catch(()=>{}); videoTex?.dispose(); videoTex=new THREE.VideoTexture(video);videoTex.colorSpace=THREE.SRGBColorSpace;liveMaterial=new THREE.MeshBasicMaterial({map:videoTex,toneMapped:false});screenMode='live';manualScreenMode=false;display.material=liveMaterial;return video}
  };
  function select(o:THREE.Object3D|null){ if(selected && selected instanceof THREE.Mesh){const m=selected.material as THREE.MeshStandardMaterial;m.emissive?.setHex(0)} selected=o; if(selected instanceof THREE.Mesh){const m=selected.material as THREE.MeshStandardMaterial;m.emissive?.setHex(0x203040)} return selected?.userData.part as string|undefined }
  function tick(ms:number){const t=ms*.001; root.position.y=Math.sin(t*.7)*.10; if(externalQ)root.quaternion.slerp(externalQ,.12); else {root.rotation.x=Math.sin(t*.45)*.025;root.rotation.z=Math.sin(t*.31)*.018}}
  return {root,clickable,select,tick,api};
}
