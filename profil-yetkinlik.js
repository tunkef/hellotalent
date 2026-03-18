/**
 * profil-yetkinlik.js — Yetkinlik Wizard for profil.html
 * Ground-up rebuild: full-page reading, no drawer, no ratings.
 * All innerHTML content comes from hardcoded ANCHORS constants — no user input, no XSS risk.
 */
(function(){
'use strict';

/* ════════════════════════════════════════════════
   DATA LAYER — Single Source of Truth
   ════════════════════════════════════════════════ */

var COMP_NAMES = {
  cf:'Müşteri Odaklılık', ce:'Etkili İletişim', it:'Güven Oluşturma', co:'Takım Çalışması',
  ao:'Aksiyona Yönelim', ea:'Sorumluluk Alma', dr:'Sonuç Odaklılık', dw:'Ekip Yönlendirme',
  bt:'Ekip Kurma', dt:'Yetenek Geliştirme', de:'Motivasyon & Bağlılık', pa:'Planlama & Önc.',
  fa:'Finansal Okuryazarlık', sm:'Stratejik Bakış', nl:'Hızlı Öğrenme', br:'Dayanıklılık',
  is:'İlişki Yönetimi', mc:'Çatışma Yönetimi', ci:'Yenilik & Yaratıcılık', pe:'İkna Etme',
  ts:'Dijital Yetkinlik', dq:'Karar Kalitesi', op:'Süreç Optimizasyonu', bs:'Paydaş Dengeleme',
  at:'Yetenek Çekme', bi:'İş Anlayışı', cu:'Cesaret', cx:'Karmaşıklık Yönetimi', sa:'Uyum Sağlama'
};

var COMP_KF = {
  cf:'Customer Focus', ce:'Communicates Effectively', it:'Instills Trust', co:'Collaborates',
  ao:'Action Oriented', ea:'Ensures Accountability', dr:'Drives Results', dw:'Directs Work',
  bt:'Builds Effective Teams', dt:'Develops Talent', de:'Drives Engagement', pa:'Plans and Aligns',
  fa:'Financial Acumen', sm:'Strategic Mindset', nl:'Nimble Learning', br:'Being Resilient',
  is:'Interpersonal Savvy', mc:'Manages Conflict', ci:'Cultivates Innovation', pe:'Persuades',
  ts:'Tech Savvy', dq:'Decision Quality', op:'Optimizes Work Processes', bs:'Balances Stakeholders',
  at:'Attracts Top Talent', bi:'Business Insight', cu:'Courage', cx:'Manages Complexity', sa:'Situational Adaptability'
};

var ANCHORS={cf:{def:"G\u00fc\u00e7l\u00fc m\u00fc\u015fteri ili\u015fkileri kurmak ve m\u00fc\u015fteri odakl\u0131 \u00e7\u00f6z\u00fcmler \u00fcretmek.",why:"Herhangi bir kurumda \u2014 k\u00e2r amac\u0131 g\u00fcts\u00fcn ya da g\u00fctmesin \u2014 en \u00f6nemli insanlar m\u00fc\u015fterilerdir. M\u00fc\u015fteriler olmadan kurumunuz var olamazd\u0131. Perakendede baz\u0131 rollerde m\u00fc\u015fteriyle temas do\u011frudan ve anl\u0131k; baz\u0131 rollerde ise ba\u011flant\u0131 daha dolayl\u0131d\u0131r. Ama ba\u011flant\u0131n\u0131n dolayl\u0131 olmas\u0131 sorumluluktan muaf k\u0131lmaz. Kazanan perakende organizasyonlar\u0131 her zaman m\u00fc\u015fteri odakl\u0131 ve duyarl\u0131d\u0131r. Ba\u015far\u0131l\u0131 olmak; m\u00fc\u015fteri ihtiya\u00e7lar\u0131na s\u00fcrekli dikkat etmek, bu ihtiya\u00e7lar de\u011fi\u015ftik\u00e7e uyum sa\u011flamak demektir. \u0130\u00e7 m\u00fc\u015fteri de d\u0131\u015f m\u00fc\u015fteri kadar \u00f6nemlidir \u2014 kurum i\u00e7indeki insanlarla ilgilenilmezse, d\u0131\u015far\u0131da y\u00fcksek d\u00fczeyde m\u00fc\u015fteri memnuniyeti yaratmak neredeyse imk\u00e2ns\u0131zd\u0131r.",skilled:["M\u00fc\u015fterinin s\u00f6ylemedi\u011fini de anlar; aktif dinleyerek ve g\u00f6zlemleyerek ihtiyac\u0131 \u00f6nceden sezinler","M\u00fc\u015fteriye fayda sa\u011flayan f\u0131rsatlar\u0131 belirler ve proaktif bi\u00e7imde de\u011ferlendirmek i\u00e7in harekete ge\u00e7er","M\u00fc\u015fteri beklentilerini kar\u015f\u0131layan \u00e7\u00f6z\u00fcmler geli\u015ftirir, sunar ve teslim eder; s\u00f6yledi\u011fini yapar","Hem d\u0131\u015f m\u00fc\u015fteri hem i\u00e7 m\u00fc\u015fteri (stok, operasyon, di\u011fer departmanlar) ile etkili ili\u015fkiler kurar","M\u00fc\u015fteri geri bildirimlerini d\u00fczenli toplar ve bu geri bildirimleri iyile\u015ftirme s\u00fcre\u00e7lerine yans\u0131t\u0131r"],lessskilled:["M\u00fc\u015fteri beklentilerinin fark\u0131nda de\u011fildir; ihtiya\u00e7 analizi yapmadan varsay\u0131mla harekete ge\u00e7er","M\u00fc\u015fteri ihtiya\u00e7lar\u0131n\u0131 eksik ya da hatal\u0131 anlay\u0131\u015fla ele al\u0131r; yanl\u0131\u015f \u00fcr\u00fcn ya da \u00e7\u00f6z\u00fcm \u00f6nerir","\u0130\u015fi m\u00fc\u015fteri perspektifinden de\u011fil, operasyonel \u2018pros\u00e9d\u00fcr var, uyguluyorum\u2019 mant\u0131\u011f\u0131yla y\u00fcr\u00fct\u00fcr","\u00d6nemli m\u00fc\u015fterilerle etkili ili\u015fkiler kuramaz; i\u015flemi tamamlar ve ge\u00e7er, ili\u015fkiyi s\u00fcrd\u00fcrmez","M\u00fc\u015fteri \u015fikayetleri kar\u015f\u0131s\u0131nda savunmaya ge\u00e7er; \u00e7\u00f6z\u00fcm \u00fcretmek yerine hakl\u0131l\u0131k arar"],highlyskilled:["M\u00fc\u015fterinin hen\u00fcz dile getirmedi\u011fi ihtiya\u00e7lar\u0131 \u00f6ng\u00f6r\u00fcr; beklentinin \u00f6tesine ge\u00e7erek s\u00fcrpriz yarat\u0131r","M\u00fc\u015fterilerden \u00f6\u011frendiklerini yeni \u00fcr\u00fcn, hizmet ve s\u00fcre\u00e7lerin geli\u015ftirilmesine y\u00f6n vermek i\u00e7in kullan\u0131r","Kilit m\u00fc\u015fterilerle k\u00e2rl\u0131 ve uzun vadeli ili\u015fkiler kurar; s\u0131radan hizmet sa\u011flay\u0131c\u0131 de\u011fil, stratejik i\u015f orta\u011f\u0131 gibi davran\u0131r"],overused:["M\u00fc\u015fteri bilgisini di\u011fer kritik i\u015f \u00f6ncelikleri \u00fczerinde gere\u011finden fazla tutar; genel resmi ka\u00e7\u0131r\u0131r","M\u00fc\u015fteriyi memnun etmek u\u011fruna \u015firket politikalar\u0131n\u0131 a\u015f\u0131r\u0131 esnetir; yerine getirilemeyen s\u00f6zler verir","M\u00fc\u015fteriyle fazla yak\u0131nla\u015f\u0131r; organizasyonun tutamayaca\u011f\u0131 vaatler yaparak uzun vadede g\u00fcven zedeler"],retail:"Bir sat\u0131\u015f dan\u0131\u015fman\u0131, m\u00fc\u015fterinin bakt\u0131\u011f\u0131 \u00fcr\u00fcne ilgi g\u00f6stermedi\u011fini fark eder. \u00dcr\u00fcn\u00fc satmaya \u00e7al\u0131\u015fmak yerine \u2018Bu tam size g\u00f6re olmayabilir, ama \u015funu hi\u00e7 denediniz mi?\u2019 diyerek y\u00f6nlendirir. M\u00fc\u015fteri o \u00fcr\u00fcn\u00fc al\u0131r, memnun kal\u0131r ve \u00fc\u00e7 hafta sonra bir arkada\u015f\u0131n\u0131 getirerek d\u00f6ner.",interview:"\u2018Bir m\u00fc\u015fteriyi beklentisinin \u00f6tesinde memnun etti\u011fin somut bir durumu anlat. O an\u0131 nas\u0131l fark ettin? Ne yapt\u0131n? M\u00fc\u015fteri nas\u0131l tepki verdi? O deneyimden ne \u00f6\u011frendin?\u2019"},ce:{def:"Farkl\u0131 kitlelerin \u00f6zg\u00fcn ihtiya\u00e7lar\u0131na uygun, \u00e7ok bi\u00e7imli ve net ileti\u015fim kurmak.",why:"Organizasyonlar, bilgi ve fikirlerin zaman\u0131nda ve do\u011fru akt\u0131\u011f\u0131 zaman geli\u015fir. Zay\u0131f ileti\u015fim zaman ve kaynak bo\u015fa harcar, hedeflere ula\u015fmay\u0131 engeller ve ili\u015fkileri zedeler. Perakendede ileti\u015fim her yerde ve her anda vard\u0131r: m\u00fc\u015fteriyle, ekiple, y\u00f6netimle, tedarik\u00e7iyle. Etkili ileti\u015fimciler her ortamda kendini ifade edebilen, ton ve dili kitleye g\u00f6re ayarlayan ve dinlemenin konu\u015fmak kadar \u00f6nemli oldu\u011funu bilen ki\u015filerdir.",skilled:["Bire bir, k\u00fc\u00e7\u00fck gruplar, b\u00fcy\u00fck toplant\u0131lar ve farkl\u0131 hiyerar\u015fik seviyelerde \u00e7e\u015fitli ortamlarda etkilidir","Ba\u015fkalar\u0131n\u0131 aktif ve dikkatli bi\u00e7imde dinler; s\u00f6yleneni de\u011fil, s\u00f6ylenmek istenenin \u00f6z\u00fcn\u00fc anlamaya \u00e7al\u0131\u015f\u0131r","Mesaj\u0131n\u0131 ve \u00fcslubunu kitleye, konuya ve ba\u011flama g\u00f6re ayarlar","Organizasyon genelinde ihtiya\u00e7 duyulan bilgiyi zaman\u0131nda ve yard\u0131mc\u0131 bi\u00e7imde payla\u015f\u0131r","Farkl\u0131 g\u00f6r\u00fc\u015f ve fikirlerin a\u00e7\u0131k\u00e7a ifade edildi\u011fi bir ortam olu\u015fturur ve bunu te\u015fvik eder"],lessskilled:["Yaz\u0131l\u0131 ve s\u00f6zl\u00fc mesajlarda netlikte g\u00fc\u00e7l\u00fck \u00e7eker","Kitleyi dikkate almadan her zaman ayn\u0131 tarz ve tonla ileti\u015fim kurar","Ba\u015fkalar\u0131n\u0131n bak\u0131\u015f a\u00e7\u0131s\u0131n\u0131 anlamak i\u00e7in zaman ay\u0131rmaz","Ba\u015fkalar\u0131n\u0131n i\u015fi i\u00e7in ihtiya\u00e7 duyduklar\u0131 bilgiyi tutarl\u0131 bi\u00e7imde payla\u015fmaz","Konu\u015fmalara h\u00e2kim olur; s\u00f6z\u00fc ba\u015fkas\u0131na vermez"],highlyskilled:["Mesajlar\u0131n\u0131 net, s\u00fcr\u00fckleyici ve \u00f6z bi\u00e7imde iletir","Farkl\u0131 payda\u015flar\u0131n ihtiya\u00e7lar\u0131na g\u00f6re i\u00e7erik ve ileti\u015fim tarz\u0131n\u0131 anl\u0131k olarak ayarlar","Farkl\u0131 fikirlerin ve bak\u0131\u015f a\u00e7\u0131lar\u0131n\u0131n ifade edilmesini hem model olarak g\u00f6sterir hem aktif te\u015fvik eder"],overused:["A\u015f\u0131r\u0131 bilgi payla\u015f\u0131r; \u00f6nemli mesaj g\u00fcr\u00fclt\u00fcde kaybolur","\u0130leti\u015fim becerisini ger\u00e7e\u011fin ve \u00f6z\u00fcn \u00f6n\u00fcne koyabilir","Her ileti\u015fim par\u00e7as\u0131n\u0131 gere\u011finden fazla zaman harcayarak haz\u0131rlar"],retail:"Ma\u011faza m\u00fcd\u00fcr\u00fc, sat\u0131\u015f ekibine bir performans d\u00fc\u015f\u00fc\u015f\u00fcn\u00fc aktarmak zorundad\u0131r. Savunmac\u0131 bir dil kullanmak yerine \u015funu der: \u2018Ge\u00e7en hafta m\u00fc\u015fteri bekleme s\u00fcrelerinin uzad\u0131\u011f\u0131n\u0131 fark ettim \u2014 sizin g\u00f6zlemlerinize ihtiyac\u0131m var.\u2019 Su\u00e7lamak yerine merak eder, monolog yerine diyalog a\u00e7ar.",interview:"\u2018Karma\u015f\u0131k bir bilgiyi ya da zor bir haberi ekibine veya m\u00fc\u015fterine iletmen gereken bir durumu anlat. Nas\u0131l haz\u0131rland\u0131n? Kitleyi nas\u0131l dikkate ald\u0131n?\u2019"},it:{def:"D\u00fcr\u00fcstl\u00fck, b\u00fct\u00fcnl\u00fck ve \u00f6zg\u00fcnl\u00fck arac\u0131l\u0131\u011f\u0131yla ba\u015fkalar\u0131n\u0131n g\u00fcvenini kazanmak ve s\u00fcrd\u00fcrmek.",why:"G\u00fcven, etkili ili\u015fkilerin kalbidir. G\u00fcven oldu\u011funda her \u015fey daha kolay akar. G\u00fcven olmad\u0131\u011f\u0131nda gereksiz s\u00fcrt\u00fc\u015fmeler ba\u015flar, performans d\u00fc\u015fer. Perakendede g\u00fcven \u00fc\u00e7 y\u00f6nde in\u015fa edilir: m\u00fc\u015fteriyle, ekip arkada\u015flar\u0131yla ve y\u00f6netimle.",skilled:["Taahh\u00fctlerini takip eder; s\u00f6yledi\u011fi \u015feyi yapar, yapmayaca\u011f\u0131 \u015feyi s\u00f6ylemez","Do\u011frudan ve d\u00fcr\u00fcstt\u00fcr; s\u00f6yledikleri g\u00fcvenilirdir","Gizlilikleri korur; \u00f6\u011frendi\u011fi hassas konular\u0131 if\u015fa etmez","S\u00f6yledi\u011fiyle yapt\u0131\u011f\u0131 aras\u0131nda tutarl\u0131l\u0131k vard\u0131r","Zor durumlarda bile duru\u015funu korur"],lessskilled:["Taahh\u00fctlerini tutarl\u0131 bi\u00e7imde yerine getirmez","Hata yap\u0131ld\u0131\u011f\u0131nda \u00fcstlenmez; ba\u015fkalar\u0131n\u0131 su\u00e7lar","Ki\u015fisel \u00e7\u0131kar\u0131 i\u00e7in ger\u00e7ekleri \u00e7arp\u0131t\u0131r","Farkl\u0131 insanlara farkl\u0131 \u015feyler s\u00f6yler","S\u00f6zleri ile eylemleri aras\u0131ndaki bo\u015flu\u011fun fark\u0131nda de\u011fildir"],highlyskilled:["Zor bir ger\u00e7e\u011fi bile zaman\u0131nda ve d\u00fcr\u00fcst\u00e7e iletir","Kendi hatalar\u0131n\u0131 a\u00e7\u0131k\u00e7a kabul eder ve \u00e7\u00f6z\u00fcme odaklan\u0131r","G\u00fcven in\u015fa etmeye kas\u0131tl\u0131 olarak zaman ve \u00e7aba yat\u0131r\u0131r"],overused:["O kadar do\u011frudan ve d\u00fcr\u00fcstt\u00fcr ki duygusal ba\u011flam\u0131 g\u00f6z ard\u0131 eder","Her \u015feyi kamuoyuna a\u00e7\u0131k hale getirmeye \u00e7al\u0131\u015f\u0131r","Ba\u015fkalar\u0131n\u0131n d\u00fcr\u00fcstl\u00fck standard\u0131n\u0131 kendi standard\u0131yla \u00f6l\u00e7er"],retail:"Kasa g\u00f6revlisi, m\u00fc\u015fterinin kasadan sonra fark etti\u011fi bir fiyat hatas\u0131n\u0131 kimse bakm\u0131yor olsa bile hemen d\u00fczeltir.",interview:"\u2018G\u00fcvenin s\u0131nand\u0131\u011f\u0131, do\u011fruyu s\u00f6ylemenin riskli g\u00f6r\u00fcnd\u00fc\u011f\u00fc bir durumu anlat.\u2019"},co:{def:"Ortak hedeflere ula\u015fmak i\u00e7in ba\u015fkalar\u0131yla ortakl\u0131k kurmak ve i\u015f birli\u011fi i\u00e7inde \u00e7al\u0131\u015fmak.",why:"Bug\u00fcn perakendede de\u011fer yaratan hi\u00e7bir \u015fey tek ba\u015f\u0131na olu\u015fmuyor. Vitrin d\u00fczenlemesinden m\u00fc\u015fteri hizmetine, stok y\u00f6netiminden kampanya uygulamas\u0131na kadar her s\u00fcrec koordineli \u00e7al\u0131\u015fmay\u0131 gerektiriyor.",skilled:["Ortak hedeflere ula\u015fmak i\u00e7in aktif i\u015f birli\u011fi yapar","Ortak hedeflere y\u00f6nelik strateji ve planlar geli\u015ftirir","Bilgiyi, kaynaklar\u0131 ve ba\u015far\u0131y\u0131 payla\u015f\u0131r","Bireysel ba\u015far\u0131s\u0131n\u0131 ekip ba\u015far\u0131s\u0131yla dengeler","Departmanlar aras\u0131 proaktif ileti\u015fim kurar"],lessskilled:["Kendi i\u015fini iyi yapar ama ba\u015fkas\u0131na yard\u0131m etmeyi y\u00fck sayar","Ba\u015far\u0131y\u0131 payla\u015fmakta g\u00fc\u00e7l\u00fck \u00e7eker","Tak\u0131m karar\u0131na kat\u0131lmasa da g\u00f6r\u00fc\u015f\u00fcn\u00fc a\u00e7\u0131k\u00e7a s\u00f6ylemez","Organizasyonun geri kalan\u0131ndan ayr\u0131 hareket eder","Bilgiyi g\u00fc\u00e7 olarak g\u00f6r\u00fcr; payla\u015fmak yerine biriktirir"],highlyskilled:["Farkl\u0131 g\u00fc\u00e7l\u00fc y\u00f6nlere sahip insanlar\u0131 ortak ama\u00e7 etraf\u0131nda birle\u015ftirir","Tak\u0131m ba\u015far\u0131s\u0131n\u0131n \u00f6n\u00fcndeki engelleri proaktif g\u00f6r\u00fcr","Organizasyon genelinde g\u00fc\u00e7l\u00fc ili\u015fki a\u011flar\u0131 kurar"],overused:["Konsens\u00fcs aray\u0131\u015f\u0131 her kararda gerekli de\u011fildir","Her \u015feyi birlikte yapmaya \u00e7al\u0131\u015fmak bireysel hesap verebilirli\u011fi zay\u0131flatabilir","\u0130\u015f birli\u011fine o kadar de\u011fer verir ki \u00e7at\u0131\u015fmadan ka\u00e7\u0131n\u0131r"],retail:"Sat\u0131\u015f ekibinden biri hastaland\u0131, sezon a\u00e7\u0131l\u0131\u015f\u0131n\u0131n tam ortas\u0131nda. Di\u011fer ekip \u00fcyeleri o alan\u0131 da sahipleniyorlar. Kimse \u2018bu benim i\u015fim de\u011fil\u2019 demiyor.",interview:"\u2018Farkl\u0131 departmanlar ya da ekiplerle birlikte y\u00fcr\u00fctt\u00fc\u011f\u00fcn zorlu bir s\u00fcreci anlat.\u2019"},ao:{def:"Yeni f\u0131rsatlar\u0131 ve zorlu durumlar\u0131 y\u00fcksek enerji, aciliyet duygusu ve istekle ele almak.",why:"H\u0131zl\u0131 de\u011fi\u015fen perakende ortam\u0131nda f\u0131rsatlar g\u00f6z k\u0131rparak ge\u00e7er. Harika fikirler, kapsaml\u0131 planlar, m\u00fckemmel stratejiler \u2014 bunlar\u0131n hi\u00e7biri hayata ge\u00e7irilmeden bir fark yaratmaz.",skilled:["Gereksiz planlama beklemeksizin zorluklara an\u0131nda m\u00fcdahale eder","Yeni f\u0131rsatlar\u0131 tan\u0131mlar ve yakalar","\u0130yi d\u00f6nemde de zor d\u00f6nemde de e\u015fit bir yapabilirim tutumunu korur","Zor konular\u0131 g\u00f6rmezden gelmez; \u00fczerine gider","Y\u00fcksek enerji ve istekle yeni g\u00f6revler \u00fcstlenir"],lessskilled:["Harekete ge\u00e7meden \u00f6nce fazla onay bekler","Her ad\u0131m\u0131 planlamadan hareket edemez","Zor durumlardan ka\u00e7\u0131n\u0131r","Ba\u015far\u0131s\u0131zl\u0131k korkusu risk almay\u0131 engeller","Sorunla kar\u015f\u0131la\u015ft\u0131\u011f\u0131nda \u00e7\u00f6z\u00fcme ge\u00e7i\u015fi yava\u015ft\u0131r"],highlyskilled:["Karma\u015f\u0131k ve belirsiz durumlarda bile harekete ge\u00e7me g\u00fcvencesi verir","S\u0131n\u0131rl\u0131 kaynak ve bilgiyle sonu\u00e7 \u00fcretir","Yeni f\u0131rsatlar\u0131 ba\u015fkalar\u0131 hen\u00fcz fark etmeden g\u00f6r\u00fcr"],overused:["A\u015f\u0131r\u0131 h\u0131zl\u0131 hareket ederek ba\u015fkalar\u0131n\u0131n g\u00f6r\u00fc\u015f\u00fcn\u00fc almadan ilerler","Sonu\u00e7lar\u0131 yeterince d\u00fc\u015f\u00fcnmeden harekete ge\u00e7er","Sab\u0131rs\u0131zl\u0131k g\u00f6sterir"],retail:"Cumartesi \u00f6\u011fleden sonras\u0131 kasa s\u0131ras\u0131 soka\u011fa ta\u015ft\u0131. Sat\u0131\u015f dan\u0131\u015fman\u0131 \u2018yard\u0131m edebilirim\u2019 diyor ve kasaya ge\u00e7iyor.",interview:"\u2018H\u0131zl\u0131 karar alman ve harekete ge\u00e7men gereken bir durumu anlat.\u2019"},ea:{def:"Kendini ve ba\u015fkalar\u0131n\u0131 taahh\u00fctleri yerine getirme konusunda sorumlu tutmak.",why:"Sorumluluk almak; taahh\u00fctlerin sahibi olmak, hesap verebilir olmak demektir. Perakendede hesap verebilirlik hem say\u0131sal hem davran\u0131\u015fsal boyutuyla ya\u015fan\u0131r.",skilled:["Taahh\u00fctlerini takip eder ve ba\u015fkalar\u0131n\u0131n da ayn\u0131s\u0131n\u0131 yapmas\u0131n\u0131 sa\u011flar","Net bir sahiplik duygusuyla hareket eder","Kararlar\u0131n\u0131n ki\u015fisel sorumlulu\u011funu \u00fcstlenir","Ekibine net sorumluluklar olu\u015fturur","Sonu\u00e7lar\u0131 \u00f6l\u00e7mek i\u00e7in geri bildirim d\u00f6ng\u00fcleri tasarlar"],lessskilled:["Makul \u00f6l\u00e7\u00fcde ki\u015fisel sorumluluk \u00fcstlenmez","Nas\u0131l gitti\u011fine dair bilgi toplamaz","Yetersiz geribildirim verir","Sorumlulu\u011fu ba\u015fkalar\u0131yla payla\u015fmay\u0131 tercih eder","Sorun oldu\u011funda d\u0131\u015fsal a\u00e7\u0131klamalara ba\u015fvurur"],highlyskilled:["Kritik projelerde beklentileri net tan\u0131mlar","Hesap verebilirlik k\u00fclt\u00fcr\u00fcn\u00fc sistemik hale getirir","Ekibindeki ba\u015far\u0131s\u0131zl\u0131klar\u0131 \u00f6\u011frenme f\u0131rsat\u0131na \u00e7evirir"],overused:["Bireyler \u00fczerinde gere\u011finden fazla bask\u0131 yarat\u0131r","Say\u0131sal \u00f6l\u00e7\u00fcmlere a\u015f\u0131r\u0131 odaklan\u0131r","Hataya s\u0131f\u0131r tolerans tutumu benimseyebilir"],retail:"Ma\u011faza, iki ay \u00fcst \u00fcste sat\u0131\u015f hedefinin alt\u0131nda kald\u0131. Ma\u011faza m\u00fcd\u00fcr\u00fc \u2018Planlamamda bir bo\u015fluk olu\u015ftu, bu ay \u015funu de\u011fi\u015ftirece\u011fiz\u2019 diyor.",interview:"\u2018Sorumlulu\u011funu tamamen \u00fcstlendi\u011fin zorlu bir durumu anlat.\u2019"},dr:{def:"Zorlu ko\u015fullar alt\u0131nda bile tutarl\u0131 bi\u00e7imde sonu\u00e7 \u00fcretmek.",why:"Sonu\u00e7 odakl\u0131l\u0131k; genel bir ba\u015far\u0131 zihniyetinin, aksiyona y\u00f6nelimin ve \u00f6ne \u00e7\u0131kma iste\u011finin b\u00fct\u00fcnle\u015fik halidir. Perakendede ba\u015far\u0131l\u0131 organizasyonlarda bireyler, tak\u0131mlar ve ma\u011fazalar hedefler etraf\u0131nda hizalan\u0131r.",skilled:["G\u00fc\u00e7l\u00fc bir sonu\u00e7 ve alt sat\u0131r odakl\u0131l\u0131\u011f\u0131na sahiptir","Engeller kar\u015f\u0131s\u0131nda hedeflere ula\u015fmay\u0131 s\u00fcrd\u00fcr\u00fcr","Hedefleri ba\u015far\u0131yla a\u015fma sicili vard\u0131r","Kendini ve ekibini sonu\u00e7 \u00fcretimine iter","Her zaman biti\u015fi g\u00f6z\u00fcnde tutar"],lessskilled:["Sonu\u00e7lar i\u00e7in itmekten ka\u00e7\u0131n\u0131r","Asgari \u00e7abayla idare eder","Tutars\u0131z performans sergiler","Kolayca pes eder","Son tarihleri s\u0131k s\u0131k ka\u00e7\u0131r\u0131r"],highlyskilled:["\u0130ddial\u0131 hedefler koyar","Tutarl\u0131 bi\u00e7imde en iyi performans g\u00f6sterenler aras\u0131ndad\u0131r","Zorluklar kar\u015f\u0131s\u0131nda \u0131srar eder"],overused:["\u0130nsan ve etik boyutlar\u0131n\u0131 g\u00f6zetmeksizin sonu\u00e7 pe\u015finde ko\u015far","Son tarih odakl\u0131l\u0131\u011f\u0131 kalite ve s\u00fcreci feda eder","Ekip \u00fczerinde a\u015f\u0131r\u0131 bask\u0131 yarat\u0131r"],retail:"Ma\u011faza ay\u0131n 15\u2019inde hedefin y\u00fczde on gerisinde. Ma\u011faza m\u00fcd\u00fcr\u00fc ekibiyle oturuyor. Ay sonunda hedef ge\u00e7ilmi\u015f.",interview:"\u2018Ko\u015fullar\u0131n aleyhine oldu\u011fu bir d\u00f6nemde sonucu nas\u0131l tutturdu\u011funu anlat.\u2019"},dw:{def:"Net y\u00f6n vermek, g\u00f6revleri delege etmek ve i\u015fin tamamlanmas\u0131 \u00f6n\u00fcndeki engelleri kald\u0131rmak.",why:"Kendi i\u015fini yapmaktan, i\u015fi ba\u015fkalar\u0131 arac\u0131l\u0131\u011f\u0131yla yapmaya ge\u00e7i\u015f \u2014 perakende kariyerinin en kritik d\u00f6n\u00fc\u015f\u00fcm noktalar\u0131ndan biridir.",skilled:["Net sorumluluklar ve hesap verebilirlikler tan\u0131mlar","G\u00f6revleri do\u011fru ki\u015filere delege eder","\u0130\u015f \u00fczerindeki diyalogu s\u00fcrd\u00fcrerek ilerlemeyi takip eder","\u0130nsanlar\u0131n yeteneklerine g\u00f6re uygun rehberlik sa\u011flar","\u0130\u015fin \u00f6n\u00fcndeki engelleri proaktif olarak kald\u0131r\u0131r"],lessskilled:["Eksik, belirsiz talimatlar verir","\u0130\u015fi delege edemez; her \u015feyi kendisi yapmaya \u00e7al\u0131\u015f\u0131r","Y\u00fcksek profilli g\u00f6revleri kendinde tutar","Mikro y\u00f6netim yapar","Ger\u00e7ek\u00e7i olmayan hedefler koyar"],highlyskilled:["\u0130nsanlar\u0131 g\u00f6revlere ustaca e\u015fle\u015ftirir","Net performans beklentilerini iletir","Bireylerin kapasitelerini geli\u015ftirecek g\u00f6revleri bilin\u00e7li delege eder"],overused:["Gere\u011finden fazla y\u00f6nlendirme yapar","Ba\u015fkalar\u0131ndan ger\u00e7ek\u00e7i olmayan beklentiler i\u00e7indedir","Sab\u0131rs\u0131zd\u0131r; geli\u015fim i\u00e7in zaman vermez"],retail:"Yeni ma\u011faza m\u00fcd\u00fcr\u00fc g\u00f6revleri net bi\u00e7imde da\u011f\u0131t\u0131yor. Ma\u011faza daha sakin, daha verimli \u00e7al\u0131\u015f\u0131yor.",interview:"\u2018Bir g\u00f6revi delege etti\u011finde bekledi\u011fin sonucu elde edemedi\u011fin bir durumu anlat.\u2019"},bt:{def:"\u00c7e\u015fitli beceri ve perspektifleri bir araya getiren, g\u00fc\u00e7l\u00fc kimli\u011fe sahip tak\u0131mlar kurmak.",why:"Harika tak\u0131mlar nadiren kendili\u011finden olu\u015fur. Perakendede bir ma\u011faza ekibi; farkl\u0131 deneyim d\u00fczeylerinden, farkl\u0131 ki\u015filiklerden olu\u015fur.",skilled:["Tak\u0131m\u0131 \u00e7e\u015fitli stil ve deneyim kombinasyonuyla olu\u015fturur","Ortak hedefler ve payla\u015f\u0131lan bir zihniyetin temelini atar","Aidiyet duygusu ve g\u00fc\u00e7l\u00fc ekip morali yarat\u0131r","Ba\u015far\u0131lar\u0131 payla\u015f\u0131r ve ekip \u00e7abalar\u0131n\u0131 \u00f6d\u00fcllendirir","Tak\u0131mda a\u00e7\u0131k diyalog ve i\u015f birli\u011fi ortam\u0131 olu\u015fturur"],lessskilled:["Tak\u0131m\u0131n amac\u0131 konusunda net de\u011fildir","Ortak bir zihniyet yaratamaz","Moral ve aidiyetin \u00f6nemini kavrayamaz","Bireysel \u00e7abalar\u0131 tak\u0131m ba\u015far\u0131s\u0131n\u0131n \u00f6n\u00fcnde tutar","G\u00f6revleri i\u015f birli\u011fini te\u015fvik edecek bi\u00e7imde da\u011f\u0131tmaz"],highlyskilled:["Ba\u015far\u0131y\u0131 b\u00fct\u00fcn tak\u0131m\u0131n ba\u015far\u0131s\u0131 olarak tan\u0131mlar","Her tak\u0131m \u00fcyesinin \u00f6zg\u00fcn bak\u0131\u015f a\u00e7\u0131s\u0131n\u0131 aktif kullan\u0131r","Tak\u0131m \u00fcyelerinin kariyer hedeflerini ekip ba\u015far\u0131s\u0131yla entegre eder"],overused:["Tak\u0131m kimli\u011fine o kadar odaklan\u0131r ki silo olu\u015fturur","Konsens\u00fcs k\u00fclt\u00fcr\u00fc zor kararlar\u0131 geciktirir","\u00c7at\u0131\u015fmadan ka\u00e7\u0131n\u0131r"],retail:"Yeni ma\u011faza m\u00fcd\u00fcr\u00fc ortak hedef koyuyor ve ekip ay sonunda puan y\u00fckseltiyor.",interview:"\u2018Kurdu\u011fun ya da d\u00f6n\u00fc\u015ft\u00fcrd\u00fc\u011f\u00fcn bir tak\u0131m\u0131 anlat.\u2019"},dt:{def:"Ba\u015fkalar\u0131n\u0131 hem kariyer hedeflerine hem organizasyonun hedeflerine ula\u015facak bi\u00e7imde geli\u015ftirmek.",why:"\u0130nsanlar\u0131n b\u00fcy\u00fck \u00e7o\u011funlu\u011fu b\u00fcy\u00fcmek ve geli\u015fmek ister. Perakendede bu yetkinlik \u00f6zellikle kritiktir \u00e7\u00fcnk\u00fc sekt\u00f6r\u00fcn en b\u00fcy\u00fck zorluklarından biri turnoverdir.",skilled:["Ba\u015fkalar\u0131n\u0131 geli\u015ftirmeyi y\u00fcksek \u00f6ncelik olarak g\u00f6r\u00fcr","Ko\u00e7luk ve geribildirim arac\u0131l\u0131\u011f\u0131yla aktif olarak geli\u015ftirir","\u00c7al\u0131\u015fanlar\u0131n kariyer hedeflerini organizasyonla hizalar","Geli\u015fimsel transferleri destekler","Ger\u00e7ek geli\u015fim konuşmalar\u0131 yapar"],lessskilled:["Ba\u015fkalar\u0131n\u0131 geli\u015ftirmek i\u00e7in zaman ay\u0131rmaz","Geli\u015fim zorunluluklar\u0131n\u0131 ge\u00e7i\u015ftirir","G\u00f6r\u00fcn\u00fcrl\u00fc\u011f\u00fc payla\u015fmaktan ka\u00e7\u0131n\u0131r","Geli\u015fimsel geribildirim vermekten ka\u00e7\u0131n\u0131r","Geli\u015fimsel hamle tan\u0131mlamakta g\u00fc\u00e7l\u00fck \u00e7eker"],highlyskilled:["Yetenek geli\u015fimini organizasyonel zorunluluk olarak g\u00f6r\u00fcr","Organizasyon genelinde geli\u015fimsel f\u0131rsatlar\u0131 fark eder","Geli\u015fim i\u00e7in kas\u0131tl\u0131 olarak zorluk yarat\u0131r"],overused:["Geli\u015ftirmeye o kadar odaklan\u0131r ki i\u015f sonu\u00e7lar\u0131 geri planda kal\u0131r","Herkesin her \u015feyde geli\u015fmesini bekler","Geli\u015fim i\u00e7in sab\u0131rs\u0131zlan\u0131r"],retail:"E\u011fitim m\u00fcd\u00fcr\u00fc, yeni gelen bir sat\u0131\u015f dan\u0131\u015fman\u0131n\u0131n potansiyelini fark eder ve alt\u0131 ay sonra kat m\u00fcd\u00fcr\u00fc aday\u0131 olur.",interview:"\u2018Ekibindeki birini aktif olarak geli\u015ftirdi\u011fin bir s\u00fcreci anlat.\u2019"},de:{def:"\u0130nsanlar\u0131n organizasyonun hedeflerine ula\u015fmak i\u00e7in ellerinden gelenin en iyisini yapmak \u00fczere motive oldu\u011fu bir \u00e7al\u0131\u015fma iklimi yaratmak.",why:"\u0130nsanlar ba\u011fl\u0131 oldu\u011funda daha b\u00fcy\u00fck \u015feyler olur. Perakendede ba\u011fl\u0131l\u0131k do\u011frudan m\u00fc\u015fteri deneyimine yans\u0131r.",skilled:["\u0130\u015fi insanlar\u0131n hedef ve motivasyonlar\u0131na hizalar","Ba\u015fkalar\u0131n\u0131 g\u00fc\u00e7lendirir","Her ki\u015finin katk\u0131s\u0131n\u0131 somut bi\u00e7imde g\u00f6sterir","G\u00f6r\u00fc\u015f payla\u015f\u0131m\u0131n\u0131 davet eder","Motivasyonlar ile hedefler aras\u0131nda ba\u011flant\u0131 g\u00f6sterir"],lessskilled:["Farkl\u0131 insanlarla ili\u015fki kurmakta g\u00fc\u00e7l\u00fck \u00e7eker","Ba\u015fkalar\u0131n\u0131 neyin motive etti\u011fini bilmez","Yeterli esneklik ve \u00f6zerklik tan\u0131maz","Co\u015fku yaratmak i\u00e7in az \u00e7aba sarf eder","Sahipli\u011fi payla\u015fmaya isteksizdir"],highlyskilled:["Bireysel motivat\u00f6rleri derinlemesine anlar","Zorlu d\u00f6nemlerde bile y\u00fcksek ba\u011fl\u0131l\u0131k ortam\u0131n\u0131 s\u00fcrd\u00fcr\u00fcr","Ekip ba\u011fl\u0131l\u0131\u011f\u0131n\u0131 proaktif y\u00f6netir"],overused:["Ba\u011fl\u0131l\u0131k u\u011fruna zor kararlardan ka\u00e7\u0131n\u0131r","Ba\u011fl\u0131l\u0131\u011f\u0131 performans\u0131n \u00f6n\u00fcne koyar","Her karar\u0131 konsens\u00fcsle almak ister"],retail:"Ma\u011faza m\u00fcd\u00fcr\u00fc her Pazartesi sabah\u0131 bir ba\u015far\u0131 an\u0131s\u0131 payla\u015f\u0131yor ve ekip hafta boyunca bu mesaj\u0131 ta\u015f\u0131yor.",interview:"\u2018Ekip ba\u011fl\u0131l\u0131\u011f\u0131n\u0131n d\u00fc\u015ft\u00fc\u011f\u00fcn\u00fc fark etti\u011fin bir d\u00f6nemi anlat.\u2019"},pa:{def:"\u0130\u015fi organizasyonel hedeflerle uyumlu bi\u00e7imde planlamak ve \u00f6nceliklendirmek.",why:"\u0130yi bir plan her \u015feyi kolayla\u015ft\u0131r\u0131r. Perakendede planlama yetersizli\u011fi direkt zarar \u00fcretir.",skilled:["Hedefleri geni\u015f organizasyonel hedeflerle uyumlu belirler","Hedefleri eylem ad\u0131mlar\u0131na k\u0131rar","Faaliyetleri takvimlerle a\u015famaland\u0131r\u0131r","Etkili acil durum planlar\u0131 geli\u015ftirir","Zaman ve kaynaklar\u0131 dengeli y\u00f6netir"],lessskilled:["Anl\u0131k ihtiya\u00e7lara tak\u0131l\u0131r","Zaman ve kaynaklar\u0131 net kullanmaz","Acil durum planlar\u0131 eksiktir","\u0130lerlemeyi takip etmez"],highlyskilled:["En y\u00fcksek \u00f6nceliklere odaklan\u0131r","Kaynaklar\u0131 tam tahsis eden planlar yapar","Engelleri \u00f6ng\u00f6r\u00fcr"],overused:["Planlamaya \u00e7ok zaman harcar","Planlara \u0131srarla ba\u011fl\u0131 kal\u0131r","Ba\u015fkalar\u0131na \u00f6zerklik vermez"],retail:"Operasyon m\u00fcd\u00fcr\u00fc t\u00fcm de\u011fi\u015fkenleri tek bir plana d\u00f6ker. A\u00e7\u0131l\u0131\u015f g\u00fcn\u00fcnde s\u00fcrpriz yok.",interview:"\u2018Karma\u015f\u0131k bir s\u00fcreci planlad\u0131\u011f\u0131n bir durumu anlat.\u2019"},fa:{def:"Temel finansal g\u00f6stergeleri anlay\u0131p yorumlamak ve daha iyi i\u015f kararlar\u0131 almak i\u00e7in kullanmak.",why:"Perakendede finansal okuryazarl\u0131k olmadan ma\u011faza y\u00f6netmek; g\u00f6sterge paneline bakmadan araba s\u00fcrmek gibidir.",skilled:["Temel finansal g\u00f6stergelerin anlam\u0131n\u0131 anlar","Finansal analizi stratejik se\u00e7enekler i\u00e7in kullan\u0131r","Niceliksel ve niteliksel bilgiyi b\u00fct\u00fcnle\u015ftirir","Farkl\u0131 i\u015flevler \u00fczerindeki finansal etkiyi ba\u011flar","B\u00fct\u00e7e s\u00fcre\u00e7lerine aktif kat\u0131l\u0131r"],lessskilled:["Finansal kavramlarla a\u015final\u0131\u011f\u0131 yoktur","Neden-sonu\u00e7 ili\u015fkilerini kavrayamaz","Finansal etkiyi g\u00f6z ard\u0131 eder","Operasyonel ba\u015far\u0131y\u0131 k\u00e2rl\u0131l\u0131ktan ba\u011f\u0131ms\u0131z d\u00fc\u015f\u00fcn\u00fcr"],highlyskilled:["Finansal bilgiyi i\u015f istihbarat\u0131na d\u00f6n\u00fc\u015ft\u00fcr\u00fcr","Trendleri belirlemek i\u00e7in g\u00f6stergeleri izler","Gelecek odakl\u0131 karar almada kullan\u0131r"],overused:["Finansal g\u00f6stergeleri tek kriter olarak kullan\u0131r","K\u0131sa vadeli kazan\u0131mlar i\u00e7in uzun vadeli hedefleri feda eder","\u0130nsan boyutunu g\u00f6rmezden gelir"],retail:"Ma\u011faza m\u00fcd\u00fcr\u00fc ciroya de\u011fil, k\u00e2r marj\u0131na bak\u0131yor. Promosyon agresifmi\u015f.",interview:"\u2018Finansal bir g\u00f6stergeyi takip edip harekete ge\u00e7ti\u011fin bir durumu anlat.\u2019"},sm:{def:"Gelecekteki olas\u0131l\u0131klar\u0131 \u00f6ng\u00f6rebilmek ve bunlar\u0131 at\u0131l\u0131m yaratan stratejilere d\u00f6n\u00fc\u015ft\u00fcrmek.",why:"Stratejik olmak; gelece\u011fe net niyetler ve ama\u00e7l\u0131 eylemlerle bakmakt\u0131r. K\u0131sa vadeli bask\u0131lara g\u00f6m\u00fclmek organizasyonu rekabetsiz b\u0131rak\u0131r.",skilled:["K\u0131sa vadeli bask\u0131 alt\u0131nda uzun vadeli kararlardan vazge\u00e7mez","Sekt\u00f6r trendlerini ve rakip hareketlerini izler","Gelecek senaryolar\u0131n\u0131 g\u00fcndeme ta\u015f\u0131r","S\u00fcrd\u00fcr\u00fclebilir de\u011fer yaratacak tablolar \u00e7izer","Rekabet\u00e7i stratejiler olu\u015fturur"],lessskilled:["Operasyonel detaylara odaklan\u0131r; b\u00fcy\u00fck resmi ka\u00e7\u0131r\u0131r","Strateji konuşmalar\u0131nda zorlan\u0131r","De\u011fi\u015fen ko\u015fullara tepkisel davran\u0131r","Rakiplerden habersizdir"],highlyskilled:["B\u00fcy\u00fck resmi s\u00fcrekli g\u00f6r\u00fcr","Vizyoner yap\u0131ya sahiptir","Net ve iddial\u0131 stratejik ad\u0131mlar belirler"],overused:["G\u00fcnl\u00fck ihtiya\u00e7lar\u0131 ihmal eder","Planlar\u0131 a\u015f\u0131r\u0131 karma\u015f\u0131k hale getirir","Ekip ba\u011flant\u0131s\u0131n\u0131 kaybeder"],retail:"B\u00f6lge m\u00fcd\u00fcr\u00fc m\u00fc\u015fteri memnuniyet puan\u0131n\u0131n d\u00fc\u015ft\u00fc\u011f\u00fcn\u00fc fark ediyor ve e\u011fitim yat\u0131r\u0131m\u0131 yap\u0131yor.",interview:"\u2018Uzun vadeli d\u00fc\u015f\u00fcnerek ald\u0131\u011f\u0131n bir karar\u0131 anlat.\u2019"},nl:{def:"Yeni sorunlarla ba\u015fa \u00e7\u0131karken deneyerek aktif \u00f6\u011frenmek.",why:"De\u011fi\u015fimin h\u0131zlanan temposuyla birlikte, yeni \u00e7\u00f6z\u00fcmler \u00f6\u011frenip uygulamak giderek daha kritik.",skilled:["Yeni durumlarla kar\u015f\u0131la\u015ft\u0131\u011f\u0131nda h\u0131zla \u00f6\u011frenir","Denemeler yapar","Tan\u0131d\u0131k olmayan g\u00f6revlerin zorlu\u011funu kucaklar","Hatalardan dersler \u00e7\u0131kar\u0131r","Ge\u00e7mi\u015f deneyimleri yeni ba\u011flamlara uygular"],lessskilled:["Yeni durumlarda \u00f6\u011frenmekte g\u00fc\u00e7l\u00fck \u00e7eker","Denenmi\u015f \u00e7\u00f6z\u00fcmlere \u015fans vermez","Geçmi\u015fteki y\u00f6ntemlerle s\u0131n\u0131rl\u0131 kal\u0131r","Risk almaz","Hatay\u0131 utanç kayna\u011f\u0131 olarak g\u00f6r\u00fcr"],highlyskilled:["Defalarca deneme yapar","Hatalar\u0131 \u00f6\u011frenme f\u0131rsat\u0131 olarak g\u00f6r\u00fcr","Tan\u0131d\u0131k olmayan g\u00f6revlerden keyif al\u0131r"],overused:["Yenili\u011fi o kadar sever ki yürürlükteki şeyleri bozar","Kan\u0131tlanmam\u0131\u015f fikirlere odaklan\u0131r","Gereksiz riskler al\u0131r"],retail:"Sat\u0131\u015f dan\u0131\u015fman\u0131 yeni dijital \u00f6deme sistemini kendi ba\u015f\u0131na kurcalayarak herkesten \u00f6nce \u00f6\u011freniyor.",interview:"\u2018Daha \u00f6nce hi\u00e7 yapmad\u0131\u011f\u0131n bir \u015feyi \u00f6\u011frenmek zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"},br:{def:"Zorlu durumlarla kar\u015f\u0131la\u015f\u0131ld\u0131\u011f\u0131nda aksiliklerden s\u0131yr\u0131lmak; g\u00fc\u00e7lenerek devam etmek.",why:"Aksilikler \u00e7o\u011funlukla ka\u00e7\u0131n\u0131lmazd\u0131r. Fark, bu aksiliklere nas\u0131l yan\u0131t verildinde yatar.",skilled:["Bask\u0131 alt\u0131nda kendinden emin kal\u0131r","Krizleri etkili y\u00f6netir","Olumlu tutum s\u00fcrd\u00fcr\u00fcr","Aksiliklerden h\u0131zla toparlan\u0131r","Zorluklardan b\u00fcy\u00fcr"],lessskilled:["Kolayca sars\u0131l\u0131r","D\u00fc\u015f\u00fck enerji sergiler","Savunmaya ge\u00e7er","Toparlanmak uzun s\u00fcrer","Anksiyete ya\u015far"],highlyskilled:["Odakl\u0131 ve dengeli kal\u0131r","Ba\u015far\u0131s\u0131zl\u0131ktan sistematik \u00f6\u011frenir","Dayan\u0131kl\u0131l\u0131\u011f\u0131 kas\u0131tl\u0131 olarak in\u015fa eder"],overused:["Ciddi sorunlara ge\u00e7 m\u00fcdahale eder","S\u0131n\u0131rlar\u0131n\u0131 g\u00f6rmez","Zorlu durumlar\u0131n etkisini k\u00fc\u00e7\u00fcmser"],retail:"Sat\u0131\u015f dan\u0131\u015fman\u0131 zor m\u00fc\u015fterilerden sonra molay\u0131 de\u011ferlendiriyor ve ayn\u0131 enerjiyle geri d\u00f6n\u00fcyor.",interview:"\u2018Ger\u00e7ekten zorland\u0131\u011f\u0131n bir d\u00f6nemi anlat.\u2019"},is:{def:"\u00c7e\u015fitli insan gruplar\u0131yla a\u00e7\u0131k ve rahat bi\u00e7imde ili\u015fki kurabilmek.",why:"\u0130li\u015fki y\u00f6netimi, organizasyonlarda i\u015flerin y\u00fcr\u00fct\u00fclmesinin ayr\u0131lmaz bir par\u00e7as\u0131d\u0131r.",skilled:["Kademeler genelinde rahat\u00e7a ili\u015fki kurar","Diplomasi ve incelikle hareket eder","S\u0131cak ve kabul edici ba\u011f in\u015fa eder","Farkl\u0131 insanlarla yap\u0131c\u0131 ili\u015fkiler kurar","Grup dinamiklerini okur"],lessskilled:["Az say\u0131da ili\u015fki kurar","Farkl\u0131 insanlarla etkile\u015fimde rahats\u0131z olur","Duyars\u0131z ifadeler kullan\u0131r","Ba\u015fkalar\u0131n\u0131n ihtiya\u00e7lar\u0131na az ilgi g\u00f6sterir","Ele\u015ftiri kar\u015f\u0131s\u0131nda savunmaya ge\u00e7er"],highlyskilled:["\u00c7ok \u00e7e\u015fitli insanlarla proaktif ili\u015fki geli\u015ftirir","Zor durumlarda bile anl\u0131k ba\u011f kurar","G\u00fc\u00e7 ki\u015filerle bile \u00fcretken ili\u015fki s\u00fcrd\u00fcr\u00fcr"],overused:["Herkes taraf\u0131ndan sevilmek ister","A\u015f\u0131r\u0131 uyum sa\u011flama duru\u015fu gizler","\u00c7at\u0131\u015fmadan ka\u00e7\u0131n\u0131r"],retail:"K\u0131demli dan\u0131\u015fman farkl\u0131 m\u00fc\u015fterilere farkl\u0131 yakla\u015f\u0131mla hizmet veriyor.",interview:"\u2018Ba\u015flang\u0131\u00e7ta zorland\u0131\u011f\u0131n ama g\u00fc\u00e7l\u00fc bir ili\u015fkiye d\u00f6n\u00fc\u015ft\u00fcrd\u00fc\u011f\u00fcn birini anlat.\u2019"},mc:{def:"\u00c7at\u0131\u015fma durumlar\u0131n\u0131 g\u00fcr\u00fclt\u00fcy\u00fc asgari d\u00fczeyde tutarak etkili bi\u00e7imde y\u00f6netmek.",why:"\u00c7at\u0131\u015fma, organizasyonlar\u0131n do\u011fal bir par\u00e7as\u0131d\u0131r. \u0130yi y\u00f6netilen \u00e7at\u0131\u015fma daha iyi alternatifler bulmak i\u00e7in forum sa\u011flar.",skilled:["\u00c7at\u0131\u015fmalara f\u0131rsat olarak bakar","Anla\u015fmazl\u0131klar\u0131 adil bi\u00e7imde y\u00f6netir","Farkl\u0131 g\u00f6r\u00fc\u015fleri b\u00fct\u00fcnle\u015ftirir","Farkl\u0131l\u0131klar\u0131 \u00fcretken bi\u00e7imde y\u00f6netir","Ger\u00e7ek sorunu tespit eder"],lessskilled:["\u00c7at\u0131\u015fmadan ka\u00e7\u0131n\u0131r","Anla\u015fmazl\u0131klar\u0131 \u00e7\u00f6zmekte g\u00fc\u00e7l\u00fck \u00e7eker","Tam anlamadan taraf tutar","\u00c7at\u0131\u015fmalar\u0131n b\u00fcy\u00fcmesine izin verir","\u0130nsanlar\u0131 savunmaya sokar"],highlyskilled:["\u00c7at\u0131\u015fmalar\u0131 \u00f6ng\u00f6r\u00fcr","T\u00fcm meseleleri yak\u0131ndan dinler","Ortak zemin bulur ve y\u00f6nlendirir"],overused:["Ba\u015fkalar\u0131n\u0131n meselelerine kar\u0131\u015f\u0131yor g\u00f6r\u00fcn\u00fcr","Tart\u0131\u015fmaya \u00e7ok heveslidir","Taraflar haz\u0131r olmadan \u00e7\u00f6z\u00fcme iter"],retail:"Kat m\u00fcd\u00fcr\u00fc iki dan\u0131\u015fman\u0131 dinliyor ve birlikte \u00e7\u00f6z\u00fcm \u00fcretiyorlar.",interview:"\u2018Ciddi bir \u00e7at\u0131\u015fma yaşand\u0131\u011f\u0131 ve m\u00fcdahale etti\u011fin bir durumu anlat.\u2019"},ci:{def:"Organizasyonun ba\u015far\u0131l\u0131 olmas\u0131 i\u00e7in yeni ve daha iyi yollar yaratmak.",why:"Perakendede yenilik hayatta kalman\u0131n ko\u015fuludur.",skilled:["Yeni ve kullan\u0131\u015fl\u0131 fikirler \u00fcretir","Sorunlara yeni bak\u0131\u015f a\u00e7\u0131lar\u0131 ta\u015f\u0131r","Yarat\u0131c\u0131 fikirleri prati\u011fe ge\u00e7irir","\u00c7e\u015fitli d\u00fc\u015f\u00fcnceleri cesaretlendirir","Stat\u00fckoya sorular sorar"],lessskilled:["Konfor alan\u0131nda kal\u0131r","Al\u0131\u015f\u0131lm\u0131\u015f fikirler sunar","Ba\u015fkalar\u0131n\u0131n fikirlerini ele\u015ftirir","Yarat\u0131c\u0131 giri\u015fimleri cayd\u0131r\u0131r"],highlyskilled:["Geleneksel y\u00f6ntemlerin \u00f6tesine ge\u00e7er","Yenilik\u00e7i fikirlerin pazar potansiyelini de\u011ferlendirir","Fikirleri hayata ge\u00e7irene kadar takip eder"],overused:["Y\u00fcr\u00fcrl\u00fckteki \u015feyleri gereksiz bozar","Kan\u0131tlanmam\u0131\u015f fikirlere kapaklan\u0131r","K\u00f6kteki sorunu \u00e7\u00f6zmeden yeniliklere atlar"],retail:"VM koordinat\u00f6r\u00fc m\u00fc\u015fteri ak\u0131\u015f verisine bakarak farkl\u0131 bir yerle\u015fim \u00f6neriyor ve ilgi y\u00fczde yirmi art\u0131yor.",interview:"\u2018Mevcut bir s\u00fcreci geli\u015ftirmek i\u00e7in \u00f6nc\u00fcl\u00fck etti\u011fin bir durumu anlat.\u2019"},pe:{def:"Ba\u015fkalar\u0131n\u0131n deste\u011fini ve ba\u011fl\u0131l\u0131\u011f\u0131n\u0131 kazanmak i\u00e7in ikna edici arg\u00fcmanlar kullanmak.",why:"Perakendede ikna etme her d\u00fczeyde devrededir.",skilled:["Arg\u00fcmanlar\u0131n\u0131 kitleye uygun konumland\u0131r\u0131r","Ba\u015fkalar\u0131n\u0131 harekete ge\u00e7irir","Ustaca m\u00fczakere eder","\u0130li\u015fkilere zarar vermeksizin tavizler elde eder","Tepkilere etkili yan\u0131t verir"],lessskilled:["Bak\u0131\u015f a\u00e7\u0131s\u0131n\u0131 dayat\u0131r","Destek kazanamaz","M\u00fczakere edemez","Olumsuz tepkiler verir","Mant\u0131kl\u0131 arg\u00fcman olu\u015fturamaz"],highlyskilled:["Ba\u011fl\u0131l\u0131k kazanan bi\u00e7imde payla\u015f\u0131r","Ustaca m\u00fczakere eder","Birden fazla payda\u015f\u0131n ihtiya\u00e7lar\u0131n\u0131 kar\u015f\u0131lar"],overused:["S\u00fcrekli ikna etme yorgunlu\u011fu yarat\u0131r","Dinlemek yerine konu\u015fur","A\u015f\u0131r\u0131 \u0131srarc\u0131 olur"],retail:"Ma\u011faza m\u00fcd\u00fcr\u00fc veri ve \u00f6rneklerle b\u00f6lge m\u00fcd\u00fcr\u00fcn\u00fc ikna ediyor.",interview:"\u2018Zor birini ikna etmek zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"},ts:{def:"\u0130\u015f b\u00fcy\u00fctmeye y\u00f6nelik dijital ve teknoloji uygulamalar\u0131ndaki yenilikleri \u00f6ng\u00f6rmek ve benimsemek.",why:"Dijital yetkinlik art\u0131k olmazsa olmazd\u0131r. Perakendede teknoloji d\u00f6n\u00fc\u015f\u00fcm\u00fc somut ve h\u0131zl\u0131d\u0131r.",skilled:["Ortaya \u00e7\u0131kan teknolojilerin etkisini \u00f6ng\u00f6r\u00fcr","Yeni teknik beceriler i\u00e7in \u00e7evresini tarar","D\u00fc\u015f\u00fck etkili teknolojileri reddeder","Yeni teknolojileri h\u0131zla \u00f6\u011frenir"],lessskilled:["Temel teknolojide deneyimsizdir","Yeni teknolojileri aramaz","Teknoloji de\u011fi\u015fimini tehdit olarak g\u00f6r\u00fcr","Sadece bildiklerini kullan\u0131r"],highlyskilled:["Teknoloji at\u0131l\u0131mlar\u0131 i\u00e7in \u00e7evresini tarar","Teknolojileri hem dener hem uygular","Ba\u015fkalar\u0131n\u0131n benimsemesini te\u015fvik eder"],overused:["Her yeni teknolojiyi denemek ister","\u0130nsani boyutu g\u00f6z ard\u0131 eder","Teknolojiyi amac\u0131n \u00f6n\u00fcne koyar"],retail:"Sat\u0131\u015f dan\u0131\u015fman\u0131 yeni sadakat uygulamas\u0131n\u0131 herkesten \u00f6nce \u00f6\u011freniyor ve en y\u00fcksek kay\u0131t oran\u0131na sahip oluyor.",interview:"\u2018Yeni bir teknoloji \u00f6\u011frenmek zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"},dq:{def:"Organizasyonun ilerlemesini sa\u011flayacak iyi ve zaman\u0131nda kararlar almak.",why:"\u0130yi karar almak zorludur: k\u0131sa zaman, s\u0131n\u0131rl\u0131 bilgi, zor \u00f6d\u00fcnle\u015fimler.",skilled:["Eksik bilgiyle bile sa\u011flam kararlar al\u0131r","Analiz, bilgelik ve yarg\u0131y\u0131 birle\u015ftirir","\u0130lgili fakt\u00f6rleri de\u011ferlendirir","H\u0131zl\u0131 %80 \u00e7\u00f6z\u00fcm\u00fcn yeterli oldu\u011funu bilir"],lessskilled:["Karar almay\u0131 geciktirir","Eksik veriye dayan\u0131r","Farkl\u0131 bak\u0131\u015f a\u00e7\u0131lar\u0131n\u0131 g\u00f6rmezden gelir","Sonu\u00e7lar\u0131 de\u011ferlendirmez"],highlyskilled:["Belirsizlikte y\u00fcksek kaliteli kararlar al\u0131r","Aktif olarak g\u00f6r\u00fc\u015f al\u0131r","G\u00f6r\u00fc\u015fleri olgulardan ay\u0131r\u0131r"],overused:["A\u015f\u0131r\u0131 titiz s\u00fcrec uygular","Analiz felci ya\u015fan\u0131r","Her kararda konsens\u00fcs arar"],retail:"B\u00f6lge m\u00fcd\u00fcr\u00fc iki soruyla yeterli bilgiye ula\u015f\u0131yor. Karar kalitesi do\u011fru soruyla ba\u015flar.",interview:"\u2018Eksik bilgiyle \u00f6nemli bir karar almak zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"},op:{def:"\u0130\u015fleri tamamlaman\u0131n en etkili ve verimli yollar\u0131n\u0131 bilmek.",why:"Harika s\u00fcre\u00e7ler i\u015fi basitle\u015ftirir ve maliyetleri d\u00fc\u015f\u00fcr\u00fcr.",skilled:["Gerekli s\u00fcre\u00e7leri tan\u0131mlar ve olu\u015fturur","Faaliyetleri verimli i\u015f ak\u0131\u015flar\u0131na g\u00f6re ay\u0131r\u0131r","Uzaktan y\u00f6netimi m\u00fcmk\u00fcn k\u0131lan s\u00fcre\u00e7ler tasarlar","S\u00fcre\u00e7leri iyile\u015ftirmenin yollar\u0131n\u0131 arar"],lessskilled:["Da\u011f\u0131n\u0131k \u00e7al\u0131\u015f\u0131r","\u0130yile\u015ftirmeye odaklanmaz","Sistemler a\u00e7\u0131s\u0131ndan d\u00fc\u015f\u00fcnmez","Etkili s\u00fcre\u00e7leri bulmakta g\u00fc\u00e7l\u00fck \u00e7eker","Mevcut s\u00fcre\u00e7leri oldu\u011fu gibi kabul eder"],highlyskilled:["En kritik s\u00fcre\u00e7lere odaklan\u0131r","Kaynaklar\u0131 tam tahsis eden planlar haz\u0131rlar","Engelleri \u00f6ng\u00f6r\u00fcr"],overused:["S\u00fcrece o kadar odaklan\u0131r ki esnekli\u011fi g\u00f6z ard\u0131 eder","K\u00fc\u00e7\u00fck sorunlar\u0131 b\u00fcy\u00fck g\u00fcncellemelerle \u00e7\u00f6zer","Anl\u0131k adaptasyona diren\u00e7 g\u00f6sterir"],retail:"Stok sorumlusu ger\u00e7ek zamanl\u0131 giri\u015f s\u00fcrecini de\u011fi\u015ftiriyor ve iadeler y\u00fczde k\u0131rk d\u00fc\u015f\u00fcyor.",interview:"\u2018Verimsiz bir s\u00fcreci fark edip iyile\u015ftirdi\u011fin bir durumu anlat.\u2019"},bs:{def:"Birden fazla payda\u015f\u0131n ihtiya\u00e7lar\u0131n\u0131 \u00f6ng\u00f6rmek ve dengelemek.",why:"Payda\u015flar herhangi bir stratejinin ba\u015far\u0131s\u0131 i\u00e7in kritiktir.",skilled:["\u0130\u00e7 ve d\u0131\u015f payda\u015flar\u0131n ihtiya\u00e7lar\u0131n\u0131 anlar","Birden fazla payda\u015f\u0131n \u00e7\u0131karlar\u0131n\u0131 dengeler","K\u00fclt\u00fcrel ve etik fakt\u00f6rleri g\u00f6zetir","\u00c7at\u0131\u015fan taleplerde adil davran\u0131r"],lessskilled:["S\u0131n\u0131rl\u0131 say\u0131da payda\u015fa odaklan\u0131r","Baz\u0131 payda\u015flar\u0131 daha g\u00fc\u00e7l\u00fc g\u00f6zetir","\u00c7at\u0131\u015fan taleplerden adaletsiz etkilenir","Payda\u015f haritas\u0131 \u00e7\u0131karmaz"],highlyskilled:["T\u00fcm payda\u015flar i\u00e7in ileti\u015fim s\u00fcre\u00e7lerini korur","Tutarl\u0131 yakla\u015f\u0131m sa\u011flar","\u00c7at\u0131\u015fan payda\u015flar aras\u0131nda g\u00fcven in\u015fa eder"],overused:["Herkesi memnun etmeye \u00e7al\u0131\u015f\u0131r","Konsens\u00fcs karar h\u0131z\u0131n\u0131 zay\u0131flat\u0131r","Kendi g\u00f6r\u00fc\u015f\u00fcn\u00fc arka plana iter"],retail:"B\u00f6lge direkt\u00f6r\u00fc her paydaş grubuyla ayr\u0131 konu\u015fuyor. Herkes duyuldu\u011funu hissediyor.",interview:"\u2018Farkl\u0131 \u00e7\u0131karlara sahip birden fazla payda\u015f\u0131 y\u00f6netti\u011fin bir durumu anlat.\u2019"},at:{def:"Mevcut ve gelecekteki i\u015f ihtiya\u00e7lar\u0131n\u0131 kar\u015f\u0131layacak en iyi yetenekleri \u00e7ekmek ve se\u00e7mek.",why:"Organizasyonlar yetenekle dolu olmal\u0131d\u0131r. Perakendede yetenek \u00e7ekme hem acil hem stratejik bir zorunluluktur.",skilled:["\u00c7e\u015fitli ve y\u00fcksek kalibreli yetenekleri se\u00e7er","Grubun ihtiya\u00e7lar\u0131n\u0131 kar\u015f\u0131layacak yetene\u011fi bulur","Yetenek bo\u015fluklar\u0131n\u0131 do\u011fru dengeyle kapatır","De\u011ferlendirmede g\u00fc\u00e7l\u00fc yarg\u0131 kapasitesine sahiptir","\u0130\u015fe al\u0131m kararlar\u0131n\u0131 kurumun de\u011ferleriyle hizalar"],lessskilled:["\u015eirketin ihtiyac\u0131n\u0131 anlamaz","Geli\u015fig\u00fczel yetenek se\u00e7er","E\u015fle\u015ftirme konusunda az ad\u0131m atar","Se\u00e7im kriterleri belirsizdir","Sezgiye a\u015f\u0131r\u0131 g\u00fcvenir"],highlyskilled:["\u00c7e\u015fitli kanallarla aktif olarak yetenek arar","\u00d6zg\u00fcn bir de\u011ferlendirme bak\u0131\u015f a\u00e7\u0131s\u0131 geli\u015ftirir","Gelece\u011fin gereksinimlerine g\u00f6re karar al\u0131r"],overused:["\u0130\u015fe al\u0131ma odaklan\u0131p mevcut ekibi g\u00f6z ard\u0131 eder","Kriterlere a\u015f\u0131r\u0131 ba\u011fl\u0131l\u0131k iyi adaylar\u0131 ka\u00e7\u0131r\u0131r","Gere\u011finden uzun bekler"],retail:"B\u00f6lge \u0130K i\u015f orta\u011f\u0131 deneyim yerine potansiyele bak\u0131yor ve do\u011fru aday\u0131 se\u00e7iyor.",interview:"\u2018\u0130\u015fe ald\u0131\u011f\u0131n ve zamanla do\u011fru tercih oldu\u011funu kan\u0131tlayan birini anlat.\u2019"},bi:{def:"\u0130\u015f d\u00fcnyas\u0131 ve pazar hakk\u0131ndaki bilgiyi organizasyonun hedeflerini ilerletmek i\u00e7in uygulamak.",why:"Alan\u0131 tan\u0131mak zorunludur. Perakendede i\u015f anlay\u0131\u015f\u0131; sekt\u00f6r\u00fcn dinamiklerini, rakiplerin stratejilerini anlayabilmektir.",skilled:["\u0130\u015flerin nas\u0131l y\u00fcr\u00fcd\u00fc\u011f\u00fcn\u00fc bilir","Trendleri takip eder","Stratejilerin pazarda i\u015fleyi\u015fini bilir","Sekt\u00f6r\u00fcn g\u00fc\u00e7l\u00fc ve zay\u0131f y\u00f6nlerini anlar"],lessskilled:["\u0130\u015flerin nas\u0131l y\u00fcr\u00fcd\u00fc\u011f\u00fcn\u00fc anlamaz","Trendlerle g\u00fcncel de\u011fildir","Stratejilerden habersizdir","\u0130\u015f s\u00fcr\u00fcc\u00fclerini dikkate almaz"],highlyskilled:["Derinlemesine anlar","\u0130lk fark edenler aras\u0131ndad\u0131r","Tutarl\u0131 bi\u00e7imde i\u015f s\u00fcr\u00fcc\u00fcleri odakl\u0131 bakar"],overused:["K\u0131sa vadeli kazan\u0131mlar i\u00e7in kullan\u0131r","Yeni fikirlere kapal\u0131 olur","Konformizme d\u00f6n\u00fc\u015f\u00fcr"],retail:"Ma\u011faza m\u00fcd\u00fcr\u00fc rakibin kampanyas\u0131n\u0131 erken fark ediyor ve kendi takti\u011fini \u00f6ne \u00e7ekiyor.",interview:"\u2018Sekt\u00f6r\u00fc takip ederek bir f\u0131rsat\u0131 erken fark etti\u011fin bir durumu anlat.\u2019"},cu:{def:"Zorlu durumlarda bile do\u011fru olan\u0131 s\u00f6ylemek ve yapmak i\u00e7in ad\u0131m atmak.",why:"Cesaret; korku yoklu\u011fu de\u011fil, korku olmas\u0131na ra\u011fmen hareket etmektir.",skilled:["Zor ad\u0131mlar\u0131 atar","Zor mesajlar\u0131 do\u011frudan iletir","Y\u00fcksek bask\u0131da net duruş sergiler","Zor kararlar i\u00e7in cesaret g\u00f6sterir","Etik d\u0131\u015f\u0131 durumlara a\u00e7\u0131k\u00e7a durur"],lessskilled:["Zor mesajlardan ka\u00e7\u0131n\u0131r","Bask\u0131 alt\u0131nda tutumunu de\u011fi\u015ftirir","H\u00e2kim g\u00f6r\u00fc\u015fe uyum sa\u011flar","\u00d6nerisini geri \u00e7eker"],highlyskilled:["Direni\u015f kar\u015f\u0131s\u0131nda savunur","Ba\u015fkalar\u0131na model olur","K\u00f6r noktalar\u0131 cesaretle dile getirir"],overused:["Ba\u015fkalar\u0131n\u0131 yeterince dinlemez","Esnek d\u00fc\u015f\u00fcnme daral\u0131r","Diplomatik hassasiyeti ihmal eder"],retail:"B\u00f6lge direkt\u00f6r\u00fc yanl\u0131\u015f buldu\u011fu kapanma karar\u0131n\u0131 \u00fcst y\u00f6netime sunuyor.",interview:"\u2018Pop\u00fcler olmayan ama do\u011fru oldu\u011funa inand\u0131\u011f\u0131n bir \u015feyi savundu\u011fun bir durumu anlat.\u2019"},cx:{def:"\u00c7eli\u015fkili ve eksik bilgiden bile anlaml\u0131 anlay\u0131\u015f \u00fcretmek; karma\u015f\u0131k sorunlar\u0131 etkili bi\u00e7imde \u00e7\u00f6zmek.",why:"Organizasyonlar giderek daha karma\u015f\u0131k hale geliyor. Basit sorunlar zaten \u00e7\u00f6z\u00fclm\u00fc\u015ft\u00fcr.",skilled:["Belirsiz bilgiden bile i\u00e7g\u00f6r\u00fc \u00e7\u0131kar\u0131r","Karma\u015f\u0131k sorunlar\u0131 sistematik ele al\u0131r","\u00c7ok de\u011fi\u015fkeni g\u00f6zetirken pratik kararlar al\u0131r","Karma\u015f\u0131k durumlar\u0131 anla\u015f\u0131l\u0131r a\u00e7\u0131klar","Belirsizlikte \u00e7al\u0131\u015f\u0131r"],lessskilled:["\u00c7ok boyutlu sorunlarda g\u00fc\u00e7l\u00fck \u00e7eker","Belirsizlikte karar almaktan ka\u00e7\u0131n\u0131r","Par\u00e7alara tak\u0131l\u0131r","Karma\u015f\u0131kl\u0131\u011f\u0131 art\u0131r\u0131r"],highlyskilled:["Geni\u015f ba\u011flamsal analiz yapar","Y\u00fcksek belirsizlikte net anlay\u0131\u015fa ula\u015f\u0131r","Ba\u015fkalar\u0131na da \u00f6\u011fretir"],overused:["Her soruna karma\u015f\u0131kl\u0131k g\u00f6z\u00fcyle bakar","Analiz karar h\u0131z\u0131n\u0131 yava\u015flat\u0131r","Ba\u015fkalar\u0131n\u0131 karma\u015f\u0131kl\u0131\u011fa ortak eder"],retail:"B\u00f6lge direkt\u00f6r\u00fc \u00fc\u00e7 farkl\u0131 ma\u011fazan\u0131n farkl\u0131 performans sorunlar\u0131n\u0131 ayr\u0131 ayr\u0131 te\u015fhis edip \u00fc\u00e7 farkl\u0131 m\u00fcdahale planl\u0131yor.",interview:"\u2018Birden fazla de\u011fi\u015fken ve belirsizlik i\u00e7eren karma\u015f\u0131k bir sorunu \u00e7\u00f6zmek zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"},sa:{def:"\u0130leti\u015fim tarz\u0131n\u0131, yakla\u015f\u0131m\u0131n\u0131 ve \u00e7al\u0131\u015fma bi\u00e7imini ko\u015fullara ve ki\u015filere g\u00f6re aktif olarak uyarlamak.",why:"Her durum farkl\u0131 bir yan\u0131t gerektirir. Uyum sa\u011flama yetkinli\u011fi; durumu do\u011fru okumak ve davran\u0131\u015f\u0131 buna g\u00f6re ayarlamakt\u0131r.",skilled:["Durumu ve kitleyi aktif olarak okur","Tarz\u0131n\u0131 ko\u015fullara g\u00f6re ayarlar","De\u011fi\u015fen ko\u015fullara uyarlanabilir","Farkl\u0131 bireylerin ihtiya\u00e7lar\u0131n\u0131 okur","Beklenmedik de\u011fi\u015fikliklerde sakin kal\u0131r"],lessskilled:["Her duruma ayn\u0131 yakla\u015f\u0131mla girer","H\u0131zla adapte olmakta g\u00fc\u00e7l\u00fck \u00e7eker","Farkl\u0131 ki\u015filerin ihtiya\u00e7lar\u0131n\u0131 okumaz","Beklenmedik durumlarda sars\u0131l\u0131r"],highlyskilled:["Ger\u00e7ek zamanl\u0131 okur ve anl\u0131k ayarlar","Farkl\u0131 ba\u011flamlarda e\u015fit etkinlikte \u00e7al\u0131\u015f\u0131r","Ba\u015fkalar\u0131n\u0131n uyum kapasitesini geli\u015ftirir"],overused:["A\u015f\u0131r\u0131 uyum tutars\u0131z g\u00f6r\u00fcnebilir","Otantiklik kayb\u0131na yol a\u00e7abilir","Baz\u0131 durumlar tutarl\u0131l\u0131k gerektirir"],retail:"Kat m\u00fcd\u00fcr\u00fc yeni dan\u0131\u015fmana sab\u0131rl\u0131 rehberlik sunarken, k\u0131demli dan\u0131\u015fmanla farkl\u0131 tonla konu\u015fuyor.",interview:"\u2018Al\u0131\u015flagelik yakla\u015f\u0131m\u0131n\u0131n i\u015fe yaramad\u0131\u011f\u0131n\u0131 fark etti\u011fin ve tarz\u0131n\u0131 de\u011fi\u015ftirmek zorunda kald\u0131\u011f\u0131n bir durumu anlat.\u2019"}};


/* ════════════════════════════════════════════════
   RETAIL ROLES TAXONOMY (fresh, career progression)
   ════════════════════════════════════════════════ */

var RETAIL_ROLES = [
  {key:'Sat\u0131\u015f Dan\u0131\u015fman\u0131',       level:'Giri\u015f'},
  {key:'K\u0131demli Sat\u0131\u015f Dan.',  level:'Giri\u015f-Orta'},
  {key:'Kat M\u00fcd\u00fcr\u00fc',          level:'Orta'},
  {key:'Ma\u011faza M\u00fcd. Yrd.',   level:'Orta-\u00dcst'},
  {key:'Ma\u011faza M\u00fcd\u00fcr\u00fc',       level:'\u00dcst'},
  {key:'B\u00f6lge M\u00fcd\u00fcr\u00fc',       level:'\u00dcst'},
  {key:'Genel M\u00fcd\u00fcr',        level:'\u00dcst'}
];

/* Role → competency codes mapping (uses ANCHORS keys) */
var ROLE_COMP_MAP = {
  'Sat\u0131\u015f Dan\u0131\u015fman\u0131':      ['cf','ce','it','co','ao'],
  'K\u0131demli Sat\u0131\u015f Dan.': ['cf','ce','it','co','is','nl'],
  'Kat M\u00fcd\u00fcr\u00fc':         ['dw','cf','ea','co','pa','bt'],
  'Ma\u011faza M\u00fcd. Yrd.':  ['bt','dw','cf','ea','pa','co','de'],
  'Ma\u011faza M\u00fcd\u00fcr\u00fc':      ['bt','dr','dw','cf','ea','pa','de','fa','sm'],
  'B\u00f6lge M\u00fcd\u00fcr\u00fc':      ['sm','dr','bt','de','pa','bs','fa','dw','at'],
  'Genel M\u00fcd\u00fcr':       ['sm','bi','dr','bt','de','bs','fa','dw','at','cx']
};

var FREE_LIMIT = 2;

/* ════════════════════════════════════════════════
   STATE MANAGEMENT (clean, minimal)
   ════════════════════════════════════════════════ */

var _loaded = false;
var S = {
  screen: 'intro',
  role: null,
  roleMode: null,
  readIndex: 0,
  readHistory: [],
  reset: function() {
    this.screen = 'intro';
    this.role = null;
    this.roleMode = null;
    this.readIndex = 0;
    this.readHistory = [];
  }
};

/* ════════════════════════════════════════════════
   CSS (fresh, no legacy)
   ════════════════════════════════════════════════ */

function injectCSS() {
  if (document.getElementById('yk-css')) return;
  var css = '';

  /* --- Layout --- */
  css += '#yk-container{max-width:720px;margin:0 auto;padding:0 0 40px}';
  css += '.yk-screen{animation:ykFadeIn .25s ease}';
  css += '@keyframes ykFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';

  /* --- Intro --- */
  css += '.yk-intro{text-align:center;padding:56px 24px;max-width:480px;margin:0 auto}';
  css += '.yk-intro-title{font-family:"Bricolage Grotesque",sans-serif;font-size:28px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:12px;line-height:1.2}';
  css += '.yk-intro-desc{font-size:14px;color:var(--muted,#6B7280);line-height:1.7;margin-bottom:28px}';
  css += '.yk-cta{background:var(--verm,#C94E28);color:#fff;border:none;border-radius:12px;padding:14px 40px;font-family:"Plus Jakarta Sans",sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}';
  css += '.yk-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,78,40,.25)}';
  css += '.yk-cta.secondary{background:#fff;color:var(--navy,#1E2D5E);border:1.5px solid var(--border,#E5E3DF)}';
  css += '.yk-cta.secondary:hover{border-color:var(--navy,#1E2D5E);transform:translateY(-1px)}';

  /* --- Role Selection --- */
  css += '.yk-role-section{margin-bottom:24px}';
  css += '.yk-screen-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:8px}';
  css += '.yk-screen-desc{font-size:13px;color:var(--muted,#6B7280);line-height:1.6;margin-bottom:24px}';
  css += '.yk-role-label{font-size:12px;font-weight:600;color:var(--muted,#6B7280);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px}';
  css += '.yk-role-current{font-size:14px;color:var(--text,#111);padding:12px 16px;background:var(--bg,#F7F6F4);border-radius:10px;border:1px solid var(--border,#E5E3DF);margin-bottom:24px}';
  css += '.yk-role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px}';
  css += '.yk-role-card{background:#fff;border:1.5px solid var(--border,#E5E3DF);border-radius:14px;padding:20px;cursor:pointer;transition:all .2s;text-align:center;position:relative}';
  css += '.yk-role-card:hover{border-color:var(--verm,#C94E28);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.06)}';
  css += '.yk-role-card .rc-icon{font-size:28px;margin-bottom:8px}';
  css += '.yk-role-card .rc-title{font-family:"Bricolage Grotesque",sans-serif;font-size:15px;font-weight:600;color:var(--navy,#1E2D5E);margin-bottom:4px}';
  css += '.yk-role-card .rc-desc{font-size:12px;color:var(--muted,#6B7280);line-height:1.5}';
  css += '.yk-role-card .rc-level{font-size:10px;font-weight:600;color:var(--verm,#C94E28);background:rgba(201,78,40,.08);padding:2px 8px;border-radius:8px;position:absolute;top:10px;right:10px}';

  /* --- Steps indicator --- */
  css += '.yk-steps{display:flex;justify-content:center;gap:8px;margin-bottom:28px;padding-top:8px}';
  css += '.yk-step{width:8px;height:8px;border-radius:50%;background:var(--border,#E5E3DF);transition:all .3s}';
  css += '.yk-step.active{background:var(--verm,#C94E28);width:28px;border-radius:4px}';

  /* --- Preview Grid --- */
  css += '.yk-preview-hero{background:linear-gradient(135deg,#2A3F7A 0%,var(--navy,#1E2D5E) 50%,#162247 100%);border-radius:16px;padding:24px;margin-bottom:24px;position:relative;overflow:hidden}';
  css += '.yk-preview-hero .ph-tag{display:inline-flex;align-items:center;gap:5px;background:rgba(201,78,40,.2);border:1px solid rgba(201,78,40,.4);border-radius:12px;padding:4px 10px;font-size:11px;font-weight:600;color:#FCA47A;margin-bottom:10px}';
  css += '.yk-preview-hero .ph-title{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:8px;line-height:1.3}';
  css += '.yk-preview-hero .ph-count{font-family:"DM Mono",monospace;font-size:13px;color:rgba(255,255,255,.6)}';
  css += '.yk-comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:24px}';
  css += '.yk-comp-card{background:#fff;border:1.5px solid var(--border,#E5E3DF);border-radius:14px;padding:18px;transition:all .2s;position:relative;overflow:hidden;cursor:pointer}';
  css += '.yk-comp-card:hover{border-color:#C4B5B0;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}';
  css += '.yk-comp-card.locked{cursor:default}.yk-comp-card.locked:hover{transform:none;box-shadow:none}';
  css += '.yk-comp-card .cc-name{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:600;color:var(--navy,#1E2D5E);margin-bottom:2px}';
  css += '.yk-comp-card .cc-kf{font-size:10px;color:var(--muted,#6B7280);font-family:"DM Mono",monospace;margin-bottom:8px}';
  css += '.yk-comp-card .cc-def{font-size:12px;color:var(--muted,#6B7280);line-height:1.5}';
  css += '.yk-lock{position:absolute;inset:0;background:rgba(247,246,244,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:12px;backdrop-filter:blur(3px)}';
  css += '.yk-lock-icon{width:36px;height:36px;background:var(--navy,#1E2D5E);border-radius:50%;display:flex;align-items:center;justify-content:center}';
  css += '.yk-lock-icon svg{width:16px;height:16px}';
  css += '.yk-lock-text{font-size:11px;font-weight:600;color:var(--navy,#1E2D5E);text-align:center}';

  /* --- Reading (full page, no drawer) --- */
  css += '.yk-reading{background:#fff;border:1.5px solid var(--border,#E5E3DF);border-radius:16px;padding:28px;margin-bottom:16px}';
  css += '.yk-reading-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px}';
  css += '.yk-reading-title{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:700;color:var(--navy,#1E2D5E);line-height:1.2}';
  css += '.yk-reading-kf{font-size:11px;color:var(--muted,#6B7280);font-family:"DM Mono",monospace;margin-top:3px}';
  css += '.yk-reading-counter{font-size:11px;color:var(--muted,#6B7280);font-family:"DM Mono",monospace;white-space:nowrap;padding:4px 10px;background:var(--bg,#F7F6F4);border-radius:8px}';
  css += '.yk-section{margin-bottom:22px}';
  css += '.yk-section-title{font-size:11px;font-weight:700;color:var(--muted,#6B7280);letter-spacing:.8px;text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px}';
  css += '.yk-def-box{font-size:13px;color:var(--text,#111);line-height:1.8;padding:14px 16px;background:#F8F7F5;border-radius:10px;border-left:3px solid var(--verm,#C94E28)}';
  css += '.yk-why{font-size:13px;color:#4B5563;line-height:1.8;margin-top:10px}';
  css += '.yk-anchor-list{display:flex;flex-direction:column;gap:7px}';
  css += '.yk-anchor{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;font-size:13px;line-height:1.6}';
  css += '.yk-anchor.strong{background:#F0FDF4;color:#14532D}';
  css += '.yk-anchor.growing{background:#FFFBEB;color:#78350F}';
  css += '.yk-anchor.overused{background:#FFF1F2;color:#881337}';
  css += '.yk-anchor.stellar{background:#F0FDF4;color:#14532D}';
  css += '.yk-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px}';
  css += '.yk-dot.strong{background:#15803D}.yk-dot.growing{border:2px solid #B45309;box-sizing:border-box}.yk-dot.overused{background:#E11D48}.yk-dot.stellar{background:#0F766E}';
  css += '.yk-retail-box{padding:14px;background:#EEF2FF;border-radius:10px;border-left:3px solid var(--navy,#1E2D5E)}';
  css += '.yk-retail-label{font-size:11px;font-weight:700;color:var(--navy,#1E2D5E);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px}';
  css += '.yk-retail-text{font-size:13px;color:#1E3A8A;line-height:1.6}';
  css += '.yk-interview-box{padding:14px;background:var(--navy,#1E2D5E);border-radius:10px;margin-top:12px}';
  css += '.yk-interview-label{font-size:12px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px}';
  css += '.yk-interview-q{font-size:13px;color:#fff;line-height:1.5}';

  /* --- Navigation --- */
  css += '.yk-nav{display:flex;align-items:center;gap:12px;padding:16px 0;margin-top:8px;border-top:1px solid var(--border,#E5E3DF)}';
  css += '.yk-nav-btn{padding:10px 20px;border-radius:10px;font-family:"Plus Jakarta Sans",sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;border:1.5px solid var(--border,#E5E3DF);background:#fff;color:var(--text,#111)}';
  css += '.yk-nav-btn.primary{background:var(--verm,#C94E28);color:#fff;border-color:var(--verm,#C94E28)}';
  css += '.yk-nav-btn.primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(201,78,40,.25)}';
  css += '.yk-nav-btn:not(.primary):hover{border-color:var(--navy,#1E2D5E);color:var(--navy,#1E2D5E)}';
  css += '.yk-nav-spacer{flex:1}';

  /* --- Lock screen --- */
  css += '.yk-lock-screen{text-align:center;padding:48px 24px;max-width:440px;margin:0 auto}';
  css += '.yk-lock-screen .ls-icon{font-size:48px;margin-bottom:16px}';
  css += '.yk-lock-screen .ls-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:10px}';
  css += '.yk-lock-screen .ls-desc{font-size:14px;color:var(--muted,#6B7280);line-height:1.7;margin-bottom:24px}';
  css += '.yk-lock-screen .ls-premium-cta{background:var(--verm,#C94E28);color:#fff;border:none;border-radius:12px;padding:14px 32px;font-family:"Plus Jakarta Sans",sans-serif;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px;display:block;width:100%;max-width:280px;margin-left:auto;margin-right:auto}';

  /* --- Completion --- */
  css += '.yk-completion{text-align:center;padding:48px 24px;max-width:440px;margin:0 auto}';
  css += '.yk-completion .cmp-icon{font-size:56px;margin-bottom:16px}';
  css += '.yk-completion .cmp-title{font-family:"Bricolage Grotesque",sans-serif;font-size:24px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:10px}';
  css += '.yk-completion .cmp-desc{font-size:14px;color:var(--muted,#6B7280);margin-bottom:28px;line-height:1.6}';
  css += '.yk-completion .cmp-stats{display:flex;justify-content:center;gap:32px;margin-bottom:32px}';
  css += '.yk-completion .cmp-stat{text-align:center}';
  css += '.yk-completion .cmp-stat-num{display:block;font-family:"DM Mono",monospace;font-size:32px;font-weight:700;color:var(--navy,#1E2D5E)}';
  css += '.yk-completion .cmp-stat-label{font-size:12px;color:var(--muted,#6B7280);margin-top:4px;display:block}';
  css += '.yk-completion .cmp-actions{display:flex;flex-direction:column;gap:10px;max-width:280px;margin:0 auto}';

  /* --- Mobile --- */
  css += '@media(max-width:768px){.yk-role-grid{grid-template-columns:repeat(2,1fr);gap:10px}.yk-role-card{padding:16px}.yk-role-card .rc-icon{font-size:22px}.yk-intro{padding:40px 16px}.yk-intro-title{font-size:24px}.yk-completion{padding:32px 16px}.yk-reading{padding:20px 16px}.yk-comp-grid{grid-template-columns:1fr}}';

  var el = document.createElement('style');
  el.id = 'yk-css';
  el.textContent = css;
  document.head.appendChild(el);
}

/* ════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════ */

function getContainer() {
  return document.getElementById('yk-container');
}

function canRead(index) {
  var tier = window._htMembershipTier || 'freemium';
  if (tier === 'premium') return true;
  return index < FREE_LIMIT;
}

function trackEvent(name, data) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[YK] ' + name, data || {});
  }
}

