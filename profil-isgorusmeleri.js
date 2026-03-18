/**
 * profil-isgorusmeleri.js — Is Gorusmeleri (Interview Prep) Panel for profil.html
 * Bento grid layout, STAR technique education, role-based interview questions.
 * Depends on profil-yetkinlik.js bridge: window._htYetkinlikData
 * All innerHTML content comes from hardcoded constants — no user input, no XSS risk.
 */
(function(){
'use strict';

/* ════════════════════════════════════════════════
   DATA BRIDGE — from profil-yetkinlik.js
   ════════════════════════════════════════════════ */

var _bridge = null;
function getBridge() {
  if (!_bridge && window._htYetkinlikData) _bridge = window._htYetkinlikData;
  return _bridge;
}

/* ════════════════════════════════════════════════
   INTERVIEW QUESTIONS DATA — 29 competencies, 289 questions
   5 themes per competency, 2 questions per theme
   All content Turkish, retail-adapted.
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
    {theme:"Zorlukların üstesinden gelmek",q:["Zorlu bir görev veya durumla nasıl başa çıktığını anlat.","Olumsuz bir i\u015F deneyiminden nas\u0131l toparland\u0131\u011F\u0131na dair bir \u00F6rnek ver."]}
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
    {theme:"Yön belirlemek",q:["Başkalarını bir hedef belirleme sürecine dahil ettiğin bir zamanı anlat.","Liderlik pozisyonundayken i\u015F y\u00FCk\u00FCn\u00FC nas\u0131l organize etti\u011Fini, hedefleri nas\u0131l belirledi\u011Fini ve ekibinle nas\u0131l ileti\u015Fim kurdu\u011Funu anlat."]},
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
    {theme:"Tutarlı davranmak",q:["Söylediklerini uygulamanın zor olduğu bir durumu anlat.","S\u00F6yleneni veya bekleneni yapmak yerine kendi de\u011Ferlerine sad\u0131k kalmay\u0131 se\u00E7ti\u011Fin bir \u00F6rnek ver."]},
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
   STAR TECHNIQUE CONTENT (Turkish, retail-adapted)
   ════════════════════════════════════════════════ */

var STAR_CONTENT = {
  intro: '\u0130\u015F g\u00F6r\u00FC\u015Fmesi bir performanst\u0131r. Haz\u0131rl\u0131k yapan aday, yapmayana kar\u015F\u0131 her zaman avantajl\u0131d\u0131r. STAR tekni\u011Fi ile deneyimlerinizi yap\u0131land\u0131r\u0131lm\u0131\u015F, etkileyici ve ak\u0131lda kal\u0131c\u0131 \u015Fekilde anlatmay\u0131 \u00F6\u011Frenin.',
  what: {
    title: 'STAR Tekni\u011Fi Nedir?',
    desc: 'STAR, i\u015F g\u00F6r\u00FC\u015Fmelerinde davran\u0131\u015Fsal sorular\u0131 yap\u0131land\u0131r\u0131lm\u0131\u015F ve etkili bi\u00E7imde yan\u0131tlamak i\u00E7in kullan\u0131lan kan\u0131tlanm\u0131\u015F bir y\u00F6ntemdir.',
    steps: [
      { letter: 'S', tr: 'Durum', en: 'Situation', desc: 'Kar\u015F\u0131la\u015Ft\u0131\u011F\u0131n\u0131z durumu, zorlu\u011Fu veya ba\u011Flam\u0131 tan\u0131mlay\u0131n. G\u00F6r\u00FC\u015Fmeciyi sahneye \u00E7ekin: neredeydiniz, ne oluyordu, neden \u00F6nemliydi? Ba\u011Flam\u0131 k\u0131sa ama net tutun \u2014 bir veya iki c\u00FCmle yeterlidir. Gereksiz detaylardan ka\u00E7\u0131n\u0131n, sadece hikayenin anla\u015F\u0131lmas\u0131 i\u00E7in gerekli olan arka plan\u0131 verin.' },
      { letter: 'T', tr: 'G\u00F6rev', en: 'Task', desc: 'Bu durum i\u00E7inde sizin spesifik sorumlulu\u011Funuzu veya hedefinizi a\u00E7\u0131klay\u0131n. Ekibin genel g\u00F6revi de\u011Fil, sizden beklenen \u00E7\u0131kt\u0131y\u0131 netle\u015Ftirin. G\u00F6r\u00FC\u015Fmeci \u201Cbu ki\u015Finin rol\u00FC neydi?\u201D sorusuna net bir yan\u0131t almal\u0131. Tek c\u00FCmle ideal, ancak karma\u015F\u0131k g\u00F6revlerde iki c\u00FCmleye uzayabilir.' },
      { letter: 'A', tr: 'Aksiyon', en: 'Action', desc: 'G\u00F6revi ba\u015Farmak i\u00E7in att\u0131\u011F\u0131n\u0131z somut ad\u0131mlar\u0131 detayland\u0131r\u0131n. Hem teknik becerileri (analiz, planlama, uygulama) hem de ki\u015Fisel becerileri (ileti\u015Fim, ikna, liderlik) dengeli bi\u00E7imde vurgulay\u0131n. \u201CBiz\u201D yerine \u201Cben\u201D kullanarak kendi katk\u0131n\u0131z\u0131 netle\u015Ftirin. Neden o yakla\u015F\u0131m\u0131 se\u00E7ti\u011Finizi ve alternatiflerden neden vazge\u00E7ti\u011Finizi k\u0131saca a\u00E7\u0131klay\u0131n. \u00DC\u00E7 ila be\u015F c\u00FCmle ideal uzunluktur.' },
      { letter: 'R', tr: 'Sonu\u00E7', en: 'Result', desc: 'Eylemlerinizin yaratt\u0131\u011F\u0131 somut sonucu ve etkiyi payla\u015F\u0131n. M\u00FCmk\u00FCnse sonu\u00E7lar\u0131 rakamlarla destekleyin: y\u00FCzdelik art\u0131\u015F, s\u00FCre tasarrufu, m\u00FC\u015Fteri memnuniyet puan\u0131. Ba\u015Far\u0131 kadar ba\u015Far\u0131s\u0131zl\u0131ktan \u00F6\u011Frendikleriniz de de\u011Ferlidir \u2014 \u00F6nemli olan dersler \u00E7\u0131karm\u0131\u015F olman\u0131zd\u0131r. Bir veya iki c\u00FCmle.' }
    ],
    takeaway: {
      tr: '\u00C7\u0131kar\u0131m',
      en: 'Takeaway',
      desc: 'Deneyimden ne \u00F6\u011Frendi\u011Finizi ve bu \u00F6\u011Frenimin yeni rolde nas\u0131l de\u011Fer yarataca\u011F\u0131n\u0131 a\u00E7\u0131klay\u0131n. Bu ek ad\u0131m, \u00F6z fark\u0131ndal\u0131\u011F\u0131n\u0131z\u0131, geli\u015Fim odakl\u0131 yakla\u015F\u0131m\u0131n\u0131z\u0131 ve ge\u00E7mi\u015F deneyimleri gelece\u011Fe ta\u015F\u0131ma kapasitenizi g\u00F6sterir. G\u00F6r\u00FC\u015Fmeciyi \u201Cbu aday \u00F6\u011Frenmeye a\u00E7\u0131k ve geli\u015Fiyor\u201D sonucuna ula\u015Ft\u0131r\u0131r.'
    }
  },
  example: {
    title: '\u00D6rnek: \u201CBa\u015Far\u0131s\u0131z oldu\u011Funuz bir d\u00F6nemi anlat\u0131n\u201D',
    situation: 'Sat\u0131\u015F dan\u0131\u015Fman\u0131 olarak \u00F6nemli bir m\u00FC\u015Fteri ile kapan\u0131\u015Fa yak\u0131n bir sat\u0131\u015F s\u00FCrecini y\u00F6netiyordum. Aylard\u0131r ili\u015Fki kurmu\u015F ve g\u00FCveni kazanm\u0131\u015Ft\u0131m.',
    task: 'Hedefim, bu sat\u0131\u015F\u0131 kapatarak \u00E7eyreklik kotam\u0131 a\u015Fmakt\u0131.',
    action: '\u00DCr\u00FCn\u00FCm\u00FCz\u00FCn faydalar\u0131na odaklanan detayl\u0131 bir teklif haz\u0131rlay\u0131p m\u00FC\u015Fterinin \u00F6zel ihtiya\u00E7lar\u0131na g\u00F6re uyarlad\u0131m. Karar vericilerle yapt\u0131\u011F\u0131m toplant\u0131da, \u00F6nceden \u00F6ng\u00F6remedi\u011Fim baz\u0131 itirazlarla kar\u015F\u0131la\u015Ft\u0131m ve o anda yeterince g\u00FC\u00E7l\u00FC yan\u0131t veremedim.',
    result: 'Toplant\u0131 sonras\u0131 takip etmeme ra\u011Fmen sat\u0131\u015F\u0131 kapatamad\u0131m. Bu b\u00FCy\u00FCk bir gerileme oldu, ancak m\u00FCzakere ve itiraz y\u00F6netimi konusunda de\u011Ferli dersler \u00E7\u0131kard\u0131m.',
    takeaway: 'Bu deneyimden sonra her sunumumu \u00F6nce ekip arkada\u015Flar\u0131ma ve y\u00F6neticime yap\u0131yorum \u2014 zay\u0131f noktalar\u0131 bulmam\u0131 ve haz\u0131rl\u0131kl\u0131 olmam\u0131 sa\u011Fl\u0131yorlar. Ba\u015Far\u0131n\u0131n bireysel de\u011Fil tak\u0131m i\u015Fi oldu\u011Funu \u00F6\u011Frendim.'
  },
  benefits: [
    'D\u00FC\u015F\u00FCncelerinizi yap\u0131land\u0131r\u0131r, ilgili ve etkili detaylara odaklanman\u0131z\u0131 sa\u011Flar',
    'Ge\u00E7mi\u015F ba\u015Far\u0131lar\u0131n\u0131z ile gelecek i\u015F sorumluluklar\u0131n\u0131z aras\u0131nda do\u011Frudan ba\u011Flant\u0131 kurar',
    'Somut ve \u00F6l\u00E7\u00FClebilir sonu\u00E7lar sunma kapasitenizi g\u00F6sterir',
    '\u00D6z fark\u0131ndal\u0131k, duygusal zeka ve mesleki geli\u015Fimi ortaya koyar'
  ],
  tips_do: [
    'Sorunun ger\u00E7ekten bir STAR yan\u0131t\u0131 gerektirip gerektirmedi\u011Fini de\u011Ferlendirin',
    'Canl\u0131 ve spesifik \u00F6rneklerle ak\u0131lda kal\u0131c\u0131 olun',
    'Sonu\u00E7lar\u0131 m\u00FCmk\u00FCn oldu\u011Funda rakamlarla destekleyin',
    '\u201CBiz\u201D yerine \u201Cben\u201D kullanarak kendi katk\u0131n\u0131z\u0131 netle\u015Ftirin',
    'Hem teknik hem ki\u015Fisel becerilerinizi dengeli \u015Fekilde vurgulay\u0131n',
    'Deneyimlerinizi yeni pozisyonun gereklilikleriyle ili\u015Fkilendirin',
    'Her yan\u0131t\u0131 iki dakikan\u0131n alt\u0131nda tutun'
  ],
  tips_dont: [
    'Her soruya STAR format\u0131yla yan\u0131tlamay\u0131n \u2014 baz\u0131 sorular bunu gerektirmez',
    'Gereksiz detayla uzatmay\u0131n, oda\u011F\u0131n\u0131z\u0131 kaybetmeyin',
    'Haz\u0131r hikayenizi sorulan soruya uyarlamadan anlatmay\u0131n',
    'Sadece ba\u015Far\u0131 hikayelerine odaklanmay\u0131n \u2014 zorluklardan \u00F6\u011Frendi\u011Finizi de payla\u015F\u0131n',
    'Ayn\u0131 hikayeyi farkl\u0131 g\u00F6r\u00FC\u015Fmecilere tekrarlamay\u0131n',
    'Ba\u015Far\u0131lar\u0131n\u0131z\u0131 abartmay\u0131n \u2014 samimi ve ger\u00E7ek\u00E7i olun'
  ]
};

/* ════════════════════════════════════════════════
   STATE
   ════════════════════════════════════════════════ */

var _loaded = false;
var S = {
  screen: 'intro',
  role: null,
  reset: function() { this.screen = 'intro'; this.role = null; }
};

/* ════════════════════════════════════════════════
   CSS INJECTION
   ════════════════════════════════════════════════ */

function injectCSS() {
  if (document.getElementById('ig-style')) return;
  var css = '';

  /* Container */
  css += '#ig-container{max-width:960px;margin:0 auto;padding:0 16px 40px}';

  /* Bento Grid */
  css += '.ig-bento{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}';
  css += '.ig-bento-full{grid-column:1/-1}';
  css += '.ig-bento-2{grid-column:span 2}';

  /* Cards base */
  /* Animations */
  css += '@keyframes igFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  css += '@keyframes igSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  css += '#ig-container{animation:igFadeIn .25s ease}';

  css += '.ig-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:24px;position:relative;overflow:hidden;transition:box-shadow .3s ease,transform .3s ease;animation:igSlideUp .35s ease both}';
  css += '.ig-bento>.ig-card:nth-child(2){animation-delay:.05s}.ig-bento>.ig-card:nth-child(3){animation-delay:.1s}.ig-bento>.ig-card:nth-child(4){animation-delay:.15s}.ig-bento>.ig-card:nth-child(5){animation-delay:.2s}.ig-bento>.ig-card:nth-child(6){animation-delay:.25s}.ig-bento>.ig-card:nth-child(7){animation-delay:.3s}';
  css += '.ig-card:hover{box-shadow:0 8px 24px rgba(0,0,0,.06);transform:translateY(-1px)}';

  /* Hero card — compact, matches mk-identity sizing */
  css += '.ig-hero{background:#C94E28;color:#fff;padding:22px 24px;border:none !important;border-radius:24px !important;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);margin-bottom:0}';
  css += '.ig-hero-title{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;line-height:1.25;letter-spacing:-.2px}';

  /* Section titles */
  css += '.ig-section-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:700;color:var(--text-primary,#111);margin-bottom:6px}';
  css += '.ig-section-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-muted,#6B7280);line-height:1.6}';

  /* STAR Quad card — vermillion bg */
  css += '.ig-star-quad-card{display:flex;align-items:center;justify-content:center;padding:24px;background:#C94E28 !important;border:none !important}';

  /* STAR Detail card */
  css += '.ig-star-detail-card{display:flex;align-items:center;padding:24px 28px}';

  /* Quad 2x2 */
  css += '.ig-star-quad{display:flex;flex-direction:column;gap:5px}';
  css += '.ig-star-row{display:flex;gap:5px}';
  css += '.ig-star-cell{width:76px;height:76px;background:#fff;border:none;outline:none;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .25s ease;position:relative;box-shadow:0 2px 8px rgba(0,0,0,.06)}';
  css += '.ig-star-cell:hover{transform:scale(1.06)}';
  css += '.ig-star-cell .ig-sq-letter{font-family:"Bricolage Grotesque",sans-serif;font-size:30px;font-weight:900;letter-spacing:-1px;transition:all .25s}';
  css += '.ig-star-cell .ig-sq-label{font-family:"Plus Jakarta Sans",sans-serif;font-size:7.5px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;transition:all .25s;margin-top:2px}';
  css += '.ig-star-cell .ig-sq-label-en{font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;opacity:.6}';

  /* Corner radii */
  css += '.ig-sq-s{border-radius:60px 5px 5px 5px}';
  css += '.ig-sq-t{border-radius:5px 60px 5px 5px}';
  css += '.ig-sq-a{border-radius:5px 5px 5px 60px}';
  css += '.ig-sq-r{border-radius:5px 5px 60px 5px}';

  /* Default: white bg, vermillion letters */
  css += '.ig-star-cell .ig-sq-letter{color:var(--verm,#C94E28)}';

  /* Active: vermillion gradient, shadow to pop from bg */
  css += '.ig-star-cell.active{transform:scale(1.06);background:linear-gradient(135deg,#d4572f 0%,#b84420 100%);box-shadow:0 4px 16px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.15)}';
  css += '.ig-star-cell.active .ig-sq-letter{color:#fff}';

  /* Çıkarım banner — slim full-width */
  css += '.ig-takeaway-banner{background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border:none;color:#fff;display:flex;align-items:center;gap:16px;padding:16px 24px}';
  css += '.ig-takeaway-badge{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:900;color:var(--verm,#C94E28);flex-shrink:0}';
  css += '.ig-takeaway-body{flex:1;min-width:0}';
  css += '.ig-takeaway-title{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:#fff;margin-bottom:2px}';
  css += '.ig-takeaway-title-en{font-style:italic;font-weight:400;font-size:11px;color:rgba(255,255,255,.5);margin-left:4px}';
  css += '.ig-takeaway-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:rgba(255,255,255,.7);line-height:1.6}';

  /* Benefit cards — equal 2x2 grid */
  css += '.ig-benefits-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}';
  css += '.ig-benefit-card{display:flex;align-items:flex-start;gap:12px;padding:20px}';
  css += '.ig-benefit-num{flex-shrink:0;width:28px;height:28px;border-radius:8px;background:rgba(201,78,40,.08);color:var(--verm,#C94E28);font-family:"DM Mono",monospace;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}';
  css += '.ig-benefit-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.6}';

  /* Detail panel content */
  css += '.ig-star-detail{animation:igFadeIn .2s ease}';
  css += '.ig-star-detail-title{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;margin-bottom:8px}';
  css += '.ig-star-detail-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.7}';

  /* Example carousel */
  css += '.ig-carousel-wrap{position:relative;overflow:hidden;border-radius:16px;border:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.ig-carousel-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}';
  css += '.ig-carousel-track::-webkit-scrollbar{display:none}';
  css += '.ig-carousel-slide{min-width:100%;scroll-snap-align:start;padding:28px 24px;box-sizing:border-box}';

  /* Question slide (first) */
  css += '.ig-slide-question{background:var(--bg-surface,#fff);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:180px}';
  css += '.ig-slide-question .ig-slide-q{font-family:"Bricolage Grotesque",sans-serif;font-size:18px;font-weight:800;color:var(--text-primary,#111);line-height:1.4;max-width:480px}';
  css += '.ig-slide-question .ig-slide-hint{font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);margin-top:12px}';

  /* STAR step slides */
  css += '.ig-slide-step{background:var(--bg-surface,#fff);display:flex;gap:16px;align-items:flex-start;min-height:180px}';
  css += '.ig-slide-badge{flex-shrink:0;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:900;color:#fff}';
  css += '.ig-slide-badge.verm{background:var(--verm,#C94E28)}';
  css += '.ig-slide-badge.navy{background:var(--navy,#1E2D5E)}';
  css += '.ig-slide-body{flex:1;min-width:0}';
  css += '.ig-slide-label{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:2px}';
  css += '.ig-slide-label-en{font-style:italic;font-weight:400;font-size:12px;color:var(--text-muted,#6B7280);margin-left:4px}';
  css += '.ig-slide-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.7;margin-top:6px}';

  /* Carousel dots */
  css += '.ig-carousel-dots{display:flex;justify-content:center;gap:6px;padding:12px 0 4px}';
  css += '.ig-carousel-dot{width:8px;height:8px;border-radius:50%;background:var(--border-subtle,#E5E3DF);transition:all .2s;cursor:pointer}';
  css += '.ig-carousel-dot.active{background:var(--verm,#C94E28);width:20px;border-radius:4px}';

  /* Carousel arrows */
  css += '.ig-carousel-arrows{position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between;pointer-events:none;transform:translateY(-50%);padding:0 8px}';
  css += '.ig-carousel-arrow{pointer-events:auto;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid var(--border-subtle,#E5E3DF);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.08)}';
  css += '.ig-carousel-arrow:hover{background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.12)}';
  css += '.ig-carousel-arrow svg{width:16px;height:16px;color:var(--text-muted,#6B7280)}';
  css += '.ig-carousel-arrow.disabled{opacity:.3;cursor:default}';

  /* Benefits */
  css += '.ig-benefits-list{list-style:none;padding:0;margin:12px 0 0}';
  css += '.ig-benefits-list li{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.6;padding:8px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF);display:flex;align-items:flex-start;gap:10px}';
  css += '.ig-benefits-list li:last-child{border-bottom:none}';
  css += '.ig-check{flex-shrink:0;width:18px;height:18px;color:var(--verm,#C94E28)}';

  /* Tips row + colored cards */
  css += '.ig-tips-row{display:flex;gap:16px}';
  css += '.ig-tips-card-do,.ig-tips-card-dont{flex:1;min-width:0}';
  css += '.ig-tips-card-do{background:#C94E28;border:none !important;color:#fff}';
  css += '.ig-tips-card-dont{background:var(--navy,#1E2D5E);border:none !important;color:#fff}';
  css += '.ig-tips-heading{font-family:"Bricolage Grotesque",sans-serif;font-size:16px;font-weight:800;margin:0 0 14px;color:#fff}';
  css += '.ig-tips-list{list-style:none;padding:0;margin:0}';
  css += '.ig-tips-list li{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:rgba(255,255,255,.9);line-height:1.6;padding:7px 0;padding-left:18px;position:relative;border-bottom:1px solid rgba(255,255,255,.1)}';
  css += '.ig-tips-list li:last-child{border-bottom:none}';
  css += '.ig-tips-list li::before{content:"";position:absolute;left:0;top:14px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.5)}';

  /* Role selector */
  css += '.ig-role-card{background:linear-gradient(135deg,rgba(201,78,40,.04) 0%,rgba(201,78,40,.01) 100%);border:2px dashed var(--border-subtle,#E5E3DF);border-radius:16px;padding:28px 24px;text-align:center;transition:all .3s ease;cursor:pointer}';
  css += '.ig-role-card:hover{border-color:var(--verm,#C94E28);border-style:solid}';
  css += '.ig-role-label{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:700;color:var(--text-primary,#111);margin-bottom:8px}';
  css += '.ig-role-desc{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280)}';
  css += '.ig-role-select{width:100%;max-width:400px;margin:16px auto 0;display:block;padding:12px 16px;border:1px solid var(--border-subtle,#E5E3DF);border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text-primary,#111);background:var(--bg-surface,#fff);cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}';
  css += '.ig-role-select:focus{outline:none;border-color:var(--verm,#C94E28);box-shadow:0 0 0 3px rgba(201,78,40,.1)}';

  /* Questions screen */
  css += '.ig-q-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px}';
  css += '.ig-q-role{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:800;color:var(--text-primary,#111)}';
  css += '.ig-q-count{font-family:"DM Mono",monospace;font-size:12px;color:var(--text-muted,#6B7280);background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:20px;padding:4px 12px}';

  /* Question cards */
  css += '.ig-q-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,#E5E3DF);border-radius:16px;padding:22px;position:relative;overflow:hidden;transition:all .3s ease;animation:igSlideUp .35s ease both}';
  css += '.ig-bento>.ig-q-card:nth-child(2){animation-delay:.08s}.ig-bento>.ig-q-card:nth-child(3){animation-delay:.16s}.ig-bento>.ig-q-card:nth-child(4){animation-delay:.24s}.ig-bento>.ig-q-card:nth-child(5){animation-delay:.32s}.ig-bento>.ig-q-card:nth-child(6){animation-delay:.4s}.ig-bento>.ig-q-card:nth-child(7){animation-delay:.48s}.ig-bento>.ig-q-card:nth-child(8){animation-delay:.56s}.ig-bento>.ig-q-card:nth-child(9){animation-delay:.64s}.ig-bento>.ig-q-card:nth-child(10){animation-delay:.72s}';
  css += '.ig-q-card:hover{box-shadow:0 6px 20px rgba(0,0,0,.05)}';
  css += '.ig-q-comp{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:700;color:var(--text-primary,#111);margin-bottom:4px}';
  css += '.ig-q-comp-kf{font-family:"DM Mono",monospace;font-size:10px;color:var(--text-muted,#6B7280);letter-spacing:.4px;margin-bottom:12px}';
  css += '.ig-q-question{font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;color:var(--text-secondary,#4B5563);line-height:1.7;font-style:italic}';
  css += '.ig-q-star-hint{margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle,#E5E3DF);font-family:"Plus Jakarta Sans",sans-serif;font-size:11px;color:var(--text-muted,#6B7280);line-height:1.6}';
  css += '.ig-q-star-hint strong{font-family:"DM Mono",monospace;color:var(--verm,#C94E28);font-size:10px;letter-spacing:.3px}';

  /* Theme sections inside competency cards */
  css += '.ig-themes{margin-top:12px}';
  css += '.ig-theme{padding:12px 0;border-bottom:1px solid var(--border-subtle,#E5E3DF)}';
  css += '.ig-theme:last-child{border-bottom:none}';
  css += '.ig-theme-title{font-family:"Bricolage Grotesque",sans-serif;font-size:12px;font-weight:700;color:var(--verm,#C94E28);letter-spacing:.3px;margin-bottom:8px}';

  /* Locked overlay */
  css += '.ig-q-locked{position:relative;overflow:hidden}';
  css += '.ig-q-locked .ig-q-inner{filter:blur(6px);pointer-events:none;user-select:none}';
  css += '.ig-q-lock-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,.6);backdrop-filter:blur(2px);border-radius:16px;z-index:2}';
  css += '.ig-q-lock-icon{width:36px;height:36px;background:linear-gradient(135deg,#2A3F7A 0%,#1E2D5E 50%,#162247 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}';
  css += '.ig-q-lock-icon svg{width:18px;height:18px;color:#fff}';
  css += '.ig-q-lock-text{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;color:var(--text-muted,#6B7280);margin-bottom:10px;text-align:center}';
  css += '.ig-q-lock-cta{font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:700;color:#fff;background:var(--verm,#C94E28);border:none;border-radius:8px;padding:8px 20px;cursor:pointer;transition:background .2s}';
  css += '.ig-q-lock-cta:hover{background:var(--verm-dark,#b84420)}';

  /* Back nav pill */
  css += '.ig-nav-pill{display:inline-flex;align-items:center;gap:6px;font-family:"Plus Jakarta Sans",sans-serif;font-size:12px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.06);border:1px solid rgba(201,78,40,.15);border-radius:20px;padding:6px 14px;cursor:pointer;transition:all .2s;margin-bottom:16px;border-style:solid;animation:igFadeIn .25s ease}';
  css += '.ig-nav-pill:hover{background:rgba(201,78,40,.1);border-color:rgba(201,78,40,.3)}';
  css += '.ig-nav-pill svg{width:14px;height:14px}';

  /* Responsive */
  css += '@media(max-width:768px){';
  css += '.ig-bento{grid-template-columns:1fr}';
  css += '.ig-bento-2{grid-column:1/-1}';
  css += '.ig-star-quad-card{padding:16px}';
  css += '.ig-tips-row{flex-direction:column}';
  css += '.ig-hero-title{font-size:18px}';
  css += '.ig-hero{padding:18px 20px}';
  css += '}';

  var el = document.createElement('style');
  el.id = 'ig-style';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ════════════════════════════════════════════════
   RENDER FUNCTIONS
   All content is from hardcoded STAR_CONTENT and
   bridge constants — safe for innerHTML assignment.
   ════════════════════════════════════════════════ */

var checkSVG = '<svg class="ig-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
var lockSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
var arrowLeftSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

function renderIntro() {
  var d = STAR_CONTENT;
  var html = '';

  html += '<div class="ig-bento">';

  /* Hero — compact title only */
  html += '<div class="ig-card ig-hero ig-bento-full">';
  html += '<div class="ig-hero-title">\u0130\u015F g\u00F6r\u00FC\u015Fmesi bir performanst\u0131r.</div>';
  html += '</div>';

  /* Intro description card */
  html += '<div class="ig-card ig-bento-full">';
  html += '<div class="ig-section-desc" style="font-size:14px;line-height:1.7;color:var(--text-secondary,#4B5563)">' + d.intro + '</div>';
  html += '</div>';

  /* STAR Quad card — just the wheel */
  html += '<div class="ig-card ig-star-quad-card">';
  html += '<div class="ig-star-quad">';
  html += '<div class="ig-star-row">';
  var qCls = ['ig-sq-s', 'ig-sq-t', 'ig-sq-a', 'ig-sq-r'];
  var qLtr = ['S', 'T', 'A', 'R'];
  for (var i = 0; i < 4; i++) {
    if (i === 2) html += '</div><div class="ig-star-row">';
    html += '<div class="ig-star-cell ' + qCls[i] + (i === 0 ? ' active' : '') + '" data-star="' + i + '">';
    html += '<div class="ig-sq-letter">' + qLtr[i] + '</div>';
    html += '</div>';
  }
  html += '</div></div>';
  html += '</div>';

  /* STAR Detail card — shows selected step */
  html += '<div class="ig-card ig-star-detail-card ig-bento-2">';
  html += '<div id="ig-star-detail">';
  html += renderStarDetail(0);
  html += '</div>';
  html += '</div>';

  /* \u00C7\u0131kar\u0131m — slim full-width banner */
  html += '<div class="ig-card ig-takeaway-banner ig-bento-full">';
  html += '<div class="ig-takeaway-badge">+T</div>';
  html += '<div class="ig-takeaway-body">';
  html += '<div class="ig-takeaway-title">\u00C7\u0131kar\u0131m <span class="ig-takeaway-title-en">(Takeaway)</span></div>';
  html += '<div class="ig-takeaway-text">' + d.what.takeaway.desc + '</div>';
  html += '</div></div>';

  /* Neden Etkili — 4 equal cards in 2x2 grid */
  html += '<div class="ig-section-title ig-bento-full" style="margin-top:4px;margin-bottom:-8px">Neden Etkili?</div>';
  html += '<div class="ig-benefits-grid ig-bento-full">';
  for (var b = 0; b < d.benefits.length; b++) {
    html += '<div class="ig-card ig-benefit-card">';
    html += '<div class="ig-benefit-num">' + (b + 1) + '</div>';
    html += '<div class="ig-benefit-text">' + d.benefits[b] + '</div>';
    html += '</div>';
  }
  html += '</div>';

  /* Example carousel (full width) */
  var slides = [
    { type: 'question', text: d.example.title },
    { type: 'step', badge: 'S', color: 'verm', tr: 'Durum', en: 'Situation', text: d.example.situation },
    { type: 'step', badge: 'T', color: 'navy', tr: 'G\u00F6rev', en: 'Task', text: d.example.task },
    { type: 'step', badge: 'A', color: 'verm', tr: 'Aksiyon', en: 'Action', text: d.example.action },
    { type: 'step', badge: 'R', color: 'navy', tr: 'Sonu\u00E7', en: 'Result', text: d.example.result },
    { type: 'step', badge: '+T', color: 'navy', tr: '\u00C7\u0131kar\u0131m', en: 'Takeaway', text: d.example.takeaway }
  ];
  html += '<div class="ig-bento-full ig-carousel-wrap" style="animation:igSlideUp .35s ease both;animation-delay:.15s">';
  html += '<div class="ig-carousel-track" id="ig-carousel-track">';
  for (var e = 0; e < slides.length; e++) {
    var sl = slides[e];
    if (sl.type === 'question') {
      html += '<div class="ig-carousel-slide ig-slide-question">';
      html += '<div class="ig-slide-q">' + sl.text + '</div>';
      html += '<div class="ig-slide-hint">Kayd\u0131rarak STAR yan\u0131t\u0131n\u0131 incele</div>';
      html += '</div>';
    } else {
      html += '<div class="ig-carousel-slide ig-slide-step">';
      html += '<div class="ig-slide-badge ' + sl.color + '">' + sl.badge + '</div>';
      html += '<div class="ig-slide-body">';
      html += '<div class="ig-slide-label">' + sl.tr + '<span class="ig-slide-label-en">(' + sl.en + ')</span></div>';
      html += '<div class="ig-slide-text">' + sl.text + '</div>';
      html += '</div></div>';
    }
  }
  html += '</div>';
  /* Arrows */
  html += '<div class="ig-carousel-arrows">';
  html += '<div class="ig-carousel-arrow disabled" id="ig-prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></div>';
  html += '<div class="ig-carousel-arrow" id="ig-next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>';
  html += '</div>';
  /* Dots */
  html += '<div class="ig-carousel-dots" id="ig-carousel-dots">';
  for (var di = 0; di < slides.length; di++) {
    html += '<div class="ig-carousel-dot' + (di === 0 ? ' active' : '') + '" data-slide="' + di + '"></div>';
  }
  html += '</div></div>';

  /* Tips — two colored cards side by side */
  html += '<div class="ig-tips-row ig-bento-full">';
  html += '<div class="ig-card ig-tips-card-do">';
  html += '<h4 class="ig-tips-heading">Yap\u0131n</h4><ul class="ig-tips-list">';
  for (var td = 0; td < d.tips_do.length; td++) html += '<li>' + d.tips_do[td] + '</li>';
  html += '</ul></div>';
  html += '<div class="ig-card ig-tips-card-dont">';
  html += '<h4 class="ig-tips-heading">Yapmay\u0131n</h4><ul class="ig-tips-list">';
  for (var tn = 0; tn < d.tips_dont.length; tn++) html += '<li>' + d.tips_dont[tn] + '</li>';
  html += '</ul></div>';
  html += '</div>';

  /* Role selection card (full width) */
  html += '<div class="ig-card ig-role-card ig-bento-full" id="ig-role-area">';
  html += '<div class="ig-role-label">Rol\u00FCne \u00F6zel m\u00FClakat sorular\u0131n\u0131 g\u00F6r</div>';
  html += '<div class="ig-role-desc">Hedef pozisyonunu se\u00E7, o role ait yetkinlik bazl\u0131 m\u00FClakat sorular\u0131n\u0131 incele.</div>';
  html += renderRoleDropdown();
  html += '</div>';

  html += '</div>';
  return html;
}

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

function renderRoleDropdown() {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc">Yetkinlik verileri y\u00FCklenirken bekleyin...</div>';
  var roleKeys = Object.keys(bridge.ROLE_COMP_MAP).sort(function(a,b){ return a.localeCompare(b,'tr'); });
  var html = '<select class="ig-role-select" id="ig-role-dd">';
  html += '<option value="">Pozisyon se\u00E7in...</option>';
  for (var i = 0; i < roleKeys.length; i++) {
    html += '<option value="' + roleKeys[i] + '">' + roleKeys[i] + '</option>';
  }
  html += '</select>';
  return html;
}

function renderQuestions(role) {
  var bridge = getBridge();
  if (!bridge) return '<div class="ig-section-desc">Veri y\u00FCklenemedi.</div>';
  var comps = bridge.ROLE_COMP_MAP[role] || [];
  var freeLimit = bridge.FREE_LIMIT || 2;
  var totalQuestions = 0;
  for (var c = 0; c < comps.length; c++) {
    var iq = INTERVIEW_QUESTIONS[comps[c]];
    if (iq) for (var t = 0; t < iq.length; t++) totalQuestions += iq[t].q.length;
  }
  var html = '';

  html += '<div class="ig-nav-pill" id="ig-back-btn">' + arrowLeftSVG + ' STAR Rehberi</div>';

  html += '<div class="ig-q-header">';
  html += '<div class="ig-q-role">' + role + '</div>';
  html += '<div class="ig-q-count">' + comps.length + ' yetkinlik \u00B7 ' + totalQuestions + ' soru</div>';
  html += '</div>';

  html += '<div class="ig-bento">';
  for (var i = 0; i < comps.length; i++) {
    var code = comps[i];
    var name = bridge.COMP_NAMES[code] || code;
    var isLocked = i >= freeLimit;

    if (isLocked) {
      html += '<div class="ig-q-card ig-q-locked ig-bento-full">';
      html += '<div class="ig-q-inner">';
      html += renderCompetencyQuestions(code, name);
      html += '</div>';
      html += '<div class="ig-q-lock-overlay">';
      html += '<div class="ig-q-lock-icon">' + lockSVG + '</div>';
      html += '<div class="ig-q-lock-text">Premium ile t\u00FCm yetkinlik sorular\u0131n\u0131 g\u00F6r</div>';
      html += '<button class="ig-q-lock-cta">Premium\u2019a Ge\u00E7</button>';
      html += '</div>';
      html += '</div>';
    } else {
      html += '<div class="ig-q-card ig-bento-full">';
      html += renderCompetencyQuestions(code, name);
      html += '</div>';
    }
  }
  html += '</div>';

  return html;
}

function renderCompetencyQuestions(code, name) {
  var themes = INTERVIEW_QUESTIONS[code] || [];
  var html = '';
  html += '<div class="ig-q-comp">' + name + '</div>';
  html += '<div class="ig-q-comp-kf">' + (getBridge().COMP_KF[code] || '') + '</div>';

  if (!themes.length) {
    html += '<div class="ig-q-question" style="color:var(--text-muted)">M\u00FClakat sorular\u0131 haz\u0131rlan\u0131yor...</div>';
    return html;
  }

  html += '<div class="ig-themes">';
  for (var t = 0; t < themes.length; t++) {
    var theme = themes[t];
    html += '<div class="ig-theme">';
    html += '<div class="ig-theme-title">' + theme.theme + '</div>';
    for (var q = 0; q < theme.q.length; q++) {
      html += '<div class="ig-q-question">\u201C' + theme.q[q] + '\u201D</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="ig-q-star-hint">';
  html += '<strong>STAR ile yan\u0131tla:</strong> Durumu tan\u0131mla, g\u00F6revini a\u00E7\u0131kla, hangi aksiyonlar\u0131 ald\u0131\u011F\u0131n\u0131 anlat ve ula\u015Ft\u0131\u011F\u0131n sonucu payla\u015F.';
  html += '</div>';
  return html;
}

/* ════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════ */

function navigate(screen) {
  var container = document.getElementById('ig-container');
  if (!container) return;

  S.screen = screen;

  /* All content assigned to innerHTML is from hardcoded constants (STAR_CONTENT, bridge data).
     No user-generated input is rendered — safe from XSS. */
  if (screen === 'intro') {
    container.innerHTML = renderIntro();
    bindIntroEvents();
  } else if (screen === 'questions') {
    container.innerHTML = renderQuestions(S.role);
    bindQuestionEvents();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindIntroEvents() {
  /* STAR quad click handlers */
  var cells = document.querySelectorAll('.ig-star-cell[data-star]');
  var detailPanel = document.getElementById('ig-star-detail');

  function setActiveStar(idx) {
    cells.forEach(function(c) { c.classList.remove('active'); });
    if (idx < 4) cells[idx] && cells[idx].classList.add('active');
    if (detailPanel) detailPanel.innerHTML = renderStarDetail(idx);
  }

  cells.forEach(function(cell) {
    cell.addEventListener('click', function() {
      setActiveStar(parseInt(this.getAttribute('data-star'), 10));
    });
  });

  /* Carousel logic */
  var track = document.getElementById('ig-carousel-track');
  var dots = document.querySelectorAll('#ig-carousel-dots .ig-carousel-dot');
  var prevBtn = document.getElementById('ig-prev');
  var nextBtn = document.getElementById('ig-next');
  if (track && dots.length) {
    var currentSlide = 0;
    var totalSlides = dots.length;

    function goToSlide(idx) {
      if (idx < 0 || idx >= totalSlides) return;
      currentSlide = idx;
      var slideWidth = track.querySelector('.ig-carousel-slide').offsetWidth;
      track.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
      dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
      if (prevBtn) prevBtn.classList.toggle('disabled', idx === 0);
      if (nextBtn) nextBtn.classList.toggle('disabled', idx === totalSlides - 1);
    }

    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        goToSlide(parseInt(this.getAttribute('data-slide'), 10));
      });
    });
    if (prevBtn) prevBtn.addEventListener('click', function() { goToSlide(currentSlide - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { goToSlide(currentSlide + 1); });

    /* Sync dots on manual scroll */
    track.addEventListener('scroll', function() {
      var slideWidth = track.querySelector('.ig-carousel-slide').offsetWidth;
      var idx = Math.round(track.scrollLeft / slideWidth);
      if (idx !== currentSlide && idx >= 0 && idx < totalSlides) {
        currentSlide = idx;
        dots.forEach(function(d, i) { d.classList.toggle('active', i === idx); });
        if (prevBtn) prevBtn.classList.toggle('disabled', idx === 0);
        if (nextBtn) nextBtn.classList.toggle('disabled', idx === totalSlides - 1);
      }
    });
  }

  /* Role dropdown */
  var dd = document.getElementById('ig-role-dd');
  if (dd) {
    dd.addEventListener('change', function() {
      if (this.value) {
        S.role = this.value;
        navigate('questions');
      }
    });
  }
}

function bindQuestionEvents() {
  var backBtn = document.getElementById('ig-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      S.role = null;
      navigate('intro');
    });
  }
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
  navigate('intro');
};

})();
