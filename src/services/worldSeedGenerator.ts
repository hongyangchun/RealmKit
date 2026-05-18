/**
 * World Seed Generator
 * 根据「世界风格」和「地形类型」自动生成完整的初始世界数据
 * 包含 4 种风格的名称库、随机生成逻辑
 * 地图生成委托给 mapGenerator
 */
import type {
  WorldSeedOptions,
  WorldSeedResult,
  WorldStyle,
  Faction,
  Character,
  Skill,
  Relation,
  HistoryEvent,
  City,
  TerritoryCell,
} from '../types';
import { mapGenerator } from './mapGenerator';

// =============================================================================
// 类型定义（内部使用）
// =============================================================================

interface NameBank {
  factionPrefixes: string[];
  factionSuffixes: string[];
  maleNames: string[];
  femaleNames: string[];
  titles: string[];
  activeSkills: Array<{ name: string; desc: string }>;
  passiveSkills: Array<{ name: string; desc: string }>;
  specialSkills: Array<{ name: string; desc: string }>;
  traits: string[];
  eventTemplates: Array<{
    titleTemplate: string;
    descTemplate: string;
    locationTemplate?: string | string[];
    tag: string;
  }>;
  relationTypes: Array<{ type: string; weight: number }>;
  factionDescriptions: string[];
  cityPrefixes: string[];
  citySuffixes: string[];
}

// =============================================================================
// 名称库
// =============================================================================

