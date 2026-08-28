import type { ExtractionDraft } from "./schema";
import type {
  ExtractionSourceRecord,
  MedicalDocument,
  MedicalDocumentTemplateKey,
  SourceSystemChart,
  SourceSystemPatient,
} from "./types";

interface DemoEncounter extends SourceSystemChart {
  draft: ExtractionDraft;
}

interface OralSurgeryCase {
  patient: SourceSystemPatient;
  stageIndex: number;
  complaint: string;
  presentIllness: string;
  pastHistory: string;
  specialtyExam: string;
  auxiliaryExam: string;
  diagnosis: string;
  differential: string;
  plan: string;
  operationName: string;
  anesthesia: string;
  operationFindings: string;
  operationProcess: string;
  bloodLoss: string;
  drainage: string;
  specimen: string;
  postoperativeStatus: string;
  postoperativeDay1: string;
  postoperativeDay3: string;
}

type LegacyMedicalDocumentKey =
  | "admission_record"
  | "first_progress"
  | "next_day_progress"
  | "preoperative_summary"
  | "preoperative_discussion"
  | "operation_record"
  | "first_postoperative_progress"
  | "postoperative_day_1"
  | "postoperative_day_3";

export const medicalDocumentTemplates: Array<{
  key: MedicalDocumentTemplateKey;
  title: string;
}> = [
  { key: "admission_record", title: "入院记录" },
  { key: "first_progress", title: "首次病程记录" },
  { key: "routine_progress", title: "日常病程记录" },
  { key: "preoperative_summary", title: "术前小结" },
  { key: "preoperative_discussion", title: "术前讨论记录" },
  { key: "operation_record", title: "手术记录" },
  { key: "first_postoperative_progress", title: "术后首次病程记录" },
  { key: "postoperative_progress", title: "术后病程记录" },
  { key: "pathology_progress", title: "病理结果及病程记录" },
  { key: "discharge_record", title: "出院记录" },
];

