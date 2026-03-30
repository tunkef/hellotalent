/* global _doSwitchPanel, supabase */
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
  bt:'Ekip Kurma', dt:'Yetenek Geliştirme', de:'Motivasyon ve Bağlılık', pa:'Planlama ve Önceliklendirme',
  fa:'Finansal Okuryazarlık', sm:'Stratejik Bakış', nl:'Hızlı Öğrenme', br:'Dayanıklılık',
  is:'İlişki Yönetimi', mc:'Çatışma Yönetimi', ci:'Yenilik ve Yaratıcılık', pe:'İkna Etme',
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
var ANCHORS={cf:{def:"Güçlü müşteri ilişkileri kurmak ve müşteri odaklı çözümler üretmek.",why:"Herhangi bir kurumda — kâr amacı gütsün ya da gütmesin — en önemli insanlar müşterilerdir. Müşteriler olmadan kurumunuz var olamazdı. Perakendede bazı rollerde müşteriyle temas doğrudan ve anlık; bazı rollerde ise bağlantı daha dolaylıdır. Ama bağlantının dolaylı olması sorumluluktan muaf kılmaz. Kazanan perakende organizasyonları her zaman müşteri odaklı ve duyarlıdır. Başarılı olmak; müşteri ihtiyaçlarına sürekli dikkat etmek, bu ihtiyaçlar değiştikçe uyum sağlamak demektir. İç müşteri de dış müşteri kadar önemlidir — kurum içindeki insanlarla ilgilenilmezse, dışarıda yüksek düzeyde müşteri memnuniyeti yaratmak neredeyse imkânsızdır.",skilled:["Müşterinin söylemediğini de anlar; dinler, gözlemler, ihtiyacı sezinler.","Fayda sağlayacak bir fırsat gördüğünde beklemez, harekete geçer.","Beklentiyi karşılayan çözümler üretir, sunar, teslim eder. Sözünü tutar.","Hem iç hem dış müşteriyle kalıcı ilişkiler kurar — tek seferlik bırakmaz.","Geri bildirimi düzenli toplar, iyileştirme süreçlerine aktarır."],lessskilled:["Müşteri beklentilerinin farkında değildir; varsayımla hareket eder, sormaz.","İhtiyacı yanlış okur, yanlış ürün veya çözüm önerir.","İşi müşterinin gözünden değil, prosedür mantığıyla yürütür.","Önemli müşterilerle kalıcı ilişki kuramaz — işlemi tamamlar, geçer.","Şikayet karşısında savunmaya geçer. Çözüm aramak yerine haklı çıkmaya çalışır."],highlyskilled:["Müşterinin henüz dile getirmediği ihtiyaçları öngörür; beklentinin ötesine geçer.","Müşteriden öğrendiklerini yeni ürün, hizmet ve süreç tasarımına taşır.","Kilit müşterilerle uzun vadeli ilişkiler kurar — tedarikçi değil, iş ortağı olarak konumlanır."],overused:["Müşteri bilgisini her şeyin önüne koyar, genel resmi kaçırır.","Memnuniyet uğruna şirket politikalarını aşırı esnetir; tutamayacağı sözler verir.","Müşteriyle fazla yakınlaşır, organizasyonun karşılayamayacağı vaatlerde bulunur — uzun vadede güveni zedeler."],retail:"Bir satış danışmanı, müşterinin baktığı ürüne ilgi göstermediğini fark eder. Ürünü satmaya çalışmak yerine 'Bu tam size göre olmayabilir, ama şunu hiç denediniz mi?' diyerek yönlendirir. Müşteri o ürünü alır, memnun kalır ve üç hafta sonra bir arkadaşını getirerek döner.",interview:"'Bir müşteriyi beklentisinin ötesinde memnun ettiğin somut bir durumu anlat. O anı nasıl fark ettin? Ne yaptın? Müşteri nasıl tepki verdi? O deneyimden ne öğrendin?'"},ce:{def:"Farklı kitlelerin özgün ihtiyaçlarına uygun, çok biçimli ve net iletişim kurmak.",why:"Organizasyonlar, bilgi ve fikirlerin zamanında ve doğru aktığı zaman gelişir. Zayıf iletişim zaman ve kaynak boşa harcar, hedeflere ulaşmayı engeller ve ilişkileri zedeler. Perakendede iletişim her yerde ve her anda vardır: müşteriyle, ekiple, yönetimle, tedarikçiyle. Etkili iletişimciler her bu ortamda kendini ifade edebilen, ton ve dili kitleye göre ayarlayan ve dinlemenin konuşmak kadar önemli olduğunu bilen kişilerdir.",skilled:["Bire bir, küçük grup ya da büyük toplantı fark etmez — rahat iletişim kurar.","Dikkatle dinler. Söyleneni değil, söylenmek istenenin özünü yakalamaya çalışır.","Mesajını ve üslubunu karşısındakine göre ayarlar; müşteriyle ayrı, ekiple ayrı konuşur.","Bilgiyi zamanında paylaşır, saklı bırakmaz.","Farklı görüşlerin rahatça dile geldiği bir ortam yaratır ve bunu destekler."],lessskilled:["Yazılı ve sözlüde net olamaz — karşı taraf ne yapması gerektiğini bilemez.","Herkesle aynı tarz ve tonla konuşur. Kitleyi dikkate almaz, jargona kaçabilir.","Dinler gibi görünür ama kafasında cevabını çoktan hazırlamıştır.","Gereken bilgiyi tutarlı paylaşmaz; bazen geç kalır, bazen hiç paylaşmaz.","Konuşmayı tekeline alır, sözü başkasına vermez."],highlyskilled:["Net ve öz konuşur — dinleyen, ne yapması gerektiğini tam anlar.","Paydaşa göre hem içeriği hem tonu anında ayarlar.","Farklı fikirlerin ifade edilmesini önce kendi tutumunda gösterir, sonra başkalarını da cesaretlendirir."],overused:["Aşırı bilgi paylaşır — asıl mesaj gürültüde kaybolur, ekip bunalır.","İletişim becerisini içeriğin önüne koyar; parlak sunum zayıf özü gizleyebilir.","Her mesajı gereğinden uzun hazırlar. Hız ve pratiklik zarar görür."],retail:"Mağaza müdürü, satış ekibine bir performans düşüşünü aktarmak zorundadır. Savunmacı bir dil kullanmak yerine şunu der: 'Geçen hafta müşteri bekleme sürelerinin uzadığını fark ettim — sizin gözlemlerinize ihtiyacım var.' Suçlamak yerine merak eder, monolog yerine diyalog açar.",interview:"'Karmaşık bir bilgiyi ya da zor bir haberi ekibine veya müşterine iletmen gereken bir durumu anlat. Nasıl hazırlandın? Kitleyi nasıl dikkate aldın? Nasıl bir tepki aldın?'"},it:{def:"Dürüstlük, bütünlük ve özgünlük aracılığıyla başkalarının güvenini kazanmak ve sürdürmek.",why:"Güven, etkili ilişkilerin kalbidir. Güven olduğunda her şey daha kolay akar; insanlar birbirine güvenerek üzerine düşeni yapar, zorlu dönemleri daha sağlıklı atlatır. Güven olmadığında gereksiz sürtüşmeler başlar, performans düşer, şüpheler güçlenir. Perakendede güven üç yönde inşa edilir: müşteriyle, ekip arkadaşlarıyla ve yönetimle. Güven karşılıklılık üzerine kuruludur — almak için vermek zorundasınız.",skilled:["Taahhütlerini takip eder — söylediğini yapar, yapmayacağını söylemez.","Doğrudan ve dürüsttür. Abartmaz, gerçekleri çarpıtmaz.","Gizlilikleri korur; hassas konuları dışarı taşımaz.","Söylediğiyle yaptığı tutarlıdır. Görünürde bir, arkada başka davranmaz.","Baskı altında bile duruşunu korur, değerlerinden taviz vermez."],lessskilled:["İyi niyetle söz verir ama takip etmez — güven yavaşça aşınır.","Hata olunca üstlenmez; başkalarını suçlar ya da gerçeği örtbas eder.","Kişisel çıkarı için gerçekleri çarpıtır veya bilgiyi seçici kullanır.","Farklı insanlara farklı şeyler söyler. Tutarsız mesaj güveni sessizce eritir.","Sözleriyle eylemleri arasındaki boşluğu görmez — ya da görse de önemsemez."],highlyskilled:["Zor gerçeği rahatsız edici olsa bile zamanında söyler — insanlar tam da bu yüzden güvenir.","Hatasını açıkça kabul eder, çözüme odaklanır. Ekipte referans noktası olur.","Güven inşa etmeye kasıtlı zaman ayırır; kendiliğinden gelmeyeceğini bilir."],overused:["O kadar doğrudandır ki duygusal bağlamı kaçırır — gerçeği söylerken ilişkiye zarar verebilir.","Her şeyi açığa çıkarmaya çalışır; oysa bazen stratejik zamanlama gerekir.","Dürüstlük standardını kendi ölçüsüyle biçer. Aşırı yargılayıcı hale gelebilir."],retail:"Kasa görevlisi, müşterinin kasadan sonra fark ettiği bir fiyat hatasını kimse bakmıyor olsa bile hemen düzeltir. Müşteri şaşkınlıkla teşekkür eder. O müşteri bir daha her gittiğinde o kasayı arar. Güven böyle inşa edilir — kimse bakmıyorken doğru olanı yapmakla.",interview:"'Güvenin sınandığı, doğruyu söylemenin riskli ya da rahatsız edici göründüğü bir durumu anlat. Ne yaptın? Neden o kararı aldın? Sonuç ne oldu?'"},co:{def:"Ortak hedeflere ulaşmak için başkalarıyla ortaklık kurmak ve iş birliği içinde çalışmak.",why:"Bugün perakendede değer yaratan hiçbir şey tek başına oluşmuyor. Vitrin düzenlemesinden müşteri hizmetine, stok yönetiminden kampanya uygulamasına kadar her süreç koordineli çalışmayı gerektiriyor. İş birliği sinerji yaratır — bireylerin toplamından büyük sonuçlar üretir. Gerçek iş birliği karşılıklılık gerektirir: açıklık, fikir paylaşımı ve ortak hesap verebilirlik. Perakendede — özellikle sezonluk yoğunluk dönemlerinde — tek kişinin sırtına yüklenemeyecek işleri birlikte taşıma kapasitesi mağazanın başarısını doğrudan belirler.",skilled:["Ortak hedef için iş birliği yapar — başkasının işine yardımı yük saymaz.","Bilgiyi, kaynağı ve başarıyı paylaşır; krediyi biriktirmez, ekiple böler.","Bireysel başarısını ekip başarısıyla dengeler. Zaferi kişisel tutmaz.","Departmanlar arası kendiliğinden iletişim kurar, silo duvarlarını kendi yıkar.","Yardım teklif ettiğinde samimi olduğu bilinir."],lessskilled:["Kendi işini iyi yapar ama başkasına yardımı 'fazladan iş' sayar — silo çalışır.","Krediyi almak ister, vermekte isteksizdir. Başarıyı paylaşmakta zorlanır.","Takım kararına katılmasa bile yüz yüze sessiz kalır, arkasında homurdanır.","Organizasyonun geri kalanından kopuk hareket eder; başkalarının ne yaptığına ilgi göstermez.","Bilgiyi güç olarak görür, paylaşmak yerine biriktirmeyi tercih eder."],highlyskilled:["Farklı güçleri ve bakış açılarını ortak amaç etrafında birleştirir.","Takım başarısının önündeki engeli erkenden görür, müdahale eder — bitmesini beklemez.","Organizasyon genelinde ilişki ağları kurar; zor dönemde bu ağlar doğal iş birliği kaynağına dönüşür."],overused:["Her kararda konsensüs arar — oysa bazen hızlı ve bağımsız karar almak gerekir.","Her şeyi birlikte yapmaya çalışmak bireysel hesap verebilirliği zayıflatabilir.","İş birliğine o kadar değer verir ki çatışmadan kaçınır; zor gerçekleri söylemek yerine uyum arar."],retail:"Satış ekibinden biri hastalanıyor, sezon açılışının tam ortasında. Diğer ekip üyeleri kendi bölgelerini yönetirken o alanı da sahipleniyorlar. Kimse 'bu benim işim değil' demiyor. Bir haftanın sonunda o kişi iyileştiğinde teşekkür ediyor.",interview:"'Farklı departmanlar ya da ekiplerle birlikte yürüttüğün zorlu bir süreci anlat. İş birliğini nasıl sağladın? Hangi engeller çıktı? Sonuç ne oldu?'"},ao:{def:"Yeni fırsatları ve zorlu durumları yüksek enerji, aciliyet duygusu ve istekle ele almak.",why:"Hızlı değişen perakende ortamında fırsatlar göz kırparak geçer. Harika fikirler, kapsamlı planlar, mükemmel stratejiler — bunların hiçbiri hayata geçirilmeden bir fark yaratmaz. Aksiyona yönelimliler fikirleri planlara, planları gerçeğe dönüştürür. Şeyler zorlaştığında yükselmesini bilirler — 'neden böyle oldu?' sorusunu anında 'bunu nasıl çözebilirim?' sorusuna çevirirler. Mükemmel zamanı beklemek yerine iyi-yeterli bir planla harekete geçerler.",skilled:["Zorluklara anında müdahale eder — 'ne zaman başlayalım?' değil, 'başladım' der.","Fırsatları görür ve yakalar; onay beklemeye gerek duymadan inisiyatif alır.","İyi dönemde de zor dönemde de 'yapabilirim' tutumunu korur.","Zor konuları görmezden gelmez, üzerine gider.","Yeni görevleri yüksek enerjiyle üstlenir; bu heves ekibe de yansır."],lessskilled:["Harekete geçmeden önce fazla onay bekler — fırsat penceresi kapanır.","Her adımı planlamadan hareket edemez; belirsizlikte felç olur.","Zor durumlardan kaçınır, biri zorlamadan adım atmaz.","Başarısızlık korkusu risk almayı engeller; güvenli suda kalmayı tercih eder.","Sorunla karşılaşınca 'neden böyle oldu?' sorusunda takılır, çözüme geçişi yavaştır."],highlyskilled:["Belirsiz durumlarda bile harekete geçer — çevresindekiler de cesaretlenir.","Sınırlı kaynak ve bilgiyle sonuç üretir; ideal koşulları beklemez.","Fırsatları başkaları fark etmeden görür, erkenden pozisyon alır."],overused:["Aşırı hızlı hareket eder, başkalarının görüşünü almadan ilerler — kararlar sahiplenilmez.","Sonuçları yeterince düşünmeden harekete geçer; 'önce yap, sonra düşün' zamanla güveni aşındırır.","Sabırsızlık gösterir, süreç gerektiren durumları erkenden kapatmaya çalışır."],retail:"Cumartesi öğleden sonrası kasa sırası sokağa taştı. Nöbetçi müdür konuşmada, stok sorumlusu depoda. Satış danışmanının iş tanımında 'kasa' yazmıyor. Ama müşterilerin sabrının tükendiğini görüyor — 'yardım edebilirim' diyor ve kasaya geçiyor.",interview:"'Hızlı karar alman ve harekete geçmen gereken, zamanın ya da bilginin yetmediği bir durumu anlat. Nasıl düşündün? Ne yaptın? Sonuç ne oldu?'"},ea:{def:"Kendini ve başkalarını taahhütleri yerine getirme konusunda sorumlu tutmak.",why:"Sorumluluk almak; taahhütlerin sahibi olmak, hesap verebilir olmak ve hem kendi hem de yönetilen kişilerin eylemlerinden sorumlu olmak demektir. Önemli ve biraz korkutucu. Çünkü hesap verebilir olmak sizi görünür kılar ve eleştiriye açar. Ama hesap verebilirliği organizasyonda bir kültür haline getirmenin getirisi büyüktür: güven ve performans artar, çalışanlar yaptıklarının kuruma katkısını hisseder. Perakendede hesap verebilirlik hem sayısal hem davranışsal boyutuyla sürekli gündemdedir.",skilled:["Taahhütlerini takip eder, başkalarının da yapmasını sağlar — söylenenler gerçekleşir.","Net sahiplik duygusuyla hareket eder: 'bu projenin başarısı da başarısızlığı da benim.'","Kararlarının ve başarısızlıklarının sorumluluğunu üstlenir; dışsal açıklamaya sığınmaz.","Ekibine net sorumluluklar tanımlar, herkes ne yapacağını bilir.","Sonuçları ölçmek için geri bildirim döngüleri kurar; ilerleme izlenir, sürprizler azalır."],lessskilled:["Kişisel sorumluluk üstlenmez — 'benim de payım var' diyemez.","Gidişatı takip etmez; son dakika sürprizleriyle karşılaşır.","Yetersiz geri bildirim verir, insanlar rotayı nasıl düzelteceğini bilemez.","Net sahipliği yoktur; sorumluluğu dağıtır, 'hepimizin işi' der.","Sorun olunca dışsal açıklamalara sığınır: 'piyasa kötüydü', 'stok gelmedi', 'o söylemedi.'"],highlyskilled:["Kritik projelerde beklentileri ve başarı kriterlerini net tanımlar — kimse tahmin etmek zorunda kalmaz.","Hesap verebilirlik kültürünü kendi davranışıyla kurar; yazılı kurallarla değil, örnekle yönetir.","Başarısızlıkları öğrenme fırsatına çevirir: 'neden oldu?' yerine 'bir dahaki sefere ne yapacağız?' sorar."],overused:["Bireyler üzerinde aşırı baskı yaratır — kontrol dışı faktörleri yeterince dikkate almaz.","Sayısal ölçümlere fazla odaklanır; niteliksel gelişimi ve insan boyutunu ikinci plana atar.","Hataya sıfır tolerans gösterebilir, bu da ekipte risk almaktan kaçınan bir yapı oluşturur."],retail:"Mağaza, iki ay üst üste satış hedefinin altında kaldı. Bölge müdürüyle yapılan toplantıda mağaza müdürü 'Planlamamda bir boşluk oluştu, bunu atlıyorum — bu ay şunu değiştireceğiz ve iki hafta sonra sizi güncelleyeceğim' diyor. Ekip müdürün arkasında duruyor. Üçüncü ayda hedef tutturuluyor.",interview:"'Sorumluluğunu tamamen üstlendiğin ve zorlu koşullara rağmen taahhüdünü yerine getirdiğin bir durumu anlat. Baskı altında nasıl hissettin? Ne yaptın?'"},dr:{def:"Zorlu koşullar altında bile tutarlı biçimde sonuç üretmek.",why:"Sonuç odaklılık; genel bir başarı zihniyetinin, aksiyona yönelimin ve öne çıkma isteğinin bütünleşik halidir. Sonuç odaklı insanlar takımlarına aciliyet duygusu aşılar; organizasyon performansının her zaman akılda olduğu bir kültür oluştururlar. Sonuçlar ölçülebilir olabilir: ciro büyümesi, müşteri memnuniyet skoru, kâr marjı. Ya da niteliksel olabilir: müşteri nezdinde güçlenen marka algısı, ekibi çeken canlı bir çalışma kültürü. Engeller ve aksilikler karşısında pes etmemek, farklı stratejilerle tekrar ve tekrar denemek bu yetkinliğin özüdür.",skilled:["Sonuç ve alt satır odaklıdır — rakamları takip eder, neyin önemli olduğunu bilir.","Engeller karşısında hedeften sapmaz; ilk plan tutmadığında alternatif yol bulur.","Hedefleri aşma sicili vardır. Sadece ulaşmaz, geçer.","Kendini ve ekibini sonuç üretmeye iter; performansı hem kendinden hem başkalarından bekler.","Bitişi her zaman gözünde tutar, son gün teslimi için ekstra çaba gösterir."],lessskilled:["Sonuçlar için itmekten kaçınır — olduğu gibi kabul eder, daha iyisini zorlamaz.","Asgari çabayla idare eder; 'geçti' ile yetinir, 'aştı'ya ulaşmaz.","Tutarsız performans sergiler: iyi dönemde çalışır, zor dönemde üretkenliği düşer.","Kolayca pes eder. Üçüncü denemede farklı stratejiyle geri dönmez.","Son tarihleri sık kaçırır, engelleri aşmak yerine bahane olarak kullanır."],highlyskilled:["İddialı hedefler koyar, ortalama hedefler tatmin etmez.","Tutarlı olarak en iyi performans gösterenler arasındadır — bir seferlik değil, süregelen mükemmellik.","Zorluklar karşısında ısrar eder; kriz aksiyonu hızlandırır, stratejik düşünmeyi durdurmaz."],overused:["İnsan, süreç ve etik boyutlarını gözetmeden her ne pahasına olursa olsun sonuç peşinde koşar.","Son tarihe o kadar odaklıdır ki kalite ve süreç feda edilir.","Ekip üzerinde aşırı baskı yaratır — yüksek turnover ve tükenmişliğe yol açar."],retail:"Mağaza ayın 15'inde hedefin yüzde on gerisinde. Mağaza müdürü o gün ekibiyle oturuyor: hangi kategoride açık var, müşteri profili bu hafta nasıl değişti, hangi ürünü daha görünür yapabiliriz. Ay sonunda hedef tutturulmuş değil — geçilmiş.",interview:"'Koşulların aleyhine olduğu — kaynak kısıtlı, zaman dar ya da koşullar zorlu — bir dönemde sonucu nasıl tutturduğunu anlat.'"},dw:{def:"Net yön vermek, görevleri delege etmek ve işin tamamlanması önündeki engelleri kaldırmak.",why:"Kendi işini yapmaktan, işi başkaları aracılığıyla yapmaya geçiş — perakende kariyerinin en kritik ve en zorlu dönüşüm noktalarından biridir. Bu dönüşüm zordur çünkü işin doğrudan kontrolünü bırakmayı, daha fazla risk almayı ve başkalarına güvenmeyi gerektirir. Odak, kişisel başarıdan başkalarını güçlendirmeye ve başarılı kılmaya kayar. Perakendede bu geçiş — satış danışmanından kat müdürüne, kat müdüründen mağaza müdürüne — her kariyer adımında yeniden yaşanır.",skilled:["Net sorumluluklar tanımlar — herkes neyin kendisinden beklendiğini bilir.","Görevleri doğru kişilere doğru şekilde delege eder; bottleneck haline gelmez.","İş üzerindeki diyaloğu sürdürür, ilerlemeyi takip eder. Son dakika sürprizlerini azaltır.","Kişinin yeteneğine ve deneyimine göre rehberlik sağlar; herkesi aynı kalıptan yönetmez.","İşin önündeki engelleri erkenden tespit eder ve kaldırır."],lessskilled:["Belirsiz veya dağınık talimatlar verir — insanlar ne yapacağını tam anlayamaz.","İşi delege edemez, her şeyi kendisi yapmaya çalışır.","Yüksek profilli görevleri kendinde tutar; gelişim fırsatlarını ekiple paylaşmaz.","Mikro yönetim yapar — delege eder ama bırakmaz, sürekli kontrol eder.","Gerçekçi olmayan ya da çok kolay hedefler koyar; ekibi ne motive eder ne zorlar."],highlyskilled:["İnsanları görevlere ustaca eşleştirir — kimin hangi işte en iyi sonucu üreteceğini bilir.","Net performans beklentilerini iletir, tutarlı takip eder.","Geliştirecek görevleri bilinçli delege eder; görev hem iş hem gelişim fırsatıdır."],overused:["Gereğinden fazla yönlendirme yapar — ekip kendi başına karar alamaz, inisiyatif almaktan çekinir.","Gerçekçi olmayan beklentiler içindedir; kapasiteyi aşan taleplerle moral bozar.","Sabırsızdır, gelişim için gerekli zamana tolerans göstermez."],retail:"Yeni mağaza müdürü, kampanya döneminde her şeyi kendisi yapmaya çalışıyor — vitrin, kasa, stok, şikayet. Hiçbirini iyi yapamıyor. Bir ay sonra görevleri net biçimde dağıtıyor. Mağaza daha sakin, daha verimli çalışıyor. Müdür artık yönetiyor — yapan değil, yönlendiren.",interview:"'Bir görevi delege ettiğinde beklediğin sonucu elde edemediğin bir durumu anlat. Nerede hata yaptın? Nasıl müdahale ettin?'"},bt:{def:"Çeşitli beceri ve perspektifleri bir araya getiren, güçlü kimliğe sahip takımlar kurmak.",why:"Harika takımlar nadiren kendiliğinden oluşur. Amaç, görevler, ilişkiler ve süreçlere dikkat edilmesini gerektirir. Perakendede bir mağaza ekibi; farklı deneyim düzeylerinden, farklı kişiliklerden ve farklı kariyer beklentilerinden oluşur. Sezonluk baskı, vardiya çakışmaları, yüksek turnover — bunların hepsi takım dinamiklerini sürekli zorlar. Bu çeşitliliği uyumlu bir güce dönüştürmek — kimliği olan, moralı yüksek, birbirini tamamlayan bir takım kurmak — liderliğin en yüksek ifadesidir.",skilled:["Takımı çeşitli stil, bakış açısı ve deneyimle kurar — benzerler değil, tamamlayanlar bir araya gelir.","Ortak hedefler ve paylaşılan bir zihniyetin temelini atar; ekip ne için var olduğunu bilir.","Aidiyet duygusu yaratır, insanlar o takımın parçası olmaktan gurur duyar.","Başarıları paylaşır, ekip çabalarını ödüllendirir. Bireysel başarıyı takımın önüne koymaz.","Açık diyalog ve iş birliği ortamı oluşturur, besler."],lessskilled:["Takımın amacı ve hedefleri konusunda net değildir — ekip neye doğru çalıştığını bilmez.","Ortak zihniyet yaratamaz; bireyler yan yana çalışır ama gerçek bir takım oluşmaz.","Bireysel çabaları takımın önünde tutar, takım kimliği gelişmez.","Görevleri iş birliğini destekleyecek şekilde dağıtmaz, herkes kendi adasında çalışır.","Üyeler arasındaki çatışmayı fark etmez ya da görmezden gelir; geç müdahale eder."],highlyskilled:["Başarıyı takımın başarısı olarak tanımlar — bireysel parlama değil, kolektif zafer önceliktir.","Her üyenin özgün geçmişini ve bakış açısını değerlendirmenin hedeflere ulaşmada kritik olduğunu bilir.","Üyelerin kariyer hedeflerini bilir, bu hedefleri ekip başarısıyla bütünleştirir."],overused:["Takım kimliğine o kadar odaklanır ki dış bakış açısına kapanır — silo oluşturur.","Konsensüs kültürü güçlüdür ama zor kararları geciktirir.","Çatışmadan kaçınır, takım uyumunu korumak adına zor gerçekleri söylemez ya da geç söyler."],retail:"Yeni mağaza müdürü göreve geldiğinde ekip parçalıdır. İlk yaptığı şey ortak hedef: 'Bu ay en yüksek müşteri memnuniyet puanına ulaşalım — bunu birlikte nasıl yaparız?' Ay sonunda puan yükseliyor. Ama daha önemlisi — ekip artık birbirini tanıyor ve güveniyor.",interview:"'Kurduğun ya da dönüştürdüğün bir takımı anlat. Başladığında tablo nasıldı? Neyi değiştirdin? Ve o takımdan bugün hâlâ gurur duyduğun bir şey nedir?'"},dt:{def:"Başkalarını hem kariyer hedeflerine hem organizasyonun hedeflerine ulaşacak biçimde geliştirmek.",why:"İnsanların büyük çoğunluğu büyümek ve gelişmek ister. Organizasyonlar da çalışanlarının rolün ve kurumun değişen yapısına ayak uyduracak biçimde gelişmesine ihtiyaç duyar. Bu süreç üç parçanın bir arada çalışmasını gerektirir: kişinin büyümek için motivasyonu, organizasyonun gelişimi destekleyen yapısı ve sizin geliştirme sorumluluğunu üstlenmek için zaman, ilgi ve çaba harcamanız. Perakendede bu yetkinlik özellikle kritiktir çünkü sektörün en büyük zorluklarından biri turnoverdir. Yetenekli insanları büyütüp elde tutmak hem mağaza performansını hem organizasyonel sürekliliği doğrudan belirler.",skilled:["Başkalarını geliştirmeyi yüksek öncelik olarak görür, operasyonel koşuşturmanın arkasında bırakmaz.","Koçluk, geri bildirim ve zorlayıcı görevlerle başkalarını aktif geliştirir.","Kariyer hedeflerini organizasyonun hedefleriyle hizalar — sadece kuruma değil, kişiye de yatırım yapar.","Gelişimsel transferleri ve yan adımları destekler; kariyer her zaman yukarıya gitmek zorunda değildir.","Gerçek gelişim konuşmaları yapar — performans değerlendirmesi değil, kariyer diyaloğu kurar."],lessskilled:["Geliştirmek için zaman ayırmaz — 'işler yoğun, sonra bakarız' döngüsüne girer.","Gelişim zorunluluklarını en kolay yoldan geçiştirir: form doldurur, gerçek koçluk yapmaz.","Görünürlüğü paylaşmaktan kaçınır, yüksek profilli görevleri kendinde tutar.","Gelişimsel geri bildirim vermekten kaçınır; dönüştürücü konuşmayı erteler.","İnsanı şu anki rolünün ötesinde göremez, gelişimsel hamle tanımlamakta zorlanır."],highlyskilled:["Yetenek gelişimini 'ekstra' değil, liderliğin özü olarak tanımlar.","Kendi ekibinin dışına bakar; organizasyon genelinde gelişim fırsatlarını fark eder, insanlarla paylaşır.","Gelişim için kasıtlı zorluk yaratır — konfor alanında büyüme olmadığını bilir."],overused:["Geliştirmeye o kadar odaklanır ki anlık iş sonuçları geri planda kalır — denge kayar.","Herkesin her şeyde gelişmesini bekler; güçlü yönlere odaklanmak yerine her zayıflığı gidermeye çalışır.","Gelişim için sabırsızlanır. Öğrenme ve büyüme doğal zamanına ihtiyaç duyar."],retail:"Eğitim müdürü, yeni gelen bir satış danışmanının müşteriyle konuşma biçimini fark eder — doğal, güven veren, dinleyen bir iletişim tarzı var. Üç ay içinde o kişiyi müşteri şikayet yönetimi projesine dahil eder. Danışman CV'sinde hiç olmayan bir deneyim kazanır. Altı ay sonra kat müdürü pozisyonu açılır — ilk adaylar listesinin en üstünde o danışman vardır.",interview:"'Ekibindeki birini aktif olarak geliştirdiğin, bu kişinin kariyer yolunu etkilediğin bir süreci anlat. Ne fark ettin? Ne yaptın? Nasıl bir sonuç aldın?'"},de:{def:"İnsanların organizasyonun hedeflerine ulaşmak için ellerinden gelenin en iyisini yapmak üzere motive olduğu bir çalışma iklimi yaratmak.",why:"İnsanlar bağlı olduğunda daha büyük şeyler olur. Bağlı çalışanlar daha üretkendirler — iş davranışları enerjik, odaklı ve organizasyonun ihtiyaçlarıyla daha uyumludur. Elde tutma oranları daha yüksektir. Pek çok araştırma, çalışan bağlılığındaki artışın kârlılık, kalite, verimlilik, müşteri memnuniyeti ve yenilikte iyileşmelere yol açtığını ortaya koymaktadır. Perakendede bağlılık doğrudan müşteri deneyimine yansır. Ama bağlılık tek tipli değildir: birini bağlayan şey diğerini bıktırabilir.",skilled:["İşi insanların hedef ve motivasyonlarına hizalar — anlam ile görevi buluşturur.","Başkalarını güçlendirir; kendi kararlarını alabileceklerini ve bu kararların önemli olduğunu hissettirir.","Her kişinin katkısının kuruma değer kattığını somut gösterir.","Görüş paylaşımını davet eder, sahipliği ve görünürlüğü paylaşır.","Motivasyon ile organizasyonel hedefler arasında net bağlantı kurar."],lessskilled:["Farklı güdülere sahip insanlarla ilişki kurmakta zorlanır — herkesi aynı şekilde motive etmeye çalışır.","Başkalarını neyin motive ettiğine dair içgörüsü azdır; motivasyonun kişisel olduğunu fark etmez.","Yeterli esneklik ve özerklik tanımaz, sürekli denetler.","Coşku yaratmak için az çaba sarf eder; ekip yönetimini teknik bir süreç gibi görür.","Sahipliği ve görünürlüğü paylaşmaya isteksizdir — başarı kendisinde kalır."],highlyskilled:["Bireysel motivatörleri derinlemesine anlar, herkese özel bir bağlılık yaklaşımı uygular.","Zorlu dönemlerde bile bağlılık ortamını sürdürür — baskı altında da ekibe ilham verir.","Bağlılığı etkileyen faktörleri ölçer ve proaktif yönetir."],overused:["Bağlılık yaratmaya o kadar odaklanır ki zor kararları erteler.","Bağlılığı performansın önüne koyar — gerçek performans sorunlarını 'motivasyon eksikliği' olarak çerçeveler.","Her kararı konsensüsle almak ister; dahil etmek güçlendirir ama her konuda onay aramak yavaşlatır."],retail:"Mağaza müdürü, her Pazartesi sabahı 10 dakikalık bir briefing yapıyor. Hedefleri değil, geçen haftadan bir anı paylaşıyor: 'Cuma günü Ayşe, sıradaki müşteriyi bekletmemek için kasaya geçti — kimse sormadı, kendisi gördü ve yaptı. Bu hafta hepimizin aklında olsun.'",interview:"'Ekip bağlılığının düştüğünü fark ettiğin ve durumu tersine çevirmek için harekete geçtiğin bir dönemi anlat. Sinyali nasıl fark ettin? Ne yaptın? Sonuç ne oldu?'"},pa:{def:"İşi organizasyonel hedeflerle uyumlu biçimde planlamak ve önceliklendirmek; taahhütleri karşılamak için doğru sırayla ilerlemek.",why:"İyi bir plan her şeyi kolaylaştırır. İyi planın belirgin işareti ise stratejik önceliklerle hizalanmış olmasıdır. Planlar bir temel oluşturur. Hizalanmış planlar sizi, ekibinizi ve tüm organizasyonu doğru yönde ilerletir. Perakendede planlama yetersizliği direkt zarar üretir: yanlış zamanda yanlış stok, yetersiz personel, çakışan kampanya takvimleri, son dakika vardiya boşlukları. Gün içinde 'itfaiyeci modunda' çalışan lider ile sezonu kontrollü yöneten lider arasındaki en büyük fark burada başlar.",skilled:["Hedefleri organizasyonel hedeflerle hizalar — kendi işini büyük resme bağlar.","Hedefleri somut eylem adımlarına kırar; soyut stratejiyi uygulanabilir görevlere indirger.","Faaliyetleri kilometre taşları ve takvimlerle aşamalandırır, ne zaman ne olacağı bellidir.","Acil durum planları geliştirir, gerektiğinde uygular. Plan B hazırdır.","Zaman ve kaynakları dengeli yönetir; son dakika sürprizleri minimumdur."],lessskilled:["Büyük öncelikleri görmeden anlık ihtiyaçlara takılır — her gün kendi kendine bir acil durum yaratır.","Zaman ve kaynakları net bir amaç doğrultusunda kullanmaz; emek harcar ama nereye gittiği belirsizdir.","Acil durum planı eksikliğinden sorunlarla hazırlıksız yakalanır.","İlerlemeyi rastgele takip eder ya da hiç takip etmez.","Plan yapar ama değişime adapte olmakta zorlanır, plan katılaşır."],highlyskilled:["En yüksek önceliklere odaklanır, daha az kritik görevleri bir kenara bırakabilir — 'hayır' diyebilir.","Kaynakları tam tahsis eden uygulama planları yapar; kim, ne zaman, neyle çalışacak netdir.","Engelleri öngörür, 'ya bu olursa?' sorusunu önceden sorar."],overused:["Planlamaya çok zaman harcar — hazırlık aşaması eyleme geçişi geciktirir.","Planlara ısrarla bağlı kalır; değişen koşullara uyum sağlamak için yeterli esneklik bırakmaz.","Başkalarına plan yapma özerkliği vermez, her planı kendisi yapmak ister."],retail:"Sezon açılışı iki hafta sonra. Operasyon müdürü tüm değişkenleri tek bir plana döker: ürün teslimat tarihleri, vitrin değişim takvimi, ekstra personel vardiyaları, kampanya başlangıç ve bitiş günleri. Her departmana ne zaman ne yapacağını iletir. Açılış gününde sürpriz yok, her şey yerli yerinde.",interview:"'Karmaşık bir süreci planladığın, birden fazla değişken ve ekibin koordinasyonunu gerektiren bir durumu anlat. Planı nasıl oluşturdun? Beklenmedik bir şey çıktı mı?'"},fa:{def:"Temel finansal göstergeleri anlayıp yorumlamak ve bu anlayışı daha iyi iş kararları almak için kullanmak.",why:"Perakendede finansal okuryazarlık olmadan mağaza yönetmek; gösterge paneline bakmadan araba sürmek gibidir. Ciro tek başına anlamsızdır — brüt kâr marjı, stok devir hızı, kayıp oranı ve personel gideriyle birlikte okunduğunda gerçek tabloyu gösterir. Bu sayıları sadece raporlamak değil, yorumlamak ve eyleme çevirmek finansal okuryazarlığın özüdür. Mağaza müdüründen bölge direktörüne kadar perakende kariyerinde ilerledikçe finansal bakış açısı giderek daha kritik hale gelir.",skilled:["Temel finansal göstergelerin anlamını ve sonuçlarını anlar — rakamlar ona bir şeyler söyler.","Stratejik seçenekler üretmek için finansal analizi kullanır.","Niceliksel ve niteliksel bilgiyi bütünleştirir, rakamların arkasındaki hikayeyi okur.","Finansal kararların farklı işlevler üzerindeki etkisini bağlar; siloda düşünmez.","Bütçe süreçlerine aktif katılır, rakamları tartışabilir, savunabilir ve sorgulayabilir."],lessskilled:["Finansal terimlerle yeterli aşinalığı yoktur — brüt marjin, stok devir hızı gibi kavramlar belirsiz kalır.","İş işlevleri ile finansal performans arasındaki neden-sonuç ilişkisini kavrayamaz.","Kararlarında finansal etkiyi göz ardı eder; finansal boyut değerlendirilmez.","Operasyonel başarıyı kârlılıktan bağımsız düşünür — 'satış iyi gitti' ile 'kâr iyi gitti' aynı şey değildir."],highlyskilled:["Finansal bilgiyi iş istihbarasına dönüştürür — nitel ve nicel veriyi bütünleştirerek içgörü üretir.","Temel finansal göstergeleri izler; performansı ölçer, trendleri belirler, sonuçları etkileyecek stratejiler önerir.","Finansal veriyi gelecek odaklı karar almada kullanır — geçmişe bakmakla kalmaz, ileriye projeksiyon yapar."],overused:["Finansal göstergeleri tek karar kriteri yapar — dar finansal sonuçlara odaklanarak dengesiz bir performans görüşü oluşturur.","Kısa vadeli kazanımlar için uzun vadeli hedefleri feda edebilir.","İnsan boyutunu — ekip morali, müşteri ilişkisi, kültürel yatırım — sayısal olmadığı için görmezden gelir."],retail:"Mağaza müdürü aylık satış raporunu aldığında sadece ciroya bakmıyor. Brüt kâr marjını, iskonto oranını ve stok devir hızını birlikte okuyor. Satış yüzde sekiz arttı ama kâr marjı düştü — demek ki promosyon fazla agresifti.",interview:"'Finansal bir göstergeyi takip edip buna göre bir karar aldığın ya da harekete geçtiğin somut bir durumu anlat. Hangi veriyi kullandın? Nasıl yorumladın? Sonuç ne oldu?'"},sm:{def:"Gelecekteki olasılıkları öngörebilmek ve bunları atılım yaratan stratejilere dönüştürmek.",why:"Stratejik olmak; geleceğe net niyetler ve amaçlı eylemlerle bakmak, planlamak ve hareket etmektir. Stratejik bir bakış açısı her ikisine de hazır olmayı gerektirir: hem taktiksel bugüne hem uzun vadeli yarına. Perakende sektörü bunu daha da kritik kılar. Kısa vadeli baskılar her zaman var olacak. Ama bu anlık meselelere gömülüp kalmak, organizasyonu uzun vadede rekabetsiz bırakır. Stratejik bakan bir lider; rakiplerin hareketini izler, tüketici davranışlarındaki değişimi okur, hem bugüne hem yarına hazırlanır.",skilled:["Kısa vadeli baskı altında uzun vadeli kararlardan vazgeçmez.","Sektör trendlerini ve rakip hareketlerini izler, kendi stratejisine entegre eder.","Olası gelecek senaryolarını rahatlıkla gündeme taşır — 'ya şu olursa?' sorusunu sormaktan çekinmez.","Sürdürülebilir değer yaratacak olasılıkların güvenilir tablosunu çizer.","Vizyon ile eylem arasında net bağlantı kuran rekabetçi stratejiler oluşturur."],lessskilled:["Operasyonel detaylara odaklanır, büyük resmi kaçırır.","Strateji konuşmalarında fikir söylemekte zorlanır — taktik düzeyde kalır.","Değişen koşullara tepkisel davranır; öngörü değil, yangın söndürme.","Rakiplerin ve sektör trendlerinin farkında değildir, içe odaklı kalır."],highlyskilled:["Büyük resmi sürekli görür, gelecek senaryolar üretir — sürdürülebilir rekabet avantajı yaratan stratejiler oluşturur.","Vizyoner bir yapıya sahiptir; olasılıkların güvenilir ve ilham veren tablosunu söze döker.","Net strateji oluşturur, organizasyonu hedeflerine hızlandıracak iddialı adımları belirler."],overused:["Stratejik fikirlere o kadar odaklanır ki günlük operasyonel ihtiyaçları ihmal eder.","Planları aşırı karmaşık hale getirebilir — strateji anlaşılır ve uygulanabilir olmak zorundadır.","Vizyon çok ilerideyse ekip bağlantısını kaybeder, başkalarını geride bırakır."],retail:"Bölge müdürü, bölgesindeki satış rakamları hedefte olsa bile müşteri memnuniyet puanının yavaş yavaş düştüğünü fark ediyor. Bu düşüş 6 ay sonraki müşteri kaybının habercisi. Ekip eğitimine yatırım yapıyor. Üç ay sonra puan yükseliyor. Stratejik bakış budur: bugün hâlâ 'iyi' görünürken yarının sinyalini okumak.",interview:"'Uzun vadeli düşünerek aldığın ve kısa vadede fedakarlık ya da dirençle karşılaştığın bir kararı anlat. Neden o kararı aldın? Başkalarını nasıl ikna ettin?'"},nl:{def:"Yeni sorunlarla başa çıkarken deneyerek aktif öğrenmek; hem başarıları hem başarısızlıkları öğrenme kaynağı olarak kullanmak.",why:"Çoğumuz daha önce gördüğümüz ve yaptığımız şeyleri uygulamakta iyiyiz. Daha nadir bir beceri ise bir şeyi ilk kez yapmaktır. Değişimin hızlanan temposuyla birlikte, yeni çözümler öğrenip uygulamak giderek daha kritik bir beceri haline geliyor. Bu yetkinlik risk almayı, mükemmeliyetçiliği bir kenara bırakmayı ve yeni yollar açmayı gerektiriyor. Perakendede yeni ürün kategorileri, değişen müşteri alışkanlıkları, dijital satış kanalları, yeni POS sistemleri — bunların hepsi hızlı öğrenmeyi zorunlu kılar.",skilled:["Yeni durumlarla karşılaşınca hızla öğrenir — adaptasyon sürecini kısaltır, uygulamaya çabuk geçer.","Doğru çözümü bulmak için denemeler yapar; deneysellik ona tehdit değil, araçtır.","Tanıdık olmayan görevlerin zorluğunu kucaklar. Yeni alan onu rahatsız etmez, meraklandırır.","Hatalardan ders çıkarır, aynı hatayı tekrarlamamak için analiz yapar.","Geçmiş deneyimlerden öğrendiklerini yeni bağlamlara esnek uygular."],lessskilled:["Yeni durumlarda öğrenmekte zorlanır — tanıdık olmayan görevler önünde sıkışır.","Denenmemiş çözümlere şans vermez, bilinen yolda kalmayı tercih eder.","Sorunları yalnızca geçmişte işe yarayan yöntemlerle çözer; bağlam değişse bile formül değişmez.","Risk almaz. Mükemmeliyetçilik ya da hata korkusu hareketi engeller.","Hatayı öğrenme kaynağı değil utanç kaynağı olarak görür, tekrar denemekten çekinir."],highlyskilled:["Doğru çözümü bulmak için birden fazla yöntemle defalarca dener — bırakmaz.","Hataları öğrenme fırsatı olarak görür, veri kaynağı olarak sahiplenir.","Tanıdık olmayan görevlerin zorluğundan keyif alır; bilinmezlik onu durdurmaz, tetikler."],overused:["Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz yere bozar — odak kaybolur.","Henüz kanıtlanmamış fikirlere yalnızca yeni oldukları için odaklanır.","Öğrenme adına gereksiz riskler alır; deneysellik ile sorumsuzluk arasındaki sınır bulanıklaşır."],retail:"Mağazaya yeni bir dijital ödeme sistemi geliyor. Eğitim günü bir hafta sonra. Hızlı öğrenen satış danışmanı beklemiyor — sistemi kendi başına kurcalıyor, temel işlemleri öğreniyor. Eğitim günü geldiğinde sorularla geliyor, herkesten hızlı kavrıyor.",interview:"'Daha önce hiç yapmadığın bir şeyi öğrenmek zorunda kaldığın bir durumu anlat. Nasıl yaklaştın? Hangi engelleri yaşadın? Sonuç ne oldu?'"},br:{def:"Zorlu durumlarla karşılaşıldığında aksiliklerden ve sıkıntılardan sıyrılmak; güçlenerek devam etmek.",why:"Aksilikler çoğunlukla kaçınılmazdır. Özellikle bugünün talep yoğun ve zaman zaman dalgalı çalışma ortamında olası tuzaklar her yerdedir. En dayanıklı insanlar bile aksilikler yaşar. Fark, bu aksiliklere nasıl yanıt verdiklerinde yatar. Öngörürler. Doğrudan karşılarına çıkarlar. Dayanma kapasitesine sahiptirler. Perakendede her gün beklenmedik bir şey olur: müşteri şikayeti, stok krizi, personel yokluğu, satış baskısı. Dayanıklı olanlar aynı koşulları yaşar — ama geri dönerler.",skilled:["Baskı altında kendinden emin ve kararlı kalır — stres performansını düşürmez.","Krizleri sakin yönetir; panik yerine netliği tercih eder.","Olumsuz koşullara rağmen olumlu tutumunu ve ileriye dönük bakışını sürdürür.","Aksiliklerden toparlanır, önceki performans ve güven düzeyine hızla döner.","Zorluklardan büyür; şikayet yerine öğrenme alışkanlığı geliştirir."],lessskilled:["Yüksek baskıda kolayca sarsılır — sakinliğini ve netliğini kaybeder.","Stres dönemlerinde düşük enerji sergiler, verimlilik düşer.","Eleştiri ya da engellerle karşılaşınca savunmaya geçer; sorunu çözmek yerine kendini savunur.","Aksiliklerden toparlanması fazla zaman alır, etkisi günlerce sürebilir.","Değişken ortamlarda anksiyete yaşar; değişimle stresi birbiriyle karıştırır."],highlyskilled:["Stresli durumlarda odaklı ve dengeli kalır — sakinliğini yalnızca kendisi için değil, çevresi için de sürdürür.","Başarısızlıktan sistematik öğrenir; analiz eder, neyi değiştireceğini netleştirir.","Dayanıklılığı kasıtlı inşa eder, stres yönetimi ve yeniden şarj alışkanlıkları geliştirir."],overused:["O kadar dayanıklıdır ki ciddi sorunlara 'bu da geçer' diyerek geç müdahale eder.","Strese katlanma kapasitesi yüksek ama sınırlarını görmez — destek istemekte zorlanır.","Zorlu durumların ciddiyetini küçümser, başkalarının yaşadığı güçlüğü kavrayamaz."],retail:"Cumartesi, yoğun sezon, bir satış danışmanı art arda dört zor müşteriyle karşılaşıyor. Öğle arasında 10 dakika gerçek bir mola veriyor. Öğleden sonra aynı enerjiyle geri dönüyor. Akşam eve yorgun gidiyor ama öfkeli değil. Tükenmişliği günün içinde taşımıyor.",interview:"'Gerçekten zorlandığın bir dönemi anlat — hem profesyonel hem kişisel baskının aynı anda geldiği bir zaman. O dönemde nasıl hissettin? Nasıl baş ettin? O deneyim seni nasıl değiştirdi?'"},is:{def:"Çeşitli insan gruplarıyla açık ve rahat biçimde ilişki kurabilmek.",why:"İlişki yönetimi, organizasyonlarda işlerin yürütülmesinin ayrılmaz bir parçasıdır. Her türlü insanla geçinmenin anahtarı, önce kişisel tepkileri geri çekmek ve önce karşındakine odaklanmaktır. Perakendede bu yetkinlik hem müşteriyle hem ekiple hem de yönetimle sürekli devrededir. En iyi ilişki yöneticileri bu farkları otomatik okur — bir müşteriyle, bir kat müdürüyle, bir bölge direktörüyle eşit rahatlıkta konuşabilirler.",skilled:["Farklı kademelerde, fonksiyonlarda ve kültürlerde rahatça ilişki kurar — herkesle ortak dil bulur.","Diplomasi ve incelikle hareket eder; hassas konularda bile ilişkiyi koruyarak ilerler.","Sıcak ve kabul edici bağ inşa eder, karşısındaki kendini görülmüş hisseder.","Kendine benzeyen ve benzemeyen insanlarla yapıcı ilişkiler kurar. Farklılık engel değil, zenginliktir.","Kişilerarası ve grup dinamiklerini okur — odada ne döndüğünü fark eder."],lessskilled:["Az sayıda ilişki kurar, öncelikle kendi çalışma alanındaki insanlarla etkileşime girer.","Kendinden farklı insanlarla etkileşimde rahatsızlık hisseder — çeşitlilik stres vericidir.","Fikirlerini duyarsız ifade eder; taktik ve diplomasi eksiktir.","Başkalarının ihtiyaçlarına az ilgi gösterir, kendi gündemini öne çıkarır.","Eleştiri karşısında savunmaya geçer; ilişkiyi zedeleyecek tepkiler verir."],highlyskilled:["Çok çeşitli insanlarla proaktif ilişki geliştirir — ağını bilinçli ve geniş tutar.","Zor ya da gergin durumlarda bile anlık bağ kurar; baskı altında ilişki becerisi azalmaz.","Birlikte çalışması güç kişilerle bile üretken ve saygılı bir ilişki sürdürür."],overused:["Herkes tarafından sevilmek ister — bu net sınır koymayı ve zor mesajları iletmeyi zorlaştırır.","Aşırı uyum eğilimi özgün duruşunu gizleyebilir.","Çatışmayı yönetmek yerine kaçınır; uyumu korumak adına gerçeği söylemez."],retail:"Kıdemli satış danışmanı, aynı vardiyada iki çok farklı müşteriyle karşılaşıyor: biri deneyimli ve aceleci bir üst düzey yönetici, diğeri mağazaya ilk kez giren genç bir müşteri. Danışman ikisine de aynı içtenlikle ama tamamen farklı bir yaklaşımla hizmet veriyor.",interview:"'Başlangıçta zorlandığın ama zamanla üretken ve güçlü bir ilişkiye dönüştürdüğün bir kişiyle deneyimini anlat. Neden zordu? Ne yaptın? Ne öğrendin?'"},mc:{def:"Çatışma durumlarını gürültüyü asgari düzeyde tutarak etkili biçimde yönetmek.",why:"Çatışma, organizasyonların doğal bir parçasıdır. Organizasyonlar farklı görüşlere ve rekabet eden çıkarlara sahip çeşitli insanlardan oluşur. Kötü yönetilen çatışma tutumları pekiştirir, üretkenliği bozar ve ilişkileri zedeler. Ama çatışma her zaman kötü bir şey değildir. Çatışma daha önce tartışılamayan konuları yüzeye çıkarır. İyi yönetilen çatışma; daha iyi alternatifler ve hatta atılım noktaları bulmak için bir forum sağlar. Perakendede çatışma hem müşteri-personel hem de personel arası boyutta sürekli gündemdedir.",skilled:["Çatışmalara fırsat olarak bakar — kaçınmak yerine üzerine gider.","Anlaşmazlıkları adil yönetir; her iki taraf da dinlendiğini hisseder.","Farklı görüşleri bütünleştirerek ortak zemin bulur, atılım noktaları yaratır.","Farklılıkları gürültüyü minimumda tutarak yönetir; gerilim büyümeden çözülür.","Çatışmanın altındaki gerçek sorunu tespit eder — belirtiye değil, kök nedene odaklanır."],lessskilled:["Çatışmadan kaçınır — gerilimi görmezden gelir ya da kendiliğinden çözülmesini bekler.","Anlaşmazlıkları çözerken ilerleme kaydedemez; konuşma başladığı yerden devam eder.","Konuları tam anlamadan taraf tutar, yüzeysel okur, derine inmez.","Çatışmaların büyük aksaklıklara yol açmasına izin verir; erken müdahale etmez.","İnsanları savunmaya sokar, diyalog açmak yerine baskı uygular."],highlyskilled:["Grup dinamikleri bilgisiyle çatışmaları olmadan önce öngörür, proaktif müdahale eder.","Soru sorar, tüm paydaşları yakından dinler — her tarafın duyulduğunu hissettirir.","Ortak zemin bulur ve konsensüse yönlendirir; yüksek gerginlikli durumları yatıştırır."],overused:["Her çatışmaya müdahil olur — başkalarının meselelerine karışıyormuş gibi görülebilir.","Tartışmaya çok heveslidir; her farklı görüşü derinleştirilmesi gereken bir çatışma olarak ele alır.","Taraflar hazır olmadan çözüme iter, zamanlamanın da yönetilmesi gerektiğini unutur."],retail:"İki satış danışmanı, popüler bir ürünü kimin müşterisine sunduğu konusunda gerilim yaşıyor. Kat müdürü bunu fark eder ve aynı gün ikisiyle ayrı ayrı görüşüyor. Sonra ikisini birlikte oturtuyor: 'Amacımız müşterinin memnun ayrılması — bunu nasıl birlikte yapabiliriz?' Net bir alan paylaşım kuralı ortaya çıkıyor.",interview:"'Ekip içinde ya da müşteriyle ciddi bir çatışma yaşandığı ve doğrudan müdahale etmek zorunda kaldığın bir durumu anlat. Süreci nasıl yönettin? Zorlandığın an hangisiydi? Sonuç ne oldu?'"},ci:{def:"Organizasyonun başarılı olması için yeni ve daha iyi yollar yaratmak.",why:"Organizasyonlar sürekli değişen rekabet ortamında hayatta kalmak ve gelişmek için yeniliğe ihtiyaç duyar. Perakendede yenilik hayatta kalmanın koşuludur. Müşteri beklentileri yükseliyor, rekabet kızışıyor, alışveriş davranışları dönüşüyor. Vitrin düzeni, müşteri yolculuğu tasarımı, personel eğitim yöntemleri — bunların hepsi 'hep böyle yapıldı' kalıplarının dışına çıkmayı bekliyor. Doğası gereği yaratıcı olmayan biri bile bu yetkinliği geliştirebilir: merak etmeyi ve sormayı öğrenmek, kalıpların dışına çıkmak için bilinçli alan açmak.",skilled:["Yeni, daha iyi ya da özgün fikirler üretir — sıradan çözümlerde kalmaz.","Sorunlara bakmanın yeni yollarını gündeme taşır; mevcut çerçevenin dışından bakar.","Yaratıcı fikri pratiğe geçirebilir, hayal gücüyle uygulama kapasitesini birleştirir.","Çeşitli düşünceleri cesaretlendirir; başkalarının farklı düşünmesine alan açar.","Statükoya sorular sorar: 'neden böyle?' ve 'daha iyi nasıl?' rutin gündeme gelir."],lessskilled:["Yeni bakış açılarıyla denemek yerine konfor alanında kalmayı tercih eder.","Alışılmış ve bilinen fikirler sunar; yenilik boyutu eksiktir.","Başkalarının özgün fikirlerini eleştirmeye meyillidir — yeni fikirlerin ilk eleştirmeni olur.","'Olmaz' refleksi çabuktur, başkalarının yaratıcı girişimlerini caydırır."],highlyskilled:["Geleneksel yapma biçimlerinin ötesine geçer — statükoyu sorgular ve zorlar.","Yenilikçi fikrin pazar potansiyelini sürekli değerlendirir; hayal ile gerçeklik arasındaki mesafeyi ölçer.","En iyi fikirleri organize eder, hayata geçirilene kadar takip eder. Sadece üretmez, tamamlar."],overused:["Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz bozar — istikrar ve tutarlılık zarar görür.","Kanıtlanmamış fikirlere peşi sıra gider; odak ve öncelik kaybolur.","Altta yatan sorunları görmezden gelerek yeniliklere atlar, kökteki sorunu çözme disiplini eksiktir."],retail:"VM koordinatörü, yeni sezonda müşteri akış verilerine bakıyor. Soldan giren müşterilerin sağ vitrini neredeyse hiç görmediğini fark ediyor. Standart uygulama 'her zaman böyle yapılır' diyor, ama o farklı bir yerleşim öneriyor. İki haftanın sonunda sağ vitrin ürünlerine yüzde yirmi daha fazla ilgi var.",interview:"'Mevcut bir süreci, ürünü ya da deneyimi geliştirmek ya da değiştirmek için öncülük ettiğin bir durumu anlat. Fikri nereden buldun? Nasıl hayata geçirdin? Karşılaştığın dirençler nelerdi? Sonuç ne oldu?'"},pe:{def:"Başkalarının desteğini ve bağlılığını kazanmak için ikna edici argümanlar kullanmak.",why:"İşler ilişkiler aracılığıyla yürütülür. Bazen başkalarını bakış açılarını değiştirmeye ve harekete geçmeye ikna etmeden şeyleri gerçekleştirmek mümkün olmaz. Etkili ikna; mesajın ustaca iletilmesini ve kitleye uygun biçimde ayarlanmasını gerektirir. Perakendede ikna etme her düzeyde devrededir: satış danışmanı müşteriye doğru ürünü sunarken, mağaza müdürü bölge müdürüne yeni bir uygulama önerisini savunurken — hepsi ikna becerisini kullanmaktadır.",skilled:["Argümanlarını kitleye göre konumlandırır — tek tip sunmaz.","Başkalarını harekete geçmeye ikna eder; fikri onaylatan değil, eylemi başlatan.","Zor durumlarda ustaca müzakere eder, çıkmaz sokaklarda yol bulur.","İlişkilere zarar vermeden tavizler elde eder; kazan-kazan zemini arar.","Başkalarının tepkilerine savunmaya geçmeden yanıt verir, diyalog açar."],lessskilled:["Bakış açısını dayatır — karşısındaki direnç geliştirmeye başlar.","Destek ya da bağlılık kazanamaz; fikir kabul görmeden ölür.","Herkesi tatmin edecek çözümler müzakere edemez; ya kabul eder ya çatışır.","İtiraz geldiğinde olumsuz tepki verir, kaybeder.","Kendi pozisyonunu destekleyen mantıklı argüman oluşturmakta zorlanır."],highlyskilled:["Fikirlerini ikna edici paylaşır — dinleyen sadece anlamakla kalmaz, sahiplenir.","Ustaca müzakere eder, mutabık kalınan çözüme ilerlerken minimal gürültü yaratır.","Birden fazla paydaşın ihtiyaçlarını karşılayan ortak zemin ve alternatifler bulur."],overused:["Sürekli ikna etmeye çalışmak yorgunluk yaratır — insanlar her konuşmanın bir 'satış' olduğunu hisseder.","Dinlemek yerine konuşmayı tercih eder; ikna etmek isterken başkasını sessize alır.","Aşırı ısrarcı olur, 'hayır' cevabını kabul etmekte zorlanır ve ilişkiyi zorlar."],retail:"Mağaza müdürü, mağazanın arka alanının müşteri girişine dönüştürülmesini bölge müdürüne öneriyor. Bölge müdürü başlangıçta kuşkulu. Müdür müşteri trafik verisini sunuyor, iki benzer mağazadaki uygulamadan örnekler gösteriyor, altı ayda geri dönen bir maliyet projeksiyonu çiziyor. Onay geliyor.",interview:"'Zor ya da dirençli birini ya da grubu ikna etmek zorunda kaldığın bir durumu anlat. Nasıl hazırlandın? Hangi argümanları kullandın? Direnç geldiğinde ne yaptın? Sonuç ne oldu?'"},ts:{def:"İş büyütmeye yönelik dijital ve teknoloji uygulamalarındaki yenilikleri öngörmek ve benimsemek.",why:"Teknoloji, imkânsız görüneni olağan hale getirdi. Bozucu teknolojiler inanılmaz bir hızla pazara giriyor. Dijital yetkinlik artık 'sahip olmak güzel' değil — 'olmazsa olmaz' kategorisindedir. Perakendede teknoloji dönüşümü somut ve hızlıdır: POS sistemleri, mobil ödeme, e-ticaret entegrasyonu, müşteri verisi analitik araçları, omnichannel sipariş yönetimi — bunların hepsi gündelik gerçektir. Teknolojiye direnen ya da yavaş adapte olan çalışanlar hem müşteri deneyimini zedeler hem kariyer fırsatlarını kaçırır.",skilled:["Ortaya çıkan teknolojilerin etkisini öngörür, gerekli uyarlamaları yapar — değişim onu hazırlıksız yakalamaz.","İşe fayda sağlayacak yeni teknik beceriler için çevresini tarar.","Düşük etkili ya da moda teknolojileri reddeder; her yeniliğe kapılmaz, seçici değerlendirir.","Yeni teknolojileri hızla öğrenir ve benimser, adaptasyon süreci kısadır."],lessskilled:["Mevcut uygulamalara o kadar bağlıdır ki yeni teknolojileri benimsemekte isteksizdir.","İş değeri katabilecek yenilikçi teknolojileri aramaz — fırsatları kaçırır.","Teknoloji değişimini tehdit olarak görür, kolaylaştırıcı olarak değil.","Sadece bildiği araçları kullanır; öğrenme döngüsünü başlatmakta zorlanır."],highlyskilled:["Teknoloji atılımları için çevresini sürekli tarar — erken benimseyenler arasındadır.","Kurumsal sonuçları geliştiren teknolojileri hem dener hem uygular.","Başkalarının yeni teknolojileri öğrenmesini teşvik eder; dijital dönüşümde lokomotif olur."],overused:["Her yeni teknolojiyi denemek ister — odak kaybolur, organizasyon 'teknoloji yorgunluğu' yaşar.","Teknoloji çözümüne o kadar odaklanır ki insani boyutu ve süreç gerçekliğini göz ardı eder.","Teknolojik yeniliği amacın önüne koyar; 'neden?' sormadan 'nasıl?' sorusuna atlar."],retail:"Mağazaya yeni bir müşteri sadakat uygulaması geliyor. Çoğu çalışan 'bir süre sonra öğrenirim' diyor. Bir satış danışmanı ise o gün akşam uygulamayı kendi telefonuna indiriyor, müşteri gözünden deneyimliyor ve ertesi gün müşterilere nasıl kullanacaklarını anlatıyor.",interview:"'Yeni bir teknoloji, sistem ya da dijital araç öğrenmek zorunda kaldığın bir durumu anlat. Nasıl başladın? Hangi zorluklarla karşılaştın? Bu öğrenme süreci işine nasıl katkı sağladı?'"},dq:{def:"Organizasyonun ilerlemesini sağlayacak iyi ve zamanında kararlar almak.",why:"İyi karar almak zorlu olabilir: kısa zaman çerçeveleri, sınırlı bilgi, zor ödünleşimler karşısında cevap bekleyen sabırsız insanlar. İyi kararlar analiz, bilgelik, deneyim ve yargının karışımına dayanır. Sorun şu ki insanlar karar almada pek de iyi değildir — yargı yapma yeteneklerini abartma ve sonuçları tahmin etmede aşırı özgüvenli olma eğilimi taşırlar. Perakendede karar kalitesi hem anlık hem stratejik boyutuyla sürekli gündemdedir. Mağaza müdürü gün içinde onlarca operasyonel karar alır — çoğu eksik bilgiyle.",skilled:["Eksik bilgi karşısında bile sağlam kararlar alır — belirsizlik felç etmez.","Karar alırken analiz, deneyim ve yargının karışımına başvurur; tek kaynağa bağlı kalmaz.","İlgili faktörleri değerlendirir, uygun karar alma kriterlerini kullanır.","Hızlı bir %80 çözümün ne zaman yeterli olacağını bilir; mükemmeli iyinin düşmanı yapmaz."],lessskilled:["Kararlara gelişigüzel yaklaşır ya da geciktirir — 'biraz daha bekleyelim' döngüsüne girer.","Eksik veri ya da hatalı varsayımlara dayanarak karar alır.","Farklı bakış açılarını görmezden gelir, uzun vadeli hedefler pahasına kısa vadeye odaklanır.","Sonuçları yeterince değerlendirmez; 'peki sonra ne olur?' sorusu sorulmaz."],highlyskilled:["Belirsizliğe rağmen yüksek kaliteli kararlar alır — kararlılığını kaybetmez.","Zamanında karar almak için ilgili kaynaklardan aktif görüş alır.","Görüşleri olgulardan ustalıkla ayırır; neyin veri, neyin yorum, neyin önyargı olduğunu fark eder."],overused:["Sezginin yeterli olacağı durumlarda bile aşırı metodolojik bir karar süreci uygular.","Kararları o kadar çok analiz eder ki momentum kaybedilir — analiz felci yaşanır.","Her kararda konsensüs arar; bazı durumlar hızlı ve bağımsız karar gerektirir."],retail:"Sezonun en yoğun haftasında iki mağazanın aynı anda personel açığı var. Bölge müdürü fazla analiz yapmak yerine şunu soruyor: 'Hangi mağazada müşteri trafiği daha yüksek bu hafta? Hangisinde deneyimli personel var ki kısa süre desteksiz çalışabilsin?' İki soruyla yeterli bilgiye ulaşıyor.",interview:"'Eksik bilgiyle ya da baskı altında önemli bir karar almak zorunda kaldığın bir durumu anlat. Nasıl düşündün? Hangi faktörleri değerlendirdin? Sonuç ne oldu?'"},op:{def:"İşleri tamamlamanın en etkili ve verimli yollarını bilmek; sürekli iyileştirme odağıyla çalışmak.",why:"Harika süreçler işi basitleştirir. İletişimi akıcı hale getirir. Maliyetleri düşürür ve verimliliği artırır. Rasyonalize edilmiş süreçler; kalite, müşteri memnuniyeti, satış ve kârlılık üzerinde iyileşmeler sağlar. Perakendede süreç optimizasyonu; stok alım akışından müşteri iade sürecine, vardiya devir tesliminden kasa kapanış prosedürlerine kadar uzanır. Verimsiz bir süreç sessizce büyük maliyetler üretir: zaman kaybı, hata, müşteri hayal kırıklığı ve personel yorgunluğu. Süreci göremeyen lider, fırsatı göremeyen liderdir.",skilled:["İşi tamamlamak için gerekli süreçleri tanımlar ve oluşturur — belirsizlik içinde çalışmaz.","Faaliyetleri verimli iş akışlarına göre ayırır ve birleştirir; hangi adımın nereye gittiğini bilir.","Uzaktan yönetimi mümkün kılan süreç ve prosedürler tasarlar, her şeyi kendisi kontrol etmek zorunda kalmaz.","İnce ayardan tam yeniden mühendisliğe kadar süreçleri iyileştirmenin yollarını arar."],lessskilled:["Dağınık çalışır, işleri örgütlemekte zorlanır.","İyileştirmeye odaklanmaz — 'hep böyle yapıldı' anlayışıyla yetinir.","Sistemler açısından düşünmez; bir değişikliğin diğer adımları nasıl etkilediğini görmez.","Verimli süreçler bulmakta zorlanır.","Mevcut süreçleri olduğu gibi kabul eder, iyileştirmeye az dikkat eder."],highlyskilled:["En kritik süreçlere odaklanır, daha az önemli görevleri bir kenara bırakabilir — öncelik sezgisi keskindir.","Kaynakları tam tahsis eden uygulama planları hazırlar.","Engelleri öngörür; 'bu adım bozulursa ne olur?' sorusu sürekli gündemindedir."],overused:["Sürece o kadar odaklanır ki insanı ve esnekliği gözden kaçırır — her durum prosedür haline gelir.","Küçük sorunları büyük süreç güncellemeleriyle çözer; orantısız tepki verir.","Süreç takıntısıyla koşulların gerektirdiği anlık adaptasyona direnç gösterir."],retail:"Stok sorumlusu, ürünlerin raftan çekildikten sonra sisteme girilmesinin bazen bir-iki gün geciktiğini fark ediyor. Satış danışmanları stokta olmayan ürünü satıyor, müşteri hayal kırıklığı yaşıyor, iadeler artıyor. Sorunu rapor etmek yerine süreci değiştiriyor: çekimler gerçek zamanlı sisteme giriyor. İki hafta içinde iade yüzde kırk düşüyor.",interview:"'Verimsiz bir süreci fark edip iyileştirdiğin bir durumu anlat. Sorunu nasıl tespit ettin? Ne değiştirdin? Hangi dirençle karşılaştın? Sonuç ne oldu?'"},bs:{def:"Birden fazla paydaşın ihtiyaçlarını öngörmek ve dengelemek.",why:"Bir paydaş, meşru bir iddiaya ya da 'paya' sahip olan kişi ya da gruptur. Değer yaratan herhangi bir şeyi gerçekleştirmek artık tek başına bir iş değildir. Paydaşlar herhangi bir strateji, girişim veya projenin başarısı için kritiktir. Savunucunuz olabileceği gibi kolayca engelleyicinize de dönüşebilirler. Perakendede üst seviyeli rollerde paydaş çeşitliliği belirginleşir. Bölge müdürü; merkez, mağaza müdürleri, tedarikçiler, müşteriler ve İK ekibi gibi birbirinden farklı önceliklere sahip grupları aynı anda yönetmek zorundadır.",skilled:["İç ve dış paydaşların beklentilerini ve ihtiyaçlarını anlar — kimsenin ne istediğini bilir.","Birden fazla paydaşın çıkarlarını dengeler, tek taraflı karar vermez.","Karar alırken kültürel ve etik faktörleri göz önünde bulundurur.","Paydaş talepleri çatıştığında adil davranır; basınç altında denge korunur."],lessskilled:["Sınırlı sayıda paydaşa odaklanır — görünür olanı görür, arka planda bekleyeni görmez.","Bazı paydaşların çıkarlarını diğerlerinden fazla gözetir; örtük bir hiyerarşi oluşturur.","Çatışan taleplerin eylemlerini adaletsiz etkilemesine izin verir.","Paydaş haritasını çıkarmaz, kimin neye ihtiyacı olduğunu sistematik düşünmez."],highlyskilled:["Tüm paydaşların hedeflerine ve beklentilerine ulaşması için iletişim süreçlerini korur.","Tüm paydaşlarla tutarlı yaklaşım ve takip sağlar — güvenilirliğini ve itibarını korur.","Çatışan paydaşlar arasında güven inşa eder ve sürdürür; tarafsızlığı için saygı görür."],overused:["Herkesi memnun etmeye çalışırken hiç kimseyi gerçekten tatmin etmez — net duruş bulanıklaşır.","Konsensüs aramak bazı durumlarda karar hızını ve netliğini zayıflatır.","Denge kaygısıyla kendi görüşünü sürekli arka plana iter; liderlik inisiyatifi kaybolur."],retail:"Bölge direktörü, üç mağazanın vardiya planlamasını değiştirmek istiyor. Merkez maliyet azaltması istiyor, mağaza müdürleri operasyonel etki konusunda endişeli, çalışanlar iş güvencesinden kaygılı. Direktör her grupla ayrı ayrı konuşuyor. Herkes her istediğini almıyor — ama herkes duyulduğunu hissediyor.",interview:"'Farklı çıkarlara sahip birden fazla paydaşı aynı anda yönetmek zorunda kaldığın bir durumu anlat. Çatışan beklentileri nasıl dengeledi? Sonuç ne oldu?'"},at:{def:"Mevcut ve gelecekteki iş ihtiyaçlarını karşılayacak en iyi yetenekleri çekmek ve seçmek.",why:"Organizasyonlar yetenekle dolu olması gerekir. Pek çok organizasyon için bu, organizasyonel performansın tek en büyük sürücüsüdür. Doğru kişiler, doğru becerilerle, doğru yerde ve doğru zamanda olduğunda hedeflere ulaşmak çok daha kolaydır. Perakendede yetenek çekme hem acil hem stratejik bir zorunluluktur. Sektörün en büyük zorluklarından biri olan yüksek turnover, yetenekli insanları tanımlama ve çekme kapasitesini sürekli sınayıcı kılar.",skilled:["Çeşitli ve yüksek kalibreli yetenekleri çeker — benzerlikten değil, tamamlayıcılıktan hareket eder.","Grubun ihtiyaçlarını karşılayacak doğru yeteneği bulur; neyin eksik olduğunu bilir.","Yetenek boşluklarını iç ve dış adayların doğru dengesiyle kapatır, tek kanala bağımlı kalmaz.","Yeteneği değerlendirmede keskin bir yargıya sahiptir; potansiyeli performanstan önce görür.","İşe alım kararlarını kurumun değerleri ve uzun vadeli hedefleriyle hizalar."],lessskilled:["Şirketin neye ihtiyaç duyduğunu anlamaz — yetenek boşluklarının farkında değildir.","Gelişigüzel yetenek seçer; değerlendirme kriteri belirsiz ya da tutarsızdır.","Rolü doldurmak için yetenekle eşleştirme konusunda az adım atar.","Seçim kriterleri belirsizdir.","Gelişmemiş sezgiye aşırı güvenir; yapılandırılmış değerlendirme yerine 'içgüdü' ile karar alır."],highlyskilled:["Çeşitli kanallardan aktif yetenek arar — pozisyon açılmadan önce havuz oluşturur.","Yetenek değerlendirmede özgün bir bakış açısı geliştirir; derinlikli gözlemle karar alır.","İşe alım kararlarını yalnızca mevcut rolün değil, geleceğin gereksinimlerine göre alır."],overused:["İşe alıma o kadar odaklanır ki mevcut ekibi geliştirmeyi göz ardı eder.","Değerlendirme kriterlerine aşırı bağlılık iyi adayların kaçırılmasına yol açar.","Her pozisyon için 'en iyisini' ararken gereğinden uzun bekler — pratiklik ve zamanlamanın değerini küçümser."],retail:"Bölge İK iş ortağı, mağaza müdür pozisyonu için iki aday değerlendiriyor. Birincisi CV'si mükemmel, deneyimi zengin. İkincisi daha az deneyimli ama müşteri odaklılık ve ekip motivasyonu konusundaki yanıtları çok güçlü. İK iş ortağı ikinci adayı tercih ediyor: 'Bu mağazanın şu an ihtiyacı olan şey deneyim değil, ekip dinamiğini dönüştürecek biri.'",interview:"'İşe aldığın ya da seçtiğin ve zamanla gerçekten doğru tercih olduğunu kanıtlayan biriyle deneyimini anlat. Onu seçerken neyi gördün? O deneyim yetenek değerlendirme anlayışını nasıl şekillendirdi?'"},bi:{def:"İş dünyası ve pazar hakkındaki bilgiyi organizasyonun hedeflerini ilerletmek için uygulamak.",why:"Alanı tanımak zorundasınuz. Olan biteni bilmek, güvenilirlik geliştirmenin temel taşıdır. İnsanların iki yol üzerinden içgörü geliştirmesi gerekir. Birincisi kendi sektörlerine dikkat etmeleri, kendi fonksiyonel alanlarında uzmanlık inşa etmeleri, organizasyonlarındaki departmanların nasıl çalıştığını anlamaları gerekir. İkincisi dışarıya bakmak. Rekabeti ve müşterileri öğrenmek. Trendleri belirlemek. Perakendede iş anlayışı; sektörün dinamiklerini, rakiplerin stratejilerini, müşteri davranış değişimlerini anlayabilmektir.",skilled:["İşlerin nasıl yürüdüğünü ve organizasyonların nasıl para kazandığını bilir — iş modelini içselleştirmiştir.","Rekabetteki ve pazardaki mevcut ve olası gelecek trendleri takip eder.","İş sürücüleri bilgisini eylemlere rehberlik etmek için kullanır; strateji ile taktik arasındaki bağı kurar.","Sektörünün ve organizasyonunun güçlü-zayıf yönlerini, fırsatlarını ve tehditlerini anlayarak çalışır."],lessskilled:["İşlerin nasıl yürüdüğünü anlamaz — temel iş kavramları belirsizdir.","Organizasyonu ve rekabeti etkileyen trendlerle güncel değildir.","Stratejilerin pazarda nasıl işlediğinden habersizdir; kararlar bağlam olmadan alınır.","Planlama ve yürütmesinde iş sürücülerini dikkate almaz, operasyonel düşünce stratejik boyutu gölgeler."],highlyskilled:["İşlerin nasıl yürüdüğünü ve nasıl para kazanıldığını derinlemesine anlar.","Pazardaki olası gelecek trendleri ilk fark edenler arasındadır.","Eylemleri önceliklendirirken tutarlı olarak iş sürücüleri ve pazar odaklı bakış açısı uygular."],overused:["İş bilgisini kısa vadeli kazanımlar için kullanır — uzun vadeli değer yaratmayı göz ardı eder.","Sektör uzmanlığına o kadar güvenir ki dışarıdan gelen yeni fikirlere kapanır.","'İş böyle işler' bilgisi konformizme dönüşür; statükoyu sorgulamak yerine meşrulaştırır."],retail:"Mağaza müdürü, kasım ayının sonunda rakip mağazanın Aralık kampanyasını erkenden ilan ettiğini fark ediyor. Bunu sadece not etmekle kalmıyor — kendi mağazası için ne anlama geldiğini analiz ediyor, bölge müdürüne proaktif bir not gönderiyor ve kendi Aralık taktiğini bir hafta öne çekiyor.",interview:"'Sektörü ya da pazarı yakından takip ederek bir fırsatı ya da tehdidi erken fark ettiğin ve buna göre harekete geçtiğin bir durumu anlat. Sinyali nasıl gördün? Ne yaptın? Sonuç ne oldu?'"},cu:{def:"Zorlu durumlarda bile doğru olanı söylemek ve yapmak için adım atmak; belirsizlik ve baskı altında ilkelerinden taviz vermemek.",why:"Cesaret; korku yokluğu değil, korku olmasına rağmen hareket etmektir. Organizasyonlarda gerçek cesaret; zor gerçekleri söylemek, olumsuz geri bildirimi vermek, popüler olmayan ama doğru olan kararları almak ve sistemin baskısı altında ilkelerden taviz vermemek biçiminde tezahür eder. Cesaret olmadan bilgi gizlenir, kritik geribildirim verilmez, kötü kararlar sorgulanmaz ve organizasyon yavaş yavaş kör noktalarla dolar. Perakendede bölge ve üzeri seviyelerde cesaret, liderliğin en belirleyici boyutlarından biridir.",skilled:["Durumun gerektirdiği zor adımları atar — gerginlik karşısında hareketsiz kalmaz.","Nahoş mesajları doğrudan iletir, gerçekten kaçınmaz.","Yüksek baskı altında bile net duruş sergiler; koşullara göre yön değiştirmez.","Zor kararları almak için gerekli cesareti gösterir. Popülerlik değil, doğruluk rehber olur.","Etik dışı ya da değerlere aykırı durumlara karşı açıkça durur."],lessskilled:["Zor mesajları iletmekten kaçınır — çatışmayı görmezden gelmeyi ya da kendiliğinden düzeleceğini ummayı tercih eder.","Yüksek baskı altında tutumunu değiştirir, güçlü bir sesle yönlendirilebilir.","Odadaki hâkim görüşe uyum sağlar; gerçek düşüncesini saklar.","Eleştiriyle karşılaşabileceği durumlarda önerisini geri çeker."],highlyskilled:["Direniş ya da eleştiriyle karşılaşsa bile doğru olduğuna inandığı şeyi savunur — ısrar eder.","Zorlu konuşmalar yapmasına ve zor adımlar atmasına model olur; organizasyonda cesaret kültürü yaratır.","Organizasyonun kör noktalarını cesaretle dile getirir, kimsenin söylemek istemediğini söyler."],overused:["O kadar doğrudan ve cesurdur ki başkalarının bakış açısını yeterince dinlemez — baskın duruş diyaloğun önüne geçer.","'Ben haklıyım' kesinliği esnek düşünme kapasitesini daraltır.","Diplomatik hassasiyeti ihmal eder; doğruyu söylemek ilişkiyi zorunlu olmadan zedeler."],retail:"Bölge direktörü, merkez tarafından önerilen bir mağaza kapanma kararının bölge için yanlış olduğuna inanıyor. Kapsamlı bir analiz hazırlıyor ve üst yönetime sunuyor: 'Bu karar kısa vadede maliyet azaltır ama bölgenin uzun vadeli büyüme kapasitesini zedeler.' Karar değişebilir de değişmeyebilir de. Ama söylenmesi gereken söylenmiştir.",interview:"'Popüler ya da kolay olmayan ama doğru olduğuna inandığın bir şeyi savunduğun bir durumu anlat. Karşılaştığın baskı ya da direnç neydi? Sonuç ne oldu?'"},cx:{def:"Çelişkili ve eksik bilgiden bile anlamlı anlayış üretmek; karmaşık sorunları etkili biçimde çözmek.",why:"Organizasyonlar giderek daha karmaşık hale geliyor. Veri bolluğu, çakışan öncelikler, belirsiz nedensellik ilişkileri ve hızla değişen koşullar — bunların tümü liderlik kararlarının arka planını oluşturuyor. Karmaşıklıkla yüzleşmek; elinizdeki tüm bilgiyi toplamak, çelişkili sinyalleri okumak, neyin önemli neyin gürültü olduğunu ayırt etmek ve tüm bunların ortasında net bir anlayışa ulaşmak demektir. Bölge düzeyinde ve üzerinde perakende yöneticileri onlarca mağaza, yüzlerce çalışan, farklı pazar koşulları ve çakışan iş öncelikleriyle aynı anda başa çıkmak zorundadır.",skilled:["Belirsiz, çelişkili ve eksik bilgiden bile anlamlı içgörü çıkarır — sinyali gürültüden ayırır.","Karmaşık sorunları sistematik ele alır; parçaları görür, bütünü kaybetmez.","Çok sayıda değişkeni göz önünde bulundururken pratik kararlar alır.","Karmaşık durumları başkalarına anlaşılır açıklar; netlik yaratır, karmaşıklığı büyütmez.","Belirsizlik içinde çalışır, tüm bilgi gelene kadar beklemez."],lessskilled:["Birden fazla boyutu olan sorunları ele almakta zorlanır.","Bilgi belirsiz ya da eksikken karar almaktan kaçınır — netlik gelmesini bekler.","Bütünü görmek yerine parçalara takılır; sistemik düşünme eksiktir.","Karmaşıklığı daha da karmaşık hale getirir, netlik üretmek yerine belirsizliği artırır."],highlyskilled:["Geniş bağlamsal analiz yapar — çok sayıda faktörü göz önünde bulundururken pratik kararlar alabilir.","Yüksek belirsizlikte bile net anlayışa ulaşır; belirsizlik onun için sorun değil, çalışma ortamıdır.","Karmaşıklığı yönetmekle kalmaz, başkalarına da bu ortamda nasıl hareket edileceğini öğretir."],overused:["Her soruna karmaşıklık gözüyle bakar — basit sorunları gereksiz derinleştirir.","Kapsamlı analiz arayışı karar hızını yavaşlatır; bazen hızlı ve yeterli bir yanıt, mükemmel ama geç olandan değerlidir.","Başkalarını karmaşıklığın içine çeker, yönetmek yerine ortak eder."],retail:"Bölge direktörü, üç mağazanın aynı anda performans sorununu raporluyor. İlk bakışta benzer görünüyor — satışlar düşük. Ama direktör her mağazanın verisini derinlemesine inceliyor: biri personel sorunuyla, biri lokasyon değişikliğinin etkisiyle, biri fiyatlandırma stratejisiyle boğuşuyor. Üçü için tek bir çözüm üretmek yerine üç farklı müdahale planlıyor.",interview:"'Birden fazla değişken ve belirsizlik içeren karmaşık bir sorunu çözmek zorunda kaldığın bir durumu anlat. Soruna nasıl yaklaştın? Kararı nasıl aldın? Sonuç ne oldu?'"},sa:{def:"İletişim tarzını, yaklaşımını ve çalışma biçimini koşullara ve kişilere göre aktif olarak uyarlamak.",why:"Her durum farklı bir yanıt gerektirir. Her insan farklı bir dil ister. Uyum sağlama yetkinliği; durumu doğru okumak, bu okumayla ne yapılması gerektiğini anlamak ve davranışı buna göre ayarlamaktır. Bu; karizmasız olmak ya da karaktersiz olmak değildir — tam tersine, yeterince özgüvenli olmak ki her durumda doğru olanı yapabilmek. Perakendede uyum sağlama günlük gerçektir. Sabahın ilk müşterisi aceleci ve bilgili, öğleden sonraki müşteri isteksiz ve kararsız. Durumu okuyup yanıtı ayarlayan kişi hem daha etkili hem daha güvenilir hem de daha sürdürülebilir bir performans sergiler.",skilled:["Durumu ve kitleyi aktif okur — aynı anda hem içeriği hem bağlamı değerlendirir.","Tarzını ve yaklaşımını koşullara göre ayarlar; her duruma aynı tepkiyle girmez.","Değişen önceliklere, koşullara ve insanlara uyarlanabilir. Esneklik ona güç verir.","Farklı bireylerin ihtiyaçlarını ve motivasyonlarını okur, herkese 'özel' hissettiren bir etkileşim kurar.","Beklenmedik değişiklikler karşısında sakinliğini korur."],lessskilled:["Her duruma aynı yaklaşımla girer — durum, kişi ya da bağlam fark etmeksizin tek tarz kullanır.","Koşullar değiştiğinde hızla adapte olamaz, değişime geç tepki verir.","Farklı kişilerin ihtiyaçlarını okumaz; 'herkes benim gibi düşünür' varsayımıyla hareket eder.","Beklenmedik durumlar karşısında sarsılır, plan bozulunca etkinliği düşer."],highlyskilled:["Durumu gerçek zamanlı okur, yaklaşımını anlık ayarlar — geri bildirim döngüsü çok kısadır.","Çok farklı bağlamlarda eşit verimde çalışır; rutin, kriz ve büyüme ortamlarında etkin.","Başkalarının da uyum kapasitesini geliştirmesine yardımcı olur, esnekliği örnekle gösterir."],overused:["Aşırı uyum tutarsız görünebilir — insanlar 'bu kişinin gerçek tutumu ne?' diye merak eder.","Her koşula adapte olma girişimi otantiklik kaybına yol açabilir; kimlik ve duruş bulanıklaşır.","Bazı durumlar tutarlılık ve öngörülebilirlik gerektirir. Uyum sağlamak her zaman cevap değildir."],retail:"Kat müdürü, yeni işe giren bir satış danışmanına sabırlı rehberlik sunuyor — sorularını karşılıyor, adım adım açıklıyor. Aynı gün kıdemli bir danışmanla konuşurken tonu ve üslubu tamamen değişiyor — eşit saygıyla, daha az açıklama yaparak, daha fazla soru sorarak.",interview:"'Alışılageldik yaklaşımının işe yaramadığını fark ettiğin ve tarzını ya da stratejini ortada değiştirmek zorunda kaldığın bir durumu anlat. Ne fark ettin? Ne değiştirdin? Sonuç ne oldu?'"}};


