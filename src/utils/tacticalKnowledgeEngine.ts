import {
  FormationType,
  TacticalStyle,
  TacticalMentality,
  PassingStyle,
  PressingIntensity,
  CoachingLicenseTier,
  Player,
  TeamTactics,
  TacticalMatchReport,
  ManagerProfile,
  Club,
} from '../types/game';

// ============================================================================
// 1. FORMATION DEFINITIONS & LICENSING SPECIFICATION (26 Formations)
// ============================================================================

export interface FormationMeta {
  id: FormationType;
  nameArabic: string;
  nameEnglish: string;
  minLicense: CoachingLicenseTier;
  archetype: 'basic' | 'modern' | 'wide' | 'fluid' | 'defensive' | 'mastermind';
  descriptionArabic: string;
  strengthsArabic: string;
  weaknessesArabic: string;
  keyAttributesNeeded: string[];
}

export const ALL_FORMATIONS: Record<FormationType, FormationMeta> = {
  // --- BASELINE / D LICENSE (3 Core Formations) ---
  '4-4-2': {
    id: '4-4-2',
    nameArabic: '4-4-2 الكلاسيكية المتوازنة',
    nameEnglish: '4-4-2 Flat Classic',
    minLicense: 'D',
    archetype: 'basic',
    descriptionArabic: 'التشكيل التقليدي الأكثر توازناً وانتشاراً؛ خطان مستقيمان يوفران تغطية متكاملة لعمق وأطراف الملعب.',
    strengthsArabic: 'صلابة دفاعية سهلة التطبيق، وتواجد مهاجمين اثنين في صندوق المنافس.',
    weaknessesArabic: 'نقص عددي محتمل في دائرة المنتصف (2 ضد 3) أمام الخطط ثلاثية الوسط.',
    keyAttributesNeeded: ['stamina', 'physical', 'defending'],
  },
  '4-3-3': {
    id: '4-3-3',
    nameArabic: '4-3-3 الهجومية المرنة',
    nameEnglish: '4-3-3 Standard Attacking',
    minLicense: 'D',
    archetype: 'basic',
    descriptionArabic: 'مثلث ارتكاز مع جناحين سريعين ومهاجم صريح، تمنح هيمنة على الوسط وتمدداً هجومياً واسعاً.',
    strengthsArabic: 'تحكم عالي في الاستحواذ وسرعة التحول إلى الهجوم عبر الأروقة.',
    weaknessesArabic: 'المساحات خلف الأظهرة المتقدمة قد يستغلها المنافس بالمرتدات السريعة.',
    keyAttributesNeeded: ['pace', 'passing', 'dribbling'],
  },
  '4-5-1': {
    id: '4-5-1',
    nameArabic: '4-5-1 الدفاعية المكثفة',
    nameEnglish: '4-5-1 Compact Midfield',
    minLicense: 'D',
    archetype: 'basic',
    descriptionArabic: 'خماسي في خط الوسط لغلق كافة ممرات التمرير وخنق خط وسط المنافس والاعتماد على هجمات مرتدة حذرة.',
    strengthsArabic: 'كثافة حديدية في الوسط وصعوبة اختراق الدفاع بالكرات القصيرة.',
    weaknessesArabic: 'عزلة المهاجم الوحيد في الأمام وقلة المساندة الهجومية السريعة.',
    keyAttributesNeeded: ['defending', 'stamina', 'physical'],
  },

  // --- C LICENSE (3 Modern Tactical Systems) ---
  '4-2-3-1': {
    id: '4-2-3-1',
    nameArabic: '4-2-3-1 المحورية الحديثة',
    nameEnglish: '4-2-3-1 Modern Pivot',
    minLicense: 'C',
    archetype: 'modern',
    descriptionArabic: 'التشكيل العصري الأكثر توازناً بوجود ثنائي ارتكاز (Double Pivot) وصانع ألعاب رقم 10 خلف المهاجم.',
    strengthsArabic: 'حماية ممتازة لقلبي الدفاع مع خط هجومي رباعي ديناميكي قادر على الضغط والابداع.',
    weaknessesArabic: 'تتطلب صانع ألعاب ذو رؤية استثنائية وأظهرة ذات لياقة بدنية عالية.',
    keyAttributesNeeded: ['passing', 'vision', 'stamina'],
  },
  '3-5-2': {
    id: '3-5-2',
    nameArabic: '3-5-2 الإيطالية بالأظهرة الطائرة',
    nameEnglish: '3-5-2 Wingback Dominance',
    minLicense: 'C',
    archetype: 'modern',
    descriptionArabic: 'ثلاثي دفاعي صلب مع ظهيرين جناحين (Wingbacks) ومهاجمين متكاملين؛ تمنح كثافة لا تضاهى في الوسط.',
    strengthsArabic: 'السيطرة الكاملة على معركة الوسط وتفوق هجومي بوجود ثنائي هجومي متناغم.',
    weaknessesArabic: 'إرهاق بدني هائل للأظهرة الطائرة ومساحات في الأطراف حال التأخر في الارتداد.',
    keyAttributesNeeded: ['stamina', 'physical', 'pace'],
  },
  '4-4-1-1': {
    id: '4-4-1-1',
    nameArabic: '4-4-1-1 المهاجم المتأخر (Shadow Striker)',
    nameEnglish: '4-4-1-1 Shadow Striker',
    minLicense: 'C',
    archetype: 'modern',
    descriptionArabic: 'تطوير تكتيكي للـ 4-4-2 بوضع مهاجم متأخر يتحرك في المساحة بين خطوط دفاع ووسط الخصم (Between the lines).',
    strengthsArabic: 'مفاجأة دفاع المنافس بقدوم المهاجم الثاني من الخلف، واستقرار دفاعي متماسك.',
    weaknessesArabic: 'تتطلب مهارة مراوغة وتسديد دقيقة من المهاجم الحر لفتح الثغرات.',
    keyAttributesNeeded: ['shooting', 'dribbling', 'passing'],
  },

  // --- B LICENSE (8 Advanced Formations) ---
  '3-4-3': {
    id: '3-4-3',
    nameArabic: '3-4-3 الهجومية الكاسحة',
    nameEnglish: '3-4-3 Wide Attack',
    minLicense: 'B',
    archetype: 'wide',
    descriptionArabic: 'خطة هجومية شجاعة تخلق مثلثات لعب في كل مكان وتضغط على الخصم بستة لاعبين عند امتلاك الكرة.',
    strengthsArabic: 'قوة تهديفية مرعبة وزيادة عددية هائلة في ثلث الخصم الهجومي.',
    weaknessesArabic: 'مخاطرة دفاعية عند انقطاع الكرة ضد الأندية التي تجيد الكرات الطولية.',
    keyAttributesNeeded: ['pace', 'shooting', 'stamina'],
  },
  '3-4-2-1': {
    id: '3-4-2-1',
    nameArabic: '3-4-2-1 الثنائي الصانع للعب',
    nameEnglish: '3-4-2-1 Dual Tens',
    minLicense: 'B',
    archetype: 'modern',
    descriptionArabic: 'تعتمد على ثنائي صانع ألعاب داخلي (Dual #10s) لدعم مهاجم متحرك مع استغلال الأطراف بالكامل عبر الجناحين.',
    strengthsArabic: 'اختراق مدمر للمنظومات الدفاعية الضيقة عبر ممرات نصف المساحة (Half-spaces).',
    weaknessesArabic: 'الاعتماد الكلي على حيوية ثنائي الارتداد لمنع الهجمات المرتدة.',
    keyAttributesNeeded: ['passing', 'dribbling', 'vision'],
  },
  '4-1-4-1': {
    id: '4-1-4-1',
    nameArabic: '4-1-4-1 لاعب الارتكاز الموجه (Anchor Pivot)',
    nameEnglish: '4-1-4-1 Deep Anchor',
    minLicense: 'B',
    archetype: 'fluid',
    descriptionArabic: 'تعتمد على لاعب ارتكاز دفاعي نخبوي (Anchor) يقف بين الخطوط لإحباط هجمات المنافس وتوزيع التمريرات الطويلة.',
    strengthsArabic: 'عزل تام لصانع ألعاب المنافس وتغطية عميقة لقلبي الدفاع.',
    weaknessesArabic: 'تحتاج ارتكازاً ذو وعي تكتيكي وقوة بدنية خارقة لحمل عبء التغطية.',
    keyAttributesNeeded: ['defending', 'physical', 'passing'],
  },
  '4-3-2-1': {
    id: '4-3-2-1',
    nameArabic: '4-3-2-1 شجرة الميلاد الإيطالية (Christmas Tree)',
    nameEnglish: '4-3-2-1 Christmas Tree',
    minLicense: 'B',
    archetype: 'modern',
    descriptionArabic: 'خطة كارلو أنشيلوتي الشهيرة بميلان؛ ثلاثي وسط قوي خلف صانعي ألعاب حركيين ومهاجم حاسم.',
    strengthsArabic: 'خنق مذهل لعمق الملعب وتمريرات بينية متقنة تفكك التكتلات.',
    weaknessesArabic: 'افتقار للأجنحة الصريحة؛ الأظهرة مجبرة على تغطية كامل الخط الجانبي.',
    keyAttributesNeeded: ['passing', 'vision', 'stamina'],
  },
  '4-1-2-1-2': {
    id: '4-1-2-1-2',
    nameArabic: '4-1-2-1-2 الماسة الضيقة (Diamond Midfield)',
    nameEnglish: '4-1-2-1-2 Narrow Diamond',
    minLicense: 'B',
    archetype: 'fluid',
    descriptionArabic: 'ماسة وسط الملعب الكلاسيكية برباعي متصل يقدم تمريرات متتالية واستحواذاً طاغياً في الثلث الأوسط.',
    strengthsArabic: 'استحواذ ساحق في المركز وثنائية هجومية تشكل خطورة دائمة على المرمى.',
    weaknessesArabic: 'ضعف التغطية العرضية، مما يعطي أجنحة المنافس حرية كاملة للعرضيات.',
    keyAttributesNeeded: ['passing', 'dribbling', 'shooting'],
  },
  '4-1-3-2': {
    id: '4-1-3-2',
    nameArabic: '4-1-3-2 الهجومية المركزية',
    nameEnglish: '4-1-3-2 Direct Attack',
    minLicense: 'B',
    archetype: 'modern',
    descriptionArabic: 'ارتكاز دفاعي وحيد خلف ثلاثي وسط هجومي وثنائي هجومي، تركز على الضغط العالي والوصول المباشر للشباك.',
    strengthsArabic: 'ضغط متقدم مباغت وخلق فرص متتالية داخل الصندوق.',
    weaknessesArabic: 'فراغ في منطقة الارتكاز إذا تقدم ثلاثي الوسط بشكل مبالغ فيه.',
    keyAttributesNeeded: ['pace', 'shooting', 'physical'],
  },
  '3-4-1-2': {
    id: '3-4-1-2',
    nameArabic: '3-4-1-2 ثلاثي الدفاع وصانع الألعاب',
    nameEnglish: '3-4-1-2 Playmaker 3-Back',
    minLicense: 'B',
    archetype: 'modern',
    descriptionArabic: 'تجمع صلابة الثلاثي الخلفي مع صانع ألعاب حر ومهاجمين متجانسين، مع مساندة متواصلة من أطراف الوسط.',
    strengthsArabic: 'تنوع خيارات التمرير وصناعة الأهداف من العمق والأطراف.',
    weaknessesArabic: 'صعوبة التراجع السريع عند فقدان الكرة في مناطق متقدمة.',
    keyAttributesNeeded: ['passing', 'stamina', 'shooting'],
  },
  '3-3-3-1': {
    id: '3-3-3-1',
    nameArabic: '3-3-3-1 خطة مارسيلو بييلسا المجنونة',
    nameEnglish: '3-3-3-1 Bielsa System',
    minLicense: 'B',
    archetype: 'fluid',
    descriptionArabic: 'فلسفة الركض المتواصل والضغط الفردي الصارم؛ تقسم الملعب لخطوط ثلاثية متتالية لإغلاق كافة الزوايا.',
    strengthsArabic: 'افتكاك الكرة فوراً في مناطق الخصم وشل حركة بناء اللعب لديهم.',
    weaknessesArabic: 'استنزاف بدني عنيف للاعبين مع خطورة الإصابات وتراجع اللياقة بعد الدقيقة 70.',
    keyAttributesNeeded: ['stamina', 'pace', 'physical'],
  },

  // --- A LICENSE (7 Elite Tactical Formations) ---
  '3-2-4-1': {
    id: '3-2-4-1',
    nameArabic: '3-2-4-1 مربع بيب غوارديولا التكتيكي',
    nameEnglish: '3-2-4-1 Box Midfield',
    minLicense: 'A',
    archetype: 'mastermind',
    descriptionArabic: 'المنظومة الثورية التي حصد بها السيتي الثلاثية التاريخية؛ ارتكاز مزدوج مع رباعي وسط مربع يتحكم تماماً بمجريات اللقاء.',
    strengthsArabic: 'هيمنة تكتيكية مطلقة وتثبيت دفاع الخصم في مناطقه طوال الـ 90 دقيقة.',
    weaknessesArabic: 'تحتاج مدافعين ذوي سرعة فائقة لتغطية المساحات الكبيرة عند المرتدات.',
    keyAttributesNeeded: ['passing', 'vision', 'pace', 'defending'],
  },
  '4-2-2-2': {
    id: '4-2-2-2',
    nameArabic: '4-2-2-2 المربع السحري البرازيلي',
    nameEnglish: '4-2-2-2 Magic Box',
    minLicense: 'A',
    archetype: 'mastermind',
    descriptionArabic: 'تعتمد على ثنائي ارتكاز حديدي وثنائي أجنحة داخلية يدعمان ثنائي هجومي متفاهم؛ تنتج كرة قدم هجومية جذابة وخاطفة.',
    strengthsArabic: 'سيل من الفرص والتبادل السريع للكرات في عمق منطقة الجزاء.',
    weaknessesArabic: 'عرضة للاختراق من الأطراف إذا فشل الظهيران في أداء أدوارهما الدفاعية.',
    keyAttributesNeeded: ['dribbling', 'passing', 'shooting'],
  },
  '4-2-4': {
    id: '4-2-4',
    nameArabic: '4-2-4 الهجوم الشامل التاريخي',
    nameEnglish: '4-2-4 All-Out Attack',
    minLicense: 'A',
    archetype: 'wide',
    descriptionArabic: 'خطة البرازيل بمونديال 1958 و1970؛ رباعي هجومي كاسح يمزق أي خط دفاعي مع ارتكازين يقاتلان لاستعادة الكرة.',
    strengthsArabic: 'قوة هجومية ساحقة لا يستطيع أي دفاع الصمود أمامها لفترات طويلة.',
    weaknessesArabic: 'فجوة واسعة في وسط الملعب حال خسارة المعركة الثنائية.',
    keyAttributesNeeded: ['pace', 'shooting', 'physical'],
  },
  '5-3-2': {
    id: '5-3-2',
    nameArabic: '5-3-2 الجدار الدفاعي المنيع',
    nameEnglish: '5-3-2 Solid Wall',
    minLicense: 'A',
    archetype: 'defensive',
    descriptionArabic: 'خماسي دفاعي حقيقي مع ثلاثي وسط ومهاجمين مرتدين؛ مستحيلة الاختراق في العمق ومثالية للمباريات المصيرية والنهائيات.',
    strengthsArabic: 'شبه انعدام للفرص المحققة لخصومك داخل الصندوق.',
    weaknessesArabic: 'قلة المحاولات الهجومية والاعتماد الكلي على دقة إنهاء المهاجمين.',
    keyAttributesNeeded: ['defending', 'physical', 'stamina'],
  },
  '5-4-1': {
    id: '5-4-1',
    nameArabic: '5-4-1 القلعة الحديدية الحصينة',
    nameEnglish: '5-4-1 Fortress Block',
    minLicense: 'A',
    archetype: 'defensive',
    descriptionArabic: 'تأمين دفاعي مضاعف بـ 9 لاعبين خلف الكرة؛ تحبط المنافسين الكبار وتجبرهم على التسديد العشوائي من بعيد.',
    strengthsArabic: 'أعلى معدل نظافة شباك ممكن في المباريات الكبرى أمام الفرق الأقوى.',
    weaknessesArabic: 'صعوبة تسجيل الأهداف إلا من خلال ركلات ثابتة أو خطأ دفاعي قاتل للخصم.',
    keyAttributesNeeded: ['defending', 'physical'],
  },
  '5-2-3': {
    id: '5-2-3',
    nameArabic: '5-2-3 المرتدات الثلاثية المباغتة',
    nameEnglish: '5-2-3 Counter Trident',
    minLicense: 'A',
    archetype: 'defensive',
    descriptionArabic: 'حماية خماسية خلفية تطلق ثلاثياً هجومياً سريعاً فور استخلاص الكرة لاستغلال المساحات المفتوحة.',
    strengthsArabic: 'تحولات هجومية برقانية تسجل أهدافاً قاتلة في دقائق معدودة.',
    weaknessesArabic: 'ضغط هائل على ثنائي خط الوسط لمجاراة خط وسط الخصم.',
    keyAttributesNeeded: ['pace', 'defending', 'passing'],
  },
  '4-3-1-2': {
    id: '4-3-1-2',
    nameArabic: '4-3-1-2 الإيطالية المركزة',
    nameEnglish: '4-3-1-2 Italian Core',
    minLicense: 'A',
    archetype: 'modern',
    descriptionArabic: 'المنظومة التي أعادت ميلان لقمة أوروبا مع أنشيلوتي؛ وسط ثلاثي ارتكاز مع تريكوارتيستا (صانع ألعاب أسطوري) ومهاجمين.',
    strengthsArabic: 'تلاحم لا يصدق في منتصف الميدان وتحكم تام في وتيرة المباراة.',
    weaknessesArabic: 'المساحات الجانبية تتطلب أظهرة ذوي قدرات استثنائية دفاعاً وهجوماً.',
    keyAttributesNeeded: ['passing', 'vision', 'defending'],
  },

  // --- PRO LICENSE (3 Master Formations) ---
  '4-2-3-1-asym': {
    id: '4-2-3-1-asym',
    nameArabic: '4-2-3-1 اللاتناظرية (Asymmetric Wing Overload)',
    nameEnglish: '4-2-3-1 Asymmetric',
    minLicense: 'PRO',
    archetype: 'mastermind',
    descriptionArabic: 'توزيع تكتيكي غير متماثل؛ جناح يدخل كصانع ألعاب ثاني وجناح عكسي يتمركز كعنصر عازل لخلق خلخلة تكتيكية غير متوقعة لدفاع الخصم.',
    strengthsArabic: 'تدمير التمركز الدفاعي للخصم وتفوق نوعي في المناطق الرمادية.',
    weaknessesArabic: 'تتطلب ذكاءً تكتيكياً رفيعاً وفهماً متقدماً من اللاعبين لتجنب تداخل الأدوار.',
    keyAttributesNeeded: ['passing', 'vision', 'dribbling', 'pace'],
  },
  '3-4-3-diamond': {
    id: '3-4-3-diamond',
    nameArabic: '3-4-3 ماسة يوهان كرويف (Cruyff Total Football)',
    nameEnglish: '3-4-3 Cruyff Diamond',
    minLicense: 'PRO',
    archetype: 'mastermind',
    descriptionArabic: 'تجسيد الكرة الشاملة الأسطورية لبرشلونة وأياكس؛ خطوط مثلثة متداخلة تلغي خطوط التسلل وتمنح حرية إبداعية كاملة.',
    strengthsArabic: 'أجمل وأقوى أسلوب تدوير للكرة في تاريخ اللعبة مع قدرة على خلق الفرص من العدم.',
    weaknessesArabic: 'أي هفوة فردية في التمرير قد تكلف انفراداً مباشراً للمنافس.',
    keyAttributesNeeded: ['passing', 'vision', 'dribbling', 'stamina'],
  },
  '3-2-2-3': {
    id: '3-2-2-3',
    nameArabic: '3-2-2-3 (WM الحديثة لخبراء التموضع)',
    nameEnglish: '3-2-2-3 Modern WM',
    minLicense: 'PRO',
    archetype: 'mastermind',
    descriptionArabic: 'إحياء عبقري لخطة الـ WM التاريخية بأساليب التمركز الحديثة؛ توزيع مثالي للاعبين في كافة مربعات الملعب العشرية.',
    strengthsArabic: 'عزل تام لخطوط الخصم وتوفير خيارات تمرير لا تنتهي في كافة أرجاء الملعب.',
    weaknessesArabic: 'تتطلب تدريباً تكتيكياً مكثفاً ومعدل ذكاء كروي مرتفع من الفريق.',
    keyAttributesNeeded: ['passing', 'vision', 'physical', 'stamina'],
  },

  // --- ELITE LICENSE (2 World-Class Mastermind Formations) ---
  '2-3-5': {
    id: '2-3-5',
    nameArabic: '2-3-5 الهرم التكتيكي الهجين (Inverted Pyramid)',
    nameEnglish: '2-3-5 Inverted Overload',
    minLicense: 'ELITE',
    archetype: 'mastermind',
    descriptionArabic: 'المنظومة التي يتحول إليها نخبة مدربي العالم في الثلث الأخير؛ خماسي هجومي على خط واحد مع ارتكاز ثلاثي يغلق مرتدات الخصم في مهدها.',
    strengthsArabic: 'حصار لا فكاك منه لخصومك في مناطقهم مع قصف هجومي متواصل.',
    weaknessesArabic: 'انكشاف قلبي الدفاع حال تمكن الخصم من إرسال كرة طولية دقيقة خارج الحصار.',
    keyAttributesNeeded: ['pace', 'passing', 'shooting', 'physical', 'vision'],
  },
  '4-2-1-3': {
    id: '4-2-1-3',
    nameArabic: '4-2-1-3 الهجينة المتغيرة لحظياً',
    nameEnglish: '4-2-1-3 Fluid Dynamic',
    minLicense: 'ELITE',
    archetype: 'mastermind',
    descriptionArabic: 'الخطة الحربية لمدربي النخبة؛ تتغير أوتوماتيكياً بين 4-2-1-3 هجوماً و 4-5-1 دفاعاً بدون أي استبدالات أو إضاعة وقت.',
    strengthsArabic: 'تكيف عبقري فوري مع سيناريوهات المباراة وشل مخططات المنافسين الكبار.',
    weaknessesArabic: 'تتطلب رخصة النخبة العالمية وخبرة تكتيكية لا تقل عن 75 نقطة لإتقانها.',
    keyAttributesNeeded: ['pace', 'stamina', 'passing', 'defending', 'vision'],
  },
};