const cases: OralSurgeryCase[] = [
  {
    patient: {
      id: "omfs-patient-03",
      encounterId: "OMFS20260826003",
      wardOrder: 1,
      bedNo: "03",
      name: "许女士",
      gender: "女",
      age: 36,
      diagnosis: "左下颌骨成釉细胞瘤待查",
      stageLabel: "今日新入院",
      admissionDate: "2026-08-29",
      currentSituation: "左下颌后牙区膨隆，已完成入院评估，等待进一步影像检查。",
      updatedAt: "2026-08-29T18:26:00+08:00",
      sourceCounts: { records: 2, orders: 2, reports: 2 },
    },
    stageIndex: 1,
    complaint: "发现左下颌后牙区无痛性膨隆6个月。",
    presentIllness:
      "患者6个月前刷牙时发现左下颌后牙区轻度膨隆，无明显疼痛及下唇麻木，近2个月自觉膨隆缓慢增大。外院曲面断层片提示左下颌体部多房性透射影，为进一步诊治收入院。病程中进食、睡眠可，体重无明显变化。",
    pastHistory: "既往体健，否认高血压、糖尿病及药物过敏史，无颌面部手术史。",
    specialtyExam:
      "面型基本对称，左下颌磨牙区颊侧骨板膨隆约3.0cm×2.0cm，表面黏膜完整，无压痛，左下唇感觉存在，张口度约3.5cm。",
    auxiliaryExam:
      "外院曲面断层片示左下颌第一磨牙至下颌角区多房性透射影，边界较清。入院血常规、凝血功能未见明显异常。",
    diagnosis: "左下颌骨占位性病变：成釉细胞瘤可能。",
    differential: "需与牙源性角化囊肿、中央性巨细胞病变鉴别，待增强CT及组织病理明确。",
    plan: "完善下颌骨增强CT及胸部影像；择期行局部活检，根据病理及病变范围制定手术方案。",
    operationName: "待定",
    anesthesia: "待定",
    operationFindings: "尚未手术。",
    operationProcess: "尚未手术。",
    bloodLoss: "—",
    drainage: "—",
    specimen: "—",
    postoperativeStatus: "—",
    postoperativeDay1: "—",
    postoperativeDay3: "—",
  },
  {
    patient: {
      id: "omfs-patient-07",
      encounterId: "OMFS20260825007",
      wardOrder: 2,
      bedNo: "07",
      name: "梁先生",
      gender: "男",
      age: 61,
      diagnosis: "右舌缘鳞状细胞癌 cT2N0M0",
      stageLabel: "明日手术",
      admissionDate: "2026-08-25",
      currentSituation: "术前检查完成，已讨论手术方案，等待明晨手术。",
      updatedAt: "2026-08-29T18:18:00+08:00",
      sourceCounts: { records: 5, orders: 3, reports: 4 },
    },
    stageIndex: 4,
    complaint: "右舌缘溃疡伴疼痛2个月。",
    presentIllness:
      "患者2个月前出现右舌缘约黄豆大小溃疡，进食辛辣食物时疼痛，近期范围增大。门诊活检病理示高分化鳞状细胞癌，增强MRI未见明显颈部转移淋巴结，为手术治疗收入院。",
    pastHistory: "高血压病史8年，口服氨氯地平控制；吸烟30年，已戒烟1个月；否认药物过敏。",
    specialtyExam:
      "右舌侧缘中后部见约2.2cm×1.6cm溃疡型病灶，质硬，活动度尚可，未越过舌中线；双侧颈部未触及明显肿大淋巴结。",
    auxiliaryExam:
      "病理：高分化鳞状细胞癌。颌面颈部增强MRI示右舌缘病灶最大径约2.3cm，未见明显舌外肌侵犯；胸部CT未见明确远处转移。",
    diagnosis: "右舌缘鳞状细胞癌 cT2N0M0；高血压病2级。",
    differential: "病理已明确，需结合术后病理进一步完成分期。",
    plan: "拟行右舌癌扩大切除术、右颈淋巴清扫术及前臂游离皮瓣修复术；围术期监测血压。",
    operationName: "右舌癌扩大切除术+右颈淋巴清扫术+前臂游离皮瓣修复术",
    anesthesia: "全身麻醉",
    operationFindings: "尚未手术。",
    operationProcess: "尚未手术。",
    bloodLoss: "—",
    drainage: "—",
    specimen: "—",
    postoperativeStatus: "—",
    postoperativeDay1: "—",
    postoperativeDay3: "—",
  },
  {
    patient: {
      id: "omfs-patient-12",
      encounterId: "OMFS20260824012",
      wardOrder: 3,
      bedNo: "12",
      name: "周女士",
      gender: "女",
      age: 48,
      diagnosis: "左腮腺多形性腺瘤",
      stageLabel: "手术当日",
      admissionDate: "2026-08-24",
      currentSituation: "今日完成左腮腺浅叶切除，术后返回病房，切口引流在位。",
      updatedAt: "2026-08-29T18:34:00+08:00",
      sourceCounts: { records: 7, orders: 4, reports: 3 },
    },
    stageIndex: 6,
    complaint: "左耳前区无痛性肿物3年，近半年缓慢增大。",
    presentIllness:
      "患者3年前发现左耳前区约花生米大小肿物，无疼痛及面瘫，近半年增至约2.5cm。超声及MRI考虑腮腺浅叶良性肿瘤，为手术治疗收入院。",
    pastHistory: "既往甲状腺功能减退，口服左甲状腺素；否认药物过敏。",
    specialtyExam:
      "左耳垂下方触及约2.5cm×2.0cm肿物，界较清、活动尚可、无压痛；双侧面神经功能正常。",
    auxiliaryExam:
      "MRI示左腮腺浅叶类圆形结节，约2.6cm，边界清楚；细针穿刺倾向多形性腺瘤。",
    diagnosis: "左腮腺多形性腺瘤。",
    differential: "需与沃辛瘤、基底细胞腺瘤鉴别，最终以术后病理为准。",
    plan: "完善术前准备后行左腮腺浅叶切除术及面神经解剖术。",
    operationName: "左腮腺浅叶切除术+面神经解剖术",
    anesthesia: "全身麻醉",
    operationFindings:
      "肿物位于左腮腺浅叶，约2.6cm×2.2cm，包膜完整，与面神经分支无明显粘连。",
    operationProcess:
      "按改良S形切口进入，翻瓣后显露面神经主干并逐支解剖保护，连同腮腺浅叶完整切除肿物，确认面神经连续性良好后冲洗止血并分层缝合。",
    bloodLoss: "约40ml",
    drainage: "左耳后负压引流管1根",
    specimen: "左腮腺浅叶肿物送常规病理",
    postoperativeStatus:
      "18:00安返病房，神志清，生命体征平稳；左侧额纹、闭眼及口角活动可，切口敷料干燥，引流少量淡血性液。",
    postoperativeDay1: "—",
    postoperativeDay3: "—",
  },
  {
    patient: {
      id: "omfs-patient-16",
      encounterId: "OMFS20260801016",
      wardOrder: 4,
      bedNo: "16",
      name: "陈先生",
      gender: "男",
      age: 57,
      diagnosis: "口底鳞状细胞癌术后",
      stageLabel: "住院第29日 · 术后第18日",
      admissionDate: "2026-08-01",
      currentSituation: "口底癌联合根治术后恢复期，已连续记录多篇病程，继续功能训练及创面观察。",
      updatedAt: "2026-08-29T18:40:00+08:00",
      sourceCounts: { records: 8, orders: 5, reports: 4 },
    },
    stageIndex: 7,
    complaint: "口底肿物伴舌活动受限3个月。",
    presentIllness:
      "患者3个月前出现口底疼痛性肿物，逐渐出现舌活动受限及进食不适。活检示鳞状细胞癌，影像提示病变邻近下颌骨舌侧骨板，为综合手术治疗收入院。",
    pastHistory: "2型糖尿病6年，口服二甲双胍；长期吸烟饮酒史；青霉素皮试阳性。",
    specialtyExam:
      "口底前部见约3.5cm浸润性肿物，质硬，舌体上抬受限；左颈Ⅱ区可触及约1.5cm淋巴结。",
    auxiliaryExam:
      "增强CT示口底占位约3.6cm，邻近下颌骨舌侧骨板；左颈Ⅱ区淋巴结考虑转移。活检病理为中分化鳞状细胞癌。",
    diagnosis: "口底鳞状细胞癌 cT4aN1M0；2型糖尿病。",
    differential: "病理已明确，术后根据切缘及淋巴结病理确定后续治疗。",
    plan: "行口底癌扩大切除、下颌骨边缘性切除、左颈淋巴清扫、股前外侧游离皮瓣修复及气管切开。",
    operationName: "口底癌扩大切除+下颌骨边缘性切除+左颈淋巴清扫+股前外侧游离皮瓣修复+气管切开术",
    anesthesia: "全身麻醉",
    operationFindings:
      "口底肿瘤约3.8cm，累及邻近下颌骨舌侧骨膜；左颈Ⅱ区见肿大淋巴结。",
    operationProcess:
      "完成气管切开后行原发灶扩大切除及下颌骨边缘性切除，同期完成左颈淋巴清扫；切取左股前外侧皮瓣修复口底缺损，显微吻合血管后皮瓣血运良好。",
    bloodLoss: "约320ml",
    drainage: "左颈负压引流管2根、供区引流管1根",
    specimen: "原发灶、下颌骨边缘及左颈各区淋巴结分别送病理",
    postoperativeStatus:
      "术后转重症监护病房，气管套管通畅，皮瓣色泽红润、毛细血管反应存在，颈部引流通畅。",
    postoperativeDay1:
      "患者神志清，气管套管吸氧下SpO₂ 98%，体温37.4℃。皮瓣色泽红润、温度可，针刺有鲜红血渗出；左颈两根引流共约85ml淡血性液。空腹血糖8.6mmol/L。",
    postoperativeDay3: "—",
  },
  {
    patient: {
      id: "omfs-patient-21",
      encounterId: "OMFS20260821021",
      wardOrder: 5,
      bedNo: "21",
      name: "顾女士",
      gender: "女",
      age: 43,
      diagnosis: "左上颌骨含牙囊肿术后",
      stageLabel: "术后第3日",
      admissionDate: "2026-08-21",
      currentSituation: "上颌骨囊肿刮治术后第3日，面部肿胀减轻，口内创面无活动性出血。",
      updatedAt: "2026-08-29T17:56:00+08:00",
      sourceCounts: { records: 9, orders: 3, reports: 3 },
    },
    stageIndex: 8,
    complaint: "左上后牙区反复胀痛1年。",
    presentIllness:
      "患者1年来左上后牙区间断胀痛，抗炎后可缓解。近期曲面断层片发现左上颌骨囊性透射影包绕埋伏牙，为手术治疗收入院。",
    pastHistory: "既往体健，否认系统性疾病及药物过敏。",
    specialtyExam:
      "左上颌结节区轻度膨隆，黏膜完整，无明显波动感；左上第三磨牙未萌出，相邻牙无明显松动。",
    auxiliaryExam:
      "CBCT示左上颌骨后部约3.2cm囊性低密度影，包绕埋伏左上第三磨牙牙冠，上颌窦底受压抬高。",
    diagnosis: "左上颌骨含牙囊肿。",
    differential: "需与牙源性角化囊肿、单囊型成釉细胞瘤鉴别。",
    plan: "行左上颌骨囊肿刮治术及埋伏牙拔除术，标本送病理。",
    operationName: "左上颌骨囊肿刮治术+埋伏牙拔除术",
    anesthesia: "全身麻醉",
    operationFindings:
      "左上颌骨后部囊腔约3.0cm，囊壁完整，腔内含埋伏左上第三磨牙。",
    operationProcess:
      "翻瓣后开窗显露囊腔，完整分离并刮除囊壁，拔除埋伏牙，修整骨缘并充分冲洗，碘仿纱条引流后缝合。",
    bloodLoss: "约20ml",
    drainage: "口内碘仿纱条1条",
    specimen: "囊壁及埋伏牙周软组织送病理",
    postoperativeStatus:
      "术后安返病房，生命体征平稳，左面中部轻度肿胀，口内创面无活动性出血。",
    postoperativeDay1:
      "左面中部肿胀较术后即刻略加重，疼痛评分3分，口内创面无渗血，体温正常，可进流质。",
    postoperativeDay3:
      "左面中部肿胀较前明显减轻，无发热及鼻腔溢液，口内创面清洁，碘仿纱条已部分退出约1cm。病理结果尚未回报。",
  },
];