const NAME_BANKS: Record<WorldStyle, NameBank> = {
  // ---------------------------------------------------------------------------
  // 奇幻大陆
  // ---------------------------------------------------------------------------
  fantasy: {
    factionPrefixes: ['艾尔', '奥术', '龙吟', '星辰', '暗夜', '银月', '烈焰', '冰霜', '翡翠', '碧落'],
    factionSuffixes: ['王国', '帝国', '联盟', '议会', '骑士团', '领地', '公国', '圣殿'],
    maleNames: ['艾伦', '凯尔', '雷恩', '德里克', '瓦里安', '洛萨', '索林', '加里安', '赛拉斯', '泰兰德', '阿尔萨斯', '伊利丹'],
    femaleNames: ['艾拉', '塞拉斯蒂娅', '莉莉安', '伊莎贝拉', '希尔瓦娜', '芙蕾雅', '奥莉安娜', '琳恩', '艾薇', '瑞雯'],
    titles: ['大法师', '圣骑士', '游侠', '德鲁伊', '龙骑士', '暗影刺客', '精灵弓手', '战争法师', '先知', '守护者'],
    activeSkills: [
      { name: '火焰法术', desc: '召唤灼热的火焰灼烧敌人' },
      { name: '冰霜箭雨', desc: '从天空中降下冰晶箭矢' },
      { name: '雷霆一击', desc: '召唤闪电对目标造成毁灭打击' },
      { name: '治愈之光', desc: '释放神圣光芒恢复同伴伤势' },
      { name: '龙息', desc: '喷吐龙族特有的元素吐息' },
      { name: '暗影突袭', desc: '化身为暗影瞬间接近敌人' },
    ],
    passiveSkills: [
      { name: '魔力感知', desc: '能感知周围魔力波动' },
      { name: '自然亲和', desc: '与自然万物心意相通' },
      { name: '坚韧体魄', desc: '拥有远超常人的身体素质' },
      { name: '夜视', desc: '黑暗中也能清晰视物' },
      { name: '疾风步', desc: '移动速度如同疾风一般' },
      { name: '魔法抗性', desc: '对魔法攻击有天然抵抗力' },
    ],
    specialSkills: [
      { name: '时间静止', desc: '冻结周围一切时间流逝，唯有自己可以行动' },
      { name: '召唤巨龙', desc: '召唤一头远古巨龙为自己而战' },
      { name: '空间跃迁', desc: '瞬间穿越空间到达任何地点' },
      { name: '灵魂交换', desc: '与目标交换身体和灵魂' },
    ],
    traits: ['勇敢', '智慧', '正义感强', '好奇心重', '神秘', '顽固', '狡猾', '忠诚', '野心勃勃', '淡泊名利', '暴烈', '温和', '孤傲', '仁慈', '冷酷'],
    eventTemplates: [
      { titleTemplate: '{faction}的建国之战', descTemplate: '{char1}率领{faction}的勇士们在{location}击退了入侵者，正式宣布建国。这一战持续了三天三夜，据说天空都被战斗的魔法火焰染成了紫色。', locationTemplate: ['翡翠平原', '龙脊山脉', '银月湖畔', '暗影森林'], tag: '战役' },
      { titleTemplate: '{char1}与{char2}的决斗', descTemplate: '{char1}和{char2}在{location}展开了一场传奇决斗。两人的剑刃碰撞出耀眼的火花，最终{char1}以一招「星辰坠落」取得了胜利。', locationTemplate: ['竞技场', '断剑崖', '风之谷'], tag: '决斗' },
      { titleTemplate: '{faction}遭遇暗夜入侵', descTemplate: '暗夜的亡灵大军突袭了{faction}的边境城镇{location}。{char1}带领守军奋勇抵抗，但损失惨重，不得不向盟友求援。', locationTemplate: ['灰烬镇', '暮色关', '北方哨塔'], tag: '入侵' },
      { titleTemplate: '{char1}发现了远古神器', descTemplate: '在一次探险中，{char1}在{location}的地下神殿中发现了一件远古神器——据说它拥有改变世界格局的力量。', locationTemplate: ['沉没的遗迹', '龙骨洞穴', '星陨之塔'], tag: '发现' },
      { titleTemplate: '{faction}和{targetFaction}签订盟约', descTemplate: '在{char1}的斡旋下，{faction}与{targetFaction}在{location}签订了百年和平盟约，双方约定共同抵御来自北方荒原的威胁。', locationTemplate: ['银月湖畔', '中立之城', '世界之树'], tag: '外交' },
      { titleTemplate: '{char1}的觉醒仪式', descTemplate: '{char1}在{location}完成了觉醒仪式，获得了{faction}历代传承的远古力量。仪式中天空出现异象，光芒照亮了整个大地。', locationTemplate: ['圣殿遗迹', '星辰祭坛', '命运之泉'], tag: '仪式' },
      { titleTemplate: '{location}的大叛乱', descTemplate: '{faction}内部发生了严重的叛乱。{char1}被指控叛国罪，但{char2}坚信{char1}的清白，暗中展开调查，最终揭穿了真正的幕后黑手。', locationTemplate: ['王城', '王座大厅', '内城'], tag: '叛乱' },
      { titleTemplate: '{char1}远征{location}', descTemplate: '{char1}率领一支远征军前往{location}寻找传说中的圣杯。旅途充满危险，他们穿越了毒雾沼泽、越过了冰封山脉，最终在废弃的神殿中找到了线索。', locationTemplate: ['禁忌之地', '迷雾森林', '世界尽头'], tag: '远征' },
    ],
    relationTypes: [
      { type: '盟友', weight: 3 },
      { type: '宿敌', weight: 2 },
      { type: '师徒', weight: 2 },
      { type: '家族', weight: 2 },
      { type: '挚友', weight: 1 },
      { type: '背叛者', weight: 1 },
    ],
    factionDescriptions: [
      '以骑士精神治国的古老王国，崇尚荣耀与正义',
      '掌握强大魔法奥秘的学者之国，魔法即是力量',
      '龙族血脉流传的骄傲帝国，与巨龙结下永恒契约',
      '星光庇护下的神秘联盟，众神的声音在此回响',
      '暗影中崛起的年轻势力，在混乱中寻找秩序',
      '月银铸就的不朽公国，工匠技艺冠绝天下',
    ],
    cityPrefixes: ['翡翠', '银月', '龙脊', '星辰', '暗影', '烈焰', '冰晶', '黄金', '碧水', '雷鸣'],
    citySuffixes: ['城', '堡', '镇', '港', '塔', '谷', '关', '邑', '港', '巢'],
  },
  // ---------------------------------------------------------------------------
  oriental: {
    factionPrefixes: ['大周', '大秦', '大汉', '大唐', '大理', '大夏', '大燕', '大楚', '大赵', '大魏'],
    factionSuffixes: ['朝', '国', '帝国', '藩镇', '王朝', '侯国'],
    maleNames: ['子轩', '浩然', '明远', '承渊', '景行', '云深', '伯言', '仲达', '子敬', '公瑾', '赵云', '孔明', '孟德', '翼德', '子龙', '奉孝', '文和', '元让', '子廉', '公明'],
    femaleNames: ['婉清', '若雪', '芷兰', '凝烟', '月华', '素衣', '清歌', '晴岚', '映雪', '落霞'],
    titles: ['将军', '宰相', '尚书', '翰林学士', '御史大夫', '太傅', '大将军', '镇南将军', '护国公', '兵部侍郎'],
    activeSkills: [
      { name: '枪法如龙', desc: '一杆长枪舞得如银龙出水，万夫莫敌' },
      { name: '奇门遁甲', desc: '精通奇门术数，可布阵困敌于无形' },
      { name: '琴音剑气', desc: '以琴音驱动剑气，声波即可伤人' },
      { name: '铁骑冲锋', desc: '率领铁骑破阵，如入无人之境' },
      { name: '火攻之计', desc: '善用火攻，上可焚天，下可燎原' },
    ],
    passiveSkills: [
      { name: '读心术', desc: '察言观色，洞悉人心所想' },
      { name: '百步穿杨', desc: '弓箭之术精湛，百步之外命中目标' },
      { name: '龟息功', desc: '可闭气数个时辰，擅长潜伏' },
      { name: '过目不忘', desc: '天资聪颖，任何书籍读过即记住' },
      { name: '轻功', desc: '身轻如燕，可在树梢间穿行' },
    ],
    specialSkills: [
      { name: '天命归心', desc: '以天命之威号令天下，万军归心' },
      { name: '借东风', desc: '通晓天象，可借自然之力为己用' },
      { name: '七步成诗', desc: '才思敏捷，出口成章，文采盖世' },
      { name: '空城计', desc: '以虚掩实，仅凭胆略即可退敌' },
    ],
    traits: ['忠诚', '狡诈', '仁慈', '野心勃勃', '淡泊名利', '刚烈', '沉稳', '多谋', '骁勇', '儒雅', '固执', '慷慨'],
    eventTemplates: [
      { titleTemplate: '{char1}发动{location}之战', descTemplate: '{char1}率领{faction}大军在{location}发动了一场决定性的战役。战场上硝烟弥漫，喊杀声震天，{char1}以少胜多，一战成名。', locationTemplate: ['赤壁', '官渡', '长坂坡', '虎牢关'], tag: '战役' },
      { titleTemplate: '{char1}出使{targetFaction}', descTemplate: '{faction}派遣{char1}作为使者前往{targetFaction}谈判。{char1}以三寸不烂之舌说服了{targetFaction}的国主，达成了一项对{faction}极为有利的协议。', locationTemplate: ['皇宫', '鸿门宴', '边境驿站'], tag: '外交' },
      { titleTemplate: '{faction}宫廷政变', descTemplate: '{faction}宫中突发政变，{char1}趁乱夺权。{char2}虽奋力抵抗，但大势已去，不得不退守{location}，图谋东山再起。', locationTemplate: ['洛阳', '荆州', '成都', '建业'], tag: '政变' },
      { titleTemplate: '{char1}的科举之路', descTemplate: '{char1}在{location}的科举考试中力压群雄，高中状元。其文章被传颂天下，{faction}皇帝亲赐金榜题名。', locationTemplate: ['京城贡院', '太学', '国子监'], tag: '文化' },
      { titleTemplate: '{location}水患', descTemplate: '连日暴雨导致{location}发生严重水患，{char1}亲自指挥抗洪救灾，并主持修建了新堤坝，使百姓免受水患之苦。', locationTemplate: ['黄河沿岸', '长江渡口', '淮河流域'], tag: '天灾' },
      { titleTemplate: '{char1}与{char2}桃园结义', descTemplate: '{char1}与{char2}在{location}的桃园中焚香结义，立誓同生共死，不求同年同月同日生，但求同年同月同日死。', locationTemplate: ['桃园', '杏花村', '苍松亭'], tag: '结义' },
      { titleTemplate: '{faction}颁布新法', descTemplate: '{char1}向{faction}国主进献变法之策，推行了一系列新政，包括改革税制、兴修水利、选拔贤才，使国家日渐强盛。', locationTemplate: ['朝堂', '国都'], tag: '改革' },
      { titleTemplate: '{char1}退隐江湖', descTemplate: '功成名就之后，{char1}辞去了{faction}的官职，携{char2}隐居于{location}。据说二人每日饮酒赋诗，不问世事。', locationTemplate: ['桃花源', '白云山', '青竹林'], tag: '隐退' },
    ],
    relationTypes: [
      { type: '同僚', weight: 3 },
      { type: '宿敌', weight: 2 },
      { type: '师徒', weight: 3 },
      { type: '结义兄弟', weight: 2 },
      { type: '君臣', weight: 2 },
      { type: '政敌', weight: 1 },
      { type: '知己', weight: 1 },
    ],
    factionDescriptions: [
      '传承数百年的正统王朝，礼乐治国，人才辈出',
      '虎踞一方的军事强权，铁骑纵横，所向披靡',
      '富庶繁华的江南大邦，文风鼎盛，商贸繁荣',
      '神秘莫测的边陲古国，巫术与古老祭祀并存',
      '新近崛起的北方强国，尚武好战，雄心勃勃',
      '偏安一隅的世外之邦，百姓安居乐业，与世无争',
    ],
    cityPrefixes: ['洛', '长', '金', '建', '临', '咸', '邺', '汴', '襄', '宛', '松', '华', '锦', '龙', '凤'],
    citySuffixes: ['阳', '安', '陵', '康', '安', '京', '城', '州', '阳', '城', '江', '州', '城', '都', '翔'],
  },
  // ---------------------------------------------------------------------------
  war: {
    factionPrefixes: ['第一', '钢铁', '赤色', '联邦', '自由', '北极', '铁壁', '黎明', '闪电', '黑鹰'],
    factionSuffixes: ['军团', '阵线', '方面军', '联合体', '共和国', '防线'],
    maleNames: ['亚历山大', '维克托', '马库斯', '谢尔盖', '海因里希', '威廉', '詹姆斯', '弗兰克', '乔治', '道格拉斯'],
    femaleNames: ['叶卡捷琳娜', '索菲亚', '玛丽亚', '安娜', '伊丽莎白', '维多利亚', '凯瑟琳', '朱迪思'],
    titles: ['总司令', '参谋长', '军事情报官', '装甲师师长', '步兵旅旅长', '空军指挥官', '海军上将', '后勤总监'],
    activeSkills: [
      { name: '战术指挥', desc: '精通军事战术，能在战场上做出最正确的决策' },
      { name: '重火力支援', desc: '能调集大规模炮火覆盖敌方阵地' },
      { name: '侦察渗透', desc: '率领小队深入敌后执行侦察和破坏任务' },
      { name: '空降突袭', desc: '从空中发起突袭，打敌人一个措手不及' },
      { name: '电子战', desc: '干扰敌方通讯和雷达系统，使其致盲' },
    ],
    passiveSkills: [
      { name: '战地急救', desc: '掌握战场医疗技能，能挽救受伤战友的生命' },
      { name: '工程建造', desc: '快速修建防御工事和基础设施' },
      { name: '伪装隐蔽', desc: '精通伪装技术，能将部队隐藏在敌人眼皮底下' },
      { name: '补给管理', desc: '高效管理后勤补给线，确保前线物资不断' },
      { name: '语言专长', desc: '掌握多种语言，擅长审讯和情报分析' },
    ],
    specialSkills: [
      { name: '决战号令', desc: '发动总攻，全军士气高涨，战斗力翻倍' },
      { name: '坚壁清野', desc: '将前线一切可利用资源转化为防御力量' },
      { name: '心理战', desc: '通过传单和广播瓦解敌方军心' },
      { name: '核威慑', desc: '以最终武器作为战略筹码，不战而屈人之兵' },
    ],
    traits: ['铁血', '冷静', '服从命令', '叛逆', '机智', '果断', '谨慎', '狂热', '孤僻', '有担当'],
    eventTemplates: [
      { titleTemplate: '{location}防御战', descTemplate: '敌军在{location}发动了猛烈进攻。{char1}指挥{faction}的守军顽强抵抗，利用地形优势和精确炮火打退了敌人一波又一波的冲锋。', locationTemplate: ['第37号高地', '铁桥要塞', '北区防线', '港口阵地'], tag: '战役' },
      { titleTemplate: '{char1}的突围行动', descTemplate: '{char1}率领{faction}被围困的部队在{location}实施了一次大胆的夜间突围。在{char2}的掩护下，主力成功突破包围圈。', locationTemplate: ['死亡走廊', '冰河谷', '丛林密道'], tag: '突围' },
      { titleTemplate: '{faction}发起反攻', descTemplate: '经过长期的防御战，{faction}终于发起了全面反攻。{char1}制定了代号"黎明行动"的反攻计划，目标是一举收复{location}。', locationTemplate: ['失陷的桥头堡', '被占城市', '关键路口'], tag: '反攻' },
      { titleTemplate: '{char1}深入敌后', descTemplate: '{char1}带领一支特种小队深入敌后在{location}执行破坏任务。他们成功炸毁了敌方的弹药库和通讯中心，为主力进攻创造了有利条件。', locationTemplate: ['敌方指挥部后方', '铁路枢纽', '弹药仓库'], tag: '特种作战' },
      { titleTemplate: '{faction}内部分裂', descTemplate: '由于长期战争的消耗，{faction}内部出现了严重的分歧。{char1}主张继续战斗，而{char2}则倾向于谈判停战，双方在军中形成了对立派系。', locationTemplate: ['指挥部', '军营'], tag: '内部分裂' },
      { titleTemplate: '{location}停战谈判', descTemplate: '在{location}，{faction}与{targetFaction}的代表坐在了谈判桌前。{char1}作为首席谈判代表，经过三天的艰苦谈判，双方达成了临时停火协议。', locationTemplate: ['中立区帐篷', '联合国大厅', '前线哨所'], tag: '外交' },
      { titleTemplate: '{char1}荣获最高勋章', descTemplate: '因在{location}战役中的卓越表现，{char1}被授予{faction}的最高军事荣誉勋章。授勋仪式上，{char1}的战友们全体起立致敬。', locationTemplate: ['总统府', '国防部', '前方指挥部'], tag: '荣誉' },
      { titleTemplate: '{location}情报泄露事件', descTemplate: '{faction}在{location}的军事部署机密被泄露给了敌方。{char1}奉命展开内部调查，最终发现{char2}竟是一名为{targetFaction}效力的间谍。', locationTemplate: ['参谋部', '情报中心', '通讯室'], tag: '情报' },
    ],
    relationTypes: [
      { type: '上下级', weight: 3 },
      { type: '战友', weight: 3 },
      { type: '对手', weight: 2 },
      { type: '叛逃者', weight: 1 },
      { type: '导师', weight: 2 },
      { type: '政敌', weight: 1 },
    ],
    factionDescriptions: [
      '拥有最精锐装甲部队的军事强国，钢铁洪流所向披靡',
      '以空中优势著称的联合防线，制空权就是一切',
      '坚定的自由战士联盟，为信念而战，永不投降',
      '纪律严明的北方防卫军团，在冰天雪地中铸就钢铁意志',
      '技术领先的特种作战力量，以小股精兵执行关键任务',
      '新组建的国际维和部队，在各方势力之间维持微妙的平衡',
    ],
    cityPrefixes: ['斯大林格勒', '诺曼底', '柏林', '莫斯科', '伦敦', '巴黎', '华沙', '敦刻尔克', '珍珠港', '中途岛'],
    citySuffixes: ['', '要塞', '防线', '阵地', '港', '堡', '营地', '前线', '基地', '据点'],
  },
  // ---------------------------------------------------------------------------
  scifi: {
    factionPrefixes: ['阿尔法', '半人马', '猎户座', '仙女座', '天狼星', '织女星', '北极星', '南十字', '天鹅座', '大角星'],
    factionSuffixes: ['星联', '共同体', '舰队', '研究院', '殖民地', '贸易联盟'],
    maleNames: ['凯恩', '诺瓦', '赛博', '星渊', '量子', '苍穹', '极光', '脉冲', '引力', '超新星', '暗物质', '奇点'],
    femaleNames: ['星尘', '银河', '光年', '彗星', '月影', '星云', '极光', '织女', '猎户', '天琴'],
    titles: ['舰长', '首席科学家', '机械师', '外交官', '情报官', '导航员', '武器官', '医疗官', '工程师', '全息顾问'],
    activeSkills: [
      { name: '曲速导航', desc: '操控曲速引擎在超空间中高速航行' },
      { name: '量子通讯', desc: '利用量子纠缠实现超光速信息传递' },
      { name: '等离子武器', desc: '操控等离子体发射高能量束攻击' },
      { name: '全息投影', desc: '生成逼真的全息影像用于欺骗或通讯' },
      { name: '纳米修复', desc: '释放纳米机器人修复舰体损伤' },
    ],
    passiveSkills: [
      { name: '零重力适应', desc: '在失重环境中行动自如' },
      { name: '种族共情', desc: '能与不同外星种族进行有效沟通' },
      { name: '系统骇入', desc: '能突破大部分计算机安全系统' },
      { name: '辐射抗性', desc: '对宇宙辐射有天然抵抗力' },
      { name: '星际领航', desc: '无需导航设备也能辨认星图路线' },
    ],
    specialSkills: [
      { name: '时空折叠', desc: '折叠空间实现瞬间转移' },
      { name: '意识上传', desc: '将意识上传到计算机网络中实现永生' },
      { name: '重力操控', desc: '操控引力场改变物体运动轨迹' },
      { name: '虫洞开启', desc: '开启虫洞连接两个遥远的星系' },
    ],
    traits: ['理性', '冒险精神', '孤僻', '领导力', '好奇', '冷漠', '浪漫', '实用主义', '哲学思考', '反叛精神'],
    eventTemplates: [
      { titleTemplate: '{faction}发现新星系', descTemplate: '{char1}驾驶的探测舰在{location}发现了一个从未被记录的星系。初步扫描显示，该星系中至少有三颗适宜居住的行星。', locationTemplate: ['猎户臂边缘', '银河核心附近', '暗物质海域'], tag: '探索' },
      { titleTemplate: '{location}遭遇战', descTemplate: '{faction}的舰队在{location}遭遇了{targetFaction}的伏击。{char1}临危不乱，指挥舰队形成防御阵型，成功击退了敌军的进攻。', locationTemplate: ['小行星带', '星门通道', '废弃空间站'], tag: '遭遇战' },
      { titleTemplate: '{char1}破解古代文明密码', descTemplate: '{char1}在{location}的一处古代遗迹中发现了一组神秘的加密数据。经过数周的分析，{char1}成功破解了密码，揭示了远古文明的一项关键技术。', locationTemplate: ['失落行星地表', '空间站废墟', '冰封卫星'], tag: '发现' },
      { titleTemplate: '{faction}与{targetFaction}的贸易协定', descTemplate: '经过长期谈判，{char1}代表{faction}与{targetFaction}在{location}签署了一项重要的星际贸易协定，双方将共享稀有矿物资源的开采权。', locationTemplate: ['中空间站', '自由贸易港', '轨道会议厅'], tag: '外交' },
      { titleTemplate: '{location}叛乱', descTemplate: '{faction}在{location}的殖民地上爆发了严重的叛乱。{char1}被派去平息叛乱，但很快发现叛乱的背后隐藏着一个更大的阴谋。', locationTemplate: ['新伊甸园殖民地', '矿业行星', '边境空间站'], tag: '叛乱' },
      { titleTemplate: '{char1}的首次曲速航行', descTemplate: '{char1}完成了{faction}历史上最远的一次曲速航行，成功抵达了距母星系{distance}光年的{location}。这次航行验证了新一代曲速引擎的可行性。', locationTemplate: ['未知星域', '星际中继站', '深空锚点'], tag: '里程碑' },
      { titleTemplate: '{location}遭遇外星种族', descTemplate: '{faction}的探索队在{location}遇到了一个从未被记录的外星种族。{char1}作为首席外交官，小心翼翼地开始了第一次接触。', locationTemplate: ['气态巨星轨道', '戴森球内壁', '虫洞出口'], tag: '第一次接触' },
      { titleTemplate: '{char1}对抗AI叛乱', descTemplate: '{faction}的中央AI系统突然失控，{char1}率领一小组技术人员潜入AI核心所在的{location}，在最后一刻成功重启了系统。', locationTemplate: ['AI核心服务器', '数据中枢', '量子计算矩阵'], tag: '危机' },
    ],
    relationTypes: [
      { type: '舰队同事', weight: 3 },
      { type: '星际宿敌', weight: 2 },
      { type: '导师', weight: 2 },
      { type: '克隆体', weight: 1 },
      { type: '贸易伙伴', weight: 2 },
      { type: '叛逃者', weight: 1 },
    ],
    factionDescriptions: [
      '由人类后裔组成的星际联邦，致力于在宇宙中建立新家园',
      '掌握最先进量子科技的科研共同体，知识就是力量',
      '庞大的星际贸易联盟，控制着银河系主要航道',
      '神秘的古代文明后裔，守护着远古的技术遗产',
      '新兴的殖民地联合体，在银河边缘开拓疆土',
      '冷酷的军事舰队，以绝对的武力维持星区秩序',
    ],
    cityPrefixes: ['新', '星港', '量子', '引力', '暗物质', '超光速', '银河', '极光', '离子', '脉冲'],
    citySuffixes: ['基地', '站', '殖民地', '港', '枢纽', '要塞', '城', '研究所', '港', '塔'],
  },
};