// ============================================================================
// 2. TACTICAL STYLES & PHILOSOPHIES (16 Styles)
// ============================================================================

export interface TacticalStyleMeta {
  id: TacticalStyle;
  nameArabic: string;
  nameEnglish: string;
  minLicense: CoachingLicenseTier;
  descArabic: string;
  requiredAttributes: string[];
  mismatchWarningArabic: string;
  counterAdvantageArabic: string;
  counterVulnerabilityArabic: string;
}

export const ALL_TACTICAL_STYLES: Record<TacticalStyle, TacticalStyleMeta> = {
  // D License (Basic)
  'total_football': {
    id: 'total_football',
    nameArabic: 'التوازن التكتيكي التقليدي (Basic Balanced)',
    nameEnglish: 'Basic Balanced Setup',
    minLicense: 'D',
    descArabic: 'انتشار تقليدي يعتمد على التزام كل لاعب بمركزه والمحافظة على نسق المباراة بهدوء.',
    requiredAttributes: ['stamina', 'passing'],
    mismatchWarningArabic: 'أداء مستقر لا يتطلب مهارات استثنائية، لكنه يفتقد للمباغتة أمام الخطط المتقدمة.',
    counterAdvantageArabic: 'منظومة آمنة تقلل الأخطاء الفردية.',
    counterVulnerabilityArabic: 'يسهل قراءتها والتفوق عليها من مدربي الرخص الأعلى.',
  },
  'direct_play': {
    id: 'direct_play',
    nameArabic: 'اللعب المباشر في العمق (Direct Play)',
    nameEnglish: 'Direct Play',
    minLicense: 'C',
    descArabic: 'نقل سريع للكرة من الدفاع إلى الهجوم بأقل عدد من التمريرات لاستغلال الفراغات خلف خطوط الخصم.',
    requiredAttributes: ['passing', 'pace', 'physical'],
    mismatchWarningArabic: 'إذا كان المهاجم بطيئاً ولا يجيد الالتحامات، ستعود الكرة سهلة لدفاع الخصم.',
    counterAdvantageArabic: 'تضرب الدفاعات المتقدمة وفرق الضغط العالي بسرعة خاطفة.',
    counterVulnerabilityArabic: 'تفقد فاعليتها أمام الدفاعات المتكتلة في مناطقها.',
  },

  // C License (Key foundational tactical systems)
  'counter_attack': {
    id: 'counter_attack',
    nameArabic: 'الهجمات المرتدة الخاطفة (Counter Attack)',
    nameEnglish: 'Counter Attack',
    minLicense: 'C',
    descArabic: 'تراجع منظم واستدراج المنافس إلى نصف ملعبك ثم الانقضاض بمرتدة صاروخية وسريعة نحو المرمى.',
    requiredAttributes: ['pace', 'dribbling', 'shooting'],
    mismatchWarningArabic: 'تتطلب مهاجمين وأجنحة سريعة جداً؛ بدون السرعة تفشل المرتدة قبل أن تبدأ.',
    counterAdvantageArabic: 'مدمرة ضد الفرق التي تضغط عالياً وتلعب بخط دفاعي متقدم (High Line).',
    counterVulnerabilityArabic: 'عقيمة إذا واجهت فريقاً يلعب بتكتل دفاعي منخفض (Low Block).',
  },
  'park_the_bus': {
    id: 'park_the_bus',
    nameArabic: 'التكتل الدفاعي المنخفض (Low Block / Bus)',
    nameEnglish: 'Low Block',
    minLicense: 'C',
    descArabic: 'إغلاق شامل لعمق الملعب ومنطقة الجزاء وحرمان الخصم من أي مساحات بين الخطوط.',
    requiredAttributes: ['defending', 'physical'],
    mismatchWarningArabic: 'إذا كان قلبي الدفاع ضعيفين في القوة والكرات الرأسية، ستستقبل أهدافاً من العرضيات.',
    counterAdvantageArabic: 'تحبط تماماً فرق التيكي تاكا والاستحواذ وتقفل كافة زوايا التمرير البيني.',
    counterVulnerabilityArabic: 'تمنح الخصم حرية تامة في إرسال العرضيات والتسديد المريح من خارج المنطقة.',
  },
  'wing_play': {
    id: 'wing_play',
    nameArabic: 'الهجوم عبر الأطراف والعرضيات (Wing Play)',
    nameEnglish: 'Wing Play Overload',
    minLicense: 'C',
    descArabic: 'تحميل اللعب على الجناحين وإرسال عرضيات متقنة ومكثفة للمهاجمين داخل منطقة الجزاء.',
    requiredAttributes: ['pace', 'dribbling', 'passing'],
    mismatchWarningArabic: 'تحتاج مهاجماً قوياً في الكرات الهوائية؛ بدون محطة هجومية تذهب العرضيات هباءً.',
    counterAdvantageArabic: 'تفكك التكتلات الدفاعية الضيقة وتجبر مدافعي الخصم على التشتت.',
    counterVulnerabilityArabic: 'تترك مساحات شاسعة خلف الأظهرة المتقدمة يمكن للمنافس ضربها بالمرتدات.',
  },
  'catenaccio': {
    id: 'catenaccio',
    nameArabic: 'الكاتيناتشو الدفاعي الحذر (Defensive Counter)',
    nameEnglish: 'Catenaccio',
    minLicense: 'C',
    descArabic: 'الفلسفة الإيطالية الدفاعية العريقة؛ تأمين الخط الخلفي أولاً ثم استغلال أي هفوة للمنافس بهدف وحيد قاتل.',
    requiredAttributes: ['defending', 'physical', 'stamina'],
    mismatchWarningArabic: 'تتطلب تركيزاً وانضباطاً تكتيكياً عاليين طوال الـ 90 دقيقة.',
    counterAdvantageArabic: 'تخنق هجوم الفرق المنافسة وتجبرهم على الإحباط وارتكاب الأخطاء.',
    counterVulnerabilityArabic: 'صعوبة العودة في النتيجة حال التأخر بهدف مبكر.',
  },

  // B License (Advanced concepts)
  'tiki_taka': {
    id: 'tiki_taka',
    nameArabic: 'تيكي تاكا وتدوير الكرة (Tiki-Taka)',
    nameEnglish: 'Tiki-Taka Possession',
    minLicense: 'B',
    descArabic: 'تمريرات قصيرة مكثفة مع تدوير صبور للكرة وحرمان الخصم منها لخلخلة تمركزه بالتدريج.',
    requiredAttributes: ['passing', 'vision', 'dribbling'],
    mismatchWarningArabic: 'إذا كان لاعبو الوسط يفتقرون لدقة التمرير، ستنقطع الكرات وتتحول لانفرادات قاتلة!',
    counterAdvantageArabic: 'استنزاف طاقة الخصم بدنياً ونفسياً وتسيير ريتم المباراة بالكامل لصالحك.',
    counterVulnerabilityArabic: 'عرضة للمرتدات السريعة الصاعقة فور انقطاع الكرة في دائرة المنتصف.',
  },
  'gegenpress': {
    id: 'gegenpress',
    nameArabic: 'الضغط العكسي الخانق (Gegenpressing)',
    nameEnglish: 'Gegenpress',
    minLicense: 'B',
    descArabic: 'مدرسة يورغن كلوب الألمانية؛ افتكاك الكرة فور فقدانها في الثلث الأخير بأقصى سرعة واندفاع.',
    requiredAttributes: ['stamina', 'pace', 'physical'],
    mismatchWarningArabic: 'إذا كان فريقك بطيئاً أو ضعيفاً في اللياقة، سينهار بدنياً بعد الدقيقة 60 ويستقبل أهدافاً سهلة!',
    counterAdvantageArabic: 'تسجيل أهداف سهلة من أخطاء دفاع الخصم المحاصر تحت الضغط الرهيب.',
    counterVulnerabilityArabic: 'استنزاف بدني هائل ومساحات شاغرة خلف الخط العالي إن نجح الخصم في كسر الضغط.',
  },
  'build_up_from_back': {
    id: 'build_up_from_back',
    nameArabic: 'البناء الصبور من الخلف (Build Up from Back)',
    nameEnglish: 'Build Up from Back',
    minLicense: 'B',
    descArabic: 'بدء الهجمة من حارس المرمى وقلبي الدفاع بهدوء لاستدراج ضغط الخصم وفتح ممرات لعب في الوسط.',
    requiredAttributes: ['passing', 'defending'],
    mismatchWarningArabic: 'تتطلب حارس مرمى ومدافعين يجيدون التمرير بالقدمين؛ أي خطأ يعني هدفاً محققاً للخصم.',
    counterAdvantageArabic: 'كسر ضغط المنافس وتحويل الهجمة إلى زيادة عددية هائلة للأمام.',
    counterVulnerabilityArabic: 'خطورة وقوع هفوة كارثية قرب منطقة الجزاء الخاصة بك.',
  },
  'long_ball': {
    id: 'long_ball',
    nameArabic: 'الكرات الطولية للمحطة (Route One / Long Ball)',
    nameEnglish: 'Direct Long Ball',
    minLicense: 'B',
    descArabic: 'كرات طولية دقيقة من الدفاع إلى مهاجم محطة عملاق لربح الكرات الهوائية والصراع على الكرات الثانية.',
    requiredAttributes: ['physical', 'passing', 'shooting'],
    mismatchWarningArabic: 'تتطلب مهاجماً ذا قوة بدنية وضربات رأس متقنة مع لاعبي وسط يتابعون الكرة الثانية.',
    counterAdvantageArabic: 'تتجاوز خطوط ضغط الخصم بالكامل وتصل لمنطقته في ثوانٍ معدودة.',
    counterVulnerabilityArabic: 'نسبة فقدان الاستحواذ مرتفعة إذا كان دفاع الخصم قوياً في ألعاب الهواء.',
  },
  'fast_transition': {
    id: 'fast_transition',
    nameArabic: 'التحول البرقاني الفوري (Fast Transition)',
    nameEnglish: 'Fast Transition Blitz',
    minLicense: 'B',
    descArabic: 'انتقال الفريق ككتلة واحدة من الدفاع للهجوم في 3 ثوانٍ فقط فور استخلاص الكرة.',
    requiredAttributes: ['pace', 'stamina', 'passing'],
    mismatchWarningArabic: 'تحتاج تناغماً عالياً وسرعة بدنية وذهنية فائقة.',
    counterAdvantageArabic: 'مباغتة أي فريق يترك مساحات أثناء صعوده الهجومي.',
    counterVulnerabilityArabic: 'فقدان التوازن الدفاعي إذا قُطعت الكرة خلال مرحلة الاندفاع.',
  },

  // A License (Elite Tactical Systems)
  'possession_control': {
    id: 'possession_control',
    nameArabic: 'السيطرة التامة والتحكم بالرتم (Possession Control)',
    nameEnglish: 'Possession Control Dominance',
    minLicense: 'A',
    descArabic: 'هيمنة تامة على إيقاع اللعب؛ فرض بطء اللقاء أو تسريعه متى شئت لحرمان المنافس من الكرة وصنع الثغرات.',
    requiredAttributes: ['passing', 'vision', 'dribbling'],
    mismatchWarningArabic: 'إذا كان خط الوسط عنده تمرير ضعيف ورؤية منخفضة، سترتفع نسبة الكرات المقطوعة بنسبة 40%!',
    counterAdvantageArabic: 'تحييد خطورة هجوم الخصم تماماً لأن الكرة تظل بحوزتك طوال الوقت.',
    counterVulnerabilityArabic: 'عرضة للمرتدات السريعة إذا تم التمرير الخاطئ في منتصف الملعب.',
  },
  'transition_control': {
    id: 'transition_control',
    nameArabic: 'خنق التحولات والهجوم الوقائي (Transition Control)',
    nameEnglish: 'Rest Defense & Transition Control',
    minLicense: 'A',
    descArabic: 'تطبيق أسلوب الدفاع الوقائي (Rest Defense)؛ تمركز 3 إلى 5 لاعبين خلف الكرة أثناء هجومك لمنع أي مرتدة.',
    requiredAttributes: ['defending', 'physical', 'stamina'],
    mismatchWarningArabic: 'تتطلب تركيزاً ذهنياً وتواصلاً تكتيكياً لا يهدأ من قلبي الدفاع والارتكاز.',
    counterAdvantageArabic: 'تقضي تماماً على سلاح الهجمات المرتدة لدى المنافس.',
    counterVulnerabilityArabic: 'تقلل عدد اللاعبين المشاركين في صندوق الخصم أثناء الهجوم.',
  },
  'fluid_creative': {
    id: 'fluid_creative',
    nameArabic: 'تبادل المراكز والأنماط الهجومية (Rotational Play)',
    nameEnglish: 'Rotational Fluid Play',
    minLicense: 'A',
    descArabic: 'حركية دائرية وتبادل مستمر للمراكز بين المهاجمين وصانعي الألعاب لإرباك رقابة دفاع الخصم اللصيقة.',
    requiredAttributes: ['dribbling', 'passing', 'vision', 'pace'],
    mismatchWarningArabic: 'تتطلب لاعبين بمهارات فردية عالية وذكاء تمركزي استثنائي.',
    counterAdvantageArabic: 'تدمر أي خطة رقابة رجل لرجل (Man-marking) وتفكك أصلب الدفاعات.',
    counterVulnerabilityArabic: 'احتمال تداخل أدوار اللاعبين وفقدان التغطية الدفاعية في حال انقطاع الكرة.',
  },

  // PRO License
  'fluid_positional_play': {
    id: 'fluid_positional_play',
    nameArabic: 'اللعب التموضعي الفائق (Juego de Posición)',
    nameEnglish: 'Fluid Positional Play',
    minLicense: 'PRO',
    descArabic: 'فلسفة اللعب التموضعي العالمية؛ تقسيم الملعب إلى شبكة هندسية تضمن تواجداً دائماً للاعب حر في كل خطوة.',
    requiredAttributes: ['passing', 'vision', 'dribbling', 'pace', 'stamina'],
    mismatchWarningArabic: 'تتطلب رخصة PRO ومعدل تفاهم وتناغم كيميائي يتجاوز 70% في التشكيل.',
    counterAdvantageArabic: 'أعلى مستوى من الفاعلية التهديفية والاستحواذ الذكي في كرة القدم الحديثة.',
    counterVulnerabilityArabic: 'تتطلب جهداً ذهنياً مستمراً وتطبيقاً مثالياً للتعليمات الفنية.',
  },

  // ELITE License
  'tactical_mastermind': {
    id: 'tactical_mastermind',
    nameArabic: 'المنظومة الهجينة المتكيفة لحظياً (Mastermind Adaptive)',
    nameEnglish: 'Tactical Mastermind Dynamic',
    minLicense: 'ELITE',
    descArabic: 'قمة الإبداع التكتيكي في العالم؛ منظومة ذكية تقرأ أسلوب مدرب الخصم في أول 15 دقيقة وتتكيف لإبطال نقاط قوته تلقائياً.',
    requiredAttributes: ['passing', 'vision', 'pace', 'defending', 'physical', 'stamina'],
    mismatchWarningArabic: 'حصرية لمدربي رخصة النخبة العالمية (World Elite) فقط.',
    counterAdvantageArabic: 'تمنح فريقك أفضلية تكتيكية فورية وتكشف ثغرات المنافس مهما كانت قوته.',
    counterVulnerabilityArabic: 'لا توجد ثغرة نظامية، تعتمد فقط على الفوارق الفردية للاعبين.',
  },
};

