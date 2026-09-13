import React from "react";
import { useCurrentFrame } from "remotion";

/** Art-direction study of Daisy: her yellow feathers and blue sailor collar,
 * with softer proportions. Preview-only until the full production rig is adapted. */
export const DreamyDaisy: React.FC = () => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 23) * 3;
  const blink = frame % 117;
  const eyeScale = blink >= 100 && blink <= 106 ? Math.max(.06, Math.abs(blink - 103) / 3) : 1;
  return <svg width="570" height="680" viewBox="0 0 500 600" style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id="dd-feathers" cx=".28" cy=".2" r=".85"><stop stopColor="#fff6cc"/><stop offset=".4" stopColor="#ffe19a"/><stop offset=".78" stopColor="#f4c666"/><stop offset="1" stopColor="#dda35f"/></radialGradient>
      <radialGradient id="dd-wing" cx=".2" cy=".18" r=".95"><stop stopColor="#fff0b7"/><stop offset=".65" stopColor="#f4cb77"/><stop offset="1" stopColor="#d6a166"/></radialGradient>
      <radialGradient id="dd-belly" cx=".36" cy=".18"><stop stopColor="#fffbea"/><stop offset="1" stopColor="#fae9b2"/></radialGradient>
      <radialGradient id="dd-blush"><stop stopColor="#ed9b98" stopOpacity=".7"/><stop offset="1" stopColor="#efb39c" stopOpacity="0"/></radialGradient>
      <radialGradient id="dd-eye" cx=".35" cy=".2"><stop stopColor="#867397"/><stop offset=".45" stopColor="#55445f"/><stop offset="1" stopColor="#342e49"/></radialGradient>
      <linearGradient id="dd-bill" x2=".25" y2="1"><stop stopColor="#ffe0a0"/><stop offset=".5" stopColor="#efb375"/><stop offset="1" stopColor="#d98f64"/></linearGradient>
      <linearGradient id="dd-collar" x2=".4" y2="1"><stop stopColor="#b4dcdf"/><stop offset=".6" stopColor="#78a9c4"/><stop offset="1" stopColor="#617eaa"/></linearGradient>
      <radialGradient id="dd-shadow"><stop stopColor="#576e78" stopOpacity=".23"/><stop offset="1" stopColor="#576e78" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="250" cy="564" rx="146" ry="23" fill="url(#dd-shadow)"/>
    <g stroke="#98745f" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M177 512Q163 541 137 548Q121 559 139 565L179 560Q206 568 218 556Q219 539 213 520Z" fill="url(#dd-bill)"/>
      <path d="M282 520Q277 540 281 557Q295 569 322 560L362 565Q381 559 362 548Q338 539 327 512Z" fill="url(#dd-bill)"/>
      <g transform={`translate(0 ${bob})`}>
        <path d="M345 411Q389 412 405 386Q410 426 371 451Z" fill="url(#dd-wing)"/>
        <path d="M171 311Q109 360 131 465Q149 540 246 544Q344 542 364 467Q389 368 326 310Z" fill="url(#dd-feathers)"/>
        <ellipse cx="248" cy="438" rx="85" ry="90" fill="url(#dd-belly)" stroke="none"/>
        <path d="M158 334Q116 342 113 389Q113 431 142 445Q151 445 149 432Q167 441 166 426Q181 434 180 415Q162 384 168 354Z" fill="url(#dd-wing)"/>
        <g transform={`rotate(${-12 + Math.sin(frame / 10) * 12} 335 348)`}>
          <path d="M326 338Q345 297 369 277Q380 269 382 283Q398 271 398 289Q415 282 411 301Q436 305 415 327Q384 364 341 380Z" fill="url(#dd-wing)"/>
          <path d="M361 326Q382 313 395 295M369 335Q394 325 408 311" fill="none" stroke="#cbac75" strokeWidth="2"/>
        </g>
        <path d="M167 313Q248 352 332 313L344 344L295 385L252 365L207 387L157 346Z" fill="url(#dd-collar)" stroke="#6a7f9e"/>
        <path d="M164 339L208 375L250 355L295 374L336 338" fill="none" stroke="#fff4db" strokeWidth="5"/>
        <path d="M240 358Q253 349 263 360L266 378L255 397L239 378Z" fill="#819ec0" stroke="#6a7f9e"/>
        <g transform={`rotate(${Math.sin(frame / 39) * 2} 250 295)`}>
          <path d="M145 151Q121 184 124 236Q120 262 104 274Q115 322 169 333Q250 364 331 333Q385 322 396 274Q380 262 376 236Q379 184 355 151Q319 109 251 112Q181 109 145 151Z" fill="url(#dd-feathers)"/>
          <path d="M218 117Q181 104 194 72Q200 59 208 75Q211 95 233 101Q217 70 234 47Q244 35 250 52Q248 74 254 95Q271 67 288 77Q298 87 282 97L271 115" fill="url(#dd-feathers)"/>
          <path d="M145 191Q156 156 185 146M175 140L189 135" fill="none" stroke="#fff8df" strokeWidth="7" opacity=".65"/>
          <ellipse cx="155" cy="282" rx="33" ry="24" fill="url(#dd-blush)" stroke="none"/>
          <ellipse cx="345" cy="282" rx="33" ry="24" fill="url(#dd-blush)" stroke="none"/>
          {[195, 305].map((x,i) => <g key={x}>
            <path d={`M${x-20} 194Q${x} 181 ${x+18} 192`} fill="none" stroke="#9f805f" strokeWidth="4"/>
            <g transform={`translate(${x} 240) scale(1 ${eyeScale})`}>
              <ellipse rx="29" ry="36" fill="#fffcf1" stroke="#8d745e" strokeWidth="2.5"/>
              <ellipse cx={i ? -3 : 3} cy="1" rx="23" ry="30" fill="url(#dd-eye)" stroke="none"/>
              <ellipse cx={i ? -10 : -4} cy="-12" rx="8" ry="11" fill="#fff" stroke="none"/>
              <circle cx={i ? 5 : 11} cy="12" r="4" fill="#fce9e6" stroke="none"/>
            </g>
          </g>)}
          <path d="M219 288Q250 266 283 288Q301 299 282 312Q252 335 220 314Q201 301 219 288Z" fill="url(#dd-bill)" stroke="#ae7e5c" strokeWidth="3"/>
          <path d="M217 299Q250 313 285 299" fill="none" stroke="#ad745b" strokeWidth="2.5"/>
          <ellipse cx="238" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/>
          <ellipse cx="263" cy="288" rx="4" ry="2" fill="#b28b6b" stroke="none"/>
          <path d="M165 311l5 2M173 314l5 2M330 311l5 -2" stroke="#e1b67d" strokeWidth="2"/>
        </g>
        <path d="M191 421q-9 22 -4 39M195 473l4 9M305 471l-4 9" fill="none" stroke="#f4dca5" strokeWidth="4"/>
      </g>
    </g>
  </svg>;
};
