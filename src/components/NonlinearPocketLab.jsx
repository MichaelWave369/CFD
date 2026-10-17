import { useEffect, useMemo, useRef, useState } from "react";
import {
  NONLINEAR_IMAGE_SIZE, makeNonlinearCarrier,
  warpNonlinearCarrier, decodeNonlinearImage
} from "../lib/nonlinearPocket.mjs";
import { checksum32 } from "../lib/pocketField.mjs";

const encoder = new TextEncoder();
const seedPhrase = "Infinite pockets are addresses, not infinite storage.";
function sample() {
  let seed=0x369cfd;
  const data=new Uint8Array(1024);
  for(let i=0;i<1024;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    data[i]=seed>>>24;
  }
  return data;
}
function Slider({label,value,min,max,step,unit,onChange}){
  return <label className="nonlinear-slider">
    <span>{label}<strong>{value}{unit}</strong></span>
    <input type="range" value={value} min={min} max={max} step={step}
      onChange={e=>onChange(Number(e.target.value))}/>
  </label>;
}
export default function NonlinearPocketLab(){
  const canvasRef=useRef(null);
  const [text,setText]=useState(seedPhrase);
  const [bytes,setBytes]=useState(()=>encoder.encode(seedPhrase));
  const [angle,setAngle]=useState(7),[shear,setShear]=useState(0.05);
  const [scale,setScale]=useState(0.94);
  const [horizontal,setHorizontal]=useState(12),[vertical,setVertical]=useState(10);
  const [cross,setCross]=useState(7),[twist,setTwist]=useState(-6);
  const [imported,setImported]=useState(null),[report,setReport]=useState(null);
  const [error,setError]=useState(""),[source,setSource]=useState("SIMULATED_LOCAL");
  const controls={angle,shear,scale,horizontal,vertical,cross,twist};
  const generated=useMemo(()=>warpNonlinearCarrier(makeNonlinearCarrier(bytes),controls),
    [bytes,angle,shear,scale,horizontal,vertical,cross,twist]);
  const image=imported??generated;

  useEffect(()=>{
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext("2d",{willReadFrequently:true});
    if(!ctx)return;
    canvas.width=NONLINEAR_IMAGE_SIZE;canvas.height=NONLINEAR_IMAGE_SIZE;
    ctx.putImageData(new ImageData(image.data,image.width,image.height),0,0);
  },[image]);

  function update(setter,value){
    setter(value);setImported(null);setReport(null);setError("");
    setSource("SIMULATED_LOCAL_NONLINEAR_WARP");
  }
  function encode(){
    const next=encoder.encode(text);
    if(next.length>1024){setError("UTF-8 message exceeds 1,024 bytes.");return;}
    setBytes(next);setImported(null);setReport(null);setError("");
    setSource("USER_AUTHORED_LOCAL");
  }
  function encodeSample(){
    setBytes(sample());setImported(null);setReport(null);setError("");
    setSource("SIMULATED_1_KIB");
  }
  function readPixels(){
    try{
      const canvas=canvasRef.current;
      const ctx=canvas?.getContext("2d",{willReadFrequently:true});
      if(!ctx)throw new Error("Pixel canvas unavailable.");
      const frame=ctx.getImageData(0,0,NONLINEAR_IMAGE_SIZE,NONLINEAR_IMAGE_SIZE);
      const result=decodeNonlinearImage(frame);
      setReport({
        at:new Date().toISOString(),passed:result.passed,reason:result.reason,
        length:result.length??null,checksum:result.checksum??null,
        markerResidual:result.markerResidual??null,
        markerCount:result.markerCount??null,method:result.method??null,source
      });setError("");
    }catch(err){setError(err.message);}
  }
  function savePng(){
    const canvas=canvasRef.current;if(!canvas)return;
    const link=document.createElement("a");
    link.href=canvas.toDataURL("image/png");link.download="CFD-nonlinear-pocket-900px.png";link.click();
  }
  async function readPng(event){
    const file=event.target.files?.[0];event.target.value="";if(!file)return;
    if(file.type!=="image/png"){setError("Please provide a PNG.");return;}
    try{
      const bitmap=await createImageBitmap(file);
      try{
        if(bitmap.width!==900||bitmap.height!==900)
          throw new Error("Nonlinear raster PNG must be exactly 900 × 900 pixels.");
        const canvas=document.createElement("canvas");canvas.width=900;canvas.height=900;
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        if(!ctx)throw new Error("Image readback unavailable.");
        ctx.drawImage(bitmap,0,0);
        const pixels=ctx.getImageData(0,0,900,900);
        setImported({width:900,height:900,data:pixels.data});
        setSource("USER_UPLOADED_ORIGIN_UNVERIFIED");
        setReport(null);setError("");
      }finally{bitmap.close?.();}
    }catch(err){setError(err.message);}
  }
  function receipt(){
    if(!report)return;
    const data={
      experiment:"CFD v0.6 Nonlinear Pocket Reader",schema:1,
      source,provenance:source.startsWith("USER")?"USER_SUPPLIED":"SIMULATED",
      decoderInput:"Pixel data only, 12-color known marker layout and known sine basis family",
      warpControlsForGeneration:imported?null:controls,
      originalPayloadChecksumForLocalSample:imported?null:checksum32(bytes),
      limitations:"Exact 900x900 pixels; bounded sinusoidal family; no arbitrary deformation or error-free guarantees",
      report
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="CFD-nonlinear-receipt.json";a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section id="nonlinear-pocket" className="nonlinear-lab" aria-labelledby="nonlinear-title">
    <header className="nonlinear-head">
      <div>
        <div className="eyebrow">07 / INDEPENDENT PIXEL DECODER · CFD 0.6</div>
        <h2 id="nonlinear-title">Nonlinear Pocket <em>Recovery.</em></h2>
        <p>Twelve colored anchors measure a bending square. The reader estimates the sine-wave distortion from pixels alone, then tries to recover an actual kilobyte.</p>
      </div>
      <span className="nonlinear-chip">PIXEL-ONLY · BOUNDED WARP FAMILY</span>
    </header>
    <div className="nonlinear-layout">
      <div className="nonlinear-stage">
        <div className="nonlinear-bar"><span>WARPED PIXEL FIELD · 900 × 900</span><span>12 REGISTERED ANCHORS</span></div>
        <canvas ref={canvasRef} className="nonlinear-canvas" role="img"
          aria-label="Encoded raster field deformed by two-dimensional nonlinear sinusoidal displacement, surrounded by twelve colored registration circles." />
        <div className="nonlinear-bar"><span>NONUNIFORM FIELD DEFORMATION</span><span>{imported?"IMPORTED PNG":"GENERATED LOCALLY"}</span></div>
        <p>The markers sit outside the encoded data area. A 10-coefficient model is fitted from detected marker centroids, not supplied slider values.</p>
      </div>
      <div className="nonlinear-controls">
        <label htmlFor="nonlinear-text">UTF-8 MESSAGE · MAX 1,024 BYTES</label>
        <textarea id="nonlinear-text" rows={2} maxLength={1800}
          value={text} onChange={event=>setText(event.target.value)}/>
        <div className="nonlinear-actions">
          <button type="button" onClick={encode}>ENCODE TEXT</button>
          <button type="button" onClick={encodeSample}>ENCODE 1 KiB</button>
        </div>
        <div className="nonlinear-rule"/>
        <Slider label="ROTATION" value={angle} min={-12} max={12} step={1} unit="°"
          onChange={v=>update(setAngle,v)}/>
        <Slider label="AFFINE SHEAR" value={shear} min={-0.12} max={0.12} step={0.01} unit=""
          onChange={v=>update(setShear,v)}/>
        <Slider label="SCALE" value={scale} min={0.88} max={1} step={0.01} unit="×"
          onChange={v=>update(setScale,v)}/>
        <Slider label="HORIZONTAL SINE FLOW" value={horizontal} min={-22} max={22} step={1} unit=" px"
          onChange={v=>update(setHorizontal,v)}/>
        <Slider label="VERTICAL SINE FLOW" value={vertical} min={-22} max={22} step={1} unit=" px"
          onChange={v=>update(setVertical,v)}/>
        <Slider label="CROSS-WAVE PULL" value={cross} min={-22} max={22} step={1} unit=" px"
          onChange={v=>update(setCross,v)}/>
        <Slider label="CORNER TWIST" value={twist} min={-22} max={22} step={1} unit=" px"
          onChange={v=>update(setTwist,v)}/>
        <button type="button" className="nonlinear-verify" onClick={readPixels}>
          LOCATE ANCHORS + RECOVER BYTES
        </button>
        <div className="nonlinear-actions">
          <button type="button" onClick={savePng}>↓ SAVE PNG</button>
          <label className="nonlinear-upload" htmlFor="nonlinear-file">↑ LOAD PNG</label>
          <input id="nonlinear-file" type="file" accept="image/png" onChange={readPng}/>
        </div>
        {report && <div className="nonlinear-report" aria-live="polite">
          <strong className={report.passed?"nonlinear-pass":"nonlinear-fail"}>
            {report.passed?"PASS · EXACT NONLINEAR PIXEL RECOVERY":"FAIL · "+report.reason}
          </strong>
          <span>{report.length??"?"} BYTES · HASH {report.checksum??"UNAVAILABLE"}</span>
          <span>ANCHORS {report.markerCount??"?"} · MAX FIT ERROR {report.markerResidual?.toFixed(3)??"?"} px</span>
          <small>{report.method??"NO MODEL FIT"} · {report.source}</small>
        </div>}
        {error && <p role="alert" className="nonlinear-error">{error}</p>}
        <button className="nonlinear-export" type="button" onClick={receipt} disabled={!report}>↓ SAVE REPRODUCIBLE RECEIPT</button>
      </div>
    </div>
    <p className="nonlinear-boundary">Research boundary: true spatially varying nonlinear warps, but only a declared low-dimensional sinusoidal family with intact colored anchors and exact image size. An independently detected pattern is not evidence of a physical 4D/6D field, unlimited information storage, or a universal elastic decoder.</p>
  </section>;
}