// ============================================================================
// 3. DEFENSIVE SYSTEMS & PRESSING TRAPS (أنظمة الضغط ومصائد الافتكاك)
// ============================================================================

export interface PressingTrapMeta {
  id: 'trap_wings' | 'trap_center' | 'zonal_trap' | 'none';
  nameArabic: string;
  minLicense: CoachingLicenseTier;
  descArabic: string;
}

export const PRESSING_TRAPS: Record<string, PressingTrapMeta> = {
  'none': {
    id: 'none',
    nameArabic: 'ضغط تقليدي بدون مصيدة محددة',
    minLicense: 'D',
    descArabic: 'افتكاك طبيعي للكرة حسب مجريات وتمركز اللاعبين.',
  },
  'trap_wings': {
    id: 'trap_wings',
    nameArabic: 'مصيدة الأطراف (Trap on Wings)',
    minLicense: 'A',
    descArabic: 'توجيه بناء لعب الخصم نحو خط التماس ثم محاصرته بثلاثي خانق (جناح، ظهير، ارتكاز) لافتكاك الكرة.',
  },
  'trap_center': {
    id: 'trap_center',
    nameArabic: 'مصيدة العمق (Trap in Central Areas)',
    minLicense: 'A',
    descArabic: 'ترك ممر تمرير خادع لعمق الملعب، وعند تمرير الكرة ينقض لاعبو الوسط لقطعها والبدء بهجمة مرتدة.',
  },
  'zonal_trap': {
    id: 'zonal_trap',
    nameArabic: 'مصيدة المناطق المتقدمة المركبة (Zonal Trap)',
    minLicense: 'PRO',
    descArabic: 'تطبيق كمين تكتيكي مركب يضيق الخناق على حامل الكرة أينما اتجه بالملعب.',
  },
};

