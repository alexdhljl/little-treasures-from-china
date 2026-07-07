-- Chinese storefront content for products imported before LTPS bilingual fields were active.
-- English source fields are preserved.

update public.products set product_name_zh = name
where coalesce(product_name_zh, '') = '';

update public.products set product_name_zh = '玛雅太阳神开瓶器冰箱贴', short_description_zh = '一款以玛雅太阳意象为灵感的彩色冰箱贴，并结合实用开瓶器功能。', story_zh = '这件轻巧的日常用品重新诠释古代玛雅视觉文化中的几何构图与太阳象征，让文化灵感自然进入家居生活。' where slug = 'maya-sun-deity-bottle-opener-magnet';
update public.products set product_name_zh = '查文图腾冰箱贴', short_description_zh = '一款呈现古代美洲纵向图腾造型的立体冰箱贴。', story_zh = '设计灵感来自古代美洲纪念性石刻形象，将考古艺术中的立体轮廓转化为适合日常陈列的小物。' where slug = 'chavin-totem-fridge-magnet';
update public.products set product_name_zh = '安第斯神鹰文化笔记本', short_description_zh = '黑色精装笔记本，结合压纹图案、文化插画内页与神鹰主题金属装饰。', story_zh = '安第斯神鹰象征天空与高山。这款笔记本将这一文化意象与实用书写页面结合，适合记录、学习与赠礼。' where slug = 'andean-condor-cultural-notebook';
update public.products set product_name_zh = '玛雅世界树周计划本', short_description_zh = '一款以金色线描玛雅世界树装饰的轻薄周计划本。', story_zh = '在玛雅宇宙观中，世界树连接天空、大地与地下世界。它舒展的枝干被转化为优雅而清晰的每周规划设计。' where slug = 'maya-world-tree-weekly-planner';
update public.products set product_name_zh = '玛雅太阳神图案 T 恤', short_description_zh = '黑色图案 T 恤，正面呈现醒目的金色玛雅太阳神灵感图形。', story_zh = '这款服饰将仪式性的太阳意象转化为当代视觉图案，在文化引用与日常穿着之间保持平衡。' where slug = 'maya-sun-deity-graphic-t-shirt';
update public.products set product_name_zh = '玛雅双面神祇钥匙扣', short_description_zh = '圆形双面钥匙扣，两面分别呈现色彩鲜明的玛雅神祇灵感图案。', story_zh = '两幅不同的神祇肖像，让这件小巧配饰成为可以随手转动欣赏的古代美洲视觉文化缩影。' where slug = 'maya-double-sided-deity-keychain';
update public.products set product_name_zh = '3D 网球人物冰箱贴', short_description_zh = '一款手持迷你球拍、造型活泼的 3D 网球人物冰箱贴。', story_zh = '为网球爱好者与运动迷设计，将熟悉的网球与球拍转化为富有表情的家居小物。' where slug = '3d-tennis-character-fridge-magnet';
update public.products set product_name_zh = '玛雅太阳神冰箱贴', short_description_zh = '圆形珐琅质感冰箱贴，以松石色边框围绕金色玛雅太阳神灵感面孔。', story_zh = '太阳意象在古代美洲文化中具有重要意义。这款小巧冰箱贴以宝石般的色彩重新呈现其光辉象征。' where slug = 'maya-sun-god-fridge-magnet';
update public.products set product_name_zh = '熊猫摇摇笔', short_description_zh = '明黄色书写笔，顶部配有身穿条纹服装的熊猫摇摇公仔。', story_zh = '书写时熊猫笔帽会轻轻摇动，为写字、绘画和课堂活动带来一份轻松有趣的陪伴。' where slug = 'wobbling-panda-character-pen';
update public.products set product_name_zh = '熊猫签字笔', short_description_zh = '红色签字笔，顶部配有戴红色小帽的微笑熊猫。', story_zh = '这款熊猫笔把日常书写工具变成友好的桌面伙伴，也是一件轻巧易赠的小礼物。' where slug = 'panda-character-signature-pen';
update public.products set product_name_zh = '熊猫表情橡皮套装', short_description_zh = '盒装三枚熊猫造型橡皮，每只熊猫都有不同的动作与表情。', story_zh = '三个小熊猫角色为铅笔盒与学习桌增添个性，同时保留适合学校和日常书写的实用功能。' where slug = 'panda-expressions-eraser-set';
update public.products set product_name_zh = '双尾虎迷你订书器', short_description_zh = '小巧的松石绿色双尾虎造型订书器，表面带有立体装饰纹样。', story_zh = '活泼的双尾虎形象取意于传统动物纹样，让一件实用办公工具也成为可以收藏的桌面小物。' where slug = 'double-tailed-tiger-mini-stapler';
update public.products set product_name_zh = '小鹿迷你订书器', short_description_zh = '顶部饰有安睡小鹿的迷你订书器，提供柔和的蓝色与奶油色款式。', story_zh = '安静的小鹿造型让普通订书器成为适合书桌、课堂或创意工作空间的温柔装饰。' where slug = 'sleeping-deer-mini-stapler';

update public.products set short_description_zh = '一套以宫廷色彩、珐琅纹样与馆藏日常美学为灵感设计的精致书签。', story_zh = '这套书签取意于故宫的色彩与装饰语言，以适合阅读者、学生、旅行者和博物馆礼品爱好者的方式，让宫廷美学细节进入日常生活。' where slug = 'forbidden-city-enamel-bookmark-set';

update public.products set
  product_name_en = coalesce(nullif(product_name_en, ''), english_name),
  short_description_en = coalesce(short_description_en, short_description),
  story_en = coalesce(story_en, story),
  translation_checked = case when coalesce(product_name_zh, '') <> '' then true else translation_checked end,
  languages = array['en','zh']::text[],
  ltps_version = '1.0';