var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="white" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="white" stroke-width="2"/></svg>';

/* ════════════════════════════════════════════════
   NAVIGATION (clean state machine)
   ════════════════════════════════════════════════ */

function navigate(screen, data) {
  S.screen = screen;
  if (data && data.role) S.role = data.role;
  if (data && data.roleMode) S.roleMode = data.roleMode;
  switch(screen) {
    case 'intro':      renderIntro(); break;
    case 'role_select': renderRoleSelect(); break;
    case 'preview':    renderPreview(); break;
    case 'reading':    renderReading(data && data.code); break;
    case 'lock':       renderLock(); break;
    case 'completion': renderCompletion(); break;
  }
  trackEvent('screen_' + screen, data || {});
}

/* ════════════════════════════════════════════════
   SCREEN 1: INTRO
   ════════════════════════════════════════════════ */

function renderIntro() {
  var c = getContainer();
  if (!c) return;
  c.innerHTML = '<div class="yk-screen"><div class="yk-intro">' +
    '<h2 class="yk-intro-title">Sekt\u00f6rde En \u0130yisi Ol</h2>' +
    '<button class="yk-cta" id="yk-start">Ba\u015fla</button>' +
    '</div></div>';
  document.getElementById('yk-start').addEventListener('click', function() {
    navigate('role_select');
  });
}