/* ════════════════════════════════════════════════
   RETAIL ROLES TAXONOMY (fresh, career progression)
   ════════════════════════════════════════════════ */

/* Full 34-role taxonomy with competency mappings */
var ROLE_COMP_MAP = {
  'Kasiyer':              ['cf','it','ea','ce','br'],
  'Sat\u0131\u015f Dan\u0131\u015fman\u0131':      ['cf','ce','it','co','ao'],
  'K\u0131demli Sat\u0131\u015f Dan.':   ['cf','ce','it','co','is','nl'],
  'G\u00f6rsel Sat\u0131\u015f Uzm.':    ['ci','pa','cf','sa','ao'],
  'Display Uzman\u0131':       ['ci','pa','ao','cf','nl'],
  'Stok Sorumlusu':       ['ea','op','pa','co','dq'],
  'Kasa Sorumlusu':       ['cf','ea','dw','it','co','ce'],
  'VM Koordinat\u00f6r\u00fc':      ['ci','pa','co','cf','sa','ea'],
  'Onboarding Uzman\u0131':    ['ce','is','co','cf','nl'],
  'Sat\u0131\u015f Uzman\u0131':         ['cf','pe','bi','ce','co','is','dr'],
  '\u00dcr\u00fcn Uzman\u0131':          ['cf','bi','ce','ts','co','nl','pe'],
  'Omni-Channel Sat\u0131\u015f':   ['cf','ts','sa','ce','bi','co','dr'],
  'Envanter Uzman\u0131':      ['op','dq','ea','pa','co','bi'],
  'E\u011fitim Uzman\u0131':        ['dt','ce','nl','co','de','pa'],
  'Ma\u011faza Ko\u00e7u':          ['dt','is','de','ce','co','cf'],
  '\u0130\u015fe Al\u0131m Uzman\u0131':      ['at','is','ce','dq','co','pe'],
  'CRM Uzman\u0131':           ['cf','ts','bi','ce','dq','pa'],
  'Kat M\u00fcd\u00fcr\u00fc':           ['cf','dw','mc','ea','ao','co','ce'],
  'Ma\u011faza M\u00fcd\u00fcr Yrd.':    ['ea','de','pa','cf','dw','mc','co','dr'],
  'VM M\u00fcd\u00fcr\u00fc':            ['ci','sm','dw','pa','cf','co','dr'],
  'E\u011fitim M\u00fcd\u00fcr\u00fc':        ['dt','ce','de','pa','co','dw','ea'],
  'Operasyon M\u00fcd\u00fcr\u00fc':     ['op','dw','pa','ea','dq','co','bi','dr'],
  '\u0130K \u0130\u015f Orta\u011f\u0131':         ['at','dt','ce','bs','is','mc','dq'],
  'Ma\u011faza M\u00fcd\u00fcr\u00fc':        ['ea','dr','dw','bt','cf','dt','co','fa','de'],
  'Store Leader':         ['sm','it','de','cf','dr','bt','co','cu','ea'],
  'B\u00f6lge M\u00fcd\u00fcr\u00fc':         ['dr','ea','dt','sm','cf','bt','pa','de','co','fa'],
  'B\u00f6lge Operasyon M\u00fcd.': ['op','pa','ea','dr','cx','dw','dq','co','fa'],
  'B\u00f6lge G\u00f6rsel M\u00fcd\u00fcr\u00fc':  ['ci','sm','dw','pa','cf','pe','dr','co','bs'],
  'B\u00f6lge Sat\u0131\u015f M\u00fcd\u00fcr\u00fc':   ['dr','cf','pe','de','bt','bi','pa','co','fa'],
  'B\u00f6lge Direkt\u00f6r\u00fc':      ['sm','cu','ea','bs','bt','dr','co','fa','dt','cx'],
  '\u00dclke M\u00fcd\u00fcr\u00fc':          ['sm','cu','ea','bs','bt','dr','co','fa','dt','cx','de'],
  '\u0130K M\u00fcd\u00fcr\u00fc':            ['at','bt','is','ea','co','mc','bs','ce','sm'],
  '\u00dclke E\u011fitim M\u00fcd\u00fcr\u00fc':   ['dt','sm','ce','pa','de','bt','dr','co','bs']
};

