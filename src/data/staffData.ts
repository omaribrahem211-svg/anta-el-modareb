import { StaffMember, StaffRole, Club } from '../types/game';

export const AVAILABLE_STAFF_CANDIDATES: StaffMember[] = [
  // 1. مدرب مساعد أول (Assistant Manager)
  {
    id: 'asst_cand_1',
    name: 'كابتن طارق السعيد',
    role: 'assistant_manager',
    roleTitleArabic: 'مدرب مساعد أول',
    rating: 4,
    salaryMonthly: 12000,
    specialty: 'التكتيك المعاكس وتوجيه التبديلات',
    description: 'خبرة طويلة كمدرب مساعد في أندية القمة، يجيد قراءة سيناريوهات المباريات وتوجيه التدخلات السريعة.',
    bonusEffectArabic: '+7% كفاءة تكتيكية في المباريات وتدخلات تبديل ذكية عند تراجع اللياقة.',
  },
  {
    id: 'asst_cand_2',
    name: 'خوانما ليلو سانتوس',
    role: 'assistant_manager',
    roleTitleArabic: 'مدرب مساعد أول عالمي',
    rating: 5,
    salaryMonthly: 28000,
    specialty: 'السيطرة والتمركز الموضعي الذكي',
    description: 'مدرب تكتيكي عبقري عمل في كبرى الدوريات الأوروبية، يرفع أداء الفريق التكتيكي إلى أقصى درجات الإتقان.',
    bonusEffectArabic: '+12% تناغم تكتيكي وتوجيه فوري لأفضل سيناريو للفوز ضد تشكيلة الخصم.',
  },
  {
    id: 'asst_cand_3',
    name: 'كابتن محمود فايز',
    role: 'assistant_manager',
    roleTitleArabic: 'مدرب مساعد ومخطط خططي',
    rating: 3,
    salaryMonthly: 6500,
    specialty: 'الانضباط والتحولات الدفاعية',
    description: 'مساعد مجتهد يحافظ على التزام اللاعبين بالخطة ويدير دكة البدلاء بكفاءة جيدة.',
    bonusEffectArabic: '+5% انضباط دفاعي وتبديلات سريعة للاعبين المنهكين.',
  },
  {
    id: 'asst_cand_4',
    name: 'كابتن وليد صلاح',
    role: 'assistant_manager',
    roleTitleArabic: 'مدرب مساعد واعد',
    rating: 2,
    salaryMonthly: 3500,
    specialty: 'التنسيق الميداني والروح المعنوية',
    description: 'مدرب شاب في بداية مسيرته الفنية، يقدم دعماً مناسباً للمدرب الأول.',
    bonusEffectArabic: '+3% تناغم تكتيكي عام.',
  },

  // 2. مدرب لياقة وأحمال (Fitness Coach)
  {
    id: 'fit_cand_1',
    name: 'د. ميكيل فيلاسكو',
    role: 'fitness_coach',
    roleTitleArabic: 'كبير مخططي الأحمال واللياقة',
    rating: 5,
    salaryMonthly: 24000,
    specialty: 'علم وظائف الأعضاء والاستشفاء السريع',
    description: 'أستاذ تربية بدنية أوروبي، يضع برامج أحمال فائقة الدقة تحافظ على طاقة اللاعبين طوال 90 دقيقة.',
    bonusEffectArabic: 'تقليل استنزاف لياقة اللاعبين في المباريات بنسبة 40% وتسريع استشفاء البدلاء +50%.',
  },
  {
    id: 'fit_cand_2',
    name: 'كابتن عمرو بركات',
    role: 'fitness_coach',
    roleTitleArabic: 'مدرب لياقة بدنية أول',
    rating: 4,
    salaryMonthly: 11000,
    specialty: 'اللياقة الهوائية والقدرة على التحمل',
    description: 'أخصائي إعداد بدني بخبرة إفريقية وعربية، يمنح اللاعبين قدرة ركض متواصل حتى الدقائق الأخيرة.',
    bonusEffectArabic: 'تقليل استنزاف اللياقة بنسبة 30% وتسريع استعادة الطاقة بعد الراحة +35%.',
  },
  {
    id: 'fit_cand_3',
    name: 'كابتن شريف عبد المنعم',
    role: 'fitness_coach',
    roleTitleArabic: 'أخصائي تأهيل بدني',
    rating: 3,
    salaryMonthly: 5500,
    specialty: 'تقوية العضلات وتجنب الإجهاد',
    description: 'مدرب بدني كفء يركز على توازن الأحمال البدنية وتجنب الإرهاق التراكمي.',
    bonusEffectArabic: 'تقليل استنزاف اللياقة بنسبة 20% ورفع الاستشفاء +20%.',
  },
  {
    id: 'fit_cand_4',
    name: 'كابتن يحيى خليل',
    role: 'fitness_coach',
    roleTitleArabic: 'مساعد تدريب أحمال',
    rating: 2,
    salaryMonthly: 2800,
    specialty: 'الإحماء العام والاستشفاء العضلي',
    description: 'مدرب شاب يساعد في قيادة عمليات الإحماء وبرامج الركض الخفيف.',
    bonusEffectArabic: 'تقليل استنزاف اللياقة بنسبة 10%.',
  },

  // 3. طبيب نفسي رياضي (Sports Psychologist)
  {
    id: 'psy_cand_1',
    name: 'د. أحمد كمال الشربيني',
    role: 'psychologist',
    roleTitleArabic: 'استشاري الطب النفسي الرياضي الدولي',
    rating: 5,
    salaryMonthly: 19000,
    specialty: 'إدارة أزمات اللاعبين والثقة بالنفس',
    description: 'خبير عالمي في السيكولوجيا الرياضية، يمنع انهيار معنويات البدلاء ويزرع عقلية الانتصارات في الفريق.',
    bonusEffectArabic: 'حماية معنويات لاعبي الدكة بنسبة 60% ومنع طلبات الرحيل + تعزيز هدوء الفريق في الأوقات الحاسمة.',
  },
  {
    id: 'psy_cand_2',
    name: 'د. مروان الشافعي',
    role: 'psychologist',
    roleTitleArabic: 'أخصائي الإعداد النفسي والذهني',
    rating: 4,
    salaryMonthly: 9500,
    specialty: 'التماسك الأسري داخل غرفة الملابس',
    description: 'يتعامل باحترافية مع غضب النجوم ويحافظ على روح التعاون والهدوء داخل المجموعة.',
    bonusEffectArabic: 'تقليل تراجع معنويات البدلاء بنسبة 45% وتحسين استجابة اللاعبين للتوجيهات.',
  },
  {
    id: 'psy_cand_3',
    name: 'د. سارة المنشاوي',
    role: 'psychologist',
    roleTitleArabic: 'مرشدة سلوكية وتطوير ذاتي',
    rating: 3,
    salaryMonthly: 4800,
    specialty: 'التركيز وتفريغ الضغوط العصبية',
    description: 'تساعد اللاعبين على التخلص من التوتر قبل المباريات الكبيرة واحتواء خيبة أمل الاستبعاد.',
    bonusEffectArabic: 'تقليل تراجع معنويات البدلاء بنسبة 25%.',
  },
  {
    id: 'psy_cand_4',
    name: 'أ. خالد منصور',
    role: 'psychologist',
    roleTitleArabic: 'أخصائي تحفيز رياضي',
    rating: 2,
    salaryMonthly: 2200,
    specialty: 'التحفيز الإيجابي البسيط',
    description: 'يقدم جلسات تحفيزية خفيفة ويشجع اللاعبين على التفاؤل والعمل الجاد.',
    bonusEffectArabic: 'تقليل تراجع معنويات البدلاء بنسبة 12%.',
  },

  // 4. رئيس الجهاز الطبي (Chief Medical Doctor)
  {
    id: 'med_cand_1',
    name: 'د. أنخيل كابريرا غونزاليس',
    role: 'medical_doctor',
    roleTitleArabic: 'رئيس الجهاز الطبي (استشاري جراحة عظام وإصابات ملاعب)',
    rating: 5,
    salaryMonthly: 26000,
    specialty: 'الوقاية المتقدمة والعلاج التجديدي السريع',
    description: 'طبيب معتمد من الاتحاد الدولي (FIFA)، يشخص المؤشرات المبكرة للإجهاد ويقلص فترات غياب المصابين للنصف.',
    bonusEffectArabic: 'خفض خطر الإصابات بنسبة 70% حتى عند انخفاض اللياقة، وتقليص مدة التعافي من الإصابات بأسبوعين.',
  },
  {
    id: 'med_cand_2',
    name: 'د. طارق رضوان',
    role: 'medical_doctor',
    roleTitleArabic: 'طبيب الفريق الأول',
    rating: 4,
    salaryMonthly: 11500,
    specialty: 'علاج تمزقات الأربطة والشد العضلي',
    description: 'طبيب ذو باع طويل في الملاعب، يمتلك عيادة متطورة لعلاج وتأهيل المصابين بسرعة فائقة.',
    bonusEffectArabic: 'خفض خطر الإصابات بنسبة 50% وتقليص مدة التعافي بنسبة 35%.',
  },
  {
    id: 'med_cand_3',
    name: 'د. محمد أسامة',
    role: 'medical_doctor',
    roleTitleArabic: 'طبيب عظام وعلاج طبيعي',
    rating: 3,
    salaryMonthly: 5800,
    specialty: 'الفحص الدوري والعلاج الطبيعي',
    description: 'يشرف على برنامج الوقاية والعلاج الميداني اليومي لجميع أفراد القائمة.',
    bonusEffectArabic: 'خفض خطر الإصابات بنسبة 30% مع تقليص فترة الشفاء أسبوعاً.',
  },
  {
    id: 'med_cand_4',
    name: 'د. سمير الجندي',
    role: 'medical_doctor',
    roleTitleArabic: 'طبيب عام للنادي',
    rating: 2,
    salaryMonthly: 2600,
    specialty: 'الإسعافات الأولية والرعاية الصحية الأساسية',
    description: 'طبيب عام يشرف على الملفات الطبية الروتينية وصحة اللاعبين العامة.',
    bonusEffectArabic: 'خفض خطر الإصابات بنسبة 15%.',
  },

  // 5. محلل أداء بالفيديو وتكتيك (Performance / Video Analyst)
  {
    id: 'ana_cand_1',
    name: 'م. لوكاس شنايدر',
    role: 'performance_analyst',
    roleTitleArabic: 'رئيس قسم تحليل الأداء والبيانات التكتيكية',
    rating: 5,
    salaryMonthly: 21000,
    specialty: 'التحليل التنبؤي وكشف ثغرات المنافسين بالفيديو',
    description: 'محلل تكتيكي سابق في البوندسليغا، يفكك طريقة لعب الخصم بالكامل ويقدم للمدرب روشتة الفوز الدقيقة.',
    bonusEffectArabic: '+10% أفضلية هجومية ودفاعية باستغلال ثغرات المنافس المحددة، وتقرير استكشافي ذكي قبل كل لقاء.',
  },
  {
    id: 'ana_cand_2',
    name: 'كابتن هيثم فاروق',
    role: 'performance_analyst',
    roleTitleArabic: 'محلل أداء فني وتكتيكي أول',
    rating: 4,
    salaryMonthly: 9800,
    specialty: 'رصد المساحات ونقاط ضعف المدافعين',
    description: 'محلل خبير يجيد رصد ثغرات حراس المرمى وخطوط دفاع المنافس وتزويد المهاجمين بسبل التسجيل.',
    bonusEffectArabic: '+7% كفاءة هجومية في اختراق خطوط الخصم مع تحليل شامل للتشكيل.',
  },
  {
    id: 'ana_cand_3',
    name: 'كابتن كريم شحاتة',
    role: 'performance_analyst',
    roleTitleArabic: 'محلل فيديو وإحصائيات',
    rating: 3,
    salaryMonthly: 5000,
    specialty: 'تحليل الكرات الثابتة والمراقبة الفردية',
    description: 'يركز على تحييد مفاتيح لعب الخصم ودراسة الكرات الثابتة دفاعياً وهجومياً.',
    bonusEffectArabic: '+4% صلابة في التصدي لمفاتيح لعب المنافس.',
  },
  {
    id: 'ana_cand_4',
    name: 'أ. أحمد نبيل',
    role: 'performance_analyst',
    roleTitleArabic: 'باحث إحصائي رقمي',
    rating: 2,
    salaryMonthly: 2400,
    specialty: 'تجميع إحصائيات التمرير والتسديد',
    description: 'محلل شاب يقدم أرقاماً ومؤشرات إحصائية أساسية عن فرق الدوري.',
    bonusEffectArabic: '+2% فاعلية استكشافية.',
  },
];

