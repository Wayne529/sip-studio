export type Family = 'coffee' | 'cocktail';
export type Technique = 'stir' | 'shake' | 'foam' | 'strain' | 'garnish';
export type Vessel = 'short' | 'tall' | 'mug' | 'ceramic' | 'coupe' | 'espresso' | 'rocks';
export type IngredientCategory = 'coffee' | 'milk' | 'spirit' | 'juice' | 'syrup' | 'extra';

export interface Ingredient {
  id: string;
  name: string;
  en: string;
  category: IngredientCategory;
  color: string;
  opacity: number;
  density: number;
  unit: 'ml' | '份' | 'dash';
  icon: 'coffee' | 'milk' | 'bottle' | 'citrus' | 'ice' | 'mint' | 'sugar' | 'bean';
}

const raw: Array<[string, string, string, IngredientCategory, string, number, number, Ingredient['icon'], Ingredient['unit']?]> = [
  ['espresso','浓缩','ESPRESSO','coffee','#462414',0.98,1.02,'coffee'],
  ['water','水','WATER','coffee','#d9eced',0.12,1,'bottle'],
  ['milk','牛奶','MILK','milk','#f6eddb',0.98,1.04,'milk'],
  ['oat','燕麦奶','OAT MILK','milk','#e7d8bd',0.97,1.03,'milk'],
  ['coconut','椰乳','COCONUT','milk','#f8f5e9',0.96,1.03,'milk'],
  ['gin','金酒','GIN','spirit','#dbe6da',0.16,0.96,'bottle'],
  ['vodka','伏特加','VODKA','spirit','#e4e9ef',0.13,0.95,'bottle'],
  ['rum','白朗姆','WHITE RUM','spirit','#e9e3cb',0.18,0.95,'bottle'],
  ['tequila','龙舌兰','TEQUILA','spirit','#e9d7a1',0.28,0.96,'bottle'],
  ['whiskey','波本威士忌','BOURBON','spirit','#a35c20',0.75,0.95,'bottle'],
  ['brandy','干邑','COGNAC','spirit','#ac6329',0.75,0.96,'bottle'],
  ['triple','橙味利口酒','TRIPLE SEC','spirit','#e2b76d',0.35,1.04,'bottle'],
  ['blue','蓝橙利口酒','BLUE CURAÇAO','spirit','#1682c8',0.87,1.08,'bottle'],
  ['coffeeLiqueur','咖啡利口酒','COFFEE LIQUEUR','spirit','#38231e',0.96,1.13,'bottle'],
  ['bitter','苦味开胃酒','BITTER','spirit','#b02528',0.88,1.04,'bottle'],
  ['vermouth','甜红味美思','VERMOUTH','spirit','#8c3828',0.76,1.02,'bottle'],
  ['lime','青柠汁','LIME','juice','#d3d688',0.77,1.03,'citrus'],
  ['lemon','柠檬汁','LEMON','juice','#e6d89a',0.8,1.03,'citrus'],
  ['orange','橙汁','ORANGE','juice','#f8a025',0.95,1.06,'citrus'],
  ['pineapple','菠萝汁','PINEAPPLE','juice','#edce65',0.93,1.05,'citrus'],
  ['soda','苏打水','SODA','juice','#d9e9e1',0.12,1,'bottle'],
  ['tonic','汤力水','TONIC','juice','#dfe8dc',0.17,1.02,'bottle'],
  ['sugar','糖','SUGAR','syrup','#eee1c3',0.3,1.14,'sugar','份'],
  ['syrup','糖浆','SYRUP','syrup','#dbb76a',0.35,1.18,'bottle'],
  ['grenadine','红石榴糖浆','GRENADINE','syrup','#bd143c',0.96,1.3,'bottle'],
  ['berry','莓果糖浆','BERRY','syrup','#913551',0.96,1.2,'bottle'],
  ['chocolate','巧克力酱','CHOCOLATE','syrup','#4b2c20',1,1.26,'bottle'],
  ['bitters','芳香苦精','BITTERS','syrup','#875126',0.75,1.04,'bottle','dash'],
  ['ice','冰块','ICE','extra','#dbe8e6',0.35,0.92,'ice','份'],
  ['mint','薄荷','MINT','extra','#58785a',1,0.4,'mint','份'],
  ['citrus','柑橘片','CITRUS','extra','#f5a12b',1,0.6,'citrus','份'],
  ['beans','咖啡豆','COFFEE BEANS','extra','#62402a',1,0.6,'bean','份'],
];