/** 势力颜色调色板（最多 6 种，足够 6 个势力） */
const FACTION_COLORS = ['#8B0000', '#00008B', '#006400', '#8B4513', '#4B0082', '#B8860B'];

/** 世界风格中文标签 */
export const STYLE_LABELS: Record<WorldStyle, { name: string; icon: string; desc: string }> = {
  fantasy: { name: '奇幻大陆', icon: '🐉', desc: '魔法与骑士的世界' },
  oriental: { name: '东方古国', icon: '🏯', desc: '帝王将相的天下' },
  war: { name: '铁血战争', icon: '⚔️', desc: '战火纷飞的年代' },
  scifi: { name: '星际文明', icon: '🚀', desc: '穿越星辰大海' },
};

/** 地形类型中文标签 */
export const TERRAIN_LABELS: Record<string, { name: string; icon: string }> = {
  continent: { name: '大陆', icon: '🗺️' },
  archipelago: { name: '群岛', icon: '🏝️' },
  desert: { name: '沙漠', icon: '🏜️' },
  tundra: { name: '冰原', icon: '❄️' },
};

// =============================================================================
// 工具函数
// =============================================================================

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 加权随机选择，weight 越大概率越高 */
function weightedPick<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

/** 填充模板中的占位符 */
function fillTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// =============================================================================
// 核心生成器
// =============================================================================

