// CFD v0.7 · Piecewise bilinear elastic mesh · original finite pixel codec.
// The independent decoder receives only a 900x900 RGBA frame. It detects
// 25 distinct calibration fiducials in reserved gutters and interpolates
// their positions. No original payload, generator node positions or warp
// slider parameters are passed into the decoder.
import { makeRasterPocketImage, decodeRasterPocketImage, RASTER_SIZE } from "./rasterPocket.mjs";

export const MESH_OUTPUT_SIZE = 900;
export const MESH_SOURCE_SIZE = 700;
export const MESH_CELLS = 4;
export const MESH_MODULES_PER_TILE = 41;
export const MESH_TILE_PX = MESH_MODULES_PER_TILE * 3; // 123
export const MESH_STEP = 161;
export const MESH_START = 28;
export const MESH_GUTTER = (MESH_STEP - MESH_TILE_PX) / 2; // 19
export const MESH_MARKER_RADIUS = 8;
export const MESH_NODES = Object.freeze(
  Array.from({length: MESH_CELLS + 1}, (_,i) => MESH_START + i * MESH_STEP)
);
export const MESH_MARKERS = Object.freeze(
  Array.from({length:25},(_,id)=>Object.freeze({
    id, col:id%5,row:Math.floor(id/5),
    x:MESH_NODES[id%5],y:MESH_NODES[Math.floor(id/5)],
    color:Object.freeze([90+80*(id%3),90+80*(Math.floor(id/3)%3),90+80*(Math.floor(id/9)%3)])
  }))
);
const DARK=[18,28,47],LIGHT=[136,241,219],BACK=[6,12,24];
function imageOf(size,fill=BACK){
  const data=new Uint8ClampedArray(size*size*4);
  for(let i=0;i<data.length;i+=4){data[i]=fill[0];data[i+1]=fill[1];data[i+2]=fill[2];data[i+3]=255;}
  return {width:size,height:size,data};
}
function valid(image,size){
  return image?.width===size && image?.height===size && image.data?.length===size*size*4;
}
function put(image,x,y,c){
  if(x<0||y<0||x>=image.width||y>=image.height)return;
  const k=(y*image.width+x)*4;
  image.data[k]=c[0];image.data[k+1]=c[1];image.data[k+2]=c[2];image.data[k+3]=255;
}
function get(image,x,y){
  if(x<0||y<0||x>=image.width||y>=image.height)return BACK;
  const k=(y*image.width+x)*4;
  return [image.data[k],image.data[k+1],image.data[k+2]];
}
export function makeMeshCarrier(bytes){
  const original=makeRasterPocketImage(bytes);
  const carrier=imageOf(MESH_SOURCE_SIZE);
  // Tiling the entire code image leaves untouched gutters for calibration.
  // The raster itself is unchanged and losslessly rebuildable.
  for(let my=0;my<164;my++)for(let mx=0;mx<164;mx++){
    const col=Math.floor(mx/MESH_MODULES_PER_TILE),row=Math.floor(my/MESH_MODULES_PER_TILE);
    const sx=MESH_NODES[col]+MESH_GUTTER+(mx%MESH_MODULES_PER_TILE)*3;
    const sy=MESH_NODES[row]+MESH_GUTTER+(my%MESH_MODULES_PER_TILE)*3;
    for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){
      const i=((my*3+dy)*RASTER_SIZE+(mx*3+dx))*4;
      put(carrier,sx+dx,sy+dy,[original.data[i],original.data[i+1],original.data[i+2]]);
    }
  }
  for(const marker of MESH_MARKERS){
    for(let dy=-MESH_MARKER_RADIUS;dy<=MESH_MARKER_RADIUS;dy++)
      for(let dx=-MESH_MARKER_RADIUS;dx<=MESH_MARKER_RADIUS;dx++)
        if(dx*dx+dy*dy<=MESH_MARKER_RADIUS**2)
          put(carrier,marker.x+dx,marker.y+dy,marker.color);
  }
  return carrier;
}
function limits(settings){
  const {strength=20,angle=5,scale=0.95,phase=1}=settings;
  for(const [key,value,min,max] of [
    ["strength",strength,0,28],["angle",angle,-9,9],
    ["scale",scale,0.88,1],["phase",phase,-3.14,3.14]
  ]){
    if(!Number.isFinite(value)||value<min||value>max)throw new RangeError(key+" out of bounded mesh range");
  }
  return {strength,angle,scale,phase};
}
export function generateMeshNodes(settings={}){
  const {strength,angle,scale,phase}=limits(settings);
  const theta=angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  return Array.from({length:5},(_,row)=>Array.from({length:5},(_,col)=>{
    const x=MESH_NODES[col]-350,y=MESH_NODES[row]-350;
    const wx=strength*Math.sin(1.07*col+2.17*row+phase);
    const wy=strength*Math.cos(2.39*col-1.31*row+phase*0.7);
    return {x:450+scale*(c*x-s*y)+wx,y:450+scale*(s*x+c*y)+wy};
  }));
}
export function bilinearPoint(a,b,c,d,u,v){
  // a=NW b=NE c=SW d=SE
  const x0=a.x+(b.x-a.x)*u, x1=c.x+(d.x-c.x)*u;
  const y0=a.y+(b.y-a.y)*u, y1=c.y+(d.y-c.y)*u;
  return {x:x0+(x1-x0)*v,y:y0+(y1-y0)*v};
}
function inverseBilinear(a,b,c,d,x,y){
  // Initial guess from affine corner edges, then Newton's method.
  const ex=b.x-a.x,ey=b.y-a.y,fx=c.x-a.x,fy=c.y-a.y;
  const det=ex*fy-ey*fx;
  if(Math.abs(det)<100) return null;
  let u=((x-a.x)*fy-(y-a.y)*fx)/det;
  let v=((y-a.y)*ex-(x-a.x)*ey)/det;
  const gx=d.x-b.x-c.x+a.x,gy=d.y-b.y-c.y+a.y;
  for(let i=0;i<5;i++){
    const px=a.x+ex*u+fx*v+gx*u*v;
    const py=a.y+ey*u+fy*v+gy*u*v;
    const dux=ex+gx*v,duy=ey+gy*v,dvx=fx+gx*u,dvy=fy+gy*u;
    const jac=dux*dvy-duy*dvx;
    if(Math.abs(jac)<50)return null;
    const rx=x-px,ry=y-py;
    u+=(rx*dvy-ry*dvx)/jac;
    v+=(ry*dux-rx*duy)/jac;
  }
  return {u,v};
}
function meshCell(nodes,col,row){
  return [nodes[row][col],nodes[row][col+1],nodes[row+1][col],nodes[row+1][col+1]];
}
function determinant(p,q,r){
  return (q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
}
function assessMesh(nodes){
  let minArea=Infinity,maxArea=0,maxEdge=0;
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const [a,b,c,d]=meshCell(nodes,col,row);
    const area1=determinant(a,b,c),area2=determinant(d,c,b);
    if(!Number.isFinite(area1)||!Number.isFinite(area2)||Math.min(area1,area2)<6000)
      throw new Error("MESH_FOLD: marker quadrilateral is degenerate or inverted");
    minArea=Math.min(minArea,area1,area2);maxArea=Math.max(maxArea,area1,area2);
    maxEdge=Math.max(maxEdge,
      Math.hypot(a.x-b.x,a.y-b.y),Math.hypot(a.x-c.x,a.y-c.y));
  }
  return {minArea,maxArea,maxEdge};
}
export function warpMeshCarrier(carrier,settings={}){
  if(!valid(carrier,MESH_SOURCE_SIZE))throw new RangeError("Expected 700x700 RGB carrier");
  const nodes=generateMeshNodes(settings);
  assessMesh(nodes);
  const target=imageOf(MESH_OUTPUT_SIZE);
  // Inverse rasterization patch by patch prevents forward-splat holes.
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const [a,b,c,d]=meshCell(nodes,col,row);
    const left=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x,d.x))-2);
    const right=Math.min(MESH_OUTPUT_SIZE-1,Math.ceil(Math.max(a.x,b.x,c.x,d.x))+2);
    const top=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y,d.y))-2);
    const bottom=Math.min(MESH_OUTPUT_SIZE-1,Math.ceil(Math.max(a.y,b.y,c.y,d.y))+2);
    for(let py=top;py<=bottom;py++)for(let px=left;px<=right;px++){
      const uv=inverseBilinear(a,b,c,d,px,py);
      if(!uv||uv.u<0||uv.u>1||uv.v<0||uv.v>1)continue;
      const sx=Math.round(MESH_NODES[col]+uv.u*MESH_STEP);
      const sy=Math.round(MESH_NODES[row]+uv.v*MESH_STEP);
      put(target,px,py,get(carrier,sx,sy));
    }
  }
  return target;
}
function digit(value){
  const choices=[90,170,250];
  let found=-1,distance=21;
  for(let i=0;i<3;i++){const diff=Math.abs(value-choices[i]);if(diff<distance){distance=diff;found=i;}}
  return found;
}
function markerId(r,g,b){
  const a=digit(r),c=digit(g),d=digit(b);
  if(a<0||c<0||d<0)return -1;
  const id=a+3*c+9*d;
  return id<25?id:-1;
}
export function locateMeshMarkers(image){
  if(!valid(image,MESH_OUTPUT_SIZE))throw new RangeError("Expected exactly 900x900 RGBA");
  const stats=Array.from({length:25},()=>({x:0,y:0,n:0}));
  for(let y=0;y<MESH_OUTPUT_SIZE;y++)for(let x=0;x<MESH_OUTPUT_SIZE;x++){
    const k=(y*MESH_OUTPUT_SIZE+x)*4;
    const id=markerId(image.data[k],image.data[k+1],image.data[k+2]);
    if(id<0)continue;
    const item=stats[id];item.n++;item.x+=x;item.y+=y;
  }
  if(stats.some(s=>s.n<65||s.n>450))throw new Error("MARKER_ERROR: lost or damaged mesh fiducial");
  const nodes=Array.from({length:5},()=>Array(5));
  for(let i=0;i<stats.length;i++){
    const s=stats[i];nodes[Math.floor(i/5)][i%5]={x:s.x/s.n,y:s.y/s.n,count:s.n};
  }
  const quality=assessMesh(nodes);
  return {nodes,quality,markerCount:25};
}
function sampledPixel(image,x,y){
  const px=Math.round(x),py=Math.round(y);
  if(px<0||py<0||px>=image.width||py>=image.height)return false;
  const k=(py*image.width+px)*4;
  return (image.data[k]+image.data[k+1]+image.data[k+2])/3>117;
}
function setModule(out,mx,my,bright){
  const color=bright?LIGHT:DARK;
  for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)put(out,mx*3+dx,my*3+dy,color);
}
export function reconstructMeshRaster(image,nodes){
  const out=imageOf(RASTER_SIZE,DARK);
  const offsets=[[0,0],[-0.45,0],[0.45,0],[0,-0.45],[0,0.45],
    [-0.45,-0.45],[0.45,-0.45],[-0.45,0.45],[0.45,0.45]];
  for(let my=0;my<164;my++)for(let mx=0;mx<164;mx++){
    const col=Math.floor(mx/41),row=Math.floor(my/41);
    const startX=MESH_NODES[col],startY=MESH_NODES[row];
    const sourceX=startX+MESH_GUTTER+(mx%41)*3+1;
    const sourceY=startY+MESH_GUTTER+(my%41)*3+1;
    const a=nodes[row][col],b=nodes[row][col+1],c=nodes[row+1][col],d=nodes[row+1][col+1];
    let count=0;
    for(const [dx,dy] of offsets){
      const u=(sourceX+dx-startX)/MESH_STEP;
      const v=(sourceY+dy-startY)/MESH_STEP;
      const point=bilinearPoint(a,b,c,d,u,v);
      if(sampledPixel(image,point.x,point.y))count++;
    }
    setModule(out,mx,my,count>=5);
  }
  return out;
}
export function decodeMeshImage(image){
  if(!valid(image,MESH_OUTPUT_SIZE))
    return {passed:false,reason:"DIMENSION_ERROR: expected exactly 900x900 RGBA",bytes:null};
  try{
    const calibration=locateMeshMarkers(image);
    const raster=reconstructMeshRaster(image,calibration.nodes);
    const decoded=decodeRasterPocketImage(raster);
    return {...decoded,markerCount:calibration.markerCount,
      minCellArea:calibration.quality.minArea,maxCellArea:calibration.quality.maxArea,
      method:"PIXEL_ONLY_5X5_PIECEWISE_BILINEAR_MESH"};
  }catch(err){
    return {passed:false,reason:err.message,bytes:null};
  }
}
