/** Sole artwork reference: public/references/pastel-kawaii-animal-limb-chart.png.
 * Cells identify the supplied drawing, not new names in the story cast. */
export const CHART_ROWS = [
  ['bear','bee','bird','bunny','cat','chick','cow','dinosaur','dog','dragon'],
  ['duck','elephant','fish','fox','frog','giraffe','hedgehog','hippo','horse','koala'],
  ['ladybug','lion','monkey','mouse','owl','panda','penguin','pig','raccoon','sheep'],
  ['snowman','squirrel','star','tiger','turtle','unicorn','whale',null,'zebra'],
] as const;
export const CHART_ORDER = CHART_ROWS.flat().filter((kind): kind is Exclude<typeof kind,null> => kind!==null);
export const CHART_IMAGE = 'references/pastel-kawaii-animal-limb-chart.png';
export function chartCell(kind: string) {
  for (const [row,kinds] of CHART_ROWS.entries()) {
    const column=kinds.findIndex(value=>value===kind);
    if(column>=0) {
      const last=row===3;
      return {x:last?17+column*183.5:17+column*165.2,y:[65,292,510,720][row],width:kind==='whale'?187:last?177:156,height:[184,173,169,174][row]};
    }
  }
  return {x:17,y:65,width:156,height:184};
}

export interface UprightLayout {
  bodyWidth:number; bodyTop:number; bellyWidth:number;
  shoulder:number; shoulderY:number; armLength:number; armWidth:number;
  footGap:number; footWidth:number; headScale:number;
  unibody?:boolean;
}
const shape=(bodyWidth:number,bodyTop:number,bellyWidth:number,shoulder:number,shoulderY:number,
  armLength:number,armWidth:number,footGap:number,footWidth:number,headScale=1,unibody=false):UprightLayout=>
  ({bodyWidth,bodyTop,bellyWidth,shoulder,shoulderY,armLength,armWidth,footGap,footWidth,headScale,unibody});

/** Measurements in the existing 500px drawing space, feet at y=560.
 * Each animal has its own outline and attachment placement from the chart. */
export const UPRIGHT_LAYOUTS:Record<string,UprightLayout>={
  bear:shape(129,307,96,112,351,77,23,61,29),
  bird:shape(130,125,90,115,335,96,26,51,30,1,true),
  bunny:shape(96,323,65,84,351,73,18,43,23,.97),
  cat:shape(96,320,65,84,350,76,21,43,24,1.04),
  chick:shape(115,138,75,101,345,83,22,43,26,1,true),
  cow:shape(106,310,75,95,345,85,23,46,26,1.06),
  dog:shape(104,315,70,90,350,87,24,47,27,1.04),
  duck:shape(125,139,83,109,345,93,27,49,30,1,true),
  elephant:shape(103,308,68,92,353,86,26,46,28,1.08),
  fox:shape(87,321,59,76,352,74,18,39,22,1.04),
  hedgehog:shape(111,184,83,79,378,58,18,41,22,.88,true),
  hippo:shape(122,310,84,105,345,88,26,54,29,1.04),
  koala:shape(96,312,66,85,351,75,22,42,24,1.04),
  lion:shape(91,329,64,81,361,76,23,42,25,.98),
  monkey:shape(91,317,65,80,347,86,21,42,25,1.03),
  mouse:shape(81,323,54,72,359,64,17,37,22,.96),
  owl:shape(116,125,84,103,342,95,25,43,24,1,true),
  panda:shape(109,315,84,97,350,82,25,49,28,1.05),
  penguin:shape(119,135,93,106,330,100,24,48,28,1,true),
  pig:shape(106,318,75,94,354,77,22,45,24,1.04),
  raccoon:shape(88,321,64,79,351,76,21,40,24,1.01),
  sheep:shape(118,318,95,104,359,70,21,43,23,1.02),
  squirrel:shape(91,323,66,80,359,68,20,41,24,.98),
  tiger:shape(103,312,72,93,350,85,25,48,28,1.03),
  zebra:shape(98,315,66,85,350,83,23,43,24,1.02),
};
