import test from "node:test";
import assert from "node:assert/strict";
import {
  NONLINEAR_IMAGE_SIZE, NONLINEAR_MARKERS, makeNonlinearCarrier,
  warpNonlinearCarrier, locateNonlinearMarkers, calibrateNonlinearImage,
  nonlinearTransform, nonlinearProject, decodeNonlinearImage
} from "../src/lib/nonlinearPocket.mjs";

const bytes = n => Uint8Array.from({length:n},(_,i)=>(i*83+(i>>3)*17+31)&255);
const scenarios = [
  {angle:0,shear:0,scale:1,horizontal:0,vertical:0,cross:0,twist:0},
  {angle:7,shear:0.05,scale:0.94,horizontal:12,vertical:10,cross:7,twist:-6},
  {angle:-10,shear:-0.08,scale:0.9,horizontal:-18,vertical:15,cross:-10,twist:9}
];

test("twelve distinct fiducials fit in the fixed pixel carrier gutter",()=>{
  assert.equal(NONLINEAR_IMAGE_SIZE,900);
  assert.equal(NONLINEAR_MARKERS.length,12);
  assert.equal(new Set(NONLINEAR_MARKERS.map(m=>m.id)).size,12);
  const image=makeNonlinearCarrier(bytes(1024));
  assert.equal(image.data.length,700*700*4);
});

test("known generating model has measurable non-affine displacement",()=>{
  const base=nonlinearTransform({angle:0,shear:0,scale:1,
    horizontal:0,vertical:0,cross:0,twist:0});
  const warped=nonlinearTransform({angle:0,shear:0,scale:1,
    horizontal:19,vertical:14,cross:11,twist:-8});
  const a=nonlinearProject(base,140,175),b=nonlinearProject(warped,140,175);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>3);
});

test("independent pixel-only decoder recovers a 1 KiB payload after smooth nonlinear warps",()=>{
  const original=makeNonlinearCarrier(bytes(1024));
  for(const scenario of scenarios){
    const image=warpNonlinearCarrier(original,scenario);
    const detached={width:image.width,height:image.height,data:new Uint8ClampedArray(image.data)};
    const recovered=decodeNonlinearImage(detached);
    assert.equal(recovered.passed,true,JSON.stringify(scenario)+": "+recovered.reason);
    assert.deepEqual(recovered.bytes,bytes(1024));
    assert.ok(recovered.markerResidual<2.5);
    assert.equal(recovered.markerCount,12);
  }
});

test("short and empty payloads are decoded after nonlinear displacement",()=>{
  for(const n of [0,1,23,145]){
    const image=warpNonlinearCarrier(makeNonlinearCarrier(bytes(n)),
      {angle:5,shear:0.03,scale:0.92,horizontal:14,vertical:-10,cross:7,twist:4});
    const decoded=decodeNonlinearImage(image);
    assert.equal(decoded.passed,true,"length "+n+": "+decoded.reason);
    assert.deepEqual(decoded.bytes,bytes(n));
  }
});

test("missing calibration marker causes explicit failure, not invented recovery",()=>{
  const image=warpNonlinearCarrier(makeNonlinearCarrier(bytes(11)),{
    angle:0,shear:0,scale:1,horizontal:0,vertical:0,cross:0,twist:0
  });
  // Remove red NW fiducial only.
  for(let i=0;i<image.data.length;i+=4){
    if(image.data[i]===255&&image.data[i+1]===45&&image.data[i+2]===55){
      image.data[i]=6;image.data[i+1]=12;image.data[i+2]=24;
    }
  }
  assert.match(decodeNonlinearImage(image).reason,/MARKER_ERROR/);
});

test("wrong image dimensions and unsupported warp ranges fail closed",()=>{
  assert.match(decodeNonlinearImage({width:800,height:900,data:[]}).reason,/DIMENSION_ERROR/);
  assert.throws(()=>warpNonlinearCarrier(makeNonlinearCarrier(bytes(1)),{
    horizontal:100
  }),RangeError);
  assert.throws(()=>warpNonlinearCarrier(makeNonlinearCarrier(bytes(1)),{
    scale:0.1
  }),RangeError);
});

test("independent fiducial fitting reports residual and parameter count",()=>{
  const image=warpNonlinearCarrier(makeNonlinearCarrier(bytes(77)),scenarios[1]);
  const markers=locateNonlinearMarkers(image);
  assert.equal(markers.length,12);
  assert.ok(markers.every(m=>m.count>100));
  const result=calibrateNonlinearImage(image);
  assert.ok(Number.isFinite(result.residual));
  assert.equal(result.model.xco.length,5);
  assert.equal(result.model.yco.length,5);
});
