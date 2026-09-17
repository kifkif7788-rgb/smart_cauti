-- ════════════════════════════════════════════════════════════════════
--  ผูกคุณวุฒิผู้ประเมินกับบัญชี และสร้างบัญชีสำหรับหน่วยงาน
--
--  เดิมพยาบาลเลือก RN/NA เองทุกเวร ซึ่งเลือกผิดได้และต้องเลือกซ้ำทุกครั้ง
--  ย้ายมาผูกกับบัญชีแทน บัญชีที่ไม่ได้ระบุ เช่น แอดมินหรือ IC ยังเลือกเองได้
--
--  บัญชีใช้ upsert เพื่อให้รันซ้ำได้ และคง user_id เดิมไว้
--  ประวัติการประเมินที่อ้างถึง assessor_id จึงไม่ขาด
-- ════════════════════════════════════════════════════════════════════

alter table app_user add column if not exists nurse_level nurse_level;

comment on column app_user.nurse_level is
  'คุณวุฒิผู้ประเมินประจำบัญชี RN = พยาบาลวิชาชีพ, NA = ผู้ช่วยเหลือคนไข้';

insert into app_user (employee_id, full_name, role, ward_codes, nurse_level, pin_hash)
values
  ('N001', 'พยาบาล 01', 'NURSE', array['SURG_M'], 'RN', 'scrypt$32d0b8d0de15104d74e0ff69f5179524$e5a040203d983f93780d7b31b76acbd130dfeeb56221576d07cecc13e95042f7'),
  ('N002', 'พยาบาล 02', 'NURSE', array['SURG_M'], 'RN', 'scrypt$853646150329dfd2dea5126ced749506$a693ac1e6ebf365ff6cd7b2e4da80ff4ec55e4a4aace04d5a9251b4eb1fc9043'),
  ('N003', 'พยาบาล 03', 'NURSE', array['SURG_M'], 'RN', 'scrypt$cb62c658f52940a3878c9661c185393d$97abadfd9ee548db42297b6a423efd0abc183f7d5e0ca383ebc9e58ac8ac8afd'),
  ('N004', 'พยาบาล 04', 'NURSE', array['SURG_M'], 'RN', 'scrypt$79996c43077fce0cbc132756ec040e79$26c475760278ceb19d7cc98389cf85adc5bd6db95e86715ad6bbf734f2d9d886'),
  ('N005', 'พยาบาล 05', 'NURSE', array['SURG_M'], 'RN', 'scrypt$5cc5e7391c806eaa0a82ef117ae982b1$090751ac62af83951867845db4e11d395e4bbd4a62b01fafce88822e4662490c'),
  ('N006', 'พยาบาล 06', 'NURSE', array['SURG_M'], 'RN', 'scrypt$48ffdd817c60e75fbe3be610faca782a$bc53b78f615147d9fef1422e81d8e299f360131db7fe0c31c1fbec18cc10caf6'),
  ('N007', 'พยาบาล 07', 'NURSE', array['SURG_M'], 'RN', 'scrypt$68f194b77ba521ffb2ceb8ab873bc2d6$8af30eb35613905466f253e39c038c52a2dcb7616380eee78a34d2b006d1067e'),
  ('N008', 'พยาบาล 08', 'NURSE', array['SURG_M'], 'RN', 'scrypt$0ed421dc97ddcd295c99dab770970849$0979a53ebf0878c2e7161400f9576cdd23cb75c3f7f980e69b16518111c0187b'),
  ('N009', 'พยาบาล 09', 'NURSE', array['SURG_M'], 'RN', 'scrypt$dde75dbb7c3cab2479e337528c187a99$f7cf37c220426e3de88b417fa85cc4fbc6e2b71fb8afe208fa070b8dfec0cc52'),
  ('N010', 'พยาบาล 10', 'NURSE', array['SURG_M'], 'RN', 'scrypt$5ba8eb3d64eae1f78935ae0a15c7c34a$1ad125b2469b1f7f85f17646cfba2e8324f58b3c979a38a41f11ef1fc028b107'),
  ('N011', 'พยาบาล 11', 'NURSE', array['SURG_M'], 'RN', 'scrypt$1fb472d867d4f1accfc95bb33970b047$26990712f9af42ec1fcf047819fef442e78c3c41a83f6fc7340100e380bef9b1'),
  ('N012', 'พยาบาล 12', 'NURSE', array['SURG_M'], 'RN', 'scrypt$33529dac98abbd2ae70dea8ee80e0b1e$f3762db3d9faca49459b6d7f247b396c1e4fceabb82ee2bab19c1c6477b149ff'),
  ('N013', 'พยาบาล 13', 'NURSE', array['SURG_M'], 'RN', 'scrypt$3722b28135d70795fc8402f70e11d2b8$c826608082040adcfa8f596c7880df4995be1278b9510a9c571efcb65dbf29e4'),
  ('N014', 'พยาบาล 14', 'NURSE', array['SURG_M'], 'RN', 'scrypt$6c1b22b7fa0c4626e0ef0eaff9e1a358$b25def0538dedf803934a8b933aaefc2f7a418d7b4caeb6940b19130bbc2c507'),
  ('N015', 'พยาบาล 15', 'NURSE', array['SURG_M'], 'RN', 'scrypt$91329aede1b4785a5eefb8de5ea7f728$0246961bec1f0c9ccc580019d6721075b72e6ef5bf5a43615131680087a001e1'),
  ('A001', 'ผู้ช่วยเหลือคนไข้ 01', 'NURSE', array['SURG_M'], 'NA', 'scrypt$f4f3a43822bddef73ebacab04e10216e$526e3960dd7a17a643ec9e8fa779b71f1d03251913eb9f9c9645ff30e4bb07f7'),
  ('A002', 'ผู้ช่วยเหลือคนไข้ 02', 'NURSE', array['SURG_M'], 'NA', 'scrypt$13253baf0c0d71603d530851e1d8f0ca$f8e6d1211d567773dcf6062f6a53d114ae6971a15406c732c32c01be4092412c'),
  ('A003', 'ผู้ช่วยเหลือคนไข้ 03', 'NURSE', array['SURG_M'], 'NA', 'scrypt$2b49dcdab3291d51557058f01de32948$619bfb2ca36d6fbb2da67d9888fd728d99a8e1c4a8a7293bf5a29d009515a866'),
  ('A004', 'ผู้ช่วยเหลือคนไข้ 04', 'NURSE', array['SURG_M'], 'NA', 'scrypt$1932583a676b51fea524eab33a872bec$e11a7ece55b013d77873305fbbcfc3db7ae75e30bb3ea196362f159c235d1525'),
  ('A005', 'ผู้ช่วยเหลือคนไข้ 05', 'NURSE', array['SURG_M'], 'NA', 'scrypt$96066e3b36134bf3b651a51f68745888$440d7e7a155f734a2adf56ee0aa5e2572d7bf40abc9cb579f9c139c5574fe1bf'),
  ('A006', 'ผู้ช่วยเหลือคนไข้ 06', 'NURSE', array['SURG_M'], 'NA', 'scrypt$cc3d335c81ada7a0ad861e5fe210787e$354bd1520a132927f8e9e560bfc1263c2ffb2e50cc547dacf66bd74e7332796d'),
  ('A007', 'ผู้ช่วยเหลือคนไข้ 07', 'NURSE', array['SURG_M'], 'NA', 'scrypt$4d18a26f56ab01aa3eed05060f99b95a$a8f9bbb29f19e5949a772c52196b46ae9ecaf61a04f921fc6f8a8beeaaebeb69'),
  ('A008', 'ผู้ช่วยเหลือคนไข้ 08', 'NURSE', array['SURG_M'], 'NA', 'scrypt$0c523b46738096ab3142de9df95aa01e$8c12b714c328512b58bdb3ac3010b30abd10a26773a06513e9e93c7357bdb86b'),
  ('A009', 'ผู้ช่วยเหลือคนไข้ 09', 'NURSE', array['SURG_M'], 'NA', 'scrypt$90d5812ec729573e96bb7bfd0e6940fb$1e0252dfd6d6a87d2789afdad66a2a576ee9e330459a992ad1b893e60a80be7c'),
  ('A010', 'ผู้ช่วยเหลือคนไข้ 10', 'NURSE', array['SURG_M'], 'NA', 'scrypt$f5da79c180541b36df6f2bc4786dfb74$f079d05f7e4cd0d3daa3b3222c344abd773f50b5bf1191a8caa7ac344560a703')
on conflict (employee_id) do update set
  full_name   = excluded.full_name,
  role        = excluded.role,
  ward_codes  = excluded.ward_codes,
  nurse_level = excluded.nurse_level,
  pin_hash    = excluded.pin_hash,
  is_active   = true;

-- บัญชีเดิมของหัวหน้าหอ พยาบาล IC ผู้ประเมิน และผู้ดูแลระบบ
-- กำหนดคุณวุฒิให้เพื่อให้ประเมินได้ทันทีโดยไม่ต้องเลือกทุกเวร
-- ใช้ update ไม่ใช่ upsert เพราะต้องคง PIN เดิมของบัญชีเหล่านี้ไว้
update app_user
set nurse_level = 'RN'
where employee_id in ('AD01', 'AU01', 'H001', 'IC01')
  and nurse_level is null;