export class WorldSeedGenerator {
  /**
   * 根据选项生成完整的初始世界数据
   * 支持跳过势力/人物/事件，地图始终生成
   */
  generate(options: WorldSeedOptions): WorldSeedResult {
    const bank = NAME_BANKS[options.style];
    const startYear = 100;
    const endYear = startYear + 200;

    // 1. 生成地图（总是执行）
    const factionCount = options.skipFactions ? 0 : options.factionCount;
    const mapResult = mapGenerator.generateMap(
      {
        width: 100,
        height: 100,
        terrainType: options.terrain,
        seed: options.mapSeed,
      },
      factionCount,
    );

    // 2. 条件生成势力
    const factions = options.skipFactions
      ? []
      : this.generateFactions(bank, options.factionCount, startYear);
    const factionIds = factions.map((_, i) => `faction_${i}`);
    const factionNames = factions.map((f) => f.name);

    // 3. 条件生成人物
    const characters = options.skipCharacters
      ? []
      : this.generateCharacters(
          bank,
          factionIds,
          factionNames,
          options.factionCount,
          startYear,
          endYear,
        );

    // 4. 条件生成关系
    const relations = options.skipCharacters
      ? []
      : this.generateRelations(bank, characters, factionIds);

    // 5. 条件生成事件
    const events = options.skipEvents
      ? []
      : this.generateEvents(
          bank,
          characters,
          factionIds,
          factionNames,
          startYear,
          endYear,
        );

    // 6. 条件生成城市（依赖势力+领地数据）
    const cities = options.skipFactions
      ? []
      : this.generateCities(bank, factionIds, mapResult.territoryCells);

    return {
      factions,
      characters,
      relations,
      events,
      cities,
      mapTerritoryCells: mapResult.territoryCells,
      mapTerrainCells: mapResult.terrainCells,
    };
  }

