import type {Word} from './types';

export interface CaptionPage {rows: Word[][]; start: number; end: number}

/** Pure measured pagination; long tokens split at grapheme boundaries, never shrink below the chosen font. */
export function captionPages(words: Word[],measure:(text:string)=>number,{maxWidth,maxWords=8,maxLines=2}:{maxWidth:number;maxWords?:number;maxLines?:number}):CaptionPage[] {
  if(!Number.isFinite(maxWidth)||maxWidth<=0||!Number.isInteger(maxWords)||maxWords<1||!Number.isInteger(maxLines)||maxLines<1)throw new Error('Invalid caption bounds');
  const tokens:Word[]=[];
  let cursor=0;
  for(const word of words) {
    const pieces:string[]=[];
    let piece='';
    for(const {segment} of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(word.text)) {
      if(piece&&measure(piece+segment)>maxWidth){pieces.push(piece);piece='';}
      piece+=segment;
    }
    if(piece)pieces.push(piece);
    const start=Math.max(cursor,Number.isFinite(word.start)?word.start:cursor);
    const end=Number.isFinite(word.end)&&word.end>start?word.end:start+.4;
    cursor=end;
    pieces.forEach((text,i)=>tokens.push({text,start:start+(end-start)*i/pieces.length,end:start+(end-start)*(i+1)/pieces.length}));
  }
  const pages:CaptionPage[]=[];
  let rows:Word[][]=[[]],width=0,count=0;
  const flush=()=>{
    const flat=rows.flat();
    if(flat.length)pages.push({rows:rows.filter(row=>row.length),start:flat[0].start,end:flat.at(-1)!.end});
    rows=[[]];width=0;count=0;
  };
  for(const word of tokens) {
    let row=rows.at(-1)!;
    if(count>=maxWords) {flush();row=rows[0];}
    const size=measure(word.text);
    if(row.length&&width+18+size>maxWidth) {
      if(rows.length===maxLines)flush();
      else rows.push([]);
      row=rows.at(-1)!;width=0;
    }
    width+=(row.length?18:0)+size;row.push(word);count++;
    if(count>=3&&/[,.!?;:]$/.test(word.text))flush();
  }
  flush();return pages;
}

export function captionPageAt(pages:CaptionPage[],t:number):CaptionPage|undefined {
  let page=pages[0];
  for(const candidate of pages){if(candidate.start>t)break;page=candidate;}
  return page;
}