/* ════════════════════════════════════════════════
   SCREEN 2: ROLE SELECTION
   ════════════════════════════════════════════════ */

function renderRoleSelect() {
  var c = getContainer();
  if (!c) return;
  var currentRole = window._htUserPozisyon || '';
  var html = '<div class="yk-screen">';
  html += '<div class="yk-steps"><span class="yk-step active"></span><span class="yk-step"></span><span class="yk-step"></span></div>';
  html += '<h2 class="yk-screen-title">Hangi Rol \u0130\u00e7in Haz\u0131rlan\u0131yorsun?</h2>';
  html += '<p class="yk-screen-desc">Mevcut veya hedefledi\u011fin rol\u00fc se\u00e7. Sana \u00f6zel yetkinlik haritan\u0131 \u00e7\u0131karal\u0131m.</p>';
  if (currentRole) {
    html += '<div class="yk-role-section"><div class="yk-role-label">Mevcut rol\u00fcn</div>';
    html += '<div class="yk-role-current"><strong>' + currentRole + '</strong></div></div>';
  }
  html += '<div class="yk-role-label">Hedef rol\u00fcn\u00fc se\u00e7</div>';
  html += '<div class="yk-role-grid">';
  for (var i = 0; i < RETAIL_ROLES.length; i++) {
    var r = RETAIL_ROLES[i];
    html += '<div class="yk-role-card" data-role="' + r.key + '">' +
      '<div class="rc-level">' + r.level + '</div>' +
      '<div class="rc-title">' + r.key + '</div>' +
    '</div>';
  }
  html += '</div>';
  html += '<div class="yk-nav"><button class="yk-nav-btn" id="yk-back-intro">\u2190 Geri</button><div class="yk-nav-spacer"></div></div>';
  html += '</div>';
  c.innerHTML = html;
  c.addEventListener('click', function handler(e) {
    var card = e.target.closest('[data-role]');
    if (card) {
      c.removeEventListener('click', handler);
      navigate('preview', {role: card.getAttribute('data-role')});
      return;
    }
    if (e.target.closest('#yk-back-intro')) {
      c.removeEventListener('click', handler);
      navigate('intro');
    }
  });
}