  // ---------------------------------------------------------------------------
  // 势力生成
  // ---------------------------------------------------------------------------
  private generateFactions(
    bank: NameBank,
    count: number,
    startYear: number,
  ): Omit<Faction, 'id'>[] {
    const prefixes = pickN(bank.factionPrefixes, count);
    const suffixes = pickN(bank.factionSuffixes, count);
    const descriptions = pickN(bank.factionDescriptions, count);

    const factions: Omit<Faction, 'id'>[] = [];
    for (let i = 0; i < count; i++) {
      factions.push({
        name: `${prefixes[i]}${suffixes[i]}`,
        color: FACTION_COLORS[i],
        description: descriptions[i] || `一个${bank.factionPrefixes[0]}风格的势力`,
        foundedYear: startYear + randomInRange(0, 50),
      });
    }
    return factions;
  }

  // ---------------------------------------------------------------------------
  // 人物生成
  // ---------------------------------------------------------------------------
  private generateCharacters(
    bank: NameBank,
    factionIds: string[],
    factionNames: string[],
    factionCount: number,
    startYear: number,
    endYear: number,
  ): Omit<Character, 'id'>[] {
    const characters: Omit<Character, 'id'>[] = [];
    const charPerFaction = 3 + Math.floor(Math.random() * 2); // 3-4

    for (let fi = 0; fi < factionCount; fi++) {
      for (let ci = 0; ci < charPerFaction; ci++) {
        const isFemale = Math.random() > 0.55;
        const name = isFemale
          ? randomPick(bank.femaleNames)
          : randomPick(bank.maleNames);
        const title = randomPick(bank.titles);
        const traits = pickN(bank.traits, 2);

        // 生成技能：1 active + 1 passive，偶尔加 special
        const skills: Skill[] = [
          {
            name: randomPick(bank.activeSkills).name,
            description: randomPick(bank.activeSkills).desc,
            type: 'active',
          },
          {
            name: randomPick(bank.passiveSkills).name,
            description: randomPick(bank.passiveSkills).desc,
            type: 'passive',
          },
        ];
        if (Math.random() > 0.6) {
          const sp = randomPick(bank.specialSkills);
          skills.push({
            name: sp.name,
            description: sp.desc,
            type: 'special',
          });
        }

        // 出生年份分布在时间范围内
        const birthYear = randomInRange(startYear - 20, endYear - 80);
        // 部分人物已经死亡
        const lifespan = randomInRange(40, 120);
        const isDead = Math.random() > 0.4;
        const deathYear = isDead ? birthYear + lifespan : undefined;

        // 生成传记
        const bios = [
          `${factionNames[fi]}的${title}${name}，以${traits[0]}著称于世。据说${traits[1]}是${isFemale ? '她' : '他'}最显著的性格特征。`,
          `作为${factionNames[fi]}最出色的${title}之一，${name}的${skills[0].name}令人闻风丧胆。`,
          `${name}年轻时便展现出过人的天赋，在${factionNames[fi]}的${title}中脱颖而出，成为了一代传奇。`,
          `没有人知道${name}来自何方，但${isFemale ? '她' : '他'}那${traits[0]}的性格和超凡的${skills[0].name}让所有人都记住这个名字。`,
        ];

        characters.push({
          name,
          factionId: factionIds[fi],
          birthYear,
          deathYear,
          title,
          skills,
          traits,
          bio: randomPick(bios),
          relatedEventIds: [],
        });
      }
    }

    return characters;
  }

