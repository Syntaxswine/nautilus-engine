// Dedicated islands per model; rectangles are pixel bounds in its owned512 page.
export const EQUIPMENT_PAINT_REGIONS={front:[0,0,256,256],back:[256,0,256,256],shaft:[0,256,128,256],grip:[128,256,128,128],iron:[256,256,128,128],brass:[384,256,128,128],aux:[128,384,128,128],pad:[256,384,128,128],glass:[384,384,128,128]};
export const MATERIAL_PAINT_REGION={steel:'iron',iron:'iron',wood:'shaft',leather:'grip',brass:'brass',teal:'front',cloth:'pad',red:'front',glass:'glass'};
export const PAINT_GUTTER=4;
export function equipmentPaintUV(region,point){const [x,y,w,h]=EQUIPMENT_PAINT_REGIONS[region];return [(x+PAINT_GUTTER+(w-PAINT_GUTTER*2)*point[0])/512,1-(y+PAINT_GUTTER+(h-PAINT_GUTTER*2)*point[1])/512];}