/* ════════════════════════════════════════════════
   SCREEN 3: COMPETENCY PREVIEW
   ════════════════════════════════════════════════ */

function renderPreview() {
  var c = getContainer();
  if (!c) return;
  var role = S.role;
  var comps = ROLE_COMP_MAP[role];
  if (!comps) { navigate('role_select'); return; }
  var total = comps.length;
  var freeCount = Math.min(total, FREE_LIMIT);

  var html = '<div class="yk-screen">';
  html += '<div class="yk-steps"><span class="yk-step"></span><span class="yk-step active"></span><span class="yk-step"></span></div>';

  /* Hero */
  html += '<div class="yk-preview-hero">';
  html += '<div class="ph-tag">' + role + '</div>';
  html += '<div class="ph-title">' + role + ' i\u00e7in Gerekli Yetkinlikler</div>';
  html += '<div class="ph-count">' + total + ' yetkinlik \u00b7 ' + freeCount + ' \u00fccretsiz</div>';
  html += '</div>';

  /* Grid */
  html += '<div class="yk-comp-grid">';
  for (var i = 0; i < comps.length; i++) {
    var code = comps[i];
    var a = ANCHORS[code];
    var name = COMP_NAMES[code] || code;
    var kf = COMP_KF[code] || '';
    var locked = !canRead(i);
    html += '<div class="yk-comp-card' + (locked ? ' locked' : '') + '" data-comp="' + code + '" data-idx="' + i + '">';
    html += '<div class="cc-name">' + name + '</div>';
    html += '<div class="cc-kf">' + kf + '</div>';
    if (a) html += '<div class="cc-def">' + a.def + '</div>';
    if (locked) {
      html += '<div class="yk-lock"><div class="yk-lock-icon">' + LOCK_SVG + '</div><div class="yk-lock-text">Premium<br>i\u00e7erik</div></div>';
    }
    html += '</div>';
  }
  html += '</div>';

  /* Nav */
  html += '<div class="yk-nav"><button class="yk-nav-btn" id="yk-back-role">\u2190 Rol Se\u00e7</button><div class="yk-nav-spacer"></div>';
  html += '<button class="yk-nav-btn primary" id="yk-start-reading">Okumaya Ba\u015fla \u2192</button></div>';
  html += '</div>';
  c.innerHTML = html;

  c.addEventListener('click', function handler(e) {
    var card = e.target.closest('[data-comp]');
    if (card && !card.classList.contains('locked')) {
      var idx = parseInt(card.getAttribute('data-idx'), 10);
      S.readIndex = idx;
      c.removeEventListener('click', handler);
      navigate('reading', {code: card.getAttribute('data-comp')});
      return;
    }
    if (card && card.classList.contains('locked')) {
      c.removeEventListener('click', handler);
      navigate('lock');
      return;
    }
    if (e.target.closest('#yk-back-role')) {
      c.removeEventListener('click', handler);
      navigate('role_select');
      return;
    }
    if (e.target.closest('#yk-start-reading')) {
      S.readIndex = 0;
      c.removeEventListener('click', handler);
      navigate('reading', {code: comps[0]});
    }
  });
}