var FREE_LIMIT = 2;

/* ════════════════════════════════════════════════
   DB-BACKED DATA LOADING
   Fetches competency_definitions + role_competency_map from Supabase.
   Reshapes into the same bridge contract (ANCHORS, ROLE_COMP_MAP, etc).
   Hardcoded data above is kept as synchronous fallback.
   ════════════════════════════════════════════════ */

var _dbDataLoaded = false;

async function loadCompetencyDataFromDb() {
  if (_dbDataLoaded) return;
  if (typeof supabase === 'undefined') return;
  _dbDataLoaded = true;

  try {
    /* Parallel fetch: definitions + role mappings */
    var defsP = supabase.from('competency_definitions')
      .select('code, name_tr, name_en, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question');
    var mapsP = supabase.from('role_competency_map')
      .select('role_name, competency_code, sort_order')
      .order('sort_order', { ascending: true });

    var results = await Promise.all([defsP, mapsP]);
    var defsRes = results[0];
    var mapsRes = results[1];

    if (defsRes.error || !defsRes.data || defsRes.data.length === 0) return; /* keep hardcoded fallback */
    if (mapsRes.error || !mapsRes.data) return;

    /* Rebuild ANCHORS from DB */
    var dbAnchors = {};
    var dbCompNames = {};
    var dbCompKf = {};
    for (var i = 0; i < defsRes.data.length; i++) {
      var d = defsRes.data[i];
      dbCompNames[d.code] = d.name_tr;
      dbCompKf[d.code] = d.name_en;
      dbAnchors[d.code] = {
        def: d.definition || '',
        why: d.why_critical || '',
        skilled: d.skilled || [],
        lessskilled: d.less_skilled || [],
        highlyskilled: d.highly_skilled || [],
        overused: d.overused || [],
        retail: d.retail_example ? [d.retail_example] : [],
        interview: d.interview_question ? [d.interview_question] : []
      };
    }

    /* Rebuild ROLE_COMP_MAP from DB */
    var dbRoleMap = {};
    for (var r = 0; r < mapsRes.data.length; r++) {
      var m = mapsRes.data[r];
      if (!dbRoleMap[m.role_name]) dbRoleMap[m.role_name] = [];
      dbRoleMap[m.role_name].push(m.competency_code);
    }

    /* Upgrade in-place — this updates the bridge contract for downstream consumers */
    var defKeys = Object.keys(dbAnchors);
    for (var ai = 0; ai < defKeys.length; ai++) {
      ANCHORS[defKeys[ai]] = dbAnchors[defKeys[ai]];
      COMP_NAMES[defKeys[ai]] = dbCompNames[defKeys[ai]];
      COMP_KF[defKeys[ai]] = dbCompKf[defKeys[ai]];
    }
    var roleKeys = Object.keys(dbRoleMap);
    for (var ri = 0; ri < roleKeys.length; ri++) {
      ROLE_COMP_MAP[roleKeys[ri]] = dbRoleMap[roleKeys[ri]];
    }

    /* Re-export bridge (same object references, but updated) */
    window._htYetkinlikData = { ANCHORS: ANCHORS, ROLE_COMP_MAP: ROLE_COMP_MAP, COMP_NAMES: COMP_NAMES, COMP_KF: COMP_KF, FREE_LIMIT: FREE_LIMIT };
  } catch (e) {
    /* Silent fallback — hardcoded data remains active */
    console.error('[yetkinlik] DB load failed, using hardcoded fallback:', e.message || e);
  }
}

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


