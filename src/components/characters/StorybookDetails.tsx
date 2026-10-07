import React from 'react';
import type {CharacterRecipe} from './recipe';
import type {Pose} from './pose';

/** Individual head silhouettes transcribed from the supplied limb chart. */
export const STORYBOOK_HEADS: Record<string,string> = {
  bear: 'M126 228C126 153 173 121 250 123C327 121 374 153 374 228C393 301 343 347 250 348C157 347 107 301 126 228Z',
  bunny: 'M126 245C121 172 172 130 250 131C328 130 379 172 374 245C384 313 327 353 250 351C173 353 116 313 126 245Z',
  fox: 'M144 181Q184 133 250 138Q316 133 356 181L368 239L398 264L375 273L387 288Q340 291 318 327Q250 363 182 327Q160 291 113 288L125 273L102 264L132 239Z',
  cat: 'M126 238C121 164 174 130 250 132C326 130 379 164 374 238C390 307 331 351 250 350C169 351 110 307 126 238Z',
  dog: 'M127 229C128 158 177 126 250 130C323 126 372 158 373 229C387 307 331 351 250 350C169 351 113 307 127 229Z',
  elephant: 'M134 210C125 143 179 116 250 120C321 116 375 143 366 210L361 268Q345 345 250 344Q155 345 139 268Z',
  cow: 'M142 217C132 151 180 115 250 119C320 115 368 151 358 217L354 267Q367 350 250 351Q133 350 146 267Z',
  pig: 'M126 226C123 161 178 125 250 128C322 125 377 161 374 226C389 309 330 353 250 351C170 353 111 309 126 226Z',
  hippo: 'M142 226C132 159 177 128 250 130C323 128 368 159 358 226Q395 251 382 302Q365 351 250 352Q135 351 118 302Q105 251 142 226Z',
  panda: 'M124 228C123 159 177 124 250 127C323 124 377 159 376 228C388 308 330 353 250 353C170 353 112 308 124 228Z',
  koala: 'M136 226C124 157 178 126 250 129C322 126 376 157 364 226C376 307 330 350 250 351C170 350 124 307 136 226Z',
  mouse: 'M128 236C123 171 180 134 250 136C320 134 377 171 372 236Q388 346 250 352Q112 346 128 236Z',
  monkey: 'M133 224C127 156 181 125 250 130C319 125 373 156 367 224C384 299 330 352 250 349C170 352 116 299 133 224Z',
  raccoon: 'M149 184Q188 138 250 140Q312 138 351 184L382 254L366 268L380 281Q346 343 250 350Q154 343 120 281L134 268L118 254Z',
  hedgehog: 'M164 228C155 178 200 150 250 153C300 150 345 178 336 228Q348 319 250 353Q152 319 164 228Z',
  sheep: 'M129 224C122 162 183 133 250 136C317 133 378 162 371 224Q387 346 250 352Q113 346 129 224Z',
  squirrel: 'M144 226C133 166 184 134 250 136C316 134 367 166 356 226Q381 272 351 308Q315 344 250 351Q185 344 149 308Q119 272 144 226Z',
  lion: 'M137 225C131 158 180 127 250 130C320 127 369 158 363 225C381 301 330 351 250 352C170 351 119 301 137 225Z',
  tiger: 'M123 226C119 155 175 125 250 128C325 125 381 155 377 226C392 307 332 353 250 352C168 353 108 307 123 226Z',
  zebra: 'M160 168Q187 132 250 134Q313 132 340 168L353 253Q379 338 250 351Q121 338 147 253Z',
  owl: 'M137 158Q182 126 250 140Q318 126 363 158Q397 246 356 321Q312 366 250 350Q188 366 144 321Q103 246 137 158Z',
  bird: 'M140 237C137 162 187 124 250 125C313 124 363 162 360 237Q370 329 250 350Q130 329 140 237Z',
  chick: 'M140 244C132 171 181 134 250 137C319 134 368 171 360 244Q370 328 250 350Q130 328 140 244Z',
  penguin: 'M138 238C134 169 184 135 250 136C316 135 366 169 362 238Q372 330 250 351Q128 330 138 238Z',
};

type Layer = 'back' | 'ears' | 'body' | 'face' | 'features' | 'clothes' | 'hat';
interface DetailAccessory {
  kind: string;
  color?: string;
  [key: string]: string | number | boolean | undefined;
}
interface DetailProps {
  recipe: CharacterRecipe; pose: Pose; layer: Layer;
  fill: (name: string) => string; turn?: number;
}

