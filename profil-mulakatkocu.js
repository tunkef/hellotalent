/**
 * profil-mulakatkocu.js — Mülakat Koçu (Interview Coaching) Panel
 * 7-screen Mülakat Koçu flow: star_intro → role_select → lobby → competency_intro → practice → completion → session_complete
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
  intro: 'İş görüşmesi bir performanstır. Hazırlık yapan aday, yapmayana karşı her zaman avantajlıdır. STAR tekniği ile deneyimlerinizi yapılandırılmış, etkileyici ve akılda kalıcı şekilde anlatmayı öğrenin.',
  what: {
    title: 'STAR Tekniği Nedir?',
    desc: 'STAR, iş görüşmelerinde davranışsal soruları yapılandırılmış ve etkili biçimde yanıtlamak için kullanılan kanıtlanmış bir yöntemdir.',
    steps: [
      { letter: 'S', tr: 'Durum', en: 'Situation', desc: 'Karşılaştığınız durumu, zorluğu veya bağlamı tanımlayın. Görüşmeciyi sahneye çekin: neredeydiniz, ne oluyordu, neden önemliydi? Bağlamı kısa ama net tutun \u2014 bir veya iki cümle yeterlidir. Gereksiz detaylardan kaçının, sadece hikayenin anlaşılması için gerekli olan arka planı verin.' },
      { letter: 'T', tr: 'Görev', en: 'Task', desc: 'Bu durum içinde sizin spesifik sorumluluğunuzu veya hedefinizi açıklayın. Ekibin genel görevi değil, sizden beklenen çıktıyı netleştirin. Görüşmeci \u201Cbu kişinin rolü neydi?\u201D sorusuna net bir yanıt almalı. Tek cümle ideal, ancak karmaşık görevlerde iki cümleye uzayabilir.' },
      { letter: 'A', tr: 'Aksiyon', en: 'Action', desc: 'Görevi başarmak için attığınız somut adımları detaylandırın. Hem teknik becerileri (analiz, planlama, uygulama) hem de kişisel becerileri (iletişim, ikna, liderlik) dengeli biçimde vurgulayın. \u201CBiz\u201D yerine \u201Cben\u201D kullanarak kendi katkınızı netleştirin. Neden o yaklaşımı seçtiğinizi ve alternatiflerden neden vazgeçtiğinizi kısaca açıklayın. Üç ila beş cümle ideal uzunluktur.' },
      { letter: 'R', tr: 'Sonuç', en: 'Result', desc: 'Eylemlerinizin yarattığı somut sonucu ve etkiyi paylaşın. Mümkünse sonuçları rakamlarla destekleyin: yüzdelik artış, süre tasarrufu, müşteri memnuniyet puanı. Başarı kadar başarısızlıktan öğrendikleriniz de değerlidir \u2014 önemli olan dersler çıkarmış olmanızdır. Bir veya iki cümle.' }
    ],
    takeaway: {
      tr: 'Çıkarım',
      en: 'Takeaway',
      desc: 'Deneyimden ne öğrendiğinizi ve bu öğrenimin yeni rolde nasıl değer yaratacağını açıklayın. Bu ek adım, öz farkındalığınızı, gelişim odaklı yaklaşımınızı ve geçmiş deneyimleri geleceğe taşıma kapasitenizi gösterir. Görüşmeciyi \u201Cbu aday öğrenmeye açık ve gelişiyor\u201D sonucuna ulaştırır.'
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
    'Düşüncelerinizi yapılandırır, ilgili ve etkili detaylara odaklanmanızı sağlar',
    'Geçmiş başarılarınız ile gelecek iş sorumluluklarınız arasında doğrudan bağlantı kurar',
    'Somut ve ölçülebilir sonuçlar sunma kapasitenizi gösterir',
    'Öz farkındalık, duygusal zeka ve mesleki gelişimi ortaya koyar'
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
  completedComps: [],
  totalAnswered: 0,
  totalSwaps: 0
};

function resetState() {
  S.screen = 'star_intro';
  S.role = null;
  S.comps = [];
  S.isPremium = false;
  S.activeComp = null;
  S.activeCompIdx = 0;
  S.dealt = [];
  S.currentQ = 0;
  S.swapsUsed = 0;
  S.answeredCount = 0;
  S.starHintOpen = false;
  S.coachOpen = false;
  S.journalOpen = false;
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
   JOURNAL (Gelişim Günlüğü) — localStorage persistence
   ════════════════════════════════════════════════ */

var LS_JOURNAL_PREFIX = 'ht_journal_';

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

function saveJournalDraft(compCode, qText, fields) {
  try {
    var key = journalKey(compCode, qText);
    var data = {
      comp: compCode,
      qHash: journalHash(qText),
      s: fields.s || '',
      t: fields.t || '',
      a: fields.a || '',
      r: fields.r || '',
      takeaway: fields.takeaway || '',
      savedAt: Date.now()
    };
    /* Save if content exists; remove entry if all fields cleared */
    if (data.s || data.t || data.a || data.r || data.takeaway) {
      localStorage.setItem(key, JSON.stringify(data));
    } else {
      localStorage.removeItem(key);
    }
  } catch(e) {}
}