/* ════════════════════════════════════════════════
   CSS (fresh, no legacy)
   ════════════════════════════════════════════════ */

function injectCSS() {
  if (document.getElementById('yk-css')) return;
  var css = '';

  /* --- Layout --- */
  css += '#yk-container{max-width:100%;padding:0 0 40px}';
  css += '.yk-screen{animation:ykFadeIn .25s ease}';
  css += '@keyframes ykFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  css += '@keyframes ykSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
  css += '@keyframes ykPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}';

  /* --- Intro --- */
  css += '.yk-intro{text-align:center;padding:24px;max-width:480px;margin:0 auto;min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center}';
  css += '.yk-intro-title{font-family:"Bricolage Grotesque",sans-serif;font-size:28px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:12px;line-height:1.2}';
  css += '.yk-intro-desc{font-size:14px;color:var(--muted,#6B7280);line-height:1.7;margin-bottom:28px}';
  css += '.yk-cta{background:var(--verm,#C94E28);color:#fff;border:none;border-radius:12px;padding:14px 40px;font-family:"Plus Jakarta Sans",sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s}';
  css += '.yk-cta:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(201,78,40,.25)}';
  css += '.yk-cta.secondary{background:#fff;color:var(--navy,#1E2D5E);border:1.5px solid var(--border,#E5E3DF)}';
  css += '.yk-cta.secondary:hover{border-color:var(--navy,#1E2D5E);transform:translateY(-1px)}';

  /* --- Role Selection --- */
  css += '.yk-screen-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:700;color:var(--navy,#1E2D5E);margin-bottom:24px}';
  css += '.yk-screen-desc{font-size:13px;color:var(--muted,#6B7280);line-height:1.6;margin-bottom:24px}';
  css += '.yk-role-page{text-align:center;min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;max-width:400px;margin:0 auto}';
  css += '.yk-select-wrap{width:100%;margin-bottom:24px}';
  css += '.yk-select{width:100%;height:48px;border:1.5px solid var(--border,#E5E3DF);border-radius:10px;padding:0 16px;font-family:"Plus Jakarta Sans",sans-serif;font-size:14px;color:var(--text,#111);background:#fff;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B7280\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;transition:border-color .2s}';
  css += '.yk-select:focus{border-color:var(--navy,#1E2D5E)}';
  css += '.yk-cta.disabled{opacity:.4;cursor:not-allowed}';

  /* --- Steps indicator --- */
  css += '.yk-steps{display:flex;justify-content:center;gap:8px;margin-bottom:28px;padding-top:8px}';
  css += '.yk-step{width:8px;height:8px;border-radius:50%;background:var(--border,#E5E3DF);transition:all .3s}';
  css += '.yk-step.active{background:var(--verm,#C94E28);width:28px;border-radius:4px}';

  /* --- Preview Grid (bento asymmetric) --- */
  css += '.yk-preview-hero{background:linear-gradient(135deg,#2A3F7A 0%,var(--navy,#1E2D5E) 50%,#162247 100%);border-radius:20px;padding:24px;margin-bottom:20px;position:relative;overflow:hidden}';
  css += '.yk-preview-hero .ph-tag{display:inline-flex;align-items:center;gap:5px;background:rgba(201,78,40,.2);border:1px solid rgba(201,78,40,.4);border-radius:12px;padding:4px 10px;font-size:11px;font-weight:600;color:#FCA47A;margin-bottom:10px}';
  css += '.yk-preview-hero .ph-title{font-family:"Bricolage Grotesque",sans-serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:8px;line-height:1.3}';
  css += '.yk-preview-hero .ph-count{font-family:"DM Mono",monospace;font-size:13px;color:rgba(255,255,255,.6)}';
  css += '.yk-comp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}';
  css += '.yk-comp-card{background:var(--bg-surface,#fff);border:1px solid var(--border-subtle,var(--border,#E5E3DF));border-radius:20px;padding:20px;position:relative;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(0,0,0,.03),0 2px 4px rgba(0,0,0,.05),0 12px 24px rgba(0,0,0,.05);transition:all .35s cubic-bezier(.4,0,.2,1)}';
  css += '.yk-comp-card:hover{transform:translateY(-2px);border-color:rgba(201,78,40,.2);box-shadow:0 0 0 1px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.08),0 16px 32px rgba(0,0,0,.07)}';
  css += '.yk-comp-card.span-2{grid-column:span 2}';
  css += '.yk-comp-card.locked{cursor:default}.yk-comp-card.locked:hover{transform:none;box-shadow:0 0 0 1px rgba(0,0,0,.03),0 2px 4px rgba(0,0,0,.05),0 12px 24px rgba(0,0,0,.05);border-color:var(--border-subtle,var(--border,#E5E3DF))}';
  css += '.yk-comp-card .cc-name{font-family:"Bricolage Grotesque",sans-serif;font-size:14px;font-weight:600;color:var(--navy,#1E2D5E);margin-bottom:2px}';
  css += '.yk-comp-card .cc-kf{font-size:10px;color:var(--muted,#6B7280);font-family:"DM Mono",monospace;margin-bottom:10px}';
  css += '.yk-comp-card .cc-def{font-size:12px;color:var(--muted,#6B7280);line-height:1.6}';
  css += '.yk-lock{position:absolute;inset:0;background:rgba(247,246,244,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border-radius:18px;backdrop-filter:blur(3px)}';
  css += '.yk-lock-icon{width:36px;height:36px;background:var(--navy,#1E2D5E);border-radius:50%;display:flex;align-items:center;justify-content:center}';
  css += '.yk-lock-icon svg{width:16px;height:16px}';
  css += '.yk-lock-text{font-size:11px;font-weight:600;color:var(--navy,#1E2D5E);text-align:center}';

  /* ========== READING: BENTO GRID LAYOUT ========== */
  css += '.yk-reading-page{max-width:100%}';

  /* Header card */
  css += '.yk-rh{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;background:#fff;border:1px solid var(--border,#E5E3DF);border-radius:20px;padding:20px 24px;box-shadow:0 2px 8px rgba(0,0,0,.04)}';
  css += '.yk-rh-title{font-family:"Bricolage Grotesque",sans-serif;font-size:22px;font-weight:700;color:var(--verm,#C94E28);line-height:1.2}';
  css += '.yk-rh-counter{font-size:12px;color:var(--verm,#C94E28);font-family:"DM Mono",monospace;white-space:nowrap;padding:6px 14px;background:rgba(201,78,40,.08);border-radius:10px;font-weight:600}';

  /* Bento grid */
  css += '.yk-bento{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}';

  /* Definition card — full width */
  css += '.yk-bento-def{grid-column:1/-1;background:linear-gradient(135deg,#2A3F7A 0%,var(--navy,#1E2D5E) 100%);border-radius:20px;padding:24px 28px;color:#fff;position:relative;overflow:hidden}';
  css += '.yk-bento-def::after{content:"";position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:rgba(201,78,40,.15);border-radius:50%;pointer-events:none}';
  css += '.yk-bento-def .bd-label{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:8px}';
  css += '.yk-bento-def .bd-text{font-size:15px;line-height:1.7;font-weight:500;color:#fff}';
  css += '.yk-bento-def .bd-why{font-size:13px;line-height:1.7;color:rgba(255,255,255,.7);margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}';

  /* Generic bento card */
  css += '.yk-bento-card{background:#fff;border:1px solid var(--border,#E5E3DF);border-radius:20px;padding:20px 22px;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08),0 8px 20px rgba(0,0,0,.06);animation:ykSlideUp .35s ease both}';
  css += '.yk-bento-card:nth-child(2){animation-delay:.05s}.yk-bento-card:nth-child(3){animation-delay:.1s}.yk-bento-card:nth-child(4){animation-delay:.15s}.yk-bento-card:nth-child(5){animation-delay:.2s}.yk-bento-card:nth-child(6){animation-delay:.25s}.yk-bento-card:nth-child(7){animation-delay:.3s}';
  css += '.yk-bento-card.span-full{grid-column:1/-1}';

  /* Card header with icon accent */
  css += '.bc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px}';
  css += '.bc-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px}';
  css += '.bc-icon.green{background:#ECFDF5;color:#059669}';
  css += '.bc-icon.amber{background:#FFFBEB;color:#D97706}';
  css += '.bc-icon.blue{background:#EFF6FF;color:#2563EB}';
  css += '.bc-icon.rose{background:#FFF1F2;color:#E11D48}';
  css += '.bc-icon.teal{background:#F0FDFA;color:#0D9488}';
  css += '.bc-icon.navy{background:#EEF2FF;color:var(--navy,#1E2D5E)}';
  css += '.bc-label{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:var(--muted,#6B7280)}';
  css += '.bc-count{font-family:"DM Mono",monospace;font-size:10px;color:var(--muted,#6B7280);margin-left:auto}';

  /* Anchor items inside cards */
  css += '.bc-list{display:flex;flex-direction:column;gap:6px}';
  css += '.bc-item{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:10px;font-size:12.5px;line-height:1.6;transition:background .2s}';
  css += '.bc-item:hover{background:rgba(0,0,0,.02)}';
  css += '.bc-item .bc-num{width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px}';
  css += '.bc-item.green .bc-num{background:#DCFCE7;color:#15803D}';
  css += '.bc-item.amber .bc-num{background:#FEF3C7;color:#92400E}';
  css += '.bc-item.rose .bc-num{background:#FFE4E6;color:#9F1239}';
  css += '.bc-item.teal .bc-num{background:#CCFBF1;color:#0F766E}';
  css += '.bc-item.green span{color:#14532D}.bc-item.amber span{color:#78350F}.bc-item.rose span{color:#881337}.bc-item.teal span{color:#115E59}';

  /* Retail scenario card */
  css += '.yk-bento-retail{grid-column:1/-1;background:linear-gradient(135deg,#FEFCE8 0%,#FEF9C3 100%);border:1px solid #FDE68A;border-radius:20px;padding:22px 24px;position:relative;overflow:hidden}';
  css += '.yk-bento-retail::before{content:"";position:absolute;top:-20px;right:-20px;width:80px;height:80px;background:rgba(217,119,6,.08);border-radius:50%}';
  css += '.yk-bento-retail .br-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}';
  css += '.yk-bento-retail .br-icon{width:32px;height:32px;background:rgba(217,119,6,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}';
  css += '.yk-bento-retail .br-label{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#92400E}';
  css += '.yk-bento-retail .br-text{font-size:13px;color:#78350F;line-height:1.7}';

  /* Interview card */
  css += '.yk-bento-interview{grid-column:1/-1;background:var(--navy,#1E2D5E);border-radius:20px;padding:22px 24px;position:relative;overflow:hidden}';
  css += '.yk-bento-interview::after{content:"";position:absolute;bottom:-30px;left:-30px;width:100px;height:100px;background:rgba(201,78,40,.1);border-radius:50%}';
  css += '.yk-bento-interview .bi-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}';
  css += '.yk-bento-interview .bi-icon{width:32px;height:32px;background:rgba(255,255,255,.1);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}';
  css += '.yk-bento-interview .bi-label{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:rgba(255,255,255,.5)}';
  css += '.yk-bento-interview .bi-text{font-size:13px;color:rgba(255,255,255,.9);line-height:1.7;font-style:italic}';

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
  css += '@media(max-width:900px){.yk-comp-grid{grid-template-columns:repeat(2,1fr)}.yk-comp-card.span-2{grid-column:span 1}}';
  css += '@media(max-width:768px){';
  css += '.yk-intro{padding:40px 16px}.yk-intro-title{font-size:24px}';
  css += '.yk-completion{padding:32px 16px}';
  css += '.yk-comp-grid{grid-template-columns:1fr}.yk-comp-card.span-2{grid-column:span 1}';
  css += '.yk-select{font-size:16px !important}';
  css += '.yk-bento{grid-template-columns:1fr}';
  css += '.yk-bento-card.span-full{grid-column:span 1}';
  css += '.yk-rh{padding:16px 18px}.yk-rh-title{font-size:18px}';
  css += '.yk-bento-def{padding:20px}';
  css += '.yk-bento-card{padding:16px 18px}';
  css += '}';

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
  var html = '<div class="yk-screen">';
  html += '<div class="yk-steps"><span class="yk-step active"></span><span class="yk-step"></span><span class="yk-step"></span></div>';
  html += '<div class="yk-role-page">';
  html += '<h2 class="yk-screen-title">Mevcut veya hedef rol\u00fcn\u00fc se\u00e7</h2>';
  html += '<div class="yk-select-wrap">';
  var roleKeys = Object.keys(ROLE_COMP_MAP).sort(function(a,b){ return a.localeCompare(b,'tr'); });
  html += '<select class="yk-select" id="yk-role-select"><option value="" disabled selected>Rol se\u00e7...</option>';
  for (var i = 0; i < roleKeys.length; i++) {
    html += '<option value="' + roleKeys[i] + '">' + roleKeys[i] + '</option>';
  }
  html += '</select></div>';
  html += '<button class="yk-cta disabled" id="yk-role-start" disabled>Ba\u015flat</button>';
  html += '</div>';
  html += '<div class="yk-nav"><button class="yk-nav-btn" id="yk-back-intro">\u2190 Geri</button><div class="yk-nav-spacer"></div></div>';
  html += '</div>';
  c.innerHTML = html;
  var sel = document.getElementById('yk-role-select');
  var btn = document.getElementById('yk-role-start');
  sel.addEventListener('change', function() {
    if (sel.value) { btn.disabled = false; btn.classList.remove('disabled'); }
  });
  btn.addEventListener('click', function() {
    if (sel.value) navigate('preview', {role: sel.value});
  });
  document.getElementById('yk-back-intro').addEventListener('click', function() {
    navigate('intro');
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
    var isWide = (i === 0 || i % 5 === 0);
    html += '<div class="yk-comp-card' + (isWide ? ' span-2' : '') + (locked ? ' locked' : '') + '" data-comp="' + code + '" data-idx="' + i + '">';
    html += '<div class="cc-name">' + name + '</div>';
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
   SCREEN 4: READING (Premium Bento Grid Layout)
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

  var html = '<div class="yk-screen"><div class="yk-reading-page">';
  html += '<div class="yk-steps"><span class="yk-step"></span><span class="yk-step active"></span><span class="yk-step"></span></div>';

  /* Header card */
  html += '<div class="yk-rh">';
  html += '<div class="yk-rh-title">' + name + '</div>';
  html += '<div class="yk-rh-counter">' + (idx + 1) + ' / ' + comps.length + '</div>';
  html += '</div>';

  /* ── BENTO GRID ── */
  html += '<div class="yk-bento">';

  /* 1. Definition card (full width, navy gradient) */
  html += '<div class="yk-bento-def">';
  html += '<div class="bd-label">Tan\u0131m</div>';
  html += '<div class="bd-text">' + a.def + '</div>';
  html += '<div class="bd-why">' + a.why + '</div>';
  html += '</div>';

  /* 2. Yetkin Olanlar (left column) */
  html += '<div class="yk-bento-card">';
  html += '<div class="bc-header"><div class="bc-icon green"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><div><div class="bc-label">Yetkin Olanlar</div></div><div class="bc-count">' + a.skilled.length + '</div></div>';
  html += '<div class="bc-list">';
  for (var si = 0; si < a.skilled.length; si++) {
    html += '<div class="bc-item green"><div class="bc-num">' + (si + 1) + '</div><span>' + a.skilled[si] + '</span></div>';
  }
  html += '</div></div>';

  /* 3. Gelisim Asamasindakiler (right column) */
  html += '<div class="yk-bento-card">';
  html += '<div class="bc-header"><div class="bc-icon amber"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg></div><div><div class="bc-label">Geli\u015fim A\u015famas\u0131</div></div><div class="bc-count">' + a.lessskilled.length + '</div></div>';
  html += '<div class="bc-list">';
  for (var li = 0; li < a.lessskilled.length; li++) {
    html += '<div class="bc-item amber"><div class="bc-num">' + (li + 1) + '</div><span>' + a.lessskilled[li] + '</span></div>';
  }
  html += '</div></div>';

  /* 4. Cok Yetenekli (left) */
  html += '<div class="yk-bento-card">';
  html += '<div class="bc-header"><div class="bc-icon teal"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div><div class="bc-label">\u00c7ok Yetenekliler</div></div><div class="bc-count">' + a.highlyskilled.length + '</div></div>';
  html += '<div class="bc-list">';
  for (var hi = 0; hi < a.highlyskilled.length; hi++) {
    html += '<div class="bc-item teal"><div class="bc-num">' + (hi + 1) + '</div><span>' + a.highlyskilled[hi] + '</span></div>';
  }
  html += '</div></div>';

  /* 5. Asiri Kullanim (right) */
  html += '<div class="yk-bento-card">';
  html += '<div class="bc-header"><div class="bc-icon rose"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="bc-label">A\u015f\u0131r\u0131 Kullan\u0131m</div></div><div class="bc-count">' + a.overused.length + '</div></div>';
  html += '<div class="bc-list">';
  for (var oi = 0; oi < a.overused.length; oi++) {
    html += '<div class="bc-item rose"><div class="bc-num">' + (oi + 1) + '</div><span>' + a.overused[oi] + '</span></div>';
  }
  html += '</div></div>';

  /* 6. Retail scenario (full width, warm) */
  html += '<div class="yk-bento-retail">';
  html += '<div class="br-header"><div class="br-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div class="br-label">Retail\'de Nas\u0131l G\u00f6r\u00fcn\u00fcr</div></div>';
  html += '<div class="br-text">' + a.retail + '</div>';
  html += '</div>';

  /* 7. Interview card (full width, navy) */
  if (a.interview) {
    html += '<div class="yk-bento-interview">';
    html += '<div class="bi-header"><div class="bi-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><div class="bi-label">M\u00fclakatta Nas\u0131l Anlat\u0131rs\u0131n?</div></div>';
    html += '<div class="bi-text">' + a.interview + '</div>';
    html += '</div>';
  }

  html += '</div>'; /* close .yk-bento */

  /* Navigation */
  var hasPrev = idx > 0;
  var hasNext = idx < comps.length - 1;
  var nextFree = hasNext && canRead(idx + 1);
  var allFreeRead = S.readHistory.length >= FREE_LIMIT;

  html += '<div class="yk-nav">';
  if (hasPrev) {
    html += '<button class="yk-nav-btn" id="yk-read-prev">\u2190 ' + (COMP_NAMES[comps[idx - 1]] || '\u00d6nceki') + '</button>';
  } else {
    html += '<button class="yk-nav-btn" id="yk-back-preview">\u2190 Kapat</button>';
  }
  html += '<div class="yk-nav-spacer"></div>';
  if (hasNext && nextFree) {
    html += '<button class="yk-nav-btn primary" id="yk-read-next">' + (COMP_NAMES[comps[idx + 1]] || 'Sonraki') + ' \u2192</button>';
  } else if (allFreeRead) {
    html += '<button class="yk-nav-btn primary" id="yk-to-complete">Tamamla \u2192</button>';
  } else if (hasNext && !nextFree) {
    html += '<button class="yk-nav-btn primary" id="yk-to-lock">Sonraki</button>';
  }
  html += '</div></div></div>'; /* close .yk-reading-page, .yk-screen */
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

  /* Async DB upgrade — non-blocking, hardcoded data available immediately */
  loadCompetencyDataFromDb();

  var panel = document.getElementById('panel-yetkinlik');
  if (!panel) return;
  /* Safe: only hardcoded constant content is rendered */
  panel.innerHTML = '<div id="yk-container"></div>';
  navigate('intro');
};

/* Bridge: expose data for profil-studio.js */
window._htYetkinlikData = { ANCHORS: ANCHORS, ROLE_COMP_MAP: ROLE_COMP_MAP, COMP_NAMES: COMP_NAMES, COMP_KF: COMP_KF, FREE_LIMIT: FREE_LIMIT };

})();