/**
 * Returns default starter staff for a club based on its reputation / tier
 */
export function getDefaultStaffForClub(club: Club): StaffMember[] {
  const rep = club.reputation || 50;
  
  if (rep >= 85) {
    // Elite tier clubs (e.g. Real Madrid, Man City, Al Ahly)
    return [
      AVAILABLE_STAFF_CANDIDATES[1], // 5-star assistant
      AVAILABLE_STAFF_CANDIDATES[4], // 5-star fitness
      AVAILABLE_STAFF_CANDIDATES[8], // 5-star psychologist
      AVAILABLE_STAFF_CANDIDATES[12], // 5-star doctor
      AVAILABLE_STAFF_CANDIDATES[16], // 5-star analyst
    ];
  } else if (rep >= 70) {
    // Upper tier clubs
    return [
      AVAILABLE_STAFF_CANDIDATES[0], // 4-star assistant
      AVAILABLE_STAFF_CANDIDATES[5], // 4-star fitness
      AVAILABLE_STAFF_CANDIDATES[9], // 4-star psychologist
      AVAILABLE_STAFF_CANDIDATES[13], // 4-star doctor
      AVAILABLE_STAFF_CANDIDATES[17], // 4-star analyst
    ];
  } else if (rep >= 50) {
    // Mid tier clubs
    return [
      AVAILABLE_STAFF_CANDIDATES[2], // 3-star assistant
      AVAILABLE_STAFF_CANDIDATES[6], // 3-star fitness
      AVAILABLE_STAFF_CANDIDATES[10], // 3-star psychologist
      AVAILABLE_STAFF_CANDIDATES[14], // 3-star doctor
      AVAILABLE_STAFF_CANDIDATES[18], // 3-star analyst
    ];
  } else {
    // Lower tier clubs
    return [
      AVAILABLE_STAFF_CANDIDATES[3], // 2-star assistant
      AVAILABLE_STAFF_CANDIDATES[7], // 2-star fitness
      AVAILABLE_STAFF_CANDIDATES[11], // 2-star psychologist
      AVAILABLE_STAFF_CANDIDATES[15], // 2-star doctor
      AVAILABLE_STAFF_CANDIDATES[19], // 2-star analyst
    ];
  }
}
