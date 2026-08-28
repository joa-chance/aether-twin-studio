import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { TwinApi } from './model';

export type AssetPhone = {
  root: THREE.Group;
  clickable: THREE.Object3D[];
  select: (object: THREE.Object3D | null) => string | undefined;
  tick: (time: number) => void;
  api: TwinApi;
  ready: Promise<void>;
};

function makeScreenSurface() {
  const canvas=document.createElement('canvas');canvas.width=828;canvas.height=1792;
  const context=canvas.getContext('2d')!;
  const gradient=context.createLinearGradient(0,0,828,1792);gradient.addColorStop(0,'#07142d');gradient.addColorStop(.5,'#5c245f');gradient.addColorStop(1,'#e57c52');
  context.fillStyle=gradient;context.fillRect(0,0,828,1792);
  context.fillStyle='#fff';context.textAlign='center';context.font='600 116px -apple-system,sans-serif';context.fillText('9:41',414,265);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.flipY=false;
  return {canvas,context,texture};
}

export function createAssetIPhone(url: string, onLoaded?:()=>void): AssetPhone {
  const root=new THREE.Group();root.name='iPhone 17 Pro';
  const clickable:THREE.Object3D[]=[];const screen=makeScreenSurface();
  let externalQ:THREE.Quaternion|null=null,rawQ:THREE.Quaternion|null=null,calibrationQ=new THREE.Quaternion(),selected:THREE.Mesh|null=null,videoTexture:THREE.VideoTexture|null=null,screenMesh:THREE.Mesh|null=null,originalScreenMaterial:THREE.Material|THREE.Material[]|null=null,liveScreenMaterial:THREE.Material|null=null,screenMode:'model'|'live'|'freeze'='model',manualScreenMode=false;

  const manager=new THREE.LoadingManager();
  manager.setURLModifier(requested=>{
    const clean=decodeURIComponent(requested.split('?')[0]);
    const filename=clean.split(/[\\/]/).pop()??clean;
    return /\.(png|jpe?g)$/i.test(filename)?`/models/iphone17/tex/${encodeURIComponent(filename)}`:requested;
  });
  const ready=new GLTFLoader(manager).loadAsync(url).then(gltf=>{
    const asset=gltf.scene;
    asset.updateMatrixWorld(true);
    const originalBox=new THREE.Box3().setFromObject(asset),size=originalBox.getSize(new THREE.Vector3());
    root.userData.originalSize=[size.x,size.y,size.z];
    const longestAxis=size.x>size.y&&size.x>size.z?'x':size.z>size.y?'z':'y';
    if(longestAxis==='z')asset.rotation.x=-Math.PI/2;
    else if(longestAxis==='x')asset.rotation.z=Math.PI/2;
    asset.updateMatrixWorld(true);
    const uprightSize=new THREE.Box3().setFromObject(asset).getSize(new THREE.Vector3());
    const longest=Math.max(uprightSize.x,uprightSize.y,uprightSize.z);
    if(!Number.isFinite(longest)||longest<=0)throw new Error('GLB model has invalid geometry bounds');
    asset.scale.setScalar(16.3/longest);asset.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(asset),center=box.getCenter(new THREE.Vector3());asset.position.sub(center);asset.updateMatrixWorld(true);

    const candidates:{mesh:THREE.Mesh;score:number}[]=[];
    asset.visible=true;
    asset.traverse(object=>{
      object.visible=true;
      if(!(object instanceof THREE.Mesh))return;
      object.frustumCulled=false;object.castShadow=true;object.receiveShadow=true;object.userData.part=object.name||'iPhone component';clickable.push(object);
      const bounds=new THREE.Box3().setFromObject(object),s=bounds.getSize(new THREE.Vector3()),c=bounds.getCenter(new THREE.Vector3());
      const dims=[s.x,s.y,s.z].sort((a,b)=>b-a);
      const isPanel=dims[0]>6&&dims[1]>2.5&&dims[2]<1.2;
      const identity=`${object.name} ${(Array.isArray(object.material)?object.material:[object.material]).map(m=>m?.name??'').join(' ')}`.toLowerCase();
      const isKnownGlbDisplay=object.name.replace(/\.\d+$/,'')==='WwhWjpAuVZZqJpj';
      if(isPanel||/(screen|display|lcd)/.test(identity)){
        const material=Array.isArray(object.material)?object.material[0]:object.material;
        const darkness=material instanceof THREE.MeshStandardMaterial?1-material.color.getHSL({h:0,s:0,l:0}).l:0;
        candidates.push({mesh:object,score:dims[0]*dims[1]+darkness*15+c.z*.15+(/(screen|display|lcd)/.test(identity)?100:0)+(isKnownGlbDisplay?10000:0)});
      }
    });
    candidates.sort((a,b)=>b.score-a.score);screenMesh=candidates[0]?.mesh??null;
    if(screenMesh){screenMesh.userData.part='Live display';originalScreenMaterial=screenMesh.material;liveScreenMaterial=new THREE.MeshBasicMaterial({map:screen.texture,toneMapped:false,side:THREE.DoubleSide});}
    root.add(asset);root.updateMatrixWorld(true);root.userData.finalBox=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()).toArray();onLoaded?.();
  });

  const api:TwinApi={
    setOrientation(x,y,z,w){rawQ=new THREE.Quaternion(x,y,z,w).normalize();externalQ=calibrationQ.clone().multiply(rawQ).normalize()},resetOrientation(){calibrationQ=rawQ?rawQ.clone().invert():new THREE.Quaternion();externalQ=new THREE.Quaternion()},
    setScreenMode(mode){manualScreenMode=true;screenMode=mode;if(screenMesh&&mode==='model'&&originalScreenMaterial)screenMesh.material=originalScreenMaterial;else if(screenMesh&&mode==='live'&&liveScreenMaterial)screenMesh.material=liveScreenMaterial},
    setScreenFrame(source){if(screenMode==='freeze')return;screen.context.drawImage(source,0,0,screen.canvas.width,screen.canvas.height);screen.texture.needsUpdate=true;if(!manualScreenMode&&screenMode==='model')screenMode='live';if(screenMesh&&screenMode==='live'&&liveScreenMaterial)screenMesh.material=liveScreenMaterial},
    setScreenStream(source){const video=source instanceof HTMLVideoElement?source:Object.assign(document.createElement('video'),{srcObject:source,muted:true,playsInline:true,autoplay:true});video.play().catch(()=>{});videoTexture?.dispose();videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;videoTexture.flipY=false;liveScreenMaterial=new THREE.MeshBasicMaterial({map:videoTexture,toneMapped:false,side:THREE.DoubleSide});screenMode='live';manualScreenMode=false;if(screenMesh)screenMesh.material=liveScreenMaterial;return video}
  };
  function select(object:THREE.Object3D|null){if(selected){const old=Array.isArray(selected.material)?selected.material[0]:selected.material;if(old instanceof THREE.MeshStandardMaterial)old.emissive.setHex(0)}selected=object instanceof THREE.Mesh?object:null;if(selected){const material=Array.isArray(selected.material)?selected.material[0]:selected.material;if(material instanceof THREE.MeshStandardMaterial)material.emissive.setHex(0x182536)}return object?.userData.part as string|undefined}
  function tick(ms:number){const t=ms*.001;root.position.y=Math.sin(t*.7)*.1;if(externalQ)root.quaternion.slerp(externalQ,.12);else{root.rotation.x=Math.sin(t*.45)*.025;root.rotation.z=Math.sin(t*.31)*.018}}
  return {root,clickable,select,tick,api,ready};
}