function dateForDocument(index: number, caseData: OralSurgeryCase) {
  const offsetsByStage: Record<number, number[]> = {
    1: [0, 0],
    4: [-4, -4, -3, 0, 0],
    6: [-5, -5, -4, -1, -1, 0, 0],
    7: [-6, -6, -5, -2, -2, -1, -1, 0],
    8: [-8, -8, -7, -4, -4, -3, -3, -2, 0],
  };
  const base = new Date("2026-08-29T09:00:00+08:00");
  const offset = offsetsByStage[caseData.stageIndex]?.[index] ?? 0;
  base.setDate(base.getDate() + offset);
  base.setHours(index === 5 ? 15 : index === 6 ? 18 : index === 4 ? 17 : 9, index * 3, 0, 0);
  return base.toISOString();
}

function documentContent(caseData: OralSurgeryCase, key: LegacyMedicalDocumentKey) {
  const p = caseData.patient;
  const isDiabetic = p.id === "omfs-patient-16";
  const isHypertensive = p.id === "omfs-patient-07";
  const allergyHistory = isDiabetic
    ? "青霉素皮试阳性，否认其他明确药物及食物过敏史。"
    : "否认药物及食物过敏史。";
  const personalHistory =
    p.id === "omfs-patient-07" || p.id === "omfs-patient-16"
      ? "出生并长期居住于本地，无疫区及职业性毒物接触史；有长期吸烟史，已接受戒烟宣教。"
      : "出生并长期居住于本地，无疫区及特殊化学物质接触史，无吸烟及酗酒史。";
  const vitals = isHypertensive
    ? "体温36.6℃，脉搏78次/分，呼吸18次/分，血压142/84mmHg。"
    : isDiabetic
      ? "体温36.7℃，脉搏82次/分，呼吸18次/分，血压134/80mmHg。"
      : "体温36.5℃，脉搏76次/分，呼吸18次/分，血压128/76mmHg。";
  const diagnosisBasis = `患者因“${caseData.complaint.replace(/。$/, "")}”入院；专科检查提示${caseData.specialtyExam}辅助检查提示${caseData.auxiliaryExam}，结合病史、查体及影像或病理资料，考虑${caseData.diagnosis}`;
  const map: Record<LegacyMedicalDocumentKey, string> = {
    admission_record: `【患者基本信息】\n姓名：${p.name}  性别：${p.gender}  年龄：${p.age}岁  婚姻：已婚\n入院日期：${p.admissionDate}  病史陈述者：患者本人  可靠程度：可靠\n\n【主诉】\n${caseData.complaint}\n\n【现病史】\n${caseData.presentIllness}\n\n【既往史】\n${caseData.pastHistory}\n\n【过敏史】\n${allergyHistory}\n\n【个人史】\n${personalHistory}\n\n【婚育史】\n已婚，家庭成员体健。\n\n【家族史】\n家族中无类似肿瘤及明确遗传性疾病史。\n\n【体格检查】\n${vitals}神志清楚，营养中等，查体合作。双肺呼吸音清，心律齐，腹部平软，双下肢无水肿。\n\n【专科检查】\n${caseData.specialtyExam}\n\n【辅助检查】\n${caseData.auxiliaryExam}\n\n【初步诊断】\n${caseData.diagnosis}\n\n【诊断依据】\n${diagnosisBasis}\n\n【鉴别诊断】\n${caseData.differential}\n\n【诊疗计划】\n${caseData.plan}`,
    first_progress: `记录时间：${formatDocumentDate(dateForDocument(1, caseData))}\n\n患者${p.name}，${p.gender}，${p.age}岁，因“${caseData.complaint.replace(/。$/, "")}”入院。\n\n病例特点：\n1. ${p.age}岁${p.gender === "男" ? "男性" : "女性"}，病程及起病特点详见入院记录。\n2. 主诉为${caseData.complaint}\n3. 专科检查：${caseData.specialtyExam}\n4. 辅助检查：${caseData.auxiliaryExam}\n5. 目前诊断考虑${caseData.diagnosis}\n\n拟诊讨论：${diagnosisBasis}\n\n鉴别诊断：${caseData.differential}\n\n诊疗计划：${caseData.plan}\n\n已向患者及家属说明目前病情、诊疗原则、可能的手术方式及相关风险，患者及家属表示理解。`,
    next_day_progress: `记录时间：${formatDocumentDate(dateForDocument(2, caseData))}\n\n患者神志清楚，精神及睡眠尚可。诉原发部位症状较前无明显变化，无明显出血、发热、胸闷及呼吸困难，饮食及大小便正常。\n\n查体：${vitals}心肺及腹部查体未见明显异常。专科检查：${caseData.specialtyExam}\n\n已复核相关检查：${caseData.auxiliaryExam}\n\n今日继续完善术前或进一步诊断性检查，给予口腔清洁、营养支持及宣教。当前诊断为${caseData.diagnosis}。后续计划：${caseData.plan}`,
    preoperative_summary: `记录时间：${formatDocumentDate(dateForDocument(3, caseData))}\n\n患者${caseData.diagnosis}诊断依据充分，术前检查已复核，心肺功能基本能够耐受手术，目前无明确手术禁忌。\n\n拟行手术：${caseData.operationName}。\n\n拟行麻醉：${caseData.anesthesia}。\n\n术前准备：\n1. 已完善血型及交叉配血；\n2. 已完成口腔清洁及手术区域准备；\n3. 按麻醉要求术前禁食、禁饮；\n4. 相关基础疾病继续监测；\n5. 已签署手术、麻醉及输血知情同意书；\n6. 术中标本按部位标记并规范送检，必要时行快速冰冻病理。`,
    preoperative_discussion: `讨论时间：${formatDocumentDate(dateForDocument(4, caseData))}\n\n参加人员：科主任、主任医师、主治医师、住院医师、麻醉医师等。\n\n讨论意见：\n${diagnosisBasis}\n\n根据当前病变范围及诊断，患者具有手术指征。拟行${caseData.operationName}，麻醉方式为${caseData.anesthesia}。手术中应保证病变安全切缘，规范处理标本并保护邻近重要神经、血管及功能组织。\n\n主要风险包括术中及术后出血、感染、切口或皮瓣愈合不良、神经损伤、功能障碍，以及病变残留、复发或进一步治疗等。经讨论，手术方案可行。`,
    operation_record: `手术日期：${formatDocumentDate(dateForDocument(5, caseData))}\n术前诊断：${caseData.diagnosis}\n术后诊断：同术前诊断，最终以常规病理为准\n手术名称：${caseData.operationName}\n麻醉方式：${caseData.anesthesia}\n手术体位：仰卧位，肩部垫高，头位按术区调整\n术中出血量：${caseData.bloodLoss}\n输血：未输血\n引流：${caseData.drainage}\n标本：${caseData.specimen}\n\n手术经过：\n麻醉成功后，患者取相应体位，常规消毒铺巾。${caseData.operationFindings}\n\n${caseData.operationProcess}\n\n术野彻底止血并冲洗，按计划放置引流，逐层关闭切口。清点器械、纱布无误。患者术中生命体征平稳，按计划返回病房或监护病房。`,
    first_postoperative_progress: `记录时间：${formatDocumentDate(dateForDocument(6, caseData))}\n\n患者今日在${caseData.anesthesia}下完成${caseData.operationName}。术中所见：${caseData.operationFindings}\n\n手术过程顺利，术中出血${caseData.bloodLoss}，未输血；引流：${caseData.drainage}；标本：${caseData.specimen}。\n\n术后患者情况：${caseData.postoperativeStatus}\n\n术后处理：\n1. 持续监测生命体征及血氧饱和度；\n2. 保持呼吸道通畅；\n3. 观察口腔创面、切口及相关功能；\n4. 记录引流液颜色及引流量；\n5. 按医嘱给予补液、镇痛、消肿及短期预防性抗感染治疗；\n6. 加强口腔护理及营养支持；\n7. 警惕术后出血、血肿、感染及组织血运障碍。`,
    postoperative_day_1: `记录时间：${formatDocumentDate(dateForDocument(7, caseData))}\n\n${caseData.postoperativeDay1}\n\n患者无明显胸闷、呼吸困难及恶心呕吐。继续监测呼吸、创面及引流情况，按医嘱给予营养支持、镇痛、消肿和口腔护理。鼓励床旁活动及下肢主动运动，并根据术区恢复情况逐步开展功能训练。`,
    postoperative_day_3: `记录时间：${formatDocumentDate(dateForDocument(8, caseData))}\n\n${caseData.postoperativeDay3}\n\n继续口腔护理及营养支持，观察创面、引流和常规病理结果。根据恢复情况评估换药、拔管、饮食过渡及后续出院安排。`,
  };
  return map[key];
}

function formatDocumentDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function isoAt(day: number, hour = 9) {
  return `2026-08-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00+08:00`;
}

export function createDocumentFramework(
  patient: SourceSystemPatient,
  templateKey: MedicalDocumentTemplateKey,
) {
  const shared = `姓名：${patient.name}  性别：${patient.gender}  年龄：${patient.age}岁  床号：${patient.bedNo}床\n住院号：${patient.encounterId}`;
  const frameworks: Record<MedicalDocumentTemplateKey, string> = {
    admission_record: `${shared}\n\n【主诉】\n请填写本次就诊的主要症状、部位和持续时间。\n\n【现病史】\n请按时间顺序填写起病、演变、外院诊疗经过及伴随症状。\n\n【既往史】\n请填写既往疾病、手术、输血及传染病史。\n\n【过敏史】\n请填写药物及食物过敏史。\n\n【个人史 / 婚育史 / 家族史】\n请按科室模板补充。\n\n【体格检查】\n体温：  脉搏：  呼吸：  血压：\n\n【专科检查】\n请填写颌面部、口腔、颈部及相关神经功能检查。\n\n【辅助检查】\n请填写病理、影像、检验和心电图等结果。\n\n【初步诊断】\n1. \n\n【诊断依据】\n请填写。\n\n【鉴别诊断】\n1. \n\n【诊疗计划】\n1. `,
    first_progress: `${shared}\n记录时间：____年__月__日 __:__\n\n患者因“________”入院。\n\n【病例特点】\n1. \n2. \n3. \n\n【拟诊讨论】\n请结合病史、专科检查和辅助检查填写。\n\n【鉴别诊断】\n1. \n\n【诊疗计划】\n1. \n\n【医患沟通】\n已向患者及家属说明________。`,
    routine_progress: `${shared}\n记录时间：____年__月__日 __:__\n\n【今日主诉】\n请填写症状变化、睡眠、饮食及大小便情况。\n\n【生命体征】\n体温：  脉搏：  呼吸：  血压：  SpO₂：\n\n【专科检查】\n请填写术区、口腔、颈部、神经功能及引流情况。\n\n【今日检查结果】\n请填写已回结果及仍待回项目。\n\n【病情评估】\n请填写与前一日相比的变化。\n\n【诊疗计划】\n1. \n2. `,
    preoperative_summary: `${shared}\n记录时间：____年__月__日 __:__\n\n【简要病情】\n请填写。\n\n【术前诊断】\n1. \n\n【手术指征】\n请填写。\n\n【拟行手术】\n请填写。\n\n【拟行麻醉】\n请填写。\n\n【术前准备】\n1. 血型及交叉配血：\n2. 口腔清洁及备皮：\n3. 禁食禁饮：\n4. 知情同意：\n5. 其他：`,
    preoperative_discussion: `${shared}\n讨论时间：____年__月__日 __:__\n参加人员：________\n\n【病例汇报】\n请填写。\n\n【手术指征与方案】\n请填写。\n\n【切除及修复范围】\n请填写。\n\n【重要结构保护】\n请填写。\n\n【主要风险】\n1. \n\n【讨论结论】\n请填写。`,
    operation_record: `${shared}\n手术日期：____年__月__日\n术前诊断：\n术后诊断：\n手术名称：\n麻醉方式：\n手术体位：\n术者及助手：\n术中出血量：\n输血：\n引流：\n标本：\n\n【术中所见】\n请填写。\n\n【手术经过】\n请按解剖层次和操作顺序填写。\n\n【术毕情况】\n请填写生命体征、器械清点及去向。`,
    first_postoperative_progress: `${shared}\n记录时间：____年__月__日 __:__\n\n【手术名称及经过】\n请填写。\n\n【术中出血 / 输血 / 引流 / 标本】\n请填写。\n\n【术后生命体征】\n请填写。\n\n【术区及功能情况】\n请填写创面、皮瓣、面神经、气道和引流情况。\n\n【术后处理】\n1. 生命体征监测；\n2. 呼吸道管理；\n3. 创面及引流观察；\n4. 营养、镇痛和口腔护理；\n5. 其他：`,
    postoperative_progress: `${shared}\n记录时间：____年__月__日 __:__\n术后第____日\n\n【主诉及一般情况】\n请填写疼痛、睡眠、饮食、活动及呼吸情况。\n\n【生命体征】\n体温：  脉搏：  呼吸：  血压：  SpO₂：\n\n【术区检查】\n请填写切口、口腔创面、皮瓣、肿胀、神经功能及引流量。\n\n【辅助检查】\n请填写今日检验、影像和病理状态。\n\n【病情评估】\n请填写。\n\n【今日计划】\n1. \n2. `,
    pathology_progress: `${shared}\n记录时间：____年__月__日 __:__\n\n【病理结果】\n肿瘤或病变性质：\n大小及浸润深度：\n切缘：\n淋巴结：\n神经 / 脉管侵犯：\n病理分期：\n\n【病情评估及后续计划】\n请填写MDT、辅助治疗或随访计划。`,
    discharge_record: `${shared}\n\n【入院诊断】\n1. \n\n【出院诊断】\n1. \n\n【诊疗经过】\n请填写。\n\n【出院情况】\n请填写。\n\n【出院医嘱】\n1. 口腔及创面护理：\n2. 饮食：\n3. 功能训练：\n4. 用药：\n5. 复查及随访：\n6. 异常情况就诊提示：`,
  };
  return frameworks[templateKey];
}