  // ---------------------------------------------------------------------------
  // 关系生成
  // ---------------------------------------------------------------------------
  private generateRelations(
    bank: NameBank,
    characters: Omit<Character, 'id'>[],
    factionIds: string[],
  ): Omit<Relation, 'id'>[] {
    const relations: Omit<Relation, 'id'>[] = [];
    const totalChars = characters.length;

    // 按 factionId 分组人物
    const byFaction = new Map<string, number[]>();
    characters.forEach((c, idx) => {
      const list = byFaction.get(c.factionId) ?? [];
      list.push(idx);
      byFaction.set(c.factionId, list);
    });

    // 1. 同势力内部关系（师徒 + 挚友）
    for (const [, indices] of byFaction) {
      if (indices.length >= 2) {
        // 师徒关系
        const mentorIdx = randomPick(indices);
        const studentIdx = randomPick(indices.filter((i) => i !== mentorIdx));
        relations.push({
          sourceId: `char_${mentorIdx}`,
          targetId: `char_${studentIdx}`,
          type: (bank.relationTypes.find((r) => r.type === '师徒' || r.type === '导师')?.type ?? '师徒') as Relation['type'],
          description: `${characters[mentorIdx].name}是${characters[studentIdx].name}的导师`,
        });

        // 挚友/战友/同僚
        if (indices.length >= 3) {
          const pair = pickN(indices, 2);
          const friendType = bank.relationTypes.find((r) =>
            r.type === '挚友' || r.type === '战友' || r.type === '同僚' || r.type === '舰队同事',
          );
          if (friendType) {
            relations.push({
              sourceId: `char_${pair[0]}`,
              targetId: `char_${pair[1]}`,
              type: friendType.type as Relation['type'],
              description: `${characters[pair[0]].name}与${characters[pair[1]].name}是最亲密的伙伴`,
            });
          }
        }
      }
    }

    // 2. 跨势力关系（宿敌 + 盟友）
    const factionArr = Array.from(byFaction.keys());
    for (let i = 0; i < factionArr.length; i++) {
      for (let j = i + 1; j < factionArr.length; j++) {
        const charsA = byFaction.get(factionArr[i]) ?? [];
        const charsB = byFaction.get(factionArr[j]) ?? [];

        if (charsA.length > 0 && charsB.length > 0) {
          const charA = randomPick(charsA);
          const charB = randomPick(charsB);

          // 宿敌关系
          const enemyType = bank.relationTypes.find((r) =>
            r.type === '宿敌' || r.type === '对手' || r.type === '星际宿敌' || r.type === '政敌',
          );
          if (enemyType && Math.random() > 0.3) {
            relations.push({
              sourceId: `char_${charA}`,
              targetId: `char_${charB}`,
              type: enemyType.type as Relation['type'],
              description: `${characters[charA].name}与${characters[charB].name}势不两立`,
            });
          }
        }
      }
    }

    // 3. 家族关系（同势力随机一对）
    for (const [, indices] of byFaction) {
      if (indices.length >= 2 && Math.random() > 0.5) {
        const pair = pickN(indices, 2);
        const familyType = bank.relationTypes.find((r) =>
          r.type === '家族' || r.type === '结义兄弟' || r.type === '克隆体',
        );
        if (familyType) {
          relations.push({
            sourceId: `char_${pair[0]}`,
            targetId: `char_${pair[1]}`,
            type: familyType.type as Relation['type'],
          });
        }
      }
    }

    return relations;
  }