export interface PlayerRoleMeta {
  id: string;
  category: 'fullback' | 'midfielder' | 'striker';
  nameArabic: string;
  minLicense: CoachingLicenseTier;
  descArabic: string;
  synergyKey: string;
}

export const ADVANCED_ROLES: Record<string, PlayerRoleMeta> = {
  // Fullback roles
  'standard_fullback': {
    id: 'standard_fullback',
    category: 'fullback',
    nameArabic: 'ظهير تقليدي متزن',
    minLicense: 'D',
    descArabic: 'توازن بين الدفاع والمساندة الهجومية المعتدلة.',
    synergyKey: 'defending',
  },
  'overlapping_fullback': {
    id: 'overlapping_fullback',
    category: 'fullback',
    nameArabic: 'ظهير طائر متداخل (Overlapping Fullback)',
    minLicense: 'B',
    descArabic: 'ينطلق باستمرار حول الجناح لإرسال عرضيات متقنة وصنع زيادة عددية على الأطراف.',
    synergyKey: 'pace_stamina',
  },
  'inverted_fullback': {
    id: 'inverted_fullback',
    category: 'fullback',
    nameArabic: 'ظهير مقلوب لعمق الوسط (Inverted Fullback)',
    minLicense: 'B',
    descArabic: 'يدخل لعمق الملعب كلاعب وسط إضافي أثناء حيازة الكرة لتأمين الاستحواذ ومنع المرتدات.',
    synergyKey: 'passing_defending',
  },

  // Striker roles
  'advanced_forward': {
    id: 'advanced_forward',
    category: 'striker',
    nameArabic: 'مهاجم صريح متقدم (Advanced Forward)',
    minLicense: 'D',
    descArabic: 'التمركز الدائم في خط دفاع الخصم لطلب الكرات البينية وإنهاء الهجمات.',
    synergyKey: 'shooting_pace',
  },
  'false_9': {
    id: 'false_9',
    category: 'striker',
    nameArabic: 'المهاجم الوهمي (False 9)',
    minLicense: 'B',
    descArabic: 'يهبط إلى خط الوسط لسحب قلبي دفاع الخصم وخلق مساحات شاسعة للأجنحة القادمة من الخلف.',
    synergyKey: 'passing_dribbling',
  },
  'target_man': {
    id: 'target_man',
    category: 'striker',
    nameArabic: 'المهاجم المحطة (Target Man)',
    minLicense: 'B',
    descArabic: 'مهاجم فارع الطول وقوي بدنياً يستقبل الكرات الطولية بظهره ويهيئها للقادمين من الخلف.',
    synergyKey: 'physical_heading',
  },

  // Midfield roles
  'balanced_mid': {
    id: 'balanced_mid',
    category: 'midfielder',
    nameArabic: 'لاعب وسط متوازن',
    minLicense: 'D',
    descArabic: 'أداء مهام الربط التقليدية بين الخطوط.',
    synergyKey: 'passing',
  },
  'deep_playmaker': {
    id: 'deep_playmaker',
    category: 'midfielder',
    nameArabic: 'صانع الألعاب المتأخر (Deep-Lying Playmaker)',
    minLicense: 'B',
    descArabic: 'يتمركز أمام قلبي الدفاع لتوزيع الكرات الطولية والعرضية الساحرة بدقة متناهية.',
    synergyKey: 'passing_vision',
  },
  'box_to_box': {
    id: 'box_to_box',
    category: 'midfielder',
    nameArabic: 'لاعب وسط شامل من الصندوق للصندوق (Box-to-Box)',
    minLicense: 'B',
    descArabic: 'طاقة بدنية لا تنضب؛ يدافع في منطقة جزائه ويهاجم في منطقة جزاء الخصم طوال المباراة.',
    synergyKey: 'stamina_physical',
  },
  'mezzala': {
    id: 'mezzala',
    category: 'midfielder',
    nameArabic: 'لاعب الوسط الجناحي الحر (Mezzala)',
    minLicense: 'PRO',
    descArabic: 'لاعب وسط ينطلق في مساحات نصف الجناح (Half-spaces) لصناعة الفرص والتسديد من حافة المنطقة.',
    synergyKey: 'dribbling_vision',
  },
};