/* ════════════════════════════════════════════════
   SCREEN 4: READING (full-page, no drawer)
   ════════════════════════════════════════════════ */

function renderReading(code) {
  var c = getContainer();
  if (!c) return;
  if (!code || !ANCHORS[code]) { navigate('preview'); return; }

  var comps = ROLE_COMP_MAP[S.role] || [];
  var idx = S.readIndex;

  /* Track reading */
  if (S.readHistory.indexOf(code) === -1) S.readHistory.push(code);

  var a = ANCHORS[code];
  var name = COMP_NAMES[code] || code;
  var kf = COMP_KF[code] || '';

  var html = '<div class="yk-screen">';
  html += '<div class="yk-steps"><span class="yk-step"></span><span class="yk-step active"></span><span class="yk-step"></span></div>';

  /* Reading card */
  html += '<div class="yk-reading">';
  html += '<div class="yk-reading-header"><div><div class="yk-reading-title">' + name + '</div><div class="yk-reading-kf">' + kf + '</div></div>';
  html += '<div class="yk-reading-counter">' + (idx + 1) + ' / ' + comps.length + '</div></div>';

  /* Definition */
  html += '<div class="yk-section"><div class="yk-section-title">Tan\u0131m</div>';
  html += '<div class="yk-def-box">' + a.def + '</div>';
  html += '<div class="yk-why">' + a.why + '</div></div>';

  /* Skilled */
  html += '<div class="yk-section"><div class="yk-section-title">Yetkin Olanlar</div><div class="yk-anchor-list">';
  for (var si = 0; si < a.skilled.length; si++) {
    html += '<div class="yk-anchor strong"><div class="yk-dot strong"></div><span>' + a.skilled[si] + '</span></div>';
  }
  html += '</div></div>';

  /* Less skilled */
  html += '<div class="yk-section"><div class="yk-section-title">Geli\u015fim A\u015famas\u0131ndakiler</div><div class="yk-anchor-list">';
  for (var li = 0; li < a.lessskilled.length; li++) {
    html += '<div class="yk-anchor growing"><div class="yk-dot growing"></div><span>' + a.lessskilled[li] + '</span></div>';
  }
  html += '</div></div>';

  /* Highly skilled */
  html += '<div class="yk-section"><div class="yk-section-title">\u00c7ok Yetenekliler</div><div class="yk-anchor-list">';
  for (var hi = 0; hi < a.highlyskilled.length; hi++) {
    html += '<div class="yk-anchor stellar"><div class="yk-dot stellar"></div><span>' + a.highlyskilled[hi] + '</span></div>';
  }
  html += '</div></div>';

  /* Overused */
  html += '<div class="yk-section"><div class="yk-section-title">A\u015f\u0131r\u0131 Kullan\u0131m</div><div class="yk-anchor-list">';
  for (var oi = 0; oi < a.overused.length; oi++) {
    html += '<div class="yk-anchor overused"><div class="yk-dot overused"></div><span>' + a.overused[oi] + '</span></div>';
  }
  html += '</div></div>';

  /* Retail example */
  html += '<div class="yk-section"><div class="yk-retail-box"><div class="yk-retail-label">Retail\'de Nas\u0131l G\u00f6r\u00fcn\u00fcr</div>';
  html += '<div class="yk-retail-text">' + a.retail + '</div></div></div>';

  /* Interview */
  if (a.interview) {
    html += '<div class="yk-interview-box"><div class="yk-interview-label">M\u00fclakatta Nas\u0131l Anlat\u0131rs\u0131n?</div>';
    html += '<div class="yk-interview-q">' + a.interview + '</div></div>';
  }

  html += '</div>'; /* close .yk-reading */

  /* Navigation */
  var hasPrev = idx > 0;
  var hasNext = idx < comps.length - 1;
  var nextFree = hasNext && canRead(idx + 1);
  var allFreeRead = S.readHistory.length >= FREE_LIMIT;

  html += '<div class="yk-nav">';
  if (hasPrev) {
    html += '<button class="yk-nav-btn" id="yk-read-prev">\u2190 ' + (COMP_NAMES[comps[idx - 1]] || '\u00d6nceki') + '</button>';
  } else {
    html += '<button class="yk-nav-btn" id="yk-back-preview">\u2190 \u00d6niz leme</button>';
  }
  html += '<div class="yk-nav-spacer"></div>';
  if (hasNext && nextFree) {
    html += '<button class="yk-nav-btn primary" id="yk-read-next">' + (COMP_NAMES[comps[idx + 1]] || 'Sonraki') + ' \u2192</button>';
  } else if (allFreeRead) {
    html += '<button class="yk-nav-btn primary" id="yk-to-complete">Tamamla \u2192</button>';
  } else if (hasNext && !nextFree) {
    html += '<button class="yk-nav-btn primary" id="yk-to-lock">Sonraki</button>';
  }
  html += '</div></div>';
  c.innerHTML = html;

  /* Scroll to top */
  c.scrollIntoView({behavior: 'smooth', block: 'start'});

  c.addEventListener('click', function handler(e) {
    if (e.target.closest('#yk-read-prev')) {
      S.readIndex = idx - 1;
      c.removeEventListener('click', handler);
      navigate('reading', {code: comps[idx - 1]});
      return;
    }
    if (e.target.closest('#yk-read-next')) {
      S.readIndex = idx + 1;
      c.removeEventListener('click', handler);
      navigate('reading', {code: comps[idx + 1]});
      return;
    }
    if (e.target.closest('#yk-back-preview')) {
      c.removeEventListener('click', handler);
      navigate('preview');
      return;
    }
    if (e.target.closest('#yk-to-complete')) {
      c.removeEventListener('click', handler);
      navigate('completion');
      return;
    }
    if (e.target.closest('#yk-to-lock')) {
      c.removeEventListener('click', handler);
      navigate('lock');
    }
  });
}