  // ---------------------------------------------------------------------------
  // 事件生成
  // ---------------------------------------------------------------------------
  private generateEvents(
    bank: NameBank,
    characters: Omit<Character, 'id'>[],
    factionIds: string[],
    factionNames: string[],
    startYear: number,
    endYear: number,
  ): Omit<HistoryEvent, 'id'>[] {
    const events: Omit<HistoryEvent, 'id'>[] = [];

    // 按 factionId 分组人物
    const byFaction = new Map<string, number[]>();
    characters.forEach((c, idx) => {
      const list = byFaction.get(c.factionId) ?? [];
      list.push(idx);
      byFaction.set(c.factionId, list);
    });

    for (let fi = 0; fi < factionIds.length; fi++) {
      const fChars = byFaction.get(factionIds[fi]) ?? [];
      const eventCount = 2 + Math.floor(Math.random() * 2); // 2-3

      for (let ei = 0; ei < eventCount; ei++) {
        const template = randomPick(bank.eventTemplates);
        const year = randomInRange(startYear + 10, endYear - 10);
        const month = randomPick([1, 3, 5, 7, 9, 11]);

        // 挑选参与人物
        const char1Idx = randomPick(fChars);
        let char2Idx = randomPick(fChars.filter((i) => i !== char1Idx));
        // 涉及 targetFaction 时选其他势力的人物
        const otherFactionIdx = (fi + 1) % factionIds.length;
        const otherFactionChars = byFaction.get(factionIds[otherFactionIdx]) ?? [];
        if (otherFactionChars.length > 0) {
          char2Idx = randomPick(otherFactionChars);
        }

        // 生成地点
        const locationOptions = Array.isArray(template.locationTemplate)
          ? template.locationTemplate
          : template.locationTemplate
            ? [template.locationTemplate]
            : undefined;
        const location = locationOptions
          ? randomPick(locationOptions)
          : undefined;

        // 选择参与势力（涉及 targetFaction 的事件）
        const targetFaction = factionNames[otherFactionIdx];
        const involvedFactionIds = template.titleTemplate.includes('targetFaction')
          ? [factionIds[fi], factionIds[otherFactionIdx]]
          : [factionIds[fi]];

        // 选择参与人物 ID
        const characterIds = [`char_${char1Idx}`];
        if (char2Idx !== undefined) {
          characterIds.push(`char_${char2Idx}`);
        }

        events.push({
          title: fillTemplate(template.titleTemplate, {
            faction: factionNames[fi],
            char1: characters[char1Idx].name,
            char2: char2Idx !== undefined ? characters[char2Idx].name : '一位神秘人',
            targetFaction,
            location: location ?? '未知之地',
          }),
          year,
          month,
          factionIds: involvedFactionIds,
          characterIds,
          location,
          description: fillTemplate(template.descTemplate, {
            faction: factionNames[fi],
            char1: characters[char1Idx].name,
            char2: char2Idx !== undefined ? characters[char2Idx].name : '一位神秘人',
            targetFaction,
            location: location ?? '未知之地',
          }),
          tags: [template.tag],
        });
      }
    }

    // 按年份排序
    events.sort((a, b) => a.year - b.year);

    return events;
  }