// ============================================================================
// 4. LICENSE PROGRESSION & UNLOCK CHECKS (التحقق من الرخص والفتح)
// ============================================================================

export function getLicenseRankValue(license: CoachingLicenseTier | string): number {
  switch (license) {
    case 'BASIC': return 2;
    case 'PREMIER': return 4;
    case 'CONTINENTAL': return 5;
    case 'LEGENDARY': return 6;
    case 'D': return 1;
    case 'C': return 2;
    case 'B': return 3;
    case 'A': return 4;
    case 'PRO': return 5;
    case 'ELITE': return 6;
    default: return 2;
  }
}

export function isTacticalItemUnlocked(
  itemRequiredLicense: CoachingLicenseTier,
  managerLicense: CoachingLicenseTier | string
): boolean {
  const currentRank = getLicenseRankValue(managerLicense);
  const reqRank = getLicenseRankValue(itemRequiredLicense);
  return currentRank >= reqRank;
}

export function getLicenseTacticalUnlocks(license: CoachingLicenseTier) {
  const rank = getLicenseRankValue(license);

  const unlockedFormations = Object.values(ALL_FORMATIONS).filter(f => getLicenseRankValue(f.minLicense) <= rank);
  const lockedFormations = Object.values(ALL_FORMATIONS).filter(f => getLicenseRankValue(f.minLicense) > rank);

  const unlockedStyles = Object.values(ALL_TACTICAL_STYLES).filter(s => getLicenseRankValue(s.minLicense) <= rank);
  const lockedStyles = Object.values(ALL_TACTICAL_STYLES).filter(s => getLicenseRankValue(s.minLicense) > rank);

  return {
    unlockedFormations,
    lockedFormations,
    unlockedStyles,
    lockedStyles,
  };
}

