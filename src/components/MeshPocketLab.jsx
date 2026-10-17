import { useEffect, useMemo, useRef, useState } from "react";
import {
  MESH_OUTPUT_SIZE, makeMeshCarrier, warpMeshCarrier, decodeMeshImage
} from "../lib/meshPocket.mjs";
import { checksum32 } from "../lib/pocketField.mjs";

const encoder=new TextEncoder();
const DEFAULT_MESSAGE="Build outward. Circle back. Decode the pocket.";
function syntheticKilobyte(){
  const bytes=new Uint8Array(1024);
  let seed=0x369cfd;
  for(let i=0;i<bytes.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    bytes[i]=seed>>>24;
  }
  return bytes;
}
function MeshSlider({id,label,value,min,max,step,unit,change}){
  return <label className="mesh-slider" htmlFor={id}>
    <span>{label}<strong>{value}{unit}</strong></span>
    <input type="range" id={id} min={min} max={max} step={step} value={value}
      onChange={event=>change(Number(event.target.value))}/>
  </label>;
}
export default function MeshPocketLab(){
  const canvasRef=useRef(null);
  const [message,setMessage]=useState(DEFAULT_MESSAGE);
  const [bytes,setBytes]=useState(()=>encoder.encode(DEFAULT_MESSAGE));
  const [strength,setStrength]=useState(20);
  const [angle,setAngle]=useState(5);
  const [scale,setScale]=useState(0.95);
  const [phase,setPhase]=useState(1);
  const [imported,setImported]=useState(null);
  const [report,setReport]=useState(null);
  const [error,setError]=useState("");
  const [origin,setOrigin]=useState("SIMULATED_LOCAL");
  const settings={strength,angle,scale,phase};
  const generated=useMemo(()=>warpMeshCarrier(makeMeshCarrier(bytes),settings),
    [bytes,strength,angle,scale,phase]);
  const image=imported??generated;

  useEffect(()=>{
    const canvas=canvasRef.current;
    const ctx=canvas?.getContext("2d",{willReadFrequently:true});
    if(!ctx)return;
    canvas.width=MESH_OUTPUT_SIZE;canvas.height=MESH_OUTPUT_SIZE;
    ctx.putImageData(new ImageData(image.data,MESH_OUTPUT_SIZE,MESH_OUTPUT_SIZE),0,0);
  },[image]);

  function change(setter,next){
    setter(next);setImported(null);setReport(null);setError("");
    setOrigin("SIMULATED_MESH");
  }
  function changeMessage(){
    const payload=encoder.encode(message);
    if(payload.length>1024){setError("UTF-8 payload is over 1,024 bytes.");return;}
    setBytes(payload);setImported(null);setReport(null);setError("");
    setOrigin("USER_AUTHORED_LOCAL");
  }
  function sample(){
    setBytes(syntheticKilobyte());setImported(null);setReport(null);setError("");
    setOrigin("SIMULATED_1_KIB");
  }
  function canvasFrame(){
    const ctx=canvasRef.current?.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw new Error("Canvas pixel readback unavailable");
    return ctx.getImageData(0,0,MESH_OUTPUT_SIZE,MESH_OUTPUT_SIZE);
  }
  function read(){
    try{
      const decoded=decodeMeshImage(canvasFrame());
      setReport({
        passed:decoded.passed,reason:decoded.reason,
        length:decoded.length??null,checksum:decoded.checksum??null,
        markerCount:decoded.markerCount??null,
        minCellArea:decoded.minCellArea??null,maxCellArea:decoded.maxCellArea??null,
        disagreements:decoded.disagreements??null,
        provenance:origin.startsWith("USER")?"USER_SUPPLIED":"SIMULATED",
        source:origin,method:decoded.method??null,at:new Date().toISOString()
      });
      setError("");
    }catch(err){setReport(null);setError(err.message);}
  }
  function damage(type){
    try{
      const copy=canvasFrame(),data=copy.data;
      if(type==="marker"){
        for(let i=0;i<data.length;i+=4){
          if(data[i]===90&&data[i+1]===90&&data[i+2]===90){
            data[i]=6;data[i+1]=12;data[i+2]=24;
          }
        }
      }else{
        for(let i=0;i<data.length;i+=4){
          const r=data[i],g=data[i+1],b=data[i+2];
          if(r===136&&g===241&&b===219){
            data[i]=18;data[i+1]=28;data[i+2]=47;
          }else if(r===18&&g===28&&b===47){
            data[i]=136;data[i+1]=241;data[i+2]=219;
          }
        }
      }
      setImported({width:MESH_OUTPUT_SIZE,height:MESH_OUTPUT_SIZE,
        data:new Uint8ClampedArray(data)});
      setOrigin(type==="marker"?"SIMULATED_DAMAGED_MARKER":"SIMULATED_DAMAGED_PAYLOAD");
      setReport(null);setError("");
    }catch(err){setError(err.message);}
  }
  function savePng(){
    const canvas=canvasRef.current;if(!canvas)return;
    const a=document.createElement("a");
    a.href=canvas.toDataURL("image/png");a.download="CFD-mesh-pocket-900px.png";a.click();
  }
  async function openPng(event){
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    if(file.type!=="image/png"){setError("Please choose a PNG image.");return;}
    try{
      const bitmap=await createImageBitmap(file);
      try{
        if(bitmap.width!==MESH_OUTPUT_SIZE||bitmap.height!==MESH_OUTPUT_SIZE)
          throw new Error("PNG must be exactly 900 × 900 pixels.");
        const scratch=document.createElement("canvas");
        scratch.width=MESH_OUTPUT_SIZE;scratch.height=MESH_OUTPUT_SIZE;
        const ctx=scratch.getContext("2d",{willReadFrequently:true});
        if(!ctx)throw new Error("Cannot read image pixels");
        ctx.drawImage(bitmap,0,0);
        const pixels=ctx.getImageData(0,0,MESH_OUTPUT_SIZE,MESH_OUTPUT_SIZE);
        setImported({width:pixels.width,height:pixels.height,data:pixels.data});
        setOrigin("USER_UPLOADED_UNVERIFIED");
        setReport(null);setError("");
      }finally{bitmap.close?.();}
    }catch(err){setError(err.message);}
  }
  function saveReceipt(){
    if(!report)return;
    const receipt={
      experiment:"CFD v0.7 Elastic Mesh Pixel Reader",
      schema:1,decoderInput:"RGBA pixels only, 25 uniquely colored known fiducials",
      interpolation:"5x5 detected nodes, piecewise bilinear inverse-image reconstruction",
      inputSource:origin,frameSize:MESH_OUTPUT_SIZE,
      generatorControls:imported?null:settings,
      generatorPayloadChecksum:imported?null:checksum32(bytes),
      limitations:"Exact 900x900 PNG; bounded warp with no folds; no perspective, arbitrary topology, infinite storage or cryptographic authenticity",
      report
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="CFD-mesh-receipt.json";a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section id="mesh-pocket" className="mesh-lab" aria-labelledby="mesh-title">
    <header className="mesh-head">
      <div>
        <div className="eyebrow">08 / REGISTRATION MESH · CFD 0.7</div>
        <h2 id="mesh-title">Elastic Mesh <em>Recovery.</em></h2>
        <p>Twenty-five optical anchor points turn the square into sixteen independently deformable regions. Can the decoder reconstruct the data from their new pixel positions?</p>
      </div>
      <span className="mesh-chip">25 MARKERS / 16 CELLS / 1 KiB</span>
    </header>
    <div className="mesh-layout">
      <div className="mesh-stage">
        <div className="mesh-bar"><span>900 × 900 RGBA · PIXEL FIELD</span><span>PIECEWISE BILINEAR</span></div>
        <canvas ref={canvasRef} role="img" className="mesh-canvas"
          aria-label="Sixteen pixel-data tiles flexibly distorted within a 5 by 5 colored calibration mesh."/>
        <div className="mesh-bar"><span>25 IDENTIFIABLE FIDUCIALS</span><span>{imported?"IMPORTED OR ALTERED":"LOCAL RENDER"}</span></div>
        <p>Every tile is separated by a gutter so reference markers don't overwrite message bytes. The optical reader never receives the distortion sliders or original byte array.</p>
      </div>
      <div className="mesh-controls">
        <label htmlFor="mesh-message">ENCODE MESSAGE · MAXIMUM 1,024 UTF-8 BYTES</label>
        <textarea id="mesh-message" rows={2} maxLength={1800}
          value={message} onChange={event=>setMessage(event.target.value)} />
        <div className="mesh-actions">
          <button type="button" onClick={changeMessage}>ENCODE TEXT</button>
          <button type="button" onClick={sample}>ENCODE 1 KiB</button>
        </div>
        <div className="mesh-rule"/>
        <MeshSlider id="mesh-strength" label="ELASTIC CELL PULL" value={strength} min={0} max={28} step={1}
          unit=" px" change={v=>change(setStrength,v)}/>
        <MeshSlider id="mesh-angle" label="GLOBAL ROTATION" value={angle} min={-9} max={9} step={1}
          unit="°" change={v=>change(setAngle,v)}/>
        <MeshSlider id="mesh-scale" label="GLOBAL SCALE" value={scale} min={0.88} max={1} step={0.01}
          unit="×" change={v=>change(setScale,v)}/>
        <MeshSlider id="mesh-phase" label="MESH PHASE" value={phase} min={-3.14} max={3.14} step={0.1}
          unit="" change={v=>change(setPhase,v)}/>
        <button type="button" className="mesh-verify" onClick={read}>CALIBRATE MESH + DECODE PIXELS</button>
        <div className="mesh-rule"/>
        <div className="mesh-actions">
          <button type="button" onClick={()=>damage("marker")}>BREAK MARKER</button>
          <button type="button" onClick={()=>damage("payload")}>SCRAMBLE DATA</button>
        </div>
        <div className="mesh-actions">
          <button type="button" onClick={savePng}>↓ SAVE PNG</button>
          <label htmlFor="mesh-file" className="mesh-upload">↑ LOAD PNG</label>
          <input id="mesh-file" type="file" accept="image/png" onChange={openPng}/>
        </div>
        {report && <div className="mesh-report" aria-live="polite">
          <strong className={report.passed?"mesh-pass":"mesh-fail"}>
            {report.passed?"PASS · EXACT MESH PIXEL RECOVERY":"FAIL · "+report.reason}
          </strong>
          <span>{report.length??"?"} BYTES · HASH {report.checksum??"UNAVAILABLE"}</span>
          <span>{report.markerCount??"?"} MARKERS · MIN CELL AREA {report.minCellArea?.toFixed(0)??"?"} PX²</span>
          <small>{report.method??"NO MESH ESTIMATE"} · {report.source}</small>
        </div>}
        {error && <p className="mesh-error" role="alert">{error}</p>}
        <button className="mesh-export" type="button" disabled={!report} onClick={saveReceipt}>↓ EXPORT EXPERIMENT RECEIPT</button>
      </div>
    </div>
    <p className="mesh-limits">Research boundary: this fits a piecewise-bilinear mesh from 25 distinct fiducials. It tolerates bounded, smooth-looking local displacement without requiring a global sine-wave model, but not folds, large occlusions, arbitrary transformations or unbounded capacity. A successful byte checksum is evidence for this pixel code, not physical higher-dimensional storage.</p>
  </section>;
}