/* ════════════════════════════════════════════════
   LOCK SCREEN (freemium gate)
   ════════════════════════════════════════════════ */

function renderLock() {
  var c = getContainer();
  if (!c) return;
  var read = S.readHistory.length;
  var total = (ROLE_COMP_MAP[S.role] || []).length;
  var remaining = total - read;

  var html = '<div class="yk-screen"><div class="yk-lock-screen">';
  html += '';
  html += '<h2 class="ls-title">' + read + ' yetkinlik okudun</h2>';
  html += '<p class="ls-desc">' + remaining + ' yetkinlik daha seni bekliyor. Davran\u0131\u015fsal g\u00f6stergeler, retail \u00f6rnekleri ve m\u00fclakat sorular\u0131yla tam haz\u0131rl\u0131k i\u00e7in Premium\'a ge\u00e7.</p>';
  html += '<button class="ls-premium-cta">Premium\'a Ge\u00e7 \u2192</button>';
  html += '<div class="yk-nav" style="border:none;justify-content:center;padding-top:8px">';
  html += '<button class="yk-nav-btn" id="yk-lock-back">\u2190 \u00d6nizlemeye D\u00f6n</button>';
  html += '</div></div></div>';
  c.innerHTML = html;

  document.getElementById('yk-lock-back').addEventListener('click', function() {
    navigate('preview');
  });
  trackEvent('premium_gate_shown', {role: S.role, read: read});
}