// ============================================================================
// 5. DEEP TACTICAL SYNERGY & MATCH IMPACT EVALUATOR (معادلة المحاكاة الرياضية)
// ============================================================================

export interface SquadTacticalSynergyResult {
  attackMod: number;
  midfieldMod: number;
  defenseMod: number;
  staminaDrainMult: number;
  turnoverPenaltyRate: number;
  counterRiskBonus: number;
  crossDangerBonus: number;
  synergyScore: number; // 0 to 100
  feedbackReasons: string[];
  fatigueWarning: string | null;
  experienceBonusPct: number;
}

/**
 * Calculates exact mathematical simulation modifiers based on:
 * Manager License + Tactical Knowledge + Tactical Experience + Formation + Player Attributes + Match State
 * NO RANDOM TACTICS — strictly deterministic attribute & tactical clash relationship.
 */
export function evaluateSquadTacticalSynergy(
  tactics: TeamTactics,
  activePlayers: Player[],
  oppTactics: TeamTactics,
  matchMinute: number,
  currentFatigueMap: Record<string, number> = {},
  isTenMen: boolean = false,
  managerExp: number = 50,
  oppActivePlayers: Player[] = []
): SquadTacticalSynergyResult {
  let attackMod = 1.0;
  let midfieldMod = 1.0;
  let defenseMod = 1.0;
  let staminaDrainMult = 1.0;
  let turnoverPenaltyRate = 0.0;
  let counterRiskBonus = 0.0;
  let crossDangerBonus = 0.0;
  let synergyScore = 70;
  const feedbackReasons: string[] = [];
  let fatigueWarning: string | null = null;

  if (!activePlayers || activePlayers.length === 0) {
    return {
      attackMod: 1.0,
      midfieldMod: 1.0,
      defenseMod: 1.0,
      staminaDrainMult: 1.0,
      turnoverPenaltyRate: 0,
      counterRiskBonus: 0,
      crossDangerBonus: 0,
      synergyScore: 70,
      feedbackReasons: [],
      fatigueWarning: null,
      experienceBonusPct: 0,
    };
  }

  // 1. Compute Squad Attribute Averages (and Opponent Averages for fair relative comparison)
  const squadSize = activePlayers.length;
  const avgPace = activePlayers.reduce((acc, p) => acc + (p?.attributes?.pace || 65), 0) / squadSize;
  const avgPassing = activePlayers.reduce((acc, p) => acc + (p?.attributes?.passing || 65), 0) / squadSize;
  const avgStamina = activePlayers.reduce((acc, p) => {
    const currentStam = currentFatigueMap[p?.id] ?? p?.fitness ?? 90;
    return acc + currentStam;
  }, 0) / squadSize;
  const avgPhysical = activePlayers.reduce((acc, p) => acc + (p?.attributes?.physical || 65), 0) / squadSize;
  const avgDefending = activePlayers.reduce((acc, p) => acc + (p?.attributes?.defending || 65), 0) / squadSize;
  const avgOvr = activePlayers.reduce((acc, p) => acc + (p?.overallRating || 65), 0) / squadSize;

  const oppSize = oppActivePlayers && oppActivePlayers.length > 0 ? oppActivePlayers.length : 0;
  const oppAvgOvr = oppSize > 0
    ? oppActivePlayers.reduce((acc, p) => acc + (p?.overallRating || 62), 0) / oppSize
    : avgOvr - 2;
  const isStrongerThanOpp = avgOvr >= oppAvgOvr;

  // Specific line averages
  const defenders = activePlayers.filter(p => p?.positionCategory === 'DEF');
  const midfielders = activePlayers.filter(p => p?.positionCategory === 'MID');
  const attackers = activePlayers.filter(p => p?.positionCategory === 'FWD');

  const defPhysical = defenders.length > 0
    ? defenders.reduce((acc, p) => acc + (p?.attributes?.physical || 65), 0) / defenders.length
    : avgPhysical;
  const midPassing = midfielders.length > 0
    ? midfielders.reduce((acc, p) => acc + (p?.attributes?.passing || 65), 0) / midfielders.length
    : avgPassing;
  const midVision = midPassing;
  const fwdPace = attackers.length > 0
    ? attackers.reduce((acc, p) => acc + (p?.attributes?.pace || 65), 0) / attackers.length
    : avgPace;
  const fwdShooting = attackers.length > 0
    ? attackers.reduce((acc, p) => acc + (p?.attributes?.shooting || 65), 0) / attackers.length
    : 70;

  // Relative benchmark based on opponent quality (so lower-division or mid-tier teams aren't penalized against weak teams)
  const attrBenchmark = Math.min(72, Math.max(54, oppAvgOvr - 2));

  // 2. Manager Tactical Experience Influence (never penalizes below 0.96, rewards up to +20%)
  const experienceBonusPct = Math.max(-4, Math.round(((managerExp - 55) / 45) * 20));
  const expMult = 1 + (experienceBonusPct / 100);
  attackMod *= expMult;
  midfieldMod *= expMult;
  defenseMod *= expMult;

  // 3. Tactical Style & Player Attribute Verification
  const style = tactics.tacticalStyle || 'total_football';
  const isHighPressing = tactics.pressingIntensity === 'high' || tactics.pressingIntensity === 'gegenpress' || style === 'gegenpress';

  // --- A. High Press / Gegenpress Checks ---
  if (isHighPressing) {
    staminaDrainMult *= 1.18;

    if (!isStrongerThanOpp && avgPace < attrBenchmark - 3 && avgStamina < 55 && matchMinute > 72) {
      defenseMod *= 0.94;
      staminaDrainMult *= 1.20;
      counterRiskBonus += 0.15;
      synergyScore -= 6;
      fatigueWarning = 'إجهاد بدني نسبي في الدقائق الأخيرة نتيجة الضغط العالي المتواصل.';
      feedbackReasons.push('الضغط العالي تطلب مجهوداً بدنياً كبيراً في الشوط الثاني.');
    } else {
      midfieldMod *= 1.14;
      defenseMod *= 1.06;
      attackMod *= 1.12;
      synergyScore += 12;
    }
  }

  // --- B. Possession Control & Tiki-Taka Checks ---
  if (style === 'tiki_taka' || style === 'possession_control') {
    if (midPassing >= attrBenchmark || isStrongerThanOpp || midVision >= attrBenchmark) {
      midfieldMod *= 1.16;
      attackMod *= 1.10;
      defenseMod *= 1.06;
      synergyScore += 14;
    } else {
      turnoverPenaltyRate += 0.10;
      midfieldMod *= 0.96;
      attackMod *= 0.96;
      synergyScore -= 4;
      feedbackReasons.push('أسلوب الاستحواذ يحتاج لدقة تمرير أعلى في خط الوسط لزيادة الفاعلية.');
    }
  }

  // --- C. Low Block / Catenaccio Checks ---
  if (style === 'park_the_bus' || style === 'catenaccio' || tactics.mentality === 'ultra_defensive') {
    if (defPhysical >= attrBenchmark - 2 || isStrongerThanOpp) {
      defenseMod *= 1.18;
      attackMod *= 0.88;
      synergyScore += 10;
    } else {
      defenseMod *= 1.04;
      crossDangerBonus += 0.15;
      synergyScore -= 4;
      feedbackReasons.push('التكتل الدفاعي أغلق العمق مع بعض الخطورة من الكرات العرضية.');
    }
  }

  // --- D. Wing Play Checks ---
  if (style === 'wing_play') {
    if (avgPace >= attrBenchmark - 2 || fwdShooting >= attrBenchmark - 2 || isStrongerThanOpp) {
      attackMod *= 1.14;
      crossDangerBonus += 0.20;
      synergyScore += 12;
      feedbackReasons.push('الهجوم عبر الأطراف حقق فاعلية ممتازة بفضل انطلاقات الأجنحة والعرضيات.');
    } else {
      attackMod *= 0.97;
      feedbackReasons.push('العرضيات تحتاج لمساندة أكبر داخل منطقة الجزاء.');
    }
  }

  // 4. Tactical Clash Matrix
  const oppStyle = oppTactics.tacticalStyle || 'total_football';
  const isOppHighPress = oppTactics.pressingIntensity === 'high' || oppTactics.pressingIntensity === 'gegenpress';

  if (isHighPressing && (oppStyle === 'park_the_bus' || oppStyle === 'catenaccio')) {
    midfieldMod *= 1.12;
    attackMod *= 1.06;
  }

  if ((style === 'counter_attack' || tactics.mentality === 'defensive') && isOppHighPress) {
    if (fwdPace >= attrBenchmark) {
      attackMod *= 1.12;
      feedbackReasons.push('المرتدات السريعة استغلت المساحات خلف خط وسط المنافس.');
    }
  }

  const isCentralOverload = tactics.formation === '4-1-2-1-2' || tactics.formation === '4-3-2-1' || tactics.formation === '3-2-4-1';
  if (isCentralOverload && oppTactics.formation === '4-3-3') {
    midfieldMod *= 1.12;
    defenseMod *= 0.96;
  }

  // 5. Match Events & Context
  if (isTenMen) {
    staminaDrainMult *= 1.20;
    defenseMod *= 0.90;
    if (isHighPressing) {
      fatigueWarning = 'اللعب بـ 10 لاعبين مع ضغط عالٍ يزيد من استهلاك اللياقة.';
    }
  }

  if (tactics.mentality === 'ultra_attacking' && matchMinute >= 80) {
    attackMod *= 1.22;
    counterRiskBonus += 0.15;
    staminaDrainMult *= 1.15;
  }

  if (tactics.matchStatePreset === 'protect_lead') {
    defenseMod *= 1.14;
    staminaDrainMult *= 0.88;
    counterRiskBonus *= 0.65;
  }

  // Bound modifiers cleanly so synergy never causes a stronger squad to collapse
  attackMod = Math.max(0.92, Math.min(1.28, attackMod));
  midfieldMod = Math.max(0.92, Math.min(1.28, midfieldMod));
  defenseMod = Math.max(0.92, Math.min(1.28, defenseMod));
  synergyScore = Math.min(100, Math.max(45, synergyScore));

  return {
    attackMod,
    midfieldMod,
    defenseMod,
    staminaDrainMult,
    turnoverPenaltyRate,
    counterRiskBonus,
    crossDangerBonus,
    synergyScore,
    feedbackReasons,
    fatigueWarning,
    experienceBonusPct,
  };
}