const ruff=(cx:number,cy:number,rx:number,ry:number,count:number,depth:number)=>{
  const at=(i:number,outer:boolean)=>{const a=i*Math.PI*2/count-Math.PI/2;return `${cx+Math.cos(a)*(rx+(outer?depth:0))} ${cy+Math.sin(a)*(ry+(outer?depth:0))}`;};
  return `M${at(0,false)}`+Array.from({length:count},(_,i)=>`Q${at(i+.5,true)} ${at(i+1,false)}`).join('')+'Z';
};

export const StorybookDetails: React.FC<DetailProps> = ({recipe: r, pose, layer, fill, turn = 0}) => {
  const uid=`species-detail-${React.useId().replace(/:/g,'')}`;
  const k = r.name, c = r.colors;
  const dark = c.accent ?? c.dark ?? '#795c50';
  const lag = pose.secondary?.ears ?? 0;
  const angle=Math.abs(turn),faceScale=1-angle*.2;
  // Undo the surrounding muzzle projection before locating an eye attachment.
  const eyeX=(side:number)=>250+side*55*(1-angle*.45)/faceScale;
  const eyeScale=(side:number)=>(1-angle*(side*turn>0?.45:.08))/faceScale;
  const eyeOpacity=(side:number)=>side*turn>0?1-Math.max(0,Math.min(1,(angle-.42)/.48)):1;
  const stripedTail=(shape:string,stripes:React.ReactNode)=> <>
    <defs><clipPath id={`${uid}-tail`}><path d={shape}/></clipPath></defs>
    <path d={shape} fill={fill('body')}/>
    <g clipPath={`url(#${uid}-tail)`}>{stripes}</g>
  </>;
  if (layer === 'back') {
    switch (k) {
      case 'bear': return <circle cx="365" cy="468" r="25" fill={fill('body')}/>;
      case 'bunny': return <g transform={`rotate(${pose.tail*.3} 322 476)`}><circle cx="337" cy="481" r="32" fill={fill('belly')}/><path d="M326 468q10 -9 21 0" fill="none" strokeWidth="2"/></g>;
      case 'fox': return <g transform={`rotate(${pose.tail*.45} 172 454)`}><path d="M180 492C65 500 37 397 61 284Q123 320 144 393Q171 435 204 429Z" fill={fill('body')}/><path d="M63 288Q97 308 123 349L115 380L94 361L77 389Q54 345 63 288Z" fill={fill('belly')} stroke="none"/></g>;
      case 'bird': case 'chick': case 'duck': return <path transform={`rotate(${pose.tail*.6} 350 458)`} d="M337 454Q395 445 399 420L392 475Q366 493 337 478Z" fill={fill('body')}/>;
      case 'zebra': return <g transform={`rotate(${pose.tail*.6} 337 450)`}><path d="M337 450Q385 474 383 417" fill="none" stroke={c.body} strokeWidth="14"/><path d="M376 417q-4 -24 11 -28q15 15 2 36Z" fill={fill('accent')}/></g>;
      case 'cat': return <g transform={`rotate(${pose.tail*.6} 340 462)`}>
        {stripedTail('M339 456C402 477 421 429 398 391Q381 366 393 331Q404 316 416 331Q420 339 411 356Q408 370 423 395C457 461 408 508 339 488Z',<path d="M378 483l6 -38M433 451l-41 -15M433 410l-43 8M420 377l-35 9" fill="none" stroke={dark} strokeWidth="12"/>)}
      </g>;
      case 'dog': return <path transform={`rotate(${pose.tail} 348 464)`} d="M337 477Q406 487 416 412Q402 397 391 425Q378 448 340 445Z" fill={fill('body')}/>;
      case 'elephant': return <g transform={`rotate(${pose.tail*.5} 351 451)`}><path d="M352 450Q411 469 400 511" fill="none" stroke={c.body} strokeWidth="13"/><path d="M393 499Q412 499 410 521Q393 531 388 516Z" fill={fill('accent')}/></g>;
      case 'cow': return <g transform={`rotate(${pose.tail*.7} 352 435)`}><path d="M351 432Q417 439 397 496" fill="none" stroke={c.body} strokeWidth="14"/><path d="M387 484Q414 487 408 514L393 523L382 510Z" fill={fill('accent')}/></g>;
      case 'pig': return <path transform={`rotate(${pose.tail} 345 458)`} d="M345 462C408 490 414 434 386 436C357 439 377 473 395 454" fill="none" stroke={c.body} strokeWidth="16"/>;
      case 'hippo': return <path transform={`rotate(${pose.tail} 350 466)`} d="M345 454Q394 445 391 478Q372 492 347 475Z" fill={fill('body')}/>;
      case 'panda': return <circle cx="365" cy="467" r="26" fill={fill('body')}/>;
      case 'mouse': return <g transform={`rotate(${pose.tail*.7} 339 467)`}><path d="M338 470C421 483 398 405 395 376Q391 333 421 338Q443 340 433 359" fill="none" stroke="#93869e" strokeWidth="15"/><path d="M338 470C421 483 398 405 395 376Q391 333 421 338Q443 340 433 359" fill="none" stroke={c.body} strokeWidth="10"/></g>;
      case 'monkey': return <g transform={`rotate(${pose.tail*.65} 347 458)`}><path d="M344 463C446 503 477 389 426 367C380 345 374 415 412 414Q434 412 420 394" fill="none" stroke={c.body} strokeWidth="24"/><path d="M357 465Q405 481 426 453" fill="none" stroke={c.belly} strokeWidth="5" opacity=".55"/></g>;
      case 'raccoon': return <g transform={`rotate(${pose.tail*.6} 315 452)`}>{stripedTail('M288 478Q444 492 439 363Q423 335 397 357Q415 416 294 421Z',<path d="M390 376l59 -10l2 21l-59 11M372 420l76 -9l-5 24l-85 11M285 448l142 11l-21 20l-124 -7" fill={fill('accent')} stroke="none"/>)}</g>;
      case 'hedgehog': return <g fill={fill('accent')}>
        <path d={ruff(250,326,147,209,36,36)}/>
        <g fill="none" stroke="#d3b394" strokeWidth="3" opacity=".65">{[0,1,2,3,4,5,6,7].map(i=><path key={i} d={`M${106+i*5} ${239+i*34}q10 -5 22 -24M${394-i*5} ${239+i*34}q-10 -5 -22 -24`}/>)}</g>
      </g>;
      case 'sheep': return <g><circle cx="365" cy="465" r="29" fill={fill('belly')}/><circle cx="385" cy="463" r="16" fill={fill('belly')}/></g>;
      case 'squirrel': return <g transform={`rotate(${pose.tail*.45} 329 472)`}><path d="M313 506C442 531 473 388 457 257Q479 236 472 200C458 131 369 140 344 199C317 261 376 320 380 386Q379 454 313 450Z" fill={fill('body')}/><path d="M349 478Q412 414 400 318Q381 252 414 229" fill="none" stroke={c.accent} strokeWidth="5" opacity=".5"/></g>;
      case 'lion': return <g transform={`rotate(${pose.tail*.5} 350 461)`}><path d="M343 465Q423 505 429 427" fill="none" stroke={c.body} strokeWidth="16"/><path d="M416 430Q403 407 431 390Q456 417 437 439Z" fill={fill('accent')}/></g>;
      case 'tiger': return <g transform={`rotate(${pose.tail*.55} 343 466)`}>{stripedTail('M338 452Q422 486 414 405Q416 388 432 393Q448 410 438 449Q425 504 340 485Z',<path d="M365 496l7 -53M400 492l-2 -52M450 451l-57 -14M450 421l-57 -7" fill="none" stroke={dark} strokeWidth="11"/>)}</g>;
      default: return null;
    }
  }
  if (layer === 'ears') {
    const pair = (x: number, y: number, rx: number, ry: number, color = fill('body'), inner = fill('inner')) =>
      [-1,1].map(side=><g key={side} opacity={side*turn>0?1-angle*.4:1} transform={`translate(${250+side*x} ${y}) scale(${side*turn>0?1-angle*.4:1} 1) translate(${-250-side*x} ${-y}) rotate(${side*lag*.65} ${250+side*x} ${y})`}>
        <ellipse cx={250+side*x} cy={y} rx={rx} ry={ry} fill={color}/>
        <ellipse cx={250+side*x} cy={y+3} rx={rx*.62} ry={ry*.62} fill={inner} stroke="none"/>
        <path d={`M${250+side*x-rx*.62} ${y-ry*.25}q4 ${-ry*.45} ${rx*.6} ${-ry*.38}`} fill="none" stroke="#fff8e8" strokeWidth="4" opacity=".45"/>
      </g>);
    switch (k) {
      case 'bear': return <>{pair(100,139,45,43,fill('body'),fill('inner'))}</>;
      case 'bunny': return <>{[-1,1].map(s=><g key={s} transform={`rotate(${s*(8+lag*.5)} ${250+s*72} 160)`}><ellipse cx={250+s*72} cy="73" rx="31" ry="110" fill={fill('body')}/><ellipse cx={250+s*72} cy="66" rx="17" ry="82" fill={fill('inner')} stroke="none"/></g>)}</>;
      case 'fox': return <>{[-1,1].map(s=><g key={s} transform={`translate(250 0) scale(${s} 1) rotate(${lag*.4} 92 177)`}><path d="M58 164Q63 104 103 61Q135 118 126 194Z" fill={fill('body')}/><path d="M78 157Q80 121 104 91Q120 133 110 171Z" fill={fill('inner')} stroke="none"/></g>)}</>;
      case 'owl': return <path d="M143 176Q113 141 126 112Q172 145 202 142M298 142Q328 145 374 112Q387 141 357 176" fill={fill('body')}/>;
      case 'zebra': return <>{[-1,1].map(s=><g key={s} transform={`rotate(${s*lag*.4} ${250+s*77} 152)`}><path d={`M${250+s*51} 159Q${250+s*35} 91 ${250+s*88} 73Q${250+s*126} 118 ${250+s*91} 173Z`} fill={fill('body')}/><path d={`M${250+s*68} 147Q${250+s*58} 107 ${250+s*86} 94Q${250+s*105} 124 ${250+s*84} 151Z`} fill={fill('inner')} stroke="none"/></g>)}<path d="M219 144Q195 116 221 108Q215 77 242 83Q254 55 270 87Q298 78 289 108Q319 124 280 151Z" fill={fill('accent')}/></>;
      case 'cat': return <g>{[-1,1].map(s=><g key={s} transform={`translate(250 0) scale(${s} 1) rotate(${lag*.5} 84 164)`}><path d="M63 159Q82 88 123 76Q145 122 120 193Z" fill={fill('body')}/><path d="M82 151L118 99Q128 132 111 166Z" fill={fill('inner')} stroke="none"/></g>)}</g>;
      case 'dog': return <>{[-1,1].map(s=><g key={s} transform={`rotate(${s*lag} ${250+s*109} 170)`}><path d={s<0?'M151 147Q98 125 87 191Q69 273 118 292Q157 273 145 219Q145 180 169 167Z':'M349 147Q402 125 413 191Q431 273 382 292Q343 273 355 219Q355 180 331 167Z'} fill={fill('accent')}/></g>)}</>;
      case 'elephant': return <>{pair(132,218,76,99)}<path d="M72 202q-13 36 11 66M428 202q13 36 -11 66" fill="none" stroke="#fff4e4" strokeWidth="5" opacity=".5"/></>;
      case 'cow': return <>{pair(129,190,51,26)}<path d="M174 151Q144 134 157 100Q162 124 193 131M326 151Q356 134 343 100Q338 124 307 131" fill="#ead4b2"/></>;
      case 'pig': return null; // Floppy ears overlap the head and are drawn with the features.
      case 'hippo': return <>{pair(106,145,28,34)}</>;
      case 'panda': return <>{pair(106,141,45,43,fill('accent'),fill('paws'))}</>;
      case 'koala': return <>{[-1,1].map(s=><g key={s} transform={`rotate(${s*lag*.65} ${250+s*125} 176)`}><path d={ruff(250+s*125,176,61,66,21,12)} fill={fill('body')}/><ellipse cx={250+s*125} cy="179" rx="38" ry="43" fill={fill('inner')} stroke="none"/></g>)}</>;
      case 'mouse': return <>{pair(105,154,62,66,fill('body'),fill('accent'))}</>;
      case 'monkey': return <>{pair(122,218,44,50,fill('body'),fill('belly'))}</>;
      // Bury the whole ear root behind the skull; the pivot stays inside it.
      case 'raccoon': return <>{[-1,1].map(s=><g key={s} transform={`translate(250 0) scale(${s} 1) rotate(${lag*.35} 85 197)`}><path d="M42 197Q33 127 113 89Q128 85 131 104Q144 160 110 218Z" fill={fill('body')}/><path d="M62 182Q57 132 114 111Q126 157 99 203Z" fill={fill('accent')} stroke="none"/></g>)}</>;
      case 'hedgehog': return <>{pair(89,194,25,29)}</>;
      case 'sheep': return <>{pair(139,220,53,28,fill('body'),fill('inner'))}</>;
      case 'squirrel': return <>{[-1,1].map(s=><g key={s} transform={`translate(250 0) scale(${s} 1) rotate(${lag*.3} 78 192)`}><path d="M37 191Q28 99 93 61Q123 97 112 200L91 220Z" fill={fill('body')}/><path d="M56 195Q46 120 87 88Q108 132 100 207Z" fill={fill('inner')} stroke="none"/></g>)}</>;
      case 'lion': return <><path transform="translate(250 237) scale(1.24 1.1) translate(-250 -237)" d="M250 91Q218 72 191 96L209 105Q158 100 136 135L155 138Q112 160 108 198L126 191Q101 236 116 269L134 258Q121 302 158 329L161 312Q182 359 216 363L250 389L284 363Q318 359 339 312L342 329Q379 302 366 258L384 269Q399 236 374 191L392 198Q388 160 345 138L364 135Q342 100 291 105L309 96Q282 72 250 91Z" fill={fill('accent')}/>{pair(100,167,30,34)}<path d="M118 219l13 18M133 308l21 -7M181 354l9 -23M365 302l-17 -6M378 219l-12 18" fill="none" stroke="#efc87e" strokeWidth="5" opacity=".5"/></>;
      case 'tiger': return <>{pair(107,145,38,39)}</>;
      default: return null;
    }
  }
  if (layer === 'body') {
    switch (k) {
      case 'owl': return <g fill="none" stroke={c.accent} strokeWidth="4" opacity=".65">{[385,417,449,481].map(y=><path key={y} d={`M202 ${y}q10 14 20 0m16 0q10 14 20 0m16 0q10 14 20 0`}/>)}</g>;
      case 'zebra': return <g fill={fill('accent')} stroke="none"><path d="M157 366l54 30l-65 -7M155 417l48 24l-53 -4M344 366l-55 30l65 -7M345 417l-48 24l53 -4M201 520l16 -25l-2 38M299 520l-16 -25l2 38"/></g>;
      case 'cow': return <g fill={fill('accent')} stroke="none"><path d="M140 369Q169 342 195 375L184 417Q136 430 140 369ZM318 442Q350 423 364 452L348 487Q310 490 318 442Z"/></g>;
      case 'panda': return <path d="M143 333Q250 381 357 333L368 385Q250 425 132 385Z" fill={fill('accent')} stroke="none"/>;
      case 'sheep': return <g fill={fill('belly')}><path d="M163 340Q172 314 195 329Q216 305 237 324Q258 310 278 326Q302 310 318 338Q345 323 354 352Q382 356 369 384Q389 407 367 427Q387 450 365 470Q371 499 343 503Q332 533 306 521Q285 548 258 529Q233 548 209 529Q179 545 167 517Q137 520 135 492Q111 478 128 451Q109 429 128 409Q109 386 132 368Q137 340 163 340Z"/><path d="M161 385q13 -17 27 0m55 -16q14 -18 28 0m38 48q13 -15 26 0m-144 45q14 -16 28 0m35 37q13 -15 26 0" fill="none" stroke="#d6c5ac" strokeWidth="3"/></g>;
      case 'cat': case 'tiger': return <g fill={fill('accent')} stroke="none"><path d="M139 382l48 21l-49 7M133 434l45 17l-40 10M361 382l-48 21l49 7M367 434l-45 17l40 10"/></g>;
      default: return null;
    }
  }
  if (layer === 'face') {
    switch (k) {
      case 'bear': return <ellipse cx="250" cy="299" rx="68" ry="45" fill={fill('belly')} stroke="none"/>;
      case 'bunny': return <ellipse cx="250" cy="303" rx="64" ry="35" fill={fill('belly')} stroke="none"/>;
      case 'fox': return <path d="M128 267Q166 285 209 251Q231 247 250 276Q269 247 291 251Q334 285 372 267Q352 326 300 336Q250 357 200 336Q148 326 128 267Z" fill={fill('belly')} stroke="none"/>;
      case 'owl': return <path d="M250 190C195 128 139 169 147 231Q146 296 198 306Q232 310 250 287Q268 310 302 306Q354 296 353 231C361 169 305 128 250 190Z" fill={fill('belly')} strokeWidth="3"/>;
      case 'zebra': return <ellipse cx="250" cy="310" rx="86" ry="43" fill={fill('accent')} strokeWidth="2.5"/>;
      case 'cat': case 'dog': case 'lion': case 'tiger': case 'squirrel': return <path d="M250 282Q215 263 195 287Q174 313 209 333Q231 345 250 330Q269 345 291 333Q326 313 305 287Q285 263 250 282Z" fill={fill('belly')} stroke="none"/>;
      case 'elephant': return <path d="M185 288Q208 271 224 290M283 290Q305 272 327 287" fill="none" stroke={c.belly} strokeWidth="5" opacity=".65"/>;
      case 'cow': return <><path d="M161 146Q196 123 225 149L218 194Q181 208 151 184Z" fill={fill('accent')} stroke="none"/><ellipse cx="250" cy="309" rx="87" ry="42" fill="#e9afc0" strokeWidth="2.5"/></>;
      case 'pig': return <ellipse cx="250" cy="292" rx="54" ry="36" fill="#dd829c" strokeWidth="2.5"/>;
      case 'hippo': return <path d="M156 270Q183 249 250 263Q317 249 344 270Q372 322 318 338Q250 355 182 338Q128 322 156 270Z" fill={fill('belly')} strokeWidth="2.5"/>;
      case 'panda': return <>{[-1,1].map(s=><ellipse key={s} cx={eyeX(s)} cy="239" rx={40*eyeScale(s)} ry="48" opacity={eyeOpacity(s)} transform={`rotate(${-s*21*(1-angle)} ${eyeX(s)} 239)`} fill={fill('accent')} stroke="none"/>)}<ellipse cx="250" cy="308" rx="57" ry="33" fill={fill('belly')} stroke="none"/></>;
      case 'koala': return <ellipse cx="250" cy="313" rx="58" ry="25" fill={fill('belly')} stroke="none"/>;
      case 'mouse': return <ellipse cx="250" cy="310" rx="54" ry="30" fill={fill('body')} stroke="none"/>;
      case 'monkey': return <path d="M250 187C179 116 136 197 166 258Q131 326 250 342Q369 326 334 258C364 197 321 116 250 187Z" fill={fill('belly')} stroke="none"/>;
      case 'raccoon': return <><path d="M125 244Q159 173 216 196L250 229L284 196Q341 173 375 244L354 289Q299 306 250 274Q201 306 146 289Z" fill={fill('belly')} stroke="none"/><path d="M137 244Q171 193 218 215L250 247L282 215Q329 193 363 244L343 275Q298 286 250 261Q202 286 157 275Z" fill={fill('accent')} stroke="none"/><path d="M137 282Q186 305 217 280Q250 268 283 280Q314 305 363 282Q332 343 250 350Q168 343 137 282Z" fill={fill('belly')} stroke="none"/></>;
      case 'hedgehog': return null;
      case 'sheep': return <g fill={fill('belly')}><path d="M157 182Q128 176 142 151Q127 129 151 115Q152 90 180 104Q199 82 221 102Q247 80 269 101Q296 85 310 109Q337 96 350 121Q378 128 363 152Q377 179 350 185Q331 200 311 182Q286 200 264 181Q241 199 220 182Q195 201 179 180Q168 197 157 182Z"/><path d="M180 135q12 -13 24 0m36 -11q12 -14 24 0m34 20q12 -14 24 0" fill="none" stroke="#d6c5ac" strokeWidth="3"/></g>;
      case 'penguin': return <path d="M250 200C186 126 136 186 150 254Q145 321 207 337Q250 355 293 337Q355 321 350 254C364 186 314 126 250 200Z" fill={fill('belly')} stroke="none"/>;
      default: return null;
    }
  }
  if (layer === 'features') {
    switch (k) {
      case 'duck': return <path transform={`rotate(${lag*.5} 250 143)`} d="M224 145Q204 122 218 104Q232 102 239 128Q236 92 250 88Q265 94 261 125Q279 101 287 113Q293 129 273 145Z" fill={fill('body')}/>;
      case 'zebra': return <><path d="M210 144l20 42l7 -47M256 140l-2 44l18 -42M161 269l37 12l-42 5M339 269l-37 12l42 5" fill={fill('accent')} stroke="none"/><ellipse cx="223" cy="302" rx="8" ry="6" fill="#46394b" stroke="none"/><ellipse cx="277" cy="302" rx="8" ry="6" fill="#46394b" stroke="none"/></>;
      case 'cat': case 'tiger': return <><path d={k==='tiger'?'M212 138Q250 126 288 138L283 148L259 144L259 156L279 158L276 168L259 166L255 187L246 187L243 166L226 168L222 158L243 156L242 144L217 149Z':'M211 138L220 181L233 139M246 137L250 172L261 138M276 139L277 172L290 142'} fill={fill('accent')} stroke="none"/><path d="M148 260l39 15l-36 7M352 260l-39 15l36 7" fill={fill('accent')} stroke="none"/><path d="M192 303l-43 -11m43 22l-47 1M308 303l43 -11m-43 22l47 1" fill="none" stroke={c.accent} strokeWidth="2.5" opacity=".65"/></>;
      case 'elephant': return <g transform={`rotate(${Math.max(-9,Math.min(9,pose.head.tilt+lag*.5))} 250 276)`}><path d="M228 275Q219 324 236 359Q254 390 286 367Q302 351 287 340Q271 333 269 351Q252 356 253 333L272 281Q252 263 228 275Z" fill={fill('body')} stroke="none"/><path d="M228 280Q219 324 236 359Q254 390 286 367Q302 351 287 340Q271 333 269 351Q252 356 253 333L270 287" fill="none"/><path d="M234 307l27 3m-24 14l23 2m-17 14l15 -2" fill="none" strokeWidth="2.5" opacity=".45"/><path d="M233 288q-4 28 3 41" fill="none" stroke="#f7ece6" strokeWidth="4" opacity=".5"/></g>;
      case 'cow': return <g fill="#a27680" stroke="none"><ellipse cx="220" cy="296" rx="8" ry="5"/><ellipse cx="280" cy="296" rx="8" ry="5"/></g>;
      case 'pig': return <>{[-1,1].map(s=><g key={s} transform={`translate(250 0) scale(${s} 1) rotate(${lag*.65} 100 149)`}><path d="M64 145Q63 111 92 119Q108 132 143 133Q154 151 130 184Q111 207 94 188Z" fill={fill('body')}/></g>)}<g fill="#87425e" stroke="none"><ellipse cx="230" cy="290" rx="7" ry="10"/><ellipse cx="270" cy="290" rx="7" ry="10"/><path d="M222 270Q250 260 278 270" fill="none" stroke="#f8bdcf" strokeWidth="4"/></g></>;
      case 'hippo': return <><g fill={c.accent} stroke="none"><ellipse cx="201" cy="284" rx="9" ry="5"/><ellipse cx="299" cy="284" rx="9" ry="5"/></g><path d="M187 329q10 22 23 7M290 336q13 15 23 -7" fill="#fff8e9" strokeWidth="2"/></>;
      case 'koala': return <><ellipse cx="250" cy="283" rx="29" ry="39" fill={fill('accent')} strokeWidth="2"/><path d="M235 262q12 -9 22 -2" fill="none" stroke="#e6d7d0" strokeWidth="4" opacity=".6"/></>;
      case 'monkey': return <path d="M230 131Q224 117 237 116Q236 98 250 109Q260 99 267 115Q282 110 276 131" fill={fill('body')}/>;
      case 'mouse': return <path d="M193 302l-42 -10m42 19l-42 3M307 302l42 -10m-42 19l42 3" fill="none" stroke="#8b8090" strokeWidth="2.5"/>;
      case 'bird': return <path transform={`rotate(${lag*.65} 250 135)`} d="M215 135Q198 106 212 88Q224 88 233 117Q233 80 251 75Q266 81 257 113Q283 87 294 101Q299 115 275 135Z" fill={fill('body')}/>;
      case 'chick': return <path transform={`rotate(${lag*.8} 250 141)`} d="M224 142Q214 118 222 107Q235 105 243 128Q242 97 257 91Q273 100 262 128Q286 113 290 129L274 145" fill={fill('body')}/>;
      default: return null;
    }
  }

  const bodyClothes = new Set(['scarf','collar','bandana','vest','necklace','bow']);
  const accessories: DetailAccessory[] = (r.accessories ?? []).map(a=>typeof a==='string'?{kind:a}:a);
  // Clothing is selected from the chart-matched recipes; no invented hats or bags.
  return <>{accessories.filter(a=>bodyClothes.has(a.kind)===(layer==='clothes')).map((a,i)=>{
    const color = a.color ?? c.dark ?? '#85a9bf';
    const detail = (key: string, fallback: string) => typeof a[key]==='string' ? String(a[key]) : fallback;
    switch (a.kind) {
      case 'scarf': return <g key={i}><path d="M161 327Q250 352 339 327L338 350Q251 382 162 350Z" fill={color}/><g transform={`rotate(${pose.secondary?.cloth??0} 282 356)`}><path d="M269 354L311 351L319 415L280 421Z" fill={color}/><path d="M281 372l29 -4m-26 19l28 -4m-26 18l1 15m11 -17v15m10 -17v15" fill="none" stroke="#ecc59f" strokeWidth="3"/></g></g>;
      case 'collar': return <g key={i}><path d="M167 329Q250 360 333 329L335 349Q250 382 165 349Z" fill={color}/><circle cx="250" cy="371" r="17" fill={detail('ring','#e7ca83')} strokeWidth="2.5"/><path d="M247 359v14m-5 -11h11" fill="none" stroke="#fff1be" strokeWidth="3"/></g>;
      case 'bandana': return k==='duck'?<g key={i}>
        <path d="M161 329Q214 343 250 369Q286 343 339 329Q319 372 269 382L278 421Q251 419 250 389Q245 421 218 421L231 381Q184 373 161 329Z" fill={color}/><circle cx="250" cy="380" r="12" fill={color}/><path d="M179 342l57 30m85 -30l-57 30m-27 24l-9 14m34 -14l7 14" fill="none" stroke="#a7daf0" strokeWidth="3"/>
      </g>:<g key={i}><path d="M170 328Q250 354 330 328L300 383L249 407L190 377Z" fill={color}/><path d="M186 344Q249 371 312 344M241 382l9 9l9 -9" fill="none" stroke="#fff0d8" strokeWidth="3" opacity=".65"/>{k==='chick'?<g fill="#f8d5dc" stroke="none">{[[214,363],[237,372],[260,384],[279,365],[287,345],[251,354]].map(([x,y])=><circle key={x} cx={x} cy={y} r="3"/>)}</g>:null}</g>;
      case 'bow': return <g key={i} transform="translate(250 353)"><path d="M-9 0Q-62 -39 -50 12Q-46 29 -10 11M9 0Q62 -39 50 12Q46 29 10 11" fill={color}/><ellipse rx="13" ry="15" fill={color}/><path d="M-13 5l-20 5M13 5l20 5" fill="none" stroke="#e6edc4" strokeWidth="3"/></g>;
      case 'necklace': return <g key={i}><path d="M185 338Q250 403 315 338" fill="none" stroke={color} strokeWidth="7"/><circle cx="250" cy="375" r="15" fill={color}/><path d="M250 365l3 7l8 3l-8 3l-3 7l-3 -7l-8 -3l8 -3Z" fill="#ffebba" stroke="none"/></g>;
      case 'vest': return <g key={i}><path d="M170 338L227 353L250 399L229 468Q177 474 153 447ZM330 338L273 353L250 399L271 468Q323 474 347 447Z" fill={color}/><path d="M177 355l40 12l19 38M323 355l-40 12l-19 38M175 412v25l28 6M325 412v25l-28 6" fill="none" stroke="#ebd8ae" strokeWidth="3"/></g>;
      case 'glasses': return <g key={i} fill="none" stroke={color} strokeWidth="4">{[-1,1].map(s=><g key={s} opacity={eyeOpacity(s)}><ellipse cx={eyeX(s)} cy="243" rx={41*eyeScale(s)} ry="45"/><path d={`M${eyeX(s)+s*41*eyeScale(s)} 236l${s*17} -7`}/></g>)}<path d={`M${eyeX(-1)+41*eyeScale(-1)} 238Q250 228 ${eyeX(1)-41*eyeScale(1)} 238`} opacity={1-angle*.75}/></g>;
      case 'beanie': case 'stripedBeanie': return <g key={i}><path d="M173 152Q170 79 250 83Q330 79 327 152Z" fill={color}/><circle cx="250" cy="82" r="17" fill={color}/><path d="M175 142Q250 119 325 142L329 165Q250 144 171 165Z" fill={detail('band',color)}/>{a.kind==='stripedBeanie'?<path d="M184 120Q250 105 317 120M197 100Q250 92 303 100" fill="none" stroke={detail('stripe','#fff6e7')} strokeWidth="9"/>:<path d="M194 142l1 17m21 -22v20m23 -23v20m23 -20v20m23 -18v20m21 -17v20" fill="none" stroke="#ebc7a1" strokeWidth="3" opacity=".55"/>}</g>;
      case 'headphones': return <g key={i}><path d="M130 249V207Q132 107 250 110Q368 107 370 207V249" fill="none" stroke={color} strokeWidth="17"/><rect x="110" y="208" width="38" height="74" rx="18" fill={detail('pad','#54436e')}/><rect x="352" y="208" width="38" height="74" rx="18" fill={detail('pad','#54436e')}/><path d="M148 151Q173 117 211 117" fill="none" stroke="#dfceef" strokeWidth="5" opacity=".5"/></g>;
      case 'headdress': return <g key={i}><path d="M162 146Q250 118 338 146L338 167Q250 143 162 167Z" fill={detail('band','#c43b50')}/><path d="M218 148L250 122L282 148L250 199Z" fill={color}/><path d="M250 142l12 11l-12 21l-12 -21Z" fill="#efcdad" stroke="none"/></g>;
      default: return null;
    }
  })}</>;
};