function completedDocument(
  caseData: OralSurgeryCase,
  templateKey: MedicalDocumentTemplateKey,
  title: string,
  recordedAt: string,
  legacyKey: LegacyMedicalDocumentKey,
  index: number,
  status: MedicalDocument["status"] = "completed",
  contentOverride?: string,
): MedicalDocument {
  return {
    key: `${templateKey}-${caseData.patient.id}-${index}`,
    templateKey,
    title,
    status,
    recordedAt,
    author: "沈医生",
    content: contentOverride ?? documentContent(caseData, legacyKey),
  };
}

function futureDocument(
  caseData: OralSurgeryCase,
  templateKey: MedicalDocumentTemplateKey,
  title: string,
  index: number,
): MedicalDocument {
  return {
    key: `${templateKey}-${caseData.patient.id}-future-${index}`,
    templateKey,
    title,
    status: "not_started",
    recordedAt: null,
    author: null,
    content: createDocumentFramework(caseData.patient, templateKey),
  };
}

function routineProgressContent(caseData: OralSurgeryCase, hospitalDay: number) {
  const changes = [
    "一般情况可，原发部位症状较前无明显加重。",
    "精神及睡眠尚可，进食较前改善，无新发不适。",
    "今日完成相关检查复核，患者及家属已知晓当前计划。",
    "生命体征平稳，专科检查较前无明显变化。",
  ];
  return `记录时间：2026年8月${String(hospitalDay).padStart(2, "0")}日09:00\n住院第${hospitalDay}日\n\n【今日情况】\n${changes[hospitalDay % changes.length]}\n\n【专科检查】\n${caseData.specialtyExam}\n\n【辅助检查】\n${caseData.auxiliaryExam}\n\n【病情评估】\n目前诊断为${caseData.diagnosis}，继续按当前诊疗路径推进。\n\n【诊疗计划】\n${caseData.plan}`;
}

function postoperativeProgressContent(caseData: OralSurgeryCase, day: number) {
  if (day === 1) return documentContent(caseData, "postoperative_day_1");
  if (day === 3) return documentContent(caseData, "postoperative_day_3");
  const phase =
    day <= 3
      ? "术区肿胀仍较明显，引流通畅，继续密切观察创面及呼吸道。"
      : day <= 7
        ? "术区肿胀逐步减轻，切口未见明显红肿，继续记录引流并开展基础功能训练。"
        : day <= 14
          ? "创面恢复平稳，疼痛较前减轻，逐步增加下床活动及吞咽、语言训练。"
          : "一般情况稳定，术区及供区创面继续恢复，重点进行口腔护理和功能康复。";
  return `记录时间：2026年8月${String(11 + day).padStart(2, "0")}日09:00\n术后第${day}日\n\n【主诉及一般情况】\n${phase}\n\n【生命体征】\n体温正常，呼吸平稳，血氧饱和度维持在正常范围。\n\n【术区检查】\n切口及口腔创面清洁，未见活动性出血；根据术式继续观察皮瓣、神经功能及引流情况。\n\n【病情评估】\n术后恢复过程与前一日比较无明显不利变化。\n\n【今日计划】\n继续口腔护理、营养支持和功能训练，复核检验及病理状态。`;
}

