/* global supabase, _loadedDBData */
/**
 * profil-studio.js — Stüdyo (Studio) Panel
 * Studio flow: lobby (learning path) → course_detail → practice → completion → session_complete
 * Depends on profil-yetkinlik.js bridge: window._htYetkinlikData
 * All innerHTML content comes from hardcoded constants — no user input, no XSS risk.
 */
(function(){
'use strict';

/* ════════════════════════════════════════════════
   DATA BRIDGE
   ════════════════════════════════════════════════ */
var _bridge = null;
function getBridge() {
  if (!_bridge && window._htYetkinlikData) _bridge = window._htYetkinlikData;
  return _bridge;
}

/* ════════════════════════════════════════════════
   INTERVIEW QUESTIONS — 29 competencies, 289 questions
   ════════════════════════════════════════════════ */
var INTERVIEW_QUESTIONS = {
  'ao':[
    {theme:"Önce harekete geçmek",q:["Bir konuda harekete geçen ilk kişi olduğun bir zamanı anlat.","Daha fazla planlama yapmak ile hemen harekete geçmek arasında karar vermek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Fırsatları yakalamak",q:["Bir fırsatı yakalayıp kendi başına ileriye taşıdığın bir zamanı anlat.","Takip etmeye değer yeni bir fırsat belirlediğin bir örnek ver."]},
    {theme:"Zor sorunlarla yüzleşmek",q:["Zor ve acil bir sorunla karşılaştığında ne yaptığını açıkla.","Başka birinin zorlu projesini devralmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Enerji ve çaba harcamak",q:["Çok büyük enerji ve çaba gerektiren bir durumu anlat.","Yapabilirim tavrı sergilediğin zorlu bir durumu anlat."]},
    {theme:"Hız ve insanları yönetmek",q:["Çok acele davranıp sonuçlarıyla başa çıkmak zorunda kaldığın bir zamanı anlat.","Ele almak için sabırsızlandığın ama önce başkalarının onayını alman gereken bir proje veya konuyu anlat."]}
  ],
  'at':[
    {theme:"Yetenek ihtiyacını değerlendirmek",q:["Ekip üyelerini seçmekten sorumlu olduğun bir zamanı anlat.","Ekibe hangi tür yeteneğin dahil edilmesi gerektiğine karar vermek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Dışarıdan aday işe almak",q:["Başkalarının iç adayı tercih etmesi gerektiğini düşündüğü bir durumda dışarıdan birini işe aldığın zamanı anlat.","Kurum dışından işe aldığın birisini ciddi biçimde yanlış değerlendirdiğin bir zamanı anlat."]},
    {theme:"Potansiyeli mi yoksa mevcut beceriyi mi öncelemek",q:["Mevcut işe uygun olan biriyle, şu an tam uygun olmasa da uzun vadeli potansiyeli olan biri arasında seçim yapmak zorunda kaldığın bir zamanı anlat.","Eşit derecede nitelikli gördüğün iki kişi arasında seçim yapmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Kişiyi doğru değerlendirmek",q:["İşe alım veya seçim sürecinde insanları okuma becerinizin çok işe yaradığı bir zamanı anlat.","İlk izleniminin yanlış olduğunu ve kişiyi tanıdıktan sonra fikrinin değiştiğini anlat."]},
    {theme:"Zor işe alım kararları vermek",q:["Doldurmak zorunda kaldığın en zor pozisyonu anlat.","Birisini belli bir şekilde değerlendirirken başkalarının o kişiyi farklı gördüğü bir durumu anlat."]}
  ],
  'bi':[
    {theme:"İş trendlerini takip etmek",q:["Bulunduğun sektördeki üç temel trendi neler olarak görüyorsun?","Kendini iş uygulamaları ve trendler konusunda nasıl güncel tuttuğunu açıkla."]},
    {theme:"Başarılı bir işletmede çalışmak",q:["Başarılı bir işletmeyi anlat ve neden başarılı olduğunu düşündüğünü açıkla.","Çalıştığın en başarılı işletmeyi ve neden başarılı olduğunu anlat."]},
    {theme:"Rakipleri takip etmek",q:["En son çalıştığın organizasyonun rakiplerinin sahip olduğu üç avantajı anlat.","Organizasyonunun rakiplerinin ürün ve hizmetleri konusunda nasıl güncel kaldığını anlat."]},
    {theme:"İş bilgisini geliştirmek",q:["Başarısız olan bir işletmeyi anlat ve neden zorlandığını düşündüğünü açıkla.","İş bilgini nasıl geliştirdiğini anlat."]},
    {theme:"İş kararları almak",q:["Pazar trendleri hakkındaki bilginin aldığın bir kararı etkilediği bir zamanı anlat.","İşletmenin tamamı üzerinde olumlu bir etki yaratan bir karar aldığın durumu anlat."]}
  ],
  'br':[
    {theme:"Baskı altında özgüveni korumak",q:["Aşırı baskı altında hissettiğin ama devam etmeyi başardığın bir zamanı anlat.","Geri adım atman için baskı yapıldığı ama kararlı durduğun bir zamanı anlat."]},
    {theme:"Kriz yönetmek",q:["Yönetmek zorunda kaldığın bir krizi anlat.","Acil bir durumu nasıl yönettiğine dair bir örnek ver."]},
    {theme:"Aksiliklerle baş etmek",q:["Birinin veya bir şeyin seni hazırlıksız yakalayıp hedeflerini engellediği bir zamanı anlat.","Savunmaya geçtiğin veya sinirlendiğin ama odağını başarıyla yeniden kazandığın bir zamanı anlat."]},
    {theme:"Pozitif kalmak",q:["Bir proje veya girişimin başarısız olacağı gibi göründüğü bir zamanı anlat.","Haklı olduğundan kesinlikle emin olduğun halde yetkili birinin seni geçersiz kıldığı bir zamanı anlat."]},
    {theme:"Zorlukların üstesinden gelmek",q:["Zorlu bir görev veya durumla nasıl başa çıktığını anlat.","Olumsuz bir iş deneyiminden nasıl toparlandığına dair bir örnek ver."]}
  ],
  'bs':[
    {theme:"Paydaş endişelerini öngörmek",q:["Paydaş ihtiyaçlarını ve endişelerini önceden öngördüğün bir zamanı anlat.","Bir proje sırasında tüm paydaşlardan yeterli girdi toplamadığın bir zamanı anlat."]},
    {theme:"Dış paydaşlarla çalışmak",q:["İş sonuçları elde etmek için dış paydaşlarla çalışmak zorunda kaldığın bir zamanı anlat.","Dış paydaşlarla daha iyi çalışabilecekken bunu başaramadığın bir zamanı anlat."]},
    {theme:"Farklı çıkarları dengelemek",q:["Birden fazla paydaşın bir eylem planı üzerinde anlaşamadığı ve orta yol bulmak zorunda kaldığın bir zamanı anlat.","Yönetmek zorunda kaldığın en zor paydaşı anlat."]},
    {theme:"Adil davranmak",q:["Bir süreci veya prosedürü herkes için adil hale getirmek için değiştirmek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Paydaş beklentilerini yönetmek",q:["Farklı paydaş ihtiyaçlarını göz önünde bulundurarak yüksek riskli bir karar vermek zorunda kaldığın bir zamanı anlat.","Görüşleri seninkinden farklı olan paydaşların beklentilerini yönetmek zorunda kaldığın bir örnek ver."]}
  ],
  'bt':[
    {theme:"Yetenek ihtiyacını değerlendirmek",q:["Ekip üyelerini seçmekten sorumlu olduğun bir zamanı anlat.","Ekibe hangi tür yeteneğin dahil edilmesi gerektiğine karar vermek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Dışarıdan aday işe almak",q:["Başkalarının iç adayı tercih etmesi gerektiğini düşündüğü bir durumda dışarıdan birini işe aldığın zamanı anlat.","Kurum dışından işe aldığın birisini ciddi biçimde yanlış değerlendirdiğin bir zamanı anlat."]},
    {theme:"Potansiyeli mi yoksa mevcut beceriyi mi öncelemek",q:["Uzun vadeli potansiyeli olan ama tam uyumlu olmayan biriyle, mevcut işe uyumlu ama uzun vadesi sınırlı biri arasında seçim yapmak zorunda kaldığın bir durumu anlat.","Eşit derecede nitelikli gördüğün iki kişi arasında seçim yapmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Kişiyi doğru değerlendirmek",q:["İşe alım veya seçim sürecinde insanları okuma becerinizin çok işe yaradığı bir zamanı anlat.","İlk izleniminin yanlış olduğunu ve kişiyi tanıdıktan sonra fikrinin değiştiğini anlat."]},
    {theme:"Zor işe alım kararları vermek",q:["Doldurmak zorunda kaldığın en zor pozisyonu anlat.","Birisini belli bir şekilde değerlendirirken başkalarının o kişiyi farklı gördüğü bir durumu anlat."]}
  ],
  'ce':[
    {theme:"Yaklaşımı dinleyiciye uyarlamak",q:["Sektör dilinizi iyi bilmeyen birine önemli bir şeyi iletmek zorunda kaldığın bir zamanı anlat.","Görev hakkında fazla bilgisi olmayan bir grubu yönlendirdiğin bir durumu anlat."]},
    {theme:"Dinleyiciyle bağ kurmak",q:["Şimdiye kadar yaptığın en iyi sunumu anlat.","İlettiğin mesajdan memnun olduğun ve dinleyicilerle bağ kurduğunu hissettiğin bir zamanı anlat."]},
    {theme:"Başkalarının kilit noktaları hızla görmesini sağlamak",q:["Başkalarının bir tartışmada ana noktaları kaçırdığı ve senin konuyu rayına oturttuğun bir zamanı anlat.","Açık ve hızlı iletişim kurmanı gerektiren bir görevde yer aldığın bir zamanı anlat."]},
    {theme:"Fikir ifadesini teşvik etmek",q:["Toplantıda çok konuşan veya çok soru soran birini nazikçe durdurmak zorunda kaldığın bir zamanı anlat.","Birinin seni dinlemediğini söylediği ama senin dinlediğini düşündüğün bir zamanı anlat."]},
    {theme:"Farklı iletişim yöntemlerini kullanmak",q:["Aynı mesajı farklı iletişim yöntemleriyle iletmek zorunda kaldığın bir zamanı anlat.","Aynı bilgiyi farklı kitlelere iletirken tarzını değiştirmek zorunda kaldığın bir zamanı anlat."]}
  ],
  'cf':[
    {theme:"Neredeyse kaybedilen müşteriyi elde tutmak",q:["Neredeyse bir müşteriyi kaybettiğin ve durumu tersine çevirmek zorunda kaldığın bir zamanı anlat.","Bir müşterinin beklentilerini aştığın bir zamanı anlat."]},
    {theme:"Zor müşteri talepleriyle başa çıkmak",q:["Zorlu bir müşteri için fazladan çaba gösterdiğin bir zamanı anlat.","Haksız bulduğun müşteri taleplerini karşılamak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Müşteri sorunlarıyla yüzleşmek",q:["İç veya dış bir müşteri sorunuyla yüzleşmek zorunda kaldığın bir zamanı anlat.","Özellikle zor bir müşteri sorunuyla başa çıkmak zorunda kaldığın bir durumu anlat."]},
    {theme:"Müşteri geri bildirimine göre yaklaşımı değiştirmek",q:["Müşteri geri bildirimine dayanarak müşterilere yaklaşımını değiştirdiğin bir zamanı anlat.","Müşteri geri bildirimine dayanarak yeni bir hizmet, süreç veya ürün oluşturduğun bir zamanı anlat."]},
    {theme:"Müşteri bilgisi toplamak ve kullanmak",q:["Bir müşteriden güncel bilgi aldığın ve bunu nasıl kullandığını anlat.","Bir müşteri hakkındaki yeni içgörülerin işe yaradığı bir durumu anlat."]}
  ],
  'ci':[
    {theme:"İlginç veya özgün fikirler üretmek",q:["İşe yarayan en sıra dışı fikrinin ne olduğunu anlat.","Organizasyona yaptığın en yaratıcı katkıyı anlat."]},
    {theme:"Fikirlerin değerini ölçmek",q:["Bir fikrin pazar veya organizasyon için değerini ölçtüğün bir zamanı anlat.","Başarısız bir yenilik girişimine katıldığın bir zamanı anlat."]},
    {theme:"Yeni fikirler üretmek",q:["Eski bir sorunu çözmek için yeni fikirler ürettiğin bir zamanı anlat.","Başkalarıyla beyin fırtınası veya fikir üretimi sürecini kolaylaştırdığın bir zamanı anlat."]},
    {theme:"Fikirden uygulamaya yönetmek",q:["Bir şeyi fikir aşamasından uygulamaya kadar yönettiğin bir zamanı anlat.","Başka birinin veya bir grubun fikrini başarılı bir şekilde tamamladığın bir zamanı anlat."]},
    {theme:"Yenilik fırsatlarını belirlemek",q:["Yeni bir ürün veya çözüm için risk aldığın ve bunun karşılığını aldığın bir zamanı anlat.","Bir projenin erken aşamalarında yenilik fırsatı belirlediğin bir zamanı anlat."]}
  ],
  'co':[
    {theme:"Organizasyonel sınırlar ötesinde çalışmak",q:["Organizasyonel sınırlar ötesinde bir şeyi başarıyla uyguladığın bir deneyimini anlat.","Bir sistem veya sürecin organizasyonel sınırlar ötesinde ekip çalışmasını mümkün kıldığından emin olduğun bir zamanı anlat."]},
    {theme:"Yeni ilişkiler kurmak",q:["Daha önce hiç ilişki olmayan yerde güçlü ilişkiler kurduğun bir zamanı anlat.","Ortak bir hedefe ulaşmak için ortaklıklar kurmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Başarıyı paylaşmak",q:["Bir kişinin veya grubun hak ettiği takdiri alamadığı bir zamanı anlat.","Başkaları da katkıda bulunmasına rağmen bireysel olarak övüldüğün bir zamanı anlat."]},
    {theme:"İtibar oluşturmak",q:["Farklı çıkarları olan birden fazla grup veya kişiyle çalıştığın bir zamanı anlat.","Ekibinde güven ve itibar kazanmak için çalıştığın zorlu bir durumu anlat."]},
    {theme:"İş birliğiyle başarıya ulaşmak",q:["Başkalarıyla iş birliği yaparak bir girişimde başarılı olduğun bir zamanı anlat.","Bireysel hedeflerine ulaşmanın tek yolunun başkalarından yardım istemek olduğu bir zamanı anlat."]}
  ],
  'cu':[
    {theme:"Yetkili birine itiraz etmek",q:["Senden kıdemli biriyle aynı fikirde olmadığın ve daha iyi işleyen bir çözüm önerdiğin bir zamanı anlat.","Yetkili bir pozisyondaki birine itiraz ettiğin bir zamanı anlat."]},
    {theme:"Mevcut duruma karşı çıkmak",q:["Bir fikre veya yaklaşıma karşı çıktığın bir zamanı anlat.","Bazı risklere rağmen mevcut durumu eleştirdiğin bir zamanı anlat."]},
    {theme:"Güçlü ve olumsuz bir mesaj iletmek",q:["Bir şeyi araştırırken üst yönetime olumsuz haber vermek zorunda kaldığın bir zamanı anlat.","Söylemek isteyip de geri durduğun ve sonra keşke söyleseydim dediğin bir zamanı anlat."]},
    {theme:"Etik konularda itiraz etmek",q:["Haksız muameleye uğradığını düşündüğün birini savunmak için araya girdiğin bir zamanı anlat.","Birini etik veya performans konusunda sorguladığın bir zamanı anlat."]},
    {theme:"Zorlu görevler üstlenmek",q:["Başarı şansının düşük olduğu bir görevi kabul ettiğin bir zamanı anlat.","Kimsenin yapmak istemediği riskli veya zorlu bir görev için gönüllü olduğun bir örneği anlat."]}
  ],
  'cx':[
    {theme:"Sorunu çözmek için süreç geliştirmek",q:["Bir sorunu çözmek için bir süreç veya prosedür geliştirdiğin bir zamanı anlat.","Tipik problem çözme yaklaşımına bir örnek ver."]},
    {theme:"Sorunu çözmekte başarısız olmak",q:["Seçtiğin çözümün işe yaramadığı ve sorunu sıfırdan yeniden düşünmek zorunda kaldığın bir zamanı anlat.","Geçmişte işe yarayan bir çözümü seçtiğin ama bu sefer işe yaramadığı bir zamanı anlat."]},
    {theme:"Kök nedenleri belirlemek",q:["Karmaşık bir sorunla karşılaşıp kısa sürede özüne inmen gereken bir zamanı anlat.","Bir sorunun verilerini ve kök nedenlerini yeterince incelemediğin bir zamanı anlat."]},
    {theme:"Beklenenden zor bir sorunla karşılaşmak",q:["Bir iş sorununu başlangıçta düşündüğünden çok daha karmaşık bulduğun bir zamanı anlat.","İlk çözüm doğru olmadığında bir sorunu ikinci kez çözmek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Karmaşık bilgiyi anlamlandırmak",q:["Bir sorun hakkında çelişkili verilerle karşılaşıp nasıl yaklaşacağından emin olmadığın bir zamanı anlat.","Süregelen bir sorunu çözmek için bilgi ve seçenekleri nasıl analiz ettiğini anlat."]}
  ],
  'de':[
    {theme:"Başkalarının motivasyon kaynaklarını anlamak",q:["Birini neyin motive ettiğini bilmenin kritik olduğu bir örnek ver.","Bir iş projesini yönetirken çok farklı insanlara nasıl hitap ettiğini gösteren bir örnek ver."]},
    {theme:"Başkalarını güçlendirmek",q:["Başkalarını güçlendirdiğin belirli bir zamanı anlat.","Ekibinin güçlendirilmiş hissetmesi gerektiği halde hissetmediği bir zamanı anlat."]},
    {theme:"Bağlılığını kaybetmiş insanları canlandırmak",q:["Bağlılığını kaybetmiş bir grubu canlandırmak zorunda kaldığın bir zamanı anlat.","Morali bozuk bir ekipte olup moralleri yükseltmeye yardım ettiğin bir zamanı anlat."]},
    {theme:"İşi büyük resme bağlamak",q:["İnsanların işlerinin önemli olduğunu hissetmelerini nasıl sağladığını açıkla.","Büyük organizasyondan kopuk hisseden bir ekibi motive ettiğin bir örnek ver."]},
    {theme:"Başkalarından görüş almak",q:["Hızlı aksiyon almak ile başkalarından görüş almak arasında karar vermek zorunda kaldığın bir zamanı anlat.","Başkalarının görüş sunabileceği bir ortam yarattığın bir örnek ver."]}
  ],
  'dq':[
    {theme:"Yüksek kalitede büyük karar vermek",q:["Büyük bir karar verip sonucundan gerçekten memnun kaldığın bir zamanı anlat.","Önemli bir karar verip sonrasında kendinden şüphe duyduğun bir zamanı anlat."]},
    {theme:"Hızlı ve doğru karar vermek",q:["Hızlı verdiğin ve doğru çıkan bir kararı anlat.","Karar verme hızınla insanları rahatsız ettiğin bir zamanı anlat."]},
    {theme:"Bilgiyi hızla toplamak",q:["Kısa sürede çok bilgi toplayıp hızlı karar vermek zorunda kaldığın bir zamanı anlat.","Aceleye getirip sonra pişman olduğun bir kararı anlat."]},
    {theme:"Zor kararlar vermek",q:["Üzerinde çalıştığın zor bir problemi ve karar verme sürecini adım adım anlat.","İstediğin veya ihtiyaç duyduğun tüm bilgiler olmadan karar vermek zorunda kaldığın bir zamanı anlat."]},
    {theme:"Kararlara geri bildirim almak",q:["Verdiğin bir kararla ilgili faydalı geri bildirim aldığın bir zamanı anlat.","Senin haklı, başkalarının haksız çıktığı bir zamanı anlat."]}
  ],
  'dr':[
    {theme:"Dış değişimlere rağmen sonuç almak",q:["Bütçe kesintisi, rakip hamlesi veya piyasa değişimi gibi önemli bir faktörün değişmesine rağmen sonuç aldığın bir zamanı anlat.","Başkalarının deneyip başarısız olduğu bir durumda sonuç aldığın bir zamanı anlat."]},
    {theme:"İyileştirme görevine atanmak",q:["İyileştirme veya dönüşüm görevine atandığın bir zamanı anlat.","Ekibin hedeflerine ulaşmasına yardımcı olmak için bir projeye müdahil olduğun bir zamanı anlat."]},
    {theme:"Beklentilerin ötesine geçmek",q:["Kendi beklentilerini çok aşan sonuçlar elde ettiğin bir zamanı anlat.","Başkalarının beklentilerini çok aşan sonuçlar elde ettiğin bir zamanı anlat."]},
    {theme:"Çevrenizdekilerden daha sıkı çalışmak",q:["Ekibini zorladığından daha sert kendini zorladığın bir durumu anlat.","Çevrenizdekilerden sonuçlar için daha sert bastırdığın bir durumu anlat."]},
    {theme:"Terk edilmiş bir davayı sahiplenmek",q:["Başkalarının terk ettiği bir davayı savunduğun bir durumu anlat.","Sadece pes etmek ve başka bir şeye geçmek zorunda kaldığın bir zamanı anlat."]}
  ],
  'dt':[
    {theme:"Başkalarını geliştirmekte başarı sağlamak",q:["Birini geliştirme çabalarının olumlu sonuçlandığı bir zamanı anlat.","Biri için en uygun gelişim yolunu nasıl belirlediğine dair bir örnek ver."]},
    {theme:"Birini geliştirmekte başarısız olmak",q:["Birini geliştirme çabalarının beklediğin gibi sonuçlanmadığı bir zamanı anlat.","Başkalarını geliştirmen gerektiğini bildiğin ama zamanın olmadığı bir durumu anlat."]},
    {theme:"Stratejik gelişim süreci oluşturmak",q:["İyi bir gelişim süreci olduğunu düşündüğün bir deneyimini anlat.","Organizasyonel hedefler ve önceliklerle uyumlu bir gelişim süreci oluşturduğun bir zamanı anlat."]},
    {theme:"Başkalarının beklentilerini aşmasına yardım etmek",q:["Yapamayacağını düşündüğü bir şeyi başarmasına yardım ettiğin birini anlat.","Başka birine sunduğun önemli bir zorluğu anlat."]},
    {theme:"Genç bireyleri geliştirmek",q:["Senden genç ve daha az deneyimli insanlara koçluk veya mentorluk yaptığın bir zamanı anlat.","Deneyimsiz biriyle çalışıp hızlandırılmış bir gelişim yolculuğuna başlattığın bir zamanı anlat."]}
  ],
  'dw':[
    {theme:"Yön belirlemek",q:["Başkalarını bir hedef belirleme sürecine dahil ettiğin bir zamanı anlat.","Liderlik pozisyonundayken iş yükünü nasıl organize ettiğini, hedefleri nasıl belirlediğini ve ekibinle nasıl iletişim kurduğunu anlat."]},
    {theme:"Etkili biçimde delege etmek",q:["Bir projenin veya görevin öğelerini başkalarına nasıl böldüğüne dair bir örnek ver.","Fazla delege ettiğin ve başını belaya soktuğu bir durumu anlat."]},
    {theme:"Projeyi rayında tutmak",q:["Herkes çok meşgulken ve sıkı bir teslim tarihiyle karşı karşıyayken grupta işleri nasıl rayında tuttuğuna dair bir örnek ver.","Kafası karışık veya farklı yönlere giden bir gruba odak kazandırdığın bir durumu anlat."]},
    {theme:"Rehberlik ile güçlendirmeyi dengelemek",q:["Başka birine devrettiğin bir işe dahil olma dürtüsüne direndiğin bir zamanı anlat.","Sadece senin üzerinde çalıştığın veya nasıl yapılacağını bildiğin bir görevi delege ettiğin durumu anlat."]},
    {theme:"Engelleri kaldırmak",q:["Bir ekibin çalışmaya devam edebilmesi için bir engeli kaldırmak zorunda kaldığın bir durumu anlat.","Ekibinin bir engel yüzünden başarılı olamadığı bir zamanı anlat."]}
  ],
  'ea':[
    {theme:"Kişisel sorumluluk almak",q:["Başkalarıyla çalışırken hata yaptığın ve bunu düzeltmek zorunda kaldığın bir anı anlat.","Bir taahhüdü yerine getiremediğin bir durumu örnek vererek anlat."]},
    {theme:"Hedef belirlemek ve ilerlemeyi ölçmek",q:["Zorlayıcı hedefler belirlemek ve başarının nasıl ölçüleceğini tanımlamak zorunda kaldığın bir durumu anlat.","Ekip üyelerinin ilerlemesini takip etme ve hesap verebilirliği sağlama yaklaşımını anlat."]},
    {theme:"Beklentileri netleştirmek",q:["Bir projenin ortasında hedefler önemli ölçüde değiştiğinde yeni sorumlulukları nasıl iletip yönettiğini anlat.","Bir görev veya projede kimin sorumlu olduğu net olmadığı için ekibinle birlikte zorlandığın bir zamanı anlat."]},
    {theme:"Sonuçları takip etmek",q:["Bir ekibin veya çalışma grubunun etkinliğini artırmaya çalıştığın bir durumu anlat.","Karmaşık bir görevde başkalarının işini izleyip yönettiğin bir zamanı anlat."]},
    {theme:"Geribildirim döngülerini kullanmak",q:["Yönettiğin bir takımın üyesinin hata yaptığı bir durumu anlat.","Bir ekip üyesine ne istediğini nasıl açıkladığına dair bir örnek ver."]}
  ],
  'fa':[
    {theme:"Finansal yetkinliği kararlarla ilişkilendirmek",q:["Yeni bir strateji veya iş yönünü değerlendirmek için finansal analiz kullandığın bir zamanı anlat.","Yeni bir fikir veya strateji için finansal yetkinliğini kullanarak savunma yaptığın bir zamanı anlat."]},
    {theme:"Temel finansal göstergeleri anlamak",q:["Kararlarından birinin finansal etkisine bir örnek ver.","Temel finansal gösterge bilginin iyi bir kararla sonuçlandığı bir zamanı anlat."]},
    {theme:"Finansal verilerde kalıplar bulmak",q:["Finansal verilerde gördüğün kalıplardan yola çıkarak karar verdiğin bir örnek ver.","Finansal raporları inceledikten sonra bir yön hakkında fikrini değiştirdiğin bir zamanı anlat."]},
    {theme:"Finansal kararlar vermek",q:["Finansal verilerden elde ettiğin bulgulara dayanarak karar verdiğin bir zamanı anlat.","Yeni bir girişimin kısa ve uzun vadeli finansal sonuçlarını tartmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Finansal veri deneyiminden öğrenmek",q:["Verdiğin bir finansal kararla ilgili geri bildirim aldığın bir zamanı anlat.","Finansal verilerle çalışmaktan öğrendiğin bir dersi anlat."]}
  ],
  'is':[
    {theme:"Senden farklı insanlarla çalışmak",q:["Geçinmesi zor biriyle çalıştığın bir zamanı anlat.","Organizasyonda senden kıdemsiz insanlara nasıl ulaşılabilir ve samimi göründüğünü gösteren bir durumu anlat."]},
    {theme:"Yeni ilişkiler kurmak",q:["Daha önce hiç ilişki olmayan yerde güçlü ilişkiler kurduğun bir zamanı anlat.","Yeni bir iş arkadaşını tanımaya başladığın bir zamanı anlat."]},
    {theme:"Kişilerarası tarzı hızla uyarlamak",q:["Bir şey işe yaramadığı için kişilerarası tarzını yarı yolda değiştirdiğin bir zamanı anlat.","Toplantı, sunum veya tartışma gibi bir grup ortamında kişilerarası dinamiklere göre yaklaşımını değiştirdiğin bir zamanı anlat."]},
    {theme:"Gergin durumlarda incelik ve diplomasiyle güven kurmak",q:["Gergin bir durumda ilişkileri sürdürmek için diplomasi ve incelik kullanman gereken bir zamanı anlat.","İş arkadaşları arasında güven ve saygı ortamını kolaylaştırdığın veya teşvik ettiğin bir durumu anlat."]},
    {theme:"Kişilerarası dinamiklerden yararlanmak",q:["Çeşitli iş ağını kullanarak iş sorumluluklarını yerine getirdiğin bir zamanı anlat.","Yeni bir kişiyle tanıştığında nasıl yakınlık kurduğuna dair bir örnek ver."]}
  ],
  'it':[
    {theme:"Tutarlı davranmak",q:["Söylediklerini uygulamanın zor olduğu bir durumu anlat.","Söyleneni veya bekleneni yapmak yerine kendi değerlerine sadık kalmayı seçtiğin bir örnek ver."]},
    {theme:"Güven kazanmak",q:["İlk kez birlikte çalıştığın kişilerin güvenini nasıl kazandığına dair bir örnek ver.","Birine şüpheyi lehine yorumlamaya karar verdiğin bir durumu anlat."]},
    {theme:"Sırları korumak",q:["Birinin gizli tutmanı istediği bir şeyi ifşa etmen istendiğinde ne yaptığını anlat.","Birinin sana gizli bir şey söylediği ama başka birine söylemen gerektiğini hissettiğin bir zamanı anlat."]},
    {theme:"Dürüstlükle hareket etmek",q:["Bir hatayı veya başarısızlığı kamuoyu önünde kabul ettiğin bir zamanı anlat.","Etik dışı bulduğun bir şeyi yapman istendiğinde ne yaptığını anlat."]},
    {theme:"Taahhütleri yerine getirmek",q:["Önüne ne çıkarsa çıksın bir fikri veya projeyi başlatıp sonuna kadar götürdüğün bir zamanı anlat.","Bir taahhüdü yerine getiremediğin bir durumu nasıl yönettiğini anlat."]}
  ],
  'mc':[
    {theme:"Çatışmayı iyi yönetmek",q:["Bir anlaşmazlığı veya çatışmayı iyi yönettiğin bir zamanı anlat.","Bir çatışmayı yaklaşırken görüp gereksiz aksaklığı önleyebildiğin bir zamanı anlat."]},
    {theme:"İnsanlara hoşlanmayacakları şeyleri söylemek",q:["Birine duymak istemediği bir şeyi söylemek zorunda kaldığın bir zamanı anlat.","Popüler olmayan bir değişikliği savunmak zorunda kaldığın bir durumu anlat."]},
    {theme:"Başkalarıyla anlaşmazlıkları çözmek",q:["Anlaşamadığın ve uzaklaştığın biriyle uyumu yeniden sağladığın bir zamanı anlat.","Birinin seni rahatsız ettiği veya kızdırdığı ve bunun anlaşmazlığa yol açtığı bir zamanı anlat."]},
    {theme:"İki tarafı anlaştırmak",q:["İki kişiyi veya grubu anlaştırmakta zorlandığın bir zamanı anlat.","Yüksek gerilimli bir durumda arabuluculuk yaptığın bir zamanı anlat."]},
    {theme:"Çatışmalara müdahale etmek",q:["Uyumlu bir ortamın çatışmalı bir duruma dönüştüğü bir zamanı anlat.","Bir çatışmadan kaçındığın bir zamanı anlat."]}
  ],
  'nl':[
    {theme:"İlişkiler kurmak",q:["Zor bir durumdan doğan güçlü ilişkiler kurduğun bir zamanı anlat.","Başkalarının organizasyonel sınırlar ötesinde ilişki kurmasını engelleyen bariyerleri kaldırdığın bir zamanı anlat."]},
    {theme:"Ağdan faydalanmak",q:["Organizasyon dışından biriyle ortaklıktan fayda sağladığın bir zamanı anlat.","Organizasyon içinde güçlü bir ağa sahip olmanın işine yaradığı bir örnek ver."]},
    {theme:"Ağdan öğrenmek",q:["Ağını fikir, kaynak ve bilgi alışverişi için kullandığın bir zamanı anlat.","Projelerinden biri için ağını bilgi edinmek amacıyla kullandığın bir zamanı anlat."]},
    {theme:"Ağı etkilemek için kullanmak",q:["Bağlantılarını bir girişimi şekillendirmek için kullandığın bir durumu anlat.","Ağına ulaşarak bir sorunu veya çatışmayı önleyebildiğin bir zamanı anlat."]},
    {theme:"Başkalarını birbirine bağlamak",q:["Bir hedefe ulaşmak için insanları birbirine bağlaman gereken bir zamanı anlat.","Daha önce birbirini tanımayan iki kişiyi bir araya getirdiğin bir örnek ver."]}
  ],
  'op':[
    {theme:"Bir süreci sadeleştirmek",q:["Verimsiz bir süreçte sıkışıp daha iyi bir yol bulmak zorunda kaldığın bir zamanı anlat.","Başlangıçta kendin tasarladığın bir süreci yeniden yapılandırdığın bir zamanı anlat."]},
    {theme:"Başka birinin süreciyle çalışmak",q:["Başkalarının iş akışı süreçlerini eleştirip daha iyi bir yol bulduğun bir zamanı anlat.","Başka birinin tasarladığı bir süreci değiştirdiğin bir zamanı anlat."]},
    {theme:"Uzaktan veya küresel çalışma için süreç tasarlamak",q:["Uzaktan çalışanlar için bir süreci revize ettiğin bir zamanı anlat.","Farklı coğrafi lokasyonlarda uyguladığın bir iş süreci veya prosedürüne bir örnek ver."]},
    {theme:"Sürekli iyileştirme göstermek",q:["Kaliteyi iyileştirme girişiminin gerçekten iyi sonuç verdiği bir zamanı anlat.","Büyük bir kalite iyileştirme çalışmasının parçası olduğun bir zamanı anlat."]},
    {theme:"Tüm sistemi göz önünde bulundurmak",q:["Yaptığın bir iş veya süreç iyileştirmesinin etkisini anlat.","Düşük kalite sunan süreçler, sistemler veya çalışma gruplarıyla karşılaştığın bir zamanı anlat."]}
  ],
  'pa':[
    {theme:"Karmaşık bir görevi planlamak",q:["Karmaşık bir görevi veya projeyi baştan sona planlayıp organize ettiğin bir zamanı anlat.","Planlama eksikliğinin başını belaya soktuğu bir zamanı anlat."]},
    {theme:"Faaliyetleri etkin biçimde aşamalandırmak",q:["Hedefleri organize etmek ve gerçekleştirmek için bir planı aşamalara ve ayrıntılı görevlere böldüğün bir zamanı anlat.","Bir proje planının o kadar üst düzey veya genel olduğunu ki yürütmenin zor olduğu bir durumu anlat."]},
    {theme:"Belirsizlikler veya sorunlar için planlamak",q:["Hedefler belirlerken belirsizlikler veya sorunlar için plan yapmak zorunda kaldığın bir durumu anlat.","Bir engeli öngöremediğin için tökezlediğin bir zamanı anlat."]},
    {theme:"Hedefler ve kilometre taşları belirlemek",q:["Organizasyonel önceliklerle uyumlu hedefler ve bir plan oluşturduğun bir durumu anlat.","Kilometre taşları belirlemenin ve ilerlemeyi ölçmenin kritik olduğu yönettiğin bir projeyi örnek vererek anlat."]},
    {theme:"Kritik görevleri önceliklendirmek",q:["Beklenmedik bir şeyi önceliklendirmek için proje sırasında planlarını değiştirmek zorunda kaldığın bir zamanı anlat.","Zamanının dolduğu ve neyi bitireceğini seçmek zorunda kaldığın bir zamanı anlat."]}
  ],
  'pe':[
    {theme:"Destek kazanmak",q:["Başkalarını bir fikre veya öneriye ikna etmek için güçlü bir argüman sunman gereken bir zamanı anlat.","Yeni veya revize edilmiş bir politika veya prosedür için onay aldığın bir zamanı anlat."]},
    {theme:"Taviz vermeden diplomatik olmak",q:["Diplomatik ve kararlı olman ama fazla taviz vermemen gereken bir durumu anlat.","Kendi görüşünden geri adım atmadan başka birinin duygularını göz önünde bulundurmak zorunda kaldığın bir zamanı anlat."]},
    {theme:"Anlaşmazlıklara rağmen ilişkileri sürdürmek",q:["İsteksiz iki grubu veya kişiyi bir araya getirdiğin bir zamanı anlat.","Bir anlaşmazlığı çözüme kavuştururken ilişkileri başarıyla sürdürdüğün bir zamanı anlat."]},
    {theme:"Ortak zemin bulmak",q:["Güvenin az olduğu bir ortamda diğer taraflarla anlaşmaya varmak zorunda kaldığın bir zamanı anlat.","Resmi veya gayri resmi olarak arabuluculuk yaptığın bir zamanı anlat."]},
    {theme:"Başkalarının fikirlerine yanıt vermek",q:["Biriyle aynı fikirde olmayıp onu kendi düşünce tarzına çektiğin bir zamanı anlat.","Karşı tarafın argümanını dinledikten sonra fikrini değiştirdiğin bir zamanı anlat."]}
  ],
  'sa':[
    {theme:"Daha etkili olmak için davranışı uyarlamak",q:["Bir şeyi başarmak için tarzını ayarlamak zorunda kaldığın bir duruma örnek ver.","Bir gruptaki rolünün etkili olmadığı ve çalışma şeklini değiştirdiğin bir zamanı anlat."]},
    {theme:"Durumsal ipuçlarını yakalamak",q:["İnsanları sana nasıl tepki verdiklerini görmek için yakından gözlemlediğin bir zamanı anlat.","İnsanların sana neden belirli bir şekilde davrandığından emin olmadığın bir zamanı anlat."]},
    {theme:"Grup dinamiklerini anlamak",q:["Bir gruba veya organizasyona yeni katıldığın ve uyum sağlamayı öğrendiğin bir zamanı anlat.","Çevrenizdeki insanlar nedeniyle tarzını uyarladığın bir zamanı anlat."]},
    {theme:"Eski yöntemlerin artık işe yaramadığını fark etmek",q:["Geçmişte kullandığın bir tarzın artık işe yaramadığını fark ettiğin bir zamanı anlat.","Tarzını ve yaklaşımını yarı yolda değiştirip farklı bir yöne gittiğin bir zamanı anlat."]},
    {theme:"Geri bildirime yanıt vermek",q:["Geri bildirime dayanarak yaklaşımını değiştirdiğin bir zamanı anlat.","Belirli durumlarda tarzını uyarlamanın tavsiye edildiği bir zamanı anlat."]}
  ],
  'sm':[
    {theme:"Strateji geliştirmek ve trendleri öngörmek",q:["Organizasyonun veya müşterilerin için değer yaratacak bir strateji geliştirmek zorunda kaldığın bir durumu anlat.","Öngörülen gelecekteki trendlerin stratejik planlarını ve kararlarını etkilediği bir zamanı anlat."]},
    {theme:"Başkalarıyla birlikte strateji geliştirmek",q:["Yeni bir vizyon ve strateji oluşturmaktan sorumlu bir ekiple çalıştığın bir zamanı örnek vererek anlat.","Bir organizasyonun ya da grubun parçasıyken stratejinin yetersiz veya eksik olduğunu düşündüğün durumu anlat."]},
    {theme:"Gelecek senaryolar ve olasılıklar öne sürmek",q:["Geleceğe yönelik bir rota çizerken çeşitli senaryoları ve olasılıkları araştırdığın bir zamanı örnek vererek anlat.","Sektörünüzün veya organizasyonunun geleceği için hayal ettiğin olasılıkları anlat."]},
    {theme:"Uygulama sırasında stratejiyi revize etmek",q:["Bir stratejiyi uygularken rekabet ortamındaki değişiklikler nedeniyle stratejiyi revize etmek veya yön değiştirmek zorunda kaldığın bir zamanı anlat.","Uygulanabilir bir rekabet stratejisi geliştirdiğin ama kontrolün dışındaki güçler nedeniyle stratejiyi planlandığı gibi tam olarak uygulayamadığın bir zamanı anlat."]},
    {theme:"Stratejik olmanın sonuçlarını gerçekleştirmek",q:["Stratejik vizyonunun veya büyük resim düşüncenin bir avantaj olduğu bir zamanı anlat.","Sorunları önceden tahmin etmenin zor olduğu ve stratejik etkisi olan bir durumu anlat."]}
  ],
  'ts':[
    {theme:"Yeni teknolojiyi başarıyla benimsemek",q:["Yeni bir teknolojiyi benimsemenin gerçekten işine yaradığı bir zamanı anlat.","Yeni bir teknolojiyi uygulamaya geçirdiğin bir zamanı anlat."]},
    {theme:"Teknoloji iyileştirmelerini sonuçlarla ilişkilendirmek",q:["Müşteriler için büyük sorunlara yol açan yeni bir teknolojiye bir örnek ver.","Önerdiğin ve organizasyona olumlu etki yapan yeni bir teknolojiye bir örnek ver."]},
    {theme:"Yeni teknoloji öğrenmek",q:["Şimdiye kadar aşmak zorunda kaldığın en büyük teknolojik zorluğu anlat.","Yeni bir teknolojiyle performansını nasıl artırdığına dair bir örnek ver."]},
    {theme:"Yeni teknolojinin erken benimseyicisi olmak",q:["Yeni bir teknolojinin erken benimseyicisi olduğun bir zamanı anlat.","Başka birine yeni bir teknolojiyi öğrettiğin bir zamanı anlat."]},
    {theme:"Yeni teknolojiye direnmek",q:["Yeni bir teknolojiyi benimsememenin sana zorluk çıkardığı bir zamanı anlat.","Yeni bir teknolojiye direniş gösterdiğin bir zamanı anlat."]}
  ]
};

/* ════════════════════════════════════════════════
   STAR TECHNIQUE CONTENT
   ════════════════════════════════════════════════ */
var STAR_CONTENT = {
  intro: 'Hazırlık yapan aday her zaman bir adım öndedir. STAR tekniği, deneyimlerinizi net ve tutarlı anlatmanızı sağlar \u2014 görüşmeci tam olarak ne yaptığınızı anlar.',
  what: {
    title: 'STAR Tekniği Nedir?',
    desc: 'STAR, iş görüşmelerinde davranışsal soruları tutarlı ve somut yanıtlamak için kullanılan bir yöntemdir.',
    steps: [
      { letter: 'S', tr: 'Durum', en: 'Situation', desc: 'Karşılaştığınız durumu, zorluğu veya bağlamı tanımlayın. Görüşmeciyi sahneye çekin: neredeydiniz, ne oluyordu, neden önemliydi? Bağlamı kısa ama net tutun \u2014 bir veya iki cümle yeterlidir. Gereksiz detaylardan kaçının, sadece hikayenin anlaşılması için gerekli olan arka planı verin.' },
      { letter: 'T', tr: 'Görev', en: 'Task', desc: 'Bu durum içinde sizin spesifik sorumluluğunuzu veya hedefinizi açıklayın. Ekibin genel görevi değil, sizden beklenen çıktıyı netleştirin. Görüşmeci \u201Cbu kişinin rolü neydi?\u201D sorusuna net bir yanıt almalı. Tek cümle ideal, ancak karmaşık görevlerde iki cümleye uzayabilir.' },
      { letter: 'A', tr: 'Aksiyon', en: 'Action', desc: 'Görevi başarmak için attığınız somut adımları detaylandırın. Teknik ve kişisel becerilerinizi dengeli vurgulayın. \u201CBiz\u201D yerine \u201Cben\u201D kullanarak kendi katkınızı netleştirin. Neden o yaklaşımı seçtiğinizi kısaca açıklayın. Üç ila beş cümle ideal uzunluktur.' },
      { letter: 'R', tr: 'Sonuç', en: 'Result', desc: 'Eylemlerinizin yarattığı somut sonucu ve etkiyi paylaşın. Mümkünse sonuçları rakamlarla destekleyin: yüzdelik artış, süre tasarrufu, müşteri memnuniyet puanı. Başarı kadar başarısızlıktan öğrendikleriniz de değerlidir \u2014 önemli olan dersler çıkarmış olmanızdır. Bir veya iki cümle.' }
    ],
    takeaway: {
      tr: 'Çıkarım',
      en: 'Takeaway',
      desc: 'Deneyimden ne öğrendiğinizi ve bu öğrenimin yeni rolde nasıl işe yarayacağını açıklayın. Görüşmeci, geçmiş deneyimlerden ders çıkarıp çıkarmadığınızı anlamak ister. Bu adım \u201Cbu aday öğreniyor\u201D izlenimini bırakır.'
    }
  },
  example: {
    title: '\u201CBaşarısız olduğunuz bir dönemi anlatın\u201D',
    situation: 'Premium segmentte bir mağazada kıdemli satış danışmanı olarak çalışıyordum. Önemli bir kurumsal müşterinin özel sipariş süreci vardı \u2014 yüksek adetli bir çalışan hediye programı için yaklaşık 200 ürün seçimi yapıyorduk. Üç aydır ilişkiyi yürütüyor, özel fiyatlandırma ve paketleme seçenekleri hazırlıyorduk. Müşteri satın alma müdürü ile düzenli görüşmelerimiz oluyordu ve süreç olumlu ilerliyordu.',
    task: 'Bu siparişi kapatmak benim sorumluluğumdaydı. Başarılı olursam çeyreklik satış hedefimi tek başına yüzde kırk aşacaktım ve mağaza için de önemli bir referans proje olacaktı.',
    action: 'Müşterinin bütce sınırlarını ve marka tercihlerini analiz ederek detaylı bir ürün önerisi hazırladım. Üst düzey yönetimden ek indirim onayı alarak rekabetçi bir fiyat teklifi oluşturdum. Paketleme ve teslimat için lojistik ekibiyle koordinasyon sağladım. Ancak final toplantısında müşterinin tedarik zinciri müdürü beklemediğim teknik sorular sordu: kargo sigortası, toplu iade koşulları ve fatura kesim takvimi. Bu detayları hazırlamamıştım ve o anda profesyonel bir yanıt veremedim. Satın alma müdürü ile kurduğum güvene rağmen, fark ettim ki karar masasında sadece o yokmuş \u2014 tüm paydaşları haritalamamıştım.',
    result: 'Toplantı sonrası eksik bilgileri hızla tamamlayıp gönderdim, ama müşteri süreci bir rakiple ilerletme kararı almıştı. Üç aylık emeği kaybettim ve çeyrek hedefimi tutturamazken, ekip olarak da önemli bir referansı kaçırmış olduk. Bu benim iş hayatımda en çok öğreten başarısızlıklardan biri oldu.',
    takeaway: 'Bu deneyim bana üç kritik ders öğretti. Birincisi, bir satış sürecinde tüm karar vericileri ve etki alanlarını baştan haritalamak gerekiyor \u2014 tek kişiyle ilişki kurmak yetmiyor. İkincisi, her sunumumda artık ekip arkadaşlarım ve yöneticimle ön provalar yapıyorum; zayıf noktalarımı bulmamı ve itirazlara hazırlıklı olmamı sağlıyorlar. Üçüncüsü, başarının bireysel değil takım işi olduğunu içselleştirdim \u2014 lojistik, finans ve yönetim desteğini proaktif olarak dahil etmeyi öğrendim.'
  },
  benefits: [
    'Cevabınız dağılmaz \u2014 ne söyleyeceğinizi önceden bilirsiniz',
    'Yaşadığınız deneyimi, başvurduğunuz pozisyonla doğrudan ilişkilendirirsiniz',
    'Sonuçları rakamla desteklediğinizde görüşmeci somut bir resim görür',
    'Hatalardan ne öğrendiğinizi gösterirsiniz \u2014 bu, gelişime açık olduğunuzun kanıtıdır'
  ],
  tips_do: [
    'Sorunun gerçekten bir STAR yanıtı gerektirip gerektirmediğini değerlendirin',
    'Canlı ve spesifik örneklerle akılda kalıcı olun',
    'Sonuçları mümkün olduğunda rakamlarla destekleyin',
    '\u201CBiz\u201D yerine \u201Cben\u201D kullanarak kendi katkınızı netleştirin',
    'Hem teknik hem kişisel becerilerinizi dengeli şekilde vurgulayın',
    'Deneyimlerinizi yeni pozisyonun gereklilikleriyle ilişkilendirin',
    'Her yanıtı iki dakikanın altında tutun'
  ],
  tips_dont: [
    'Her soruya STAR formatıyla yanıtlamayın \u2014 bazı sorular bunu gerektirmez',
    'Gereksiz detayla uzatmayın, odağınızı kaybetmeyin',
    'Hazır hikayenizi sorulan soruya uyarlamadan anlatmayın',
    'Sadece başarı hikayelerine odaklanmayın \u2014 zorluklardan öğrendiğinizi de paylaşın',
    'Aynı hikayeyi farklı görüşmecilere tekrarlamayın',
    'Başarılarınızı abartmayın \u2014 samimi ve gerçekçi olun'
  ]
};

/* ════════════════════════════════════════════════
   FREEMIUM CONSTANTS
   ════════════════════════════════════════════════ */
var FREE_COMP_LIMIT = 2;
var FREE_Q_PER_COMP = 3;
var FREE_SWAP_LIMIT = 2;

/* ════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════ */
var _loaded = false;
var S = {
  screen: 'star_intro',
  role: null,
  comps: [],
  isPremium: false,
  activeComp: null,
  activeCompIdx: 0,
  dealt: [],
  currentQ: 0,
  swapsUsed: 0,
  answeredCount: 0,
  starHintOpen: false,
  coachOpen: false,
  journalOpen: false,
  drawerOpen: false,
  drawerTab: 'star',
  activeTab: 'overview',
  completedComps: [],
  totalAnswered: 0,
  totalSwaps: 0
};

function resetState() {
  S.screen = 'lobby';
  S.role = null;
  S.comps = [];
  S.isPremium = false;
  S.activeComp = null;
  S.activeCompIdx = 0;
  S.dealt = [];
  S.currentQ = 0;
  S.swapsUsed = 0;
  S.answeredCount = 0;
  S.drawerOpen = false;
  S.drawerTab = 'star';
  S.journalOpen = false;
  S.activeTab = 'overview';
  S.completedComps = [];
  S.totalAnswered = 0;
  S.totalSwaps = 0;
}

/* ════════════════════════════════════════════════
   QUESTION POOL HELPERS
   ════════════════════════════════════════════════ */

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function flattenQuestions(compCode) {
  var themes = INTERVIEW_QUESTIONS[compCode] || [];
  var flat = [];
  for (var t = 0; t < themes.length; t++) {
    for (var q = 0; q < themes[t].q.length; q++) {
      flat.push({ theme: themes[t].theme, text: themes[t].q[q], themeIdx: t });
    }
  }
  return flat;
}

function dealQuestions(compCode, count) {
  var all = flattenQuestions(compCode);
  if (!all.length) return [];
  var recent = getRecentQuestions();
  var themes = INTERVIEW_QUESTIONS[compCode] || [];
  var themeCount = themes.length;
  var dealt = [];

  /* Build a shuffled theme order so we don't always start at 0,1,2 */
  var themeOrder = [];
  for (var t = 0; t < themeCount; t++) themeOrder.push(t);
  themeOrder = shuffle(themeOrder);

  /* Pick one question per shuffled theme, cycling if count > themeCount */
  var round = 0;
  while (dealt.length < count && dealt.length < all.length) {
    var targetTheme = themeOrder[round % themeCount];
    var candidates = all.filter(function(q) {
      return q.themeIdx === targetTheme &&
        dealt.indexOf(q) === -1 &&
        recent.indexOf(q.text) === -1;
    });
    if (!candidates.length) {
      candidates = all.filter(function(q) {
        return q.themeIdx === targetTheme && dealt.indexOf(q) === -1;
      });
    }
    if (candidates.length) {
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      dealt.push(pick);
    }
    round++;
    if (round > count * themeCount) break;
  }
  return dealt;
}

function getSwapQuestion(compCode, currentPool, currentIdx) {
  var all = flattenQuestions(compCode);
  var usedTexts = currentPool.map(function(q) { return q.text; });
  var recent = getRecentQuestions();
  var candidates = all.filter(function(q) {
    return usedTexts.indexOf(q.text) === -1 && recent.indexOf(q.text) === -1;
  });
  if (!candidates.length) {
    candidates = all.filter(function(q) { return usedTexts.indexOf(q.text) === -1; });
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
   ════════════════════════════════════════════════ */

var LS_STAR_SEEN = 'ht_star_seen';
var LS_RECENT_Q = 'ht_recent_q';
var RECENT_Q_MAX = 20;

function hasSeenStar() {
  try { return localStorage.getItem(LS_STAR_SEEN) === '1'; } catch(e) { return false; }
}
function markStarSeen() {
  try { localStorage.setItem(LS_STAR_SEEN, '1'); } catch(e) {}
}
function getRecentQuestions() {
  try {
    var raw = localStorage.getItem(LS_RECENT_Q);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}
function addRecentQuestion(text) {
  try {
    var arr = getRecentQuestions();
    if (arr.indexOf(text) === -1) arr.push(text);
    if (arr.length > RECENT_Q_MAX) arr = arr.slice(arr.length - RECENT_Q_MAX);
    localStorage.setItem(LS_RECENT_Q, JSON.stringify(arr));
  } catch(e) {}
}

/* ════════════════════════════════════════════════
   JOURNAL (Gelişim Günlüğü) — DB-backed with localStorage write-through
   ════════════════════════════════════════════════ */

var LS_JOURNAL_PREFIX = 'ht_journal_';
var _journalDbCache = null; /* { compCode_qHash: {s,t,a,r,takeaway} } — loaded once per session */
var _journalDbLoaded = false;

function journalHash(str) {
  /* Simple deterministic hash for question text → short key */
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h; /* Convert to 32-bit int */
  }
  return Math.abs(h).toString(36);
}

function journalKey(compCode, qText) {
  return LS_JOURNAL_PREFIX + compCode + '_' + journalHash(qText);
}

function journalCacheKey(compCode, qHash) {
  return compCode + '_' + qHash;
}

/* Preload all candidate journals from DB into _journalDbCache.
   Also migrates any localStorage drafts that don't exist in DB yet. */
async function preloadJournalsFromDb() {
  if (_journalDbLoaded) return;
  _journalDbLoaded = true;
  _journalDbCache = {};

  try {
    var res = await supabase.rpc('get_my_journals');
    if (!res.error && res.data) {
      for (var i = 0; i < res.data.length; i++) {
        var j = res.data[i];
        var ck = journalCacheKey(j.competency_code, j.question_hash);
        _journalDbCache[ck] = {
          s: j.situation_text || '',
          t: j.task_text || '',
          a: j.action_text || '',
          r: j.result_text || '',
          takeaway: j.takeaway_text || ''
        };
      }
    }

    /* Migrate localStorage drafts → DB (once, if DB is empty for that key) */
    migrateLocalJournalsToDb();
  } catch (e) { /* silent — DB journals are best-effort upgrade */ }
}

function migrateLocalJournalsToDb() {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(LS_JOURNAL_PREFIX) !== 0) continue;
      var raw = localStorage.getItem(k);
      if (!raw) continue;
      var d = JSON.parse(raw);
      if (!d || !d.comp || !d.qHash) continue;
      if (!(d.s || d.t || d.a || d.r || d.takeaway)) continue;

      var ck = journalCacheKey(d.comp, d.qHash);
      if (_journalDbCache[ck]) continue; /* DB already has this draft — skip */

      /* Fire-and-forget migration to DB */
      _journalDbCache[ck] = { s: d.s || '', t: d.t || '', a: d.a || '', r: d.r || '', takeaway: d.takeaway || '' };
      supabase.rpc('upsert_studio_journal', {
        p_competency_code: d.comp,
        p_question_hash: d.qHash,
        p_situation: d.s || '',
        p_task: d.t || '',
        p_action: d.a || '',
        p_result: d.r || '',
        p_takeaway: d.takeaway || ''
      }).then(function() {});
    }
  } catch (e) { /* silent */ }
}

function saveJournalDraft(compCode, qText, fields) {
  var qHash = journalHash(qText);
  var data = {
    comp: compCode,
    qHash: qHash,
    s: fields.s || '',
    t: fields.t || '',
    a: fields.a || '',
    r: fields.r || '',
    takeaway: fields.takeaway || '',
    savedAt: Date.now()
  };
  var hasContent = data.s || data.t || data.a || data.r || data.takeaway;

  /* 1. localStorage — instant write-through buffer */
  try {
    var key = journalKey(compCode, qText);
    if (hasContent) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      localStorage.removeItem(key);
    }
  } catch(e) {}

  /* 2. DB cache update */
  var ck = journalCacheKey(compCode, qHash);
  if (hasContent) {
    _journalDbCache = _journalDbCache || {};
    _journalDbCache[ck] = { s: data.s, t: data.t, a: data.a, r: data.r, takeaway: data.takeaway };
  } else if (_journalDbCache) {
    delete _journalDbCache[ck];
  }

  /* 3. Async DB save (fire-and-forget) */
  if (typeof supabase !== 'undefined') {
    supabase.rpc('upsert_studio_journal', {
      p_competency_code: compCode,
      p_question_hash: qHash,
      p_question_text: qText,
      p_role_key: S.role || null,
      p_situation: data.s,
      p_task: data.t,
      p_action: data.a,
      p_result: data.r,
      p_takeaway: data.takeaway
    }).then(function() {});
  }
}

function loadJournalDraft(compCode, qText) {
  var qHash = journalHash(qText);
  var ck = journalCacheKey(compCode, qHash);

  /* 1. Try DB cache first (cross-device truth) */
  if (_journalDbCache && _journalDbCache[ck]) {
    var db = _journalDbCache[ck];
    return { s: db.s, t: db.t, a: db.a, r: db.r, takeaway: db.takeaway };
  }

  /* 2. Fallback to localStorage (local buffer / pre-migration) */
  try {
    var raw = localStorage.getItem(journalKey(compCode, qText));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function countJournalDraftsForComp(compCode) {
  var count = 0;

  /* Count from DB cache if available */
  if (_journalDbCache) {
    var prefix = compCode + '_';
    var keys = Object.keys(_journalDbCache);
    for (var di = 0; di < keys.length; di++) {
      if (keys[di].indexOf(prefix) === 0) {
        var d = _journalDbCache[keys[di]];
        if (d.s || d.t || d.a || d.r || d.takeaway) count++;
      }
    }
    return count;
  }

  /* Fallback: localStorage scan */
  try {
    var lsPrefix = LS_JOURNAL_PREFIX + compCode + '_';
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(lsPrefix) === 0) {
        var raw = localStorage.getItem(k);
        if (raw) {
          var ld = JSON.parse(raw);
          if (ld.s || ld.t || ld.a || ld.r || ld.takeaway) count++;
        }
      }
    }
  } catch(e) {}
  return count;
}

/* ════════════════════════════════════════════════
   SESSION STORAGE — persist/restore in-progress session
   ════════════════════════════════════════════════ */

var SS_KEY = 'ht_ig_session';

function saveSession() {
  try {
    var data = {
      screen: S.screen,
      role: S.role,
      comps: S.comps,
      activeComp: S.activeComp,
      activeCompIdx: S.activeCompIdx,
      dealt: S.dealt,
      currentQ: S.currentQ,
      swapsUsed: S.swapsUsed,
      answeredCount: S.answeredCount,
      starHintOpen: S.starHintOpen,
      coachOpen: S.coachOpen,
      journalOpen: S.journalOpen,
      activeTab: S.activeTab,
      completedComps: S.completedComps,
      totalAnswered: S.totalAnswered,
      totalSwaps: S.totalSwaps
    };
    sessionStorage.setItem(SS_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadSession() {
  try {
    var raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (!data || !data.screen) return false;
    S.screen = data.screen;
    S.role = data.role || null;
    S.comps = data.comps || [];
    S.activeComp = data.activeComp || null;
    S.activeCompIdx = data.activeCompIdx || 0;
    S.dealt = data.dealt || [];
    S.currentQ = data.currentQ || 0;
    S.swapsUsed = data.swapsUsed || 0;
    S.answeredCount = data.answeredCount || 0;
    S.starHintOpen = data.starHintOpen || false;
    S.coachOpen = data.coachOpen || false;
    S.journalOpen = data.journalOpen || false;
    S.activeTab = data.activeTab || 'overview';
    S.completedComps = data.completedComps || [];
    S.totalAnswered = data.totalAnswered || 0;
    S.totalSwaps = data.totalSwaps || 0;
    return true;
  } catch(e) { return false; }
}

function clearSession() {
  try { sessionStorage.removeItem(SS_KEY); } catch(e) {}
}

/* ════════════════════════════════════════════════
   SVG ICONS
   ════════════════════════════════════════════════ */

var lockSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
var arrowLeftSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
var checkSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
var swapSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></svg>';
var starSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
var trophySVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
var coachSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
var journalSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
var penSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
var briefSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';

/* ════════════════════════════════════════════════
   CSS INJECTION
   ════════════════════════════════════════════════ */

function injectCSS() {
  if (document.getElementById('ig-style')) return;
  var css = '';

  /* Animations */
  css += '@keyframes igFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  css += '@keyframes igSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  css += '@keyframes igPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}';
  css += '#ig-container{animation:igFadeIn .25s ease;max-width:100%;padding:0 0 40px}';

  /* Bento Grid */
  css += '.ig-bento{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}';
  css += '.ig-bento-full{grid-column:1/-1}';
  css += '.ig-bento-2{grid-column:span 2}';

  /* Cards */
  css += '.ig-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:24px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:box-shadow .3s ease,transform .3s ease;animation:igSlideUp .35s ease both}';
  css += '.ig-bento>.ig-card:nth-child(2){animation-delay:.05s}.ig-bento>.ig-card:nth-child(3){animation-delay:.1s}.ig-bento>.ig-card:nth-child(4){animation-delay:.15s}.ig-bento>.ig-card:nth-child(5){animation-delay:.2s}.ig-bento>.ig-card:nth-child(6){animation-delay:.25s}';
  css += '.ig-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-1px)}';

  /* Section titles */
  css += '.ig-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px}';
  css += '.ig-section-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);line-height:1.6}';

  /* STAR Quad card */
  css += '.ig-star-quad-card{display:flex;align-items:center;justify-content:center;padding:24px;background:#C94E28 !important;border:none !important}';
  css += '.ig-star-quad{display:flex;flex-direction:column;gap:5px}';
  css += '.ig-star-row{display:flex;gap:5px}';
  css += '.ig-star-cell{width:76px;height:76px;background:#fff;border:none;outline:none;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .25s ease;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.06)}';
  css += '.ig-star-cell:hover{transform:scale(1.06)}';
  css += '.ig-star-cell .ig-sq-letter{font-family:"Bricolage Grotesque",sans-serif;font-size:30px;font-weight:900;letter-spacing:-1px;transition:all .25s;color:var(--verm,#C94E28)}';
  css += '.ig-star-cell .ig-sq-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:9px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;transition:all .25s;margin-top:2px}';
  css += '.ig-sq-s{border-radius:60px 5px 5px 5px}.ig-sq-t{border-radius:5px 60px 5px 5px}.ig-sq-a{border-radius:5px 5px 5px 60px}.ig-sq-r{border-radius:5px 5px 60px 5px}';
  css += '.ig-star-cell.active{transform:scale(1.06);background:linear-gradient(135deg,#d4572f 0%,#b84420 100%);box-shadow:0 4px 16px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.15)}';
  css += '.ig-star-cell.active .ig-sq-letter{color:#fff}';

  /* STAR Detail card */
  css += '.ig-star-detail-card{display:flex;align-items:center;padding:24px 28px}';
  css += '.ig-star-detail{animation:igFadeIn .2s ease}';
  css += '.ig-star-detail-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;margin-bottom:8px}';
  css += '.ig-star-detail-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.7}';

  /* Takeaway banner */
  css += '.ig-takeaway-banner{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:none;color:#fff;display:flex;align-items:center;gap:16px;padding:16px 24px}';
  css += '.ig-takeaway-badge{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:900;color:var(--verm,#C94E28);flex-shrink:0}';
  css += '.ig-takeaway-body{flex:1;min-width:0}';
  css += '.ig-takeaway-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:#fff;margin-bottom:2px}';
  css += '.ig-takeaway-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:rgba(255,255,255,.7);line-height:1.6}';

  /* Benefits grid */
  css += '.ig-benefits-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}';
  css += '.ig-benefit-card{display:flex;align-items:flex-start;gap:12px;padding:20px}';
  css += '.ig-benefit-num{flex-shrink:0;width:28px;height:28px;border-radius:8px;background:rgba(201,78,40,.08);color:var(--verm,#C94E28);font-family:"DM Mono",monospace;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}';
  css += '.ig-benefit-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.6}';

  /* Role card */
  css += '.ig-role-card{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1) !important;border-radius:16px;padding:20px;text-align:center;transition:all .3s ease;cursor:pointer;display:flex;flex-direction:column;justify-content:center;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-role-card .ig-role-label{color:#fff !important}';
  css += '.ig-role-card .ig-role-desc{color:rgba(255,255,255,.7) !important}';
  css += '.ig-role-label{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px}';
  css += '.ig-role-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280)}';
  css += '.ig-role-select{width:100%;max-width:400px;margin:16px auto 0;display:block;padding:12px 16px;border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-primary,#111);background:var(--bg-surface,#fff);cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}';
  css += '.ig-role-select:focus{outline:none;border-color:var(--verm,#C94E28);box-shadow:0 0 0 3px rgba(201,78,40,.1)}';
  css += '.ig-role-card .ig-role-select{background:rgba(255,255,255,.12) !important;border:1px solid rgba(255,255,255,.25) !important;color:#fff !important;height:44px !important;padding:0 36px 0 14px !important}';
  css += '.ig-role-card .ig-role-select:focus{border-color:var(--verm,#C94E28) !important;box-shadow:0 0 0 3px rgba(201,78,40,.2)}';
  css += '.ig-role-card .ig-role-select option{background:var(--navy,#1E2D5E);color:#fff}';

  /* Nav pill */
  css += '.ig-nav-pill{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);border:1px solid rgba(201,78,40,.15);border-radius:20px;padding:6px 14px;cursor:pointer;transition:all .2s;margin-bottom:16px;animation:igFadeIn .25s ease}';
  css += '.ig-nav-pill:hover{background:rgba(201,78,40,.1);border-color:rgba(201,78,40,.3)}';
  css += '.ig-nav-pill svg{width:14px;height:14px}';

  /* Lobby comp cards */
  css += '.ig-lobby-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .3s ease;animation:igSlideUp .35s ease both}';
  css += '.ig-lobby-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-2px);border-color:var(--verm,#C94E28)}';
  css += '.ig-lobby-card.ig-completed{border-color:rgba(201,78,40,.3);background:rgba(201,78,40,.02)}';
  css += '.ig-lobby-comp-name{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.ig-lobby-comp-kf{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);letter-spacing:.4px;margin-bottom:8px}';
  css += '.ig-lobby-comp-meta{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
  css += '.ig-lobby-badge{display:inline-flex;align-items:center;gap:4px;font-family:"DM Mono",monospace;font-size:10px;padding:3px 8px;border-radius:6px;margin-top:8px}';
  css += '.ig-lobby-badge-done{background:rgba(201,78,40,.08);color:var(--verm,#C94E28)}';
  css += '.ig-lobby-badge-done svg{width:12px;height:12px}';

  /* Locked overlay */
  css += '.ig-q-locked{position:relative;overflow:hidden}';
  css += '.ig-q-locked .ig-q-inner{filter:blur(6px);pointer-events:none;user-select:none}';
  css += '.ig-q-lock-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.6);backdrop-filter:blur(2px);border-radius:16px;z-index:2}';
  css += '.ig-q-lock-icon{width:36px;height:36px;background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}';
  css += '.ig-q-lock-icon svg{width:18px;height:18px;color:#fff}';
  css += '.ig-q-lock-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin-bottom:10px;text-align:center}';
  css += '.ig-q-lock-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:8px;padding:8px 20px;cursor:pointer;transition:background .2s}';
  css += '.ig-q-lock-cta:hover{background:var(--verm-dark,#b84420)}';

  /* Practice screen */
  css += '.ig-practice-wrap{max-width:640px;margin:0 auto;animation:igFadeIn .3s ease}';
  css += '.ig-practice-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px}';
  css += '.ig-practice-comp{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;color:var(--text-primary,#111)}';
  css += '.ig-practice-progress{font-family:"DM Mono",monospace;font-size:12px;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px}';

  /* Question card (single, centered) */
  css += '.ig-q-focus{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:32px 28px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);animation:igFadeIn .3s ease}';
  css += '.ig-q-theme{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:var(--verm,#C94E28);letter-spacing:.3px;margin-bottom:12px;text-transform:uppercase}';
  css += '.ig-q-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:16px;color:var(--text-primary,#111);line-height:1.7;font-style:italic;margin-bottom:24px}';

  /* Action buttons */
  css += '.ig-q-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}';
  css += '.ig-btn{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;transition:all .2s}';
  css += '.ig-btn svg{width:16px;height:16px}';
  css += '.ig-btn-swap{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF) !important;color:var(--text-secondary,#4B5563)}';
  css += '.ig-btn-swap:hover{border-color:var(--verm,#C94E28) !important;color:var(--verm,#C94E28)}';
  css += '.ig-btn-swap.disabled{opacity:.4;cursor:not-allowed}';
  css += '.ig-btn-star{background:rgba(30,45,94,.06);color:var(--navy,#1E2D5E)}';
  css += '.ig-btn-star:hover{background:rgba(30,45,94,.12)}';
  css += '.ig-btn-star.active{background:var(--navy,#1E2D5E);color:#fff}';
  css += '.ig-btn-answered{background:var(--verm,#C94E28);color:#fff}';
  css += '.ig-btn-answered:hover{background:#b84420}';

  /* STAR hint panel */
  css += '.ig-star-hint-panel{margin-top:20px;background:linear-gradient(135deg,#f8f6f4 0%,#fff 100%);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px 24px;animation:igSlideUp .25s ease;text-align:left}';
  css += '.ig-star-hint-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:12px}';
  css += '.ig-star-hint-step{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}';
  css += '.ig-star-hint-step:last-child{margin-bottom:0}';
  css += '.ig-star-hint-letter{flex-shrink:0;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:900;color:#fff}';
  css += '.ig-star-hint-letter.verm{background:var(--verm,#C94E28)}';
  css += '.ig-star-hint-letter.navy{background:var(--navy,#1E2D5E)}';
  css += '.ig-star-hint-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;padding-top:4px}';

  /* Completion screen */
  css += '.ig-completion{max-width:520px;margin:24px auto;text-align:center;animation:igFadeIn .3s ease;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:36px 28px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-completion-icon{width:64px;height:64px;background:rgba(201,78,40,.08);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px}';
  css += '.ig-completion-icon svg{width:32px;height:32px;color:var(--verm,#C94E28)}';
  css += '.ig-completion-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:800;color:var(--text-primary,#111);margin-bottom:8px}';
  css += '.ig-completion-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-muted,#6B7280);line-height:1.6;margin-bottom:24px}';
  css += '.ig-completion-stats{display:flex;gap:16px;justify-content:center;margin-bottom:24px}';
  css += '.ig-stat{background:var(--bg-muted,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 20px;min-width:100px}';
  css += '.ig-stat-num{font-family:"DM Mono",monospace;font-size:24px;font-weight:700;color:var(--verm,#C94E28)}';
  css += '.ig-stat-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:4px}';

  /* Progress strip (lobby) */
  css += '.ig-progress-strip{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:12px 16px;background:linear-gradient(135deg,rgba(201,78,40,.04) 0%,rgba(201,78,40,.08) 100%);border:1px solid rgba(201,78,40,.12);border-radius:16px;animation:igFadeIn .3s ease}';
  css += '.ig-progress-bar{flex:1;height:6px;background:var(--border-subtle,#E5E3DF);border-radius:3px;overflow:hidden}';
  css += '.ig-progress-fill{height:100%;background:var(--verm,#C94E28);border-radius:3px;transition:width .4s ease}';
  css += '.ig-progress-text{font-family:"DM Mono",monospace;font-size:11px;color:var(--verm,#C94E28);white-space:nowrap;font-weight:600}';

  /* Competency definition (lobby cards + practice) */
  css += '.ig-lobby-comp-def{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);line-height:1.5;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}';
  css += '.ig-practice-def{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:16px;font-style:italic}';

  /* Session progress pill (practice) */
  css += '.ig-session-progress{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);background:rgba(201,78,40,.06);border:1px solid rgba(201,78,40,.12);border-radius:20px;padding:3px 10px}';

  /* Premium nudge (practice swap exhaustion) */
  css += '.ig-swap-nudge{margin-top:16px;padding:12px 16px;background:linear-gradient(135deg,rgba(30,45,94,.03) 0%,rgba(30,45,94,.06) 100%);border:1px solid rgba(30,45,94,.1);border-radius:16px;text-align:center;animation:igFadeIn .3s ease}';
  css += '.ig-swap-nudge-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--navy,#1E2D5E);line-height:1.5}';
  css += '.ig-swap-nudge-cta{display:inline-block;margin-top:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);cursor:pointer;text-decoration:none;border:none;background:none;padding:0}';
  css += '.ig-swap-nudge-cta:hover{text-decoration:underline}';

  /* Coach panel (practice screen — competency signals) */
  css += '.ig-coach-panel{margin-top:20px;background:linear-gradient(135deg,rgba(201,78,40,.03) 0%,rgba(201,78,40,.06) 100%);border:1px solid rgba(201,78,40,.12);border-radius:16px;padding:20px 24px;animation:igSlideUp .25s ease;text-align:left}';
  css += '.ig-coach-intro{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;font-style:italic;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid rgba(201,78,40,.1)}';
  css += '.ig-coach-section{margin-bottom:14px}';
  css += '.ig-coach-section:last-child{margin-bottom:0}';
  css += '.ig-coach-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}';
  css += '.ig-coach-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}';
  css += '.ig-coach-dot-strong{background:#2D8A56}';
  css += '.ig-coach-dot-risk{background:var(--verm,#C94E28)}';
  css += '.ig-coach-dot-over{background:var(--navy,#1E2D5E)}';
  css += '.ig-coach-label{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.ig-coach-bullets{list-style:none;margin:0;padding:0}';
  css += '.ig-coach-bullet{display:flex;gap:8px;align-items:flex-start;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;margin-bottom:6px}';
  css += '.ig-coach-bullet:last-child{margin-bottom:0}';
  css += '.ig-coach-bullet::before{content:"";flex-shrink:0;width:4px;height:4px;border-radius:50%;background:var(--text-muted,#6B7280);margin-top:7px}';
  css += '.ig-btn-coach{background:rgba(201,78,40,.06);color:var(--verm,#C94E28)}';
  css += '.ig-btn-coach:hover{background:rgba(201,78,40,.12)}';
  css += '.ig-btn-coach.active{background:var(--verm,#C94E28);color:#fff}';

  /* Competency Intro screen */
  css += '.ig-intro-wrap{max-width:100%;margin:0;animation:igFadeIn .3s ease}';
  css += '.ig-intro-hero{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border-radius:24px;padding:28px 24px;margin-bottom:16px;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-intro-comp-name{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:800;margin-bottom:6px}';
  css += '.ig-intro-comp-def{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:rgba(255,255,255,.75);line-height:1.6}';
  css += '.ig-intro-why{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px 24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-intro-why-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px;display:flex;align-items:center;gap:8px}';
  css += '.ig-intro-why-title svg{width:18px;height:18px;color:var(--verm,#C94E28)}';
  css += '.ig-intro-why-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.7}';
  css += '.ig-intro-signals{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}';
  css += '.ig-intro-signal-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 18px}';
  css += '.ig-intro-signal-full{grid-column:1/-1}';
  css += '.ig-intro-star-block{background:linear-gradient(135deg,rgba(201,78,40,.03) 0%,rgba(201,78,40,.06) 100%);border:1px solid rgba(201,78,40,.12);border-radius:16px;padding:20px 24px;margin-bottom:16px}';
  css += '.ig-intro-star-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--verm,#C94E28);margin-bottom:10px;display:flex;align-items:center;gap:8px}';
  css += '.ig-intro-star-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.7}';
  css += '.ig-intro-star-letters{display:flex;gap:6px;margin-top:12px}';
  css += '.ig-intro-star-badge{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:900;color:#fff}';
  css += '.ig-intro-cta-row{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}';

  /* ── Course Detail — Tab Bar ── */
  css += '.st-tab-bar{display:flex;gap:0;border-bottom:2px solid var(--border-subtle,#E5E3DF);margin-bottom:20px}';
  css += '.st-tab{padding:10px 20px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-muted,#6B7280);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s}';
  css += '.st-tab:hover{color:var(--text-primary,#111)}';
  css += '.st-tab.active{color:var(--verm,#C94E28);border-bottom-color:var(--verm,#C94E28)}';
  css += '.st-tab-content{animation:igFadeIn .25s ease}';
  /* Course detail — hero progress bar */
  css += '.st-cd-progress{background:rgba(255,255,255,.15);border-radius:6px;height:6px;overflow:hidden;margin-top:10px;max-width:280px}';
  css += '.st-cd-progress-fill{height:100%;border-radius:6px;background:#fff;transition:width .4s ease}';
  /* Course detail — question list */
  css += '.st-q-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.st-q-row:last-child{border-bottom:none}';
  css += '.st-q-num{font-family:"DM Mono",monospace;font-size:13px;font-weight:700;color:var(--verm,#C94E28);min-width:24px;text-align:right;padding-top:1px}';
  css += '.st-q-body{flex:1;min-width:0}';
  css += '.st-q-theme{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--text-muted,#6B7280);text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px}';
  css += '.st-q-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-primary,#111);line-height:1.5}';
  css += '.st-q-status{font-size:14px;min-width:20px;text-align:center;padding-top:1px}';
  /* Course detail — notes tab empty state */
  css += '.st-notes-empty{text-align:center;padding:40px 20px;color:var(--text-muted,#6B7280);font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;line-height:1.7}';
  /* Course detail — journal entry card in notes tab */
  css += '.st-note-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.st-note-q{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111);margin-bottom:8px}';
  css += '.st-note-fields{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563)}';
  css += '.st-note-badge{font-family:"DM Mono",monospace;font-size:11px;font-weight:700;color:#fff;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center}';
  css += '.st-note-feedback{margin-top:10px;padding-top:10px;border-top:1px solid var(--border-subtle,#E5E3DF);font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563)}';
  css += '.st-note-feedback-label{font-weight:600;color:var(--navy,#1E2D5E);margin-bottom:4px}';

  /* Journal panel (practice screen) */
  css += '.ig-journal-wrap{margin-top:20px;animation:igFadeIn .3s ease}';
  css += '.ig-journal-toggle{display:flex;align-items:center;gap:8px;width:100%;padding:14px 18px;background:linear-gradient(135deg,rgba(30,45,94,.03) 0%,rgba(30,45,94,.06) 100%);border:1px solid rgba(30,45,94,.1);border-radius:16px;cursor:pointer;transition:all .2s;text-align:left}';
  css += '.ig-journal-toggle:hover{border-color:rgba(30,45,94,.2);background:linear-gradient(135deg,rgba(30,45,94,.04) 0%,rgba(30,45,94,.08) 100%)}';
  css += '.ig-journal-toggle.active{border-radius:16px 16px 0 0;border-bottom-color:transparent}';
  css += '.ig-journal-toggle svg{width:16px;height:16px;color:var(--navy,#1E2D5E);flex-shrink:0}';
  css += '.ig-journal-toggle-label{flex:1;font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--navy,#1E2D5E)}';
  css += '.ig-journal-toggle-hint{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280)}';
  css += '.ig-journal-toggle-arrow{font-size:12px;color:var(--text-muted,#6B7280);transition:transform .2s}';
  css += '.ig-journal-toggle.active .ig-journal-toggle-arrow{transform:rotate(180deg)}';
  css += '.ig-journal-body{background:linear-gradient(135deg,rgba(30,45,94,.02) 0%,rgba(30,45,94,.04) 100%);border:1px solid rgba(30,45,94,.1);border-top:none;border-radius:0 0 16px 16px;padding:20px 18px;animation:igSlideUp .2s ease}';
  css += '.ig-journal-intro{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:14px;font-style:italic}';
  css += '.ig-journal-field{margin-bottom:14px}';
  css += '.ig-journal-field:last-of-type{margin-bottom:8px}';
  css += '.ig-journal-field-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}';
  css += '.ig-journal-field-badge{width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:900;color:#fff;flex-shrink:0}';
  css += '.ig-journal-field-badge.verm{background:var(--verm,#C94E28)}';
  css += '.ig-journal-field-badge.navy{background:var(--navy,#1E2D5E)}';
  css += '.ig-journal-field-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111)}';
  css += '.ig-journal-textarea{width:100%;min-height:60px;padding:10px 12px;border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-primary,#111);line-height:1.6;resize:vertical;background:var(--bg-surface,#fff);transition:border-color .2s;box-sizing:border-box}';
  css += '.ig-journal-textarea:focus{outline:none;border-color:var(--navy,#1E2D5E);box-shadow:0 0 0 3px rgba(30,45,94,.08)}';
  css += '.ig-journal-textarea::placeholder{color:var(--text-muted,#6B7280);font-style:italic}';
  css += '.ig-journal-saved{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);text-align:right;padding-top:4px;min-height:16px}';
  css += '.ig-journal-saved.visible{color:#2D8A56}';
  /* AI Feedback area */
  css += '.aif-area{margin-top:16px}';
  css += '.aif-btn{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:#fff;background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 100%);border:none;border-radius:10px;padding:10px 20px;cursor:pointer;transition:all .25s;box-shadow:0 2px 8px rgba(30,45,94,.2)}';
  css += '.aif-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(30,45,94,.3)}';
  css += '.aif-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}';
  css += '.aif-btn svg{width:14px;height:14px}';
  css += '.aif-gate{display:flex;align-items:center;gap:8px;padding:12px 16px;background:rgba(30,45,94,.04);border:1px solid rgba(30,45,94,.08);border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
  css += '.aif-gate svg{flex-shrink:0;color:var(--navy,#1E2D5E);opacity:.4}';
  css += '.aif-gate span{flex:1}';
  css += '.aif-gate-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:700;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:0;flex-shrink:0}';
  /* Feedback result cards */
  css += '.aif-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:12px;padding:14px 16px;margin-top:10px}';
  css += '.aif-overall{border-left:3px solid var(--navy,#1E2D5E)}';
  css += '.aif-card-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px;letter-spacing:-.1px}';
  css += '.aif-signal{display:inline-block;font-family:"DM Mono",monospace;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;margin-bottom:8px;letter-spacing:.3px}';
  css += '.aif-summary{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;word-break:break-word}';
  css += '.aif-list-item{display:flex;align-items:flex-start;gap:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);line-height:1.5;margin-bottom:6px}';
  css += '.aif-bullet{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px}';
  css += '.aif-star-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px}';
  css += '.aif-star-indicator{font-family:"DM Mono",monospace;font-size:12px;font-weight:700;width:16px;text-align:center;flex-shrink:0}';
  css += '.aif-star-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--text-primary,#111)}';
  css += '.aif-star-note{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
  /* Phase 5B — progressive disclosure */
  css += '.aif-hero{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:14px;padding:18px 20px;margin-top:12px}';
  css += '.aif-hero-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}';
  css += '.aif-hero-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:800;color:var(--text-primary,#111)}';
  css += '.aif-hero-highlight{display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:10px;margin-bottom:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;line-height:1.5;word-break:break-word}';
  css += '.aif-hero-highlight.positive{background:rgba(5,150,105,.05);color:#065F46;border:1px solid rgba(5,150,105,.1)}';
  css += '.aif-hero-highlight.negative{background:rgba(220,38,38,.04);color:#991B1B;border:1px solid rgba(220,38,38,.08)}';
  css += '.aif-hero-highlight-icon{flex-shrink:0;font-size:14px;margin-top:1px}';
  css += '.aif-next-steps{margin-top:12px;padding:12px 14px;background:rgba(201,78,40,.03);border:1px solid rgba(201,78,40,.08);border-radius:10px}';
  css += '.aif-next-steps-title{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--verm,#C94E28);margin-bottom:8px}';
  css += '.aif-details{margin-top:10px}';
  css += '.aif-details summary{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:var(--navy,#1E2D5E);cursor:pointer;padding:10px 14px;background:rgba(30,45,94,.03);border:1px solid rgba(30,45,94,.06);border-radius:10px;list-style:none;display:flex;align-items:center;gap:6px}';
  css += '.aif-details summary::-webkit-details-marker{display:none}';
  css += '.aif-details summary::before{content:"\\25B6";font-size:8px;transition:transform .2s}';
  css += '.aif-details[open] summary::before{transform:rotate(90deg)}';
  css += '.aif-details[open] summary{border-radius:10px 10px 0 0;border-bottom-color:transparent}';
  css += '.aif-details-body{padding:12px 14px;background:rgba(30,45,94,.02);border:1px solid rgba(30,45,94,.06);border-top:none;border-radius:0 0 10px 10px}';

  /* Lobby draft badge */
  css += '.ig-lobby-badge-draft{background:rgba(30,45,94,.08);color:var(--navy,#1E2D5E)}';
  css += '.ig-lobby-badge-draft svg{width:12px;height:12px}';

  /* Yetenek evidence + self-rating */
  css += '.yk-evidence-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;animation:igFadeIn .3s ease}';
  css += '.yk-summary-chip{font-family:"DM Mono",monospace;font-size:10px;font-weight:600;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px;letter-spacing:.3px}';
  css += '.yk-evidence{margin-top:10px;border-top:1px solid var(--border-subtle,#E5E3DF);padding-top:10px;animation:igFadeIn .2s ease}';
  css += '.yk-rating-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}';
  css += '.yk-rating-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);flex-shrink:0}';
  css += '.yk-rating-toggle{display:flex;gap:4px}';
  css += '.yk-rating-btn{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);color:var(--text-muted,#6B7280);cursor:pointer;transition:all .2s}';
  css += '.yk-rating-btn:hover{border-color:var(--text-muted)}';
  css += '.yk-rating-btn.active.strong{background:#059669;color:#fff;border-color:#059669}';
  css += '.yk-rating-btn.active.growing{background:#D97706;color:#fff;border-color:#D97706}';
  css += '.yk-chip-row{display:flex;gap:6px;flex-wrap:wrap}';
  css += '.yk-chip{font-family:"DM Mono",monospace;font-size:9px;font-weight:600;padding:3px 10px;border-radius:20px;letter-spacing:.3px;border:1px solid transparent}';
  css += '.yk-chip-practice{color:var(--navy,#1E2D5E);background:rgba(30,45,94,.06);border-color:rgba(30,45,94,.1)}';
  css += '.yk-chip-journal{color:#2D8A56;background:rgba(45,138,86,.06);border-color:rgba(45,138,86,.1)}';
  css += '.yk-chip-ai{font-weight:700}';
  css += '.yk-chip-ai-strong{color:#059669;background:rgba(5,150,105,.08);border-color:rgba(5,150,105,.15)}';
  css += '.yk-chip-ai-mixed{color:#D97706;background:rgba(217,119,6,.08);border-color:rgba(217,119,6,.15)}';
  css += '.yk-chip-ai-needs_work{color:#DC2626;background:rgba(220,38,38,.08);border-color:rgba(220,38,38,.15)}';

  /* Yetenek Home (learning portal) */
  css += '.yk-home{animation:igFadeIn .3s ease}';
  css += '.yk-home-role-chooser{max-width:400px;margin:24px auto;text-align:center;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:24px 20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}';
  css += '.yk-home-role-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.yk-home-role-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin-bottom:14px;line-height:1.5}';
  css += '.yk-home-role-row{display:flex;gap:8px;align-items:center;justify-content:center}';
  css += '.yk-home-role-row .ig-role-select{flex:1;margin:0;height:44px;padding:0 36px 0 14px;box-sizing:border-box}';
  css += '.yk-home-role-btn{flex-shrink:0;height:44px;padding:0 24px;border:none;border-radius:10px;background:var(--verm,#C94E28);color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s;white-space:nowrap}';
  css += '.yk-home-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap}';
  css += '.yk-home-header-left{flex:1;min-width:0}';
  css += '.yk-home-role-label{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;color:var(--text-primary,#111)}';
  css += '.yk-home-comp-count{font-family:"DM Mono",monospace;font-size:11px;color:var(--text-muted,#6B7280);margin-top:2px}';
  css += '.yk-home-change-role{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--verm,#C94E28);background:none;border:1px solid rgba(201,78,40,.2);border-radius:8px;padding:6px 14px;cursor:pointer;transition:all .2s;flex-shrink:0}';
  css += '.yk-home-change-role:hover{background:rgba(201,78,40,.04)}';
  css += '.yk-home-continue{background:rgba(201,78,40,.04);border:1px solid rgba(201,78,40,.12);border-radius:14px;padding:16px 20px;margin-bottom:16px;cursor:pointer;transition:all .25s}';
  css += '.yk-home-continue:hover{background:rgba(201,78,40,.08);border-color:rgba(201,78,40,.2)}';
  css += '.yk-home-continue-kicker{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--verm,#C94E28);margin-bottom:4px}';
  css += '.yk-home-continue-title{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.yk-home-continue-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:var(--verm,#C94E28)}';
  css += '.yk-home-summary{display:flex;gap:10px;margin-bottom:16px}';
  css += '.yk-home-summary-item{flex:1;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;padding:12px 10px;text-align:center}';
  css += '.yk-home-summary-num{display:block;font-family:"DM Mono",monospace;font-size:20px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.yk-home-summary-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280)}';
  css += '.yk-home-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:12px;letter-spacing:-.2px}';
  css += '.yk-home-tracks{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}';
  css += '.yk-track-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:14px;padding:16px 18px;cursor:pointer;transition:all .25s;box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.yk-track-card:hover{border-color:var(--verm,#C94E28);box-shadow:0 4px 16px rgba(0,0,0,.08);transform:translateY(-1px)}';
  css += '.yk-track-locked{position:relative;overflow:hidden}';
  css += '.yk-track-locked .yk-track-inner{filter:blur(4px);pointer-events:none}';
  css += '.yk-track-done{border-left:3px solid var(--verm,#C94E28);opacity:.92}.yk-track-done:hover{opacity:1}';
  css += '.yk-track-top{display:flex;align-items:center;justify-content:space-between;gap:8px}';
  css += '.yk-track-name{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.yk-track-badge-done{font-family:"DM Mono",monospace;font-size:12px;color:#059669;background:rgba(5,150,105,.08);padding:2px 8px;border-radius:20px}';
  css += '.yk-track-done .yk-track-hover-hint{display:none;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--verm,#C94E28);margin-top:6px}';
  css += '.yk-track-done:hover .yk-track-hover-hint{display:block}';
  css += '.yk-review-pill{display:inline-block;font-family:"DM Mono",monospace;font-size:9px;letter-spacing:.5px;color:#D97706;background:rgba(217,119,6,.08);border:1px solid rgba(217,119,6,.12);padding:2px 8px;border-radius:20px;margin-top:6px}';
  /* Weekly activity summary */
  css += '.yk-weekly-summary{display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(30,45,94,.03);border:1px solid rgba(30,45,94,.06);border-radius:12px;margin-bottom:16px}';
  css += '.yk-weekly-summary-icon{width:28px;height:28px;border-radius:8px;background:rgba(30,45,94,.08);display:flex;align-items:center;justify-content:center;color:var(--navy,#1E2D5E);flex-shrink:0}';
  css += '.yk-weekly-summary-icon svg{width:14px;height:14px}';
  css += '.yk-weekly-summary-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);line-height:1.4}';
  css += '.yk-weekly-summary-text strong{font-weight:600;color:var(--text-primary,#111)}';
  /* Completion icon */
  css += '.yk-summary-icon{width:56px;height:56px;background:rgba(201,78,40,.08);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}';
  css += '.yk-summary-icon svg{width:28px;height:28px;color:var(--verm,#C94E28)}';
  /* Button press micro-feedback */
  css += '.ig-btn:active{transform:scale(.97);transition:transform .1s}';
  /* Streak pill */
  css += '.yk-streak-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-family:"DM Mono",monospace;font-size:12px;font-weight:600;margin-bottom:12px}';
  css += '.yk-streak-active{background:rgba(201,78,40,.08);color:var(--verm,#C94E28)}';
  css += '.yk-streak-zero{background:var(--bg-muted,#F7F6F4);color:var(--text-muted,#6B7280)}';
  css += '.yk-streak-pill svg{width:14px;height:14px}';
  css += '.yk-streak-frozen{background:rgba(30,45,94,.06);color:var(--navy,#1E2D5E)}';
  css += '.yk-streak-recover{background:rgba(217,119,6,.06);color:#D97706}';
  css += '.yk-streak-freeze-hint{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);margin-bottom:8px}';
  /* Daily practice card */
  css += '.yk-daily-card{display:flex;align-items:center;gap:14px;padding:14px 18px;background:linear-gradient(135deg,rgba(201,78,40,.03) 0%,rgba(201,78,40,.06) 100%);border:1px solid rgba(201,78,40,.1);border-radius:14px;margin-bottom:16px;cursor:pointer;transition:all .25s}';
  css += '.yk-daily-card:hover{border-color:var(--verm,#C94E28);box-shadow:0 4px 16px rgba(0,0,0,.06);transform:translateY(-1px)}';
  css += '.yk-daily-icon{width:36px;height:36px;border-radius:10px;background:rgba(201,78,40,.08);display:flex;align-items:center;justify-content:center;color:var(--verm,#C94E28);flex-shrink:0}';
  css += '.yk-daily-icon svg{width:18px;height:18px}';
  css += '.yk-daily-text{flex:1;min-width:0}';
  css += '.yk-daily-kicker{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--verm,#C94E28);margin-bottom:2px}';
  css += '.yk-daily-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.yk-daily-meta{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:2px}';
  css += '.yk-daily-cta{font-family:"DM Mono",monospace;font-size:11px;color:var(--verm,#C94E28);font-weight:600;flex-shrink:0}';
  /* Completion cross-links */
  css += '.yk-xlinks{display:flex;gap:10px;margin:16px 0;text-align:left}';
  css += '@media(max-width:600px){.yk-xlinks{flex-direction:column}}';
  css += '.yk-xlink{flex:1;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);cursor:pointer;transition:all .25s}';
  css += '.yk-xlink:hover{border-color:var(--verm,#C94E28);box-shadow:0 4px 12px rgba(0,0,0,.06);transform:translateY(-1px)}';
  css += '.yk-xlink-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}';
  css += '.yk-xlink-icon.navy{background:rgba(30,45,94,.08);color:var(--navy,#1E2D5E)}';
  css += '.yk-xlink-icon.verm{background:rgba(201,78,40,.08);color:var(--verm,#C94E28)}';
  css += '.yk-xlink-icon svg{width:16px;height:16px}';
  css += '.yk-xlink-text{flex:1;min-width:0}';
  css += '.yk-xlink-label{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:.8px;text-transform:uppercase;color:var(--text-muted,#6B7280);margin-bottom:2px}';
  css += '.yk-xlink-title{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  /* Detail → practice bridge (FAZ 4C) */
  css += '.st-detail-bridge{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);cursor:pointer;transition:all .25s;margin-top:16px}';
  css += '.st-detail-bridge:hover{border-color:var(--verm,#C94E28);box-shadow:0 4px 12px rgba(0,0,0,.06);transform:translateY(-1px)}';
  /* Personalized greeting */
  css += '.yk-greeting{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  /* Recommendation line */
  css += '.yk-recommendation{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;margin-bottom:16px;padding:10px 14px;background:rgba(30,45,94,.03);border-radius:10px}';
  css += '.yk-track-kf{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);margin-top:2px;letter-spacing:.3px}';
  css += '.yk-track-def{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;margin-top:6px}';
  css += '.yk-track-meta{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);margin-top:6px}';
  /* Next step guidance card */
  css += '.yk-home-next-step{background:rgba(30,45,94,.03);border:1px solid rgba(30,45,94,.08);border-radius:14px;padding:16px 20px;margin-bottom:16px}';
  css += '.yk-home-next-kicker{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--navy,#1E2D5E);margin-bottom:4px}';
  css += '.yk-home-next-title{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.yk-home-next-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.4}';

  css += '.yk-home-ai-teaser{display:flex;align-items:center;gap:14px;padding:16px 20px;background:linear-gradient(135deg,rgba(30,45,94,.03) 0%,rgba(30,45,94,.06) 100%);border:1px solid rgba(30,45,94,.08);border-radius:14px}';
  css += '.yk-home-ai-teaser-icon{width:36px;height:36px;border-radius:10px;background:rgba(30,45,94,.08);display:flex;align-items:center;justify-content:center;color:var(--navy,#1E2D5E);flex-shrink:0}';
  css += '.yk-home-ai-teaser-text{flex:1;min-width:0}';
  css += '.yk-home-ai-teaser-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:2px}';
  css += '.yk-home-ai-teaser-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.4}';
  css += '.yk-home-ai-teaser-badge{font-family:"DM Mono",monospace;font-size:9px;font-weight:600;color:var(--text-muted,#6B7280);background:var(--bg-muted,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px;flex-shrink:0}';
  /* Progress bar */
  css += '.yk-progress-bar-wrap{margin-bottom:16px}';
  css += '.yk-progress-bar{position:relative;height:6px;background:var(--border-subtle,#E5E3DF);border-radius:3px;overflow:hidden;margin-bottom:6px}';
  css += '.yk-progress-fill{height:100%;background:var(--verm,#C94E28);border-radius:3px;transition:width .5s cubic-bezier(.4,0,.2,1)}';
  css += '.yk-progress-fill.yk-progress-full{background:linear-gradient(90deg,var(--verm,#C94E28),#E8663D)}';
  css += '.yk-progress-footer{display:flex;justify-content:space-between;align-items:center}';
  css += '.yk-progress-label{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280)}';
  css += '.yk-progress-micro{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);font-weight:500}';
  css += '.yk-progress-micro.yk-progress-complete{color:#059669;font-weight:600}';
  css += '.yk-progress-milestones{position:absolute;top:0;left:0;right:0;height:100%;pointer-events:none}';
  css += '.yk-progress-ms{position:absolute;top:-1px;width:2px;height:8px;background:rgba(255,255,255,.7);border-radius:1px}';
  /* Track card arrow affordance */
  css += '.yk-track-arrow{display:flex;align-items:center;gap:6px;flex-shrink:0}';
  /* Locked summary block */
  css += '.yk-locked-summary{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:14px;padding:18px 20px;margin-top:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.yk-locked-summary-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px}';
  css += '.yk-locked-summary-icon{flex-shrink:0;width:32px;height:32px;background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 100%);border-radius:8px;display:flex;align-items:center;justify-content:center}';
  css += '.yk-locked-summary-icon svg{width:14px;height:14px;color:#fff}';
  css += '.yk-locked-summary-text{flex:1;min-width:0}';
  css += '.yk-locked-summary-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px}';
  css += '.yk-locked-summary-names{display:flex;gap:6px;flex-wrap:wrap}';
  css += '.yk-locked-tag{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);background:var(--bg-muted,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:3px 10px}';
  css += '.yk-locked-tag-more{font-weight:600;color:var(--text-secondary,#4B5563)}';
  css += '.yk-locked-summary-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.4;margin-bottom:12px}';
  css += '.yk-locked-cta{display:block;width:100%;text-align:center;padding:10px;font-size:13px}';
  /* Rating button touch size improvement */
  css += '.yk-rating-btn{min-height:28px;min-width:56px}';
  css += '@media(max-width:600px){.yk-home-summary{gap:8px}.yk-home-summary-item{min-width:70px;padding:10px 8px}.yk-home-summary-num{font-size:18px}.yk-home-header{flex-direction:column;align-items:flex-start;gap:8px}.yk-home-change-role{align-self:flex-start}.yk-home-ai-teaser{flex-direction:column;text-align:center;gap:10px}.yk-home-ai-teaser-badge{align-self:center}.yk-rating-btn{min-height:32px;min-width:64px;font-size:11px}}';

  /* Track detail units */
  css += '.yk-track-units{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:14px;padding:16px 18px;margin-top:16px}';
  css += '.yk-track-units-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:10px}';
  css += '.yk-track-unit-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.yk-track-unit-row:last-of-type{border-bottom:none}';
  css += '.yk-track-unit-num{font-family:"DM Mono",monospace;font-size:11px;font-weight:700;color:var(--verm,#C94E28);width:20px;text-align:center;flex-shrink:0}';
  css += '.yk-track-unit-theme{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563)}';
  css += '.yk-track-unit-more{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);margin-top:8px;text-align:center}';

  /* Unit detail — AI placeholder */
  css += '.yk-unit-ai-placeholder{display:flex;align-items:center;gap:12px;padding:14px 18px;background:linear-gradient(135deg,rgba(30,45,94,.03) 0%,rgba(30,45,94,.06) 100%);border:1px solid rgba(30,45,94,.08);border-radius:12px;margin-top:16px}';
  css += '.yk-unit-ai-placeholder-icon{width:32px;height:32px;border-radius:8px;background:rgba(30,45,94,.08);display:flex;align-items:center;justify-content:center;color:var(--navy,#1E2D5E);flex-shrink:0}';
  css += '.yk-unit-ai-placeholder-text{flex:1;min-width:0}';
  css += '.yk-unit-ai-placeholder-title{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111);margin-bottom:2px}';
  css += '.yk-unit-ai-placeholder-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280)}';

  /* Unit detail signals + follow-up */
  css += '.yk-unit-signals{background:rgba(5,150,105,.03);border:1px solid rgba(5,150,105,.1);border-radius:12px;padding:14px 18px;margin-top:16px}';
  css += '.yk-unit-signals-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:#059669;margin-bottom:8px;display:flex;align-items:center;gap:6px}';
  css += '.yk-unit-signals-title svg{width:14px;height:14px}';
  css += '.yk-unit-signal-item{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;margin-bottom:4px;display:flex;align-items:flex-start;gap:8px}';
  css += '.yk-unit-signal-item::before{content:"";width:5px;height:5px;border-radius:50%;background:#059669;flex-shrink:0;margin-top:7px}';
  css += '.yk-unit-followup{background:rgba(30,45,94,.03);border:1px solid rgba(30,45,94,.08);border-radius:12px;padding:14px 18px;margin-top:10px}';
  css += '.yk-unit-followup-title{font-family:"Bricolage Grotesque",sans-serif;font-size:11px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:6px;letter-spacing:-.1px}';
  css += '.yk-unit-followup-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;font-style:italic}';

  /* Track weak signals block */
  css += '.yk-track-weak-block{background:rgba(220,38,38,.03);border:1px solid rgba(220,38,38,.08);border-radius:12px;padding:14px 18px;margin-top:12px}';
  css += '.yk-track-weak-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:#DC2626;margin-bottom:6px}';
  css += '.yk-track-weak-item{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);line-height:1.5;margin-bottom:3px;display:flex;align-items:flex-start;gap:8px}';
  css += '.yk-track-weak-item::before{content:"";width:4px;height:4px;border-radius:50%;background:#DC2626;flex-shrink:0;margin-top:6px}';
  /* Track unit content enrichment */
  css += '.yk-track-units-count{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);margin-bottom:10px;letter-spacing:.3px}';
  css += '.yk-track-unit-content{flex:1;min-width:0}';
  css += '.yk-track-unit-preview{display:block;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);margin-top:2px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  /* Unit weak signals */
  css += '.yk-unit-weak{background:rgba(220,38,38,.03);border:1px solid rgba(220,38,38,.08);border-radius:12px;padding:14px 18px;margin-top:10px}';
  css += '.yk-unit-weak-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:#DC2626;margin-bottom:6px}';
  css += '.yk-unit-weak-item{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;margin-bottom:3px;display:flex;align-items:flex-start;gap:8px}';
  css += '.yk-unit-weak-item::before{content:"";width:5px;height:5px;border-radius:50%;background:#DC2626;flex-shrink:0;margin-top:7px}';

  /* Summary screens — focus mode layout (matches practice background) */
  css += '.yk-summary-wrap{width:100%;background:var(--bg-app,#F7F6F4);padding:40px 20px 56px;min-height:calc(100vh - 56px);box-sizing:border-box;animation:igFadeIn .25s ease}';
  css += '.yk-summary-back{display:flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:none;cursor:pointer;padding:0 0 24px;transition:color .15s;max-width:720px;margin:0 auto;width:100%}';
  css += '.yk-summary-back:hover{color:var(--text-primary,#111)}';
  css += '.yk-summary-back svg{width:14px;height:14px;flex-shrink:0}';
  css += '.yk-summary-card{max-width:720px;margin:0 auto;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:40px 36px;box-shadow:0 2px 8px rgba(0,0,0,.06),0 8px 20px rgba(0,0,0,.04);text-align:center}';
  css += '.yk-summary-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px}';
  css += '.yk-summary-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-muted,#6B7280);line-height:1.6;margin-bottom:20px}';
  css += '.yk-summary-stats{display:flex;gap:24px;justify-content:center;margin-bottom:24px;padding:20px 0;border-top:1px solid var(--border-subtle,#E5E3DF);border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.yk-summary-stat{text-align:center}';
  css += '.yk-summary-stat-num{font-family:"DM Mono",monospace;font-size:28px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.yk-summary-stat-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:2px}';
  css += '.yk-prep-accordion{margin-top:16px}';
  css += '.yk-prep-toggle{display:none;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;padding:10px 16px;cursor:pointer;width:100%;text-align:left;transition:all .2s}';
  css += '.yk-prep-toggle:hover{color:var(--text-primary,#111);border-color:var(--text-muted,#6B7280)}';
  css += '.yk-prep-toggle svg{width:12px;height:12px;transition:transform .2s;vertical-align:middle;margin-left:6px}';
  css += '.yk-prep-toggle.open svg{transform:rotate(180deg)}';
  css += '.yk-prep-body{transition:max-height .3s ease,opacity .2s ease;overflow:hidden}';
  css += '@media(max-width:600px){.yk-prep-toggle{display:block}.yk-prep-body{max-height:0;opacity:0}.yk-prep-body.open{max-height:800px;opacity:1}}';
  css += '@media(max-width:600px){.yk-track-units{padding:12px 14px}.yk-track-unit-theme{font-size:11px}.ig-q-actions{flex-wrap:wrap;gap:6px}.ig-q-actions .ig-btn{font-size:11px;padding:8px 12px}.yk-unit-signals{padding:12px 14px}.yk-unit-signal-item{font-size:11px}.yk-unit-followup{padding:10px 14px}}';

  /* Landing screen (star_intro — Studio landing) */
  css += '.ig-landing{animation:igFadeIn .3s ease}';

  /* Hero — base (shared) */
  css += '.ig-landing-hero{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border-radius:24px;padding:40px 32px 36px;color:#fff;text-align:center;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-landing-hero::before{content:"";position:absolute;top:-40%;right:-20%;width:60%;height:120%;background:radial-gradient(ellipse,rgba(201,78,40,.1) 0%,transparent 70%);pointer-events:none}';
  css += '.ig-landing-hero::after{content:"";position:absolute;bottom:-30%;left:-15%;width:50%;height:100%;background:radial-gradient(ellipse,rgba(30,45,94,.3) 0%,transparent 60%);pointer-events:none}';

  /* Studio hero override — vermillion accent warmth */
  css += '.st-hero{background:linear-gradient(135deg,#C94E28 0%,#b84420 40%,#a33d1c 100%)}';
  css += '.st-hero::before{background:radial-gradient(ellipse,rgba(255,255,255,.08) 0%,transparent 70%)}';
  css += '.st-hero::after{background:radial-gradient(ellipse,rgba(30,45,94,.15) 0%,transparent 60%)}';

  /* Studio section cards */
  css += '.st-section-card{cursor:pointer;transition:all .3s ease !important}';
  css += '.st-section-card:hover{transform:translateY(-3px) !important;box-shadow:0 12px 32px rgba(0,0,0,.1) !important}';
  css += '.st-section-kicker{font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-muted,#6B7280);margin-bottom:10px}';
  css += '.st-section-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:var(--verm,#C94E28);margin-top:14px;transition:letter-spacing .2s}';
  css += '.st-section-card:hover .st-section-cta{letter-spacing:.3px}';
  css += '.st-section-badge{display:inline-block;font-family:"DM Mono",monospace;font-size:10px;font-weight:600;letter-spacing:.5px;color:var(--text-muted,#6B7280);background:var(--bg-muted,#F7F6F4);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px;margin-top:14px}';
  css += '.st-yetenek{border-left:3px solid var(--verm,#C94E28) !important}';
  css += '.st-yetenek-cta-btn{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:10px 24px;cursor:pointer;transition:background .2s;margin-top:14px}';
  css += '.st-yetenek-cta-btn:hover{background:#b84420}';
  css += '.st-passive{opacity:.6;cursor:default !important}.st-passive:hover{transform:none !important;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06) !important;opacity:.7}';
  css += '.st-coming-badge{display:inline-block;font-family:"DM Mono",monospace;font-size:9px;font-weight:600;letter-spacing:.5px;color:var(--text-muted,#6B7280);background:rgba(107,114,128,.08);border:1px solid rgba(107,114,128,.15);border-radius:20px;padding:3px 10px;margin-top:8px}';
  css += '@media(max-width:768px){.st-yetenek{background:#FFF5F2 !important}}';

  /* Studio module cards */
  css += '.st-module-area{margin-bottom:16px}';
  css += '.st-mod-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .3s ease;box-shadow:0 2px 8px rgba(0,0,0,.06);display:flex;flex-direction:column}';
  css += '.st-mod-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.1)}';
  css += '.st-mod-cover{height:140px;overflow:hidden;background:var(--bg-muted,#F7F6F4)}';
  css += '.st-mod-cover img{width:100%;height:100%;object-fit:cover}';
  css += '.st-mod-body{padding:16px 18px;flex:1;display:flex;flex-direction:column}';
  css += '.st-mod-meta{display:flex;align-items:center;gap:8px;margin-bottom:8px}';
  css += '.st-mod-type{font-family:"DM Mono",monospace;font-size:10px;font-weight:600;letter-spacing:.5px;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);padding:3px 10px;border-radius:20px}';
  css += '.st-mod-dur{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280)}';
  css += '.st-mod-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px;line-height:1.3}';
  css += '.st-mod-summary{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}';
  css += '@media(max-width:900px){.st-mod-card[style*="span 2"]{grid-column:span 1}}';
  css += '@media(max-width:600px){#st-module-area .st-mod-card{grid-column:span 1 !important}}';

  /* Progress pills + continue card + completion state */
  css += '.st-progress-pill{font-family:"DM Mono",monospace;font-size:10px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);padding:3px 10px;border-radius:20px;letter-spacing:.3px}';
  css += '.st-continue-card{display:flex;align-items:center;gap:12px;background:rgba(201,78,40,.04);border:1px solid rgba(201,78,40,.12);border-radius:14px;padding:14px 18px;margin-bottom:14px;cursor:pointer;transition:all .25s}';
  css += '.st-continue-card:hover{background:rgba(201,78,40,.08);border-color:rgba(201,78,40,.2)}';
  css += '.st-mod-done{opacity:.7;position:relative}';
  css += '.st-mod-done:hover{opacity:.85}';
  css += '.st-mod-status-done{font-family:"DM Mono",monospace;font-size:9px;font-weight:600;color:#059669;background:rgba(5,150,105,.08);padding:2px 8px;border-radius:20px;letter-spacing:.3px}';
  css += '.st-mod-status-ip{font-family:"DM Mono",monospace;font-size:9px;font-weight:600;color:#D97706;background:rgba(217,119,6,.08);padding:2px 8px;border-radius:20px;letter-spacing:.3px}';
  css += '.st-landing-stat{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);margin-top:8px}';

  /* Badge strip */
  css += '.st-badge-strip{margin-top:20px;animation:igFadeIn .3s ease}';
  css += '.st-badge-header{display:flex;align-items:center;gap:8px;margin-bottom:10px}';
  css += '.st-badge-header-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);letter-spacing:-.2px}';
  css += '.st-badge-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}';
  css += '.st-badge-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);transition:all .2s;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600}';
  css += '.st-badge-earned{box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.st-badge-locked{opacity:.4;filter:grayscale(.6)}';
  css += '.st-badge-icon{display:flex;align-items:center;flex-shrink:0}';
  css += '.st-badge-label{white-space:nowrap}';
  css += '.st-badge-recent{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:12px;padding:14px 18px;box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.st-badge-empty-hint{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);padding:8px 0 4px}';
  css += '@media(max-width:600px){.st-badge-chip{font-size:10px;padding:5px 10px}}';

  css += '.ig-landing-badge{display:inline-flex;align-items:center;gap:6px;font-family:"DM Mono",monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:16px}';
  css += '.ig-landing-badge::before,.ig-landing-badge::after{content:"";width:20px;height:1px;background:rgba(255,255,255,.2)}';
  css += '.ig-landing-title{font-family:"Bricolage Grotesque",sans-serif;font-size:32px;font-weight:800;letter-spacing:-.5px;margin-bottom:10px;line-height:1.1}';
  css += '.ig-landing-subtitle{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:rgba(255,255,255,.65);line-height:1.6;max-width:380px;margin:0 auto 28px}';
  css += '.st-onboard-spotlight{display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,rgba(201,78,40,.06) 0%,rgba(201,78,40,.02) 100%);border:1.5px solid rgba(201,78,40,.15);border-radius:16px;padding:18px 20px;margin-bottom:20px;animation:igFadeIn .4s ease}';
  css += '.st-onboard-icon{width:44px;height:44px;border-radius:12px;background:var(--verm,#C94E28);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}';
  css += '.st-onboard-text{flex:1;min-width:0}';
  css += '.st-onboard-title{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:3px}';
  css += '.st-onboard-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5}';
  css += '.st-onboard-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:10px 20px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s}';
  css += '.st-onboard-cta:hover{background:var(--verm-dark,#b84420);transform:translateY(-1px)}';
  css += '@media(max-width:600px){.st-onboard-spotlight{flex-direction:column;text-align:center;gap:12px;padding:16px}.st-onboard-cta{width:100%}}';
  css += '.ig-landing-cta{display:inline-flex;align-items:center;gap:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:15px;font-weight:700;color:var(--navy,#1E2D5E);background:#fff;border:none;border-radius:12px;padding:14px 36px;cursor:pointer;transition:all .25s;box-shadow:0 4px 16px rgba(0,0,0,.15);position:relative;z-index:1}';
  css += '.ig-landing-cta:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.2)}';
  css += '.ig-landing-cta svg{width:18px;height:18px}';

  /* Bento grid — asymmetric layout below hero */
  css += '.ig-landing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px}';
  css += '.ig-landing-grid>.ig-lcard{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:24px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:box-shadow .3s ease,transform .3s ease;animation:igSlideUp .35s ease both}';
  css += '.ig-landing-grid>.ig-lcard:nth-child(1){animation-delay:0s}';
  css += '.ig-landing-grid>.ig-lcard:nth-child(2){animation-delay:.05s}';
  css += '.ig-landing-grid>.ig-lcard:nth-child(3){animation-delay:.1s}';
  css += '.ig-landing-grid>.ig-lcard:nth-child(4){animation-delay:.15s}';
  css += '.ig-landing-grid>.ig-lcard:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-1px)}';
  css += '.ig-lcard.span-2{grid-column:span 2}';
  css += '.ig-lcard.span-3{grid-column:1/-1}';

  /* Pillar card icon */
  css += '.ig-lcard-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}';
  css += '.ig-lcard-icon svg{width:20px;height:20px}';
  css += '.ig-lcard-icon.verm{background:rgba(201,78,40,.08);color:var(--verm,#C94E28)}';
  css += '.ig-lcard-icon.navy{background:rgba(30,45,94,.08);color:var(--navy,#1E2D5E)}';
  css += '.ig-lcard-icon.green{background:rgba(45,138,86,.08);color:#2D8A56}';
  css += '.ig-lcard-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px;letter-spacing:-.2px}';
  css += '.ig-lcard-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5}';

  /* Stats proof card — navy bg */
  css += '.ig-lcard.ig-lcard-proof{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1)}';
  css += '.ig-proof-row{display:flex;align-items:center;gap:10px;margin-bottom:12px}';
  css += '.ig-proof-row:last-child{margin-bottom:0}';
  css += '.ig-proof-num{font-family:"DM Mono",monospace;font-size:20px;font-weight:700;color:#fff;min-width:36px}';
  css += '.ig-proof-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:rgba(255,255,255,.55);line-height:1.4}';
  css += '.ig-proof-num svg{width:20px;height:20px}';

  /* STAR collapsible — secondary weight */
  css += '.ig-landing-star{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:box-shadow .3s ease,transform .3s ease;animation:igSlideUp .35s ease both;animation-delay:.2s}';
  css += '.ig-landing-star-header{display:flex;align-items:center;gap:12px;padding:16px 20px;cursor:pointer;transition:background .2s}';
  css += '.ig-landing-star:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-1px)}';
  css += '.ig-landing-star-header:hover{background:rgba(201,78,40,.02)}';
  css += '.ig-landing-star-badges{display:flex;gap:3px}';
  css += '.ig-landing-star-letter{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:900;color:#fff}';
  css += '.ig-landing-star-letter.verm{background:var(--verm,#C94E28)}.ig-landing-star-letter.navy{background:var(--navy,#1E2D5E)}';
  css += '.ig-landing-star-label{flex:1;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-secondary,#4B5563)}';
  css += '.ig-landing-star-arrow{font-size:12px;color:var(--text-muted,#6B7280);transition:transform .25s}';
  css += '.ig-landing-star.open .ig-landing-star-arrow{transform:rotate(180deg)}';
  css += '.ig-landing-star-body{display:none;padding:0 20px 20px;animation:igFadeIn .2s ease}';
  css += '.ig-landing-star.open .ig-landing-star-body{display:block}';
  css += '.ig-landing-star-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.6;margin-bottom:12px}';
  css += '.ig-landing-star-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}';
  css += '.ig-landing-star-step{display:flex;align-items:flex-start;gap:10px;padding:12px;background:var(--bg-muted,#F7F6F4);border-radius:10px}';
  css += '.ig-landing-star-step-letter{flex-shrink:0;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:900;color:#fff}';
  css += '.ig-landing-star-step-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-secondary,#4B5563);line-height:1.5}';
  css += '.ig-landing-star-step-name{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-primary,#111);margin-bottom:2px}';

  /* Returning-user skip */
  css += '.ig-landing-skip{text-align:center;margin-top:16px;animation:igFadeIn .3s ease .28s both}';
  css += '.ig-landing-skip-link{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--verm,#C94E28);cursor:pointer;border:none;background:none;padding:6px 12px;transition:opacity .2s;opacity:.7}';
  css += '.ig-landing-skip-link:hover{opacity:1}';

  /* Coach feed — Koclardan Ogren section */
  css += '.ig-coach-feed{margin-top:20px;animation:igFadeIn .3s ease}';
  css += '.ig-coach-feed-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}';
  css += '.ig-coach-feed-title{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;color:var(--text-primary,#111);letter-spacing:-.2px}';
  css += '.ig-coach-feed-sub{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)}';
  css += '.ig-coach-feed-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}';
  css += '.ig-coach-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:box-shadow .3s ease,transform .3s ease;cursor:pointer;display:flex;flex-direction:column}';
  css += '.ig-coach-card-coach,.ig-coach-card-title,.ig-coach-card-excerpt,.ig-coach-card-footer{padding-left:20px;padding-right:20px}';
  css += '.ig-coach-card-coach{padding-top:16px;display:flex;align-items:center;gap:6px}';
  css += '.ig-coach-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}';
  css += '.ig-coach-card-coach{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:6px}';
  css += '.ig-coach-card-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px;letter-spacing:-.1px;line-height:1.3}';
  css += '.ig-coach-card-excerpt{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}';
  css += '.ig-coach-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;padding-bottom:16px;border-top:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.ig-coach-card-cat{font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);padding:3px 8px;border-radius:8px}';
  css += '.ig-coach-card-like{display:flex;align-items:center;gap:4px;font-family:"DM Mono",monospace;font-size:11px;color:var(--text-muted,#6B7280);background:none;border:none;cursor:pointer;padding:2px 6px;border-radius:6px;transition:all .2s}';
  css += '.ig-coach-card-like:hover{background:rgba(201,78,40,.06)}';
  css += '.ig-coach-card-like.liked{color:var(--verm,#C94E28)}';
  css += '.ig-coach-card-like svg{width:14px;height:14px}';

  /* Coach detail overlay */
  css += '.ig-coach-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:center;justify-content:center;animation:igFadeIn .2s ease}';
  css += '.ig-coach-detail{background:var(--bg-surface,#fff);border-radius:20px;max-width:640px;width:92%;max-height:85vh;overflow-y:auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;animation:igSlideUp .25s ease}';
  css += '.ig-coach-detail-close{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;color:var(--text-muted,#6B7280)}';
  css += '.ig-coach-detail-close:hover{border-color:var(--verm,#C94E28);color:var(--verm,#C94E28)}';
  css += '.ig-coach-detail-close svg{width:14px;height:14px}';
  css += '.ig-coach-detail-cat{display:inline-block;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);padding:3px 10px;border-radius:8px;margin-bottom:12px}';
  css += '.ig-coach-detail-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:800;color:var(--text-primary,#111);margin-bottom:8px;letter-spacing:-.3px;line-height:1.2}';
  css += '.ig-coach-detail-coach{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin-bottom:20px}';
  css += '.ig-coach-detail-body{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-secondary,#4B5563);line-height:1.8;white-space:pre-wrap;margin-bottom:24px}';
  css += '.ig-coach-author-block{margin-bottom:24px;padding:16px;border-radius:12px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#FAFAF9)}';
  css += '.ig-coach-author-title{font-family:"Bricolage Grotesque",sans-serif;font-size:11px;font-weight:700;color:var(--text-muted,#6B7280);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}';
  css += '.ig-coach-author-name{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.ig-coach-author-meta{font-family:"DM Mono",monospace;font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:6px}';
  css += '.ig-coach-author-bio{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.6}';
  css += '.ig-coach-detail-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}';
  css += '.ig-coach-detail-like{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;padding:8px 16px;cursor:pointer;transition:all .2s}';
  css += '.ig-coach-detail-like:hover,.ig-coach-detail-like.liked{border-color:var(--verm,#C94E28);color:var(--verm,#C94E28)}';
  css += '.ig-coach-detail-like svg{width:16px;height:16px}';
  css += '.ig-coach-detail-bridge{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:10px 20px;cursor:pointer;transition:all .2s}';
  css += '.ig-coach-detail-bridge:hover{background:#b84420;transform:translateY(-1px)}';
  css += '.ig-coach-detail-bridge svg{width:16px;height:16px}';

  /* Coach feed filters */
  css += '.ig-coach-filters{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}';
  css += '.ig-coach-filter-select{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:500;color:var(--text-primary,#111);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:8px;padding:7px 28px 7px 10px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%236B7280\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;cursor:pointer;transition:border-color .15s;max-width:180px}';
  css += '.ig-coach-filter-select:focus{outline:none;border-color:var(--navy,#1E2D5E)}';
  css += '.ig-coach-filter-search{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-primary,#111);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:8px;padding:7px 10px;flex:1;min-width:140px;max-width:240px;transition:border-color .15s}';
  css += '.ig-coach-filter-search:focus{outline:none;border-color:var(--navy,#1E2D5E)}';
  css += '.ig-coach-filter-search::placeholder{color:var(--text-muted,#6B7280);font-weight:400}';
  css += '.ig-coach-filter-reset{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:4px 8px;opacity:.7;transition:opacity .15s;display:none}';
  css += '.ig-coach-filter-reset.visible{display:inline-block}';
  css += '.ig-coach-filter-reset:hover{opacity:1}';
  css += '.ig-coach-empty{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);text-align:center;padding:32px 16px;line-height:1.6}';
  css += '.ig-coach-empty-reset{display:inline-block;margin-top:8px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:4px 8px}';

  /* Coach feed responsive */
  css += '@media(max-width:768px){.ig-coach-feed-grid{grid-template-columns:1fr}.ig-coach-detail{max-width:100%;width:96%;padding:24px 20px;border-radius:16px}.ig-coach-filters{gap:6px}.ig-coach-filter-select{max-width:none;flex:1;min-width:0}.ig-coach-filter-search{max-width:none;flex-basis:100%}}';

  /* Locked comp preview (session_complete) */
  css += '.ig-locked-preview{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0}';
  css += '.ig-locked-tag{display:inline-flex;align-items:center;gap:4px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px}';
  css += '.ig-locked-tag svg{width:10px;height:10px;opacity:.5}';

  /* Responsive */
  /* Accessibility — focus-visible for keyboard navigation */
  css += '.ig-btn:focus-visible,.ig-nav-pill:focus-visible,.yk-track-card:focus-visible,.st-section-card:focus-visible,.ig-lobby-card:focus-visible,.ig-role-card:focus-visible,.ig-q-lock-cta:focus-visible,.aif-btn:focus-visible,.ig-journal-toggle:focus-visible,.yk-rating-btn:focus-visible{outline:2px solid var(--verm,#C94E28);outline-offset:2px}';

  css += '@media(max-width:768px){';
  css += '.ig-bento{grid-template-columns:1fr}';
  css += '.ig-bento-2{grid-column:1/-1}';
  css += '.ig-star-quad-card{padding:16px}';
  css += '.ig-benefits-grid{grid-template-columns:1fr}';
  css += '.ig-q-focus{padding:24px 20px}';
  css += '.ig-q-text{font-size:15px}';
  css += '.ig-completion-stats{flex-direction:column;align-items:center}';
  css += '.ig-progress-strip{flex-wrap:wrap}';
  css += '.ig-intro-signals{grid-template-columns:1fr}';
  css += '.ig-intro-signal-full{grid-column:1/-1}';
  css += '.st-tab{padding:10px 14px;font-size:12px}';
  css += '.ig-landing-grid{grid-template-columns:1fr}';
  css += '.ig-lcard.span-2{grid-column:1/-1}';
  css += '.ig-landing-star-grid{grid-template-columns:1fr}';
  css += '.ig-landing-title{font-size:24px}';
  css += '.ig-landing-hero{padding:28px 20px 24px;border-radius:16px}';
  css += '}';

  /* ── New Studio Screen Classes (S02 — full-width redesign) ── */

  /* Lobby — full-width bento grid container */
  css += '.st-lobby{width:100%;animation:igFadeIn .25s ease}';

  /* Course Detail — full-width tab structure */
  css += '.st-course-detail{width:100%;animation:igFadeIn .25s ease}';

  /* Practice — focus mode, full width, open background */
  css += '.st-practice{width:100%;background:var(--bg-app,#F7F6F4);padding:72px 16px 88px;min-height:calc(100vh - 56px);animation:igFadeIn .25s ease;box-sizing:border-box}';

  /* Practice question card — centered, max 720px */
  css += '.st-practice-card{max-width:720px;margin:0 auto;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);animation:igFadeIn .3s ease}';

  /* Top bar — fixed top (practice mode) */
  css += '.st-top-bar{position:fixed;top:56px;left:0;right:0;z-index:80;background:var(--bg-surface,#fff);border-bottom:1px solid var(--border-subtle,#E5E3DF);padding:0 20px;height:52px;display:flex;align-items:center;gap:12px}';
  css += '.st-top-bar-back{display:flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-secondary,#4B5563);background:none;border:none;cursor:pointer;padding:0;transition:color .15s;flex-shrink:0}';
  css += '.st-top-bar-back:hover{color:var(--text-primary,#111)}';
  css += '.st-top-bar-back svg{width:16px;height:16px}';
  css += '.st-top-bar-progress{flex:1;display:flex;align-items:center;gap:10px;min-width:0}';
  css += '.st-top-bar-bar{flex:1;height:4px;background:var(--border-subtle,#E5E3DF);border-radius:2px;overflow:hidden}';
  css += '.st-top-bar-fill{height:100%;background:var(--verm,#C94E28);border-radius:2px;transition:width .4s ease}';
  css += '.st-top-bar-count{font-family:"DM Mono",monospace;font-size:11px;color:var(--text-muted,#6B7280);white-space:nowrap;flex-shrink:0}';
  css += '.st-top-bar-comp{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-muted,#6B7280);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}';
  css += '.st-top-bar-skip{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:none;cursor:pointer;padding:0;flex-shrink:0;transition:color .15s}';
  css += '.st-top-bar-skip:hover{color:var(--text-primary,#111)}';

  /* Bottom bar — fixed action bar (practice mode) */
  css += '.st-bottom-bar{position:fixed;bottom:0;left:0;right:0;z-index:80;background:var(--bg-surface,#fff);border-top:1px solid var(--border-subtle,#E5E3DF);padding:0 20px;height:68px;display:flex;align-items:center;gap:10px;justify-content:space-between}';
  css += '.st-bottom-bar-left{display:flex;gap:8px;align-items:center}';
  css += '.st-bottom-bar-right{display:flex;gap:8px;align-items:center}';
  css += '.st-bar-btn{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;border-radius:10px;padding:10px 18px;cursor:pointer;transition:all .2s;border:none}';
  css += '.st-bar-btn svg{width:16px;height:16px}';
  css += '.st-bar-btn-ghost{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF) !important;color:var(--text-secondary,#4B5563)}';
  css += '.st-bar-btn-ghost:hover{border-color:var(--text-muted,#6B7280) !important;color:var(--text-primary,#111)}';
  css += '.st-bar-btn-primary{background:var(--verm,#C94E28);color:#fff}';
  css += '.st-bar-btn-primary:hover{background:var(--verm-dark,#b84420)}';

  /* Drawer — right-side slide-in panel */
  css += '.st-drawer{position:fixed;top:108px;right:0;bottom:68px;width:360px;background:var(--bg-surface,#fff);border-left:1px solid var(--border-subtle,#E5E3DF);box-shadow:-4px 0 24px rgba(0,0,0,.08);transform:translateX(100%);transition:transform .3s ease;overflow-y:auto;padding:20px;z-index:70;box-sizing:border-box}';
  css += '.st-drawer.open{transform:translateX(0)}';
  css += '.st-drawer-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}';
  css += '.st-drawer-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111)}';
  css += '.st-drawer-close{width:28px;height:28px;border-radius:8px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted,#6B7280);transition:all .15s;flex-shrink:0}';
  css += '.st-drawer-close:hover{border-color:var(--verm,#C94E28);color:var(--verm,#C94E28)}';
  css += '.st-drawer-close svg{width:12px;height:12px}';

  /* Drawer tabs (inside drawer header) */
  css += '.st-drawer-tabs{display:flex;gap:0;flex:1;min-width:0}';
  css += '.st-drawer-tab{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:none;border-bottom:2px solid transparent;padding:8px 14px;cursor:pointer;transition:all .2s;white-space:nowrap}';
  css += '.st-drawer-tab:hover{color:var(--text-primary,#111)}';
  css += '.st-drawer-tab.active{color:var(--verm,#C94E28);border-bottom-color:var(--verm,#C94E28)}';

  /* Drawer body + sections */
  css += '.st-drawer-body{padding-top:4px}';
  css += '.st-drawer-section{margin-bottom:16px}';
  css += '.st-drawer-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px;display:flex;align-items:center;gap:6px}';
  css += '.st-drawer-section-title svg{width:14px;height:14px}';
  css += '.st-drawer-section-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:10px}';
  css += '.st-drawer-empty{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);text-align:center;padding:24px 16px}';

  /* Drawer backdrop */
  css += '.st-drawer-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:65;animation:igFadeIn .2s ease}';

  /* Journal drawer (separate from hint drawer) */
  css += '.st-journal-drawer{position:fixed;top:108px;right:0;bottom:68px;width:400px;background:var(--bg-surface,#fff);border-left:1px solid var(--border-subtle,#E5E3DF);box-shadow:-4px 0 24px rgba(0,0,0,.08);transform:translateX(100%);transition:transform .3s ease;overflow-y:auto;padding:20px;z-index:72;box-sizing:border-box}';
  css += '.st-journal-drawer.open{transform:translateX(0)}';

  /* Bar button labels */
  css += '.st-bar-label{display:inline}';

  /* Practice question card overrides (focus mode — bigger text) */
  css += '.st-practice-card .st-q-num{font-family:"DM Mono",monospace;font-size:12px;font-weight:600;color:var(--text-muted,#6B7280);text-align:left;min-width:auto;margin-bottom:12px}';
  css += '.st-practice-card .st-q-theme{font-family:"DM Mono",monospace;font-size:11px;font-weight:600;color:var(--text-muted,#6B7280);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}';
  css += '.st-practice-card .st-q-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:17px;font-weight:400;color:var(--text-primary,#111);line-height:1.6}';

  /* Tab bar + tab content */
  css += '.st-tab-bar{display:flex;gap:0;border-bottom:1px solid var(--border-subtle,#E5E3DF);margin-bottom:20px;overflow-x:auto;-webkit-overflow-scrolling:touch}';
  css += '.st-tab-bar::-webkit-scrollbar{display:none}';
  css += '.st-tab{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:none;border-bottom:2px solid transparent;padding:12px 20px;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}';
  css += '.st-tab:hover{color:var(--text-primary,#111)}';
  css += '.st-tab.active{color:var(--verm,#C94E28);border-bottom-color:var(--verm,#C94E28)}';
  css += '.st-tab-content{animation:igFadeIn .2s ease}';

  /* Course card — yetkinlik kurs kartı (bento grid child) */
  css += '.st-course-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);transition:all .3s ease;animation:igSlideUp .35s ease both;display:flex;flex-direction:column;gap:10px}';
  css += '.st-course-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-2px);border-color:var(--verm,#C94E28)}';
  css += '.st-course-card.done{border-color:rgba(201,78,40,.3);background:rgba(201,78,40,.02)}';
  css += '.st-course-card.active-card{border-color:var(--verm,#C94E28);border-width:2px}';
  css += '.st-course-card.locked{opacity:.55;cursor:default}';
  css += '.st-course-card.locked:hover{transform:none;border-color:var(--border-subtle,#E5E3DF);box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.st-course-name{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);line-height:1.25}';
  css += '.st-course-kf{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);letter-spacing:.4px}';
  css += '.st-course-progress-wrap{display:flex;flex-direction:column;gap:4px}';
  css += '.st-course-progress-bar{height:4px;background:var(--border-subtle,#E5E3DF);border-radius:2px;overflow:hidden}';
  css += '.st-course-progress-fill{height:100%;background:var(--verm,#C94E28);border-radius:2px;transition:width .4s ease}';
  css += '.st-course-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px}';
  css += '.st-course-dur{display:inline-flex;align-items:center;gap:4px;font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280)}';
  css += '.st-course-dur svg{width:11px;height:11px}';
  css += '.st-course-status{font-family:"DM Mono",monospace;font-size:9px;font-weight:600;letter-spacing:.3px;padding:2px 8px;border-radius:20px}';
  css += '.st-course-status.done{color:#059669;background:rgba(5,150,105,.08)}';
  css += '.st-course-status.active{color:var(--verm,#C94E28);background:rgba(201,78,40,.08)}';
  css += '.st-course-status.locked{color:var(--text-muted,#6B7280);background:var(--bg-muted,#F7F6F4)}';

  /* Lobby course card sub-elements */
  css += '.st-course-card-name{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);line-height:1.3}';
  css += '.st-course-card-kf{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);letter-spacing:.4px;text-transform:uppercase}';
  css += '.st-course-card-progress{height:4px;background:var(--border-subtle,#E5E3DF);border-radius:2px;overflow:hidden}';
  css += '.st-course-card-progress-fill{height:100%;background:var(--verm,#C94E28);border-radius:2px;transition:width .4s ease}';
  css += '.st-course-locked:hover{transform:none !important;border-color:var(--border-subtle,#E5E3DF) !important}';

  /* Lobby bento responsive */
  css += '@media(max-width:900px){.st-lobby [style*="grid-template-columns"]{grid-template-columns:repeat(2,1fr) !important}}';
  css += '@media(max-width:600px){.st-lobby [style*="grid-template-columns"]{grid-template-columns:1fr !important}}';

  /* Dark mode overrides for new Studio classes */
  css += 'html[data-theme="dark"] .st-practice{background:var(--bg-elevated,#1F2937)}';
  css += 'html[data-theme="dark"] .st-top-bar,html[data-theme="dark"] .st-bottom-bar{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-drawer{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-tab-bar{border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-tab.active{color:var(--verm,#C94E28);border-bottom-color:var(--verm,#C94E28)}';
  css += 'html[data-theme="dark"] .st-bar-btn-ghost{background:var(--bg-elevated,#1F2937);border-color:rgba(255,255,255,.1) !important;color:var(--text-secondary,#D1D5DB)}';
  css += 'html[data-theme="dark"] .st-course-card{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.08)}';
  css += 'html[data-theme="dark"] .st-course-card.done{background:rgba(201,78,40,.05);border-color:rgba(201,78,40,.25)}';
  css += 'html[data-theme="dark"] .st-course-card-name{color:var(--text-primary,#F9FAFB)}';
  css += 'html[data-theme="dark"] .st-course-card-progress{background:rgba(255,255,255,.1)}';
  css += 'html[data-theme="dark"] .st-drawer-close{background:var(--bg-elevated,#1F2937);border-color:rgba(255,255,255,.08)}';
  css += 'html[data-theme="dark"] .st-practice-card{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.08)}';
  css += 'html[data-theme="dark"] .st-q-row{border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-note-card{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.08)}';
  css += 'html[data-theme="dark"] .st-note-feedback{border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-drawer-tab{color:var(--text-muted,#9CA3AF)}';
  css += 'html[data-theme="dark"] .st-drawer-tab.active{color:var(--verm,#C94E28);border-bottom-color:var(--verm,#C94E28)}';
  css += 'html[data-theme="dark"] .st-drawer-section-title{color:var(--text-primary,#F9FAFB)}';
  css += 'html[data-theme="dark"] .st-drawer-backdrop{background:rgba(0,0,0,.5)}';
  css += 'html[data-theme="dark"] .st-journal-drawer{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .st-practice-card .st-q-text{color:var(--text-primary,#F9FAFB)}';
  css += 'html[data-theme="dark"] .yk-summary-wrap{background:var(--bg-elevated,#1F2937)}';
  css += 'html[data-theme="dark"] .yk-summary-card{background:var(--bg-surface,#111827);border-color:rgba(255,255,255,.08)}';
  css += 'html[data-theme="dark"] .yk-summary-back{color:rgba(255,255,255,.5)}';
  css += 'html[data-theme="dark"] .yk-summary-back:hover{color:var(--text-primary,#F9FAFB)}';
  css += 'html[data-theme="dark"] .yk-summary-stats{border-color:rgba(255,255,255,.06)}';
  css += 'html[data-theme="dark"] .yk-summary-stat-num{color:var(--text-primary,#F9FAFB)}';

  /* Responsive — new Studio classes */
  css += '@media(max-width:768px){';
  css += '.st-top-bar{padding:0 12px;height:48px}';
  css += '.st-top-bar-comp{display:none}';
  css += '.st-bottom-bar{padding:0 12px;height:62px}';
  css += '.st-bar-btn{font-size:12px;padding:9px 14px}';
  css += '.st-practice{padding:68px 12px 82px}';
  css += '.st-practice-card{padding:24px 18px}';
  css += '.st-drawer{width:100%;top:auto;right:0;left:0;bottom:62px;height:65vh;border-left:none;border-top:1px solid var(--border-subtle,#E5E3DF);border-radius:20px 20px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.12);transform:translateY(100%)}';
  css += '.st-drawer.open{transform:translateY(0)}';
  css += '.st-journal-drawer{width:100%;top:auto;right:0;left:0;bottom:62px;height:70vh;border-left:none;border-top:1px solid var(--border-subtle,#E5E3DF);border-radius:20px 20px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,.12);transform:translateY(100%)}';
  css += '.st-journal-drawer.open{transform:translateY(0)}';
  css += '.st-practice-card .st-q-text{font-size:15px}';
  css += '.st-bar-label{display:none}';
  css += '.st-tab{font-size:12px;padding:10px 14px}';
  css += '.yk-summary-wrap{padding:28px 12px 40px}';
  css += '.yk-summary-card{padding:28px 20px}';
  css += '}';

  var el = document.createElement('style');
  el.id = 'ig-style';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ════════════════════════════════════════════════
   RENDER — STAR INTRO (Screen 1)
   All innerHTML from hardcoded STAR_CONTENT — no XSS.
   ════════════════════════════════════════════════ */

function renderStarDetail(idx) {
  var d = STAR_CONTENT;
  var step = idx < 4 ? d.what.steps[idx] : null;
  var tr = step ? step.tr : d.what.takeaway.tr;
  var en = step ? step.en : d.what.takeaway.en;
  var desc = step ? step.desc : d.what.takeaway.desc;
  var colors = ['var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--navy,#1E2D5E)'];
  var html = '<div class="ig-star-detail">';
  html += '<div class="ig-star-detail-title" style="color:' + colors[idx] + '">' + tr + ' <span style="font-style:italic;font-weight:400;font-size:13px;opacity:.5">(' + en + ')</span></div>';
  html += '<div class="ig-star-detail-text">' + desc + '</div>';
  html += '</div>';
  return html;
}

/* renderStarIntro — DEPRECATED: collapsed into renderLobby() */
function renderStarIntro() {
  return renderLobby();
}

/* Original renderStarIntro preserved as _renderStarIntro_legacy for reference */
function _renderStarIntro_legacy() {
  var html = '';

  html += '<div class="ig-landing">';

  /* ══ STUDIO HERO — outside grid, vermillion accent, editorial ══ */
  html += '<div class="ig-landing-hero st-hero">';
  html += '<div class="ig-landing-badge">hellotalent st\u00fcdyo</div>';
  html += '<div class="ig-landing-title">St\u00fcdyo</div>';
  html += '<div class="ig-landing-subtitle">G\u00fcnde 5 dakika ile m\u00fclakat haz\u0131rl\u0131\u011f\u0131n\u0131 tamamla. Yetkinlik geli\u015ftir, uzmanlardan \u00f6\u011fren, performans\u0131n\u0131 anlat.</div>';
  html += '</div>';

  /* ══ FIRST-TIME ONBOARDING SPOTLIGHT — only for new users ══ */
  if (!hasSeenStar()) {
    html += '<div class="st-onboard-spotlight">';
    html += '<div class="st-onboard-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>';
    html += '<div class="st-onboard-text">';
    html += '<div class="st-onboard-title">\u0130lk Ad\u0131m\u0131n</div>';
    html += '<div class="st-onboard-desc">Pozisyonunu se\u00e7, ilk yetkinli\u011fini 5 dakikada ke\u015ffet. Ger\u00e7ek m\u00fclakat sorular\u0131yla pratik yap.</div>';
    html += '</div>';
    html += '<button class="st-onboard-cta" id="st-onboard-start">Hemen Ba\u015fla \u2192</button>';
    html += '</div>';
  }

  /* ══ STUDIO SECTION GRID — 4 sections, bento asymmetric ══ */
  html += '<div class="ig-landing-grid st-grid">';

  /* ── 1. YETENEK (span 2) — primary section ── */
  html += '<div class="ig-lcard span-2 st-section-card st-yetenek" id="st-go-yetenek">';
  html += '<div class="st-section-kicker">ROL\u00dcNDE EN \u0130Y\u0130S\u0130 OL</div>';
  html += '<div class="ig-lcard-icon verm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>';
  html += '<div class="ig-lcard-title" style="font-size:18px">Yetenek</div>';
  html += '<div class="ig-lcard-desc">29 yetkinlik, 289 soru, AI de\u011ferlendirme. Rol\u00fcne \u00f6zel yetkinlikleri ke\u015ffet, pratik yap, m\u00fclakat haz\u0131rl\u0131\u011f\u0131n\u0131 tamamla.</div>';
  html += '<button class="st-yetenek-cta-btn">Yetkinliklere Ba\u015fla \u2192</button>';
  html += '</div>';

  /* ── 2. KOÇ (span 1) — coach library ── */
  html += '<div class="ig-lcard st-section-card st-koc" id="st-go-koc">';
  html += '<div class="st-section-kicker">UZMANLARDAN \u00d6\u011eREN</div>';
  html += '<div class="ig-lcard-icon navy"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>';
  html += '<div class="ig-lcard-title">Ko\u00e7</div>';
  html += '<div class="ig-lcard-desc">Sekt\u00f6r uzmanlar\u0131n\u0131n yazd\u0131\u011f\u0131 m\u00fclakat ve kariyer makaleleri.</div>';
  html += '<div class="st-section-cta">Makalelere G\u00f6z At \u2192</div>';
  html += '</div>';

  /* ── 3. PERFORMANS (span 1) — passive until full launch ── */
  html += '<div class="ig-lcard st-section-card st-perf st-passive" id="st-go-perf">';
  html += '<div class="st-section-kicker">RAKAMLARI \u00d6\u011eREN</div>';
  html += '<div class="ig-lcard-icon" style="background:rgba(217,119,6,.08);color:#D97706"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>';
  html += '<div class="ig-lcard-title">Performans</div>';
  html += '<div class="ig-lcard-desc">Ma\u011faza KPI\u2019lar\u0131, sat\u0131\u015f matemati\u011fi, LFL ve sepet analizleri.</div>';
  html += '<div class="st-coming-badge">\u00c7ok Yak\u0131nda</div>';
  html += '</div>';

  /* ── 4. HELLOTALENT'TEN BİLGİLER (span 2) — passive until full launch ── */
  html += '<div class="ig-lcard span-2 st-section-card st-bilgi st-passive" id="st-go-bilgi">';
  html += '<div class="st-section-kicker">PLATFORMUNU TANI</div>';
  html += '<div class="ig-lcard-icon" style="background:rgba(5,150,105,.08);color:#059669"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div>';
  html += '<div class="ig-lcard-title">HelloTalent\u2019ten Bilgiler</div>';
  html += '<div class="ig-lcard-desc">Profilini nas\u0131l \u00f6ne \u00e7\u0131kar\u0131rs\u0131n? \u0130\u015fverenler neye bak\u0131yor? Platform\u0131 en verimli kullanman\u0131n yollar\u0131.</div>';
  html += '<div class="st-coming-badge">\u00c7ok Yak\u0131nda</div>';
  html += '</div>';

  html += '</div>'; /* close st-grid */

  /* ══ BADGE STRIP — async-hydrated after landing mount ══ */
  html += '<div id="st-badge-strip" class="st-badge-strip" style="display:none;"></div>';

  /* ══ STUDIO MODULE CONTENT AREA — hydrated on section card click ══ */
  html += '<div id="st-module-area" class="st-module-area" style="display:none;"></div>';

  /* ══ COACH FEED — hydrated async, now clearly inside Studio ══ */
  html += '<div id="ig-coach-feed" class="ig-coach-feed" style="display:none;"></div>';

  /* ══ STAR+T quick reference — collapsible at bottom ══ */
  var d = STAR_CONTENT;
  html += '<div class="ig-landing-star" id="ig-star-collapse" style="margin-top:12px">';
  html += '<div class="ig-landing-star-header" id="ig-star-toggle" role="button" aria-expanded="false">';
  html += '<div class="ig-landing-star-badges">';
  html += '<div class="ig-landing-star-letter verm">S</div>';
  html += '<div class="ig-landing-star-letter navy">T</div>';
  html += '<div class="ig-landing-star-letter verm">A</div>';
  html += '<div class="ig-landing-star-letter navy">R</div>';
  html += '</div>';
  html += '<div class="ig-landing-star-label">STAR+T Metodolojisi</div>';
  html += '<div class="ig-landing-star-arrow">\u25BE</div>';
  html += '</div>';
  html += '<div class="ig-landing-star-body">';
  html += '<div class="ig-landing-star-desc">' + d.what.desc + '</div>';
  html += '<div class="ig-landing-star-grid">';
  var stepColors = ['verm', 'navy', 'verm', 'navy'];
  for (var i = 0; i < 4; i++) {
    var step = d.what.steps[i];
    html += '<div class="ig-landing-star-step">';
    html += '<div class="ig-landing-star-step-letter ' + stepColors[i] + '">' + step.letter + '</div>';
    html += '<div><div class="ig-landing-star-step-name">' + step.tr + '</div>';
    var firstSentence = step.desc.split(/(?<=[.!?])\s+/)[0] || step.desc;
    html += '<div class="ig-landing-star-step-text">' + firstSentence + '</div></div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="ig-landing-star-step" style="margin-top:10px">';
  html += '<div class="ig-landing-star-step-letter navy">+T</div>';
  html += '<div><div class="ig-landing-star-step-name">\u00C7\u0131kar\u0131m</div>';
  var takeFirstSentence = d.what.takeaway.desc.split(/(?<=[.!?])\s+/)[0] || d.what.takeaway.desc;
  html += '<div class="ig-landing-star-step-text">' + takeFirstSentence + '</div></div>';
  html += '</div>';
  html += '</div>'; /* close ig-landing-star-body */
  html += '</div>'; /* close ig-landing-star */

  html += '</div>'; /* close ig-landing */
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — ROLE SELECT (Screen 2)
   ════════════════════════════════════════════════ */

/* renderRoleSelect — DEPRECATED: role selection is now inline in lobby hero */
function renderRoleSelect() {
  return renderLobby();
}

/* ════════════════════════════════════════════════
   RENDER — COMPETENCY INTRO (Screen 4)
   Coaching briefing before first question.
   ════════════════════════════════════════════════ */

function truncateWhy(whyText) {
  /* Extract first 2 meaningful sentences from the long 'why' paragraph */
  if (!whyText) return '';
  var sentences = whyText.split(/(?<=[.!?])\s+/);
  var result = '';
  var count = 0;
  for (var i = 0; i < sentences.length && count < 2; i++) {
    if (sentences[i].length > 15) { /* Skip very short fragments */
      result += (result ? ' ' : '') + sentences[i];
      count++;
    }
  }
  return result || sentences[0] || '';
}

function renderCourseDetail() {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc" role="alert">Veri y\u00FCklenemedi.</div>';

  var code = S.activeComp;
  var compName = bridge.COMP_NAMES[code] || code;
  var kf = bridge.COMP_KF[code] || '';
  var anchors = bridge.ANCHORS || {};
  var a = anchors[code] || {};
  var def = a.def || '';
  var why = truncateWhy(a.why || '');

  var qs = flattenQuestions(code);
  var totalQ = qs.length;
  var practiceQ = S.isPremium ? totalQ : Math.min(FREE_Q_PER_COMP, totalQ);
  var estMin = Math.max(3, Math.round(practiceQ * 2.5));

  /* Count completed questions from evidence cache */
  var answeredCount = 0;
  if (_lobbyEvidenceCache && _lobbyEvidenceCache[code]) {
    var ev = _lobbyEvidenceCache[code];
    if (ev.practice_status === 'completed') answeredCount = practiceQ;
    else if (ev.practice_status !== 'none') answeredCount = Math.max(1, Math.round(practiceQ * 0.3));
  }
  if (S.completedComps.indexOf(code) !== -1) answeredCount = practiceQ;
  var progressPct = practiceQ > 0 ? Math.round((answeredCount / practiceQ) * 100) : 0;

  var tab = S.activeTab || 'overview';
  var html = '';

  html += '<div class="st-course-detail">';

  /* ── Back pill ── */
  html += '<div class="ig-nav-pill" id="st-cd-back">' + arrowLeftSVG + ' \u00d6\u011frenme Plan\u0131</div>';

  /* ══ COMPACT HERO — navy gradient ══ */
  html += '<div class="ig-intro-hero" style="padding:22px 24px;margin-bottom:16px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">';
  html += '<div style="flex:1;min-width:200px">';
  html += '<div class="ig-intro-comp-name" style="font-size:20px;margin-bottom:4px">' + compName + '</div>';
  if (kf) html += '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.4px">' + kf + '</div>';
  html += '</div>';
  html += '<button class="ig-btn ig-btn-answered" id="st-cd-start" style="padding:10px 22px;font-size:13px;white-space:nowrap">Prati\u011fe Ba\u015fla \u2192</button>';
  html += '</div>';
  /* Progress + duration row */
  html += '<div style="display:flex;align-items:center;gap:16px;margin-top:12px;flex-wrap:wrap">';
  html += '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:rgba(255,255,255,.6)">' + answeredCount + '/' + practiceQ + ' soru tamamland\u0131</span>';
  html += '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:rgba(255,255,255,.4)">~' + estMin + ' dk</span>';
  html += '</div>';
  html += '<div class="st-cd-progress"><div class="st-cd-progress-fill" style="width:' + progressPct + '%"></div></div>';
  html += '</div>'; /* hero */

  /* ══ TAB BAR ══ */
  html += '<div class="st-tab-bar">';
  html += '<button class="st-tab' + (tab === 'overview' ? ' active' : '') + '" data-tab="overview">Genel Bak\u0131\u015f</button>';
  html += '<button class="st-tab' + (tab === 'questions' ? ' active' : '') + '" data-tab="questions">Sorular</button>';
  html += '<button class="st-tab' + (tab === 'notes' ? ' active' : '') + '" data-tab="notes">Notlar\u0131m</button>';
  html += '</div>';

  /* ══ TAB CONTENT ══ */
  html += '<div class="st-tab-content">';

  if (tab === 'overview') {
    html += renderCourseOverviewTab(a, why, def);
  } else if (tab === 'questions') {
    html += renderCourseQuestionsTab(code, qs, practiceQ);
  } else if (tab === 'notes') {
    html += renderCourseNotesTab(code, qs);
  }

  html += '</div>'; /* tab-content */
  html += '</div>'; /* st-course-detail */
  return html;
}

/* ── Course Detail: Genel Bakış Tab ── */
function renderCourseOverviewTab(a, why, def) {
  var html = '';

  /* Definition */
  if (def) {
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:14px;color:var(--text-secondary,#4B5563);line-height:1.7;margin-bottom:16px">' + def + '</div>';
  }

  /* Why this matters — compact bento card */
  if (why) {
    html += '<div class="ig-intro-why">';
    html += '<div class="ig-intro-why-title">' + briefSVG + ' Neden \u00D6nemli?</div>';
    html += '<div class="ig-intro-why-text">' + why + '</div>';
    html += '</div>';
  }

  /* Signal cards — 2 column grid, deduplicated */
  var hasSignals = (a.skilled && a.skilled.length) || (a.lessskilled && a.lessskilled.length);
  if (hasSignals) {
    /* Build a seen-set to deduplicate signals across categories */
    var seen = {};
    html += '<div class="ig-intro-signals">';

    /* Güçlü Sinyaller */
    if (a.skilled && a.skilled.length) {
      html += '<div class="ig-intro-signal-card">';
      html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-strong" aria-label="G\u00FC\u00E7l\u00FC"></div><div class="ig-coach-label">G\u00FC\u00E7l\u00FC Sinyaller</div></div>';
      html += '<ul class="ig-coach-bullets">';
      for (var si = 0; si < a.skilled.length; si++) {
        if (!seen[a.skilled[si]]) {
          seen[a.skilled[si]] = true;
          html += '<li class="ig-coach-bullet">' + a.skilled[si] + '</li>';
        }
      }
      html += '</ul></div>';
    }

    /* Risk Sinyalleri */
    if (a.lessskilled && a.lessskilled.length) {
      html += '<div class="ig-intro-signal-card">';
      html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-risk" aria-label="Risk"></div><div class="ig-coach-label">Risk Sinyalleri</div></div>';
      html += '<ul class="ig-coach-bullets">';
      for (var ri = 0; ri < a.lessskilled.length; ri++) {
        if (!seen[a.lessskilled[ri]]) {
          seen[a.lessskilled[ri]] = true;
          html += '<li class="ig-coach-bullet">' + a.lessskilled[ri] + '</li>';
        }
      }
      html += '</ul></div>';
    }

    html += '</div>'; /* signals grid */
  }

  /* Aşırı Kullanım — full-width if present */
  if (a.overused && a.overused.length) {
    html += '<div class="ig-intro-signal-card ig-intro-signal-full" style="margin-bottom:16px;background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 18px">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-over" aria-label="A\u015F\u0131r\u0131 kullan\u0131m"></div><div class="ig-coach-label">A\u015F\u0131r\u0131 Kullan\u0131m</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var oi = 0; oi < a.overused.length; oi++) {
      html += '<li class="ig-coach-bullet">' + a.overused[oi] + '</li>';
    }
    html += '</ul></div>';
  }

  /* STAR+T mini reference card — navy, compact */
  html += '<div style="background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px 20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.08)">';
  html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:13px;font-weight:700;color:#fff;margin-bottom:8px;display:flex;align-items:center;gap:8px">' + starSVG + ' STAR+T Yan\u0131t Yap\u0131s\u0131</div>';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:11px;color:rgba(255,255,255,.65);line-height:1.6;margin-bottom:10px">Durum (S) \u2192 G\u00f6rev (T) \u2192 Aksiyon (A) \u2192 Sonu\u00e7 (R) \u2192 \u00c7\u0131kar\u0131m (+T)</div>';
  html += '<div style="display:flex;gap:5px">';
  var _starC = ['var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--navy,#1E2D5E)'];
  var _starL = ['S', 'T', 'A', 'R', '+T'];
  for (var sl = 0; sl < 5; sl++) {
    html += '<div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:\'Bricolage Grotesque\',sans-serif;font-size:13px;font-weight:900;color:#fff;background:' + _starC[sl] + '">' + _starL[sl] + '</div>';
  }
  html += '</div></div>';

  /* Mülakatçılar Nelere Dikkat Eder — compact list */
  if (a.lessskilled && a.lessskilled.length) {
    html += '<div style="background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,.04)">';
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:13px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px">M\u00fclakat\u00e7\u0131lar Nelere Dikkat Eder</div>';
    html += '<ul style="margin:0;padding-left:16px;list-style:none">';
    for (var wi = 0; wi < a.lessskilled.length; wi++) {
      html += '<li style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;padding:2px 0;display:flex;align-items:flex-start;gap:6px"><span style="color:var(--verm,#C94E28);font-weight:700;flex-shrink:0">\u2022</span>' + a.lessskilled[wi] + '</li>';
    }
    html += '</ul></div>';
  }

  return html;
}

/* ── Course Detail: Sorular Tab ── */
function renderCourseQuestionsTab(code, qs, practiceQ) {
  var html = '';
  var lastTheme = '';

  html += '<div style="background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,.04)">';

  for (var qi = 0; qi < qs.length; qi++) {
    var q = qs[qi];
    var isLocked = !S.isPremium && qi >= FREE_Q_PER_COMP;
    var isDone = S.completedComps.indexOf(code) !== -1;

    /* Status icon */
    var statusIcon;
    if (isLocked) {
      statusIcon = '<span style="color:var(--text-muted,#6B7280);font-size:12px">\uD83D\uDD12</span>';
    } else if (isDone) {
      statusIcon = '<span style="color:#059669;font-size:14px">\u2713</span>';
    } else {
      statusIcon = '<span style="color:var(--text-muted,#6B7280);font-size:14px">\u25CB</span>';
    }

    /* Theme heading — only show when it changes */
    var showTheme = q.theme && q.theme !== lastTheme;
    if (showTheme) lastTheme = q.theme;

    html += '<div class="st-q-row"' + (isLocked ? ' style="opacity:.5"' : '') + '>';
    html += '<div class="st-q-num">' + (qi + 1) + '</div>';
    html += '<div class="st-q-body">';
    if (showTheme) {
      html += '<div class="st-q-theme">' + q.theme + '</div>';
    }
    var preview = q.text ? q.text.substring(0, 80) : '';
    html += '<div class="st-q-text">' + preview + (q.text && q.text.length > 80 ? '\u2026' : '') + '</div>';
    html += '</div>';
    html += '<div class="st-q-status">' + statusIcon + '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/* ── Course Detail: Notlarım Tab ── */
function renderCourseNotesTab(code, qs) {
  var html = '';
  var hasAnyNote = false;

  /* Collect journal entries for this competency */
  var entries = [];
  for (var qi = 0; qi < qs.length; qi++) {
    var q = qs[qi];
    var draft = loadJournalDraft(code, q.text);
    if (draft && (draft.s || draft.t || draft.a || draft.r || draft.takeaway)) {
      entries.push({ idx: qi, theme: q.theme, text: q.text, draft: draft });
    }
  }

  if (entries.length === 0) {
    html += '<div class="st-notes-empty">';
    html += '<div style="font-size:32px;margin-bottom:12px;opacity:.4">\uD83D\uDCDD</div>';
    html += 'Hen\u00fcz not yok. Pratik yapt\u0131k\u00e7a notlar\u0131n burada birikir.';
    html += '</div>';
    return html;
  }

  var starFields = [
    { key: 's', letter: 'S', label: 'Durum', color: 'var(--verm,#C94E28)' },
    { key: 't', letter: 'T', label: 'G\u00f6rev', color: 'var(--navy,#1E2D5E)' },
    { key: 'a', letter: 'A', label: 'Aksiyon', color: 'var(--verm,#C94E28)' },
    { key: 'r', letter: 'R', label: 'Sonu\u00e7', color: 'var(--navy,#1E2D5E)' },
    { key: 'takeaway', letter: '+T', label: '\u00c7\u0131kar\u0131m', color: 'var(--navy,#1E2D5E)' }
  ];

  for (var ei = 0; ei < entries.length; ei++) {
    var e = entries[ei];
    html += '<div class="st-note-card">';
    html += '<div class="st-note-q">Soru ' + (e.idx + 1) + ': ' + e.text.substring(0, 60) + (e.text.length > 60 ? '\u2026' : '') + '</div>';
    html += '<div class="st-note-fields">';
    for (var fi = 0; fi < starFields.length; fi++) {
      var f = starFields[fi];
      var val = e.draft[f.key] || '';
      if (val) {
        html += '<div class="st-note-badge" style="background:' + f.color + '">' + f.letter + '</div>';
        html += '<div>' + escapeHtml(val) + '</div>';
      }
    }
    html += '</div>';
    html += '</div>';
  }

  /* AI feedback entries — loaded async, placeholder */
  html += '<div id="st-notes-feedback-slot"></div>';

  return html;
}

/* ════════════════════════════════════════════════
   RENDER — LOBBY (Learning Path — Bento Grid)
   ════════════════════════════════════════════════ */

function renderLobby() {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc">Veri y\u00fcklenemedi.</div>';

  var hasRole = !!S.role;
  var comps = S.comps;
  var freeLimit = S.isPremium ? comps.length : FREE_COMP_LIMIT;
  var completedCount = S.completedComps.length;
  var accessibleCount = hasRole ? Math.min(freeLimit, comps.length) : 0;
  var lockedCount = hasRole ? Math.max(0, comps.length - freeLimit) : 0;
  var anchors = bridge.ANCHORS || {};
  var html = '';

  html += '<div class="st-lobby">';

  /* ══ HERO CARD — vermillion, outside grid ══ */
  html += '<div class="g-hero">';
  html += '<div class="g-hero-inner">';

  /* Personalized greeting */
  var _userName = '';
  try {
    var _dbProfile = (typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) ? _loadedDBData.profile : null;
    if (_dbProfile && _dbProfile.full_name) {
      _userName = _dbProfile.full_name.split(' ')[0];
    }
  } catch (e) { /* silent */ }

  if (hasRole) {
    /* ── Returning user: role + progress hero ── */
    if (_userName) {
      html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;color:rgba(255,255,255,.7);margin-bottom:4px">Ho\u015f geldin, ' + _userName + '</div>';
    }
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:20px;font-weight:800;color:#fff">' + S.role + '</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;color:rgba(255,255,255,.7);margin-top:4px">' + accessibleCount + ' yetkinlik' + (lockedCount > 0 ? ' \u00b7 ' + lockedCount + ' kilitli' : '') + '</div>';

    /* Progress bar */
    var pct = accessibleCount > 0 ? Math.round((completedCount / accessibleCount) * 100) : 0;
    html += '<div style="margin-top:12px;background:rgba(255,255,255,.15);border-radius:6px;height:8px;overflow:hidden">';
    html += '<div style="height:100%;border-radius:6px;background:#fff;width:' + pct + '%;transition:width .4s ease"></div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">';
    html += '<span style="font-family:\'DM Mono\',monospace;font-size:11px;color:rgba(255,255,255,.6)">' + completedCount + '/' + accessibleCount + ' tamamland\u0131</span>';

    /* Streak pill slot */
    html += '<span id="yk-streak-slot" style="display:none"></span>';
    html += '</div>';

    /* Rol Değiştir link */
    html += '<div style="margin-top:10px"><button id="ig-back-role-change" style="background:none;border:none;color:rgba(255,255,255,.7);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;cursor:pointer;padding:0;text-decoration:underline">Rol De\u011fi\u015ftir</button></div>';

  } else {
    /* ── First-time user: inline role picker in hero ── */
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:4px">St\u00fcdyo</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;color:rgba(255,255,255,.75);margin-bottom:16px">Hedef pozisyonunu se\u00e7 ve yetkinlik e\u011fitim plan\u0131n\u0131 ke\u015ffet.</div>';

    var roleKeys = Object.keys(bridge.ROLE_COMP_MAP).sort(function(a,b){ return a.localeCompare(b,'tr'); });
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">';
    html += '<select id="ig-role-dd" style="flex:1;min-width:160px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;outline:none">';
    html += '<option value="" style="color:#333">Pozisyon se\u00e7in\u2026</option>';
    for (var ri = 0; ri < roleKeys.length; ri++) {
      html += '<option value="' + roleKeys[ri] + '" style="color:#333">' + roleKeys[ri] + '</option>';
    }
    html += '</select>';
    html += '<button id="ig-role-start" style="padding:10px 20px;border-radius:10px;border:none;background:#fff;color:var(--verm,#C94E28);font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">Ba\u015fla \u2192</button>';
    html += '</div>';
  }

  html += '</div>'; /* g-hero-inner */
  html += '</div>'; /* g-hero */

  /* ══ BENTO GRID — competency course cards + STAR+T ref ══ */
  if (hasRole) {

    /* Build sorted card list: in-progress → not started → completed → locked */
    var sortedComps = [];
    for (var ai = 0; ai < comps.length; ai++) {
      var _code = comps[ai];
      var _isLocked = ai >= freeLimit;
      var _isDone = S.completedComps.indexOf(_code) !== -1;
      var _isActive = S.activeComp === _code && !_isDone;
      var sortKey = _isLocked ? 3 : (_isDone ? 2 : (_isActive ? 0 : 1));
      sortedComps.push({ code: _code, origIdx: ai, locked: _isLocked, done: _isDone, active: _isActive, sort: sortKey });
    }
    sortedComps.sort(function(a, b) { return a.sort - b.sort; });

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">';

    for (var ci = 0; ci < sortedComps.length; ci++) {
      var c = sortedComps[ci];
      var name = bridge.COMP_NAMES[c.code] || c.code;
      var kf = bridge.COMP_KF[c.code] || '';
      var qCount = flattenQuestions(c.code).length;
      var practiceCount = S.isPremium ? qCount : Math.min(FREE_Q_PER_COMP, qCount);
      var estMin = Math.max(3, Math.round(practiceCount * 2.5));

      /* Status */
      var statusDot, statusText, cardOpacity;
      if (c.locked) {
        statusDot = '<span style="display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:middle">' + lockSVG + '</span>';
        statusText = 'Premium';
        cardOpacity = 'opacity:.55;';
      } else if (c.done) {
        statusDot = '<span style="color:#059669;margin-right:4px;font-size:13px">\u2713</span>';
        statusText = 'Tamamland\u0131';
        cardOpacity = 'opacity:.75;';
      } else if (c.active) {
        statusDot = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--verm,#C94E28);margin-right:6px;vertical-align:middle"></span>';
        statusText = 'Devam Et';
        cardOpacity = '';
      } else {
        statusDot = '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--text-muted,#6B7280);margin-right:6px;vertical-align:middle"></span>';
        statusText = 'Ba\u015fla';
        cardOpacity = '';
      }

      html += '<div class="st-course-card' + (c.locked ? ' st-course-locked' : '') + '" data-comp="' + c.code + '" data-idx="' + c.origIdx + '" style="' + cardOpacity + 'cursor:' + (c.locked ? 'default' : 'pointer') + '">';

      /* Card content */
      html += '<div class="st-course-card-name">' + name + '</div>';
      html += '<div class="st-course-card-kf">' + kf + '</div>';

      /* Mini progress bar (only for unlocked) */
      if (!c.locked) {
        var answered = 0;
        if (_lobbyEvidenceCache && _lobbyEvidenceCache[c.code]) {
          var ev = _lobbyEvidenceCache[c.code];
          if (ev.practice_status === 'completed') answered = practiceCount;
          else if (ev.practice_status !== 'none') answered = Math.max(1, Math.round(practiceCount * 0.3));
        }
        if (c.done) answered = practiceCount;
        var miniPct = practiceCount > 0 ? Math.round((answered / practiceCount) * 100) : 0;
        html += '<div class="st-course-card-progress"><div class="st-course-card-progress-fill" style="width:' + miniPct + '%"></div></div>';
      }

      /* Duration badge + status */
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">';
      html += '<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:11px;color:var(--text-muted,#6B7280)">~' + estMin + ' dk</span>';
      html += '<span style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:11px;display:flex;align-items:center">' + statusDot + statusText + '</span>';
      html += '</div>';

      /* Evidence slot — hydrated async */
      if (!c.locked) {
        html += '<div class="yk-evidence" data-ev-comp="' + c.code + '"></div>';
      }

      html += '</div>'; /* st-course-card */
    }

    /* ── STAR+T Reference Card (navy, span-1) ── */
    html += '<div id="st-star-ref" style="grid-column:span 1;background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:18px 20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)">';
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:14px;font-weight:700;color:#fff;margin-bottom:6px">STAR+T Metodolojisi</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:rgba(255,255,255,.6)">T\u0131kla ve \u00f6\u011fren \u25BE</div>';
    html += '<div id="st-star-ref-body" style="display:none;margin-top:12px">';
    var d = STAR_CONTENT;
    var stColors = ['#C94E28', '#1E2D5E', '#C94E28', '#1E2D5E'];
    for (var si = 0; si < 4; si++) {
      var step = d.what.steps[si];
      html += '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">';
      html += '<div style="min-width:24px;height:24px;border-radius:6px;background:' + stColors[si] + ';color:#fff;font-family:\'DM Mono\',monospace;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">' + step.letter + '</div>';
      html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:rgba(255,255,255,.8)"><strong>' + step.tr + ':</strong> ' + step.desc.split('.')[0] + '.</div>';
      html += '</div>';
    }
    html += '<div style="display:flex;gap:8px;align-items:flex-start">';
    html += '<div style="min-width:24px;height:24px;border-radius:6px;background:#1E2D5E;border:1px solid rgba(255,255,255,.2);color:#fff;font-family:\'DM Mono\',monospace;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center">+T</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:rgba(255,255,255,.8)"><strong>\u00c7\u0131kar\u0131m:</strong> ' + d.what.takeaway.desc.split('.')[0] + '.</div>';
    html += '</div>';
    html += '</div>'; /* st-star-ref-body */
    html += '</div>'; /* st-star-ref */

    html += '</div>'; /* bento grid */

    /* ── Locked competencies premium CTA ── */
    if (lockedCount > 0) {
      html += '<div style="margin-top:16px;padding:16px 20px;border-radius:16px;border:1px solid var(--border-subtle,#E5E3DF);background:var(--bg-surface,#fff);box-shadow:0 2px 8px rgba(0,0,0,.08)">';
      html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111)">' + lockedCount + ' yetkinlik daha ke\u015ffet</div>';
      html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin:6px 0 10px">Premium ile t\u00fcm yetkinliklere eri\u015f, s\u0131n\u0131rs\u0131z pratik yap.</div>';
      html += '<button class="ig-q-lock-cta yk-locked-cta" style="font-size:12px;padding:8px 20px">Premium ile A\u00e7</button>';
      html += '</div>';
    }
  }

  /* ══ BADGE STRIP — async-hydrated ══ */
  html += '<div id="st-badge-strip" class="st-badge-strip" style="display:none;margin-top:20px"></div>';

  /* ══ COACH FEED — async-hydrated ══ */
  html += '<div id="ig-coach-feed" class="ig-coach-feed" style="display:none"></div>';

  html += '</div>'; /* st-lobby */
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — PRACTICE (Screen 4) — Focus Mode
   LinkedIn Learning-style immersive practice.
   Top bar (sticky) + centered question card + bottom action bar + drawer.
   ════════════════════════════════════════════════ */

function renderPractice() {
  var bridge = getBridge();
  if (!bridge || !S.dealt.length) return '<div class="ig-section-desc" role="alert">Soru bulunamad\u0131. \u00D6\u011Frenme Plan\u0131na d\u00F6n\u00FCn.</div>';

  var compName = bridge.COMP_NAMES[S.activeComp] || S.activeComp;
  var q = S.dealt[S.currentQ];
  var maxSwaps = S.isPremium ? 999 : FREE_SWAP_LIMIT;
  var swapsLeft = Math.max(0, maxSwaps - S.swapsUsed);
  var progressPct = S.dealt.length > 0 ? Math.round(((S.currentQ) / S.dealt.length) * 100) : 0;

  var html = '';

  /* ── TOP BAR (fixed, sticky) ── */
  html += '<div class="st-top-bar" id="st-practice-top">';
  html += '<button class="st-top-bar-back" id="ig-back-lobby">' + arrowLeftSVG + ' <span>Geri</span></button>';
  html += '<div class="st-top-bar-progress">';
  html += '<div class="st-top-bar-bar"><div class="st-top-bar-fill" style="width:' + progressPct + '%"></div></div>';
  html += '<div class="st-top-bar-count">' + (S.currentQ + 1) + '/' + S.dealt.length + '</div>';
  html += '</div>';
  html += '<div class="st-top-bar-comp">' + compName + '</div>';
  if (swapsLeft > 0) {
    html += '<button class="st-top-bar-skip" id="ig-swap">' + swapSVG + ' Atla</button>';
  }
  html += '</div>'; /* top bar */

  /* ── MAIN AREA (open background) ── */
  html += '<div class="st-practice">';

  /* Question card — centered, max 720px */
  html += '<div class="st-practice-card">';
  html += '<div class="st-q-num">Soru ' + (S.currentQ + 1) + '/' + S.dealt.length + '</div>';
  html += '<div class="st-q-theme">' + q.theme + '</div>';
  html += '<div class="st-q-text">\u201C' + q.text + '\u201D</div>';

  /* Swap exhaustion premium nudge */
  if (!S.isPremium && swapsLeft === 0) {
    html += '<div class="ig-swap-nudge">';
    html += '<div class="ig-swap-nudge-text">\u00dccretsiz soru de\u011fi\u015ftirme limitine ula\u015ft\u0131n. <strong>Premium</strong> ile s\u0131n\u0131rs\u0131z ke\u015ffet.</div>';
    html += '<button class="ig-swap-nudge-cta ig-q-lock-cta" style="font-size:11px;padding:5px 16px;margin-top:8px">Premium\u2019a Ge\u00E7</button>';
    html += '</div>';
  }

  html += '</div>'; /* practice-card */

  html += '</div>'; /* st-practice */

  /* ── BOTTOM ACTION BAR (fixed) ── */
  html += '<div class="st-bottom-bar" id="st-practice-bottom">';
  html += '<div class="st-bottom-bar-left">';
  html += '<button class="st-bar-btn st-bar-btn-ghost" id="st-drawer-star" title="\u0130pucu">' + starSVG + ' <span class="st-bar-label">\u0130pucu</span></button>';
  html += '<button class="st-bar-btn st-bar-btn-ghost" id="st-drawer-journal" title="Notlar\u0131m">' + journalSVG + ' <span class="st-bar-label">Notlar\u0131m</span></button>';
  html += '</div>';
  html += '<div class="st-bottom-bar-right">';
  html += '<button class="st-bar-btn st-bar-btn-primary" id="ig-answered">' + checkSVG + ' Sonraki \u2192</button>';
  html += '</div>';
  html += '</div>'; /* bottom bar */

  /* ── DRAWER (right side / bottom sheet mobile) ── */
  html += '<div class="st-drawer' + (S.drawerOpen ? ' open' : '') + '" id="st-drawer">';
  html += '<div class="st-drawer-header">';
  html += '<div class="st-drawer-tabs">';
  html += '<button class="st-drawer-tab' + (S.drawerTab === 'star' ? ' active' : '') + '" data-drawer-tab="star">STAR+T</button>';
  html += '<button class="st-drawer-tab' + (S.drawerTab === 'signals' ? ' active' : '') + '" data-drawer-tab="signals">Sinyaller</button>';
  html += '<button class="st-drawer-tab' + (S.drawerTab === 'notes' ? ' active' : '') + '" data-drawer-tab="notes">Ko\u00e7 Notlar\u0131</button>';
  html += '</div>';
  html += '<button class="st-drawer-close" id="st-drawer-close">' + closeSVG + '</button>';
  html += '</div>';

  /* Drawer tab content */
  html += '<div class="st-drawer-body">';
  if (S.drawerTab === 'star') {
    html += renderDrawerStarTab();
  } else if (S.drawerTab === 'signals') {
    html += renderDrawerSignalsTab();
  } else if (S.drawerTab === 'notes') {
    html += renderDrawerNotesTab();
  }
  html += '</div>'; /* drawer-body */
  html += '</div>'; /* drawer */

  /* ── DRAWER BACKDROP (mobile) ── */
  if (S.drawerOpen) {
    html += '<div class="st-drawer-backdrop" id="st-drawer-backdrop"></div>';
  }

  /* ── JOURNAL PANEL — rendered inside drawer when journal tab active,
       or as separate overlay triggered from bottom bar ── */
  html += '<div class="st-journal-drawer' + (S.journalOpen ? ' open' : '') + '" id="st-journal-drawer">';
  html += '<div class="st-drawer-header">';
  html += '<div class="st-drawer-title">Cevab\u0131n\u0131 Haz\u0131rla</div>';
  html += '<button class="st-drawer-close" id="st-journal-close">' + closeSVG + '</button>';
  html += '</div>';
  html += renderJournalDrawerContent();
  html += '</div>'; /* journal drawer */

  if (S.journalOpen) {
    html += '<div class="st-drawer-backdrop st-journal-backdrop" id="st-journal-backdrop"></div>';
  }

  return html;
}

/* ── Drawer Tab: STAR+T İpuçları ── */
function renderDrawerStarTab() {
  var steps = STAR_CONTENT.what.steps;
  var colors = ['verm', 'navy', 'verm', 'navy'];
  var html = '';
  html += '<div class="st-drawer-section">';
  html += '<div class="st-drawer-section-title">Yan\u0131t Yap\u0131s\u0131: STAR+T</div>';
  html += '<div class="st-drawer-section-desc">M\u00fclakat sorusunu bu yap\u0131yla cevapla:</div>';
  for (var i = 0; i < steps.length; i++) {
    html += '<div class="ig-star-hint-step">';
    html += '<div class="ig-star-hint-letter ' + colors[i] + '">' + steps[i].letter + '</div>';
    html += '<div class="ig-star-hint-desc"><strong>' + steps[i].tr + ':</strong> ' + steps[i].desc.split('.')[0] + '.</div>';
    html += '</div>';
  }
  /* +T Takeaway */
  html += '<div class="ig-star-hint-step">';
  html += '<div class="ig-star-hint-letter navy">+T</div>';
  html += '<div class="ig-star-hint-desc"><strong>\u00c7\u0131kar\u0131m:</strong> Bu deneyimden ne \u00f6\u011frendin?</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

/* ── Drawer Tab: Sinyaller (güçlü + risk) ── */
function renderDrawerSignalsTab() {
  var bridge = getBridge();
  if (!bridge) return '';
  var anchors = bridge.ANCHORS || {};
  var a = anchors[S.activeComp];
  if (!a) return '<div class="st-drawer-empty">Bu yetkinlik i\u00e7in sinyal verisi yok.</div>';

  var html = '';

  /* Güçlü Sinyaller */
  if (a.skilled && a.skilled.length) {
    html += '<div class="st-drawer-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-strong"></div><div class="ig-coach-label">G\u00fc\u00e7l\u00fc Sinyaller</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var si = 0; si < a.skilled.length; si++) {
      html += '<li class="ig-coach-bullet">' + a.skilled[si] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Risk Sinyalleri */
  if (a.lessskilled && a.lessskilled.length) {
    html += '<div class="st-drawer-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-risk"></div><div class="ig-coach-label">Risk Sinyalleri</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var ri = 0; ri < a.lessskilled.length; ri++) {
      html += '<li class="ig-coach-bullet">' + a.lessskilled[ri] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Aşırı Kullanım */
  if (a.overused && a.overused.length) {
    html += '<div class="st-drawer-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-over"></div><div class="ig-coach-label">A\u015f\u0131r\u0131 Kullan\u0131m</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var oi = 0; oi < a.overused.length; oi++) {
      html += '<li class="ig-coach-bullet">' + a.overused[oi] + '</li>';
    }
    html += '</ul></div>';
  }

  return html;
}

/* ── Drawer Tab: Koç Notları (prep notes + follow-up) ── */
function renderDrawerNotesTab() {
  var bridge = getBridge();
  if (!bridge) return '';
  var anchors = bridge.ANCHORS || {};
  var a = anchors[S.activeComp];
  var html = '';

  /* Strong-answer signals */
  if (a && a.skilled && a.skilled.length > 0) {
    html += '<div class="st-drawer-section">';
    html += '<div class="st-drawer-section-title">' + checkSVG + ' G\u00fc\u00e7l\u00fc Yan\u0131tta Arananlar</div>';
    for (var sii = 0; sii < Math.min(3, a.skilled.length); sii++) {
      html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;padding:4px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)">' + a.skilled[sii] + '</div>';
    }
    html += '</div>';
  }

  /* Weak signals */
  if (a && a.lessskilled && a.lessskilled.length > 0) {
    html += '<div class="st-drawer-section">';
    html += '<div class="st-drawer-section-title">Yayg\u0131n Zay\u0131fl\u0131klar</div>';
    for (var wii = 0; wii < Math.min(2, a.lessskilled.length); wii++) {
      html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.6;padding:4px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)">' + a.lessskilled[wii] + '</div>';
    }
    html += '</div>';
  }

  /* Follow-up question preview */
  if (S.dealt.length > 1 && S.currentQ < S.dealt.length - 1) {
    html += '<div class="st-drawer-section">';
    html += '<div class="st-drawer-section-title">Olas\u0131 Takip Sorusu</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;color:var(--text-primary,#111);line-height:1.6;font-style:italic;padding:8px 12px;background:var(--bg-muted,#F7F6F4);border-radius:10px">';
    html += '\u201c' + S.dealt[Math.min(S.currentQ + 1, S.dealt.length - 1)].text + '\u201d';
    html += '</div></div>';
  }

  if (!html) html = '<div class="st-drawer-empty">Bu soru i\u00e7in ek not yok.</div>';
  return html;
}

/* ── Journal Drawer Content (STAR+T input + AI feedback) ── */
function renderJournalDrawerContent() {
  if (!S.activeComp || !S.dealt || !S.dealt.length) return '';
  var q = S.dealt[S.currentQ];
  if (!q) return '';

  var draft = loadJournalDraft(S.activeComp, q.text);

  var html = '<div class="st-drawer-body">';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;margin-bottom:12px">Deneyimini STAR+T yap\u0131s\u0131yla not et. Notlar\u0131n otomatik kaydedilir.</div>';

  var fields = [
    { key: 's', letter: 'S', label: 'Durum', color: 'verm', placeholder: 'Kar\u015F\u0131la\u015Ft\u0131\u011F\u0131n\u0131z durumu k\u0131saca tan\u0131mlay\u0131n...' },
    { key: 't', letter: 'T', label: 'G\u00F6rev', color: 'navy', placeholder: 'Sizden beklenen g\u00F6revi a\u00E7\u0131klay\u0131n...' },
    { key: 'a', letter: 'A', label: 'Aksiyon', color: 'verm', placeholder: 'Att\u0131\u011F\u0131n\u0131z somut ad\u0131mlar\u0131 anlat\u0131n...' },
    { key: 'r', letter: 'R', label: 'Sonu\u00E7', color: 'navy', placeholder: 'Sonucu ve etkisini payla\u015F\u0131n...' },
    { key: 'takeaway', letter: '+T', label: '\u00C7\u0131kar\u0131m', color: 'navy', placeholder: 'Bu deneyimden ne \u00F6\u011Frendiniz?' }
  ];

  for (var fi = 0; fi < fields.length; fi++) {
    var f = fields[fi];
    var val = draft ? (draft[f.key] || '') : '';
    html += '<div class="ig-journal-field">';
    html += '<div class="ig-journal-field-header">';
    html += '<div class="ig-journal-field-badge ' + f.color + '">' + f.letter + '</div>';
    html += '<div class="ig-journal-field-label">' + f.label + '</div>';
    html += '</div>';
    html += '<textarea class="ig-journal-textarea" data-field="' + f.key + '" placeholder="' + f.placeholder + '" rows="3">' + escapeHtml(val) + '</textarea>';
    html += '</div>';
  }

  html += '<div class="ig-journal-saved" id="ig-journal-saved"></div>';

  /* Self-reflection prompt */
  html += '<div class="aif-self-reflect" style="margin-top:12px">';
  html += '<label class="ig-journal-field-label" style="font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:4px;display:block">Bu cevapta en g\u00fc\u00e7l\u00fc taraf\u0131n\u0131z ne oldu?</label>';
  html += '<textarea class="ig-journal-textarea" id="aif-self-reflect-input" placeholder="K\u0131saca yaz\u0131n\u2026" rows="2" style="font-size:12px"></textarea>';
  html += '</div>';

  /* AI Feedback area */
  var compIdx = S.comps ? S.comps.indexOf(S.activeComp) : -1;
  var aiFree = S.isPremium || (compIdx >= 0 && compIdx < FREE_COMP_LIMIT);

  html += '<div class="aif-area" id="aif-area">';
  if (aiFree) {
    html += '<button class="aif-btn" id="aif-request"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> AI ile De\u011Ferlendir</button>';
  } else {
    html += '<div class="aif-gate">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';
    html += '<span>AI de\u011Ferlendirme ilk ' + FREE_COMP_LIMIT + ' yetkinlikte \u00fccretsiz. T\u00fcm yetkinlikler i\u00e7in:</span>';
    html += '<button class="aif-gate-cta" onclick="if(typeof switchPanel===\'function\')switchPanel(\'premium\')">Premium\u2019a Ge\u00E7</button>';
    html += '</div>';
  }
  html += '<div id="aif-result" style="display:none;"></div>';
  html += '</div>';

  html += '</div>'; /* drawer-body */
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — JOURNAL PANEL (Gelişim Günlüğü)
   Collapsible STAR+T draft area below the question.
   ════════════════════════════════════════════════ */

function renderJournalPanel() {
  if (!S.activeComp || !S.dealt || !S.dealt.length) return '';
  var q = S.dealt[S.currentQ];
  if (!q) return '';

  var draft = loadJournalDraft(S.activeComp, q.text);
  var hasDraft = draft && (draft.s || draft.t || draft.a || draft.r || draft.takeaway);

  var html = '<div class="ig-journal-wrap">';

  /* Toggle bar */
  html += '<button class="ig-journal-toggle' + (S.journalOpen ? ' active' : '') + '" id="ig-journal-toggle" aria-expanded="' + (S.journalOpen ? 'true' : 'false') + '">';
  html += journalSVG;
  html += '<div class="ig-journal-toggle-label">Cevab\u0131n\u0131 Haz\u0131rla' + (hasDraft && !S.journalOpen ? ' <span style="font-size:10px;font-weight:400;color:var(--text-muted,#6B7280)">(taslak var)</span>' : '') + '</div>';
  html += '<div class="ig-journal-toggle-hint">' + (S.journalOpen ? '' : 'Notlar\u0131n\u0131 al, AI ile de\u011Ferlendir') + '</div>';
  html += '<div class="ig-journal-toggle-arrow">\u25BC</div>';
  html += '</button>';

  /* Body (only if open) */
  if (S.journalOpen) {
    html += '<div class="ig-journal-body">';
    html += '<div class="ig-journal-intro">Deneyimini STAR+T yap\u0131s\u0131yla not et. Notlar\u0131n otomatik kaydedilir.</div>';

    var fields = [
      { key: 's', letter: 'S', label: 'Durum', color: 'verm', placeholder: 'Kar\u015F\u0131la\u015Ft\u0131\u011F\u0131n\u0131z durumu k\u0131saca tan\u0131mlay\u0131n...' },
      { key: 't', letter: 'T', label: 'G\u00F6rev', color: 'navy', placeholder: 'Sizden beklenen g\u00F6revi a\u00E7\u0131klay\u0131n...' },
      { key: 'a', letter: 'A', label: 'Aksiyon', color: 'verm', placeholder: 'Att\u0131\u011F\u0131n\u0131z somut ad\u0131mlar\u0131 anlat\u0131n...' },
      { key: 'r', letter: 'R', label: 'Sonu\u00E7', color: 'navy', placeholder: 'Sonucu ve etkisini payla\u015F\u0131n...' },
      { key: 'takeaway', letter: '+T', label: '\u00C7\u0131kar\u0131m', color: 'navy', placeholder: 'Bu deneyimden ne \u00F6\u011Frendiniz?' }
    ];

    for (var fi = 0; fi < fields.length; fi++) {
      var f = fields[fi];
      var val = draft ? (draft[f.key] || '') : '';
      html += '<div class="ig-journal-field">';
      html += '<div class="ig-journal-field-header">';
      html += '<div class="ig-journal-field-badge ' + f.color + '">' + f.letter + '</div>';
      html += '<div class="ig-journal-field-label">' + f.label + '</div>';
      html += '</div>';
      html += '<textarea class="ig-journal-textarea" data-field="' + f.key + '" placeholder="' + f.placeholder + '" rows="3">' + escapeHtml(val) + '</textarea>';
      html += '</div>';
    }

    html += '<div class="ig-journal-saved" id="ig-journal-saved"></div>';

    /* ── Self-reflection prompt (before AI feedback) ── */
    html += '<div class="aif-self-reflect" style="margin-top:12px">';
    html += '<label class="ig-journal-field-label" style="font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:4px;display:block">Bu cevapta en g\u00fc\u00e7l\u00fc taraf\u0131n\u0131z ne oldu?</label>';
    html += '<textarea class="ig-journal-textarea" id="aif-self-reflect-input" placeholder="K\u0131saca yaz\u0131n\u2026" rows="2" style="font-size:12px"></textarea>';
    html += '</div>';

    /* ── AI Feedback area — freemium: first FREE_COMP_LIMIT competencies free ── */
    var compIdx = S.comps ? S.comps.indexOf(S.activeComp) : -1;
    var aiFree = S.isPremium || (compIdx >= 0 && compIdx < FREE_COMP_LIMIT);

    html += '<div class="aif-area" id="aif-area">';
    if (aiFree) {
      html += '<button class="aif-btn" id="aif-request"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> AI ile De\u011Ferlendir</button>';
    } else {
      html += '<div class="aif-gate">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';
      html += '<span>AI de\u011Ferlendirme ilk ' + FREE_COMP_LIMIT + ' yetkinlikte \u00fccretsiz. T\u00fcm yetkinlikler i\u00e7in:</span>';
      html += '<button class="aif-gate-cta" onclick="if(typeof switchPanel===\'function\')switchPanel(\'premium\')">Premium\u2019a Ge\u00E7</button>';
      html += '</div>';
    }
    html += '<div id="aif-result" style="display:none;"></div>';
    html += '</div>';

    html += '</div>'; /* journal-body */
  }

  html += '</div>'; /* journal-wrap */
  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderStarHintPanel() {
  var steps = STAR_CONTENT.what.steps;
  var colors = ['verm', 'navy', 'verm', 'navy'];
  var html = '<div class="ig-star-hint-panel">';
  html += '<div class="ig-star-hint-title">Yan\u0131t Yap\u0131s\u0131: STAR+T</div>';
  for (var i = 0; i < steps.length; i++) {
    html += '<div class="ig-star-hint-step">';
    html += '<div class="ig-star-hint-letter ' + colors[i] + '">' + steps[i].letter + '</div>';
    html += '<div class="ig-star-hint-desc"><strong>' + steps[i].tr + ':</strong> ' + steps[i].desc.split('.')[0] + '.</div>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — COACH PANEL (competency signals)
   Uses ANCHORS[code].skilled / lessskilled / overused
   ════════════════════════════════════════════════ */

function renderCoachPanel() {
  var bridge = getBridge();
  if (!bridge) return '';
  var anchors = bridge.ANCHORS || {};
  var a = anchors[S.activeComp];
  if (!a) return '';

  var html = '<div class="ig-coach-panel">';
  html += '<div class="ig-coach-intro">Bu soru, yaln\u0131zca ne yapt\u0131\u011F\u0131n\u0131z\u0131 de\u011Fil \u2014 nas\u0131l d\u00FC\u015F\u00FCnd\u00FC\u011F\u00FCn\u00FCz\u00FC de \u00F6l\u00E7er.</div>';

  var COACH_PREVIEW = 2;

  /* Güçlü Sinyaller */
  if (a.skilled && a.skilled.length) {
    html += '<div class="ig-coach-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-strong" aria-label="G\u00FC\u00E7l\u00FC"></div><div class="ig-coach-label">G\u00FC\u00E7l\u00FC Sinyaller</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var si = 0; si < Math.min(COACH_PREVIEW, a.skilled.length); si++) {
      html += '<li class="ig-coach-bullet">' + a.skilled[si] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Risk Sinyalleri */
  if (a.lessskilled && a.lessskilled.length) {
    html += '<div class="ig-coach-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-risk" aria-label="Risk"></div><div class="ig-coach-label">Risk Sinyalleri</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var ri = 0; ri < Math.min(COACH_PREVIEW, a.lessskilled.length); ri++) {
      html += '<li class="ig-coach-bullet">' + a.lessskilled[ri] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Aşırı Kullanım */
  if (a.overused && a.overused.length) {
    html += '<div class="ig-coach-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-over" aria-label="A\u015F\u0131r\u0131 kullan\u0131m"></div><div class="ig-coach-label">A\u015F\u0131r\u0131 Kullan\u0131m</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var oi = 0; oi < Math.min(COACH_PREVIEW, a.overused.length); oi++) {
      html += '<li class="ig-coach-bullet">' + a.overused[oi] + '</li>';
    }
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — COMP COMPLETION (Screen 5)
   Lighter screen — no aggressive upsell here.
   ════════════════════════════════════════════════ */

function renderCompletion() {
  var bridge = getBridge();
  var compName = bridge ? (bridge.COMP_NAMES[S.activeComp] || S.activeComp) : S.activeComp;
  var freeLimit = S.isPremium ? S.comps.length : FREE_COMP_LIMIT;
  var accessibleComps = Math.min(freeLimit, S.comps.length);
  var allAccessibleDone = S.completedComps.length >= accessibleComps;
  var html = '';

  html += '<div class="yk-summary-wrap">';
  html += '<button class="yk-summary-back" id="yk-comp-back">' + arrowLeftSVG + ' \u00d6\u011frenme Plan\u0131</button>';
  html += '<div class="yk-summary-card">';

  /* Completion icon */
  html += '<div class="yk-summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>';

  html += '<div class="yk-summary-title">' + compName + ' tamamland\u0131</div>';
  html += '<div class="yk-summary-desc">' + S.answeredCount + ' soruyu inceleyerek bu yetkinli\u011fin de\u011ferlendirme \u00f6l\u00e7\u00fctlerini \u00f6\u011frendin.</div>';

  html += '<div class="yk-summary-stats">';
  html += '<div class="yk-summary-stat"><div class="yk-summary-stat-num">' + S.answeredCount + '</div><div class="yk-summary-stat-label">Soru</div></div>';
  html += '<div class="yk-summary-stat"><div class="yk-summary-stat-num">' + S.completedComps.length + '/' + Math.min(S.isPremium ? S.comps.length : FREE_COMP_LIMIT, S.comps.length) + '</div><div class="yk-summary-stat-label">Yetkinlik</div></div>';
  html += '</div>';

  /* Badge slot — hydrated async after render */
  html += '<div id="yk-completion-badge" style="display:none"></div>';

  /* Cross-link slot — hydrated async after render */
  html += '<div id="yk-completion-xlinks" style="display:none"></div>';

  html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
  if (allAccessibleDone) {
    html += '<button class="ig-btn ig-btn-answered" id="ig-session-complete" style="padding:12px 28px;font-size:14px">\u00d6\u011frenme Plan\u0131na D\u00f6n \u2192</button>';
  } else {
    html += '<button class="ig-btn ig-btn-answered" id="ig-back-lobby-comp" style="padding:12px 28px;font-size:14px">Sonraki Yetkinlik \u2192</button>';
  }
  html += '<button class="ig-btn ig-btn-swap" id="ig-restart-comp" style="border:1px solid var(--border-subtle,#E5E3DF) !important">Tekrar \u0130ncele</button>';
  html += '</div>';

  html += '</div></div>';
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — SESSION COMPLETION (Screen 6)
   Main premium upsell moment for free users.
   ════════════════════════════════════════════════ */

function renderSessionComplete() {
  var bridge = getBridge();
  var freeLimit = S.isPremium ? S.comps.length : FREE_COMP_LIMIT;
  var lockedCount = Math.max(0, S.comps.length - freeLimit);
  var html = '';

  html += '<div class="yk-summary-wrap">';
  html += '<button class="yk-summary-back" id="yk-session-back">' + arrowLeftSVG + ' \u00d6\u011frenme Plan\u0131</button>';
  html += '<div class="yk-summary-card">';
  html += '<div class="yk-summary-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
  html += '<div class="yk-summary-title">' + S.role + ' Haz\u0131rl\u0131\u011f\u0131n Tamam</div>';
  html += '<div class="yk-summary-desc">Eri\u015filebilir yetkinliklerin temel de\u011ferlendirme \u00f6l\u00e7\u00fctlerini \u00f6\u011frendin. Farkl\u0131 bir rol se\u00e7erek ba\u015fka yetkinlikleri ke\u015ffedebilirsin.</div>';

  html += '<div class="yk-summary-stats">';
  html += '<div class="yk-summary-stat"><div class="yk-summary-stat-num">' + S.completedComps.length + '</div><div class="yk-summary-stat-label">Yetkinlik</div></div>';
  html += '<div class="yk-summary-stat"><div class="yk-summary-stat-num">' + S.totalAnswered + '</div><div class="yk-summary-stat-label">Soru</div></div>';
  html += '</div>';

  /* Premium upsell if locked competencies remain */
  if (!S.isPremium && lockedCount > 0) {
    html += '<div style="margin-top:16px;padding:16px;background:rgba(201,78,40,.04);border:1px solid rgba(201,78,40,.12);border-radius:12px;text-align:left">';
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:14px;font-weight:700;margin-bottom:4px">' + lockedCount + ' yetkinlik daha seni bekliyor</div>';
    html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:10px;line-height:1.4">T\u00fcm yetkinliklere s\u0131n\u0131rs\u0131z eri\u015fim + AI ko\u00e7luk i\u00e7in:</div>';
    html += '<button class="ig-q-lock-cta" style="padding:8px 20px;font-size:12px">Premium\u2019a Ge\u00e7</button>';
    html += '</div>';
  }

  html += '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:16px">';
  html += '<button class="ig-btn ig-btn-answered" id="ig-back-lobby-session">\u00d6\u011frenme Plan\u0131 \u2192</button>';
  html += '<button class="ig-btn ig-btn-swap" id="ig-new-session" style="border:1px solid var(--border-subtle,#E5E3DF) !important">Ba\u015fka Yetkinlik Se\u00e7</button>';
  html += '</div>';

  html += '</div></div>';
  return html;
}

/* ════════════════════════════════════════════════
   COACH FEED — Koclardan Ogren
   Async hydration for star_intro landing.
   Queries coach_posts (published) + coach_post_likes (own, via RLS).
   All innerHTML from hardcoded SVG constants — no user input, no XSS risk.
   ════════════════════════════════════════════════ */

var _coachFeedLoaded = false;
var _coachFeedPosts = []; /* cached published posts for client-side filtering */
var _coachLikedSet = {};  /* candidate's liked post IDs */

var COACH_CATEGORY_LABELS = {
  mulakat_ipucu: 'M\u00FClakat \u0130pucu',
  yetkinlik_rehberi: 'Yetkinlik Rehberi',
  kariyer_gelisim_onerileri: 'Kariyer Geli\u015Fim',
  performans: 'Performans',
  kariyer_hikayesi: 'Kariyer Hikayesi',
  sektor_analizi: 'Sekt\u00F6r Analizi',
  /* backward compat for old rows that might not be migrated yet */
  kariyer_hikaye: 'Kariyer Hikayesi',
  sektor_analiz: 'Sekt\u00F6r Analizi'
};

/* Canonical category keys for filter dropdown (excludes backward-compat aliases) */
var COACH_CATEGORY_KEYS = [
  'mulakat_ipucu', 'yetkinlik_rehberi', 'kariyer_gelisim_onerileri',
  'performans', 'kariyer_hikayesi', 'sektor_analizi'
];

/* Turkish-safe lowercase for search */
function trLowerCoach(s) {
  if (!s) return '';
  return s.replace(/I/g, '\u0131').replace(/\u0130/g, 'i').toLowerCase();
}

/* ── Cross-link mappings: competency → coach category + module slug ── */
/* Coach categories: best-fit mapping from 29 competencies to 6 coach categories */
var COMP_TO_COACH_CATEGORY = {
  cf:'yetkinlik_rehberi', ce:'yetkinlik_rehberi', it:'yetkinlik_rehberi', co:'yetkinlik_rehberi',
  ao:'kariyer_gelisim_onerileri', ea:'kariyer_gelisim_onerileri', dr:'kariyer_gelisim_onerileri',
  dw:'kariyer_gelisim_onerileri', bt:'kariyer_gelisim_onerileri', dt:'kariyer_gelisim_onerileri',
  de:'kariyer_gelisim_onerileri', pa:'kariyer_gelisim_onerileri',
  fa:'performans', sm:'performans', bi:'performans',
  nl:'mulakat_ipucu', br:'mulakat_ipucu', sa:'mulakat_ipucu', cx:'mulakat_ipucu',
  is:'yetkinlik_rehberi', mc:'yetkinlik_rehberi', ci:'yetkinlik_rehberi',
  pe:'mulakat_ipucu', cu:'kariyer_gelisim_onerileri',
  ts:'sektor_analizi', dq:'kariyer_gelisim_onerileri', op:'performans',
  bs:'sektor_analizi', at:'kariyer_gelisim_onerileri'
};
/* Module slugs: competency → most relevant performans/bilgiler module */
var COMP_TO_MODULE_SLUG = {
  cf:'profil-guclu-hale-getirme', ce:'profil-guclu-hale-getirme',
  dr:'magaza-hedefleri-gunluk-operasyon', ea:'magaza-hedefleri-gunluk-operasyon',
  fa:'ciro-sepet-donusum', bi:'ciro-sepet-donusum', sm:'ciro-sepet-donusum',
  op:'kpi-dususu-yorumlama', pa:'magaza-hedefleri-gunluk-operasyon',
  dw:'vaka-trafik-yuksek-satis-dusuk', bt:'vaka-trafik-yuksek-satis-dusuk',
  ts:'studyodan-en-iyi-faydalanma'
};

/* ── Reverse mappings: content → competency (FAZ 4C) ── */
/* Built by inverting COMP_TO_MODULE_SLUG and COMP_TO_COACH_CATEGORY.
   First match wins — deterministic, no DB needed. */
var MODULE_SLUG_TO_COMP = (function() {
  var m = {};
  for (var k in COMP_TO_MODULE_SLUG) {
    if (COMP_TO_MODULE_SLUG.hasOwnProperty(k)) {
      var slug = COMP_TO_MODULE_SLUG[k];
      if (!m[slug]) m[slug] = k;
    }
  }
  return m;
})();

var COACH_CAT_TO_COMP = (function() {
  var m = {};
  for (var k in COMP_TO_COACH_CATEGORY) {
    if (COMP_TO_COACH_CATEGORY.hasOwnProperty(k)) {
      var cat = COMP_TO_COACH_CATEGORY[k];
      if (!m[cat]) m[cat] = k;
    }
  }
  return m;
})();

/* Navigate to competency practice from content detail (FAZ 4C).
   If user has active role and comp is accessible → go directly to course_detail.
   Otherwise → role_select with pendingComp hint. */
function navigateToCompPractice(compCode) {
  var bridge = getBridge();
  if (!bridge) { navigate('role_select'); return; }

  if (S.role && bridge.ROLE_COMP_MAP[S.role]) {
    var comps = bridge.ROLE_COMP_MAP[S.role];
    var idx = -1;
    for (var i = 0; i < comps.length; i++) {
      if (comps[i] === compCode) { idx = i; break; }
    }
    if (idx !== -1) {
      S.activeComp = compCode;
      S.activeCompIdx = idx;
      navigate('course_detail');
      return;
    }
  }
  /* No role or comp not in current role's list → role_select with pending hint */
  S.pendingComp = compCode;
  navigate('role_select');
}

/* Build a practice bridge CTA card for content detail screens (FAZ 4C).
   Returns DOM element or null if no mapping exists. */
function buildPracticeBridgeCTA(compCode, headingText) {
  var bridge = getBridge();
  if (!bridge) return null;
  var compName = bridge.COMP_NAMES[compCode] || null;
  if (!compName) return null;

  var wrap = document.createElement('div');
  wrap.className = 'st-detail-bridge';

  var icon = document.createElement('div');
  icon.className = 'yk-xlink-icon verm';
  /* safe — hardcoded SVG chevron, no user input */
  var chevSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevSvg.setAttribute('viewBox', '0 0 24 24');
  chevSvg.setAttribute('fill', 'none');
  chevSvg.setAttribute('stroke', 'currentColor');
  chevSvg.setAttribute('stroke-width', '2');
  chevSvg.setAttribute('stroke-linecap', 'round');
  chevSvg.setAttribute('stroke-linejoin', 'round');
  var chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  chevPath.setAttribute('d', 'M9 18l6-6-6-6');
  chevSvg.appendChild(chevPath);
  icon.appendChild(chevSvg);

  var text = document.createElement('div');
  text.style.cssText = 'flex:1;min-width:0';

  var heading = document.createElement('div');
  heading.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-primary,#111);margin-bottom:2px';
  heading.textContent = headingText;

  var sub = document.createElement('div');
  sub.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280)';
  sub.textContent = compName;

  var cta = document.createElement('div');
  cta.style.cssText = 'font-family:"DM Mono",monospace;font-size:11px;font-weight:600;color:var(--verm,#C94E28);flex-shrink:0;white-space:nowrap';
  cta.textContent = 'Prati\u011Fe ge\u00E7 \u2192';

  text.appendChild(heading);
  text.appendChild(sub);
  wrap.appendChild(icon);
  wrap.appendChild(text);
  wrap.appendChild(cta);

  wrap.addEventListener('click', function() {
    var overlay = document.getElementById('ig-coach-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    navigateToCompPractice(compCode);
  });

  return wrap;
}

/* Hardcoded SVG constants — safe for innerHTML */
var heartOutlineSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var heartFilledSVG = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>';
var closeSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
var arrowRightSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

async function hydrateCoachFeed() {
  if (_coachFeedLoaded) return;
  _coachFeedLoaded = true;

  var feedEl = document.getElementById('ig-coach-feed');
  if (!feedEl) return;

  try {
    /* Fetch bounded set of published posts (latest 24) for client-side filtering */
    var MK_SELECT_FULL = 'id, title, excerpt, category, like_count, related_role, body, cover_image_url, cover_image_alt, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';
    var MK_SELECT_SAFE = 'id, title, excerpt, category, like_count, related_role, body, coach_profiles(display_name, title, avatar_url, bio_short, sector_background, experience_years, linkedin_url)';

    var postsRes = await supabase
      .from('coach_posts')
      .select(MK_SELECT_FULL)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(24);

    /* If query fails (e.g. cover_image columns missing), retry without media fields */
    if (postsRes.error) {
      console.warn('[mulakatkocu] coach_posts query failed, retrying without cover fields:', postsRes.error.message);
      postsRes = await supabase
        .from('coach_posts')
        .select(MK_SELECT_SAFE)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(24);
    }
    if (postsRes.error) {
      console.error('[mulakatkocu] coach_posts query failed:', postsRes.error.message);
      /* Show error state instead of silently hiding feed */
      if (feedEl) {
        var errMsg = document.createElement('div');
        errMsg.style.cssText = 'text-align:center;padding:24px;color:var(--muted,#6B7280);font-size:13px;';
        errMsg.textContent = '\u0130\u00E7erikler \u015Fu an y\u00FCklenemiyor. L\u00FCtfen sayfay\u0131 yenileyin.';
        feedEl.appendChild(errMsg);
      }
      return;
    }

    var posts = (postsRes.data && postsRes.data.length) ? postsRes.data : [];
    if (posts.length === 0) return; /* No published posts — keep feed hidden */

    _coachFeedPosts = posts;

    /* Fetch candidate's own likes — RLS returns only own rows */
    var postIds = posts.map(function(p) { return p.id; });
    var likesRes = await supabase
      .from('coach_post_likes')
      .select('post_id')
      .in('post_id', postIds);

    _coachLikedSet = {};
    if (likesRes.data) {
      for (var li = 0; li < likesRes.data.length; li++) {
        _coachLikedSet[likesRes.data[li].post_id] = true;
      }
    }

    /* Build feed DOM */
    while (feedEl.firstChild) feedEl.removeChild(feedEl.firstChild);

    /* Header */
    var header = document.createElement('div');
    header.className = 'ig-coach-feed-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'ig-coach-feed-title';
    titleEl.textContent = 'Ko\u00E7 \u2014 Uzmanlardan \u00D6\u011Fren';
    header.appendChild(titleEl);
    var subEl = document.createElement('div');
    subEl.className = 'ig-coach-feed-sub';
    subEl.textContent = 'Sekt\u00F6r uzmanlar\u0131ndan m\u00FClakat ipuclar\u0131, yetkinlik rehberleri ve kariyer \u00F6nerileri';
    header.appendChild(subEl);
    feedEl.appendChild(header);

    /* ── Filter controls ── */
    var filterBar = document.createElement('div');
    filterBar.className = 'ig-coach-filters';

    /* Category dropdown */
    var catSelect = document.createElement('select');
    catSelect.className = 'ig-coach-filter-select';
    catSelect.id = 'ig-coach-f-cat';
    var catAll = document.createElement('option');
    catAll.value = '';
    catAll.textContent = 'T\u00FCm kategoriler';
    catSelect.appendChild(catAll);
    for (var ci = 0; ci < COACH_CATEGORY_KEYS.length; ci++) {
      var cKey = COACH_CATEGORY_KEYS[ci];
      var cOpt = document.createElement('option');
      cOpt.value = cKey;
      cOpt.textContent = COACH_CATEGORY_LABELS[cKey] || cKey;
      catSelect.appendChild(cOpt);
    }
    catSelect.addEventListener('change', applyCoachFilters);
    filterBar.appendChild(catSelect);

    /* Role dropdown — only include roles that actually appear in published posts */
    var roleSet = {};
    for (var ri = 0; ri < posts.length; ri++) {
      if (posts[ri].related_role) roleSet[posts[ri].related_role] = true;
    }
    var roleKeys = Object.keys(roleSet).sort(function(a, b) { return a.localeCompare(b, 'tr'); });

    if (roleKeys.length > 0) {
      var roleSelect = document.createElement('select');
      roleSelect.className = 'ig-coach-filter-select';
      roleSelect.id = 'ig-coach-f-role';
      var roleAll = document.createElement('option');
      roleAll.value = '';
      roleAll.textContent = 'T\u00FCm roller';
      roleSelect.appendChild(roleAll);
      for (var rk = 0; rk < roleKeys.length; rk++) {
        var rOpt = document.createElement('option');
        rOpt.value = roleKeys[rk];
        rOpt.textContent = roleKeys[rk];
        roleSelect.appendChild(rOpt);
      }
      roleSelect.addEventListener('change', applyCoachFilters);
      filterBar.appendChild(roleSelect);
    }

    /* Search input */
    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'ig-coach-filter-search';
    searchInput.id = 'ig-coach-f-search';
    searchInput.placeholder = 'Yaz\u0131larda ara...';
    searchInput.addEventListener('input', applyCoachFilters);
    filterBar.appendChild(searchInput);

    /* Reset button */
    var resetBtn = document.createElement('button');
    resetBtn.className = 'ig-coach-filter-reset';
    resetBtn.id = 'ig-coach-f-reset';
    resetBtn.textContent = 'Temizle';
    resetBtn.addEventListener('click', function() {
      var cs = document.getElementById('ig-coach-f-cat');
      var rs = document.getElementById('ig-coach-f-role');
      var si = document.getElementById('ig-coach-f-search');
      if (cs) cs.value = '';
      if (rs) rs.value = '';
      if (si) si.value = '';
      applyCoachFilters();
    });
    filterBar.appendChild(resetBtn);

    feedEl.appendChild(filterBar);

    /* Grid container */
    var grid = document.createElement('div');
    grid.className = 'ig-coach-feed-grid';
    grid.id = 'ig-coach-grid';
    feedEl.appendChild(grid);

    /* Initial render */
    renderCoachGrid(posts);

    feedEl.style.display = '';

  } catch (e) {
    console.error('Coach feed load error:', e);
  }
}

function applyCoachFilters() {
  var catVal = (document.getElementById('ig-coach-f-cat') || {}).value || '';
  var roleVal = (document.getElementById('ig-coach-f-role') || {}).value || '';
  var searchVal = trLowerCoach((document.getElementById('ig-coach-f-search') || {}).value || '').trim();

  /* Toggle reset button visibility */
  var resetBtn = document.getElementById('ig-coach-f-reset');
  if (resetBtn) {
    resetBtn.className = 'ig-coach-filter-reset' + ((catVal || roleVal || searchVal) ? ' visible' : '');
  }

  var filtered = [];
  for (var i = 0; i < _coachFeedPosts.length; i++) {
    var p = _coachFeedPosts[i];

    /* Category filter */
    if (catVal && p.category !== catVal) continue;

    /* Role filter */
    if (roleVal && p.related_role !== roleVal) continue;

    /* Text search — Turkish-safe lowercase match over title, excerpt, body */
    if (searchVal) {
      var haystack = trLowerCoach((p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.body || ''));
      if (haystack.indexOf(searchVal) === -1) continue;
    }

    filtered.push(p);
  }

  renderCoachGrid(filtered);
}

function renderCoachGrid(posts) {
  var grid = document.getElementById('ig-coach-grid');
  if (!grid) return;
  while (grid.firstChild) grid.removeChild(grid.firstChild);

  if (posts.length === 0) {
    /* Empty state */
    var emptyEl = document.createElement('div');
    emptyEl.className = 'ig-coach-empty';
    emptyEl.textContent = 'Bu filtrelerle e\u015Fle\u015Fen bir i\u00E7erik bulunamad\u0131.';
    var resetLink = document.createElement('button');
    resetLink.className = 'ig-coach-empty-reset';
    resetLink.textContent = 'Filtreleri temizle';
    resetLink.addEventListener('click', function() {
      var cs = document.getElementById('ig-coach-f-cat');
      var rs = document.getElementById('ig-coach-f-role');
      var si = document.getElementById('ig-coach-f-search');
      if (cs) cs.value = '';
      if (rs) rs.value = '';
      if (si) si.value = '';
      applyCoachFilters();
    });
    emptyEl.appendChild(document.createElement('br'));
    emptyEl.appendChild(resetLink);
    grid.appendChild(emptyEl);
    return;
  }

  for (var i = 0; i < posts.length; i++) {
    grid.appendChild(buildCoachCard(posts[i], !!_coachLikedSet[posts[i].id]));
  }
}

function buildCoachCard(post, isLiked) {
  var card = document.createElement('div');
  card.className = 'ig-coach-card';
  card.setAttribute('data-post-id', post.id);

  /* Compact cover (uses shared builder from profil-genel.js, same page) */
  if (typeof window._htBuildCoachCover === 'function') {
    card.appendChild(window._htBuildCoachCover(post, 'gh-cover-compact'));
  }

  var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
  var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
  var coachLabel = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');

  /* Author line with avatar */
  var coachEl = document.createElement('div');
  coachEl.className = 'ig-coach-card-coach';
  if (typeof window._htBuildCoachAvatar === 'function') {
    coachEl.appendChild(window._htBuildCoachAvatar(post.coach_profiles, 'gh-coach-avatar--sm'));
    coachEl.appendChild(document.createTextNode(' '));
  }
  var coachText = document.createElement('span');
  coachText.textContent = coachLabel;
  coachEl.appendChild(coachText);
  card.appendChild(coachEl);

  var titleEl = document.createElement('div');
  titleEl.className = 'ig-coach-card-title';
  titleEl.textContent = post.title;
  card.appendChild(titleEl);

  var excerptEl = document.createElement('div');
  excerptEl.className = 'ig-coach-card-excerpt';
  excerptEl.textContent = post.excerpt || '';
  card.appendChild(excerptEl);

  var footer = document.createElement('div');
  footer.className = 'ig-coach-card-footer';

  var catPill = document.createElement('span');
  catPill.className = 'ig-coach-card-cat';
  catPill.textContent = COACH_CATEGORY_LABELS[post.category] || post.category;
  footer.appendChild(catPill);

  var likeBtn = document.createElement('button');
  likeBtn.className = 'ig-coach-card-like' + (isLiked ? ' liked' : '');
  likeBtn.setAttribute('data-post-id', post.id);
  /* Safe: SVG is hardcoded constant, not user data */
  likeBtn.innerHTML = (isLiked ? heartFilledSVG : heartOutlineSVG) + '<span>' + (post.like_count || 0) + '</span>';
  likeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleCoachLike(post.id, likeBtn);
  });
  footer.appendChild(likeBtn);

  card.appendChild(footer);

  card.addEventListener('click', function() {
    openCoachDetail(post, isLiked);
  });

  return card;
}

async function toggleCoachLike(postId, btnEl) {
  try {
    var res = await supabase.rpc('toggle_coach_post_like', { p_post_id: postId });
    if (res.error) { console.error('Like toggle error:', res.error); return; }

    var newCount = res.data;
    var wasLiked = btnEl.classList.contains('liked');

    if (wasLiked) {
      btnEl.classList.remove('liked');
      /* Safe: SVG constant + number */
      btnEl.innerHTML = heartOutlineSVG + '<span>' + newCount + '</span>';
    } else {
      btnEl.classList.add('liked');
      btnEl.innerHTML = heartFilledSVG + '<span>' + newCount + '</span>';
    }
  } catch (e) {
    console.error('Like toggle exception:', e);
  }
}

function openCoachDetail(post, isLiked) {
  var existing = document.getElementById('ig-coach-overlay');
  if (existing) existing.parentNode.removeChild(existing);

  var overlay = document.createElement('div');
  overlay.className = 'ig-coach-overlay';
  overlay.id = 'ig-coach-overlay';

  var detail = document.createElement('div');
  detail.className = 'ig-coach-detail';

  /* Close button — safe: closeSVG is hardcoded constant */
  var closeBtn = document.createElement('button');
  closeBtn.className = 'ig-coach-detail-close';
  closeBtn.innerHTML = closeSVG;
  closeBtn.addEventListener('click', function() { overlay.parentNode.removeChild(overlay); });
  detail.appendChild(closeBtn);

  /* Hero cover (uses shared builder from profil-genel.js, same page) */
  if (typeof window._htBuildCoachCover === 'function') {
    var heroCover = window._htBuildCoachCover(post, 'gh-cover');
    heroCover.style.borderRadius = '0';
    detail.appendChild(heroCover);
  }

  var catEl = document.createElement('div');
  catEl.className = 'ig-coach-detail-cat';
  catEl.textContent = COACH_CATEGORY_LABELS[post.category] || post.category;
  detail.appendChild(catEl);

  var titleEl = document.createElement('div');
  titleEl.className = 'ig-coach-detail-title';
  titleEl.textContent = post.title;
  detail.appendChild(titleEl);

  var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
  var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
  var coachEl = document.createElement('div');
  coachEl.className = 'ig-coach-detail-coach';
  coachEl.textContent = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');
  detail.appendChild(coachEl);

  var bodyEl = document.createElement('div');
  bodyEl.className = 'ig-coach-detail-body';
  bodyEl.textContent = post.body || '';
  detail.appendChild(bodyEl);

  /* ── Yazar Hakkinda block ── */
  var cp = post.coach_profiles;
  if (cp && (cp.bio_short || cp.sector_background || cp.experience_years)) {
    var authorBlock = document.createElement('div');
    authorBlock.className = 'ig-coach-author-block';

    var authorTitle = document.createElement('div');
    authorTitle.className = 'ig-coach-author-title';
    authorTitle.textContent = 'Yazar Hakk\u0131nda';
    authorBlock.appendChild(authorTitle);

    /* Author name with avatar — clickable for coach card */
    var authorNameRow = document.createElement('div');
    authorNameRow.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer';
    if (typeof window._htBuildCoachAvatar === 'function') {
      authorNameRow.appendChild(window._htBuildCoachAvatar(cp, ''));
    }
    var authorName = document.createElement('div');
    authorName.className = 'ig-coach-author-name';
    authorName.textContent = (cp.display_name || '') + (cp.title ? ' \u00B7 ' + cp.title : '');
    authorNameRow.appendChild(authorName);
    authorNameRow.addEventListener('click', (function(cpRef) {
      return function() { if (typeof window._htShowCoachCard === 'function') window._htShowCoachCard(cpRef); };
    })(cp));
    authorBlock.appendChild(authorNameRow);

    var authorMeta = [];
    if (cp.sector_background) authorMeta.push(cp.sector_background);
    if (cp.experience_years) authorMeta.push(cp.experience_years + ' y\u0131l deneyim');
    if (authorMeta.length) {
      var metaEl = document.createElement('div');
      metaEl.className = 'ig-coach-author-meta';
      metaEl.textContent = authorMeta.join(' \u00B7 ');
      authorBlock.appendChild(metaEl);
    }

    if (cp.bio_short) {
      var bioEl2 = document.createElement('div');
      bioEl2.className = 'ig-coach-author-bio';
      bioEl2.textContent = cp.bio_short;
      authorBlock.appendChild(bioEl2);
    }

    /* LinkedIn link in author block */
    if (cp.linkedin_url) {
      var liLink = document.createElement('a');
      liLink.href = cp.linkedin_url;
      liLink.target = '_blank';
      liLink.rel = 'noopener noreferrer';
      liLink.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-top:6px;font-size:11px;font-weight:600;color:#0A66C2;text-decoration:none;';
      liLink.textContent = 'LinkedIn';
      authorBlock.appendChild(liLink);
    }
    detail.appendChild(authorBlock);
  }

  /* FAZ 4C — practice bridge: coach category → competency */
  var coachCompCode = post.category ? COACH_CAT_TO_COMP[post.category] : null;
  if (coachCompCode) {
    var coachBridgeEl = buildPracticeBridgeCTA(coachCompCode, 'Bu konuda pratik yap');
    if (coachBridgeEl) detail.appendChild(coachBridgeEl);
  }

  var actionsEl = document.createElement('div');
  actionsEl.className = 'ig-coach-detail-actions';

  /* Like button — safe: SVG constants */
  var likeBtn = document.createElement('button');
  likeBtn.className = 'ig-coach-detail-like' + (isLiked ? ' liked' : '');
  likeBtn.innerHTML = (isLiked ? heartFilledSVG : heartOutlineSVG) + '<span>' + (post.like_count || 0) + '</span>';
  likeBtn.addEventListener('click', function() {
    toggleCoachLike(post.id, likeBtn);
  });
  actionsEl.appendChild(likeBtn);

  /* Practice bridge CTA — role-based or general fallback */
  var bridge = getBridge();
  if (post.related_role && bridge && bridge.ROLE_COMP_MAP && bridge.ROLE_COMP_MAP[post.related_role]) {
    /* related_role is valid ROLE_COMP_MAP key → direct session start */
    var bridgeBtn = document.createElement('button');
    bridgeBtn.className = 'ig-coach-detail-bridge';
    bridgeBtn.textContent = 'Bu konuyu \u015Fimdi \u00E7al\u0131\u015F';
    var arrowSpan = document.createElement('span');
    arrowSpan.innerHTML = arrowRightSVG;
    bridgeBtn.appendChild(arrowSpan);
    bridgeBtn.addEventListener('click', function() {
      overlay.parentNode.removeChild(overlay);
      startSession(post.related_role);
    });
    actionsEl.appendChild(bridgeBtn);
  } else {
    /* No specific role → general coaching entry */
    var bridgeBtn2 = document.createElement('button');
    bridgeBtn2.className = 'ig-coach-detail-bridge';
    bridgeBtn2.textContent = 'Ko\u00E7lu\u011Fa Ba\u015Flay\u0131n';
    var arrowSpan2 = document.createElement('span');
    arrowSpan2.innerHTML = arrowRightSVG;
    bridgeBtn2.appendChild(arrowSpan2);
    bridgeBtn2.addEventListener('click', function() {
      overlay.parentNode.removeChild(overlay);
      navigate('role_select');
    });
    actionsEl.appendChild(bridgeBtn2);
  }

  detail.appendChild(actionsEl);
  overlay.appendChild(detail);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.parentNode.removeChild(overlay);
  });

  document.body.appendChild(overlay);
}

/* ════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════ */

function navigate(screen) {
  var container = document.getElementById('ig-container');
  if (!container) return;

  /* Legacy screens collapsed into lobby */
  if (screen === 'star_intro' || screen === 'role_select') {
    screen = 'lobby';
  }
  S.screen = screen;

  /* All innerHTML content from hardcoded constants — safe from XSS */
  if (screen === 'lobby') {
    _coachFeedLoaded = false; /* Reset so feed re-hydrates on return */
    container.innerHTML = renderLobby();
    bindLobbyEvents();
  } else if (screen === 'course_detail') {
    container.innerHTML = renderCourseDetail();
    bindCourseDetailEvents();
  } else if (screen === 'practice') {
    container.innerHTML = renderPractice();
    bindPracticeEvents();
  } else if (screen === 'completion') {
    container.innerHTML = renderCompletion();
    bindCompletionEvents();
  } else if (screen === 'session_complete') {
    container.innerHTML = renderSessionComplete();
    bindSessionCompleteEvents();
  }

  saveSession();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════════════
   EVENT BINDINGS
   ════════════════════════════════════════════════ */

/* bindStarIntroEvents — DEPRECATED: lobby events handle everything */
function bindStarIntroEvents() { bindLobbyEvents(); }

/* Original bindStarIntroEvents preserved as _bindStarIntroEvents_legacy */
function _bindStarIntroEvents_legacy() {
  var onboardBtn = document.getElementById('st-onboard-start');
  if (onboardBtn) onboardBtn.addEventListener('click', function() {
    markStarSeen();
    navigate('lobby');
  });

  var yetBtn = document.getElementById('st-go-yetenek');
  if (yetBtn) yetBtn.addEventListener('click', function() {
    markStarSeen();
    navigate('lobby');
  });

  var kocBtn = document.getElementById('st-go-koc');

  var perfBtn = document.getElementById('st-go-perf');
  if (perfBtn) perfBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    showStudioToast('Performans b\u00f6l\u00fcm\u00fc \u00e7ok yak\u0131nda a\u00e7\u0131lacak.');
  });
  var bilgiBtn = document.getElementById('st-go-bilgi');
  if (bilgiBtn) bilgiBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    showStudioToast('Bu b\u00f6l\u00fcm \u00e7ok yak\u0131nda a\u00e7\u0131lacak.');
  });

  var starToggle = document.getElementById('ig-star-toggle');
  var starCollapse = document.getElementById('ig-star-collapse');
  if (starToggle && starCollapse) {
    starToggle.addEventListener('click', function() {
      var isOpen = starCollapse.classList.toggle('open');
      starToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  hydrateCoachFeed().then(function() {
    var feed = document.getElementById('ig-coach-feed');
    var hasContent = feed && feed.style.display !== 'none';
    var kocCard = document.getElementById('st-go-koc');
    if (kocCard) {
      if (hasContent) {
        kocCard.addEventListener('click', function() {
          feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        /* No published coach content — make passive */
        kocCard.classList.add('st-passive');
        var ctaEl = kocCard.querySelector('.st-section-cta');
        if (ctaEl) { ctaEl.outerHTML = '<div class="st-coming-badge">\u00c7ok Yak\u0131nda</div>'; }
        kocCard.addEventListener('click', function(e) {
          e.stopPropagation();
          showStudioToast('Ko\u00e7 i\u00e7erikleri \u00e7ok yak\u0131nda eklenecek.');
        });
      }
    }
  }).catch(function() {});

  /* ── Landing card progress stats — async hydration ── */
  hydrateLandingStats();

  /* ── Badge strip — async hydration ── */
  hydrateBadgeStrip();
}

async function hydrateLandingStats() {
  try {
    /* Fetch module counts per section + candidate progress in parallel */
    var modRes = await supabase
      .from('studio_modules')
      .select('id, section')
      .eq('status', 'published');

    if (modRes.error || !modRes.data || modRes.data.length === 0) return;

    var sectionModules = { performans: [], bilgiler: [] };
    for (var i = 0; i < modRes.data.length; i++) {
      var s = modRes.data[i].section;
      if (sectionModules[s]) sectionModules[s].push(modRes.data[i].id);
    }

    var progress = await fetchStudioProgress();

    var sections = ['performans', 'bilgiler'];
    for (var si = 0; si < sections.length; si++) {
      var sec = sections[si];
      var mods = sectionModules[sec] || [];
      if (mods.length === 0) continue;

      var completed = 0;
      var started = 0;
      for (var mi = 0; mi < mods.length; mi++) {
        var p = progress[mods[mi]];
        if (p && p.status === 'completed') completed++;
        else if (p && p.status === 'in_progress') started++;
      }

      var el = document.getElementById('st-stat-' + sec);
      if (!el) continue;

      if (completed === mods.length) {
        el.textContent = '\u2713 T\u00fcm\u00fc tamamland\u0131';
        el.style.color = '#059669';
      } else if (completed > 0 || started > 0) {
        el.textContent = completed + '/' + mods.length + ' tamamland\u0131' + (started > 0 ? ' \u00b7 ' + started + ' devam ediyor' : '');
      } else {
        el.textContent = mods.length + ' mod\u00fcl';
      }
    }
  } catch (e) { /* silent — stats are best-effort enhancement */ }
}

/* ══ BADGE STRIP HYDRATION ══ */

/* Hardcoded SVG icon constants — safe for innerHTML (same pattern as briefSVG, coachSVG etc) */
var BADGE_ICONS = {
  rocket: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>',
  chart: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
  lightbulb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
  target: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  crown: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M3 20h18"/></svg>',
  flame: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  pen: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  medal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>',
  diamond: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></svg>',
  star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
};

var TIER_COLORS = {
  base: { bg: 'rgba(201,78,40,.06)', border: 'rgba(201,78,40,.15)', text: '#C94E28' },
  milestone: { bg: 'rgba(30,45,94,.06)', border: 'rgba(30,45,94,.15)', text: '#1E2D5E' },
  advanced: { bg: 'rgba(217,119,6,.06)', border: 'rgba(217,119,6,.2)', text: '#92400E' }
};

async function hydrateBadgeStrip() {
  var strip = document.getElementById('st-badge-strip');
  if (!strip) return;

  try {
    /* Fetch definitions + earned badges in parallel */
    var defsP = supabase
      .from('badge_definitions')
      .select('id, slug, title, description, icon_key, badge_tier, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true });

    var earnedP = supabase
      .from('candidate_badges')
      .select('badge_id, awarded_at');

    var results = await Promise.all([defsP, earnedP]);
    var defs = (results[0].error ? [] : results[0].data) || [];
    var earned = (results[1].error ? [] : results[1].data) || [];

    if (defs.length === 0) return;

    var earnedMap = {};
    for (var i = 0; i < earned.length; i++) {
      earnedMap[earned[i].badge_id] = earned[i];
    }
    var earnedCount = earned.length;

    strip.style.display = 'block';
    while (strip.firstChild) strip.removeChild(strip.firstChild);

    /* Header */
    var header = document.createElement('div');
    header.className = 'st-badge-header';
    var headerTitle = document.createElement('span');
    headerTitle.className = 'st-badge-header-title';
    headerTitle.textContent = 'Rozetlerin';
    header.appendChild(headerTitle);
    if (earnedCount > 0) {
      var headerCount = document.createElement('span');
      headerCount.className = 'st-progress-pill';
      headerCount.textContent = earnedCount + '/' + defs.length;
      header.appendChild(headerCount);
    }
    strip.appendChild(header);

    /* Badge chips row */
    var chipRow = document.createElement('div');
    chipRow.className = 'st-badge-row';

    for (var d = 0; d < defs.length; d++) {
      var def = defs[d];
      var isEarned = !!earnedMap[def.id];
      var tier = TIER_COLORS[def.badge_tier] || TIER_COLORS.base;

      var chip = document.createElement('div');
      chip.className = 'st-badge-chip' + (isEarned ? ' st-badge-earned' : ' st-badge-locked');
      chip.title = def.title + (isEarned ? '' : ' (kilitli)');

      if (isEarned) {
        chip.style.background = tier.bg;
        chip.style.borderColor = tier.border;
        chip.style.color = tier.text;
      }

      /* Hardcoded SVG icon from BADGE_ICONS constant — safe for innerHTML */
      var iconWrap = document.createElement('span');
      iconWrap.className = 'st-badge-icon';
      iconWrap.innerHTML = BADGE_ICONS[def.icon_key] || BADGE_ICONS.rocket;
      chip.appendChild(iconWrap);

      var label = document.createElement('span');
      label.className = 'st-badge-label';
      label.textContent = def.title;
      chip.appendChild(label);

      chipRow.appendChild(chip);
    }
    strip.appendChild(chipRow);

    /* Empty hint when no badges earned yet */
    if (earnedCount === 0) {
      var emptyHint = document.createElement('div');
      emptyHint.className = 'st-badge-empty-hint';
      emptyHint.textContent = 'Pratik yaparak ilk rozetini kazanabilirsin.';
      strip.appendChild(emptyHint);
    }

    /* Most recent badge highlight */
    if (earnedCount > 0) {
      var sortedEarned = earned.slice().sort(function(a, b) {
        return new Date(b.awarded_at) - new Date(a.awarded_at);
      });
      var mostRecent = sortedEarned[0];
      var recentDef = null;
      for (var rd = 0; rd < defs.length; rd++) {
        if (defs[rd].id === mostRecent.badge_id) { recentDef = defs[rd]; break; }
      }
      if (recentDef) {
        var recentCard = document.createElement('div');
        recentCard.className = 'st-badge-recent';
        var recentKicker = document.createElement('div');
        recentKicker.style.cssText = 'font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--verm,#C94E28);margin-bottom:4px;';
        recentKicker.textContent = 'SON KAZANILAN';
        recentCard.appendChild(recentKicker);
        var recentTitle = document.createElement('div');
        recentTitle.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:2px;';
        recentTitle.textContent = recentDef.title;
        recentCard.appendChild(recentTitle);
        var recentDesc = document.createElement('div');
        recentDesc.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.4;';
        recentDesc.textContent = recentDef.description;
        recentCard.appendChild(recentDesc);
        strip.appendChild(recentCard);
      }
    }
  } catch (e) { /* silent — badges are best-effort */ }
}

/* Studio toast helper — ephemeral bottom notification */
function showStudioToast(msg) {
  var existing = document.getElementById('st-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'st-toast';
  toast.textContent = msg;
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--navy,#1E2D5E);color:#fff;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;padding:12px 24px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:9999;animation:igFadeIn .25s ease;pointer-events:none';
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2500);
}

/* ══ AI FEEDBACK — request, poll, render ══ */

var _aifPollTimer = null;

var _aifRequestInFlight = false; /* duplicate click guard */

async function requestAiFeedback(compCode, qText, qHash) {
  var btn = document.getElementById('aif-request');
  var resultDiv = document.getElementById('aif-result');
  if (!btn || !resultDiv) return;
  if (_aifRequestInFlight) return; /* prevent double-click */

  /* Collect current field values */
  var fields = {};
  var tas = document.querySelectorAll('.ig-journal-textarea');
  tas.forEach(function(ta) { fields[ta.getAttribute('data-field')] = ta.value; });

  var hasContent = fields.s || fields.t || fields.a || fields.r || fields.takeaway;
  if (!hasContent) {
    showStudioToast('De\u011ferlendirme i\u00e7in en az bir STAR+T alan\u0131n\u0131 doldurun.');
    return;
  }

  /* Check for already-pending feedback first */
  try {
    var existRes = await supabase.rpc('get_journal_feedback', {
      p_competency_code: compCode,
      p_question_hash: qHash
    });
    var existFb = extractFeedback(existRes);
    if (existFb && (existFb.status === 'pending' || existFb.status === 'processing')) {
      /* Already in-flight — just poll for it */
      btn.disabled = true;
      btn.textContent = 'De\u011ferlendiriliyor\u2026';
      resultDiv.style.display = 'none';
      pollForFeedback(compCode, qHash, btn);
      return;
    }
  } catch (e) { /* proceed to create new */ }

  /* Show loading state */
  _aifRequestInFlight = true;
  btn.disabled = true;
  btn.textContent = 'De\u011ferlendiriliyor\u2026';
  resultDiv.style.display = 'none';

  try {
    /* Request feedback via RPC */
    var res = await supabase.rpc('request_journal_feedback', {
      p_competency_code: compCode,
      p_question_hash: qHash,
      p_question_text: qText,
      p_role_key: S.role || null,
      p_situation: fields.s || '',
      p_task: fields.t || '',
      p_action: fields.a || '',
      p_result: fields.r || '',
      p_takeaway: fields.takeaway || ''
    });

    if (res.error) {
      _aifRequestInFlight = false;
      btn.disabled = false;
      btn.textContent = 'AI ile De\u011Ferlendir';
      showStudioToast('De\u011ferlendirme ba\u015flat\u0131lamad\u0131. L\u00fctfen tekrar deneyin.');
      return;
    }

    /* Collect self-reflection if provided */
    var selfReflectEl = document.getElementById('aif-self-reflect-input');
    var selfReflect = selfReflectEl ? selfReflectEl.value.trim() : '';

    /* Invoke Edge Function to process — fire-and-forget, failures are expected
       (browser CORS / JWT may block response; pg_cron is the reliable trigger) */
    supabase.functions.invoke('journal-feedback', {
      body: { self_reflection: selfReflect }
    }).catch(function() { /* silent — polling handles completion regardless */ });

    /* Poll for completion */
    pollForFeedback(compCode, qHash, btn);
  } catch (e) {
    console.error('requestAiFeedback error:', e);
    _aifRequestInFlight = false;
    btn.disabled = false;
    btn.textContent = 'AI ile De\u011Ferlendir';
  }
}

/* Extract feedback from RPC result (handles both array and single-object shapes) */
function extractFeedback(res) {
  if (!res || res.error) return null;
  if (Array.isArray(res.data) && res.data.length > 0) return res.data[0];
  if (res.data && typeof res.data === 'object' && res.data.id) return res.data;
  return null;
}

function pollForFeedback(compCode, qHash, btn) {
  if (_aifPollTimer) clearInterval(_aifPollTimer);
  var attempts = 0;
  _aifPollTimer = setInterval(async function() {
    attempts++;
    if (attempts > 75) { /* 75 seconds max — allows cron cycle (60s) + OpenAI processing */
      clearInterval(_aifPollTimer);
      _aifPollTimer = null;
      _aifRequestInFlight = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Tekrar Dene'; }
      showStudioToast('De\u011ferlendirme zaman a\u015f\u0131m\u0131na u\u011frad\u0131. Tekrar deneyebilirsiniz.');
      return;
    }
    try {
      var res = await supabase.rpc('get_journal_feedback', {
        p_competency_code: compCode,
        p_question_hash: qHash
      });
      var fb = extractFeedback(res);
      if (fb) {
        if (fb.status === 'completed') {
          clearInterval(_aifPollTimer);
          _aifPollTimer = null;
          _aifRequestInFlight = false;
          if (btn) { btn.disabled = false; btn.textContent = 'Tekrar De\u011Ferlendir'; }
          renderAiFeedback(fb);
        } else if (fb.status === 'failed') {
          clearInterval(_aifPollTimer);
          _aifPollTimer = null;
          _aifRequestInFlight = false;
          if (btn) { btn.disabled = false; btn.textContent = 'Tekrar Dene'; }
          var safeErr = fb.error_message && fb.error_message.length < 120 && fb.error_message.indexOf('key') === -1
            ? fb.error_message : 'De\u011ferlendirme ba\u015far\u0131s\u0131z oldu.';
          showStudioToast(safeErr + ' Tekrar deneyebilirsiniz.');
        }
        /* pending/processing → keep polling */
      }
    } catch (e) { /* continue polling */ }
  }, 1000);
}

async function loadExistingFeedback(compCode, qText) {
  try {
    var qHash = journalHash(qText);
    var res = await supabase.rpc('get_journal_feedback', {
      p_competency_code: compCode,
      p_question_hash: qHash
    });
    var fb = extractFeedback(res);
    if (fb && fb.status === 'completed') {
      var btn = document.getElementById('aif-request');
      if (btn) btn.textContent = 'Tekrar De\u011Ferlendir';
      renderAiFeedback(fb);
    } else if (fb && (fb.status === 'pending' || fb.status === 'processing')) {
      /* Resume polling for in-flight feedback */
      var btn2 = document.getElementById('aif-request');
      if (btn2) { btn2.disabled = true; btn2.textContent = 'De\u011ferlendiriliyor\u2026'; }
      pollForFeedback(compCode, qHash, btn2);
    }
  } catch (e) { /* silent */ }
}

var AIF_SIGNAL_LABELS = {
  strong: { text: 'G\u00fc\u00e7l\u00fc', color: '#059669', bg: 'rgba(5,150,105,.08)' },
  mixed: { text: 'Karma', color: '#D97706', bg: 'rgba(217,119,6,.08)' },
  needs_work: { text: 'Geli\u015ftirilebilir', color: '#DC2626', bg: 'rgba(220,38,38,.08)' }
};

var AIF_STAR_STATUS = {
  strong: { icon: '\u2713', color: '#059669' },
  adequate: { icon: '\u2022', color: '#D97706' },
  weak: { icon: '!', color: '#DC2626' },
  missing: { icon: '\u2014', color: '#9CA3AF' }
};

function renderAiFeedback(fb) {
  var resultDiv = document.getElementById('aif-result');
  if (!resultDiv) return;
  while (resultDiv.firstChild) resultDiv.removeChild(resultDiv.firstChild);
  resultDiv.style.display = 'block';

  var sig = AIF_SIGNAL_LABELS[fb.overall_signal] || AIF_SIGNAL_LABELS.mixed;

  /* ═══ HERO CARD — primary surface ═══ */
  var hero = document.createElement('div');
  hero.className = 'aif-hero';
  hero.style.borderLeft = '3px solid ' + sig.color;

  /* Header: title + signal pill */
  var hdr = document.createElement('div');
  hdr.className = 'aif-hero-header';
  var hTitle = document.createElement('span');
  hTitle.className = 'aif-hero-title';
  hTitle.textContent = 'De\u011Ferlendirme';
  hdr.appendChild(hTitle);
  var sigPill = document.createElement('span');
  sigPill.className = 'aif-signal';
  sigPill.style.cssText = 'background:' + sig.bg + ';color:' + sig.color;
  sigPill.textContent = sig.text;
  if (fb.score_overall) sigPill.textContent += ' \u00b7 ' + fb.score_overall + '/100';
  hdr.appendChild(sigPill);
  hero.appendChild(hdr);

  /* Summary */
  if (fb.summary_text) {
    var sumEl = document.createElement('div');
    sumEl.className = 'aif-summary';
    sumEl.textContent = fb.summary_text;
    hero.appendChild(sumEl);
  }

  /* Top highlight: best strong point */
  if (fb.strong_points && fb.strong_points.length > 0) {
    var posHL = document.createElement('div');
    posHL.className = 'aif-hero-highlight positive';
    var posIcon = document.createElement('span');
    posIcon.className = 'aif-hero-highlight-icon';
    posIcon.textContent = '\u2713';
    posHL.appendChild(posIcon);
    var posText = document.createElement('span');
    posText.textContent = fb.strong_points[0];
    posHL.appendChild(posText);
    hero.appendChild(posHL);
  }

  /* Top highlight: most critical weak point */
  if (fb.weak_points && fb.weak_points.length > 0) {
    var negHL = document.createElement('div');
    negHL.className = 'aif-hero-highlight negative';
    var negIcon = document.createElement('span');
    negIcon.className = 'aif-hero-highlight-icon';
    negIcon.textContent = '!';
    negHL.appendChild(negIcon);
    var negText = document.createElement('span');
    negText.textContent = fb.weak_points[0];
    negHL.appendChild(negText);
    hero.appendChild(negHL);
  }

  /* Next steps — first 2 improvement actions */
  if (fb.improvement_actions && fb.improvement_actions.length > 0) {
    var nsBox = document.createElement('div');
    nsBox.className = 'aif-next-steps';
    var nsTitle = document.createElement('div');
    nsTitle.className = 'aif-next-steps-title';
    nsTitle.textContent = 'SONRAK\u0130 ADIMLAR';
    nsBox.appendChild(nsTitle);
    var nsLimit = Math.min(2, fb.improvement_actions.length);
    for (var ni = 0; ni < nsLimit; ni++) {
      var nsItem = document.createElement('div');
      nsItem.className = 'aif-list-item';
      var nsBullet = document.createElement('span');
      nsBullet.className = 'aif-bullet';
      nsBullet.style.background = '#C94E28';
      nsItem.appendChild(nsBullet);
      var nsText = document.createElement('span');
      nsText.textContent = fb.improvement_actions[ni];
      nsItem.appendChild(nsText);
      nsBox.appendChild(nsItem);
    }
    hero.appendChild(nsBox);
  }

  resultDiv.appendChild(hero);

  /* ═══ DETAIL ACCORDIONS — progressive disclosure ═══ */

  /* STAR+T Analizi */
  if (fb.star_review) {
    var starDetails = document.createElement('details');
    starDetails.className = 'aif-details';
    var starSum = document.createElement('summary');
    starSum.textContent = 'STAR+T Analizi';
    starDetails.appendChild(starSum);
    var starBody = document.createElement('div');
    starBody.className = 'aif-details-body';
    var starFields = [
      { key: 'situation', label: 'Durum (S)' },
      { key: 'task', label: 'G\u00f6rev (T)' },
      { key: 'action', label: 'Aksiyon (A)' },
      { key: 'result', label: 'Sonu\u00e7 (R)' },
      { key: 'takeaway', label: '\u00c7\u0131kar\u0131m (+T)' }
    ];
    for (var si = 0; si < starFields.length; si++) {
      var sf = starFields[si];
      var rev = fb.star_review[sf.key];
      if (!rev) continue;
      var st = AIF_STAR_STATUS[rev.status] || AIF_STAR_STATUS.adequate;
      var row = document.createElement('div');
      row.className = 'aif-star-row';
      var indicator = document.createElement('span');
      indicator.className = 'aif-star-indicator';
      indicator.style.color = st.color;
      indicator.textContent = st.icon;
      row.appendChild(indicator);
      var rowContent = document.createElement('div');
      rowContent.style.cssText = 'flex:1;min-width:0;';
      var rowLabel = document.createElement('span');
      rowLabel.className = 'aif-star-label';
      rowLabel.textContent = sf.label;
      rowContent.appendChild(rowLabel);
      if (rev.note) {
        var rowNote = document.createElement('span');
        rowNote.className = 'aif-star-note';
        rowNote.textContent = ' \u2014 ' + rev.note;
        rowContent.appendChild(rowNote);
      }
      row.appendChild(rowContent);
      starBody.appendChild(row);
    }
    if (starBody.childNodes.length > 0) {
      starDetails.appendChild(starBody);
      resultDiv.appendChild(starDetails);
    }
  }

  /* All strong points (if more than 1) */
  if (fb.strong_points && fb.strong_points.length > 1) {
    var spDetails = document.createElement('details');
    spDetails.className = 'aif-details';
    var spSum = document.createElement('summary');
    spSum.textContent = 'T\u00fcm G\u00fc\u00e7l\u00fc Sinyaller (' + fb.strong_points.length + ')';
    spDetails.appendChild(spSum);
    var spBody = document.createElement('div');
    spBody.className = 'aif-details-body';
    for (var spi = 0; spi < fb.strong_points.length; spi++) {
      spBody.appendChild(renderAifListItem(fb.strong_points[spi], '#059669'));
    }
    spDetails.appendChild(spBody);
    resultDiv.appendChild(spDetails);
  }

  /* All weak points (if more than 1) */
  if (fb.weak_points && fb.weak_points.length > 1) {
    var wpDetails = document.createElement('details');
    wpDetails.className = 'aif-details';
    var wpSum = document.createElement('summary');
    wpSum.textContent = 'T\u00fcm Geli\u015ftirme Alanlar\u0131 (' + fb.weak_points.length + ')';
    wpDetails.appendChild(wpSum);
    var wpBody = document.createElement('div');
    wpBody.className = 'aif-details-body';
    for (var wpi = 0; wpi < fb.weak_points.length; wpi++) {
      wpBody.appendChild(renderAifListItem(fb.weak_points[wpi], '#DC2626'));
    }
    wpDetails.appendChild(wpBody);
    resultDiv.appendChild(wpDetails);
  }

  /* Follow-up questions */
  if (fb.followup_questions && fb.followup_questions.length > 0) {
    var fqDetails = document.createElement('details');
    fqDetails.className = 'aif-details';
    var fqSum = document.createElement('summary');
    fqSum.textContent = 'Olas\u0131 Takip Sorular\u0131 (' + fb.followup_questions.length + ')';
    fqDetails.appendChild(fqSum);
    var fqBody = document.createElement('div');
    fqBody.className = 'aif-details-body';
    for (var fqi = 0; fqi < fb.followup_questions.length; fqi++) {
      fqBody.appendChild(renderAifListItem(fb.followup_questions[fqi], '#1E2D5E'));
    }
    fqDetails.appendChild(fqBody);
    resultDiv.appendChild(fqDetails);
  }
}

function renderAifListItem(text, color) {
  var item = document.createElement('div');
  item.className = 'aif-list-item';
  var bullet = document.createElement('span');
  bullet.className = 'aif-bullet';
  bullet.style.background = color;
  item.appendChild(bullet);
  var span = document.createElement('span');
  span.textContent = text;
  item.appendChild(span);
  return item;
}

/* renderAifList removed in Phase 5B — replaced by renderAifListItem + progressive disclosure */

/* ══ STUDIO MODULE SECTION HYDRATION ══ */

var _studioModuleCache = {};  /* section → {modules: [], progress: {}, fetched: bool} */
var _studioActiveSection = null;
var _studioProgressCache = null; /* candidate_studio_progress rows, fetched once */

async function fetchStudioProgress() {
  if (_studioProgressCache) return _studioProgressCache;
  try {
    var res = await supabase
      .from('candidate_studio_progress')
      .select('module_id, status, progress_pct, last_viewed_at, completed_at');
    if (!res.error && res.data) {
      var map = {};
      for (var i = 0; i < res.data.length; i++) {
        map[res.data[i].module_id] = res.data[i];
      }
      _studioProgressCache = map;
      return map;
    }
  } catch (e) { /* silent — progress is best-effort */ }
  _studioProgressCache = {};
  return {};
}

async function hydrateStudioSection(section, sectionLabel) {
  var area = document.getElementById('st-module-area');
  if (!area) return;

  /* Toggle: if same section clicked again, collapse */
  if (_studioActiveSection === section && area.style.display !== 'none') {
    area.style.display = 'none';
    _studioActiveSection = null;
    return;
  }
  _studioActiveSection = section;
  area.style.display = 'block';
  area.style.cssText = 'display:block;animation:igFadeIn .25s ease;margin-top:20px;';

  /* Clear + show loading */
  while (area.firstChild) area.removeChild(area.firstChild);

  var loadMsg = document.createElement('div');
  loadMsg.style.cssText = 'text-align:center;padding:20px;color:var(--text-muted);font-size:13px;';
  loadMsg.textContent = 'Y\u00fckleniyor\u2026';
  area.appendChild(loadMsg);

  /* Use cache if available */
  if (_studioModuleCache[section] && _studioModuleCache[section].fetched) {
    if (loadMsg.parentNode) loadMsg.remove();
    renderStudioSection(area, _studioModuleCache[section].modules, _studioModuleCache[section].progress, section, sectionLabel);
    setTimeout(function() { area.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    return;
  }

  /* Fetch modules + progress in parallel */
  try {
    var modP = supabase
      .from('studio_modules')
      .select('id, section, module_type, slug, title, summary, cover_image_url, cover_image_alt, duration_minutes, cta_label, cta_url, body_md')
      .eq('section', section)
      .eq('status', 'published')
      .order('sort_order', { ascending: true });

    var progP = fetchStudioProgress();

    var results = await Promise.all([modP, progP]);
    if (loadMsg.parentNode) loadMsg.remove();

    var modRes = results[0];
    var progress = results[1] || {};
    var modules = (modRes.error ? [] : modRes.data) || [];
    if (modRes.error) console.error('studio_modules fetch error:', modRes.error);

    _studioModuleCache[section] = { modules: modules, progress: progress, fetched: true };
    renderStudioSection(area, modules, progress, section, sectionLabel);
  } catch (e) {
    if (loadMsg.parentNode) loadMsg.remove();
    console.error('studio_modules fetch error:', e);
    renderStudioSection(area, [], {}, section, sectionLabel);
  }

  setTimeout(function() { area.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}

function renderStudioSection(area, modules, progress, section, sectionLabel) {
  /* ── Section header with title + stats + close ── */
  var headerEl = document.createElement('div');
  headerEl.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;';

  var titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:center;gap:10px;';
  var titleEl = document.createElement('div');
  titleEl.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:700;color:var(--text-primary,#111);letter-spacing:-.2px;';
  titleEl.textContent = sectionLabel;
  titleRow.appendChild(titleEl);

  /* Progress stats pill */
  if (modules.length > 0) {
    var completedCount = 0;
    var startedCount = 0;
    for (var si = 0; si < modules.length; si++) {
      var p = progress[modules[si].id];
      if (p && p.status === 'completed') completedCount++;
      else if (p && p.status === 'in_progress') startedCount++;
    }
    if (completedCount > 0 || startedCount > 0) {
      var statsPill = document.createElement('span');
      statsPill.className = 'st-progress-pill';
      statsPill.textContent = completedCount + '/' + modules.length + ' tamamland\u0131';
      titleRow.appendChild(statsPill);
    }
  }
  headerEl.appendChild(titleRow);

  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:none;cursor:pointer;padding:4px 8px;';
  closeBtn.textContent = 'Kapat \u00d7';
  closeBtn.addEventListener('click', function() { area.style.display = 'none'; _studioActiveSection = null; });
  headerEl.appendChild(closeBtn);
  area.appendChild(headerEl);

  /* ── Empty state ── */
  if (modules.length === 0) {
    var empty = document.createElement('div');
    empty.style.cssText = 'background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:40px 24px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.04);';
    var emptyIcon = document.createElement('div');
    emptyIcon.style.cssText = 'font-size:32px;margin-bottom:12px;opacity:.4;';
    emptyIcon.textContent = section === 'performans' ? '\uD83D\uDCC8' : '\uD83D\uDCA1';
    empty.appendChild(emptyIcon);
    var emptyTitle = document.createElement('div');
    emptyTitle.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px;';
    emptyTitle.textContent = section === 'performans' ? 'Performans mod\u00fclleri haz\u0131rlan\u0131yor' : 'Platform rehberleri haz\u0131rlan\u0131yor';
    empty.appendChild(emptyTitle);
    var emptyDesc = document.createElement('div');
    emptyDesc.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);line-height:1.5;max-width:320px;margin:0 auto;';
    emptyDesc.textContent = section === 'performans'
      ? 'Ma\u011faza KPI\u2019lar\u0131, sat\u0131\u015f matemati\u011fi ve vaka \u00e7al\u0131\u015fmalar\u0131 \u00e7ok yak\u0131nda burada olacak.'
      : 'Profilini \u00f6ne \u00e7\u0131karman ve platformu en verimli kullanman i\u00e7in rehberler haz\u0131rlan\u0131yor.';
    empty.appendChild(emptyDesc);
    area.appendChild(empty);
    return;
  }

  /* ── Continue learning card ── */
  var continueModule = null;
  var latestViewed = null;
  for (var ci = 0; ci < modules.length; ci++) {
    var cp = progress[modules[ci].id];
    if (cp && cp.status === 'in_progress' && cp.last_viewed_at) {
      if (!latestViewed || cp.last_viewed_at > latestViewed) {
        latestViewed = cp.last_viewed_at;
        continueModule = modules[ci];
      }
    }
  }
  if (continueModule) {
    var contCard = document.createElement('div');
    contCard.className = 'st-continue-card';
    contCard.addEventListener('click', function() { openStudioModule(continueModule); });

    var contLeft = document.createElement('div');
    contLeft.style.cssText = 'flex:1;min-width:0;';
    var contKicker = document.createElement('div');
    contKicker.style.cssText = 'font-family:"DM Mono",monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--verm,#C94E28);margin-bottom:4px;';
    contKicker.textContent = 'KALDIĞIN YERDEN DEVAM ET';
    contLeft.appendChild(contKicker);
    var contTitle = document.createElement('div');
    contTitle.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);line-height:1.3;';
    contTitle.textContent = continueModule.title;
    contLeft.appendChild(contTitle);
    contCard.appendChild(contLeft);

    var contArrow = document.createElement('div');
    contArrow.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:var(--verm,#C94E28);flex-shrink:0;';
    contArrow.textContent = 'Devam Et \u2192';
    contCard.appendChild(contArrow);
    area.appendChild(contCard);
  }

  /* ── Module cards in bento grid ── */
  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:14px;';

  for (var i = 0; i < modules.length; i++) {
    var m = modules[i];
    var mp = progress[m.id];
    var isCompleted = mp && mp.status === 'completed';
    var isInProgress = mp && mp.status === 'in_progress';

    var card = document.createElement('div');
    card.className = 'st-mod-card' + (isCompleted ? ' st-mod-done' : '');
    if (i === 0 && modules.length > 1) card.style.gridColumn = 'span 2';

    /* Cover image */
    if (m.cover_image_url) {
      var coverEl = document.createElement('div');
      coverEl.className = 'st-mod-cover';
      var img = document.createElement('img');
      img.src = m.cover_image_url;
      img.alt = m.cover_image_alt || m.title;
      img.loading = 'lazy';
      coverEl.appendChild(img);
      card.appendChild(coverEl);
    }

    var body = document.createElement('div');
    body.className = 'st-mod-body';

    /* Meta row: type + duration + status */
    var meta = document.createElement('div');
    meta.className = 'st-mod-meta';
    var typeLabels = { article: 'Makale', video: 'Video', carousel: 'Rehber', lesson: 'Ders' };
    var typePill = document.createElement('span');
    typePill.className = 'st-mod-type';
    typePill.textContent = typeLabels[m.module_type] || m.module_type;
    meta.appendChild(typePill);
    if (m.duration_minutes) {
      var dur = document.createElement('span');
      dur.className = 'st-mod-dur';
      dur.textContent = m.duration_minutes + ' dk';
      meta.appendChild(dur);
    }
    if (isCompleted) {
      var donePill = document.createElement('span');
      donePill.className = 'st-mod-status-done';
      donePill.textContent = '\u2713 Tamamland\u0131';
      meta.appendChild(donePill);
    } else if (isInProgress) {
      var ipPill = document.createElement('span');
      ipPill.className = 'st-mod-status-ip';
      ipPill.textContent = 'Devam Ediyor';
      meta.appendChild(ipPill);
    }
    body.appendChild(meta);

    var titleEl = document.createElement('div');
    titleEl.className = 'st-mod-title';
    titleEl.textContent = m.title;
    body.appendChild(titleEl);

    if (m.summary) {
      var sumEl = document.createElement('div');
      sumEl.className = 'st-mod-summary';
      sumEl.textContent = m.summary;
      body.appendChild(sumEl);
    }

    card.appendChild(body);
    card.addEventListener('click', (function(mod) {
      return function() { openStudioModule(mod); };
    })(m));

    grid.appendChild(card);
  }
  area.appendChild(grid);
}

function openStudioModule(mod) {
  /* Mark as viewed (fire-and-forget) */
  if (typeof supabase !== 'undefined') {
    supabase.rpc('mark_studio_module_viewed', { p_module_id: mod.id }).then(function() {});
  }

  /* If module has CTA URL, open it */
  if (mod.cta_url) {
    window.open(mod.cta_url, '_blank', 'noopener');
    return;
  }

  /* Otherwise show inline detail overlay */
  var area = document.getElementById('st-module-area');
  if (!area) return;

  while (area.firstChild) area.removeChild(area.firstChild);

  /* Back button */
  var backBtn = document.createElement('button');
  backBtn.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--verm,#C94E28);background:none;border:none;cursor:pointer;padding:6px 0;margin-bottom:12px;';
  backBtn.textContent = '\u2190 Listeye D\u00f6n';
  backBtn.addEventListener('click', function() {
    _studioModuleCache[mod.section] = null; /* force re-fetch for freshness */
    _studioProgressCache = null; /* force progress re-fetch */
    _studioActiveSection = null; /* reset toggle so hydrate opens */
    hydrateStudioSection(mod.section, mod.section === 'performans' ? 'Performans' : 'HelloTalent\u2019ten Bilgiler');
  });
  area.appendChild(backBtn);

  /* Detail card */
  var detail = document.createElement('div');
  detail.style.cssText = 'background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:28px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);';

  if (mod.cover_image_url) {
    var covWrap = document.createElement('div');
    covWrap.style.cssText = 'margin:-28px -24px 20px;border-radius:16px 16px 0 0;overflow:hidden;max-height:240px;';
    var img = document.createElement('img');
    img.src = mod.cover_image_url;
    img.alt = mod.cover_image_alt || mod.title;
    img.style.cssText = 'width:100%;height:auto;display:block;';
    covWrap.appendChild(img);
    detail.appendChild(covWrap);
  }

  var dTitle = document.createElement('div');
  dTitle.style.cssText = 'font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;color:var(--text-primary,#111);margin-bottom:16px;line-height:1.3;';
  dTitle.textContent = mod.title;
  detail.appendChild(dTitle);

  if (mod.body_md) {
    var dBody = document.createElement('div');
    dBody.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;line-height:1.75;color:var(--text,#111);white-space:pre-wrap;';
    dBody.textContent = mod.body_md;
    detail.appendChild(dBody);
  }

  /* Mark complete button */
  var completeRow = document.createElement('div');
  completeRow.style.cssText = 'margin-top:24px;padding-top:16px;border-top:1px solid var(--border-subtle,#E5E3DF);';
  var completeBtn = document.createElement('button');
  completeBtn.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:10px 24px;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(201,78,40,.2);';
  completeBtn.textContent = 'Tamamlad\u0131m \u2713';
  completeBtn.addEventListener('click', function() {
    if (typeof supabase !== 'undefined') {
      supabase.rpc('complete_studio_module', { p_module_id: mod.id }).then(function(res) {
        if (!res.error) {
          completeBtn.textContent = 'Tamamland\u0131 \u2713';
          completeBtn.style.background = '#059669';
          completeBtn.disabled = true;
          _studioProgressCache = null; /* invalidate for next render */
          _studioModuleCache[mod.section] = null;
        }
      });
    }
  });
  completeRow.appendChild(completeBtn);
  detail.appendChild(completeRow);

  /* FAZ 4C — practice bridge: module slug → competency */
  var modCompCode = mod.slug ? MODULE_SLUG_TO_COMP[mod.slug] : null;
  if (modCompCode) {
    var bridgeEl = buildPracticeBridgeCTA(modCompCode, '\u015eimdi bunu m\u00FClakatta nas\u0131l anlat\u0131rs\u0131n?');
    if (bridgeEl) detail.appendChild(bridgeEl);
  }

  area.appendChild(detail);
  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* bindRoleSelectEvents — DEPRECATED: role picker now in lobby hero */
function bindRoleSelectEvents() { bindLobbyEvents(); }

function startSession(role) {
  var bridge = getBridge();
  if (!bridge) return;
  S.role = role;
  try { localStorage.setItem('ht_studio_role', role); } catch(e) {}
  S.comps = bridge.ROLE_COMP_MAP[role] || [];
  S.activeComp = null;
  S.activeCompIdx = 0;
  S.dealt = [];
  S.currentQ = 0;
  S.swapsUsed = 0;
  S.answeredCount = 0;
  S.drawerOpen = false;
  S.drawerTab = 'star';
  S.journalOpen = false;
  S.completedComps = [];
  S.totalAnswered = 0;
  S.totalSwaps = 0;

  /* FAZ 4C — if pendingComp set from content detail, jump directly */
  if (S.pendingComp) {
    var pending = S.pendingComp;
    S.pendingComp = null;
    var pIdx = -1;
    for (var pi = 0; pi < S.comps.length; pi++) {
      if (S.comps[pi] === pending) { pIdx = pi; break; }
    }
    if (pIdx !== -1) {
      S.activeComp = pending;
      S.activeCompIdx = pIdx;
      S.activeTab = 'overview';
      navigate('course_detail');
      return;
    }
  }
  navigate('lobby');
}

function startPractice(compCode, compIdx) {
  S.activeComp = compCode;
  S.activeCompIdx = compIdx;
  var qCount = S.isPremium ? flattenQuestions(compCode).length : Math.min(FREE_Q_PER_COMP, flattenQuestions(compCode).length);
  S.dealt = dealQuestions(compCode, qCount);
  S.currentQ = 0;
  S.swapsUsed = 0;
  S.answeredCount = 0;
  S.drawerOpen = false;
  S.drawerTab = 'star';
  S.journalOpen = false;
  navigate('practice');
}

function bindLobbyEvents() {
  /* ── Role picker (first-time hero) ── */
  var dd = document.getElementById('ig-role-dd');
  var startBtn = document.getElementById('ig-role-start');
  if (startBtn) startBtn.addEventListener('click', function() {
    if (dd && dd.value) {
      startSession(dd.value);
    }
  });

  /* ── Change role (returning hero) ── */
  var changeRoleBtn = document.getElementById('ig-back-role-change');
  if (changeRoleBtn) changeRoleBtn.addEventListener('click', function() {
    S.role = null;
    S.comps = [];
    try { localStorage.removeItem('ht_studio_role'); } catch(e) {}
    navigate('lobby');
  });

  /* ── Course card clicks → course_detail ── */
  var cards = document.querySelectorAll('.st-course-card[data-comp]');
  cards.forEach(function(card) {
    if (card.classList.contains('st-course-locked')) return;
    card.addEventListener('click', function() {
      var code = this.getAttribute('data-comp');
      var idx = parseInt(this.getAttribute('data-idx'), 10);
      S.activeComp = code;
      S.activeCompIdx = idx;
      S.activeTab = 'overview';
      navigate('course_detail');
    });
  });

  /* ── Locked card click → premium nudge ── */
  var lockedCards = document.querySelectorAll('.st-course-card.st-course-locked');
  lockedCards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      e.stopPropagation();
      showStudioToast('Bu yetkinlik Premium ile a\u00e7\u0131l\u0131r.');
    });
  });

  /* ── STAR+T reference card expand/collapse ── */
  var starRef = document.getElementById('st-star-ref');
  if (starRef) starRef.addEventListener('click', function() {
    var body = document.getElementById('st-star-ref-body');
    if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
  });

  /* ── Coach feed hydration ── */
  hydrateCoachFeed();

  /* ── Badge strip hydration ── */
  hydrateBadgeStrip();

  /* ── Async evidence + streak hydration (only if role exists) ── */
  if (S.role) {
    hydrateLobbyEvidence();
    hydrateStreakPill();
  }
}

/* ══ LOBBY EVIDENCE HYDRATION ══ */

var _lobbyEvidenceCache = null;

async function hydrateLobbyEvidence() {
  if (!S.role || typeof supabase === 'undefined') return;

  try {
    var res = await supabase.rpc('get_my_yetenek_overview', { p_role_key: S.role });
    if (res.error || !res.data) return;

    _lobbyEvidenceCache = {};
    var data = res.data;
    var ratedCount = 0;
    var practicedCount = 0;
    var journalCount = 0;

    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      _lobbyEvidenceCache[d.competency_code] = d;
      if (d.self_rating !== 'none') ratedCount++;
      if (d.practice_status !== 'none') practicedCount++;
      if (d.journal_count > 0) journalCount++;
    }

    /* Update readiness summary stat for practiced count */
    var practicedEl = document.getElementById('yk-summary-practiced');
    if (practicedEl) practicedEl.textContent = String(practicedCount);

    /* Render summary strip */
    var summaryEl = document.getElementById('yk-evidence-summary');
    if (summaryEl && (ratedCount > 0 || practicedCount > 0 || journalCount > 0)) {
      summaryEl.style.display = 'flex';
      while (summaryEl.firstChild) summaryEl.removeChild(summaryEl.firstChild);

      if (ratedCount > 0) {
        var rs = document.createElement('span');
        rs.className = 'yk-summary-chip';
        rs.textContent = ratedCount + ' de\u011Ferlendirildi';
        summaryEl.appendChild(rs);
      }
      if (practicedCount > 0) {
        var ps = document.createElement('span');
        ps.className = 'yk-summary-chip';
        ps.textContent = practicedCount + ' pratik yap\u0131ld\u0131';
        summaryEl.appendChild(ps);
      }
      if (journalCount > 0) {
        var js = document.createElement('span');
        js.className = 'yk-summary-chip';
        js.textContent = journalCount + ' g\u00fcnl\u00fck';
        summaryEl.appendChild(js);
      }
    }

    /* Render per-card evidence */
    var evidenceEls = document.querySelectorAll('[data-ev-comp]');
    evidenceEls.forEach(function(el) {
      var code = el.getAttribute('data-ev-comp');
      var ev = _lobbyEvidenceCache[code];
      if (!ev) return;
      renderCardEvidence(el, code, ev);
    });
  } catch (e) { /* silent — evidence is best-effort */ }

  /* After evidence loads, hydrate daily practice card and recommendation */
  hydrateDailyPractice();
  hydrateRecommendation(data);
}

/* ══ STREAK PILL HYDRATION ══ */

var flameSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.25-6.2 4.5-8.5.42-.42 1.12-.13 1.1.46-.06 2.07.65 3.74 2.04 5.04.11.1.28.05.32-.09.3-1.09.87-2.1 1.68-2.89C14.48 7.2 15.5 4.5 15.5 2c0-.55.56-.88 1.02-.56C19.74 3.74 21 7.26 21 10.5c0 6.88-4.03 12.5-9 12.5z"/></svg>';

async function hydrateStreakPill() {
  var slot = document.getElementById('yk-streak-slot');
  if (!slot || typeof supabase === 'undefined') return;
  try {
    var res = await supabase.rpc('get_my_streak_status');
    if (res.error || !res.data) return;
    var d = res.data;
    var streak = d.current_streak || 0;
    var alive = d.streak_alive;
    var freezes = d.streak_freezes_available || 0;
    var canFreeze = d.can_freeze || false;
    var canRecover = d.can_recover || false;
    var frozenToday = d.streak_frozen_today || false;

    slot.style.display = 'block';
    while (slot.firstChild) slot.removeChild(slot.firstChild);

    var pill = document.createElement('div');
    if (streak > 0 && alive) {
      pill.className = 'yk-streak-pill yk-streak-active';
      pill.innerHTML = flameSVG; /* safe — hardcoded SVG constant */
      var txt = document.createElement('span');
      txt.textContent = streak + ' g\u00fcn seri';
      pill.appendChild(txt);
      if (frozenToday) {
        txt.textContent += ' \u00b7 freeze kullan\u0131ld\u0131';
        pill.className = 'yk-streak-pill yk-streak-frozen';
      }
    } else if (canFreeze) {
      pill.className = 'yk-streak-pill yk-streak-frozen';
      var txt3 = document.createElement('span');
      txt3.textContent = 'Freeze hakk\u0131n var \u2014 bug\u00fcn \u00e7al\u0131\u015f ve seriyi koru';
      pill.appendChild(txt3);
    } else if (canRecover) {
      pill.className = 'yk-streak-pill yk-streak-recover';
      var txt4 = document.createElement('span');
      txt4.textContent = 'Bug\u00fcn \u00e7al\u0131\u015f, seriyi geri kazan';
      pill.appendChild(txt4);
    } else {
      pill.className = 'yk-streak-pill yk-streak-zero';
      var txt2 = document.createElement('span');
      txt2.textContent = 'Bug\u00fcn ba\u015fla';
      pill.appendChild(txt2);
    }
    slot.appendChild(pill);

    /* Freeze hint below pill */
    if (streak > 0 && alive && freezes > 0 && !frozenToday) {
      var hint = document.createElement('div');
      hint.className = 'yk-streak-freeze-hint';
      hint.textContent = freezes + ' freeze hakk\u0131n var';
      slot.appendChild(hint);
    }
  } catch (e) { /* silent — streak is best-effort */ }
}

/* ══ REVIEW-NEEDED DETECTION ══ */

var REVIEW_STALE_DAYS = 14;

function needsReview(code) {
  if (!_lobbyEvidenceCache) return false;
  var ev = _lobbyEvidenceCache[code];
  if (!ev) return false;
  var isCompleted = S.completedComps.indexOf(code) !== -1;
  if (!isCompleted) return false;
  /* Weak signal: growing self-rating or mixed/needs_work AI feedback */
  if (ev.self_rating === 'growing') return true;
  if (ev.feedback_signal === 'mixed' || ev.feedback_signal === 'needs_work') return true;
  /* Stale: practiced but not recently */
  if (ev.last_practiced_at) {
    var daysSince = Math.floor((Date.now() - new Date(ev.last_practiced_at).getTime()) / 86400000);
    if (daysSince >= REVIEW_STALE_DAYS) return true;
  }
  return false;
}

/* ══ DAILY PRACTICE CARD HYDRATION ══ */

function hydrateDailyPractice() {
  var slot = document.getElementById('yk-daily-slot');
  if (!slot || !_lobbyEvidenceCache) return;
  var bridge = getBridge();
  if (!bridge) return;

  /* Priority 1: completed comp that needs review (weak signal or stale) */
  var pick = null;
  var pickIdx = -1;
  var isReviewPick = false;
  for (var ri = 0; ri < S.comps.length; ri++) {
    if (needsReview(S.comps[ri])) {
      pick = S.comps[ri]; pickIdx = ri; isReviewPick = true; break;
    }
  }
  /* Priority 2: incomplete growing comp */
  if (!pick) {
    for (var i = 0; i < S.comps.length; i++) {
      var code = S.comps[i];
      if (S.completedComps.indexOf(code) !== -1) continue;
      var ev = _lobbyEvidenceCache[code];
      if (ev && ev.self_rating === 'growing') {
        pick = code; pickIdx = i; break;
      }
    }
  }
  /* Priority 3: first incomplete comp */
  if (!pick) {
    for (var j = 0; j < S.comps.length; j++) {
      if (S.completedComps.indexOf(S.comps[j]) === -1) {
        pick = S.comps[j]; pickIdx = j; break;
      }
    }
  }
  if (!pick) return; /* all done, no review needed — no daily card */

  var name = bridge.COMP_NAMES[pick] || pick;
  var qCount = flattenQuestions(pick).length;
  var estMin = Math.max(3, Math.round(qCount * 2));

  slot.style.display = 'block';
  var card = document.createElement('div');
  card.className = 'yk-daily-card';
  card.setAttribute('data-comp', pick);
  card.setAttribute('data-idx', String(pickIdx));

  var iconDiv = document.createElement('div');
  iconDiv.className = 'yk-daily-icon';
  iconDiv.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'; /* safe — hardcoded clock SVG */

  var textDiv = document.createElement('div');
  textDiv.className = 'yk-daily-text';

  var kicker = document.createElement('div');
  kicker.className = 'yk-daily-kicker';
  kicker.textContent = isReviewPick ? 'TEKRAR PRAT\u0130K' : 'BUG\u00dcNK\u00dc PRAT\u0130K';

  var title = document.createElement('div');
  title.className = 'yk-daily-title';
  title.textContent = name;

  var meta = document.createElement('div');
  meta.className = 'yk-daily-meta';
  meta.textContent = '~' + estMin + ' dk \u00b7 ' + qCount + ' soru' + (estMin <= 7 ? ' \u00b7 h\u0131zl\u0131' : '');

  textDiv.appendChild(kicker);
  textDiv.appendChild(title);
  textDiv.appendChild(meta);

  var cta = document.createElement('div');
  cta.className = 'yk-daily-cta';
  cta.textContent = 'Ba\u015fla \u2192';

  card.appendChild(iconDiv);
  card.appendChild(textDiv);
  card.appendChild(cta);
  slot.appendChild(card);

  card.addEventListener('click', function() {
    var c = this.getAttribute('data-comp');
    var idx = parseInt(this.getAttribute('data-idx'), 10);
    S.activeComp = c;
    S.activeCompIdx = idx;
    navigate('course_detail');
  });
}

/* ══ RECOMMENDATION + GROWING-FIRST RE-SORT ══ */

function hydrateRecommendation(evidenceData) {
  var slot = document.getElementById('yk-recommendation-slot');
  if (!slot) return;
  var bridge = getBridge();
  if (!bridge) return;

  /* Find first review-needing comp, then first growing incomplete */
  var reviewPick = null;
  var growingPick = null;
  var allDone = true;
  for (var i = 0; i < S.comps.length; i++) {
    var code = S.comps[i];
    if (!reviewPick && needsReview(code)) reviewPick = code;
    if (S.completedComps.indexOf(code) !== -1) continue;
    allDone = false;
    var ev = _lobbyEvidenceCache ? _lobbyEvidenceCache[code] : null;
    if (ev && ev.self_rating === 'growing' && !growingPick) {
      growingPick = code;
    }
  }

  if (allDone && !reviewPick) {
    slot.style.display = 'block';
    var doneDiv = document.createElement('div');
    doneDiv.className = 'yk-recommendation';
    doneDiv.textContent = S.role + ' i\u00e7in t\u00fcm eri\u015filebilir yetkinlikleri tamamlad\u0131n. Farkl\u0131 bir rol deneyerek yeni yetkinlikler ke\u015ffedebilirsin.';
    slot.appendChild(doneDiv);
    return;
  }

  var recText = null;
  if (reviewPick) {
    var rName = bridge.COMP_NAMES[reviewPick] || reviewPick;
    recText = rName + ' yetkinli\u011Fine tekrar g\u00f6z atmak faydal\u0131 olabilir.';
  } else if (growingPick) {
    var gName = bridge.COMP_NAMES[growingPick] || growingPick;
    recText = S.role + ' i\u00e7in bug\u00fcn ' + gName + ' \u00fczerinde \u00e7al\u0131\u015fmak iyi bir ba\u015flang\u0131\u00e7 olabilir.';
  }
  if (recText) {
    slot.style.display = 'block';
    var recDiv = document.createElement('div');
    recDiv.className = 'yk-recommendation';
    recDiv.textContent = recText;
    slot.appendChild(recDiv);
  }

  /* Re-sort track cards: review-needing completed → growing incomplete → incomplete → clean completed */
  if (evidenceData && evidenceData.length > 0) {
    var tracksContainer = document.querySelector('.yk-home-tracks');
    if (!tracksContainer) return;
    var cards = Array.prototype.slice.call(tracksContainer.querySelectorAll('.yk-track-card'));
    if (cards.length < 2) return;

    cards.sort(function(a, b) {
      var aCode = a.getAttribute('data-comp');
      var bCode = b.getAttribute('data-comp');
      var aDone = a.classList.contains('yk-track-done') ? 2 : 0;
      var bDone = b.classList.contains('yk-track-done') ? 2 : 0;
      var aEv = _lobbyEvidenceCache ? _lobbyEvidenceCache[aCode] : null;
      var bEv = _lobbyEvidenceCache ? _lobbyEvidenceCache[bCode] : null;
      var aGrow = (!aDone && aEv && aEv.self_rating === 'growing') ? -1 : 0;
      var bGrow = (!bDone && bEv && bEv.self_rating === 'growing') ? -1 : 0;
      /* Review-needing completed → promote above clean completed */
      var aReview = (aDone && needsReview(aCode)) ? -1 : 0;
      var bReview = (bDone && needsReview(bCode)) ? -1 : 0;
      return (aDone + aGrow + aReview) - (bDone + bGrow + bReview);
    });

    for (var ci = 0; ci < cards.length; ci++) {
      tracksContainer.appendChild(cards[ci]);
    }

    /* Inject review pills on review-needing cards */
    for (var pi = 0; pi < cards.length; pi++) {
      var pCode = cards[pi].getAttribute('data-comp');
      if (needsReview(pCode) && !cards[pi].querySelector('.yk-review-pill')) {
        var pill = document.createElement('div');
        pill.className = 'yk-review-pill';
        pill.textContent = 'Tazelemeyi d\u00fc\u015f\u00fcn';
        cards[pi].appendChild(pill);
      }
    }
  }
}

function renderCardEvidence(el, code, ev) {
  while (el.firstChild) el.removeChild(el.firstChild);

  /* Self-rating toggle */
  var ratingRow = document.createElement('div');
  ratingRow.className = 'yk-rating-row';

  var ratingLabel = document.createElement('span');
  ratingLabel.className = 'yk-rating-label';
  ratingLabel.textContent = 'Kendini de\u011Ferlendir:';
  ratingRow.appendChild(ratingLabel);

  var toggleWrap = document.createElement('div');
  toggleWrap.className = 'yk-rating-toggle';

  var btnStrong = document.createElement('button');
  btnStrong.className = 'yk-rating-btn' + (ev.self_rating === 'strong' ? ' active strong' : '');
  btnStrong.textContent = 'G\u00fc\u00e7l\u00fc';
  btnStrong.addEventListener('click', function(e) {
    e.stopPropagation();
    saveCompRating(code, 'strong', toggleWrap);
  });
  toggleWrap.appendChild(btnStrong);

  var btnGrowing = document.createElement('button');
  btnGrowing.className = 'yk-rating-btn' + (ev.self_rating === 'growing' ? ' active growing' : '');
  btnGrowing.textContent = 'Geli\u015fiyor';
  btnGrowing.addEventListener('click', function(e) {
    e.stopPropagation();
    saveCompRating(code, 'growing', toggleWrap);
  });
  toggleWrap.appendChild(btnGrowing);

  ratingRow.appendChild(toggleWrap);
  el.appendChild(ratingRow);

  /* Evidence chips */
  var hasEvidence = ev.practice_status !== 'none' || ev.journal_count > 0 || ev.feedback_signal !== 'none';
  if (hasEvidence) {
    var chipRow = document.createElement('div');
    chipRow.className = 'yk-chip-row';

    if (ev.practice_status !== 'none') {
      var pChip = document.createElement('span');
      pChip.className = 'yk-chip yk-chip-practice';
      pChip.textContent = ev.practice_count + ' pratik';
      chipRow.appendChild(pChip);
    }
    if (ev.journal_count > 0) {
      var jChip = document.createElement('span');
      jChip.className = 'yk-chip yk-chip-journal';
      jChip.textContent = ev.journal_count + ' g\u00fcnl\u00fck';
      chipRow.appendChild(jChip);
    }
    if (ev.feedback_signal !== 'none') {
      var fChip = document.createElement('span');
      var sigLabels = { strong: 'AI: G\u00fc\u00e7l\u00fc', mixed: 'AI: Karma', needs_work: 'AI: Geli\u015ftir' };
      fChip.className = 'yk-chip yk-chip-ai yk-chip-ai-' + ev.feedback_signal;
      fChip.textContent = sigLabels[ev.feedback_signal] || 'AI';
      chipRow.appendChild(fChip);
    }
    el.appendChild(chipRow);
  }
}

function saveCompRating(code, rating, toggleWrap) {
  if (typeof supabase === 'undefined') return;

  /* Optimistic UI update */
  var btns = toggleWrap.querySelectorAll('.yk-rating-btn');
  btns.forEach(function(b) {
    b.classList.remove('active', 'strong', 'growing');
  });
  var activeBtn = rating === 'strong' ? btns[0] : btns[1];
  if (activeBtn) activeBtn.classList.add('active', rating);

  /* Fire-and-forget DB save */
  supabase.rpc('upsert_competency_rating', {
    p_competency_code: code,
    p_rating: rating
  }).then(function() {});
}

function bindCourseDetailEvents() {
  /* Back to lobby */
  var backBtn = document.getElementById('st-cd-back');
  if (backBtn) backBtn.addEventListener('click', function() {
    S.activeTab = 'overview';
    navigate('lobby');
  });

  /* Start practice CTA */
  var startBtn = document.getElementById('st-cd-start');
  if (startBtn) startBtn.addEventListener('click', function() {
    startPractice(S.activeComp, S.activeCompIdx);
  });

  /* Tab switching */
  var tabs = document.querySelectorAll('.st-tab[data-tab]');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = this.getAttribute('data-tab');
      if (target === S.activeTab) return;
      S.activeTab = target;
      navigate('course_detail');
    });
  });
}

function bindPracticeEvents() {
  /* Back to course detail (spec: ← Geri returns to course_detail) */
  var backBtn = document.getElementById('ig-back-lobby');
  if (backBtn) backBtn.addEventListener('click', function() { flushJournal(); navigate('course_detail'); });

  /* Swap (skip question) */
  var swapBtn = document.getElementById('ig-swap');
  if (swapBtn) swapBtn.addEventListener('click', function() {
    flushJournal();
    var replacement = getSwapQuestion(S.activeComp, S.dealt, S.currentQ);
    if (replacement) {
      S.dealt[S.currentQ] = replacement;
      S.swapsUsed++;
      navigate('practice');
    }
  });

  /* ── Drawer: open with STAR+T tab ── */
  var drawerStarBtn = document.getElementById('st-drawer-star');
  if (drawerStarBtn) drawerStarBtn.addEventListener('click', function() {
    S.drawerTab = 'star';
    S.drawerOpen = true;
    S.journalOpen = false;
    navigate('practice');
  });

  /* ── Drawer: tab switching ── */
  var drawerTabs = document.querySelectorAll('.st-drawer-tab[data-drawer-tab]');
  drawerTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = this.getAttribute('data-drawer-tab');
      if (target === S.drawerTab) return;
      S.drawerTab = target;
      navigate('practice');
    });
  });

  /* ── Drawer: close ── */
  var drawerCloseBtn = document.getElementById('st-drawer-close');
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', function() {
    S.drawerOpen = false;
    navigate('practice');
  });

  /* ── Drawer: backdrop click closes ── */
  var drawerBackdrop = document.getElementById('st-drawer-backdrop');
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', function() {
    S.drawerOpen = false;
    navigate('practice');
  });

  /* ── Journal drawer: open ── */
  var journalOpenBtn = document.getElementById('st-drawer-journal');
  if (journalOpenBtn) journalOpenBtn.addEventListener('click', function() {
    S.journalOpen = true;
    S.drawerOpen = false;
    navigate('practice');
    setTimeout(function() {
      var first = document.querySelector('.ig-journal-textarea');
      if (first) first.focus();
    }, 100);
  });

  /* ── Journal drawer: close ── */
  var journalCloseBtn = document.getElementById('st-journal-close');
  if (journalCloseBtn) journalCloseBtn.addEventListener('click', function() {
    flushJournal();
    S.journalOpen = false;
    navigate('practice');
  });

  /* ── Journal drawer: backdrop click closes ── */
  var journalBackdrop = document.getElementById('st-journal-backdrop');
  if (journalBackdrop) journalBackdrop.addEventListener('click', function() {
    flushJournal();
    S.journalOpen = false;
    navigate('practice');
  });

  /* Flush journal — immediate save of current textarea values.
     Called before any navigation that leaves the current question. */
  function flushJournal() {
    var q = S.dealt && S.dealt[S.currentQ];
    if (!q || !S.activeComp) return;
    var all = document.querySelectorAll('.ig-journal-textarea');
    if (!all.length) return;
    var fields = {};
    all.forEach(function(el) {
      fields[el.getAttribute('data-field')] = el.value;
    });
    saveJournalDraft(S.activeComp, q.text, fields);
    if (_journalTimer) { clearTimeout(_journalTimer); _journalTimer = null; }
  }

  /* Journal auto-save (debounced keyup on textareas) */
  var _journalTimer = null;
  var textareas = document.querySelectorAll('.ig-journal-textarea');
  textareas.forEach(function(ta) {
    ta.addEventListener('input', function() {
      if (_journalTimer) clearTimeout(_journalTimer);
      _journalTimer = setTimeout(function() {
        var q = S.dealt[S.currentQ];
        if (!q) return;
        var all = document.querySelectorAll('.ig-journal-textarea');
        var fields = {};
        all.forEach(function(el) {
          fields[el.getAttribute('data-field')] = el.value;
        });
        saveJournalDraft(S.activeComp, q.text, fields);
        var indicator = document.getElementById('ig-journal-saved');
        if (indicator) {
          indicator.textContent = 'Taslak kaydedildi';
          indicator.classList.add('visible');
          setTimeout(function() {
            if (indicator) {
              indicator.textContent = '';
              indicator.classList.remove('visible');
            }
          }, 2000);
        }
      }, 1500);
    });
  });

  /* AI Feedback request */
  var aifBtn = document.getElementById('aif-request');
  if (aifBtn) aifBtn.addEventListener('click', function() {
    var q = S.dealt && S.dealt[S.currentQ];
    if (!q || !S.activeComp) return;
    flushJournal();
    requestAiFeedback(S.activeComp, q.text, journalHash(q.text));
  });

  /* Load existing feedback if available — freemium: first FREE_COMP_LIMIT comps free */
  var _compIdx = S.comps ? S.comps.indexOf(S.activeComp) : -1;
  var _aiFreeHere = S.isPremium || (_compIdx >= 0 && _compIdx < FREE_COMP_LIMIT);
  if (_aiFreeHere && S.dealt && S.dealt[S.currentQ]) {
    loadExistingFeedback(S.activeComp, S.dealt[S.currentQ].text);
  }

  /* Answered (next question or complete) */
  var answeredBtn = document.getElementById('ig-answered');
  if (answeredBtn) answeredBtn.addEventListener('click', function() {
    flushJournal();
    addRecentQuestion(S.dealt[S.currentQ].text);
    S.answeredCount++;
    S.totalAnswered++;
    S.drawerOpen = false;
    S.journalOpen = false;

    if (S.currentQ < S.dealt.length - 1) {
      S.currentQ++;
      navigate('practice');
    } else {
      S.totalSwaps += S.swapsUsed;
      if (S.completedComps.indexOf(S.activeComp) === -1) {
        S.completedComps.push(S.activeComp);
      }
      /* Record competency completion to DB (fire-and-forget) */
      if (typeof supabase !== 'undefined' && S.role && S.activeComp) {
        supabase.rpc('complete_yetenek_competency', {
          p_role_key: S.role,
          p_competency_code: S.activeComp,
          p_questions_answered: S.answeredCount
        }).then(function() {});
        /* Update streak (fire-and-forget) */
        supabase.rpc('update_candidate_streak').then(function() {});
      }
      navigate('completion');
    }
  });
}

function bindCompletionEvents() {
  /* Back to lobby (next competency) */
  var backBtn = document.getElementById('ig-back-lobby-comp');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('lobby'); });

  /* Öğrenme Planına Dön — back to lobby */
  var sessionBtn = document.getElementById('ig-session-complete');
  if (sessionBtn) sessionBtn.addEventListener('click', function() { navigate('lobby'); });

  /* Back nav at top */
  var backNavBtn = document.getElementById('yk-comp-back');
  if (backNavBtn) backNavBtn.addEventListener('click', function() { navigate('lobby'); });

  /* Restart same comp */
  var restartBtn = document.getElementById('ig-restart-comp');
  if (restartBtn) restartBtn.addEventListener('click', function() {
    startPractice(S.activeComp, S.activeCompIdx);
  });

  /* Hydrate latest badge — best-effort, silent on failure */
  hydrateCompletionBadge();

  /* Hydrate cross-links — coach + module suggestions */
  hydrateCompletionXlinks();
}

async function hydrateCompletionBadge() {
  var slot = document.getElementById('yk-completion-badge');
  if (!slot || typeof supabase === 'undefined') return;
  try {
    var res = await supabase
      .from('candidate_badges')
      .select('badge_id, awarded_at, badge_definitions(title, icon_key, badge_tier)')
      .order('awarded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!res.data || !res.data.badge_definitions) return;
    var b = res.data.badge_definitions;
    var tier = TIER_COLORS[b.badge_tier] || TIER_COLORS.base;
    /* BADGE_ICONS is a hardcoded constant containing only safe SVG strings — no user input, no XSS risk */
    var icon = BADGE_ICONS[b.icon_key] || BADGE_ICONS.rocket;
    slot.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:12px;margin-bottom:16px;background:' + tier.bg + ';border:1px solid ' + tier.border;
    var iconEl = document.createElement('span');
    iconEl.style.cssText = 'display:flex;align-items:center;color:' + tier.text;
    iconEl.innerHTML = icon; /* safe — BADGE_ICONS is hardcoded SVG, identical pattern to line 2898 */
    var titleEl = document.createElement('span');
    titleEl.style.cssText = 'font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:' + tier.text + ';font-weight:600';
    titleEl.textContent = b.title;
    var labelEl = document.createElement('span');
    labelEl.style.cssText = 'font-family:"DM Mono",monospace;font-size:9px;color:' + tier.text + ';opacity:.7;margin-left:auto';
    labelEl.textContent = 'SON ROZET';
    slot.appendChild(iconEl);
    slot.appendChild(titleEl);
    slot.appendChild(labelEl);
  } catch (e) { /* silent — badge display is best-effort */ }
}

function hydrateCompletionXlinks() {
  var slot = document.getElementById('yk-completion-xlinks');
  if (!slot || !S.activeComp) return;
  var comp = S.activeComp;
  var coachCat = COMP_TO_COACH_CATEGORY[comp] || null;
  var modulSlug = COMP_TO_MODULE_SLUG[comp] || null;
  if (!coachCat && !modulSlug) return;

  var hasCoach = false;
  var hasModule = false;
  var wrap = document.createElement('div');
  wrap.className = 'yk-xlinks';

  /* Coach card — check if we have a published post in that category */
  if (coachCat && _coachFeedPosts && _coachFeedPosts.length > 0) {
    var matchPost = null;
    for (var ci = 0; ci < _coachFeedPosts.length; ci++) {
      if (_coachFeedPosts[ci].category === coachCat) { matchPost = _coachFeedPosts[ci]; break; }
    }
    if (matchPost) {
      hasCoach = true;
      var coachCard = document.createElement('div');
      coachCard.className = 'yk-xlink';
      coachCard.innerHTML = '<div class="yk-xlink-icon navy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>'; /* safe — hardcoded SVG */
      var coachText = document.createElement('div');
      coachText.className = 'yk-xlink-text';
      var coachLabel = document.createElement('div');
      coachLabel.className = 'yk-xlink-label';
      coachLabel.textContent = 'UZMAN G\u00d6R\u00dc\u015e\u00dc';
      var coachTitle = document.createElement('div');
      coachTitle.className = 'yk-xlink-title';
      coachTitle.textContent = matchPost.title;
      coachText.appendChild(coachLabel);
      coachText.appendChild(coachTitle);
      coachCard.appendChild(coachText);
      coachCard.addEventListener('click', (function(post) {
        return function() {
          /* Navigate to Studio landing, then open coach detail */
          navigate('star_intro');
          setTimeout(function() {
            if (typeof openCoachDetail === 'function') {
              var isLiked = false; /* default — like state re-resolved inside detail */
              openCoachDetail(post, isLiked);
            }
          }, 350);
        };
      })(matchPost));
      wrap.appendChild(coachCard);
    }
  }

  /* Module card — check cached studio modules */
  if (modulSlug) {
    /* We don't have module cache readily available here, so fetch minimal data */
    if (typeof supabase !== 'undefined') {
      supabase
        .from('studio_modules')
        .select('id, title, slug, section, body_md, summary, duration_minutes, cover_image_url, cover_image_alt, cta_label, cta_url, module_type')
        .eq('slug', modulSlug)
        .eq('status', 'published')
        .maybeSingle()
        .then(function(res) {
          if (!res.data) return;
          var m = res.data;
          hasModule = true;
          var modCard = document.createElement('div');
          modCard.className = 'yk-xlink';
          modCard.innerHTML = '<div class="yk-xlink-icon verm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>'; /* safe — hardcoded SVG */
          var modText = document.createElement('div');
          modText.className = 'yk-xlink-text';
          var modLabel = document.createElement('div');
          modLabel.className = 'yk-xlink-label';
          modLabel.textContent = '\u0130LG\u0130L\u0130 E\u011e\u0130T\u0130M';
          var modTitle = document.createElement('div');
          modTitle.className = 'yk-xlink-title';
          modTitle.textContent = m.title;
          modText.appendChild(modLabel);
          modText.appendChild(modTitle);
          modCard.appendChild(modText);
          modCard.addEventListener('click', function() {
            navigate('star_intro');
            setTimeout(function() {
              if (typeof openStudioModule === 'function') openStudioModule(m);
            }, 350);
          });
          wrap.appendChild(modCard);
          slot.style.display = 'block';
        });
    }
  }

  /* Show slot if coach card was added synchronously */
  if (hasCoach) slot.style.display = 'block';
  slot.appendChild(wrap);
}

function bindSessionCompleteEvents() {
  /* Back nav at top */
  var backNavBtn = document.getElementById('yk-session-back');
  if (backNavBtn) backNavBtn.addEventListener('click', function() { navigate('lobby'); });

  /* Back to lobby (primary CTA) */
  var backBtn = document.getElementById('ig-back-lobby-session');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('lobby'); });

  /* New session (different role) */
  var newBtn = document.getElementById('ig-new-session');
  if (newBtn) newBtn.addEventListener('click', function() {
    /* Reset in-memory state first, then clear storage, then navigate.
       navigate() will saveSession() with the clean role_select state. */
    S.role = null;
    try { localStorage.removeItem('ht_studio_role'); } catch(e) {}
    S.comps = [];
    S.activeComp = null;
    S.activeCompIdx = 0;
    S.dealt = [];
    S.currentQ = 0;
    S.swapsUsed = 0;
    S.answeredCount = 0;
    S.drawerOpen = false;
    S.drawerTab = 'star';
    S.journalOpen = false;
    S.completedComps = [];
    S.totalAnswered = 0;
    S.totalSwaps = 0;
    clearSession();
    navigate('lobby');
  });
}

/* ════════════════════════════════════════════════
   LAZY LOADER (called by profil.html _doSwitchPanel)
   ════════════════════════════════════════════════ */

window._htLoadStudio = function() {
  if (_loaded) return;
  _loaded = true;
  injectCSS();
  var panel = document.getElementById('panel-mulakat');
  if (!panel) return;
  /* Safe: only hardcoded constant content is rendered */
  /* Safe: only hardcoded constant — no user input */
  panel.innerHTML = '<div id="ig-container" aria-live="polite"></div>';

  /* Preload journals from DB (async, non-blocking) */
  preloadJournalsFromDb();

  /* Resolve premium truth from DB profile data.
     Source: candidates.is_premium (migration 014) via _loadedDBData.profile.
     Feature flag: window._htStudioAiEnabled overrides for controlled testing. */
  if (typeof _loadedDBData !== 'undefined' && _loadedDBData && _loadedDBData.profile) {
    S.isPremium = _loadedDBData.profile.is_premium === true;
  }
  if (typeof window._htStudioAiEnabled !== 'undefined' && window._htStudioAiEnabled === true) {
    S.isPremium = true;
  }

  /* Returning user: restore session */
  if (loadSession()) {
    var validScreens = ['lobby', 'course_detail', 'practice', 'completion', 'session_complete'];
    if (validScreens.indexOf(S.screen) !== -1) {
      if (S.screen === 'course_detail' && !S.activeComp) {
        navigate('lobby');
        return;
      }
      if ((S.screen === 'practice' || S.screen === 'completion') && (!S.dealt || !S.dealt.length)) {
        navigate('lobby');
      } else {
        navigate(S.screen);
      }
      return;
    }
  }

  /* No session — restore saved role if any, then go to lobby */
  var savedRole = '';
  try { savedRole = localStorage.getItem('ht_studio_role') || ''; } catch(e) {}
  if (savedRole) {
    S.role = savedRole;
    var _b = getBridge();
    if (_b) S.comps = _b.ROLE_COMP_MAP[savedRole] || [];
  }
  navigate('lobby');
};

/* ── Teaser helper for Genel Bakis home surface ── */
/* Returns cached coach posts + liked set for read-only feed teaser */
window._htGenelCoachTeaser = function() {
  return { posts: _coachFeedPosts || [], likedSet: _coachLikedSet || {} };
};

/* Expose openCoachDetail so Genel home can trigger article detail */
window.openCoachDetail = openCoachDetail;

})();