/* ════════════════════════════════════════════════
   COMPLETION SCREEN
   ════════════════════════════════════════════════ */

function renderCompletion() {
  var c = getContainer();
  if (!c) return;
  var read = S.readHistory.length;

  var html = '<div class="yk-screen"><div class="yk-steps"><span class="yk-step"></span><span class="yk-step"></span><span class="yk-step active"></span></div>';
  html += '<div class="yk-completion">';
  html += '';
  html += '<h2 class="cmp-title">Harika! Yetkinliklerini Ke\u015ffettin</h2>';
  html += '<p class="cmp-desc">' + S.role + ' rolunde ' + read + ' yetkinli\u011fi inceleyerek kariyer haritan\u0131 \u015fekillendirdin.</p>';
  html += '<div class="cmp-stats">';
  html += '<div class="cmp-stat"><span class="cmp-stat-num">' + read + '</span><span class="cmp-stat-label">yetkinlik okundu</span></div>';
  html += '<div class="cmp-stat"><span class="cmp-stat-num">' + (ROLE_COMP_MAP[S.role] || []).length + '</span><span class="cmp-stat-label">toplam yetkinlik</span></div>';
  html += '</div>';
  html += '<div class="cmp-actions">';
  html += '<button class="yk-cta" id="yk-retry">Farkl\u0131 Rol Dene</button>';
  html += '<button class="yk-cta secondary" id="yk-to-profile">\u2190 Profile D\u00f6n</button>';
  html += '</div></div></div>';
  c.innerHTML = html;

  trackEvent('wizard_completed', {role: S.role, read: read});

  document.getElementById('yk-retry').addEventListener('click', function() {
    S.reset();
    navigate('role_select');
  });
  document.getElementById('yk-to-profile').addEventListener('click', function() {
    if (typeof _doSwitchPanel === 'function') _doSwitchPanel('merkez');
  });
}

/* ════════════════════════════════════════════════
   ENTRY POINT (signature preserved, body fresh)
   ════════════════════════════════════════════════ */

window._htLoadYetkinlik = function() {
  if (_loaded) return;
  _loaded = true;
  injectCSS();
  var panel = document.getElementById('panel-yetkinlik');
  if (!panel) return;
  panel.innerHTML = '<div id="yk-container"></div>';
  navigate('intro');
};

})();