function createDocuments(caseData: OralSurgeryCase): MedicalDocument[] {
  const p = caseData.patient;
  const docs: MedicalDocument[] = [];
  const addBase = (
    templateKey: MedicalDocumentTemplateKey,
    title: string,
    date: string,
    legacyKey: LegacyMedicalDocumentKey,
    status: MedicalDocument["status"] = "completed",
    content?: string,
  ) => docs.push(completedDocument(caseData, templateKey, title, date, legacyKey, docs.length, status, content));

  if (p.id === "omfs-patient-03") {
    addBase("admission_record", "入院记录", isoAt(29), "admission_record");
    addBase("first_progress", "首次病程记录", isoAt(29, 11), "first_progress", "current");
    docs.push(futureDocument(caseData, "routine_progress", "次日病程记录", docs.length));
    docs.push(futureDocument(caseData, "preoperative_summary", "术前小结", docs.length));
    docs.push(futureDocument(caseData, "preoperative_discussion", "术前讨论记录", docs.length));
    docs.push(futureDocument(caseData, "operation_record", "手术记录", docs.length));
  } else if (p.id === "omfs-patient-07") {
    addBase("admission_record", "入院记录", isoAt(25), "admission_record");
    addBase("first_progress", "首次病程记录", isoAt(25, 11), "first_progress");
    for (let day = 2; day <= 4; day += 1) {
      addBase("routine_progress", day === 2 ? "次日病程记录" : `住院第${day}日病程记录`, isoAt(23 + day), "next_day_progress", "completed", routineProgressContent(caseData, day));
    }
    addBase("preoperative_summary", "术前小结", isoAt(29, 16), "preoperative_summary");
    addBase("preoperative_discussion", "术前讨论记录", isoAt(29, 17), "preoperative_discussion", "current");
    docs.push(futureDocument(caseData, "operation_record", "手术记录", docs.length));
    docs.push(futureDocument(caseData, "first_postoperative_progress", "术后首次病程记录", docs.length));
  } else if (p.id === "omfs-patient-12") {
    addBase("admission_record", "入院记录", isoAt(24), "admission_record");
    addBase("first_progress", "首次病程记录", isoAt(24, 11), "first_progress");
    for (let day = 2; day <= 4; day += 1) {
      addBase("routine_progress", day === 2 ? "次日病程记录" : `住院第${day}日病程记录`, isoAt(23 + day), "next_day_progress", "completed", routineProgressContent(caseData, day));
    }
    addBase("preoperative_summary", "术前小结", isoAt(28, 16), "preoperative_summary");
    addBase("preoperative_discussion", "术前讨论记录", isoAt(28, 17), "preoperative_discussion");
    addBase("operation_record", "手术记录", isoAt(29, 15), "operation_record");
    addBase("first_postoperative_progress", "术后首次病程记录", isoAt(29, 18), "first_postoperative_progress", "current");
    docs.push(futureDocument(caseData, "postoperative_progress", "术后第1日病程记录", docs.length));
  } else if (p.id === "omfs-patient-16") {
    addBase("admission_record", "入院记录", isoAt(1), "admission_record");
    addBase("first_progress", "首次病程记录", isoAt(1, 11), "first_progress");
    for (let day = 2; day <= 9; day += 1) {
      addBase("routine_progress", day === 2 ? "次日病程记录" : `住院第${day}日病程记录`, isoAt(day), "next_day_progress", "completed", routineProgressContent(caseData, day));
    }
    addBase("preoperative_summary", "术前小结", isoAt(10, 16), "preoperative_summary");
    addBase("preoperative_discussion", "术前讨论记录", isoAt(10, 17), "preoperative_discussion");
    addBase("operation_record", "手术记录", isoAt(11, 15), "operation_record");
    addBase("first_postoperative_progress", "术后首次病程记录", isoAt(11, 18), "first_postoperative_progress");
    for (let day = 1; day <= 18; day += 1) {
      addBase("postoperative_progress", `术后第${day}日病程记录`, isoAt(11 + day), day === 1 ? "postoperative_day_1" : "postoperative_day_3", day === 18 ? "current" : "completed", postoperativeProgressContent(caseData, day));
    }
    docs.push(futureDocument(caseData, "postoperative_progress", "新建术后病程记录", docs.length));
    docs.push(futureDocument(caseData, "pathology_progress", "病理结果及病程记录", docs.length));
    docs.push(futureDocument(caseData, "discharge_record", "出院记录", docs.length));
  } else {
    addBase("admission_record", "入院记录", isoAt(21), "admission_record");
    addBase("first_progress", "首次病程记录", isoAt(21, 11), "first_progress");
    addBase("routine_progress", "次日病程记录", isoAt(22), "next_day_progress", "completed", routineProgressContent(caseData, 2));
    addBase("preoperative_summary", "术前小结", isoAt(25, 16), "preoperative_summary");
    addBase("preoperative_discussion", "术前讨论记录", isoAt(25, 17), "preoperative_discussion");
    addBase("operation_record", "手术记录", isoAt(26, 15), "operation_record");
    addBase("first_postoperative_progress", "术后首次病程记录", isoAt(26, 18), "first_postoperative_progress");
    addBase("postoperative_progress", "术后第1日病程记录", isoAt(27), "postoperative_day_1", "completed", postoperativeProgressContent(caseData, 1));
    addBase("postoperative_progress", "术后第3日病程记录", isoAt(29), "postoperative_day_3", "current", postoperativeProgressContent(caseData, 3));
    docs.push(futureDocument(caseData, "postoperative_progress", "新建术后病程记录", docs.length));
    docs.push(futureDocument(caseData, "pathology_progress", "病理结果及病程记录", docs.length));
    docs.push(futureDocument(caseData, "discharge_record", "出院记录", docs.length));
  }
  return docs;
}

function makeEncounter(
  caseData: OralSurgeryCase,
  records: ExtractionSourceRecord[],
  draft: ExtractionDraft,
): DemoEncounter {
  return {
    patient: caseData.patient,
    documents: createDocuments(caseData),
    records,
    draft,
  };
}