function loadJournalDraft(compCode, qText) {
  try {
    var raw = localStorage.getItem(journalKey(compCode, qText));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function countJournalDraftsForComp(compCode) {
  var count = 0;
  try {
    var prefix = LS_JOURNAL_PREFIX + compCode + '_';
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) {
        var raw = localStorage.getItem(k);
        if (raw) {
          var d = JSON.parse(raw);
          if (d.s || d.t || d.a || d.r || d.takeaway) count++;
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
  css += '.ig-star-cell .ig-sq-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:7.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;transition:all .25s;margin-top:2px}';
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
  css += '.ig-intro-wrap{max-width:640px;margin:0 auto;animation:igFadeIn .3s ease}';
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
  css += '.ig-journal-ai-hint{margin-top:12px;padding:10px 14px;background:rgba(30,45,94,.04);border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:10px;color:var(--text-muted,#6B7280);line-height:1.5;text-align:center}';

  /* Lobby draft badge */
  css += '.ig-lobby-badge-draft{background:rgba(30,45,94,.08);color:var(--navy,#1E2D5E)}';
  css += '.ig-lobby-badge-draft svg{width:12px;height:12px}';

  /* Landing screen (star_intro — Mülakat Koçu product landing) */
  css += '.ig-landing{animation:igFadeIn .3s ease}';

  /* Hero — navy gradient, full-width, editorial feel */
  css += '.ig-landing-hero{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border-radius:24px;padding:40px 32px 36px;color:#fff;text-align:center;margin-bottom:16px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06)}';
  css += '.ig-landing-hero::before{content:"";position:absolute;top:-40%;right:-20%;width:60%;height:120%;background:radial-gradient(ellipse,rgba(201,78,40,.1) 0%,transparent 70%);pointer-events:none}';
  css += '.ig-landing-hero::after{content:"";position:absolute;bottom:-30%;left:-15%;width:50%;height:100%;background:radial-gradient(ellipse,rgba(30,45,94,.3) 0%,transparent 60%);pointer-events:none}';
  css += '.ig-landing-badge{display:inline-flex;align-items:center;gap:6px;font-family:"DM Mono",monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:16px}';
  css += '.ig-landing-badge::before,.ig-landing-badge::after{content:"";width:20px;height:1px;background:rgba(255,255,255,.2)}';
  css += '.ig-landing-title{font-family:"Bricolage Grotesque",sans-serif;font-size:32px;font-weight:800;letter-spacing:-.5px;margin-bottom:10px;line-height:1.1}';
  css += '.ig-landing-subtitle{font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:rgba(255,255,255,.65);line-height:1.6;max-width:380px;margin:0 auto 28px}';
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
  css += '.ig-coach-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);transition:box-shadow .3s ease,transform .3s ease;cursor:pointer;display:flex;flex-direction:column}';
  css += '.ig-coach-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.08);transform:translateY(-2px)}';
  css += '.ig-coach-card-coach{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-bottom:6px}';
  css += '.ig-coach-card-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px;letter-spacing:-.1px;line-height:1.3}';
  css += '.ig-coach-card-excerpt{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-secondary,#4B5563);line-height:1.5;flex:1;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}';
  css += '.ig-coach-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle,#E5E3DF)}';
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
  css += '.ig-coach-detail-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}';
  css += '.ig-coach-detail-like{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;color:var(--text-muted,#6B7280);background:none;border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;padding:8px 16px;cursor:pointer;transition:all .2s}';
  css += '.ig-coach-detail-like:hover,.ig-coach-detail-like.liked{border-color:var(--verm,#C94E28);color:var(--verm,#C94E28)}';
  css += '.ig-coach-detail-like svg{width:16px;height:16px}';
  css += '.ig-coach-detail-bridge{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:10px;padding:10px 20px;cursor:pointer;transition:all .2s}';
  css += '.ig-coach-detail-bridge:hover{background:#b84420;transform:translateY(-1px)}';
  css += '.ig-coach-detail-bridge svg{width:16px;height:16px}';

  /* Coach feed responsive */
  css += '@media(max-width:768px){.ig-coach-feed-grid{grid-template-columns:1fr}.ig-coach-detail{max-width:100%;width:96%;padding:24px 20px;border-radius:16px}}';

  /* Locked comp preview (session_complete) */
  css += '.ig-locked-preview{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0}';
  css += '.ig-locked-tag{display:inline-flex;align-items:center;gap:4px;font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px}';
  css += '.ig-locked-tag svg{width:10px;height:10px;opacity:.5}';

  /* Responsive */
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
  css += '.ig-landing-grid{grid-template-columns:1fr}';
  css += '.ig-lcard.span-2{grid-column:1/-1}';
  css += '.ig-landing-star-grid{grid-template-columns:1fr}';
  css += '.ig-landing-title{font-size:24px}';
  css += '.ig-landing-hero{padding:28px 20px 24px;border-radius:16px}';
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

function renderStarIntro() {
  var d = STAR_CONTENT;
  var html = '';

  html += '<div class="ig-landing">';

  /* ── Hero card (outside grid, full-width, editorial) ── */
  html += '<div class="ig-landing-hero">';
  html += '<div class="ig-landing-badge">hellotalent.ai</div>';
  html += '<div class="ig-landing-title">M\u00FClakat Ko\u00E7u</div>';
  html += '<div class="ig-landing-subtitle">Yetkinlikleri \u00F6\u011Frenin, yetkinlik bazl\u0131 sorularla pratik yap\u0131n, yan\u0131t taslaklar\u0131n\u0131z\u0131 olu\u015Fturun.</div>';
  html += '<button class="ig-landing-cta" id="ig-start-practice">Ko\u00E7lu\u011Fa Ba\u015Flay\u0131n <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>';
  html += '</div>';

  /* ── Bento grid — asymmetric composition ── */
  html += '<div class="ig-landing-grid">';

  /* Row 1: Primary pillar (span 2) + proof stats (span 1) */
  html += '<div class="ig-lcard span-2">';
  html += '<div class="ig-lcard-icon verm">' + briefSVG + '</div>';
  html += '<div class="ig-lcard-title">Yetkinli\u011Fi \u00D6\u011Frenin</div>';
  html += '<div class="ig-lcard-desc">G\u00FC\u00E7l\u00FC sinyalleri, risk i\u015Faretlerini ve a\u015F\u0131r\u0131 kullan\u0131m tehlikelerini ke\u015Ffedin. M\u00FClakatta neyin arand\u0131\u011F\u0131n\u0131 anlay\u0131n.</div>';
  html += '</div>';

  html += '<div class="ig-lcard ig-lcard-proof">';
  html += '<div class="ig-proof-row"><div class="ig-proof-num">29</div><div class="ig-proof-label">yetkinlik</div></div>';
  html += '<div class="ig-proof-row"><div class="ig-proof-num">289</div><div class="ig-proof-label">yetkinlik bazl\u0131 soru</div></div>';
  html += '<div class="ig-proof-row"><div class="ig-proof-num">' + penSVG + '</div><div class="ig-proof-label">geli\u015Fim g\u00FCnl\u00FC\u011F\u00FC</div></div>';
  html += '</div>';

  /* Row 2: Practice (span 1) + Journal (span 1) + STAR ref (span 1) */
  html += '<div class="ig-lcard">';
  html += '<div class="ig-lcard-icon navy">' + coachSVG + '</div>';
  html += '<div class="ig-lcard-title">Sorular\u0131 \u00C7al\u0131\u015F\u0131n</div>';
  html += '<div class="ig-lcard-desc">Rol\u00FCn\u00FCze \u00F6zel sorularla pratik yap\u0131n, ko\u00E7luk kartlar\u0131yla ne arand\u0131\u011F\u0131n\u0131 g\u00F6r\u00FCn.</div>';
  html += '</div>';

  html += '<div class="ig-lcard">';
  html += '<div class="ig-lcard-icon green">' + penSVG + '</div>';
  html += '<div class="ig-lcard-title">G\u00FCnl\u00FC\u011F\u00FCn\u00FCz\u00FC Olu\u015Fturun</div>';
  html += '<div class="ig-lcard-desc">STAR+T taslaklar\u0131n\u0131z\u0131 kaydedin, g\u00F6r\u00FC\u015Fmeye haz\u0131r gidin.</div>';
  html += '</div>';

  /* STAR reference — direct grid child, collapsible */
  html += '<div class="ig-landing-star" id="ig-star-collapse">';
  html += '<div class="ig-landing-star-header" id="ig-star-toggle">';
  html += '<div class="ig-landing-star-badges">';
  html += '<div class="ig-landing-star-letter verm">S</div>';
  html += '<div class="ig-landing-star-letter navy">T</div>';
  html += '<div class="ig-landing-star-letter verm">A</div>';
  html += '<div class="ig-landing-star-letter navy">R</div>';
  html += '</div>';
  html += '<div class="ig-landing-star-label">STAR+T Nedir?</div>';
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

  html += '</div>'; /* close ig-landing-grid */

  /* ── Coach feed placeholder (hydrated async in bindStarIntroEvents) ── */
  html += '<div id="ig-coach-feed" class="ig-coach-feed" style="display:none;"></div>';

  /* ── Returning user skip ── */
  if (hasSeenStar()) {
    html += '<div class="ig-landing-skip"><button class="ig-landing-skip-link" id="ig-skip-star">Devam edin \u2192</button></div>';
  }

  html += '</div>';
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — ROLE SELECT (Screen 2)
   ════════════════════════════════════════════════ */

function renderRoleSelect() {
  var bridge = getBridge();
  var html = '';

  html += '<div class="ig-nav-pill" id="ig-back-star">' + arrowLeftSVG + ' M\u00FClakat Ko\u00E7u</div>';

  html += '<div class="g-hero"><div class="g-hero-inner"><div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:20px;font-weight:800;color:#fff;">Hedef Pozisyonunuzu Se\u00E7in</div></div></div>';

  html += '<div style="max-width:480px;margin:24px auto;text-align:center">';
  html += '<div class="ig-card ig-role-card">';
  html += '<div class="ig-role-label">Rol\u00FCn\u00FCze \u00F6zel m\u00FClakat prati\u011Fi</div>';
  html += '<div class="ig-role-desc">Hedef pozisyonunuzu se\u00E7in, o role ait yetkinlik bazl\u0131 sorularla pratik yap\u0131n.</div>';

  if (bridge) {
    var roleKeys = Object.keys(bridge.ROLE_COMP_MAP).sort(function(a,b){ return a.localeCompare(b,'tr'); });
    html += '<div style="display:flex;gap:10px;align-items:stretch;justify-content:center;max-width:400px;margin:16px auto 0;">';
    html += '<select class="ig-role-select" id="ig-role-dd" style="flex:1;min-width:0;margin:0;height:auto;padding:10px 36px 10px 14px;">';
    html += '<option value="">Pozisyon se\u00E7in...</option>';
    for (var i = 0; i < roleKeys.length; i++) {
      html += '<option value="' + roleKeys[i] + '">' + roleKeys[i] + '</option>';
    }
    html += '</select>';
    html += '<button type="button" id="ig-role-start" style="flex-shrink:0;height:44px;padding:0 24px;border:none;border-radius:10px;background:var(--verm,#C94E28);color:#fff;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .2s;white-space:nowrap;">Ba\u015Fla</button>';
    html += '</div>';
  } else {
    html += '<div class="ig-section-desc">Yetkinlik verileri y\u00FCklenirken bekleyin...</div>';
  }

  html += '</div></div>';
  return html;
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

function renderCompetencyIntro() {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc">Veri y\u00FCklenemedi.</div>';

  var code = S.activeComp;
  var compName = bridge.COMP_NAMES[code] || code;
  var kf = bridge.COMP_KF[code] || '';
  var anchors = bridge.ANCHORS || {};
  var a = anchors[code] || {};
  var def = a.def || '';
  var why = truncateWhy(a.why || '');
  var PREVIEW = 2;

  var html = '';

  html += '<div class="ig-intro-wrap">';

  html += '<div class="ig-nav-pill" id="ig-back-lobby-intro">' + arrowLeftSVG + ' Yetkinlikler</div>';

  /* Hero */
  html += '<div class="ig-intro-hero">';
  html += '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:rgba(255,255,255,.5);letter-spacing:.5px;margin-bottom:6px;text-transform:uppercase">M\u00FClakat Ko\u00E7u</div>';
  html += '<div class="ig-intro-comp-name">' + compName + '</div>';
  if (kf) html += '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:rgba(255,255,255,.4);letter-spacing:.4px;margin-bottom:8px">' + kf + '</div>';
  if (def) html += '<div class="ig-intro-comp-def">' + def + '</div>';
  html += '</div>';

  /* Why this matters */
  if (why) {
    html += '<div class="ig-intro-why">';
    html += '<div class="ig-intro-why-title">' + briefSVG + ' Neden \u00D6nemli?</div>';
    html += '<div class="ig-intro-why-text">' + why + '</div>';
    html += '</div>';
  }

  /* Signal cards — 2x2 grid + overuse full-width */
  html += '<div class="ig-intro-signals">';

  /* Güçlü Sinyaller */
  if (a.skilled && a.skilled.length) {
    html += '<div class="ig-intro-signal-card">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-strong"></div><div class="ig-coach-label">G\u00FC\u00E7l\u00FC Sinyaller</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var si = 0; si < Math.min(PREVIEW, a.skilled.length); si++) {
      html += '<li class="ig-coach-bullet">' + a.skilled[si] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Risk Sinyalleri */
  if (a.lessskilled && a.lessskilled.length) {
    html += '<div class="ig-intro-signal-card">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-risk"></div><div class="ig-coach-label">Risk Sinyalleri</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var ri = 0; ri < Math.min(PREVIEW, a.lessskilled.length); ri++) {
      html += '<li class="ig-coach-bullet">' + a.lessskilled[ri] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Aşırı Kullanım */
  if (a.overused && a.overused.length) {
    html += '<div class="ig-intro-signal-card ig-intro-signal-full">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-over"></div><div class="ig-coach-label">A\u015F\u0131r\u0131 Kullan\u0131m</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var oi = 0; oi < Math.min(PREVIEW, a.overused.length); oi++) {
      html += '<li class="ig-coach-bullet">' + a.overused[oi] + '</li>';
    }
    html += '</ul></div>';
  }

  html += '</div>'; /* signals grid */

  /* STAR+T coaching block */
  html += '<div class="ig-intro-star-block">';
  html += '<div class="ig-intro-star-title">' + starSVG + ' STAR+T ile Haz\u0131rlan\u0131n</div>';
  html += '<div class="ig-intro-star-text">Bu yetkinli\u011Fe dair sorularda ya\u015Fad\u0131\u011F\u0131n\u0131z ger\u00E7ek bir deneyimi STAR+T yap\u0131s\u0131yla anlat\u0131n. Durumu (\u201CS\u201D), g\u00F6revinizi (\u201CT\u201D), att\u0131\u011F\u0131n\u0131z somut ad\u0131mlar\u0131 (\u201CA\u201D), ula\u015Ft\u0131\u011F\u0131n\u0131z sonucu (\u201CR\u201D) ve bu deneyimden ne \u00F6\u011Frendi\u011Finizi (\u201C+T\u201D) payla\u015F\u0131n.</div>';
  html += '<div class="ig-intro-star-letters">';
  var starColors = ['var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--verm,#C94E28)', 'var(--navy,#1E2D5E)', 'var(--navy,#1E2D5E)'];
  var starLabels = ['S', 'T', 'A', 'R', '+T'];
  for (var sl = 0; sl < 5; sl++) {
    html += '<div class="ig-intro-star-badge" style="background:' + starColors[sl] + '">' + starLabels[sl] + '</div>';
  }
  html += '</div>';
  html += '</div>';

  /* CTA row */
  html += '<div class="ig-intro-cta-row">';
  html += '<button class="ig-btn ig-btn-swap" id="ig-intro-back" style="border:1px solid var(--border-subtle,#E5E3DF) !important">' + arrowLeftSVG + ' Yetkinliklere D\u00F6n\u00FCn</button>';
  html += '<button class="ig-btn ig-btn-answered" id="ig-intro-start" style="padding:12px 28px;font-size:14px">\u0130lk Soruyu A\u00E7\u0131n \u2192</button>';
  html += '</div>';

  html += '</div>'; /* intro-wrap */
  return html;
}

/* ════════════════════════════════════════════════
   RENDER — LOBBY (Screen 3)
   ════════════════════════════════════════════════ */

function renderLobby() {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc">Veri y\u00FCklenemedi.</div>';

  var comps = S.comps;
  var freeLimit = S.isPremium ? comps.length : FREE_COMP_LIMIT;
  var completedCount = S.completedComps.length;
  var accessibleCount = Math.min(freeLimit, comps.length);
  var anchors = bridge.ANCHORS || {};
  var html = '';

  html += '<div class="ig-nav-pill" id="ig-back-role">' + arrowLeftSVG + ' Pozisyon Se\u00E7imi</div>';

  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:12px">';
  html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:20px;font-weight:800;color:var(--text-primary,#111)">' + S.role + '</div>';
  html += '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px">' + comps.length + ' yetkinlik</div>';
  html += '</div>';

  /* Progress strip */
  if (completedCount > 0 || accessibleCount > 1) {
    var pct = accessibleCount > 0 ? Math.round((completedCount / accessibleCount) * 100) : 0;
    html += '<div class="ig-progress-strip">';
    html += '<div class="ig-progress-bar"><div class="ig-progress-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="ig-progress-text">' + completedCount + ' / ' + accessibleCount + '</div>';
    html += '</div>';
  }

  html += '<div class="ig-bento">';
  for (var i = 0; i < comps.length; i++) {
    var code = comps[i];
    var name = bridge.COMP_NAMES[code] || code;
    var kf = bridge.COMP_KF[code] || '';
    var def = (anchors[code] && anchors[code].def) ? anchors[code].def : '';
    var isLocked = i >= freeLimit;
    var isCompleted = S.completedComps.indexOf(code) !== -1;
    var qCount = flattenQuestions(code).length;
    var practiceCount = S.isPremium ? qCount : Math.min(FREE_Q_PER_COMP, qCount);

    if (isLocked) {
      html += '<div class="ig-lobby-card ig-q-locked" style="animation-delay:' + (i * 0.06) + 's">';
      html += '<div class="ig-q-inner">';
      html += '<div class="ig-lobby-comp-name">' + name + '</div>';
      html += '<div class="ig-lobby-comp-kf">' + kf + '</div>';
      if (def) html += '<div class="ig-lobby-comp-def">' + def + '</div>';
      html += '<div class="ig-lobby-comp-meta">' + qCount + ' soru</div>';
      html += '</div>';
      html += '<div class="ig-q-lock-overlay">';
      html += '<div class="ig-q-lock-icon">' + lockSVG + '</div>';
      html += '<div class="ig-q-lock-text">Bu yetkinli\u011Fe eri\u015Fmek i\u00E7in Premium\u2019a ge\u00E7in</div>';
      html += '<button class="ig-q-lock-cta">T\u00FCm Yetkinlikleri A\u00E7</button>';
      html += '</div>';
      html += '</div>';
    } else {
      html += '<div class="ig-lobby-card' + (isCompleted ? ' ig-completed' : '') + '" data-comp="' + code + '" data-idx="' + i + '" style="animation-delay:' + (i * 0.06) + 's">';
      html += '<div class="ig-lobby-comp-name">' + name + '</div>';
      html += '<div class="ig-lobby-comp-kf">' + kf + '</div>';
      if (def) html += '<div class="ig-lobby-comp-def">' + def + '</div>';
      html += '<div class="ig-lobby-comp-meta">' + practiceCount + ' soru ile pratik yap\u0131n</div>';
      var draftCount = countJournalDraftsForComp(code);
      if (isCompleted) {
        html += '<div class="ig-lobby-badge ig-lobby-badge-done">' + checkSVG + ' Tamamland\u0131</div>';
      }
      if (draftCount > 0) {
        html += '<div class="ig-lobby-badge ig-lobby-badge-draft">' + penSVG + ' ' + draftCount + ' taslak</div>';
      }
      html += '</div>';
    }
  }
  html += '</div>';

  return html;
}

/* ════════════════════════════════════════════════
   RENDER — PRACTICE (Screen 4)
   ════════════════════════════════════════════════ */

function renderPractice() {
  var bridge = getBridge();
  if (!bridge || !S.dealt.length) return '<div class="ig-section-desc">Soru bulunamad\u0131.</div>';

  var compName = bridge.COMP_NAMES[S.activeComp] || S.activeComp;
  var anchors = bridge.ANCHORS || {};
  var compDef = (anchors[S.activeComp] && anchors[S.activeComp].def) ? anchors[S.activeComp].def : '';
  var q = S.dealt[S.currentQ];
  var maxSwaps = S.isPremium ? 999 : FREE_SWAP_LIMIT;
  var swapsLeft = Math.max(0, maxSwaps - S.swapsUsed);
  var freeLimit = S.isPremium ? S.comps.length : FREE_COMP_LIMIT;
  var accessibleCount = Math.min(freeLimit, S.comps.length);
  /* Which accessible comp number is this? */
  var compOrder = 0;
  for (var ci = 0; ci < S.comps.length && ci < freeLimit; ci++) {
    if (S.comps[ci] === S.activeComp) { compOrder = ci + 1; break; }
  }
  var html = '';

  html += '<div class="ig-practice-wrap">';

  html += '<div class="ig-nav-pill" id="ig-back-lobby">' + arrowLeftSVG + ' Yetkinlikler</div>';

  html += '<div class="ig-practice-header">';
  html += '<div style="flex:1;min-width:0">';
  html += '<div class="ig-practice-comp">' + compName + '</div>';
  if (compDef) html += '<div class="ig-practice-def">' + compDef + '</div>';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">';
  if (accessibleCount > 1) html += '<div class="ig-session-progress">Yetkinlik ' + compOrder + '/' + accessibleCount + '</div>';
  html += '<div class="ig-practice-progress">' + (S.currentQ + 1) + ' / ' + S.dealt.length + '</div>';
  html += '</div>';
  html += '</div>';

  /* Question card */
  html += '<div class="ig-q-focus">';
  html += '<div class="ig-q-theme">' + q.theme + '</div>';
  html += '<div class="ig-q-text">\u201C' + q.text + '\u201D</div>';

  /* Actions */
  html += '<div class="ig-q-actions">';

  /* Değiştir */
  if (swapsLeft > 0) {
    html += '<button class="ig-btn ig-btn-swap" id="ig-swap">' + swapSVG + ' De\u011Fi\u015Ftir <span style="font-size:10px;opacity:.6">(' + swapsLeft + ')</span></button>';
  } else {
    html += '<button class="ig-btn ig-btn-swap disabled" disabled>' + swapSVG + ' De\u011Fi\u015Ftir</button>';
  }

  /* STAR İpucu */
  html += '<button class="ig-btn ig-btn-star' + (S.starHintOpen ? ' active' : '') + '" id="ig-star-hint">' + starSVG + ' STAR \u0130pucu</button>';

  /* Coaching toggle */
  html += '<button class="ig-btn ig-btn-coach' + (S.coachOpen ? ' active' : '') + '" id="ig-coach-toggle">' + coachSVG + ' Ne Aran\u0131r?</button>';

  /* Yanıtladım */
  html += '<button class="ig-btn ig-btn-answered" id="ig-answered">' + checkSVG + ' Yan\u0131tlad\u0131m</button>';

  html += '</div>'; /* actions */

  /* Swap exhaustion premium nudge */
  if (!S.isPremium && swapsLeft === 0) {
    html += '<div class="ig-swap-nudge">';
    html += '<div class="ig-swap-nudge-text">De\u011Fi\u015Ftirme hakk\u0131n\u0131z doldu. <strong>Premium</strong> ile s\u0131n\u0131rs\u0131z soru de\u011Fi\u015Ftirme.</div>';
    html += '<button class="ig-swap-nudge-cta ig-q-lock-cta" style="font-size:11px;padding:5px 16px;margin-top:8px">Premium\u2019a Ge\u00E7</button>';
    html += '</div>';
  }

  /* STAR hint panel (conditionally shown) */
  if (S.starHintOpen) {
    html += renderStarHintPanel();
  }

  /* Coach panel (conditionally shown) */
  if (S.coachOpen) {
    html += renderCoachPanel();
  }

  html += '</div>'; /* q-focus */

  /* Journal (Gelişim Günlüğü) — below the question card */
  html += renderJournalPanel();

  html += '</div>'; /* practice-wrap */
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
  html += '<button class="ig-journal-toggle' + (S.journalOpen ? ' active' : '') + '" id="ig-journal-toggle">';
  html += journalSVG;
  html += '<div class="ig-journal-toggle-label">Geli\u015Fim G\u00FCnl\u00FC\u011F\u00FC' + (hasDraft && !S.journalOpen ? ' <span style="font-size:10px;font-weight:400;color:var(--text-muted,#6B7280)">(taslak var)</span>' : '') + '</div>';
  html += '<div class="ig-journal-toggle-hint">' + (S.journalOpen ? '' : 'Yan\u0131t\u0131n\u0131z\u0131 haz\u0131rlay\u0131n') + '</div>';
  html += '<div class="ig-journal-toggle-arrow">\u25BC</div>';
  html += '</button>';

  /* Body (only if open) */
  if (S.journalOpen) {
    html += '<div class="ig-journal-body">';
    html += '<div class="ig-journal-intro">Bu soruya haz\u0131rlan\u0131rken deneyimlerinizi STAR+T yap\u0131s\u0131yla not edin. Notlar\u0131n\u0131z otomatik kaydedilir ve istedikten sonra tekrar g\u00F6zden ge\u00E7irebilirsiniz.</div>';

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

    html += '<div class="ig-journal-ai-hint">Yak\u0131nda: Yapay zeka ko\u00E7unuz bu yan\u0131t\u0131 de\u011Ferlendirecek ve g\u00FC\u00E7l\u00FC / zay\u0131f sinyalleri belirleyecek.</div>';

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
  html += '<div class="ig-star-hint-title">STAR ile Yan\u0131tla</div>';
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
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-strong"></div><div class="ig-coach-label">G\u00FC\u00E7l\u00FC Sinyaller</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var si = 0; si < Math.min(COACH_PREVIEW, a.skilled.length); si++) {
      html += '<li class="ig-coach-bullet">' + a.skilled[si] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Risk Sinyalleri */
  if (a.lessskilled && a.lessskilled.length) {
    html += '<div class="ig-coach-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-risk"></div><div class="ig-coach-label">Risk Sinyalleri</div></div>';
    html += '<ul class="ig-coach-bullets">';
    for (var ri = 0; ri < Math.min(COACH_PREVIEW, a.lessskilled.length); ri++) {
      html += '<li class="ig-coach-bullet">' + a.lessskilled[ri] + '</li>';
    }
    html += '</ul></div>';
  }

  /* Aşırı Kullanım */
  if (a.overused && a.overused.length) {
    html += '<div class="ig-coach-section">';
    html += '<div class="ig-coach-header"><div class="ig-coach-dot ig-coach-dot-over"></div><div class="ig-coach-label">A\u015F\u0131r\u0131 Kullan\u0131m</div></div>';
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

  html += '<div class="ig-completion">';
  html += '<div class="ig-completion-icon">' + checkSVG + '</div>';
  html += '<div class="ig-completion-title">' + compName + ' Tamamland\u0131</div>';
  html += '<div class="ig-completion-desc">' + S.answeredCount + ' soru yan\u0131tland\u0131' + (S.swapsUsed > 0 ? ', ' + S.swapsUsed + ' soru de\u011Fi\u015Ftirildi' : '') + '.</div>';
  var compDrafts = countJournalDraftsForComp(S.activeComp);
  var draftCopy = compDrafts > 0
    ? 'Bu yetkinlik i\u00E7in ' + compDrafts + ' taslak yan\u0131t kaydettiniz \u2014 i\u015F g\u00F6r\u00FC\u015Fmesi \u00F6ncesi tekrar g\u00F6zden ge\u00E7irebilirsiniz.'
    : 'Haz\u0131rl\u0131k yapmak fark yarat\u0131r \u2014 bu yetkinli\u011Fi pratik ederek bir ad\u0131m \u00F6ndesiniz.';
  html += '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:12px;color:var(--text-muted,#6B7280);line-height:1.5;max-width:360px;margin:0 auto 8px">' + draftCopy + '</div>';

  html += '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:16px">';
  html += '<button class="ig-btn ig-btn-swap" id="ig-restart-comp" style="border:1px solid var(--border-subtle,#E5E3DF) !important">Tekrar Pratik Yap\u0131n</button>';

  if (allAccessibleDone) {
    html += '<button class="ig-btn ig-btn-answered" id="ig-session-complete">Oturumu Tamamla \u2192</button>';
  } else {
    html += '<button class="ig-btn ig-btn-answered" id="ig-back-lobby-comp">Sonraki Yetkinlik \u2192</button>';
  }
  html += '</div>';

  html += '</div>';
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

  html += '<div class="ig-completion">';
  html += '<div class="ig-completion-icon">' + trophySVG + '</div>';
  html += '<div class="ig-completion-title">Tebrikler!</div>';
  html += '<div class="ig-completion-desc"><strong>' + S.role + '</strong> pozisyonu i\u00E7in \u00FCcretsiz m\u00FClakat prati\u011Fini tamamlad\u0131n\u0131z.</div>';

  html += '<div class="ig-completion-stats">';
  html += '<div class="ig-stat"><div class="ig-stat-num">' + S.completedComps.length + '</div><div class="ig-stat-label">Yetkinlik</div></div>';
  html += '<div class="ig-stat"><div class="ig-stat-num">' + S.totalAnswered + '</div><div class="ig-stat-label">Yan\u0131tlanan</div></div>';
  html += '<div class="ig-stat"><div class="ig-stat-num">' + S.totalSwaps + '</div><div class="ig-stat-label">De\u011Fi\u015Ftirilen</div></div>';
  html += '</div>';

  /* Premium upsell — the main moment */
  if (!S.isPremium && lockedCount > 0) {
    html += '<div style="margin-top:24px;text-align:center;background:var(--bg-muted,#F7F6F4);border:1px solid rgba(201,78,40,.15);border-radius:16px;padding:24px">';
    html += '<div style="font-family:\'Bricolage Grotesque\',sans-serif;font-size:17px;font-weight:800;margin-bottom:8px">' + lockedCount + ' yetkinlik daha sizi bekliyor</div>';
    html += '<div class="ig-section-desc" style="margin-bottom:10px"><strong>' + S.role + '</strong> m\u00FClakat\u0131nda de\u011Ferlendirilecek ' + S.comps.length + ' yetkinli\u011Fin tamam\u0131na haz\u0131rlan\u0131n.</div>';

    /* Show up to 3 locked competency names as preview tags */
    var lockedNames = [];
    for (var li = freeLimit; li < S.comps.length && lockedNames.length < 3; li++) {
      var ln = bridge ? (bridge.COMP_NAMES[S.comps[li]] || S.comps[li]) : S.comps[li];
      lockedNames.push(ln);
    }
    if (lockedNames.length > 0) {
      html += '<div class="ig-locked-preview">';
      for (var lt = 0; lt < lockedNames.length; lt++) {
        html += '<span class="ig-locked-tag">' + lockSVG + ' ' + lockedNames[lt] + '</span>';
      }
      if (lockedCount > 3) html += '<span class="ig-locked-tag">+' + (lockedCount - 3) + ' daha</span>';
      html += '</div>';
    }

    html += '<div class="ig-section-desc" style="font-size:11px;margin-bottom:14px;color:var(--text-muted,#6B7280)">S\u0131n\u0131rs\u0131z soru de\u011Fi\u015Ftirme \u00B7 T\u00FCm yetkinlikler \u00B7 Geli\u015Fim G\u00FCnl\u00FC\u011F\u00FC \u00B7 AI Ko\u00E7luk (yak\u0131nda)</div>';
    html += '<button class="ig-q-lock-cta" style="padding:10px 28px;font-size:14px">Premium\u2019a Ge\u00E7</button>';
    html += '</div>';
  }

  html += '<div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:20px">';
  html += '<button class="ig-btn ig-btn-swap" id="ig-back-lobby-session" style="border:1px solid var(--border-subtle,#E5E3DF) !important">' + arrowLeftSVG + ' Yetkinliklere D\u00F6n\u00FCn</button>';
  html += '<button class="ig-btn ig-btn-star" id="ig-new-session">Farkl\u0131 Rol Se\u00E7in</button>';
  html += '</div>';

  html += '</div>';
  return html;
}

/* ════════════════════════════════════════════════
   COACH FEED — Koclardan Ogren
   Async hydration for star_intro landing.
   Queries coach_posts (published) + coach_post_likes (own, via RLS).
   All innerHTML from hardcoded SVG constants — no user input, no XSS risk.
   ════════════════════════════════════════════════ */

var _coachFeedLoaded = false;

var COACH_CATEGORY_LABELS = {
  mulakat_ipucu: 'M\u00FClakat \u0130pucu',
  yetkinlik_rehberi: 'Yetkinlik Rehberi',
  kariyer_hikaye: 'Kariyer Hikayesi',
  sektor_analiz: 'Sekt\u00F6r Analizi'
};

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
    /* Fetch published posts with coach info */
    var postsRes = await supabase
      .from('coach_posts')
      .select('id, title, excerpt, category, like_count, related_role, related_competency_code, body, coach_profiles(display_name, title)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(6);

    var posts = (postsRes.data && postsRes.data.length) ? postsRes.data : [];
    if (posts.length === 0) return; /* No published posts — keep feed hidden */

    /* Fetch candidate's own likes — RLS returns only own rows */
    var postIds = posts.map(function(p) { return p.id; });
    var likesRes = await supabase
      .from('coach_post_likes')
      .select('post_id')
      .in('post_id', postIds);

    var likedSet = {};
    if (likesRes.data) {
      for (var li = 0; li < likesRes.data.length; li++) {
        likedSet[likesRes.data[li].post_id] = true;
      }
    }

    /* Build feed DOM */
    while (feedEl.firstChild) feedEl.removeChild(feedEl.firstChild);

    /* Header */
    var header = document.createElement('div');
    header.className = 'ig-coach-feed-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'ig-coach-feed-title';
    titleEl.textContent = 'Ko\u00E7lardan \u00D6\u011Fren';
    header.appendChild(titleEl);
    var subEl = document.createElement('div');
    subEl.className = 'ig-coach-feed-sub';
    subEl.textContent = 'Deneyimli ko\u00E7lardan m\u00FClakat ve kariyer ipuclar\u0131';
    header.appendChild(subEl);
    feedEl.appendChild(header);

    /* Grid */
    var grid = document.createElement('div');
    grid.className = 'ig-coach-feed-grid';

    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      var card = buildCoachCard(post, !!likedSet[post.id]);
      grid.appendChild(card);
    }

    feedEl.appendChild(grid);
    feedEl.style.display = '';

  } catch (e) {
    console.error('Coach feed load error:', e);
  }
}

function buildCoachCard(post, isLiked) {
  var card = document.createElement('div');
  card.className = 'ig-coach-card';
  card.setAttribute('data-post-id', post.id);

  var coachName = (post.coach_profiles && post.coach_profiles.display_name) || '';
  var coachTitle = (post.coach_profiles && post.coach_profiles.title) || '';
  var coachLabel = coachName + (coachTitle ? ' \u00B7 ' + coachTitle : '');

  var coachEl = document.createElement('div');
  coachEl.className = 'ig-coach-card-coach';
  coachEl.textContent = coachLabel;
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

  /* Practice bridge CTA — uses verified existing functions only */
  var bridge = getBridge();
  if (post.related_role && bridge && bridge.ROLE_COMP_MAP && bridge.ROLE_COMP_MAP[post.related_role]) {
    /* related_role is valid ROLE_COMP_MAP key → use startSession (safe) */
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
  } else if (post.related_competency_code) {
    /* No valid role → guide user to role_select first (safe) */
    var bridgeBtn2 = document.createElement('button');
    bridgeBtn2.className = 'ig-coach-detail-bridge';
    bridgeBtn2.textContent = 'Bu yetkinli\u011Fi ke\u015Ffet';
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
  S.screen = screen;

  /* All innerHTML content from hardcoded constants — safe from XSS */
  if (screen === 'star_intro') {
    _coachFeedLoaded = false; /* Reset so feed re-hydrates on return */
    container.innerHTML = renderStarIntro();
    bindStarIntroEvents();
  } else if (screen === 'role_select') {
    container.innerHTML = renderRoleSelect();
    bindRoleSelectEvents();
  } else if (screen === 'lobby') {
    container.innerHTML = renderLobby();
    bindLobbyEvents();
  } else if (screen === 'competency_intro') {
    container.innerHTML = renderCompetencyIntro();
    bindCompetencyIntroEvents();
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

function bindStarIntroEvents() {
  /* Start coaching CTA */
  var startBtn = document.getElementById('ig-start-practice');
  if (startBtn) startBtn.addEventListener('click', function() {
    markStarSeen();
    navigate('role_select');
  });

  /* STAR collapsible toggle */
  var starToggle = document.getElementById('ig-star-toggle');
  var starCollapse = document.getElementById('ig-star-collapse');
  if (starToggle && starCollapse) {
    starToggle.addEventListener('click', function() {
      starCollapse.classList.toggle('open');
    });
  }

  /* Skip link (returning users) */
  var skipBtn = document.getElementById('ig-skip-star');
  if (skipBtn) skipBtn.addEventListener('click', function() {
    navigate('role_select');
  });

  /* Coach feed — async hydration after landing is mounted */
  hydrateCoachFeed();
}

function bindRoleSelectEvents() {
  /* Back to STAR */
  var backBtn = document.getElementById('ig-back-star');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('star_intro'); });

  /* Role start */
  var dd = document.getElementById('ig-role-dd');
  var startBtn = document.getElementById('ig-role-start');
  if (startBtn) startBtn.addEventListener('click', function() {
    if (dd && dd.value) {
      startSession(dd.value);
    }
  });
}

function startSession(role) {
  var bridge = getBridge();
  if (!bridge) return;
  S.role = role;
  S.comps = bridge.ROLE_COMP_MAP[role] || [];
  S.activeComp = null;
  S.activeCompIdx = 0;
  S.dealt = [];
  S.currentQ = 0;
  S.swapsUsed = 0;
  S.answeredCount = 0;
  S.starHintOpen = false;
  S.coachOpen = false;
  S.journalOpen = false;
  S.completedComps = [];
  S.totalAnswered = 0;
  S.totalSwaps = 0;
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
  S.starHintOpen = false;
  S.coachOpen = false;
  S.journalOpen = false;
  navigate('practice');
}

function bindLobbyEvents() {
  /* Back to role select */
  var backBtn = document.getElementById('ig-back-role');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('role_select'); });

  /* Comp card clicks — go to competency intro first */
  var cards = document.querySelectorAll('.ig-lobby-card[data-comp]');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      var code = this.getAttribute('data-comp');
      var idx = parseInt(this.getAttribute('data-idx'), 10);
      S.activeComp = code;
      S.activeCompIdx = idx;
      navigate('competency_intro');
    });
  });
}

function bindCompetencyIntroEvents() {
  /* Back to lobby */
  var backBtn = document.getElementById('ig-back-lobby-intro');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('lobby'); });

  var backBtn2 = document.getElementById('ig-intro-back');
  if (backBtn2) backBtn2.addEventListener('click', function() { navigate('lobby'); });

  /* Start practice */
  var startBtn = document.getElementById('ig-intro-start');
  if (startBtn) startBtn.addEventListener('click', function() {
    startPractice(S.activeComp, S.activeCompIdx);
  });
}

function bindPracticeEvents() {
  /* Back to lobby */
  var backBtn = document.getElementById('ig-back-lobby');
  if (backBtn) backBtn.addEventListener('click', function() { flushJournal(); navigate('lobby'); });

  /* Swap */
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

  /* STAR hint toggle */
  var starBtn = document.getElementById('ig-star-hint');
  if (starBtn) starBtn.addEventListener('click', function() {
    flushJournal();
    S.starHintOpen = !S.starHintOpen;
    navigate('practice');
  });

  /* Coach panel toggle */
  var coachBtn = document.getElementById('ig-coach-toggle');
  if (coachBtn) coachBtn.addEventListener('click', function() {
    flushJournal();
    S.coachOpen = !S.coachOpen;
    navigate('practice');
  });

  /* Journal toggle */
  var journalBtn = document.getElementById('ig-journal-toggle');
  if (journalBtn) journalBtn.addEventListener('click', function() {
    flushJournal();
    S.journalOpen = !S.journalOpen;
    navigate('practice');
    /* Focus first textarea if opening */
    if (S.journalOpen) {
      setTimeout(function() {
        var first = document.querySelector('.ig-journal-textarea');
        if (first) first.focus();
      }, 100);
    }
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
          indicator.textContent = 'Kaydedildi';
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

  /* Answered */
  var answeredBtn = document.getElementById('ig-answered');
  if (answeredBtn) answeredBtn.addEventListener('click', function() {
    flushJournal();
    addRecentQuestion(S.dealt[S.currentQ].text);
    S.answeredCount++;
    S.totalAnswered++;
    S.starHintOpen = false;
    S.coachOpen = false;
    S.journalOpen = false;

    if (S.currentQ < S.dealt.length - 1) {
      S.currentQ++;
      navigate('practice');
    } else {
      S.totalSwaps += S.swapsUsed;
      if (S.completedComps.indexOf(S.activeComp) === -1) {
        S.completedComps.push(S.activeComp);
      }
      navigate('completion');
    }
  });
}

function bindCompletionEvents() {
  /* Back to lobby (next competency) */
  var backBtn = document.getElementById('ig-back-lobby-comp');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('lobby'); });

  /* Session complete */
  var sessionBtn = document.getElementById('ig-session-complete');
  if (sessionBtn) sessionBtn.addEventListener('click', function() { navigate('session_complete'); });

  /* Restart same comp */
  var restartBtn = document.getElementById('ig-restart-comp');
  if (restartBtn) restartBtn.addEventListener('click', function() {
    startPractice(S.activeComp, S.activeCompIdx);
  });
}

function bindSessionCompleteEvents() {
  /* Back to lobby */
  var backBtn = document.getElementById('ig-back-lobby-session');
  if (backBtn) backBtn.addEventListener('click', function() { navigate('lobby'); });

  /* New session (different role) */
  var newBtn = document.getElementById('ig-new-session');
  if (newBtn) newBtn.addEventListener('click', function() {
    /* Reset in-memory state first, then clear storage, then navigate.
       navigate() will saveSession() with the clean role_select state. */
    S.role = null;
    S.comps = [];
    S.activeComp = null;
    S.activeCompIdx = 0;
    S.dealt = [];
    S.currentQ = 0;
    S.swapsUsed = 0;
    S.answeredCount = 0;
    S.starHintOpen = false;
    S.coachOpen = false;
    S.journalOpen = false;
    S.completedComps = [];
    S.totalAnswered = 0;
    S.totalSwaps = 0;
    clearSession();
    navigate('role_select');
  });
}

/* ════════════════════════════════════════════════
   LAZY LOADER (called by profil.html _doSwitchPanel)
   ════════════════════════════════════════════════ */

window._htLoadMulakat = function() {
  if (_loaded) return;
  _loaded = true;
  injectCSS();
  var panel = document.getElementById('panel-mulakat');
  if (!panel) return;
  /* Safe: only hardcoded constant content is rendered */
  panel.innerHTML = '<div id="ig-container"></div>';

  /* Returning user: restore session or skip STAR intro */
  if (loadSession()) {
    /* Restored in-progress session — validate screen is renderable */
    var validScreens = ['star_intro', 'role_select', 'lobby', 'competency_intro', 'practice', 'completion', 'session_complete'];
    if (validScreens.indexOf(S.screen) !== -1) {
      /* For competency_intro, verify we have activeComp */
      if (S.screen === 'competency_intro' && !S.activeComp) {
        navigate(S.role ? 'lobby' : 'role_select');
        return;
      }
      /* For practice/completion, verify we have the data needed */
      if ((S.screen === 'practice' || S.screen === 'completion') && (!S.dealt || !S.dealt.length)) {
        navigate(S.role ? 'lobby' : 'role_select');
      } else {
        navigate(S.screen);
      }
      return;
    }
  }

  /* No session to restore — check if returning user */
  if (hasSeenStar()) {
    navigate('role_select');
  } else {
    navigate('star_intro');
  }
};

})();