export const ingredients: Ingredient[] = raw.map(([id,name,en,category,color,opacity,density,icon,unit])=>({id,name,en,category,color,opacity,density,icon,unit:unit??'ml'}));
export const ingredientById = Object.fromEntries(ingredients.map(i=>[i.id,i])) as Record<string,Ingredient>;
export interface RecipeStep { kind: 'add' | Technique; ingredientId?: string; amount?: number; label: string; }
export interface Recipe {
  id: string; name: string; en: string; family: Family; description: string; notes: string;
  vessel: Vessel; capacity: number; special: boolean; minutes: number;
  composition: Record<string, number>; techniques: Technique[]; steps: RecipeStep[];
  color: string; hero: 'latte' | 'sunset' | 'dark' | 'blue' | 'cream' | 'amber';
}
function recipe(id:string,name:string,en:string,family:Family,vessel:Vessel,composition:Record<string,number>,techniques:Technique[],description:string,notes:string,hero:Recipe['hero'],special=false):Recipe {
  if(techniques.includes('shake')&&!composition.ice)composition={...composition,ice:2};
  const steps:RecipeStep[] = Object.entries(composition).map(([ingredientId,amount])=>({kind:'add',ingredientId,amount,label:`加入${ingredientById[ingredientId].name}`}));
  for(const kind of techniques) steps.push({kind,label:({stir:'缓缓搅拌，让风味融合',shake:'摇和，让原料充分融合',foam:'打出细腻奶泡',strain:'滤入成品杯',garnish:'为这杯添一份装饰'})[kind]});
  const liquid=Object.entries(composition).reduce((n,[key,value])=>n+(ingredientById[key].unit==='ml'?value:0),0);
  return {id,name,en,family,vessel,composition,techniques,description,notes,hero,special,minutes:techniques.includes('shake')?3:2,capacity:Math.max(vessel==='espresso'?70:250,Math.ceil((liquid+75)/50)*50),steps,color:({latte:'#c59163',sunset:'#df7a37',dark:'#613f2c',blue:'#4591ab',cream:'#ddc5a3',amber:'#b37b3b'})[hero]};
}