const encounters: DemoEncounter[] = [
  makeEncounter(
    cases[0],
    [
      { id: "omfs-03-progress", type: "progress_note", label: "首次病程记录", recordedAt: "2026-08-29T10:03:00+08:00", content: "今日新入院，左下颌磨牙区颊侧骨板膨隆约3.0cm×2.0cm，无压痛，左下唇感觉存在。一般情况可，无发热。" },
      { id: "omfs-03-order", type: "order", label: "今日医嘱", recordedAt: "2026-08-29T11:20:00+08:00", content: "完善下颌骨增强CT及胸部CT；明日上午行局部活检术前评估。" },
      { id: "omfs-03-exam", type: "exam", label: "外院影像", recordedAt: "2026-08-29T09:40:00+08:00", content: "外院曲面断层片示左下颌第一磨牙至下颌角区多房性透射影，边界较清。" },
      { id: "omfs-03-pending", type: "exam", label: "检查状态", recordedAt: "2026-08-29T17:30:00+08:00", content: "下颌骨增强CT已预约，状态：待检查；组织病理尚未取材。" },
      { id: "omfs-03-note", type: "handoff_note", label: "交班备注", recordedAt: "2026-08-29T18:20:00+08:00", content: "夜班关注下颌局部疼痛、肿胀及下唇麻木变化；明晨核对增强CT安排。" },
    ],
    {
      fields: [
        { key: "current_condition", value: "今日新入院，左下颌磨牙区骨板膨隆，无压痛，左下唇感觉存在，一般情况可。", evidence: [{ source_record_id: "omfs-03-progress", quote: "今日新入院，左下颌磨牙区颊侧骨板膨隆约3.0cm×2.0cm，无压痛，左下唇感觉存在。一般情况可" }] },
        { key: "shift_changes", value: "今日完成入院评估。", evidence: [{ source_record_id: "omfs-03-progress", quote: "今日新入院" }] },
        { key: "current_treatment", value: "完善下颌骨增强CT及胸部CT，明日上午行局部活检术前评估。", evidence: [{ source_record_id: "omfs-03-order", quote: "完善下颌骨增强CT及胸部CT；明日上午行局部活检术前评估" }] },
        { key: "returned_results", value: "外院曲面断层片示左下颌多房性透射影，边界较清。", evidence: [{ source_record_id: "omfs-03-exam", quote: "左下颌第一磨牙至下颌角区多房性透射影，边界较清" }] },
        { key: "pending_results", value: "下颌骨增强CT待检查，组织病理尚未取材。", evidence: [{ source_record_id: "omfs-03-pending", quote: "下颌骨增强CT已预约，状态：待检查；组织病理尚未取材" }] },
        { key: "attention", value: "夜班关注下颌局部疼痛、肿胀及下唇麻木变化。", evidence: [{ source_record_id: "omfs-03-note", quote: "夜班关注下颌局部疼痛、肿胀及下唇麻木变化" }] },
        { key: "next_tasks", value: "明晨核对增强CT安排。", evidence: [{ source_record_id: "omfs-03-note", quote: "明晨核对增强CT安排" }] },
      ],
    },
  ),
  makeEncounter(
    cases[1],
    [
      { id: "omfs-07-progress", type: "progress_note", label: "术前讨论记录", recordedAt: "2026-08-29T16:10:00+08:00", content: "患者一般情况稳定，右舌缘病灶无明显出血。今日完成术前讨论及麻醉访视，手术方案已向患者及家属说明。" },
      { id: "omfs-07-order", type: "order", label: "术前医嘱", recordedAt: "2026-08-29T17:20:00+08:00", content: "今晚22:00后禁食、次日02:00后禁饮；明日08:00送手术室。继续监测血压。" },
      { id: "omfs-07-lab", type: "lab", label: "术前检验", recordedAt: "2026-08-29T14:30:00+08:00", content: "血红蛋白132g/L，血小板218×10⁹/L，凝血功能及肝肾功能未见明显异常。" },
      { id: "omfs-07-note", type: "handoff_note", label: "交班备注", recordedAt: "2026-08-29T18:00:00+08:00", content: "夜班核对禁食禁饮执行情况、备皮及腕带信息；明晨交接手术资料后送手术室。" },
    ],
    {
      fields: [
        { key: "current_condition", value: "一般情况稳定，右舌缘病灶无明显出血。", evidence: [{ source_record_id: "omfs-07-progress", quote: "患者一般情况稳定，右舌缘病灶无明显出血" }] },
        { key: "shift_changes", value: "今日完成术前讨论及麻醉访视。", evidence: [{ source_record_id: "omfs-07-progress", quote: "今日完成术前讨论及麻醉访视" }] },
        { key: "current_treatment", value: "今晚22:00后禁食、次日02:00后禁饮，继续监测血压。", evidence: [{ source_record_id: "omfs-07-order", quote: "今晚22:00后禁食、次日02:00后禁饮" }, { source_record_id: "omfs-07-order", quote: "继续监测血压" }] },
        { key: "returned_results", value: "血红蛋白132g/L，血小板218×10⁹/L，凝血及肝肾功能未见明显异常。", evidence: [{ source_record_id: "omfs-07-lab", quote: "血红蛋白132g/L，血小板218×10⁹/L，凝血功能及肝肾功能未见明显异常" }] },
        { key: "pending_results", value: "", evidence: [] },
        { key: "attention", value: "夜班核对禁食禁饮执行情况、备皮及腕带信息。", evidence: [{ source_record_id: "omfs-07-note", quote: "夜班核对禁食禁饮执行情况、备皮及腕带信息" }] },
        { key: "next_tasks", value: "明晨交接手术资料，08:00送手术室。", evidence: [{ source_record_id: "omfs-07-note", quote: "明晨交接手术资料后送手术室" }, { source_record_id: "omfs-07-order", quote: "明日08:00送手术室" }] },
      ],
    },
  ),
  makeEncounter(
    cases[2],
    [
      { id: "omfs-12-progress", type: "progress_note", label: "术后首次病程记录", recordedAt: "2026-08-29T18:06:00+08:00", content: "今日完成左腮腺浅叶切除术及面神经解剖术。18:00安返病房，神志清，生命体征平稳；左侧额纹、闭眼及口角活动可，切口敷料干燥。" },
      { id: "omfs-12-order", type: "order", label: "术后医嘱", recordedAt: "2026-08-29T18:12:00+08:00", content: "术后一级护理；头孢呋辛1.5g静滴 q12h；记录左耳后负压引流量及颜色。" },
      { id: "omfs-12-drain", type: "progress_note", label: "引流观察", recordedAt: "2026-08-29T18:30:00+08:00", content: "左耳后负压引流管在位通畅，术后引流淡血性液约15ml。" },
      { id: "omfs-12-pending", type: "lab", label: "病理状态", recordedAt: "2026-08-29T17:50:00+08:00", content: "左腮腺浅叶肿物已送常规病理，结果未回。" },
      { id: "omfs-12-note", type: "handoff_note", label: "交班备注", recordedAt: "2026-08-29T18:32:00+08:00", content: "夜班观察面神经功能、切口渗血及负压引流量；如敷料渗湿及时联系值班医师。" },
    ],
    {
      fields: [
        { key: "current_condition", value: "术后神志清，生命体征平稳；左侧面神经功能可，切口敷料干燥。", evidence: [{ source_record_id: "omfs-12-progress", quote: "神志清，生命体征平稳；左侧额纹、闭眼及口角活动可，切口敷料干燥" }] },
        { key: "shift_changes", value: "今日完成左腮腺浅叶切除术及面神经解剖术，18:00安返病房。", evidence: [{ source_record_id: "omfs-12-progress", quote: "今日完成左腮腺浅叶切除术及面神经解剖术。18:00安返病房" }] },
        { key: "current_treatment", value: "术后一级护理，头孢呋辛1.5g静滴q12h，记录负压引流。", evidence: [{ source_record_id: "omfs-12-order", quote: "术后一级护理；头孢呋辛1.5g静滴 q12h；记录左耳后负压引流量及颜色" }] },
        { key: "returned_results", value: "", evidence: [] },
        { key: "pending_results", value: "左腮腺肿物常规病理结果未回。", evidence: [{ source_record_id: "omfs-12-pending", quote: "左腮腺浅叶肿物已送常规病理，结果未回" }] },
        { key: "attention", value: "夜班观察面神经功能、切口渗血及负压引流量。", evidence: [{ source_record_id: "omfs-12-note", quote: "夜班观察面神经功能、切口渗血及负压引流量" }] },
        { key: "next_tasks", value: "持续记录左耳后负压引流量及颜色。", evidence: [{ source_record_id: "omfs-12-order", quote: "记录左耳后负压引流量及颜色" }] },
      ],
    },
  ),
  makeEncounter(
    cases[3],
    [
      { id: "omfs-16-progress", type: "progress_note", label: "术后第18日病程记录", recordedAt: "2026-08-29T10:21:00+08:00", content: "术后第18日，患者一般情况稳定，气管套管已拔除，呼吸平稳。皮瓣色泽正常，口底及颈部创面恢复中，继续吞咽和语言训练。" },
      { id: "omfs-16-drain", type: "progress_note", label: "创面及血糖", recordedAt: "2026-08-29T17:30:00+08:00", content: "颈部引流管已拔除，口底创面无新发渗血；今日空腹血糖8.6mmol/L。" },
      { id: "omfs-16-order", type: "order", label: "恢复期医嘱", recordedAt: "2026-08-29T11:00:00+08:00", content: "加强口腔护理；每日开展吞咽和语言功能训练；监测血糖并评估饮食过渡。" },
      { id: "omfs-16-lab", type: "lab", label: "今日检验", recordedAt: "2026-08-29T15:20:00+08:00", content: "血红蛋白116g/L，白细胞7.9×10⁹/L，血钾4.0mmol/L。" },
      { id: "omfs-16-pending", type: "lab", label: "病理状态", recordedAt: "2026-08-29T16:40:00+08:00", content: "原发灶补充免疫组化及左颈淋巴结分区结果未回。" },
      { id: "omfs-16-note", type: "handoff_note", label: "交班备注", recordedAt: "2026-08-29T18:20:00+08:00", content: "夜班关注口底及颈部创面、误吸风险和进食耐受；晨间复核血糖并记录功能训练完成情况。" },
    ],
    {
      fields: [
        { key: "current_condition", value: "术后第18日，呼吸平稳，皮瓣色泽正常，口底及颈部创面恢复中。", evidence: [{ source_record_id: "omfs-16-progress", quote: "术后第18日，患者一般情况稳定，气管套管已拔除，呼吸平稳。皮瓣色泽正常，口底及颈部创面恢复中" }] },
        { key: "shift_changes", value: "颈部引流管已拔除，口底创面无新发渗血；空腹血糖8.6mmol/L。", evidence: [{ source_record_id: "omfs-16-drain", quote: "颈部引流管已拔除，口底创面无新发渗血；今日空腹血糖8.6mmol/L" }] },
        { key: "current_treatment", value: "加强口腔护理，每日开展吞咽和语言功能训练，监测血糖。", evidence: [{ source_record_id: "omfs-16-order", quote: "加强口腔护理；每日开展吞咽和语言功能训练；监测血糖并评估饮食过渡" }] },
        { key: "returned_results", value: "血红蛋白116g/L，白细胞7.9×10⁹/L，血钾4.0mmol/L。", evidence: [{ source_record_id: "omfs-16-lab", quote: "血红蛋白116g/L，白细胞7.9×10⁹/L，血钾4.0mmol/L" }] },
        { key: "pending_results", value: "原发灶补充免疫组化及左颈淋巴结分区结果未回。", evidence: [{ source_record_id: "omfs-16-pending", quote: "原发灶补充免疫组化及左颈淋巴结分区结果未回" }] },
        { key: "attention", value: "夜班关注口底及颈部创面、误吸风险和进食耐受。", evidence: [{ source_record_id: "omfs-16-note", quote: "夜班关注口底及颈部创面、误吸风险和进食耐受" }] },
        { key: "next_tasks", value: "晨间复核血糖并记录功能训练完成情况。", evidence: [{ source_record_id: "omfs-16-note", quote: "晨间复核血糖并记录功能训练完成情况" }] },
      ],
    },
  ),
  makeEncounter(
    cases[4],
    [
      { id: "omfs-21-progress", type: "progress_note", label: "术后第3日病程记录", recordedAt: "2026-08-29T10:24:00+08:00", content: "术后第3日，左面中部肿胀较前明显减轻，无发热及鼻腔溢液，口内创面清洁，无活动性出血。" },
      { id: "omfs-21-treatment", type: "order", label: "今日医嘱", recordedAt: "2026-08-29T11:15:00+08:00", content: "继续口腔护理，软食；碘仿纱条今日部分退出约1cm，记录创面情况。" },
      { id: "omfs-21-lab", type: "lab", label: "今日检验", recordedAt: "2026-08-29T14:06:00+08:00", content: "白细胞7.8×10⁹/L，CRP 9mg/L。" },
      { id: "omfs-21-pending", type: "lab", label: "病理状态", recordedAt: "2026-08-29T16:16:00+08:00", content: "左上颌骨囊壁常规病理结果尚未回报。" },
      { id: "omfs-21-note", type: "handoff_note", label: "交班备注", recordedAt: "2026-08-29T17:48:00+08:00", content: "夜班观察口内创面出血、鼻腔溢液及纱条位置；明日换药时继续评估纱条退出长度。" },
    ],
    {
      fields: [
        { key: "current_condition", value: "术后第3日，左面中部肿胀明显减轻，无发热及鼻腔溢液，口内创面清洁。", evidence: [{ source_record_id: "omfs-21-progress", quote: "术后第3日，左面中部肿胀较前明显减轻，无发热及鼻腔溢液，口内创面清洁" }] },
        { key: "shift_changes", value: "碘仿纱条今日部分退出约1cm。", evidence: [{ source_record_id: "omfs-21-treatment", quote: "碘仿纱条今日部分退出约1cm" }] },
        { key: "current_treatment", value: "继续口腔护理、软食，记录创面情况。", evidence: [{ source_record_id: "omfs-21-treatment", quote: "继续口腔护理，软食" }, { source_record_id: "omfs-21-treatment", quote: "记录创面情况" }] },
        { key: "returned_results", value: "白细胞7.8×10⁹/L，CRP 9mg/L。", evidence: [{ source_record_id: "omfs-21-lab", quote: "白细胞7.8×10⁹/L，CRP 9mg/L" }] },
        { key: "pending_results", value: "左上颌骨囊壁常规病理结果尚未回报。", evidence: [{ source_record_id: "omfs-21-pending", quote: "左上颌骨囊壁常规病理结果尚未回报" }] },
        { key: "attention", value: "夜班观察口内创面出血、鼻腔溢液及纱条位置。", evidence: [{ source_record_id: "omfs-21-note", quote: "夜班观察口内创面出血、鼻腔溢液及纱条位置" }] },
        { key: "next_tasks", value: "明日换药时继续评估纱条退出长度。", evidence: [{ source_record_id: "omfs-21-note", quote: "明日换药时继续评估纱条退出长度" }] },
      ],
    },
  ),
];

export function getDemoPatientOptions(): SourceSystemPatient[] {
  return encounters
    .map(({ patient }) => structuredClone(patient))
    .sort((a, b) => a.wardOrder - b.wardOrder);
}

export function getDemoEncounter(patientId: string): DemoEncounter | null {
  const encounter = encounters.find(({ patient }) => patient.id === patientId);
  return encounter ? structuredClone(encounter) : null;
}

export function getDemoWorkspaceCharts(): SourceSystemChart[] {
  return encounters
    .map(({ patient, records, documents }) =>
      structuredClone({ patient, records, documents }),
    )
    .sort((a, b) => a.patient.wardOrder - b.patient.wardOrder);
}
