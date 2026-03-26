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
var ANCHORS={cf:{def:"Güçlü müşteri ilişkileri kurmak ve müşteri odaklı çözümler üretmek.",why:"Herhangi bir kurumda — kâr amacı gütsün ya da gütmesin — en önemli insanlar müşterilerdir. Müşteriler olmadan kurumunuz var olamazdı. Perakendede bazı rollerde müşteriyle temas doğrudan ve anlık; bazı rollerde ise bağlantı daha dolaylıdır. Ama bağlantının dolaylı olması sorumluluktan muaf kılmaz. Kazanan perakende organizasyonları her zaman müşteri odaklı ve duyarlıdır. Başarılı olmak; müşteri ihtiyaçlarına sürekli dikkat etmek, bu ihtiyaçlar değiştikçe uyum sağlamak demektir. İç müşteri de dış müşteri kadar önemlidir — kurum içindeki insanlarla ilgilenilmezse, dışarıda yüksek düzeyde müşteri memnuniyeti yaratmak neredeyse imkânsızdır.",skilled:["Müşterinin söylemediğini de anlar; aktif dinleyerek ve gözlemleyerek ihtiyacı önceden sezinler", "Müşteriye fayda sağlayan fırsatları belirler ve proaktif biçimde değerlendirmek için harekete geçer", "Müşteri beklentilerini karşılayan çözümler geliştirir, sunar ve teslim eder; söylediğini yapar", "Hem dış müşteri hem iç müşteri ile etkili ilişkiler kurar ve bu ilişkileri aktif biçimde sürdürür", "Müşteri geri bildirimlerini düzenli toplar ve iyileştirme süreçlerine yansıtır"],lessskilled:["Müşteri beklentilerinin farkında değildir; ihtiyaç analizi yapmadan varsayımla harekete geçer", "Müşteri ihtiyaçlarını eksik ya da hatalı anlayışla ele alır; yanlış ürün ya da çözüm önerir", "İşi müşteri perspektifinden değil, operasyonel 'prosedür var, uyguluyorum' mantığıyla yürütür", "Önemli müşterilerle etkili ilişkiler kuramaz; işlemi tamamlar ve geçer, ilişkiyi sürdürmez", "Müşteri şikayetleri karşısında savunmaya geçer; çözüm üretmek yerine haklılık arar"],highlyskilled:["Müşterinin henüz dile getirmediği ihtiyaçları öngörür; beklentinin ötesine geçerek sürpriz yaratır", "Müşterilerden öğrendiklerini yeni ürün, hizmet ve süreçlerin geliştirilmesine yön vermek için kullanır", "Kilit müşterilerle kârlı ve uzun vadeli ilişkiler kurar; sıradan hizmet sağlayıcı değil, stratejik iş ortağı gibi davranır"],overused:["Müşteri bilgisini diğer kritik iş öncelikleri üzerinde gereğinden fazla tutar; genel resmi kaçırır", "Müşteriyi memnun etmek uğruna şirket politikalarını aşırı esnetir; yerine getirilemeyen sözler verir", "Müşteriyle fazla yakınlaşır; organizasyonun tutamayacağı vaatler yaparak uzun vadede güven zedeler"],retail:"Bir satış danışmanı, müşterinin baktığı ürüne ilgi göstermediğini fark eder. Ürünü satmaya çalışmak yerine 'Bu tam size göre olmayabilir, ama şunu hiç denediniz mi?' diyerek yönlendirir. Müşteri o ürünü alır, memnun kalır ve üç hafta sonra bir arkadaşını getirerek döner.",interview:"'Bir müşteriyi beklentisinin ötesinde memnun ettiğin somut bir durumu anlat. O anı nasıl fark ettin? Ne yaptın? Müşteri nasıl tepki verdi? O deneyimden ne öğrendin?'"},ce:{def:"Farklı kitlelerin özgün ihtiyaçlarına uygun, çok biçimli ve net iletişim kurmak.",why:"Organizasyonlar, bilgi ve fikirlerin zamanında ve doğru aktığı zaman gelişir. Zayıf iletişim zaman ve kaynak boşa harcar, hedeflere ulaşmayı engeller ve ilişkileri zedeler. Perakendede iletişim her yerde ve her anda vardır: müşteriyle, ekiple, yönetimle, tedarikçiyle. Etkili iletişimciler her bu ortamda kendini ifade edebilen, ton ve dili kitleye göre ayarlayan ve dinlemenin konuşmak kadar önemli olduğunu bilen kişilerdir.",skilled:["Bire bir, küçük gruplar, büyük toplantılar ve farklı hiyerarşik seviyelerde çeşitli ortamlarda etkilidir", "Başkalarını aktif ve dikkatli biçimde dinler; söyleneni değil, söylenmek istenenin özünü anlamaya çalışır", "Mesajını ve üslubunu kitleye, konuya ve bağlama göre ayarlar; müşteriyle farklı, ekiple farklı konuşur", "Organizasyon genelinde ihtiyaç duyulan bilgiyi zamanında ve yardımcı biçimde paylaşır", "Farklı görüş ve fikirlerin açıkça ifade edildiği bir ortam oluşturur ve bunu teşvik eder"],lessskilled:["Yazılı ve sözlü mesajlarda netlikte güçlük çeker; alıcı ne yapması gerektiğini bilemez", "Kitleyi dikkate almadan her zaman aynı tarz ve tonla iletişim kurar; teknik jargon kullanıyor olabilir", "Başkalarının bakış açısını anlamak için zaman ayırmaz; dinler gibi görünür ama cevabını hazırlar", "Başkalarının işi için ihtiyaç duydukları bilgiyi tutarlı biçimde paylaşmaz", "Konuşmalara hâkim olur; sözü başkasına vermez, monolog yapar"],highlyskilled:["Mesajlarını net, sürükleyici ve öz biçimde iletir; dinleyen ne yapacağını tam olarak anlar", "Farklı paydaşların ihtiyaçlarına göre içerik ve iletişim tarzını anlık olarak ayarlar", "Farklı fikirlerin ve bakış açılarının ifade edilmesini hem model olarak gösterir hem aktif teşvik eder"],overused:["Aşırı bilgi paylaşır; önemli mesaj gürültüde kaybolur, ekip 'bilgi fazlalığından' bunalır", "İletişim becerisini gerçeğin ve özün önüne koyabilir; parlak sunum zayıf içeriği gizleyebilir", "Her iletişim parçasını gereğenden fazla zaman harcayarak hazırlar; hız ve pratiklik zarar görür"],retail:"Mağaza müdürü, satış ekibine bir performans düşüşünü aktarmak zorundadır. Savunmacı bir dil kullanmak yerine şunu der: 'Geçen hafta müşteri bekleme sürelerinin uzadığını fark ettim — sizin gözlemlerinize ihtiyacım var.' Suçlamak yerine merak eder, monolog yerine diyalog açar.",interview:"'Karmaşık bir bilgiyi ya da zor bir haberi ekibine veya müşterine iletmen gereken bir durumu anlat. Nasıl hazırlandın? Kitleyi nasıl dikkate aldın? Nasıl bir tepki aldın?'"},it:{def:"Dürüstlük, bütünlük ve özgünlük aracılığıyla başkalarının güvenini kazanmak ve sürdürmek.",why:"Güven, etkili ilişkilerin kalbidir. Güven olduğunda her şey daha kolay akar; insanlar birbirine güvenerek üzerine düşeni yapar, zorlu dönemleri daha sağlıklı atlatır. Güven olmadığında gereksiz sürtüşmeler başlar, performans düşer, şüpheler güçlenir. Perakendede güven üç yönde inşa edilir: müşteriyle, ekip arkadaşlarıyla ve yönetimle. Güven karşılıklılık üzerine kuruludur — almak için vermek zorundasınız.",skilled:["Taahhütlerini takip eder; söylediği şeyi yapar, yapmayacağı şeyi söylemez", "Doğrudan ve dürüsttür; söyledikleri güvenilirdir, abartmaz, gerçekleri çarpıtmaz", "Gizlilikleri korur; öğrendiği kişisel bilgileri ya da hassas konuları ifşa etmez", "Söylediğiyle yaptığı arasında tutarlılık vardır — görünürde bir, arkasında başka davranmaz", "Zor durumlarda bile duruşunu korur; baskı altında değerlerinden taviz vermez"],lessskilled:["Taahhütlerini tutarlı biçimde yerine getirmez; iyi niyetle söz verir ama takip etmez, güven aşınır", "Hata yapıldığında üstlenmez; başkalarını suçlar ya da gerçeği örtbas eder", "Kişisel çıkarı için gerçekleri çarpıtır ya da bilgiyi seçici kullanır", "Farklı insanlara farklı şeyler söyler; tutarsız mesaj güveni sessiz sedasız yok eder", "Sözleri ile eylemleri arasındaki boşluğun farkında değildir ya da önemsemez"],highlyskilled:["Zor bir gerçeği bile rahatsız edici olsa zamanında ve dürüstçe iletir; insanlar tam da bu yüzden ona güvenir", "Kendi hatalarını açıkça kabul eder ve çözüme odaklanır; bu tutum onu ekipte bir referans noktası haline getirir", "Güven inşa etmeye kasıtlı olarak zaman ve çaba yatırır; güvenin kendiliğinden gelmediğini, davranışla inşa edildiğini bilir"],overused:["O kadar doğrudan ve dürüsttür ki duygusal bağlamı göz ardı eder; gerçeği söylerken ilişkiye zarar verir", "Her şeyi kamuoyuna açık hale getirmeye çalışır; bazen stratejik bir gizlilik ve zamanlama da gerektirir", "Başkalarının dürüstlük standardını kendi standardıyla ölçer; bu aşırı yargılayıcı bir tutuma dönüşebilir"],retail:"Kasa görevlisi, müşterinin kasadan sonra fark ettiği bir fiyat hatasını kimse bakmıyor olsa bile hemen düzeltir. Müşteri şaşkınlıkla teşekkür eder. O müşteri bir daha her gittiğinde o kasayı arar. Güven böyle inşa edilir — kimse bakmıyorken doğru olanı yapmakla.",interview:"'Güvenin sınandığı, doğruyu söylemenin riskli ya da rahatsız edici göründüğü bir durumu anlat. Ne yaptın? Neden o kararı aldın? Sonuç ne oldu?'"},co:{def:"Ortak hedeflere ulaşmak için başkalarıyla ortaklık kurmak ve iş birliği içinde çalışmak.",why:"Bugün perakendede değer yaratan hiçbir şey tek başına oluşmuyor. Vitrin düzenlemesinden müşteri hizmetine, stok yönetiminden kampanya uygulamasına kadar her süreç koordineli çalışmayı gerektiriyor. İş birliği sinerji yaratır — bireylerin toplamından büyük sonuçlar üretir. Gerçek iş birliği karşılıklılık gerektirir: açıklık, fikir paylaşımı ve ortak hesap verebilirlik. Perakendede — özellikle sezonluk yoğunluk dönemlerinde — tek kişinin sırtına yüklenemeyecek işleri birlikte taşıma kapasitesi mağazanın başarısını doğrudan belirler.",skilled:["Ortak hedeflere ulaşmak için aktif iş birliği yapar; başkasının işine yardım etmeyi yük saymaz", "Bilgiyi, kaynakları ve başarıyı paylaşır; krediyi biriktirmez, ekiple böler", "Bireysel başarısını ekip başarısıyla dengeler; zaferi kişisel tutmak yerine kollektif kılar", "Departmanlar arası proaktif iletişim kurar; silo duvarlarını kendi yıkar", "Güven inşa eder — yardım teklif ettiğinde samimi olduğu bilinir"],lessskilled:["Kendi işini iyi yapar ama başkasına yardım etmeyi 'fazladan iş' olarak görür; silo çalışır", "Başarıyı paylaşmakta güçlük çeker; krediyi almak ister, vermekte isteksizdir", "Takım kararına katılmasa da görüşünü açıkça söylemez; yüz yüze sessiz kalır, arkasında homurdanır", "Organizasyonun geri kalanından ayrı hareket eder; başkalarının ne yaptığına ilgi göstermez", "Bilgiyi güç olarak görür; paylaşmak yerine biriktirmeyi tercih eder"],highlyskilled:["Farklı güçlü yönlere ve bakış açılarına sahip insanları ortak amaç etrafında birleştirir", "Takım başarısının önündeki engelleri proaktif görür ve müdahale eder; bitmesini beklemez", "Organizasyon genelinde güçlü ilişki ağları kurar; bu ağlar zor dönemde doğal iş birliği kaynağına dönüşür"],overused:["Konsensüs arayışı her kararda gerekli değildir; bazen hızlı ve bağımsız karar almak gerekir", "Her şeyi birlikte yapmaya çalışmak bireysel hesap verebilirliği zayıflatabilir", "İş birliğine o kadar değer verir ki çatışmadan kaçınır; zor gerçekleri söylemek yerine uyum arar"],retail:"Satış ekibinden biri hastalanıyor, sezon açılışının tam ortasında. Diğer ekip üyeleri kendi bölgelerini yönetirken o alanı da sahipleniyorlar. Kimse 'bu benim işim değil' demiyor. Bir haftanın sonunda o kişi iyileştiğinde teşekkür ediyor.",interview:"'Farklı departmanlar ya da ekiplerle birlikte yürüttüğün zorlu bir süreci anlat. İş birliğini nasıl sağladın? Hangi engeller çıktı? Sonuç ne oldu?'"},ao:{def:"Yeni fırsatları ve zorlu durumları yüksek enerji, aciliyet duygusu ve istekle ele almak.",why:"Hızlı değişen perakende ortamında fırsatlar göz kırparak geçer. Harika fikirler, kapsamlı planlar, mükemmel stratejiler — bunların hiçbiri hayata geçirilmeden bir fark yaratmaz. Aksiyona yönelimliler fikirleri planlara, planları gerçeğe dönüştürür. Şeyler zorlaştığında yükselmesini bilirler — 'neden böyle oldu?' sorusunu anında 'bunu nasıl çözebilirim?' sorusuna çevirirler. Mükemmel zamanı beklemek yerine iyi-yeterli bir planla harekete geçerler.",skilled:["Gereksiz planlama beklemeksizin zorluklara anında müdahale eder; 'ne zaman başlayalım?' değil, 'başladım' der", "Yeni fırsatları tanımlar ve yakalar; onay beklemeye gerek duymadan inisiyatif alır", "İyi dönemde de zor dönemde de eşit bir 'yapabilirim' tutumunu korur", "Zor konuları ve rahatsız edici durumları görmezden gelmez; üzerine gider", "Yüksek enerji ve istekle yeni görevler üstlenir; bu heves ekibe de yansır"],lessskilled:["Harekete geçmeden önce fazla onay ve teyit bekler; zaman ve fırsat penceresi kapanır", "Her adımı planlamadan hareket edemez; belirsizlikte felç olur, başlangıç noktasını bekler", "Zor durumlardan ve rahatsız edici konulardan kaçınır; biri zorlamadan adım atmaz", "Başarısızlık korkusu risk almayı engeller; güvenli ve tanıdık suda kalmayı tercih eder", "Sorunla karşılaştığında 'neden böyle oldu?' sorusunda takılır; çözüme geçişi yavaştır"],highlyskilled:["Karmaşık ve belirsiz durumlarda bile harekete geçme güvencesi verir; çevresindekiler de cesaretlenir", "Sınırlı kaynak ve bilgiyle sonuç üretir; mevcut koşullarda çalışır, ideal koşulları beklemez", "Yeni fırsatları başkaları henüz fark etmeden görür ve erkenden pozisyon alır"],overused:["Aşırı hızlı hareket ederek başkalarının görüşünü almadan ilerler; kararlar sahiplenilmez", "Sonuçları yeterince düşünmeden harekete geçer; 'önce yap, sonra düşün' zamanla güven erozyonu yaratır", "Sabırsızlık gösterir; süreç gerektiren durumları erkenden kapatmaya çalışır"],retail:"Cumartesi öğleden sonrası kasa sırası sokağa taştı. Nöbetçi müdür konuşmada, stok sorumlusu depoda. Satış danışmanının iş tanımında 'kasa' yazmıyor. Ama müşterilerin sabrının tükendiğini görüyor — 'yardım edebilirim' diyor ve kasaya geçiyor.",interview:"'Hızlı karar alman ve harekete geçmen gereken, zamanın ya da bilginin yetmediği bir durumu anlat. Nasıl düşündün? Ne yaptın? Sonuç ne oldu?'"},ea:{def:"Kendini ve başkalarını taahhütleri yerine getirme konusunda sorumlu tutmak.",why:"Sorumluluk almak; taahhütlerin sahibi olmak, hesap verebilir olmak ve hem kendi hem de yönetilen kişilerin eylemlerinden sorumlu olmak demektir. Önemli ve biraz korkutucu. Çünkü hesap verebilir olmak sizi görünür kılar ve eleştiriye açar. Ama hesap verebilirliği organizasyonda bir kültür haline getirmenin getirisi büyüktür: güven ve performans artar, çalışanlar yaptıklarının kuruma katkısını hisseder. Perakendede hesap verebilirlik hem sayısal hem davranışsal boyutuyla sürekli gündemdedir.",skilled:["Taahhütlerini takip eder ve başkalarının da aynısını yapmasını sağlar; söylenenler gerçekleşir", "Net bir sahiplik duygusuyla hareket eder — 'bu projenin başarısı da başarısızlığı da benim'", "Kararlarının, eylemlerinin ve başarısızlıklarının kişisel sorumluluğunu üstlenir; dışsal açıklamaya sığınmaz", "Ekibine net sorumluluklar ve süreç takip yöntemleri oluşturur; herkes ne yapacağını bilir", "Sonuçları ölçmek için geri bildirim döngüleri tasarlar; ilerleme izlenir, sürprizler minimize edilir"],lessskilled:["Makul ölçüde kişisel sorumluluk üstlenmez; 'benim de payım var' diyemez", "Nasıl gittiğine dair bilgi toplamaz; son dakika sürprizleriyle karşılaşır", "Yetersiz geribildirim verir; insanlar rotayı nasıl düzelteceğini bilmez", "Sorumluluğu başkalarıyla paylaşmayı tercih eder; net sahipliği yoktur, 'hepimizin' işi olur", "Sorun olduğunda dışsal açıklamalara başvurur: 'piyasa kötüydü', 'stok gelmedi', 'o söylemedi'"],highlyskilled:["Kritik projelerde beklentileri ve başarı kriterlerini net tanımlar; kimse ne istendiğini tahmin etmek zorunda kalmaz", "Hesap verebilirlik kültürünü sistemik hale getirir; kendi davranışı model olur, yazılı kurallar değil", "Ekibindeki başarısızlıkları öğrenme fırsatına çevirir; 'neden başarısız olduk?' yerine 'bir dahaki sefere ne yapacağız?' sorusunu sorar"],overused:["Bireyler üzerinde gereğinden fazla baskı ve denetim yaratır; kontrol dışı faktörleri yeterince dikkate almaz", "Sayısal ölçümlere ve somut verilere aşırı odaklanır; niteliksel gelişimi ve insan boyutunu ikinci plana atar", "Hataya sıfır tolerans tutumu benimseyebilir; bu ekipte risk almaktan kaçınan bir yapı oluşturur"],retail:"Mağaza, iki ay üst üste satış hedefinin altında kaldı. Bölge müdürüyle yapılan toplantıda mağaza müdürü 'Planlamamda bir boşluk oluştu, bunu atlıyorum — bu ay şunu değiştireceğiz ve iki hafta sonra sizi güncelleyeceğim' diyor. Ekip müdürün arkasında duruyor. Üçüncü ayda hedef tutturuluyor.",interview:"'Sorumluluğunu tamamen üstlendiğin ve zorlu koşullara rağmen taahhüdünü yerine getirdiğin bir durumu anlat. Baskı altında nasıl hissettin? Ne yaptın?'"},dr:{def:"Zorlu koşullar altında bile tutarlı biçimde sonuç üretmek.",why:"Sonuç odaklılık; genel bir başarı zihniyetinin, aksiyona yönelimin ve öne çıkma isteğinin bütünleşik halidir. Sonuç odaklı insanlar takımlarına aciliyet duygusu aşılar; organizasyon performansının her zaman akılda olduğu bir kültür oluştururlar. Sonuçlar ölçülebilir olabilir: ciro büyümesi, müşteri memnuniyet skoru, kâr marjı. Ya da niteliksel olabilir: müşteri nezdinde güçlenen marka algısı, ekibi çeken canlı bir çalışma kültürü. Engeller ve aksilikler karşısında pes etmemek, farklı stratejilerle tekrar ve tekrar denemek bu yetkinliğin özüdür.",skilled:["Güçlü bir sonuç ve alt satır odaklılığına sahiptir; rakamları takip eder ve neyin önemli olduğunu bilir", "Engeller ve aksilikler karşısında hedeflere ulaşmayı sürdürür; ilk planı işe yaramadığında alternatif yol bulur", "Hedefleri başarıyla aşma sicili vardır; sadece ulaşmakla kalmaz, geçer", "Kendini ve ekibini sonuç üretimine iter; performansı hem kendinden hem başkalarından bekler", "Her zaman bitişi gözünde tutar; son gün teslimini yakalamak için ekstra çaba gösterir"],lessskilled:["Sonuçlar için itmekten kaçınır; olduğu gibi kabul eder, daha iyisini zorlamaz", "Asgari çabayla idare eder; 'geçti' ile yetinir, 'aştı'ya ulaşmaya çalışmaz", "Tutarsız bir performans sergiler; iyi dönemde çalışır, zor dönemde üretkenliği düşer", "Kolayca pes eder; üçüncü ve dördüncü denemede farklı stratejilerle geri dönmez", "Son tarihleri sık sık kaçırır; engelleri aşmak yerine onları bahane olarak kullanır"],highlyskilled:["İddialı hedefler koyar ve yüksek standartlara sahiptir; ortalama hedefler tatmin etmez", "Tutarlı biçimde en iyi performans gösterenler arasındadır; bir seferlik değil, süregelen mükemmellik", "Zorluklar ve aksilikler karşısında ısrar eder; kriz, stratejik düşünmeyi değil aksiyonu hızlandırır"],overused:["İnsan, ekip, süreç ya da etik boyutlarını yeterince gözetmeksizin her ne pahasına olursa olsun sonuç peşinde koşar", "Son tarih odaklılığı o kadar belirgindir ki teslim gününe yetişmek için kalite ve süreç feda edilir", "Ekip üzerinde aşırı baskı yaratır; yüksek turnover ve tükenmişliğe yol açar"],retail:"Mağaza ayın 15'inde hedefin yüzde on gerisinde. Mağaza müdürü o gün ekibiyle oturuyor: hangi kategoride açık var, müşteri profili bu hafta nasıl değişti, hangi ürünü daha görünür yapabiliriz. Ay sonunda hedef tutturulmuş değil — geçilmiş.",interview:"'Koşulların aleyhine olduğu — kaynak kısıtlı, zaman dar ya da koşullar zorlu — bir dönemde sonucu nasıl tutturduğunu anlat.'"},dw:{def:"Net yön vermek, görevleri delege etmek ve işin tamamlanması önündeki engelleri kaldırmak.",why:"Kendi işini yapmaktan, işi başkaları aracılığıyla yapmaya geçiş — perakende kariyerinin en kritik ve en zorlu dönüşüm noktalarından biridir. Bu dönüşüm zordur çünkü işin doğrudan kontrolünü bırakmayı, daha fazla risk almayı ve başkalarına güvenmeyi gerektirir. Odak, kişisel başarıdan başkalarını güçlendirmeye ve başarılı kılmaya kayar. Perakendede bu geçiş — satış danışmanından kat müdürüne, kat müdüründen mağaza müdürüne — her kariyer adımında yeniden yaşanır.",skilled:["Net sorumluluklar ve hesap verebilirlikler tanımlar; herkes neyin kendisinden beklendiğini bilir", "Görevleri ve kararları doğru kişilere, doğru biçimde delege eder; bottleneck haline gelmez", "İş üzerindeki diyaloğu sürdürerek ilerlemeyi takip eder; son dakika sürprizlerini minimize eder", "İnsanların yeteneklerine ve deneyim düzeylerine göre uygun rehberlik sağlar; herkese aynı biçimde yönetmez", "İşin tamamlanmasının önündeki engelleri proaktif olarak tespit eder ve kaldırır"],lessskilled:["Eksik, belirsiz ya da dağınık talimatlar verir; insanlar ne yapacaklarını tam anlayamaz", "'Bıraksaydın daha iyi yapardım' düşüncesiyle işi delege edemez; her şeyi kendisi yapmaya çalışır", "Yüksek profilli görevleri kendinde tutar; gelişimsel fırsatları ekiple paylaşmaz", "Mikro yönetim yapar; delege eder ama bırakmaz, sürekli kontrol eder ve müdahale eder", "Gerçekçi olmayan ya da çok kolay hedefler koyar; ekibi ne motive eder ne de zorlar"],highlyskilled:["İnsanları görevlere ustaca eşleştirir; kimin hangi işte en iyi sonucu üreteceğini bilir", "Net performans beklentilerini iletir ve tutarlı biçimde takip eder", "İnsanların kapasitelerini geliştirecek görevleri bilinçli delege eder; görev hem iş hem gelişim fırsatıdır"],overused:["Gereğinden fazla yönlendirme yapar; ekip kendi başına karar alamaz, inisiyatif almaktan çekinir", "Başkalarından gerçekçi olmayan beklentiler içindedir; kapasiteyi aşan taleplerle moral bozar", "Sabırsızdır; gelişim için gerekli zaman ve süreçlere tolerans göstermez"],retail:"Yeni mağaza müdürü, kampanya döneminde her şeyi kendisi yapmaya çalışıyor — vitrin, kasa, stok, şikayet. Hiçbirini iyi yapamıyor. Bir ay sonra görevleri net biçimde dağıtıyor. Mağaza daha sakin, daha verimli çalışıyor. Müdür artık yönetiyor — yapan değil, yönlendiren.",interview:"'Bir görevi delege ettiğinde beklediğin sonucu elde edemediğin bir durumu anlat. Nerede hata yaptın? Nasıl müdahale ettin?'"},bt:{def:"Çeşitli beceri ve perspektifleri bir araya getiren, güçlü kimliğe sahip takımlar kurmak.",why:"Harika takımlar nadiren kendiliğinden oluşur. Amaç, görevler, ilişkiler ve süreçlere dikkat edilmesini gerektirir. Perakendede bir mağaza ekibi; farklı deneyim düzeylerinden, farklı kişiliklerden ve farklı kariyer beklentilerinden oluşur. Sezonluk baskı, vardiya çakışmaları, yüksek turnover — bunların hepsi takım dinamiklerini sürekli zorlar. Bu çeşitliliği uyumlu bir güce dönüştürmek — kimliği olan, moralı yüksek, birbirini tamamlayan bir takım kurmak — liderliğin en yüksek ifadesidir.",skilled:["Takımı uygun ve çeşitli stil, bakış açısı ve deneyim kombinasyonuyla oluşturur; benzerler değil, tamamlayanlar bir araya getirir", "Ortak hedefler ve paylaşılan bir zihniyetin temelini atar; ekip ne için var olduğunu bilir", "Aidiyet duygusu ve güçlü ekip morali yaratır; insanlar o takımın parçası olmaktan gurur duyar", "Başarıları paylaşır ve ekip çabalarını ödüllendirir; bireysel başarıyı takım başarısının önüne koymaz", "Takımda açık diyalog ve iş birliği ortamı oluşturur ve besler"],lessskilled:["Takımın amacı ve hedefleri konusunda net değildir; ekip neye doğru çalıştığını bilmez", "Ortak bir zihniyet yaratamaz; bireyler yan yana çalışır ama gerçek bir takım oluşmaz", "Bireysel çabaları takım başarısının önünde tutar ve ödüllendirir; takım kimliği gelişmez", "Görevleri iş birliğini teşvik edecek biçimde dağıtmaz; herkes kendi adasında çalışır", "Takım üyeleri arasındaki çatışmayı fark etmez ya da görmezden gelir; geç müdahale eder"],highlyskilled:["Başarıyı bütün takımın başarısı olarak tanımlar; bireysel parlama değil, kolektif zafer önceliktir", "Her takım üyesinin özgün geçmişini ve bakış açısını değerlendirmenin takım hedeflerine ulaşmak için kritik olduğunu bilir", "Takım üyelerinin kariyer hedeflerini bilir ve bu hedefleri ekip başarısıyla entegre eder"],overused:["Takım kimliğine o kadar odaklanır ki dış bakış açısına kapalı hale gelir; silo oluşturur", "Konsensüs kültürü güçlüdür ama zor kararları almayı geciktirir", "Çatışmadan kaçınır; takım uyumunu korumak adına zor gerçekleri söylemez ya da geç söyler"],retail:"Yeni mağaza müdürü göreve geldiğinde ekip parçalıdır. İlk yaptığı şey ortak hedef: 'Bu ay en yüksek müşteri memnuniyet puanına ulaşalım — bunu birlikte nasıl yaparız?' Ay sonunda puan yükseliyor. Ama daha önemlisi — ekip artık birbirini tanıyor ve güveniyor.",interview:"'Kurduğun ya da dönüştürdüğün bir takımı anlat. Başladığında tablo nasıldı? Neyi değiştirdin? Ve o takımdan bugün hâlâ gurur duyduğun bir şey nedir?'"},dt:{def:"Başkalarını hem kariyer hedeflerine hem organizasyonun hedeflerine ulaşacak biçimde geliştirmek.",why:"İnsanların büyük çoğunluğu büyümek ve gelişmek ister. Organizasyonlar da çalışanlarının rolün ve kurumun değişen yapısına ayak uyduracak biçimde gelişmesine ihtiyaç duyar. Bu süreç üç parçanın bir arada çalışmasını gerektirir: kişinin büyümek için motivasyonu, organizasyonun gelişimi destekleyen yapısı ve sizin geliştirme sorumluluğunu üstlenmek için zaman, ilgi ve çaba harcamanız. Perakendede bu yetkinlik özellikle kritiktir çünkü sektörün en büyük zorluklarından biri turnoverdir. Yetenekli insanları büyütüp elde tutmak hem mağaza performansını hem organizasyonel sürekliliği doğrudan belirler.",skilled:["Başkalarını geliştirmeyi yüksek öncelik olarak görür; operasyonel koşuşturmanın arkasında bırakmaz", "Koçluk, geribildirim, maruziyet ve zorlayıcı görevler aracılığıyla başkalarını aktif olarak geliştirir", "Çalışanların kariyer gelişimi hedeflerini organizasyonun hedefleriyle hizalar; sadece kuruma değil, kişiye de yatırım yapar", "Gelişimsel transferleri ve yan adımları destekler; kariyer her zaman yukarıya gitmek zorunda değildir", "Gerçek gelişim konuşmaları yapar — yalnızca performans değerlendirmesi değil, kariyer diyaloğu kurar"],lessskilled:["Başkalarını geliştirmek için zaman ayırmaz; 'işler yoğun, sonra bakarız' döngüsüne girer", "Gelişim zorunluluklarını en kolay seçenekle geçiştirmek ister — form doldurur, gerçek koçluk yapmaz", "Görünürlüğü paylaşmaktan kaçınır; yüksek profilli görevleri kendinde tutar", "Gelişimsel geribildirim vermekten kaçınır; dönüştürücü konuşmayı sürekli erteler", "Gelişimsel hamle ya da görev tanımlamakta güçlük çeker; insanı şu anki rolünün ötesinde göremez"],highlyskilled:["Yetenek gelişimini organizasyonel bir zorunluluk olarak görür; bu işi 'ekstra' değil, liderliğin özü olarak tanımlar", "Kendi ekibinin dışına bakar; organizasyon genelinde gelişimsel fırsatları fark eder ve insanlarla paylaşır", "Gelişim için kasıtlı olarak gerginlik ve zorluk yaratır; konfor alanının içinde büyüme olmadığını bilir"],overused:["Geliştirmeye o kadar odaklanır ki anlık iş sonuçları geri planda kalabilir; denge kayar", "Herkesin her şeyde gelişmesini bekler; güçlü yönlere odaklanmak yerine her zayıflığı gidermeye çalışır", "Gelişim için sabırsızlanır; öğrenme ve büyüme doğal zamanlarına ihtiyaç duyar"],retail:"Eğitim müdürü, yeni gelen bir satış danışmanının müşteriyle konuşma biçimini fark eder — doğal, güven veren, dinleyen bir iletişim tarzı var. Üç ay içinde o kişiyi müşteri şikayet yönetimi projesine dahil eder. Danışman CV'sinde hiç olmayan bir deneyim kazanır. Altı ay sonra kat müdürü pozisyonu açılır — ilk adaylar listesinin en üstünde o danışman vardır.",interview:"'Ekibindeki birini aktif olarak geliştirdiğin, bu kişinin kariyer yolunu etkilediğin bir süreci anlat. Ne fark ettin? Ne yaptın? Nasıl bir sonuç aldın?'"},de:{def:"İnsanların organizasyonun hedeflerine ulaşmak için ellerinden gelenin en iyisini yapmak üzere motive olduğu bir çalışma iklimi yaratmak.",why:"İnsanlar bağlı olduğunda daha büyük şeyler olur. Bağlı çalışanlar daha üretkendirler — iş davranışları enerjik, odaklı ve organizasyonun ihtiyaçlarıyla daha uyumludur. Elde tutma oranları daha yüksektir. Pek çok araştırma, çalışan bağlılığındaki artışın kârlılık, kalite, verimlilik, müşteri memnuniyeti ve yenilikte iyileşmelere yol açtığını ortaya koymaktadır. Perakendede bağlılık doğrudan müşteri deneyimine yansır. Ama bağlılık tek tipli değildir: birini bağlayan şey diğerini bıktırabilir.",skilled:["İşi insanların hedef ve motivasyonlarına hizalayacak biçimde yapılandırır; anlam ve görevi buluşturur", "Başkalarını güçlendirir; insanların kendi kararlarını alabildiğini ve bu kararların önemli olduğunu hissettirir", "Her kişinin katkısının kuruma değer kattığını somut biçimde gösterir", "Görüş ve fikir paylaşımını davet eder; sahipliği ve görünürlüğü paylaşır", "İnsanların motivasyonları ile organizasyonel hedefler arasında net bir bağlantı gösterir"],lessskilled:["Farklı tercih ve güdülere sahip insanlarla ilişki kurmakta güçlük çeker; herkesi aynı biçimde motive etmeye çalışır", "Başkalarını neyin motive ettiğine dair çok az içgörüsü vardır; motivasyonun kişisel olduğunu fark etmez", "İnsanlara işlerini yapmaları için yeterli esneklik ve özerklik tanımaz; sürekli denetler", "Coşku yaratmak için az çaba sarf eder; ekip yönetimini teknik bir süreç olarak görür", "Sahipliği ve görünürlüğü paylaşmaya isteksizdir; başarı kendisinde kalır"],highlyskilled:["Bireysel motivatörleri derinlemesine anlar ve işi buna göre yönlendirir; herkese özel bir bağlılık yaklaşımı uygular", "Zorlu dönemlerde bile yüksek bağlılık ortamını sürdürür; belirsizlik ve baskı altında bile ekibe ilham verir", "Ekip bağlılığını etkileyen faktörleri ölçer ve bu faktörleri proaktif olarak yönetir"],overused:["Bağlılık yaratmaya o kadar odaklanır ki zor kararları almaktan kaçınır; gerekli ama rahatsız edici adımları erteler", "Bağlılığı performansın önüne koyar; gerçek performans sorunlarını 'motivasyon eksikliği' olarak çerçeveler", "Her kararı konsensüsle almak ister; ekibi dahil etmek güçlendirir ama her konuda onay aramak yavaşlatır"],retail:"Mağaza müdürü, her Pazartesi sabahı 10 dakikalık bir briefing yapıyor. Hedefleri değil, geçen haftadan bir anı paylaşıyor: 'Cuma günü Ayşe, sıradaki müşteriyi bekletmemek için kasaya geçti — kimse sormadı, kendisi gördü ve yaptı. Bu hafta hepimizin aklında olsun.'",interview:"'Ekip bağlılığının düştüğünü fark ettiğin ve durumu tersine çevirmek için harekete geçtiğin bir dönemi anlat. Sinyali nasıl fark ettin? Ne yaptın? Sonuç ne oldu?'"},pa:{def:"İşi organizasyonel hedeflerle uyumlu biçimde planlamak ve önceliklendirmek; taahhütleri karşılamak için doğru sırayla ilerlemek.",why:"İyi bir plan her şeyi kolaylaştırır. İyi planın belirgin işareti ise stratejik önceliklerle hizalanmış olmasıdır. Planlar bir temel oluşturur. Hizalanmış planlar sizi, ekibinizi ve tüm organizasyonu doğru yönde ilerletir. Perakendede planlama yetersizliği direkt zarar üretir: yanlış zamanda yanlış stok, yetersiz personel, çakışan kampanya takvimleri, son dakika vardiya boşlukları. Gün içinde 'itfaiyeci modunda' çalışan lider ile sezonu kontrollü yöneten lider arasındaki en büyük fark burada başlar.",skilled:["Hedefleri geniş organizasyonel hedeflerle uyumlu biçimde belirler; kendi işini büyük resme bağlar", "Hedefleri uygun inisiyatif ve eylem adımlarına kırar; soyut stratejiyi somut görevlere indirger", "Faaliyetleri ilgili kilometre taşları ve takvimlerle birlikte aşamalandırır; ne zaman ne olacağı bellidir", "Etkili acil durum planları geliştirir ve bunları gerektiğinde uygular; 'plan B' hazırdır", "Taahhütleri karşılamak için zaman ve kaynakları dengeli yönetir; son dakika sürprizleri minimumdur"],lessskilled:["Daha büyük önceliklere dikkat etmeksizin anlık ihtiyaçlara takılır; her gün kendi kendine bir acil durum yaşanır", "Zaman ve kaynakları net bir amaç doğrultusunda kullanmaz; emek harcar ama nereye gittiği belirsizdir", "Acil durum planlarının eksikliği nedeniyle sorunlarla hazırlıksız yakalanır", "İlerlemeyi rastgele takip eder ya da hiç takip etmez; nerede olduğunu bilemez", "Plan yapar ama değişime adapte olmakta zorlanır; plan katılaşır"],highlyskilled:["En yüksek önceliklere odaklanır ve daha az kritik görevleri bir kenara bırakabilir; 'hayır' diyebilme gücü vardır", "Kaynakları tam olarak tahsis eden uygulama planları yapar; kim, ne zaman, neyle çalışacak netdir", "Engelleri öngörür ve mükemmel acil durum planları hazırlar; 'ya bu olursa?' sorusunu önceden sorar"],overused:["Planlamaya çok zaman harcar; hazırlık aşaması eyleme geçişi geciktirir", "Planlara ısrarla bağlı kalır; değişen koşullara ve yeni bilgilere uyum sağlamak için yeterli esneklik bırakmaz", "Başkalarına plan yapmaları için gereken özerkliği vermez; her planı kendisi yapmak ister"],retail:"Sezon açılışı iki hafta sonra. Operasyon müdürü tüm değişkenleri tek bir plana döker: ürün teslimat tarihleri, vitrin değişim takvimi, ekstra personel vardiyaları, kampanya başlangıç ve bitiş günleri. Her departmana ne zaman ne yapacağını iletir. Açılış gününde sürpriz yok, her şey yerli yerinde.",interview:"'Karmaşık bir süreci planladığın, birden fazla değişken ve ekibin koordinasyonunu gerektiren bir durumu anlat. Planı nasıl oluşturdun? Beklenmedik bir şey çıktı mı?'"},fa:{def:"Temel finansal göstergeleri anlayıp yorumlamak ve bu anlayışı daha iyi iş kararları almak için kullanmak.",why:"Perakendede finansal okuryazarlık olmadan mağaza yönetmek; gösterge paneline bakmadan araba sürmek gibidir. Ciro tek başına anlamsızdır — brüt kâr marjı, stok devir hızı, kayıp oranı ve personel gideriyle birlikte okunduğunda gerçek tabloyu gösterir. Bu sayıları sadece raporlamak değil, yorumlamak ve eyleme çevirmek finansal okuryazarlığın özüdür. Mağaza müdüründen bölge direktörüne kadar perakende kariyerinde ilerledikçe finansal bakış açısı giderek daha kritik hale gelir.",skilled:["Temel finansal göstergelerin anlamını ve sonuçlarını anlar; rakamlar ona bir şeyler söyler", "Stratejik seçenekler ve fırsatlar üretmek için finansal analizi kullanır", "Niceliksel ve niteliksel bilgiyi bütünleştirir; rakamların arkasındaki hikayeyi okur", "Finansal kararların organizasyonun farklı işlevleri üzerindeki etkisini bağlar; siloda düşünmez", "Bütçe süreçlerine aktif katılım sağlar; rakamları tartışabilir, savunabilir ve sorgulayabilir"],lessskilled:["Finansal terimler ve kavramlarla yeterli aşinalığı yoktur; brüt marjin, stok devir hızı gibi kavramlar belirsizdir", "Farklı iş işlevleri ile genel finansal performans arasındaki neden-sonuç ilişkilerini kavrayamaz", "Sonuç çıkarmada finansal etkiyi göz ardı eder; kararlar finansal boyutuyla değerlendirilmez", "Operasyonel başarıyı kârlılıktan bağımsız düşünür; 'satış iyi gitti' ile 'kâr iyi gitti' aynı şey değildir"],highlyskilled:["Finansal bilgiyi iş istihbarasına dönüştürür; nitel ve nicel bilgiyi analiz ve bütünleştirme yoluyla içgörü üretir", "Performansı ölçmek, trendleri belirlemek ve sonuçları etkileyebilecek stratejiler önermek için temel finansal göstergeleri izler", "Finansal verileri gelecek odaklı karar almada kullanır; geçmişe bakmakla kalmaz, ileriye projeksiyon yapar"],overused:["Finansal göstergeleri tek karar kriteri olarak kullanır; dar finansal sonuçlara odaklanan dengesiz bir organizasyonel performans görüşüne yol açar", "Kısa vadeli finansal kazanımlar için uzun vadeli iş hedeflerini feda edebilir", "İnsan boyutunu — ekip morali, müşteri ilişkisi, kültürel yatırım — sayısal olmadığı için görmezden gelir"],retail:"Mağaza müdürü aylık satış raporunu aldığında sadece ciroya bakmıyor. Brüt kâr marjını, iskonto oranını ve stok devir hızını birlikte okuyor. Satış yüzde sekiz arttı ama kâr marjı düştü — demek ki promosyon fazla agresifti.",interview:"'Finansal bir göstergeyi takip edip buna göre bir karar aldığın ya da harekete geçtiğin somut bir durumu anlat. Hangi veriyi kullandın? Nasıl yorumladın? Sonuç ne oldu?'"},sm:{def:"Gelecekteki olasılıkları öngörebilmek ve bunları atılım yaratan stratejilere dönüştürmek.",why:"Stratejik olmak; geleceğe net niyetler ve amaçlı eylemlerle bakmak, planlamak ve hareket etmektir. Stratejik bir bakış açısı her ikisine de hazır olmayı gerektirir: hem taktiksel bugüne hem uzun vadeli yarına. Perakende sektörü bunu daha da kritik kılar. Kısa vadeli baskılar her zaman var olacak. Ama bu anlık meselelere gömülüp kalmak, organizasyonu uzun vadede rekabetsiz bırakır. Stratejik bakan bir lider; rakiplerin hareketini izler, tüketici davranışlarındaki değişimi okur, hem bugüne hem yarına hazırlanır.",skilled:["Kısa vadeli baskı altında uzun vadeli öneme sahip kararlardan vazgeçmez", "Sektördeki trendleri ve rakip hareketlerini izleyerek kendi stratejisine entegre eder", "Olası gelecek senaryolarını rahatlıkla gündeme taşır; 'ya şu olursa?' sorusunu sormaktan çekinmez", "Sürdürülebilir değer yaratacak olasılıkların güvenilir tablolarını çizer", "Vizyon ile eylem arasındaki net bağlantıyı gösteren rekabetçi stratejiler oluşturur"],lessskilled:["Operasyonel detaylara odaklanır; büyük resmi kaçırır", "Strateji konuşmalarında fikir söylemekte zorlanır; taktik düzeyde kalır", "Değişen koşullara tepkisel davranır; öngörü değil, yangın söndürme", "Rakiplerin ve sektör trendlerinin farkında değildir; içe odaklı kalır"],highlyskilled:["Büyük resmi sürekli görür, gelecek senaryolar üretir ve sürdürülebilir rekabet avantajı yaratan stratejiler oluşturur", "Vizyoner bir yapıya sahiptir; olasılıkların ve ihtimallerin güvenilir ve ilham veren tablolarını söze döker", "Net bir strateji oluşturur ve organizasyonu stratejik hedeflerine açıkça hızlandıracak iddialı adımları belirler"],overused:["Stratejik fikirlere o kadar odaklanır ki günlük operasyonel ihtiyaçları ihmal eder", "Planları aşırı karmaşık hale getirebilir; strateji anlaşılır ve uygulanabilir olmak zorundadır", "Başkalarını geride bırakır; vizyon çok ilerideyse ekip bağlantısını kaybeder"],retail:"Bölge müdürü, bölgesindeki satış rakamları hedefte olsa bile müşteri memnuniyet puanının yavaş yavaş düştüğünü fark ediyor. Bu düşüş 6 ay sonraki müşteri kaybının habercisi. Ekip eğitimine yatırım yapıyor. Üç ay sonra puan yükseliyor. Stratejik bakış budur: bugün hâlâ 'iyi' görünürken yarının sinyalini okumak.",interview:"'Uzun vadeli düşünerek aldığın ve kısa vadede fedakarlık ya da dirençle karşılaştığın bir kararı anlat. Neden o kararı aldın? Başkalarını nasıl ikna ettin?'"},nl:{def:"Yeni sorunlarla başa çıkarken deneyerek aktif öğrenmek; hem başarıları hem başarısızlıkları öğrenme kaynağı olarak kullanmak.",why:"Çoğumuz daha önce gördüğümüz ve yaptığımız şeyleri uygulamakta iyiyiz. Daha nadir bir beceri ise bir şeyi ilk kez yapmaktır. Değişimin hızlanan temposuyla birlikte, yeni çözümler öğrenip uygulamak giderek daha kritik bir beceri haline geliyor. Bu yetkinlik risk almayı, mükemmeliyetçiliği bir kenara bırakmayı ve yeni yollar açmayı gerektiriyor. Perakendede yeni ürün kategorileri, değişen müşteri alışkanlıkları, dijital satış kanalları, yeni POS sistemleri — bunların hepsi hızlı öğrenmeyi zorunlu kılar.",skilled:["Yeni durumlarla karşılaştığında hızla öğrenir; adaptasyon sürecini kısaltır ve uygulamaya hızlı geçer", "Doğru çözümü bulmak için denemeler yapar; deneysellik bir tehdit değil, araçtır", "Tanıdık olmayan görevlerin zorluğunu kucaklar; yeni alan onu rahatsız etmez, meraklandırır", "Başarısızlıklardan ve hatalardan dersler çıkarır; aynı hatayı tekrarlamamak için analiz yapar", "Geçmiş deneyimlerden öğrendiklerini yeni ve farklı bağlamlara esnek biçimde uygular"],lessskilled:["Yeni durumlarda öğrenmekte güçlük çeker; tanıdık olmayan görevler önünde sıkışır", "Denenip sınanmamış çözümlere şans vermekten kaçınır; bilinen yolda kalmayı tercih eder", "Sorunları yalnızca geçmişte işe yarayan yöntemlerle çözer; bağlam değişse bile formül değişmez", "Risk almaz; mükemmeliyetçilik ya da hata korkusu hareketi engeller", "Hatayı öğrenme kaynağı değil, utanç kaynağı olarak görür; tekrar denemekten çekinir"],highlyskilled:["Doğru çözümü bulmak için birden fazla yöntem kullanarak defalarca deneme yapar; bırakmaz", "Hataları öğrenme fırsatı olarak görür; veri kaynağı olarak sahiplenir", "Tanıdık olmayan görevlerin zorluğundan keyif alır; bilinmezlik onu durdurmaz, tetikler"],overused:["Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz yere bozar; odak ve öncelik kaybolur", "Henüz kanıtlanmamış fikirlere yalnızca yeni oldukları için odaklanır", "Öğrenme adına gereksiz riskler alır; deneysellik ile sorumsuzluk arasındaki sınır bulanıklaşır"],retail:"Mağazaya yeni bir dijital ödeme sistemi geliyor. Eğitim günü bir hafta sonra. Hızlı öğrenen satış danışmanı beklemiyor — sistemi kendi başına kurcalıyor, temel işlemleri öğreniyor. Eğitim günü geldiğinde sorularla geliyor, herkesten hızlı kavrıyor.",interview:"'Daha önce hiç yapmadığın bir şeyi öğrenmek zorunda kaldığın bir durumu anlat. Nasıl yaklaştın? Hangi engelleri yaşadın? Sonuç ne oldu?'"},br:{def:"Zorlu durumlarla karşılaşıldığında aksiliklerden ve sıkıntılardan sıyrılmak; güçlenerek devam etmek.",why:"Aksilikler çoğunlukla kaçınılmazdır. Özellikle bugünün talep yoğun ve zaman zaman dalgalı çalışma ortamında olası tuzaklar her yerdedir. En dayanıklı insanlar bile aksilikler yaşar. Fark, bu aksiliklere nasıl yanıt verdiklerinde yatar. Öngörürler. Doğrudan karşılarına çıkarlar. Dayanma kapasitesine sahiptirler. Perakendede her gün beklenmedik bir şey olur: müşteri şikayeti, stok krizi, personel yokluğu, satış baskısı. Dayanıklı olanlar aynı koşulları yaşar — ama geri dönerler.",skilled:["Baskı altında kendinden emin ve kararlı kalır; stres performansını düşürmez", "Krizleri etkili biçimde yönetir; panik yerine netliği tercih eder", "Olumsuz koşullara rağmen olumlu bir tutum ve ileriye dönük bir bakış açısını sürdürür", "Aksiliklerden toparlanır; önceki performans, güven ve tatmin düzeyine hızla geri döner", "Zorluklardan ve olumsuz deneyimlerden büyür; şikayet yerine öğrenme alışkanlığı geliştirir"],lessskilled:["Yüksek baskılı durumlarda kolayca sarsılır; sakinliğini ve netliğini kaybeder", "Stres ve kaygı dönemlerinde düşük enerji ve motivasyon sergiler; verimlilik düşer", "Eleştiri ya da engellerle karşılaşınca savunmaya geçer; sorunu çözmek yerine kendini savunur", "Aksiliklerden toparlanmak fazla zaman alır; etkisi günler ya da haftalar boyunca sürer", "Değişken ortamlarda anksiyete yaşar; değişimle stresi birbiriyle karıştırır"],highlyskilled:["Stresli durumlarda odaklı ve dengeli kalır; sakinliğini yalnızca kendisi için değil, çevresi için de sürdürür", "Başarısızlıktan sistematik biçimde öğrenir; analiz eder, neyi değiştireceğini netleştirir", "Dayanıklılığı kasıtlı olarak inşa eder; stres yönetimi ve yeniden şarj etme alışkanlıkları geliştirir"],overused:["O kadar dayanıklıdır ki gerçekten ciddi sorunlara 'bu da geçer' diyerek geç müdahale eder", "Strese katlanma kapasitesi yüksek ama bu kapasitenin sınırlarını görmez; destek istemekte güçlük çeker", "Zorlu durumların etkisini ya da ciddiyetini küçümser; başkalarının yaşadığı güçlüğü kavrayamaz"],retail:"Cumartesi, yoğun sezon, bir satış danışmanı art arda dört zor müşteriyle karşılaşıyor. Öğle arasında 10 dakika gerçek bir mola veriyor. Öğleden sonra aynı enerjiyle geri dönüyor. Akşam eve yorgun gidiyor ama öfkeli değil. Tükenmişliği günün içinde taşımıyor.",interview:"'Gerçekten zorlandığın bir dönemi anlat — hem profesyonel hem kişisel baskının aynı anda geldiği bir zaman. O dönemde nasıl hissettin? Nasıl baş ettin? O deneyim seni nasıl değiştirdi?'"},is:{def:"Çeşitli insan gruplarıyla açık ve rahat biçimde ilişki kurabilmek.",why:"İlişki yönetimi, organizasyonlarda işlerin yürütülmesinin ayrılmaz bir parçasıdır. Her türlü insanla geçinmenin anahtarı, önce kişisel tepkileri geri çekmek ve önce karşındakine odaklanmaktır. Perakendede bu yetkinlik hem müşteriyle hem ekiple hem de yönetimle sürekli devrededir. En iyi ilişki yöneticileri bu farkları otomatik okur — bir müşteriyle, bir kat müdürüyle, bir bölge direktörüyle eşit rahatlıkta konuşabilirler.",skilled:["Kademeler, fonksiyonlar, kültürler ve coğrafyalar genelinde insanlarla rahatça ilişki kurar; herkesle ortak dil bulur", "Diplomasi ve incelikle hareket eder; hassas konularda bile ilişkiyi koruyarak ilerler", "Açık, sıcak ve kabul edici bir biçimde bağ inşa eder; karşısındaki kendini görülmüş hisseder", "Kendine benzeyen ve benzemeyen insanlarla yapıcı ilişkiler kurar; farklılık engel değil, zenginliktir", "Kişilerarası ve grup dinamiklerini okur; odada ne döndüğünü fark eder"],lessskilled:["Az sayıda ilişki kurar; öncelikle kendi çalışma alanındaki insanlarla etkileşime girer", "Kendinden farklı insanlarla etkileşime geçerken rahatsızlık hisseder; çeşitlilik stres vericidir", "Fikirlerini küçük düşürücü ya da duyarsız biçimde ifade eder; taktik ve diplomasi eksiktir", "Başkalarının ihtiyaçlarına karşı az ilgi gösterir; kendi gündemini öne çıkarır", "Eleştiri karşısında savunmaya geçer; ilişkiyi zedeleyecek tepkiler verir"],highlyskilled:["Çok çeşitli insanlarla proaktif biçimde ilişki geliştirir; ağını bilinçli ve geniş tutar", "Zor ya da gergin durumlarda bile anlık bağ kurar; baskı altında ilişki yönetimi becerisi azalmaz", "Birlikte çalışması güç kişilerle bile üretken ve saygılı bir ilişki sürdürür"],overused:["Herkes tarafından sevilmek ister; bu net sınır koymayı ve zor mesajları iletmeyi zorlaştırır", "Aşırı uyum sağlama eğilimi özgün duruşu ve bakış açısını gizleyebilir", "Çatışmayı yönetmek yerine kaçınır; uyumu korumak adına gerçeği söylemez"],retail:"Kıdemli satış danışmanı, aynı vardiyada iki çok farklı müşteriyle karşılaşıyor: biri deneyimli ve aceleci bir üst düzey yönetici, diğeri mağazaya ilk kez giren genç bir müşteri. Danışman ikisine de aynı içtenlikle ama tamamen farklı bir yaklaşımla hizmet veriyor.",interview:"'Başlangıçta zorlandığın ama zamanla üretken ve güçlü bir ilişkiye dönüştürdüğün bir kişiyle deneyimini anlat. Neden zordu? Ne yaptın? Ne öğrendin?'"},mc:{def:"Çatışma durumlarını gürültüyü asgari düzeyde tutarak etkili biçimde yönetmek.",why:"Çatışma, organizasyonların doğal bir parçasıdır. Organizasyonlar farklı görüşlere ve rekabet eden çıkarlara sahip çeşitli insanlardan oluşur. Kötü yönetilen çatışma tutumları pekiştirir, üretkenliği bozar ve ilişkileri zedeler. Ama çatışma her zaman kötü bir şey değildir. Çatışma daha önce tartışılamayan konuları yüzeye çıkarır. İyi yönetilen çatışma; daha iyi alternatifler ve hatta atılım noktaları bulmak için bir forum sağlar. Perakendede çatışma hem müşteri-personel hem de personel arası boyutta sürekli gündemdedir.",skilled:["Çatışmalara fırsat olarak bakar; kaçınmak yerine üzerine gider ve ele alır", "Zor anlaşmaları çözer ve anlaşmazlıkları adil biçimde yönetir; her iki taraf da dinlendiğini hisseder", "Farklı görüşleri bütünleştirerek ve ortak zemin bularak atılım noktaları yaratır", "Farklılıkları üretken biçimde ve gürültüyü minimumda tutarak yönetir; gerilim büyümeden çözülür", "Çatışmanın altındaki gerçek sorunu tespit eder; belirtiye değil, kök nedene odaklanır"],lessskilled:["Çatışmadan kaçınır; gerilimi görmezden gelir ya da kendiliğinden çözümlenmesini bekler", "Anlaşmazlıkları çözerken ilerleme kaydeder güçlük çeker; konuşma yeniden başladığı yerden devam eder", "Konuları tam anlamadan taraf tutar; yüzeysel okuma yapar, derine inmez", "Çatışmaların organizasyonda büyük aksaklıklara yol açmasına izin verir; erken müdahale etmez", "İnsanları savunmaya sokar; diyalog açmak yerine baskı uygular"],highlyskilled:["Kişilerarası ve grup dinamikleri bilgisine dayanarak çatışmaları olmadan önce öngörür; proaktif müdahale eder", "Soru sorar ve paydaşlar tarafından ortaya konan tüm meseleleri yakından dinler; her tarafın duyulduğunu hissettirmek için çaba gösterir", "Ortak zemin bulur ve konsensüse ulaşmak için yönlendirir; yüksek gerginlikli durumları etkili biçimde yatıştırır"],overused:["Başkalarının meselelerine karışıyormuş gibi görülebilir; her çatışmaya müdahil olmak güven sınırlarını zorlar", "Tartışmaya çok heveslidir; her farklı görüşü derinleştirilmesi gereken bir çatışma olarak ele alır", "Taraflar hazır olmadan çözüme iter; zamanlamanın da yönetilmesi gerektiğini unutur"],retail:"İki satış danışmanı, popüler bir ürünü kimin müşterisine sunduğu konusunda gerilim yaşıyor. Kat müdürü bunu fark eder ve aynı gün ikisiyle ayrı ayrı görüşüyor. Sonra ikisini birlikte oturtuyor: 'Amacımız müşterinin memnun ayrılması — bunu nasıl birlikte yapabiliriz?' Net bir alan paylaşım kuralı ortaya çıkıyor.",interview:"'Ekip içinde ya da müşteriyle ciddi bir çatışma yaşandığı ve doğrudan müdahale etmek zorunda kaldığın bir durumu anlat. Süreci nasıl yönettin? Zorlandığın an hangisiydi? Sonuç ne oldu?'"},ci:{def:"Organizasyonun başarılı olması için yeni ve daha iyi yollar yaratmak.",why:"Organizasyonlar sürekli değişen rekabet ortamında hayatta kalmak ve gelişmek için yeniliğe ihtiyaç duyar. Perakendede yenilik hayatta kalmanın koşuludur. Müşteri beklentileri yükseliyor, rekabet kızışıyor, alışveriş davranışları dönüşüyor. Vitrin düzeni, müşteri yolculuğu tasarımı, personel eğitim yöntemleri — bunların hepsi 'hep böyle yapıldı' kalıplarının dışına çıkmayı bekliyor. Doğası gereği yaratıcı olmayan biri bile bu yetkinliği geliştirebilir: merak etmeyi ve sormayı öğrenmek, kalıpların dışına çıkmak için bilinçli alan açmak.",skilled:["Yeni, daha iyi ya da özgün olan kullanışlı fikirler üretir; sıradan çözümlerde kalmaz", "Sorunlara bakmanın yeni yollarını gündeme taşır; mevcut çerçevenin dışından bakar", "Yaratıcı bir fikri alır ve pratiğe geçirebilir; hayal gücüyle uygulama kapasitesini birleştirir", "Yeniliği teşvik etmek için çeşitli düşünceleri cesaretlendirir; başkalarının farklı düşünmesine alan açar", "Statükoya sorular sorar; 'neden böyle?' ve 'daha iyi nasıl?' sorularını rutin gündeme taşır"],lessskilled:["Yeni bakış açılarıyla denemeler yapmak yerine konfor alanında kalmayı tercih eder", "Geçmişten gelen olağan, alışılmış ve bilinen fikirler sunar; yenilik boyutu eksiktir", "Başkalarının özgün fikirlerini eleştirmeye meyillidir; yeni fikirlerin ilk eleştirmeni olur", "Bir tarzı vardır ki başkalarının yaratıcı girişimlerini caydırır; 'olmaz' refleksi çabuktur"],highlyskilled:["Geleneksel yapma biçimlerinin ötesine geçer; statükoyu sorgular ve zorlar", "Yenilikçi bir fikrin pazar potansiyelini sürekli değerlendirir; hayal ile gerçeklik arasındaki mesafeyi ölçer", "En iyi fikirleri organize eder ve hayata geçirilene kadar takip eder; sadece üretmekle kalmaz, tamamlar"],overused:["Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz yere bozar; istikrar ve tutarlılık zarar görür", "Henüz kanıtlanmamış fikirlere peşi sıra gider; odak ve öncelik kaybolur", "Altta yatan sorunları görmezden gelerek yeniliklere atlamaya hazırdır; kökteki sorunu çözme disiplini eksik"],retail:"VM koordinatörü, yeni sezonda müşteri akış verilerine bakıyor. Soldan giren müşterilerin sağ vitrini neredeyse hiç görmediğini fark ediyor. Standart uygulama 'her zaman böyle yapılır' diyor, ama o farklı bir yerleşim öneriyor. İki haftanın sonunda sağ vitrin ürünlerine yüzde yirmi daha fazla ilgi var.",interview:"'Mevcut bir süreci, ürünü ya da deneyimi geliştirmek ya da değiştirmek için öncülük ettiğin bir durumu anlat. Fikri nereden buldun? Nasıl hayata geçirdin? Karşılaştığın dirençler nelerdi? Sonuç ne oldu?'"},pe:{def:"Başkalarının desteğini ve bağlılığını kazanmak için ikna edici argümanlar kullanmak.",why:"İşler ilişkiler aracılığıyla yürütülür. Bazen başkalarını bakış açılarını değiştirmeye ve harekete geçmeye ikna etmeden şeyleri gerçekleştirmek mümkün olmaz. Etkili ikna; mesajın ustaca iletilmesini ve kitleye uygun biçimde ayarlanmasını gerektirir. Perakendede ikna etme her düzeyde devrededir: satış danışmanı müşteriye doğru ürünü sunarken, mağaza müdürü bölge müdürüne yeni bir uygulama önerisini savunurken — hepsi ikna becerisini kullanmaktadır.",skilled:["Destek kazanmak için görüş ve argümanlarını kitleye uygun biçimde konumlandırır; tek tip sunmaz", "Başkalarını harekete geçmeye ikna eder; fikri onaylatan değil, eylemi başlatan", "Zor durumlarda ustaca müzakere eder; çıkmaz sokaklarda yol bulur", "İlişkilere zarar vermeksizin tavizler elde eder; kazan-kazan zemini arar", "Başkalarının tepkilerine ve tutumlarına etkili biçimde yanıt verir; savunmaya geçmez, diyalog açar"],lessskilled:["Kendi bakış açısını çok güçlü biçimde dayatır; karşısındaki direnç geliştirmeye başlar", "Başkalarından destek ya da bağlılık kazanamaz; fikir kabul görmeden ölür", "Herkesi tatmin edecek çözümler müzakere edemez; ya olduğu gibi kabul eder ya da çatışır", "Başkalarının tutum ve tepkilerine olumsuz biçimde yanıt verir; itiraz geldiğinde kaybeder", "Kendi pozisyonunu destekleyen mantıklı bir argüman oluşturmakta güçlük çeker"],highlyskilled:["Başkalarından bağlılık kazanan ikna edici biçimde fikirlerini paylaşır; dinleyen sadece anlamakla kalmaz, sahiplenir", "Ustaca müzakere eder ve mutabık kalınan çözüme doğru ilerlerken minimal gürültü yaratır", "Birden fazla paydaşın ihtiyaçlarını karşılayan ortak zemin ve kabul edilebilir alternatifler bulur"],overused:["Sürekli ikna etmeye çalışmak yorgunluğa yol açar; insanlar her konuşmasının bir 'satış' olduğunu hisseder", "Dinlemek yerine konuşmayı tercih eder; ikna etmek isterken aslında başkasını sessize alır", "Aşırı ısrarcı olur; 'hayır' cevabını kabul etmekte güçlük çeker ve ilişkiyi zorlar"],retail:"Mağaza müdürü, mağazanın arka alanının müşteri girişine dönüştürülmesini bölge müdürüne öneriyor. Bölge müdürü başlangıçta kuşkulu. Müdür müşteri trafik verisini sunuyor, iki benzer mağazadaki uygulamadan örnekler gösteriyor, altı ayda geri dönen bir maliyet projeksiyonu çiziyor. Onay geliyor.",interview:"'Zor ya da dirençli birini ya da grubu ikna etmek zorunda kaldığın bir durumu anlat. Nasıl hazırlandın? Hangi argümanları kullandın? Direnç geldiğinde ne yaptın? Sonuç ne oldu?'"},ts:{def:"İş büyütmeye yönelik dijital ve teknoloji uygulamalarındaki yenilikleri öngörmek ve benimsemek.",why:"Teknoloji, imkânsız görüneni olağan hale getirdi. Bozucu teknolojiler inanılmaz bir hızla pazara giriyor. Dijital yetkinlik artık 'sahip olmak güzel' değil — 'olmazsa olmaz' kategorisindedir. Perakendede teknoloji dönüşümü somut ve hızlıdır: POS sistemleri, mobil ödeme, e-ticaret entegrasyonu, müşteri verisi analitik araçları, omnichannel sipariş yönetimi — bunların hepsi gündelik gerçektir. Teknolojiye direnen ya da yavaş adapte olan çalışanlar hem müşteri deneyimini zedeler hem kariyer fırsatlarını kaçırır.",skilled:["Ortaya çıkan teknolojilerin etkisini öngörür ve gerekli uyarlamaları yapar; değişim onu hazırlıksız yakalamaz", "İş ya da kişisel performansa fayda sağlayabilecek yeni teknik beceriler ve yetenekler için çevresini tarar", "Düşük etkili ya da moda teknolojileri reddeder; her yeniliğe kapılmaz, seçici değerlendirme yapar", "Yeni teknolojileri hazır bir şekilde öğrenir ve benimser; adaptasyon süreci kısadır"],lessskilled:["Temel teknoloji araçlarında deneyimsizdir ya da mevcut uygulamalara o kadar bağlıdır ki yeni teknolojileri benimsemekte isteksizdir", "İş değeri katabilecek yeni ya da yenilikçi teknolojileri aramaz; fırsatları kaçırır", "Teknoloji değişimini tehdit olarak görür, kolaylaştırıcı olarak değil; direnç gösterir", "Sadece bildiği araçları kullanır; öğrenme döngüsünü başlatmakta güçlük çeker"],highlyskilled:["Teknoloji atılımları için çevresini sürekli tarar; erken benimseyenler arasındadır", "Kurumsal sonuçları geliştiren mevcut ve yeni teknolojileri hem dener hem uygular", "Başkalarının yeni teknolojileri öğrenmesini ve benimsemesini teşvik eder; dijital dönüşümde lokomotif işlevi görür"],overused:["Her yeni teknolojiyi denemek ister; odak ve öncelik kaybolur, organizasyon 'teknoloji yorgunluğu' yaşar", "Teknoloji çözümüne o kadar odaklanır ki insani boyutu ve süreç gerçekliğini göz ardı eder", "Teknolojik yeniliği amacın önüne koyar; 'neden?' sorusunu sormadan 'nasıl?' sorusuna atlar"],retail:"Mağazaya yeni bir müşteri sadakat uygulaması geliyor. Çoğu çalışan 'bir süre sonra öğrenirim' diyor. Bir satış danışmanı ise o gün akşam uygulamayı kendi telefonuna indiriyor, müşteri gözünden deneyimliyor ve ertesi gün müşterilere nasıl kullanacaklarını anlatıyor.",interview:"'Yeni bir teknoloji, sistem ya da dijital araç öğrenmek zorunda kaldığın bir durumu anlat. Nasıl başladın? Hangi zorluklarla karşılaştın? Bu öğrenme süreci işine nasıl katkı sağladı?'"},dq:{def:"Organizasyonun ilerlemesini sağlayacak iyi ve zamanında kararlar almak.",why:"İyi karar almak zorlu olabilir: kısa zaman çerçeveleri, sınırlı bilgi, zor ödünleşimler karşısında cevap bekleyen sabırsız insanlar. İyi kararlar analiz, bilgelik, deneyim ve yargının karışımına dayanır. Sorun şu ki insanlar karar almada pek de iyi değildir — yargı yapma yeteneklerini abartma ve sonuçları tahmin etmede aşırı özgüvenli olma eğilimi taşırlar. Perakendede karar kalitesi hem anlık hem stratejik boyutuyla sürekli gündemdedir. Mağaza müdürü gün içinde onlarca operasyonel karar alır — çoğu eksik bilgiyle.",skilled:["Eksik bilgi karşısında bile sağlam kararlar alır; belirsizlik felç etmez", "Karar alırken analiz, bilgelik, deneyim ve yargının karışımına başvurur; tek kaynağa bağlı kalmaz", "İlgili tüm faktörleri değerlendirir ve uygun karar alma kriterlerini ve ilkelerini kullanır", "Hızlı bir %80 çözümün yeterli olacağını ne zaman fark eder; mükemmeli, iyinin düşmanı yapmaz"],lessskilled:["Kararlara gelişigüzel yaklaşır ya da karar almayı geciktirir; 'biraz daha bekleyelim' döngüsüne girer", "Eksik veri ya da hatalı varsayımlara dayanarak kararlar alır", "Farklı bakış açılarını görmezden gelir ya da uzun vadeli hedefler pahasına kısa vadeli sonuçlara odaklanır", "Sonuçları yeterince değerlendirmez; karar alırken 'peki sonra ne olur?' sorusu sorulmaz"],highlyskilled:["Eksik bilgiye ya da belirsizliğe rağmen kararlı biçimde yüksek kaliteli kararlar alır", "Zamanında ve iyi bilgilendirilmiş kararlar almak için ilgili kaynaklardan aktif olarak görüş alır", "Görüşleri olgulardan ustalıkla ayırır; neyin veri, neyin yorum, neyin önyargı olduğunu fark eder"],overused:["Deneyim ve sezginin yeterli olacağı durumlarda bile aşırı titiz ya da metodolojik bir karar süreci uygular", "Kararları o kadar çok analiz eder ki zaman ve momentum kaybedilir; analiz felci yaşanır", "Her kararda konsensüs arar; bazı durumlar hızlı ve bağımsız karar gerektirir"],retail:"Sezonun en yoğun haftasında iki mağazanın aynı anda personel açığı var. Bölge müdürü fazla analiz yapmak yerine şunu soruyor: 'Hangi mağazada müşteri trafiği daha yüksek bu hafta? Hangisinde deneyimli personel var ki kısa süre desteksiz çalışabilsin?' İki soruyla yeterli bilgiye ulaşıyor.",interview:"'Eksik bilgiyle ya da baskı altında önemli bir karar almak zorunda kaldığın bir durumu anlat. Nasıl düşündün? Hangi faktörleri değerlendirdin? Sonuç ne oldu?'"},op:{def:"İşleri tamamlamanın en etkili ve verimli yollarını bilmek; sürekli iyileştirme odağıyla çalışmak.",why:"Harika süreçler işi basitleştirir. İletişimi akıcı hale getirir. Maliyetleri düşürür ve verimliliği artırır. Rasyonalize edilmiş süreçler; kalite, müşteri memnuniyeti, satış ve kârlılık üzerinde iyileşmeler sağlar. Perakendede süreç optimizasyonu; stok alım akışından müşteri iade sürecine, vardiya devir tesliminden kasa kapanış prosedürlerine kadar uzanır. Verimsiz bir süreç sessizce büyük maliyetler üretir: zaman kaybı, hata, müşteri hayal kırıklığı ve personel yorgunluğu. Süreci göremeyen lider, fırsatı göremeyen liderdir.",skilled:["İşi tamamlamak için gerekli süreçleri tanımlar ve oluşturur; belirsizlik içinde çalışmaz", "Faaliyetleri verimli iş akışlarına göre ayırır ve birleştirir; hangi adımın nereye gittiğini bilir", "Uzaktan yönetimi mümkün kılan süreç ve prosedürler tasarlar; her şeyi kendisi kontrol etmek zorunda kalmaz", "Küçük ince ayarlardan tam yeniden mühendisliğe kadar süreçleri iyileştirmenin yollarını arar"],lessskilled:["Dağınık bir şekilde çalışır; işleri örgütlemekte güçlük çeker", "İyileştirmeye odaklanmaz; 'hep böyle yapıldı' anlayışıyla yetinir", "Şeyleri sistemler açısından düşünmez; bir değişikliğin diğer adımları nasıl etkilediğini görmez", "İşleri tamamlamak için etkili ve verimli süreçleri bulmakta güçlük çeker", "Mevcut süreçleri olduğu gibi kabul eder; süreç iyileştirmesine çok az dikkat eder"],highlyskilled:["En kritik süreçlere odaklanır, daha az önemli görevleri bir kenara bırakabilir; öncelik sezgisi güçlüdür", "Kaynakları tam olarak tahsis eden uygulama planları hazırlar", "Engelleri öngörür ve mükemmel acil durum planları hazırlar; 'bu adım bozulursa ne olur?' sorusu sürekli gündemdedir"],overused:["Sürece o kadar odaklanır ki insanı ve esnekliği gözden kaçırır; her durum bir prosedür haline gelir", "Küçük sorunları büyük ve resmi süreç güncellemeleriyle çözer; orantısız tepki verir", "Değişmeyen bir süreç takıntısıyla koşulların gerektirdiği anlık adaptasyona direnç gösterir"],retail:"Stok sorumlusu, ürünlerin raftan çekildikten sonra sisteme girilmesinin bazen bir-iki gün geciktiğini fark ediyor. Satış danışmanları stokta olmayan ürünü satıyor, müşteri hayal kırıklığı yaşıyor, iadeler artıyor. Sorunu rapor etmek yerine süreci değiştiriyor: çekimler gerçek zamanlı sisteme giriyor. İki hafta içinde iade yüzde kırk düşüyor.",interview:"'Verimsiz bir süreci fark edip iyileştirdiğin bir durumu anlat. Sorunu nasıl tespit ettin? Ne değiştirdin? Hangi dirençle karşılaştın? Sonuç ne oldu?'"},bs:{def:"Birden fazla paydaşın ihtiyaçlarını öngörmek ve dengelemek.",why:"Bir paydaş, meşru bir iddiaya ya da 'paya' sahip olan kişi ya da gruptur. Değer yaratan herhangi bir şeyi gerçekleştirmek artık tek başına bir iş değildir. Paydaşlar herhangi bir strateji, girişim veya projenin başarısı için kritiktir. Savunucunuz olabileceği gibi kolayca engelleyicinize de dönüşebilirler. Perakendede üst seviyeli rollerde paydaş çeşitliliği belirginleşir. Bölge müdürü; merkez, mağaza müdürleri, tedarikçiler, müşteriler ve İK ekibi gibi birbirinden farklı önceliklere sahip grupları aynı anda yönetmek zorundadır.",skilled:["İç ve dış paydaşların gereksinimlerini, beklentilerini ve ihtiyaçlarını anlar; kimsenin ne istediğini bilir", "Birden fazla paydaşın çıkarlarını dengeler; tek taraflı karar vermez", "Karar alma sürecinde kültürel ve etik faktörleri göz önünde bulundurur", "Paydaş taleplerinin çatıştığı durumlarda adil davranır; basınç altında denge korunur"],lessskilled:["Sınırlı sayıda paydaşın mevcut beklentilerini karşılamaya odaklanır; görünür olanı görür, arka planda bekleyeni görmez", "Bazı paydaşların çıkarlarını diğerlerinden daha güçlü biçimde gözetir; örtük bir hiyerarşi oluşturur", "Çatışan paydaş taleplerinin eylemlerini adaletsiz biçimde etkilemesine izin verir", "Paydaş haritasını çıkarmaz; kimin neye ihtiyacı olduğunu sistematik biçimde düşünmez"],highlyskilled:["Tüm paydaşların örgütsel hedeflere ve kendi beklentilerine ulaşması için iletişim süreçlerini korur", "Güvenilirliğini ve itibarını korumak için tüm paydaşlarla tutarlı bir yaklaşım ve takip sağlar", "İhtiyaçları çatışan paydaşlar arasında güven inşa eder ve sürdürür; tarafsızlığı için saygı görür"],overused:["Herkesi memnun etmeye çalışırken hiç kimseyi gerçekten tatmin etmez; net duruş bulanıklaşır", "Konsensüs aramak bazı durumlarda karar hızını ve netliğini zayıflatır", "Denge kaygısıyla kendi görüşünü ve yargısını sürekli arka plana iter; liderlik inisiyatifi kaybolur"],retail:"Bölge direktörü, üç mağazanın vardiya planlamasını değiştirmek istiyor. Merkez maliyet azaltması istiyor, mağaza müdürleri operasyonel etki konusunda endişeli, çalışanlar iş güvencesinden kaygılı. Direktör her grupla ayrı ayrı konuşuyor. Herkes her istediğini almıyor — ama herkes duyulduğunu hissediyor.",interview:"'Farklı çıkarlara sahip birden fazla paydaşı aynı anda yönetmek zorunda kaldığın bir durumu anlat. Çatışan beklentileri nasıl dengeledi? Sonuç ne oldu?'"},at:{def:"Mevcut ve gelecekteki iş ihtiyaçlarını karşılayacak en iyi yetenekleri çekmek ve seçmek.",why:"Organizasyonlar yetenekle dolu olması gerekir. Pek çok organizasyon için bu, organizasyonel performansın tek en büyük sürücüsüdür. Doğru kişiler, doğru becerilerle, doğru yerde ve doğru zamanda olduğunda hedeflere ulaşmak çok daha kolaydır. Perakendede yetenek çekme hem acil hem stratejik bir zorunluluktur. Sektörün en büyük zorluklarından biri olan yüksek turnover, yetenekli insanları tanımlama ve çekme kapasitesini sürekli sınayıcı kılar.",skilled:["Çeşitli ve yüksek kalibreli yetenekleri çeker ve seçer; benzerlikten değil, tamamlayıcılıktan hareketle karar alır", "Grubun ihtiyaçlarını karşılayacak doğru yeteneği bulur; neyin eksik olduğunu bilir", "Yetenek boşluklarını iç ve dış adayların doğru dengesiyle kapatır; tek kanala bağımlı kalmaz", "Yeteneği değerlendirmede güçlü bir yargı kapasitesine sahiptir; potansiyeli performanstan önce görür", "İşe alım kararlarını kurumun değerleri ve uzun vadeli hedefleriyle hizalar"],lessskilled:["Şirketin neye ihtiyaç duyduğunu anlamaz; yetenek boşluklarının farkında değildir", "Organizasyona gelişigüzel yetenek seçer; değerlendirme kriteri belirsiz ya da tutarsızdır", "Rolü ya da organizasyonu doldurmak için yetenekle eşleştirme konusunda çok az adım atar", "İşe alım ya da kadrolama için seçim kriterleri konusunda belirsizdir", "Gelişmemiş sezgiye aşırı güvenir; yapılandırılmış değerlendirme yerine 'içgüdü' ile karar alır"],highlyskilled:["Çeşitli kanallar aracılığıyla aktif olarak yetenek arar; pozisyon açılmadan önce havuz oluşturur", "Yetenekleri değerlendirmede güçlü ve özgün bir bakış açısı geliştirir; derinlikli gözlemle karar alır", "İşe alım kararlarını yalnızca mevcut rolün değil, geleceğin gereksinimlerine göre alır"],overused:["İşe alıma o kadar odaklanır ki mevcut ekibi geliştirmeyi göz ardı eder", "Değerlendirme kriterlerine aşırı bağlılık, iyi adayların kaçırılmasına yol açar", "Her pozisyon için 'en iyisini' ararken gereğinden uzun süre bekler; pratiklik ve zamanlamanın değerini küçümser"],retail:"Bölge İK iş ortağı, mağaza müdür pozisyonu için iki aday değerlendiriyor. Birincisi CV'si mükemmel, deneyimi zengin. İkincisi daha az deneyimli ama müşteri odaklılık ve ekip motivasyonu konusundaki yanıtları çok güçlü. İK iş ortağı ikinci adayı tercih ediyor: 'Bu mağazanın şu an ihtiyacı olan şey deneyim değil, ekip dinamiğini dönüştürecek biri.'",interview:"'İşe aldığın ya da seçtiğin ve zamanla gerçekten doğru tercih olduğunu kanıtlayan biriyle deneyimini anlat. Onu seçerken neyi gördün? O deneyim yetenek değerlendirme anlayışını nasıl şekillendirdi?'"},bi:{def:"İş dünyası ve pazar hakkındaki bilgiyi organizasyonun hedeflerini ilerletmek için uygulamak.",why:"Alanı tanımak zorundasınuz. Olan biteni bilmek, güvenilirlik geliştirmenin temel taşıdır. İnsanların iki yol üzerinden içgörü geliştirmesi gerekir. Birincisi kendi sektörlerine dikkat etmeleri, kendi fonksiyonel alanlarında uzmanlık inşa etmeleri, organizasyonlarındaki departmanların nasıl çalıştığını anlamaları gerekir. İkincisi dışarıya bakmak. Rekabeti ve müşterileri öğrenmek. Trendleri belirlemek. Perakendede iş anlayışı; sektörün dinamiklerini, rakiplerin stratejilerini, müşteri davranış değişimlerini anlayabilmektir.",skilled:["İşlerin nasıl yürüdüğünü ve organizasyonların nasıl para kazandığını bilir; iş modelini içselleştirmiştir", "Organizasyondaki, rekabetteki ve pazardaki mevcut ve olası gelecek politikaları, uygulamaları ve trendleri takip eder", "Stratejilerin ve taktiklerin pazarda nasıl işlediğine dair iş sürücüleri bilgisini eylemlere rehberlik etmek için kullanır", "Kendi sektörünün ve organizasyonunun güçlü ve zayıf yönlerini, fırsatlarını ve tehditlerini anlayarak çalışır"],lessskilled:["İşlerin nasıl yürüdüğünü anlamaz; temel iş kavramları belirsizdir", "Organizasyonu ve rekabeti etkileyen mevcut ve gelecek trendlerle güncel değildir", "Stratejilerin ve taktiklerin pazarda nasıl işlediğinden habersizdir; kararlar bağlam olmadan alınır", "Planlama ve yürütmesinde iş sürücülerini dikkate almaz; operasyonel düşünce stratejik boyutu gölgeler"],highlyskilled:["İşlerin nasıl yürüdüğünü ve nasıl para kazanıldığını derinlemesine anlar", "Organizasyondaki, rekabetteki ve pazardaki olası gelecek politikaları ve trendleri ilk fark edenler arasındadır", "Eylemleri önceliklendirirken tutarlı biçimde iş sürücüleri ve pazar odaklı bir bakış açısı uygular"],overused:["İş bilgisini kısa vadeli finansal kazanımlar için kullanır; uzun vadeli değer yaratmayı göz ardı eder", "Sektör uzmanlığına o kadar güvenir ki dışarıdan gelen yeni fikirlere kapalı hale gelir", "'İş böyle işler' bilgisi konformizme dönüşür; statükoyu sorgulamak yerine meşrulaştırır"],retail:"Mağaza müdürü, kasım ayının sonunda rakip mağazanın Aralık kampanyasını erkenden ilan ettiğini fark ediyor. Bunu sadece not etmekle kalmıyor — kendi mağazası için ne anlama geldiğini analiz ediyor, bölge müdürüne proaktif bir not gönderiyor ve kendi Aralık taktiğini bir hafta öne çekiyor.",interview:"'Sektörü ya da pazarı yakından takip ederek bir fırsatı ya da tehdidi erken fark ettiğin ve buna göre harekete geçtiğin bir durumu anlat. Sinyali nasıl gördün? Ne yaptın? Sonuç ne oldu?'"},cu:{def:"Zorlu durumlarda bile doğru olanı söylemek ve yapmak için adım atmak; belirsizlik ve baskı altında ilkelerinden taviz vermemek.",why:"Cesaret; korku yokluğu değil, korku olmasına rağmen hareket etmektir. Organizasyonlarda gerçek cesaret; zor gerçekleri söylemek, olumsuz geri bildirimi vermek, popüler olmayan ama doğru olan kararları almak ve sistemin baskısı altında ilkelerden taviz vermemek biçiminde tezahür eder. Cesaret olmadan bilgi gizlenir, kritik geribildirim verilmez, kötü kararlar sorgulanmaz ve organizasyon yavaş yavaş kör noktalarla dolar. Perakendede bölge ve üzeri seviyelerde cesaret, liderliğin en belirleyici boyutlarından biridir.",skilled:["Durumun gerektirdiği zor adımları atar; gerginlik veya belirsizlik karşısında hareketsiz kalmaz", "Zor, dolaylı ya da nahoş mesajları doğrudan iletir; gerçekten kaçınmaz", "Yüksek baskı altında bile net duruş sergiler; koşullara göre yön değiştirmez", "Zor kararları almak için gerekli cesareti gösterir; popülerlik değil, doğruluk rehber olur", "Etik dışı ya da değerlere aykırı durumlara karşı açıkça durur"],lessskilled:["Zor mesajları iletmekten kaçınır; çatışmayı görmezden gelmeyi ya da kendiliğinden düzeleceğini ummayı tercih eder", "Yüksek baskı altında tutumunu değiştirir; güçlü bir sesle yönlendirilebilir", "Kendi görüşünü söylemek yerine odadaki hâkim görüşe uyum sağlar; gerçek düşüncesini saklar", "Eleştiriyle ya da olumsuz tepkiyle karşılaşabileceği durumlarda önerisini geri çeker"],highlyskilled:["Direniş ya da eleştiriyle karşılaşsa bile doğru olduğuna inandığı şeyi savunur; ısrar eder", "Başkalarının zorlu konuşmalar yapmasına ve zor adımlar atmasına model olur; organizasyonda cesaret kültürü yaratır", "Organizasyonun kör noktalarını cesaretle dile getirir; kimsenin söylemek istemediğini söyler"],overused:["O kadar doğrudan ve cesurdur ki başkalarının bakış açısını yeterince dinlemez; baskın duruş diyaloğun önüne geçer", "'Ben haklıyım' kesinliği esnek düşünme kapasitesini daralır", "Diplomatik hassasiyeti ihmal eder; doğruyu söylemek ilişkiyi zorunlu olmadan zedeler"],retail:"Bölge direktörü, merkez tarafından önerilen bir mağaza kapanma kararının bölge için yanlış olduğuna inanıyor. Kapsamlı bir analiz hazırlıyor ve üst yönetime sunuyor: 'Bu karar kısa vadede maliyet azaltır ama bölgenin uzun vadeli büyüme kapasitesini zedeler.' Karar değişebilir de değişmeyebilir de. Ama söylenmesi gereken söylenmiştir.",interview:"'Popüler ya da kolay olmayan ama doğru olduğuna inandığın bir şeyi savunduğun bir durumu anlat. Karşılaştığın baskı ya da direnç neydi? Sonuç ne oldu?'"},cx:{def:"Çelişkili ve eksik bilgiden bile anlamlı anlayış üretmek; karmaşık sorunları etkili biçimde çözmek.",why:"Organizasyonlar giderek daha karmaşık hale geliyor. Veri bolluğu, çakışan öncelikler, belirsiz nedensellik ilişkileri ve hızla değişen koşullar — bunların tümü liderlik kararlarının arka planını oluşturuyor. Karmaşıklıkla yüzleşmek; elinizdeki tüm bilgiyi toplamak, çelişkili sinyalleri okumak, neyin önemli neyin gürültü olduğunu ayırt etmek ve tüm bunların ortasında net bir anlayışa ulaşmak demektir. Bölge düzeyinde ve üzerinde perakende yöneticileri onlarca mağaza, yüzlerce çalışan, farklı pazar koşulları ve çakışan iş öncelikleriyle aynı anda başa çıkmak zorundadır.",skilled:["Belirsiz, çelişkili ve eksik bilgiden bile anlamlı içgörü çıkarır; sinyali gürültüden ayırır", "Karmaşık sorunları sistematik biçimde ele alır; parçaları görür, bütünü kaybetmez", "Çok sayıda değişkeni ve perspektifi göz önünde bulundururken pratik kararlar alır", "Karmaşık durumları başkalarına anlaşılır biçimde açıklar; netlik yaratır, karmaşıklığı büyütmez", "Belirsizlik içinde çalışır; tüm bilgi gelene kadar beklemez"],lessskilled:["Birden fazla boyutu olan sorunları ele almakta güçlük çeker", "Bilgi belirsiz ya da eksikken karar almaktan kaçınır; netlik gelmesini bekler", "Bütünü görmek yerine parçalara takılır; sistemik düşünme eksiktir", "Karmaşıklığı daha da karmaşık hale getirir; netlik üretmek yerine belirsizliği artırır"],highlyskilled:["Geniş bir bağlamsal analiz yapar; çok sayıda faktörü ve bakış açısını göz önünde bulundururken pratik kararlar alabilir", "Yüksek belirsizlik ortamında bile net bir anlayışa ulaşır; belirsizlik onun için sorun değil, çalışma ortamıdır", "Karmaşıklığı yönetmekle kalmaz, başkalarına da bu ortamda nasıl hareket edileceğini öğretir"],overused:["Her soruna karmaşıklık gözüyle bakar; basit sorunları gereksiz yere derinleştirir", "Kapsamlı analiz arayışı karar hızını yavaşlatır; bazen hızlı ve yeterli bir yanıt, mükemmel ama geç bir yanıttan çok daha değerlidir", "Başkalarını karmaşıklığın içine çeker; yönetmek yerine karmaşıklığa ortak eder"],retail:"Bölge direktörü, üç mağazanın aynı anda performans sorununu raporluyor. İlk bakışta benzer görünüyor — satışlar düşük. Ama direktör her mağazanın verisini derinlemesine inceliyor: biri personel sorunuyla, biri lokasyon değişikliğinin etkisiyle, biri fiyatlandırma stratejisiyle boğuşuyor. Üçü için tek bir çözüm üretmek yerine üç farklı müdahale planlıyor.",interview:"'Birden fazla değişken ve belirsizlik içeren karmaşık bir sorunu çözmek zorunda kaldığın bir durumu anlat. Soruna nasıl yaklaştın? Kararı nasıl aldın? Sonuç ne oldu?'"},sa:{def:"İletişim tarzını, yaklaşımını ve çalışma biçimini koşullara ve kişilere göre aktif olarak uyarlamak.",why:"Her durum farklı bir yanıt gerektirir. Her insan farklı bir dil ister. Uyum sağlama yetkinliği; durumu doğru okumak, bu okumayla ne yapılması gerektiğini anlamak ve davranışı buna göre ayarlamaktır. Bu; karizmasız olmak ya da karaktersiz olmak değildir — tam tersine, yeterince özgüvenli olmak ki her durumda doğru olanı yapabilmek. Perakendede uyum sağlama günlük gerçektir. Sabahın ilk müşterisi aceleci ve bilgili, öğleden sonraki müşteri isteksiz ve kararsız. Durumu okuyup yanıtı ayarlayan kişi hem daha etkili hem daha güvenilir hem de daha sürdürülebilir bir performans sergiler.",skilled:["Durumu ve kitleyi aktif olarak okur; aynı anda hem içeriği hem bağlamı değerlendirir", "Tarzını ve yaklaşımını koşullara göre ayarlar; her duruma aynı tepkiyle girmez", "Değişen önceliklere, koşullara ve insanlara uyarlanabilir; esneklik bir güçtür", "Farklı bireylerin ihtiyaçlarını ve motivasyonlarını okur; herkese 'özel' hissettiren bir etkileşim kurar", "Beklenmedik değişiklikler karşısında sakinliğini ve etkinliğini korur"],lessskilled:["Her duruma aynı yaklaşımla girer; durum, kişi ya da bağlam fark etmeksizin tek bir tarz kullanır", "Koşullar değiştiğinde hızla adapte olmakta güçlük çeker; değişime geç tepki verir", "Farklı kişilerin ihtiyaçlarını ve motivasyonlarını okumaz; 'herkes benim gibi düşünür' varsayımıyla hareket eder", "Beklenmedik durumlar karşısında sarsılır; plan bozulunca etkinliği düşer"],highlyskilled:["Durumu gerçek zamanlı okur ve yaklaşımını anlık olarak ayarlar; geri bildirim döngüsü çok kısadır", "Çok farklı bağlamlarda eşit etkinlikte çalışır; hem rutin hem kriz hem de büyüme ortamlarında verimli", "Başkalarının da uyum kapasitesini geliştirmesine yardımcı olur; esnekliği örnek olarak gösterir"],overused:["Aşırı uyum sağlama tutarsız görünebilir; insanlar 'bu kişinin gerçek tutumu ne?' diye merak eder", "Her koşula adapte olma girişimi otantiklik kaybına yol açabilir; kimlik ve duruş bulanıklaşır", "Bazı durumlar tutarlılık ve öngörülebilirlik gerektirir; uyum sağlamak her zaman cevap değildir"],retail:"Kat müdürü, yeni işe giren bir satış danışmanına sabırlı rehberlik sunuyor — sorularını karşılıyor, adım adım açıklıyor. Aynı gün kıdemli bir danışmanla konuşurken tonu ve üslubu tamamen değişiyor — eşit saygıyla, daha az açıklama yaparak, daha fazla soru sorarak.",interview:"'Alışılageldik yaklaşımının işe yaramadığını fark ettiğin ve tarzını ya da stratejini ortada değiştirmek zorunda kaldığın bir durumu anlat. Ne fark ettin? Ne değiştirdin? Sonuç ne oldu?'"}};


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

/* Bridge: expose data for profil-mulakatkocu.js */
window._htYetkinlikData = { ANCHORS: ANCHORS, ROLE_COMP_MAP: ROLE_COMP_MAP, COMP_NAMES: COMP_NAMES, COMP_KF: COMP_KF, FREE_LIMIT: FREE_LIMIT };

})();