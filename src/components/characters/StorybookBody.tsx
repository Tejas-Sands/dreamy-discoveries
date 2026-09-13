import React, { useId } from "react";
import type { CharacterRecipe } from "./recipe";
import type { Pose } from "./pose";
import type { Emotion } from "../../lib/types";
import { StorybookFace } from "./StorybookFace";

export const STORYBOOK_KINDS = new Set(["bunny", "bear", "duck", "fox", "turtle", "owl"]);

export interface StorybookBodyProps {
  recipe: CharacterRecipe;
  pose: Pose;
  emotion: Emotion;
  mouth: number;
  blink: number;
  showFace: boolean;
}

const mix = (color: string, target: string, amount: number) => {
  const a = parseInt(color.slice(1), 16), b = parseInt(target.slice(1), 16);
  return "#" + [16, 8, 0].map(shift => Math.round(((a >> shift) & 255) * (1-amount) + ((b >> shift) & 255) * amount).toString(16).padStart(2,"0")).join("");
};

/** Artwork uses the approved 500px Daisy drawing space, mapped onto the existing
 * rig: center x=100, feet y=250. Pose distances are converted back by 2.5. */
export const StorybookBody: React.FC<StorybookBodyProps> = ({ recipe, pose, emotion, mouth, blink, showFace }) => {
  const uid = `storybook-${useId().replace(/:/g, "")}`;
  const kind = recipe.name, c = recipe.colors;
  const bird = kind === "duck" || kind === "owl";
  const bear = kind === "bear", turtle = kind === "turtle", fox = kind === "fox";
  const outline = kind === "duck" ? "#98745f" : mix(c.body, "#67516c", .58);
  const fill = (name: string) => `url(#${uid}-${name})`;
  const accessory = recipe.accessories?.[0];
  const cloth = typeof accessory === "object" ? accessory.color ?? c.dark ?? "#85a9bf" : c.dark ?? "#85a9bf";
  const lag = Math.max(-8, Math.min(8, -pose.vy * .018));
  const headTransform = `translate(${pose.head.dx*2.5} ${(pose.head.dy-mouth*2.6)*2.5}) rotate(${pose.head.tilt+mouth*1.4} 250 318)`;
  const gradient = (name: string, color: string, light = .4) => <radialGradient id={`${uid}-${name}`} cx=".28" cy=".2" r=".9">
    <stop stopColor={mix(color,"#fff7e5",light+.2)}/><stop offset=".4" stopColor={mix(color,"#fff0d6",light)}/><stop offset=".78" stopColor={color}/><stop offset="1" stopColor={mix(color,"#92747e",.27)}/>
  </radialGradient>;

  const arm = (right: boolean) => {
    const x = right ? (bear ? 361 : 345) : (bear ? 139 : 155);
    const angle = right ? -pose.armR : pose.armL;
    const bend = right ? pose.armBendR : pose.armBendL;
    const point = right && pose.handScaleR > 1.1;
    const handScale = right ? pose.handScaleR : 1;
    // Folded paws need enough reach to meet across the plush torso, especially
    // Ben's wider shoulders. Blend it in as the arms turn inward.
    const inward = Math.min(1, Math.max(0, -(right ? pose.armR : pose.armL) / 90));
    const reach = bird ? 1 : 1 + inward * (bear ? .4 : .16);
    return <g transform={`translate(${x} 352) rotate(${angle}) scale(${right ? -1 : 1} ${reach})`}>
      {bird ? <>
        <path d="M-8 -10C-40 -5 -46 30 -38 67Q-34 95 -16 100Q-7 101 -9 89Q4 103 7 88Q22 95 21 77Q33 77 26 56C15 23 24 -10 -8 -10Z" fill={fill("wing")}/>
        <path d="M-25 39Q-28 65 -17 80M-8 48Q-7 70 2 80" fill="none" stroke={outline} strokeWidth="2" opacity=".45"/>
      </> : <>
        <path d={`M-14 -13C-37 -12 -35 24 ${-20+bend*9} 55Q-19 77 -2 81Q15 90 25 73Q35 62 20 48Q${9+bend*20} 21 16 -1Q10 -16 -14 -13Z`} fill={fill("wing")}/>
        <g transform={`translate(2 67) scale(${handScale})`}>
          <ellipse rx="23" ry="21" fill={fill("wing")}/>
          {point ? <path d="M-10 11L-11 34Q-8 44 -1 36L4 14" fill={fill("wing")} strokeWidth="3"/> : <path d="M-12 7l1 6M-1 10v5M10 7l-1 5" fill="none" strokeWidth="2" opacity=".5"/>}
          {bear ? <ellipse cy="-1" rx="11" ry="9" fill={fill("belly")} stroke="none" opacity=".7"/> : null}
        </g>
        <path d="M-22 2Q-27 22 -16 42" fill="none" stroke="#fff6df" strokeWidth="3" opacity=".3"/>
      </>}
    </g>;
  };

  const foot = (right: boolean) => {
    const x = right ? 300 : 200;
    const lift = right ? pose.legR : pose.legL;
    const swing = right ? pose.legSwR : pose.legSwL;
    return <g transform={`translate(${x} ${488+lift*2.5}) rotate(${swing}) scale(${right ? -1 : 1} 1)`}>
      <path d="M-22 -8Q-28 22 -24 48L22 49Q28 18 19 -7Z" fill={bird ? fill("bill") : fill("wing")}/>
      {bird ? <path d="M-25 41Q-38 52 -59 58Q-74 68 -52 73L-18 68Q5 79 24 68Q28 53 16 42Z" fill={fill("bill")}/> : <>
        <path d="M-24 37Q-62 38 -62 58Q-67 76 -34 75L21 72Q38 60 23 43Z" fill={fill(fox ? "paws" : "wing")}/>
        <path d="M-43 57l2 8M-31 58l1 8M-19 58v8" fill="none" strokeWidth="2" opacity=".45"/>
      </>}
    </g>;
  };

  const ears = () => {
    if (kind === "bunny") return <g transform={`rotate(${lag*.5} 250 148)`}>
      <g transform={`rotate(${-8-lag} 183 155)`}><path d="M153 153C126 106 111 -63 149 -75C191 -86 213 78 208 153Z" fill={fill("body")}/><path d="M166 128C148 80 139 -41 154 -43C177 -42 191 80 188 134Z" fill={fill("inner")} stroke="none"/><path d="M144 51Q136 -26 150 -49" fill="none" stroke="#fff9f0" strokeWidth="5" opacity=".7"/></g>
      <g transform={`rotate(${9+lag} 319 155)`}><path d="M291 153C285 73 310 -79 348 -72C389 -60 369 91 344 157Z" fill={fill("body")}/><path d="M311 130C310 75 332 -42 346 -39C365 -30 350 80 333 138Z" fill={fill("inner")} stroke="none"/></g>
    </g>;
    if (bear) return <>
      {[144,356].map(x => <g key={x}><circle cx={x} cy="130" r="51" fill={fill("body")}/><circle cx={x} cy="131" r="32" fill={fill("inner")} stroke="none"/><path d={`M${x-32} 108Q${x-20} 85 ${x+5} 91`} fill="none" stroke="#fff0d4" strokeWidth="4" opacity=".4"/></g>)}
    </>;
    if (fox) return <>
      <path d="M137 175Q104 114 128 61Q172 70 203 139Z" fill={fill("body")}/><path d="M148 151Q124 114 137 84Q165 95 179 141Z" fill={fill("belly")} stroke="none"/>
      <path d="M300 142Q331 68 373 62Q398 115 365 176Z" fill={fill("body")}/><path d="M324 143Q342 101 365 84Q380 119 354 153Z" fill={fill("belly")} stroke="none"/>
    </>;
    if (kind === "owl") return <>
      <path d="M130 176Q105 133 125 98Q150 124 181 138Z" fill={fill("body")}/><path d="M322 140Q355 125 377 99Q396 140 371 182Z" fill={fill("body")}/>
      <path d="M132 118L152 151M369 119L350 153" fill="none" stroke="#ebd5b2" strokeWidth="5" opacity=".55"/>
    </>;
    return null;
  };

  const headPath = kind === "duck"
    ? "M145 151Q121 184 124 236Q120 262 104 274Q115 322 169 333Q250 364 331 333Q385 322 396 274Q380 262 376 236Q379 184 355 151Q319 109 251 112Q181 109 145 151Z"
    : fox ? "M144 154Q183 116 249 120Q319 115 358 163L377 227L403 258L384 269L392 280Q366 284 355 304Q310 350 250 351Q188 347 146 307L109 284L116 271L98 257L124 230Z"
    : turtle ? "M134 179Q147 123 249 126Q348 123 365 181L369 254Q392 265 382 297Q368 341 251 343Q133 343 118 300Q107 268 131 255Z"
    : kind === "owl" ? "M128 168Q168 115 250 122Q337 114 372 172Q405 233 375 296Q357 350 251 351Q141 350 124 297Q98 229 128 168Z"
    : bear ? "M129 171Q165 119 250 124Q338 119 374 174Q397 211 379 251Q410 276 379 310Q345 349 250 351Q150 352 121 312Q90 281 120 253Q107 208 129 171Z"
    : "M143 167Q173 124 250 128Q328 124 359 168Q379 203 368 249Q398 268 383 298Q360 345 250 350Q137 346 116 299Q100 269 132 249Q121 207 143 167Z";

  return <g transform="translate(0 26) scale(.4)" stroke={outline} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
    <defs>
      {kind === "duck" ? <radialGradient id={`${uid}-body`} cx=".28" cy=".2" r=".85"><stop stopColor="#fff6cc"/><stop offset=".4" stopColor="#ffe19a"/><stop offset=".78" stopColor="#f4c666"/><stop offset="1" stopColor="#dda35f"/></radialGradient> : gradient("body", c.body)}
      {gradient("wing", kind === "duck" ? "#f4cb77" : c.body, .28)}
      {gradient("belly", c.belly, .5)}{gradient("inner", c.inner ?? c.belly, .25)}
      {gradient("cloth", cloth, .32)}{gradient("shell", c.accent ?? c.body, .2)}
      {gradient("paws", c.limb, .18)}
      <linearGradient id={`${uid}-bill`} x2=".25" y2="1"><stop stopColor="#ffe0a0"/><stop offset=".5" stopColor="#efb375"/><stop offset="1" stopColor="#d98f64"/></linearGradient>
    </defs>
    {/* Tails and the shell stay behind the torso, following the same pose clock. */}
    <g transform={`rotate(${pose.tail*.45} 332 456)`}>
      {kind === "bunny" ? <><circle cx="363" cy="461" r="39" fill="#fff9f0"/><path d="M345 443q17 -16 33 0M344 458q7 -10 13 -7" fill="none" stroke="#e6dce2" strokeWidth="3"/></> : null}
      {bear ? <circle cx="368" cy="464" r="28" fill={fill("body")}/> : null}
      {fox ? <><path d="M334 471Q375 492 394 447Q416 397 456 365Q480 443 458 485Q424 545 345 511Z" fill={fill("body")}/><path d="M403 430Q416 394 456 365Q476 427 466 451L451 439L440 453L428 443L414 457Z" fill={fill("belly")} stroke="none"/><path d="M419 486q18 -18 20 -33" fill="none" stroke="#fff0d9" strokeWidth="4" opacity=".45"/></> : null}
      {bird ? <path d="M345 411Q389 412 405 386Q410 426 371 451Z" fill={fill("wing")}/> : null}
      {turtle ? <path d="M365 475Q389 493 405 477Q399 507 365 508Z" fill={fill("body")}/> : null}
    </g>
    {turtle ? <g>
      <ellipse cx="250" cy="428" rx="151" ry="118" fill={fill("shell")} stroke="#718565" strokeWidth="6"/>
      <path d="M131 423Q133 359 201 334M300 334Q359 353 373 415" fill="none" stroke="#c7d5a5" strokeWidth="7" opacity=".65"/>
      <path d="M136 374l32 24l-6 44l-39 18M363 373l-34 25l8 45l39 16M167 442l23 38l-18 37M332 443l-24 36l20 36" fill="none" stroke="#6d8964" strokeWidth="4"/>
    </g> : null}
    {foot(false)}{foot(true)}
    <path d={bear ? "M156 315Q91 355 111 455Q123 541 248 544Q377 541 389 456Q409 355 344 315Z" : "M171 311Q109 360 131 465Q149 540 246 544Q344 542 364 467Q389 368 326 310Z"} fill={fill("body")}/>
    {showFace ? <>
      <ellipse cx="248" cy="438" rx={bear ? 101 : turtle ? 92 : 85} ry="90" fill={fill("belly")} stroke="none"/>
      {turtle ? <g fill="none" stroke="#c4ad80" strokeWidth="3" opacity=".75"><path d="M170 408Q248 433 326 408M158 444Q248 471 337 444M174 482Q250 505 322 482M249 353v165"/></g> : null}
      {kind === "owl" ? <g fill="none" stroke="#b59a77" strokeWidth="3" opacity=".6">{[396,427,458,489].map((y,i) => <path key={y} d={`M${200+i%2*17} ${y}q9 13 18 0m17 0q9 13 18 0m17 0q9 13 18 0`}/>)}</g> : null}
      <path d="M191 421q-9 22 -4 39M195 473l4 9M305 471l-4 9" fill="none" stroke={mix(c.belly,"#e0c498",.4)} strokeWidth="4" opacity=".6"/>
    </> : null}
    {/* Clothes follow the torso, hats and glasses follow the head. */}
    {showFace && kind === "bunny" ? <g>
      <path d="M163 325L231 342L250 388L229 470Q178 474 153 449L156 371ZM337 325L269 342L250 388L271 470Q322 474 347 449L344 371Z" fill={fill("cloth")} stroke="#7c8ba7"/>
      <path d="M177 343l41 17l18 40M323 343l-41 17l-18 40M172 398v44l29 6M328 398v44l-29 6" fill="none" stroke="#d9e8e7" strokeWidth="4" opacity=".75"/>
      {[406,430,454].map(y => <circle key={y} cx="251" cy={y} r="5" fill="#f8e5ba" stroke="#a28c70" strokeWidth="2"/>)}
    </g> : null}
    {showFace && kind === "duck" ? <g>
      <path d="M167 313Q248 352 332 313L344 344L295 385L252 365L207 387L157 346Z" fill={fill("cloth")} stroke="#6a7f9e"/>
      <path d="M164 339L208 375L250 355L295 374L336 338" fill="none" stroke="#fff4db" strokeWidth="5"/>
      <path d="M240 358Q253 349 263 360L266 378L255 397L239 378Z" fill={fill("cloth")} stroke="#6a7f9e"/>
    </g> : null}
    {bear ? <g>
      <path d="M158 322Q244 341 344 323L345 352Q248 379 151 351Z" fill={fill("cloth")} stroke="#9c7567"/>
      {showFace ? <><path d="M270 354L316 350L332 419L305 429L279 416Z" fill={fill("cloth")} stroke="#9c7567"/><path d="M289 380l30 -7M294 395l29 -7M301 417l1 12m9 -9l2 11m7 -15l4 9" fill="none" stroke="#e4bc9a" strokeWidth="3" opacity=".8"/></> : null}
      <path d="M170 335Q245 354 331 337" fill="none" stroke="#ebc4a8" strokeWidth="3" opacity=".7"/>
    </g> : null}
    {showFace && kind === "owl" ? <g>
      <path d="M192 337Q251 407 310 337" fill="none" stroke={cloth} strokeWidth="5"/>
      <ellipse cx="252" cy="376" rx="16" ry="20" fill={fill("cloth")} stroke="#83936e"/>
      <path d="M251 362v23m-7 -16l7 7l7 -7" fill="none" stroke="#e4e6bd" strokeWidth="2.5"/>
    </g> : null}
    {/* Raised arms can pass behind a cheek; folded arms remain in front. */}
    {pose.armL >= 0 ? arm(false) : null}{pose.armR >= 0 ? arm(true) : null}
    <g transform={headTransform}>
      {ears()}
      <path d={headPath} fill={fill("body")}/>
      {showFace ? <>
        {kind === "bunny" || bear ? <ellipse cx="250" cy={bear ? 298 : 310} rx={bear ? 69 : 79} ry={bear ? 42 : 30} fill={fill("belly")} stroke="none"/> : null}
        {fox ? <path d="M122 263Q165 289 211 246Q231 245 250 270Q270 245 289 246Q337 289 378 263Q368 320 302 336Q250 362 197 336Q135 318 122 263Z" fill={fill("belly")} stroke="none"/> : null}
        {kind === "owl" ? <path d="M250 180C191 114 127 170 140 231Q140 288 195 296Q225 304 250 284Q278 305 309 296Q363 289 363 231C378 169 310 114 250 180Z" fill={fill("belly")} stroke={mix(c.body,c.belly,.42)} strokeWidth="5"/> : null}
      </> : null}
      {kind === "duck" ? <path d="M218 117Q181 104 194 72Q200 59 208 75Q211 95 233 101Q217 70 234 47Q244 35 250 52Q248 74 254 95Q271 67 288 77Q298 87 282 97L271 115" fill={fill("body")}/> : null}
      <path d="M145 191Q156 156 185 146M175 140L189 135" fill="none" stroke="#fff8df" strokeWidth="7" opacity={bear || kind === "owl" ? .23 : .5}/>
      {showFace ? <>
        <StorybookFace kind={kind} emotion={emotion} mouth={mouth} blink={blink} eyes={pose.eyes} uid={uid} outline={outline}/>
        {kind === "bunny" ? <g fill="none" stroke="#b8a3af" strokeWidth="2.4" opacity=".65"><path d="M165 298l-37 -7m37 17l-38 1M335 298l37 -7m-37 17l38 1"/></g> : null}
        {turtle ? <g fill="none" stroke={cloth} strokeWidth="4">
          <ellipse cx="195" cy="247" rx="42" ry="43"/><ellipse cx="305" cy="247" rx="42" ry="43"/><path d="M237 238Q250 228 263 238M153 236l-19 -8M347 236l18 -8"/>
          <path d="M166 221l12 -7M277 221l12 -7" stroke="#fff9e7" strokeWidth="3" opacity=".8"/>
          <path d="M173 187q20 -8 40 0M287 187q20 -8 40 0" stroke="#9fbb8b" strokeWidth="2"/>
        </g> : null}
        <path d="M165 316l5 2M173 319l5 2M330 316l5 -2" stroke={outline} strokeWidth="1.8" opacity=".25"/>
      </> : null}
      {fox ? <g>
        <path d="M178 161Q167 90 248 85Q324 86 332 151Z" fill={fill("cloth")} stroke="#a67e68"/>
        <circle cx="251" cy="86" r="19" fill={fill("cloth")} stroke="#a67e68"/>
        <path d="M177 145Q250 121 332 143L337 166Q256 145 176 170Z" fill={mix(cloth,"#edc59c",.25)} stroke="#a67e68"/>
        <path d="M198 139l1 19m19 -23l1 20m20 -24l1 20m20 -20l1 20m20 -18l1 19m20 -15l1 18M215 102q-14 13 -12 30m33 -32q-9 12 -8 30m31 -30q7 12 8 31m13 -25q14 10 18 26" fill="none" stroke="#ebc7a1" strokeWidth="3" opacity=".6"/>
      </g> : null}
    </g>
    {pose.armL < 0 ? arm(false) : null}{pose.armR < 0 ? arm(true) : null}
    {pose.clapSpark > 0 ? <g transform="translate(250 330)" stroke="#e8c780" opacity={pose.clapSpark} strokeWidth="4">{[0,60,120,180,240,300].map(a => <path key={a} d="M0 -17v-13" transform={`rotate(${a})`}/>)}</g> : null}
  </g>;
};