// ============================================================================
// 6. TACTICAL MATCH REPORT GENERATOR (تقرير التحليل الفني الشامل بعد المباراة)
// ============================================================================

export function generateTacticalMatchReport(
  userClub: Club,
  oppClub: Club,
  userTactics: TeamTactics,
  oppTactics: TeamTactics,
  userGoals: number,
  oppGoals: number,
  stats: {
    userPossession: number;
    userShots: number;
    userShotsOnTarget: number;
    userFouls: number;
    userPassAccuracy?: number;
  },
  manager: ManagerProfile,
  matchEventsSummary: {
    hadRedCard: boolean;
    concededAfter70: boolean;
    scoredFromCounter: boolean;
    scoredFromCross: boolean;
    concededFromCross: boolean;
  }
): TacticalMatchReport {
  const activeStyle = userTactics.tacticalStyle || 'total_football';
  const activeStyleMeta = ALL_TACTICAL_STYLES[activeStyle] || ALL_TACTICAL_STYLES['total_football'];
  const currentExp = (manager.tacticalExperience && manager.tacticalExperience[activeStyle]) ?? 50;

  // 1. Calculate the 5 Tactical Scores (0 - 100)
  // Pressing Rating
  let pressingRating = 65;
  if (userTactics.pressingIntensity === 'gegenpress' || userTactics.pressingIntensity === 'high') {
    pressingRating = matchEventsSummary.concededAfter70 ? 76 : 88;
  } else if (userTactics.pressingIntensity === 'low') {
    pressingRating = 60;
  } else {
    pressingRating = 72;
  }

  // Build-up Rating
  let buildUpRating = 70;
  const passAcc = stats.userPassAccuracy || (stats.userPossession > 55 ? 84 : 76);
  if (passAcc >= 82) buildUpRating = 85;
  else if (passAcc >= 75) buildUpRating = 74;
  else buildUpRating = 62;

  // Defensive Organization Rating
  let defensiveOrgRating = 75;
  if (oppGoals === 0) defensiveOrgRating = 92;
  else if (oppGoals === 1) defensiveOrgRating = 78;
  else if (oppGoals >= 3) defensiveOrgRating = 54;
  else defensiveOrgRating = 65;

  // Chance Creation Rating
  let chanceCreationRating = 70;
  if (stats.userShots >= 10 || userGoals >= 2) chanceCreationRating = 86;
  else if (stats.userShots >= 6 || userGoals === 1) chanceCreationRating = 74;
  else chanceCreationRating = 58;

  // Adjustments & Decision Making
  let adjustmentsRating = 78;
  if (userGoals > oppGoals) adjustmentsRating = 88;
  else if (userGoals === oppGoals) adjustmentsRating = 75;
  else adjustmentsRating = 66;

  // Overall Tactical Score
  const overallTacticalScore = Math.round(
    pressingRating * 0.2 +
    buildUpRating * 0.2 +
    defensiveOrgRating * 0.25 +
    chanceCreationRating * 0.25 +
    adjustmentsRating * 0.1
  );

  // 2. Generate Realistic Context-Aware Arabic & English Narrative Insights
  let primaryInsightArabic = '';
  let secondaryInsightArabic = '';
  let staminaWarningArabic: string | undefined = undefined;

  // Primary narrative
  if (userTactics.pressingIntensity === 'high' || userTactics.pressingIntensity === 'gegenpress') {
    if (matchEventsSummary.concededAfter70) {
      primaryInsightArabic = 'نجح ضغطك العالي بامتياز خلال أول 60 دقيقة في شل حركة الخصم، لكن الفريق استنزف لياقته بعد الدقيقة 70 وسمح بـ 3 تحولات هجومية خطيرة.';
      staminaWarningArabic = 'تحذير بدني: أسلوب الضغط الشرس يتطلب مداورة اللاعبين والتبديل المبكر في الشوط الثاني لتفادي الانهيار المتأخر.';
    } else {
      primaryInsightArabic = 'أحكم فريقك قبضته على الثلث الهجومي بفضل الضغط العكسي المكثف، مما أسفر عن افتكاك كرات نوعية واختصار زمن الوصول للمرمى.';
    }
  } else if (activeStyle === 'park_the_bus' || activeStyle === 'catenaccio') {
    if (matchEventsSummary.concededFromCross) {
      primaryInsightArabic = 'نجح تكتل الدفاع المنخفض تماماً في غلق العمق أمام محاولات الخصم، لكن الفريق عانى من العرضيات المتكررة بسبب التفوق الهوائي للمنافس.';
    } else {
      primaryInsightArabic = 'انضباط دفاعي حديدي وتغطية مثالية لمساحات العمق، مما أجبر المنافس على التسديد العشوائي غير المجدي من مسافات بعيدة.';
    }
  } else if (activeStyle === 'tiki_taka' || activeStyle === 'possession_control') {
    if (buildUpRating < 70) {
      primaryInsightArabic = 'أسلوب الاستحواذ عانى من عدم دقة التمرير تحت ضغط الخصم (نسبة تمريرات مقطوعة مرتفعة)، مما فتح ثغرات لهجمات مرتدة سريعة للمنافس.';
    } else {
      primaryInsightArabic = 'استحواذ مدروس وتدوير صبور للكرة أجبر المنافس على الركض دون جدوى، ومهد لثغرات حاسمة بين خطوطه الخلفية.';
    }
  } else if (activeStyle === 'wing_play') {
    primaryInsightArabic = 'أظهر الفريق فاعلية كبيرة في نقل اللعب للأروقة، وصنع الجناحان خطورة متواصلة بالعرضيات داخل منطقة الجزاء.';
  } else {
    primaryInsightArabic = 'توازن تكتيكي منضبط في توزيع خطوط الفريق، حافظ على نسق المباراة ومنع المباغتات الفنية من جانب الخصم.';
  }

  // Secondary tactical feedback
  if (matchEventsSummary.hadRedCard) {
    secondaryInsightArabic = 'حالة الطرد فرضت ضغطاً بدنياً إضافياً؛ التعامل التكتيكي مع النقص العددي تطلب جهداً مضاعفاً في التغطية وتأمين المرمى.';
  } else if (userGoals > oppGoals) {
    secondaryInsightArabic = `التفوق التكتيكي للمدرب ظهر بوضوح في ترجمة الفرص المصنوعة واستغلال نقاط ضعف المنافس في التمركز الخلفي (+${overallTacticalScore >= 80 ? '12%' : '7%'} فاعلية).`;
  } else {
    secondaryInsightArabic = 'يحتاج الفريق لمزيد من التمرس على سرعة نقل الكرة من الدفاع للهجوم عند مواجهة التكتلات الدفاعية.';
  }

  // 3. Tactical Experience Points Earned
  const expGained = overallTacticalScore >= 80 ? 3 : overallTacticalScore >= 65 ? 2 : 1;
  const newExpTotal = Math.min(100, currentExp + expGained);

  return {
    pressingRating,
    buildUpRating,
    defensiveOrgRating,
    chanceCreationRating,
    adjustmentsRating,
    overallTacticalScore,
    primaryInsightArabic,
    secondaryInsightArabic,
    staminaWarningArabic,
    tacticalExpGained: [
      {
        styleId: activeStyle,
        styleNameArabic: activeStyleMeta.nameArabic,
        expGained,
        newTotal: newExpTotal,
      },
    ],
    tacticalSynergyBonus: Math.round((overallTacticalScore - 70) / 3),
  };
}
