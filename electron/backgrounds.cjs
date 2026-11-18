/** Built-in vector decorations: offline, deterministic, no external assets. */
const BACKGROUND_PRESETS=[
 {id:'plain',name:'Plain ivory'},
 {id:'rose',name:'Rose corners'},
 {id:'leaves',name:'Botanical corners'},
 {id:'gold',name:'Gold flourishes'}
];
function backgroundFor(sheet){
 const b=sheet?.background||{};
 return {preset:BACKGROUND_PRESETS.some(p=>p.id===b.preset)?b.preset:'plain',
 opacity:Number.isFinite(Number(b.opacity))?Math.max(0,Math.min(1,Number(b.opacity))):.25};
}
function backgroundSvg(sheet,width,height){
 const {preset,opacity}=backgroundFor(sheet);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>30000||height>30000)throw Error('Invalid background dimensions');
 const fill=preset==='plain'?'#fffdf9':'#fffaf6';
 if(preset==='plain'||opacity===0)return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 400"><rect width="1000" height="400" fill="${fill}"/></svg>`;
 const ink=preset==='rose'?'#bd7184':preset==='leaves'?'#60846b':'#bd9955';
 const blossom=preset==='rose'?'#edc3ca':preset==='leaves'?'#b3c6a9':'#e6d3a4';
 const corner=`<g stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round">
 <path d="M 0 160 Q 90 135 110 35 Q 125 10 175 0"/>
 <path d="M 20 130 Q 60 110 54 62 M 70 100 Q 115 105 132 60"/>
 <ellipse cx="53" cy="62" rx="11" ry="25" transform="rotate(-22 53 62)" fill="${blossom}" stroke="none"/>
 <ellipse cx="132" cy="60" rx="11" ry="25" transform="rotate(38 132 60)" fill="${blossom}" stroke="none"/>
 <circle cx="108" cy="36" r="19" fill="${blossom}" stroke="none"/>
 <circle cx="108" cy="36" r="5" fill="${ink}" stroke="none"/>
 </g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1000 400" preserveAspectRatio="none"><rect width="1000" height="400" fill="${fill}"/><g opacity="${opacity}">${corner}<g transform="translate(1000 0) scale(-1 1)">${corner}</g><g transform="translate(0 400) scale(1 -1)">${corner}</g><g transform="translate(1000 400) scale(-1 -1)">${corner}</g></g></svg>`;
}

module.exports={BACKGROUND_PRESETS,backgroundFor,backgroundSvg};
