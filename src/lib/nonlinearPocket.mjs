// CFD v0.6 · finite smooth-nonlinear optical recovery.
//
// Independent decoder accepts only 900x900 RGBA pixels. It recovers ten
// coefficients from twelve uniquely colored calibration markers, not the
// generating controls, source bytes, or a hidden parameter channel.
// It supports a declared sinusoidal 2D warp family, not arbitrary deformation.
import { makeRasterPocketImage, decodeRasterPocketImage, RASTER_SIZE } from "./rasterPocket.mjs";

export const NONLINEAR_IMAGE_SIZE = 900;
export const NONLINEAR_CARRIER_SIZE = 700;
export const NONLINEAR_MARKER_RADIUS = 11;
export const NONLINEAR_MARKERS = Object.freeze([
  { id:"NW", x:48, y:48, rgb:[255,45,55] },
  { id:"N", x:350, y:48, rgb:[45,255,65] },
  { id:"NE", x:652, y:48, rgb:[255,227,30] },
  { id:"E", x:652, y:350, rgb:[220,45,255] },
  { id:"SE", x:652, y:652, rgb:[30,160,255] },
  { id:"S", x:350, y:652, rgb:[255,130,25] },
  { id:"SW", x:48, y:652, rgb:[255,40,166] },
  { id:"W", x:48, y:350, rgb:[164,255,30] },
  { id:"NW2", x:80, y:80, rgb:[105,76,255] },
  { id:"NE2", x:620, y:80, rgb:[249,178,133] },
  { id:"SE2", x:620, y:620, rgb:[48,244,162] },
  { id:"SW2", x:80, y:620, rgb:[224,100,217] }
]);
const TAU = Math.PI * 2;
const DARK = [18,28,47], LIGHT = [136,241,219], BACK = [6,12,24];
const OFFSET = (NONLINEAR_CARRIER_SIZE - RASTER_SIZE) / 2;
const MAX_RESIDUAL = 2.5;
function frame(size, bg=BACK) {
  const data = new Uint8ClampedArray(size*size*4);
  for(let i=0;i<data.length;i+=4){
    data[i]=bg[0];data[i+1]=bg[1];data[i+2]=bg[2];data[i+3]=255;
  }
  return {width:size,height:size,data};
}
function setRGB(f,x,y,c) {
  if(x<0||y<0||x>=f.width||y>=f.height)return;
  const k=(y*f.width+x)*4;
  f.data[k]=c[0];f.data[k+1]=c[1];f.data[k+2]=c[2];f.data[k+3]=255;
}
function isImage(input,size) {
  return !!input && input.width===size && input.height===size &&
    input.data?.length===size*size*4;
}
function finite(name,v,min,max) {
  if(!Number.isFinite(v)||v<min||v>max) throw new RangeError(name+" outside bounded experiment");
  return v;
}
export function nonlinearTransform({
  angle=8, shear=0.05, scale=0.94, horizontal=15, vertical=13,
  cross=10, twist=8
}={}) {
  finite("angle",angle,-12,12);finite("shear",shear,-0.12,0.12);
  finite("scale",scale,0.88,1);
  for(const [k,v] of Object.entries({horizontal,vertical,cross,twist}))
    finite(k,v,-22,22);
  const t=angle*Math.PI/180,c=Math.cos(t),s=Math.sin(t);
  const a=scale*c,b=scale*(c*shear-s),d=scale*s,e=scale*(s*shear+c);
  // Normalized basis coordinates: (2*x/700 - 1), (2*y/700 - 1).
  // Coefficients are in final output pixels. This is an explicit, finite
  // model family, not a learned universal inverse.
  const xco=[350*a,350*b,450,horizontal,cross];
  const yco=[350*d,350*e,450,vertical,twist];
  return {xco,yco};
}
function basisX(x,y) {
  const u=x/350-1,v=y/350-1;
  return [u,v,1,Math.sin(TAU*y/700),
    Math.sin(TAU*x/700)*Math.cos(TAU*y/700)];
}
function basisY(x,y) {
  const u=x/350-1,v=y/350-1;
  return [u,v,1,Math.sin(TAU*x/700),
    Math.sin(TAU*y/700)*Math.cos(TAU*x/700)];
}
function dot(a,b) {return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]+a[4]*b[4];}
export function nonlinearProject(model,x,y) {
  return {x:dot(model.xco,basisX(x,y)), y:dot(model.yco,basisY(x,y))};
}
export function makeNonlinearCarrier(payload) {
  const code=makeRasterPocketImage(payload);
  const image=frame(NONLINEAR_CARRIER_SIZE);
  for(let y=0;y<RASTER_SIZE;y++)for(let x=0;x<RASTER_SIZE;x++){
    const k=(y*RASTER_SIZE+x)*4;
    setRGB(image,x+OFFSET,y+OFFSET,[code.data[k],code.data[k+1],code.data[k+2]]);
  }
  for(const m of NONLINEAR_MARKERS) {
    for(let dy=-NONLINEAR_MARKER_RADIUS;dy<=NONLINEAR_MARKER_RADIUS;dy++)
      for(let dx=-NONLINEAR_MARKER_RADIUS;dx<=NONLINEAR_MARKER_RADIUS;dx++)
        if(dx*dx+dy*dy<=NONLINEAR_MARKER_RADIUS**2)
          setRGB(image,m.x+dx,m.y+dy,m.rgb);
  }
  return image;
}
function inverseWarp(model,x,y) {
  // Invert the linear part first; then iteratively cancel the nonlinear
  // displacement. Small bounded warps make this contraction stable.
  const {xco:xv,yco:yv}=model;
  const a=xv[0]/350,b=xv[1]/350,d=yv[0]/350,e=yv[1]/350;
  const determinant=a*e-b*d;
  if(!Number.isFinite(determinant)||determinant<0.5)
    throw new Error("WARP_ERROR: invalid linear base");
  function fromDelta(dx,dy){
    return {x:(e*dx-b*dy)/determinant,y:(-d*dx+a*dy)/determinant};
  }
  const first=fromDelta(x-xv[2],y-yv[2]);
  let sx=350+first.x,sy=350+first.y;
  for(let n=0;n<6;n++){
    const p=nonlinearProject(model,sx,sy);
    const step=fromDelta(x-p.x,y-p.y);
    sx+=step.x;sy+=step.y;
  }
  return {x:sx,y:sy};
}
export function warpNonlinearCarrier(carrier,settings={}) {
  if(!isImage(carrier,NONLINEAR_CARRIER_SIZE))throw new RangeError("Expected 700x700 carrier");
  const model=nonlinearTransform(settings),dst=frame(NONLINEAR_IMAGE_SIZE);
  for(let y=0;y<NONLINEAR_IMAGE_SIZE;y++) {
    for(let x=0;x<NONLINEAR_IMAGE_SIZE;x++){
      const p=inverseWarp(model,x,y), sx=Math.round(p.x),sy=Math.round(p.y);
      if(sx<0||sy<0||sx>=NONLINEAR_CARRIER_SIZE||sy>=NONLINEAR_CARRIER_SIZE)continue;
      const k=(sy*NONLINEAR_CARRIER_SIZE+sx)*4,j=(y*NONLINEAR_IMAGE_SIZE+x)*4;
      dst.data[j]=carrier.data[k];dst.data[j+1]=carrier.data[k+1];dst.data[j+2]=carrier.data[k+2];
    }
  }
  return dst;
}
function closestMarker(r,g,b){
  let match=-1,score=1200; // Max Euclidean color distance ~34.
  for(let i=0;i<NONLINEAR_MARKERS.length;i++){
    const c=NONLINEAR_MARKERS[i].rgb;
    const d=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;
    if(d<score){score=d;match=i;}
  }
  return match;
}
export function locateNonlinearMarkers(image) {
  if(!isImage(image,NONLINEAR_IMAGE_SIZE))throw new RangeError("Expected 900x900 RGBA");
  const stats=NONLINEAR_MARKERS.map(()=>({x:0,y:0,n:0}));
  for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
    const i=(y*image.width+x)*4;
    const k=closestMarker(image.data[i],image.data[i+1],image.data[i+2]);
    if(k<0)continue;
    const s=stats[k];s.n++;s.x+=x;s.y+=y;
  }
  if(stats.some(s=>s.n<100||s.n>1000))
    throw new Error("MARKER_ERROR: missing or damaged nonlinear fiducial");
  return stats.map((s,i)=>({id:NONLINEAR_MARKERS[i].id,
    sourceX:NONLINEAR_MARKERS[i].x,sourceY:NONLINEAR_MARKERS[i].y,
    x:s.x/s.n,y:s.y/s.n,count:s.n}));
}
function solveLinear(matrix,rhs) {
  // Gauss-Jordan with partial pivoting for a bounded 5x5 least-squares system.
  const n=rhs.length;
  const m=matrix.map((row,i)=>[...row,rhs[i]]);
  for(let col=0;col<n;col++){
    let p=col;
    for(let r=col+1;r<n;r++)if(Math.abs(m[r][col])>Math.abs(m[p][col]))p=r;
    if(Math.abs(m[p][col])<1e-9)throw new Error("CALIBRATION_ERROR: singular marker geometry");
    [m[p],m[col]]=[m[col],m[p]];
    const pivot=m[col][col];
    for(let j=col;j<=n;j++)m[col][j]/=pivot;
    for(let r=0;r<n;r++)if(r!==col){
      const f=m[r][col];for(let j=col;j<=n;j++)m[r][j]-=f*m[col][j];
    }
  }
  return m.map(row=>row[n]);
}
function fit(points,basis,field) {
  const dim=5,normal=Array.from({length:dim},()=>Array(dim).fill(0)),rhs=Array(dim).fill(0);
  for(const point of points){
    const features=basis(point.sourceX,point.sourceY);
    for(let i=0;i<dim;i++){
      rhs[i]+=features[i]*point[field];
      for(let j=0;j<dim;j++)normal[i][j]+=features[i]*features[j];
    }
  }
  return solveLinear(normal,rhs);
}
export function calibrateNonlinearImage(image) {
  const markers=locateNonlinearMarkers(image);
  const model={xco:fit(markers,basisX,"x"),yco:fit(markers,basisY,"y")};
  const predicted=markers.map(m=>nonlinearProject(model,m.sourceX,m.sourceY));
  const residual=Math.max(...markers.map((m,i)=>
    Math.hypot(m.x-predicted[i].x,m.y-predicted[i].y)));
  if(!Number.isFinite(residual)||residual>MAX_RESIDUAL)
    throw new Error("CALIBRATION_ERROR: nonlinear marker residual too large");
  const j00=model.xco[0]/350,j01=model.xco[1]/350,j10=model.yco[0]/350,j11=model.yco[1]/350;
  if(j00*j11-j01*j10<0.5)
    throw new Error("CALIBRATION_ERROR: warped field orientation invalid");
  return {model,residual,markerCount:markers.length,markers};
}
function brightness(image,x,y) {
  const ix=Math.round(x),iy=Math.round(y);
  if(ix<0||iy<0||ix>=image.width||iy>=image.height)return false;
  const k=(iy*image.width+ix)*4;
  return (image.data[k]+image.data[k+1]+image.data[k+2])/3>117;
}
function redrawRgba(dst,mx,my,bright) {
  const c=bright?LIGHT:DARK;
  for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)setRGB(dst,mx*3+dx,my*3+dy,c);
}
export function rebuildRasterFromNonlinearPixels(image,model) {
  const output=frame(RASTER_SIZE,DARK);
  const offsets=[[0,0],[0.45,0],[-0.45,0],[0,0.45],[0,-0.45],
    [-0.45,-0.45],[0.45,-0.45],[-0.45,0.45],[0.45,0.45]];
  for(let my=0;my<164;my++)for(let mx=0;mx<164;mx++){
    const x=OFFSET+mx*3+1,y=OFFSET+my*3+1;
    let hits=0;
    for(const [dx,dy] of offsets){
      const pt=nonlinearProject(model,x+dx,y+dy);
      if(brightness(image,pt.x,pt.y))hits++;
    }
    redrawRgba(output,mx,my,hits>=5);
  }
  return output;
}
export function decodeNonlinearImage(image) {
  if(!isImage(image,NONLINEAR_IMAGE_SIZE))return {passed:false,reason:"DIMENSION_ERROR: expected 900x900 RGBA",bytes:null};
  try{
    const fit=calibrateNonlinearImage(image);
    const raster=rebuildRasterFromNonlinearPixels(image,fit.model);
    const output=decodeRasterPocketImage(raster);
    return {...output,markerResidual:fit.residual,markerCount:fit.markerCount,
      method:"PIXEL_ONLY_SINUSOIDAL_BASIS_CALIBRATION"};
  }catch(e){
    return {passed:false,reason:e.message,bytes:null,markerResidual:null};
  }
}