export const recipes:Recipe[] = [
  recipe('iced-latte','冰拿铁','ICED LATTE','coffee','mug',{ice:2,milk:150,espresso:30},[],'浓缩 · 牛奶 · 冰','看浓缩落入牛奶，慢慢展开一朵咖啡云。','latte'),
  recipe('iced-americano','冰美式','ICED AMERICANO','coffee','short',{ice:2,water:120,espresso:60},[],'清爽 · 浓缩与水','轻盈透彻，让咖啡的香气保持清晰。','dark'),
  recipe('flat-white','澳白','FLAT WHITE','coffee','ceramic',{espresso:40,milk:100},['foam'],'细腻 · 微奶泡','浓缩的醇厚，与细腻奶泡恰好相遇。','cream'),
  recipe('cappuccino','卡布奇诺','CAPPUCCINO','coffee','ceramic',{espresso:30,milk:90},['foam'],'绵密 · 丰厚奶泡','一层绵密奶泡，把咖啡香气轻轻留住。','cream'),
  recipe('espresso','浓缩咖啡','ESPRESSO','coffee','espresso',{espresso:30},[],'醇厚 · 浓缩本味','小小一杯，盛放专注而饱满的咖啡香。','dark'),
  recipe('americano','热美式','AMERICANO','coffee','ceramic',{water:120,espresso:30},[],'纯粹 · 温热咖啡','用温水舒展浓缩，留下纯粹的香气。','dark'),
  recipe('latte','热拿铁','CAFFÈ LATTE','coffee','ceramic',{espresso:30,milk:150},['foam'],'柔和 · 温热奶香','奶香与咖啡相融，轻轻覆上一层薄奶泡。','cream'),
  recipe('mocha','摩卡','CAFFÈ MOCHA','coffee','ceramic',{chocolate:20,espresso:30,milk:150},['stir','foam'],'馥郁 · 巧克力与咖啡','巧克力的温柔，让深色风味多一份层次。','latte'),
  recipe('tequila-sunrise','龙舌兰日出','TEQUILA SUNRISE','cocktail','tall',{ice:2,tequila:45,orange:90,grenadine:15},[],'果香 · 落日渐变','沿杯壁轻倒糖浆，让一轮落日在杯中停留。','sunset'),
  recipe('gin-tonic','金汤力','GIN & TONIC','cocktail','tall',{ice:2,gin:45,tonic:120},['stir'],'清冽 · 草本与气泡','少量轻搅，让金酒与气泡轻盈相遇。','cream'),
  recipe('mojito','莫吉托','MOJITO','cocktail','tall',{mint:1,sugar:2,lime:20,ice:2,rum:45,soda:90},['stir'],'清新 · 薄荷与青柠','薄荷、青柠与细密气泡，是一杯清新的夏天。','cream'),
  recipe('daiquiri','代基里','DAIQUIRI','cocktail','coupe',{rum:60,lime:20,sugar:2},['shake','strain'],'明亮 · 朗姆与柑橘','摇和后滤出，用简单配方表达干净的酸甜。','cream'),
  recipe('margarita','玛格丽特','MARGARITA','cocktail','coupe',{tequila:50,triple:20,lime:15},['shake','strain'],'柑橘 · 清晰酸香','橙香利口酒与青柠，把龙舌兰的性格衬得鲜明。','cream'),
  recipe('whiskey-sour','威士忌酸','WHISKEY SOUR','cocktail','rocks',{whiskey:45,lemon:25,syrup:20},['shake','strain'],'酸甜 · 波本暖香','采用无蛋白版本，摇出顺滑的柠檬与波本。','amber'),
  recipe('old-fashioned','古典','OLD FASHIONED','cocktail','rocks',{sugar:1,bitters:2,water:5,ice:2,whiskey:45},['stir'],'醇厚 · 琥珀与橙皮','轻搅冰块，留一点时间给琥珀色的酒香。','amber'),
  recipe('negroni','尼格罗尼','NEGRONI','cocktail','rocks',{ice:2,gin:30,bitter:30,vermouth:30},['stir'],'微苦 · 草本与柑橘','三种风味均衡相拥，留下悠长的微苦。','sunset'),
  recipe('sidecar','边车','SIDECAR','cocktail','coupe',{brandy:50,triple:20,lemon:20},['shake','strain'],'馥郁 · 干邑与柠檬','摇和、滤出，感受干邑与柑橘的层次。','amber'),
  recipe('espresso-martini','浓缩马天尼','ESPRESSO MARTINI','cocktail','coupe',{vodka:50,coffeeLiqueur:30,syrup:10,espresso:30},['shake','strain'],'浓郁 · 咖啡与酒','让咖啡馆与小酒馆，在同一杯里相遇。','dark'),
  recipe('coconut-cloud','椰云拿铁','COCONUT CLOUD','coffee','mug',{ice:2,coconut:150,espresso:30},[],'椰香 · 咖啡云','椰乳铺底，让焦糖色流痕慢慢舒展。','latte',true),
  recipe('orange-coffee','橙光美式','ORANGE COFFEE','coffee','tall',{ice:2,orange:90,espresso:30,soda:60},[],'柑橘 · 轻盈气泡','橙香与咖啡的自由相遇，最后补上一点气泡。','amber',true),
  recipe('sunset-coast','落日海岸','SUNSET COAST','cocktail','tall',{ice:2,tequila:30,orange:60,pineapple:30,grenadine:15},[],'果香 · 酸甜 · 清爽','暖色渐变从杯底展开，像把海边的傍晚留了下来。','sunset',true),
  recipe('island-blue','海岛蓝调','ISLAND BLUE','cocktail','tall',{ice:2,vodka:30,blue:15,lemon:10,soda:90},['stir'],'柑橘 · 清冽蓝调','蓝色流痕与冰块相遇，轻搅成清澈的海岛蓝。','blue',true),
];
export const recipeById=Object.fromEntries(recipes.map(r=>[r.id,r])) as Record<string,Recipe>;
export const categoryLabels:Record<IngredientCategory,string>={coffee:'咖啡',milk:'奶类',spirit:'基酒',juice:'果汁',syrup:'糖浆',extra:'冰与装饰'};