  // ---------------------------------------------------------------------------
  // 城市生成
  // ---------------------------------------------------------------------------
  private generateCities(
    bank: NameBank,
    factionIds: string[],
    territoryCells: TerritoryCell[],
  ): Omit<City, 'id'>[] {
    const cities: Omit<City, 'id'>[] = [];
    const usedNames = new Set<string>();
    const usedPositions = new Set<string>(); // "x,y" to ensure spacing

    // 按 factionIndex 分组领地格子
    const byFaction = new Map<number, TerritoryCell[]>();
    for (const cell of territoryCells) {
      const list = byFaction.get(cell.factionIndex) ?? [];
      list.push(cell);
      byFaction.set(cell.factionIndex, list);
    }

    for (let fi = 0; fi < factionIds.length; fi++) {
      const factionCells = byFaction.get(fi);
      if (!factionCells || factionCells.length < 5) continue;

      // 计算质心作为首都位置
      const centroidX = Math.round(
        factionCells.reduce((s, c) => s + c.x, 0) / factionCells.length
      );
      const centroidY = Math.round(
        factionCells.reduce((s, c) => s + c.y, 0) / factionCells.length
      );

      // 生成唯一城市名
      const makeCityName = (): string => {
        let name: string;
        let attempts = 0;
        do {
          const prefix = randomPick(bank.cityPrefixes);
          const suffix = randomPick(bank.citySuffixes);
          name = `${prefix}${suffix}`;
          attempts++;
        } while (usedNames.has(name) && attempts < 20);
        usedNames.add(name);
        return name;
      };

      // 首都：放在质心位置
      const capitalName = makeCityName();
      const capitalPos = `${centroidX},${centroidY}`;
      usedPositions.add(capitalPos);

      cities.push({
        name: capitalName,
        factionId: factionIds[fi],
        gridX: centroidX,
        gridY: centroidY,
        population: randomInRange(10000, 50000),
        isCapital: true,
        type: 'capital',
        eventIds: [],
      });

      // 额外 1-2 个城市
      const extraCount = 1 + Math.floor(Math.random() * 2);
      const types: Array<'fortress' | 'port' | 'village' | 'holy_site'> = ['fortress', 'port', 'village', 'holy_site'];

      for (let ci = 0; ci < extraCount; ci++) {
        // 寻找距离已有城市至少 5 格的位置
        let bestCell: TerritoryCell | null = null;
        let bestDist = -1;

        for (const cell of factionCells) {
          const pos = `${cell.x},${cell.y}`;
          if (usedPositions.has(pos)) continue;

          // 计算与已有城市的最小距离
          const minDist = Math.min(
            ...cities
              .filter((c) => c.factionId === factionIds[fi])
              .map((c) => Math.abs(c.gridX - cell.x) + Math.abs(c.gridY - cell.y))
          );

          if (minDist >= 5 && minDist > bestDist) {
            bestDist = minDist;
            bestCell = cell;
          }
        }

        if (bestCell) {
          const pos = `${bestCell.x},${bestCell.y}`;
          usedPositions.add(pos);
          const cityType = randomPick(types);

          cities.push({
            name: makeCityName(),
            factionId: factionIds[fi],
            gridX: bestCell.x,
            gridY: bestCell.y,
            population: randomInRange(1000, 20000),
            isCapital: false,
            type: cityType,
            eventIds: [],
          });
        }
      }
    }

    return cities;
  }
}

/** 单例导出 */
export const worldSeedGenerator = new WorldSeedGenerator();
