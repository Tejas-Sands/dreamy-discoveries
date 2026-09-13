import React from "react";
import type { CharacterRecipe } from "./recipe";
import type { Pose } from "./pose";
import { OUTLINE } from "./Face";

const O = { stroke: OUTLINE, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Identifying markings stay attached to the appropriate moving body part. */
export const MammalDetails: React.FC<{ recipe: CharacterRecipe; pose: Pose; layer: "back" | "body" | "face" }> = ({ recipe: r, pose: p, layer }) => {
  const c = r.colors;
  if (layer === "back") {
    if (r.name === "hedgehog") {
      const points = Array.from({length: 60}, (_, i) => {
        const a = i * Math.PI / 30;
        const k = i % 2 ? .86 : 1;
        return `${100 + Math.cos(a)*87*k},${145 + Math.sin(a)*103*k}`;
      }).join(" ");
      return <g><polygon points={points} fill="#856957" {...O}/><g stroke="#c4aa88" strokeWidth={2} strokeLinecap="round">{Array.from({length: 23}, (_,i)=>{
        const a = i * Math.PI * 2 / 23;
        return <path key={i} d={`M ${100+Math.cos(a)*68} ${145+Math.sin(a)*80} l ${Math.cos(a)*10} ${Math.sin(a)*13}`}/>;
      })}</g></g>;
    }
    if (r.name === "raccoon") return <g transform={`rotate(${p.tail*.5} 144 210)`}>
      <path d="M 141 217 Q 204 216 193 142 Q 180 117 163 143 Q 179 180 141 189 Z" fill="#98979d" {...O}/>
      <path d="M 166 151 L 195 145 L 197 161 L 170 168 M 166 180 L 196 180 L 191 194 L 156 194 M 145 202 L 181 209 L 167 218 L 143 216" fill="#44414b"/>
    </g>;
    if (r.name === "monkey") return <g transform={`rotate(${p.tail*.5} 150 205)`}>
      <path d="M 145 211 C 208 222 221 154 190 142 C 158 129 151 171 178 174 Q 194 172 182 160" fill="none" stroke={OUTLINE} strokeWidth={15} strokeLinecap="round"/>
      <path d="M 145 211 C 208 222 221 154 190 142 C 158 129 151 171 178 174 Q 194 172 182 160" fill="none" stroke={c.body} strokeWidth={9} strokeLinecap="round"/>
    </g>;
    if (r.name === "squirrel") return <g transform={`rotate(${p.tail*.5} 143 208)`}>
      <path d="M 137 221 C 214 232 222 151 193 129 C 218 108 193 73 169 91 Q 135 110 158 146 Q 180 180 137 188 Z" fill={c.body} {...O}/>
      <path d="M 149 207 Q 198 190 180 146 Q 160 107 184 102" fill="none" stroke={c.belly} strokeWidth={13} strokeLinecap="round"/>
    </g>;
    return null;
  }
  if (layer === "body") {
    if (r.name === "sheep") return <g fill="#fcf1dc" {...O} strokeWidth={2}>
      <path d="M 62 155 Q 56 144 71 147 Q 80 136 91 144 Q 103 135 113 144 Q 129 137 135 150 Q 150 149 146 163 Q 160 173 149 184 Q 160 199 147 210 Q 150 225 135 227 Q 128 241 114 234 Q 101 246 88 235 Q 70 242 65 228 Q 47 230 51 210 Q 40 200 50 187 Q 40 175 52 167 Q 47 156 62 155 Z"/>
      <path d="M 65 179 q 7 -7 13 0 M 121 185 q 8 -8 15 0 M 88 218 q 7 -7 14 0" fill="none" stroke="#c7baa7"/>
    </g>;
    if (r.name === "panda") return <path d="M 48 158 Q 100 179 152 158 L 156 183 Q 100 195 44 183 Z" fill="#34323a"/>;
    if (r.name === "monkey") return <g><path d="M 62 149 L 134 217" stroke="#3a5236" strokeWidth={7}/><path d="M 110 190 L 139 184 L 151 211 Q 140 228 119 219 Z" fill="#749856" {...O}/><path d="M 112 191 L 139 185 L 141 201 L 121 207 Z" fill="#93ac68" stroke={OUTLINE} strokeWidth={2}/></g>;
    if (r.name === "tiger" || r.name === "cat") return <g fill={c.accent}>
      <path d="M 46 171 L 70 181 L 48 185 Z M 44 194 L 65 204 L 48 209 Z M 154 171 L 130 181 L 152 185 Z M 156 194 L 135 204 L 152 209 Z"/>
    </g>;
    return null;
  }
  if (r.name === "raccoon") return <g>
    <path d="M 40 85 Q 63 67 91 83 L 100 96 L 109 83 Q 137 67 160 85 L 146 114 Q 121 119 100 104 Q 79 119 54 114 Z" fill="#403c45"/>
    <path d="M 77 112 Q 100 104 123 112 L 116 137 Q 100 148 84 137 Z" fill="#eee8dc"/>
    <ellipse cx={100} cy={117} rx={9} ry={6} fill={OUTLINE}/>
  </g>;
  if (r.name === "monkey") return <g>
    <path d="M 100 78 C 60 43 39 80 55 110 Q 39 142 100 151 Q 161 142 145 110 C 161 80 140 43 100 78 Z" fill={c.belly}/>
    <path d="M 93 115 Q 100 110 107 115" fill="none" {...O} strokeWidth={2}/>
  </g>;
  if (r.name === "sheep") return <g fill="#fff4e2" {...O} strokeWidth={2}>
    <path d="M 47 72 Q 30 55 48 44 Q 41 26 61 25 Q 63 9 79 19 Q 94 4 106 17 Q 123 7 133 23 Q 153 18 155 38 Q 176 45 160 63 Q 160 79 142 73 Q 128 81 117 69 Q 101 79 91 67 Q 72 79 63 66 Q 51 81 47 72 Z"/>
  </g>;
  if (r.name === "cow") return <path d="M 48 54 Q 75 31 94 49 L 91 80 Q 68 91 47 77 Z" fill="#706878"/>;
  if (r.name === "squirrel") return <g><path d="M 92 131 L 99 132 L 99 143 L 93 143 Z M 101 132 L 108 131 L 107 143 L 101 143 Z" fill="#fffaf0" stroke={OUTLINE} strokeWidth={1}/></g>;
  return null;
};
