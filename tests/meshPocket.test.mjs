import test from "node:test";
import assert from "node:assert/strict";
import {
  MESH_OUTPUT_SIZE, MESH_SOURCE_SIZE, MESH_MARKERS, MESH_CELLS,
  MESH_NODES, MESH_GUTTER, makeMeshCarrier, generateMeshNodes,
  bilinearPoint, warpMeshCarrier, locateMeshMarkers,
  reconstructMeshRaster, decodeMeshImage
} from "../src/lib/meshPocket.mjs";
import { makeRasterPocketImage, decodeRasterPocketImage } from "../src/lib/rasterPocket.mjs";

const sample = size => Uint8Array.from({length:size},(_,i)=>(i*83+(i>>3)*17+31)&255);
const scenarios=[
  {strength:0,angle:0,scale:1,phase:0},
  {strength:13,angle:3,scale:0.98,phase:0.5},
  {strength:22,angle:-7,scale:0.91,phase:1.8},
  {strength:28,angle:9,scale:0.88,phase:-2.6}
];

test("mesh carrier reserves 25 unique colored registration points and all original raster cells",()=>{
  assert.equal(MESH_CELLS,4);
  assert.equal(MESH_MARKERS.length,25);
  assert.equal(MESH_GUTTER,19);
  assert.equal(new Set(MESH_MARKERS.map(m=>m.color.join(","))).size,25);
  assert.deepEqual(MESH_NODES,[28,189,350,511,672]);
  assert.equal(makeMeshCarrier(sample(1024)).data.length,MESH_SOURCE_SIZE*MESH_SOURCE_SIZE*4);
});

test("piecewise bilinear grid can bend beyond one global affine map",()=>{
  const nodes=generateMeshNodes({strength:22,angle:6,scale:0.94,phase:1.2});
  const a=nodes[0][0],b=nodes[0][1],c=nodes[1][0],d=nodes[1][1];
  const p=bilinearPoint(a,b,c,d,0.5,0.5);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
  const top={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const bottom={x:(c.x+d.x)/2,y:(c.y+d.y)/2};
  assert.ok(Math.abs(p.x-(top.x+bottom.x)/2)<1e-9);
  const horizontalMidA=nodes[1][2].y-nodes[1][1].y;
  const horizontalMidB=nodes[2][2].y-nodes[2][1].y;
  assert.ok(Math.abs(horizontalMidA-horizontalMidB)>0.1);
});

test("the pixel-only mesh reader recovers a complete 1 KiB under distinct flexible warps",()=>{
  const bytes=sample(1024);
  const carrier=makeMeshCarrier(bytes);
  for(const settings of scenarios){
    const image=warpMeshCarrier(carrier,settings);
    const detached={width:MESH_OUTPUT_SIZE,height:MESH_OUTPUT_SIZE,
      data:new Uint8ClampedArray(image.data)};
    const decoded=decodeMeshImage(detached);
    assert.equal(decoded.passed,true,JSON.stringify(settings)+": "+decoded.reason);
    assert.deepEqual(decoded.bytes,bytes);
    assert.equal(decoded.markerCount,25);
    assert.ok(decoded.minCellArea>6000);
  }
});

test("empty and shorter payloads recover with independent mesh calibration",()=>{
  for(const n of [0,1,17,333]){
    const image=warpMeshCarrier(makeMeshCarrier(sample(n)),scenarios[2]);
    const decoded=decodeMeshImage(image);
    assert.equal(decoded.passed,true,"size "+n+": "+decoded.reason);
    assert.deepEqual(decoded.bytes,sample(n));
  }
});

test("untouched tile carrier can be reconstructed directly from fiducials",()=>{
  const bytes=sample(259);
  const image=warpMeshCarrier(makeMeshCarrier(bytes),scenarios[1]);
  const markers=locateMeshMarkers(image);
  const raster=reconstructMeshRaster(image,markers.nodes);
  const result=decodeRasterPocketImage(raster);
  assert.equal(result.passed,true,result.reason);
  assert.deepEqual(result.bytes,bytes);
});

test("missing a colored fiducial must cause a visible negative result",()=>{
  const image=warpMeshCarrier(makeMeshCarrier(sample(33)),scenarios[0]);
  // Marker zero uses RGB 90 90 90. Do not change any payload modules.
  for(let i=0;i<image.data.length;i+=4){
    if(image.data[i]===90&&image.data[i+1]===90&&image.data[i+2]===90){
      image.data[i]=6;image.data[i+1]=12;image.data[i+2]=24;
    }
  }
  assert.match(decodeMeshImage(image).reason,/MARKER_ERROR/);
});

test("tampered raster content fails checksum or header without fooling marker tracking",()=>{
  const image=warpMeshCarrier(makeMeshCarrier(sample(1024)),scenarios[0]);
  // Invert every data-module pixel while keeping calibration markers unchanged.
  for(let i=0;i<image.data.length;i+=4){
    const r=image.data[i],g=image.data[i+1],b=image.data[i+2];
    if(r===136&&g===241&&b===219){
      image.data[i]=18;image.data[i+1]=28;image.data[i+2]=47;
    }else if(r===18&&g===28&&b===47){
      image.data[i]=136;image.data[i+1]=241;image.data[i+2]=219;
    }
  }
  const decoded=decodeMeshImage(image);
  assert.equal(decoded.passed,false);
  assert.match(decoded.reason,/HEADER_ERROR|CHECKSUM_MISMATCH/);
});

test("malformed input or unsupported mesh strength fails closed",()=>{
  assert.match(decodeMeshImage({width:800,height:900,data:[]}).reason,/DIMENSION_ERROR/);
  assert.throws(()=>warpMeshCarrier(makeMeshCarrier(sample(1)),{strength:50}),RangeError);
  assert.throws(()=>generateMeshNodes({scale:0.2}),RangeError);
  assert.throws(()=>makeMeshCarrier(new Uint8Array(1025)),RangeError);
});
