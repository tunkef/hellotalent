-- Migration 042a: Seed competency reference data
-- Auto-generated from profil-yetkinlik.js ANCHORS + ROLE_COMP_MAP
-- Run AFTER 042_competency_tables.sql

-- ═══ competency_definitions (29 rows) ═══

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('cf', 'Müşteri Odaklılık', 'Customer Focus', 'A',
  'Güçlü müşteri ilişkileri kurmak ve müşteri odaklı çözümler üretmek.',
  'Herhangi bir kurumda — kâr amacı gütsün ya da gütmesin — en önemli insanlar müşterilerdir. Müşteriler olmadan kurumunuz var olamazdı. Perakendede bazı rollerde müşteriyle temas doğrudan ve anlık; bazı rollerde ise bağlantı daha dolaylıdır. Ama bağlantının dolaylı olması sorumluluktan muaf kılmaz. Kazanan perakende organizasyonları her zaman müşteri odaklı ve duyarlıdır. Başarılı olmak; müşteri ihtiyaçlarına sürekli dikkat etmek, bu ihtiyaçlar değiştikçe uyum sağlamak demektir. İç müşteri de dış müşteri kadar önemlidir — kurum içindeki insanlarla ilgilenilmezse, dışarıda yüksek düzeyde müşteri memnuniyeti yaratmak neredeyse imkânsızdır.',
  ARRAY['Müşterinin söylemediğini de anlar; aktif dinleyerek ve gözlemleyerek ihtiyacı önceden sezinler','Müşteriye fayda sağlayan fırsatları belirler ve proaktif biçimde değerlendirmek için harekete geçer','Müşteri beklentilerini karşılayan çözümler geliştirir, sunar ve teslim eder; söylediğini yapar','Hem dış müşteri hem iç müşteri ile etkili ilişkiler kurar ve bu ilişkileri aktif biçimde sürdürür','Müşteri geri bildirimlerini düzenli toplar ve iyileştirme süreçlerine yansıtır'],
  ARRAY['Müşteri beklentilerinin farkında değildir; ihtiyaç analizi yapmadan varsayımla harekete geçer','Müşteri ihtiyaçlarını eksik ya da hatalı anlayışla ele alır; yanlış ürün ya da çözüm önerir','İşi müşteri perspektifinden değil, operasyonel ''prosedür var, uyguluyorum'' mantığıyla yürütür','Önemli müşterilerle etkili ilişkiler kuramaz; işlemi tamamlar ve geçer, ilişkiyi sürdürmez','Müşteri şikayetleri karşısında savunmaya geçer; çözüm üretmek yerine haklılık arar'],
  ARRAY['Müşterinin henüz dile getirmediği ihtiyaçları öngörür; beklentinin ötesine geçerek sürpriz yaratır','Müşterilerden öğrendiklerini yeni ürün, hizmet ve süreçlerin geliştirilmesine yön vermek için kullanır','Kilit müşterilerle kârlı ve uzun vadeli ilişkiler kurar; sıradan hizmet sağlayıcı değil, stratejik iş ortağı gibi davranır'],
  ARRAY['Müşteri bilgisini diğer kritik iş öncelikleri üzerinde gereğinden fazla tutar; genel resmi kaçırır','Müşteriyi memnun etmek uğruna şirket politikalarını aşırı esnetir; yerine getirilemeyen sözler verir','Müşteriyle fazla yakınlaşır; organizasyonun tutamayacağı vaatler yaparak uzun vadede güven zedeler'],
  'Bir satış danışmanı, müşterinin baktığı ürüne ilgi göstermediğini fark eder. Ürünü satmaya çalışmak yerine ''Bu tam size göre olmayabilir, ama şunu hiç denediniz mi?'' diyerek yönlendirir. Müşteri o ürünü alır, memnun kalır ve üç hafta sonra bir arkadaşını getirerek döner.',
  '''Bir müşteriyi beklentisinin ötesinde memnun ettiğin somut bir durumu anlat. O anı nasıl fark ettin? Ne yaptın? Müşteri nasıl tepki verdi? O deneyimden ne öğrendin?''',
  0)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('ce', 'Etkili İletişim', 'Communicates Effectively', 'A',
  'Farklı kitlelerin özgün ihtiyaçlarına uygun, çok biçimli ve net iletişim kurmak.',
  'Organizasyonlar, bilgi ve fikirlerin zamanında ve doğru aktığı zaman gelişir. Zayıf iletişim zaman ve kaynak boşa harcar, hedeflere ulaşmayı engeller ve ilişkileri zedeler. Perakendede iletişim her yerde ve her anda vardır: müşteriyle, ekiple, yönetimle, tedarikçiyle. Etkili iletişimciler her bu ortamda kendini ifade edebilen, ton ve dili kitleye göre ayarlayan ve dinlemenin konuşmak kadar önemli olduğunu bilen kişilerdir.',
  ARRAY['Bire bir, küçük gruplar, büyük toplantılar ve farklı hiyerarşik seviyelerde çeşitli ortamlarda etkilidir','Başkalarını aktif ve dikkatli biçimde dinler; söyleneni değil, söylenmek istenenin özünü anlamaya çalışır','Mesajını ve üslubunu kitleye, konuya ve bağlama göre ayarlar; müşteriyle farklı, ekiple farklı konuşur','Organizasyon genelinde ihtiyaç duyulan bilgiyi zamanında ve yardımcı biçimde paylaşır','Farklı görüş ve fikirlerin açıkça ifade edildiği bir ortam oluşturur ve bunu teşvik eder'],
  ARRAY['Yazılı ve sözlü mesajlarda netlikte güçlük çeker; alıcı ne yapması gerektiğini bilemez','Kitleyi dikkate almadan her zaman aynı tarz ve tonla iletişim kurar; teknik jargon kullanıyor olabilir','Başkalarının bakış açısını anlamak için zaman ayırmaz; dinler gibi görünür ama cevabını hazırlar','Başkalarının işi için ihtiyaç duydukları bilgiyi tutarlı biçimde paylaşmaz','Konuşmalara hâkim olur; sözü başkasına vermez, monolog yapar'],
  ARRAY['Mesajlarını net, sürükleyici ve öz biçimde iletir; dinleyen ne yapacağını tam olarak anlar','Farklı paydaşların ihtiyaçlarına göre içerik ve iletişim tarzını anlık olarak ayarlar','Farklı fikirlerin ve bakış açılarının ifade edilmesini hem model olarak gösterir hem aktif teşvik eder'],
  ARRAY['Aşırı bilgi paylaşır; önemli mesaj gürültüde kaybolur, ekip ''bilgi fazlalığından'' bunalır','İletişim becerisini gerçeğin ve özün önüne koyabilir; parlak sunum zayıf içeriği gizleyebilir','Her iletişim parçasını gereğenden fazla zaman harcayarak hazırlar; hız ve pratiklik zarar görür'],
  'Mağaza müdürü, satış ekibine bir performans düşüşünü aktarmak zorundadır. Savunmacı bir dil kullanmak yerine şunu der: ''Geçen hafta müşteri bekleme sürelerinin uzadığını fark ettim — sizin gözlemlerinize ihtiyacım var.'' Suçlamak yerine merak eder, monolog yerine diyalog açar.',
  '''Karmaşık bir bilgiyi ya da zor bir haberi ekibine veya müşterine iletmen gereken bir durumu anlat. Nasıl hazırlandın? Kitleyi nasıl dikkate aldın? Nasıl bir tepki aldın?''',
  1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('it', 'Güven Oluşturma', 'Instills Trust', 'A',
  'Dürüstlük, bütünlük ve özgünlük aracılığıyla başkalarının güvenini kazanmak ve sürdürmek.',
  'Güven, etkili ilişkilerin kalbidir. Güven olduğunda her şey daha kolay akar; insanlar birbirine güvenerek üzerine düşeni yapar, zorlu dönemleri daha sağlıklı atlatır. Güven olmadığında gereksiz sürtüşmeler başlar, performans düşer, şüpheler güçlenir. Perakendede güven üç yönde inşa edilir: müşteriyle, ekip arkadaşlarıyla ve yönetimle. Güven karşılıklılık üzerine kuruludur — almak için vermek zorundasınız.',
  ARRAY['Taahhütlerini takip eder; söylediği şeyi yapar, yapmayacağı şeyi söylemez','Doğrudan ve dürüsttür; söyledikleri güvenilirdir, abartmaz, gerçekleri çarpıtmaz','Gizlilikleri korur; öğrendiği kişisel bilgileri ya da hassas konuları ifşa etmez','Söylediğiyle yaptığı arasında tutarlılık vardır — görünürde bir, arkasında başka davranmaz','Zor durumlarda bile duruşunu korur; baskı altında değerlerinden taviz vermez'],
  ARRAY['Taahhütlerini tutarlı biçimde yerine getirmez; iyi niyetle söz verir ama takip etmez, güven aşınır','Hata yapıldığında üstlenmez; başkalarını suçlar ya da gerçeği örtbas eder','Kişisel çıkarı için gerçekleri çarpıtır ya da bilgiyi seçici kullanır','Farklı insanlara farklı şeyler söyler; tutarsız mesaj güveni sessiz sedasız yok eder','Sözleri ile eylemleri arasındaki boşluğun farkında değildir ya da önemsemez'],
  ARRAY['Zor bir gerçeği bile rahatsız edici olsa zamanında ve dürüstçe iletir; insanlar tam da bu yüzden ona güvenir','Kendi hatalarını açıkça kabul eder ve çözüme odaklanır; bu tutum onu ekipte bir referans noktası haline getirir','Güven inşa etmeye kasıtlı olarak zaman ve çaba yatırır; güvenin kendiliğinden gelmediğini, davranışla inşa edildiğini bilir'],
  ARRAY['O kadar doğrudan ve dürüsttür ki duygusal bağlamı göz ardı eder; gerçeği söylerken ilişkiye zarar verir','Her şeyi kamuoyuna açık hale getirmeye çalışır; bazen stratejik bir gizlilik ve zamanlama da gerektirir','Başkalarının dürüstlük standardını kendi standardıyla ölçer; bu aşırı yargılayıcı bir tutuma dönüşebilir'],
  'Kasa görevlisi, müşterinin kasadan sonra fark ettiği bir fiyat hatasını kimse bakmıyor olsa bile hemen düzeltir. Müşteri şaşkınlıkla teşekkür eder. O müşteri bir daha her gittiğinde o kasayı arar. Güven böyle inşa edilir — kimse bakmıyorken doğru olanı yapmakla.',
  '''Güvenin sınandığı, doğruyu söylemenin riskli ya da rahatsız edici göründüğü bir durumu anlat. Ne yaptın? Neden o kararı aldın? Sonuç ne oldu?''',
  2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('co', 'Takım Çalışması', 'Collaborates', 'A',
  'Ortak hedeflere ulaşmak için başkalarıyla ortaklık kurmak ve iş birliği içinde çalışmak.',
  'Bugün perakendede değer yaratan hiçbir şey tek başına oluşmuyor. Vitrin düzenlemesinden müşteri hizmetine, stok yönetiminden kampanya uygulamasına kadar her süreç koordineli çalışmayı gerektiriyor. İş birliği sinerji yaratır — bireylerin toplamından büyük sonuçlar üretir. Gerçek iş birliği karşılıklılık gerektirir: açıklık, fikir paylaşımı ve ortak hesap verebilirlik. Perakendede — özellikle sezonluk yoğunluk dönemlerinde — tek kişinin sırtına yüklenemeyecek işleri birlikte taşıma kapasitesi mağazanın başarısını doğrudan belirler.',
  ARRAY['Ortak hedeflere ulaşmak için aktif iş birliği yapar; başkasının işine yardım etmeyi yük saymaz','Bilgiyi, kaynakları ve başarıyı paylaşır; krediyi biriktirmez, ekiple böler','Bireysel başarısını ekip başarısıyla dengeler; zaferi kişisel tutmak yerine kollektif kılar','Departmanlar arası proaktif iletişim kurar; silo duvarlarını kendi yıkar','Güven inşa eder — yardım teklif ettiğinde samimi olduğu bilinir'],
  ARRAY['Kendi işini iyi yapar ama başkasına yardım etmeyi ''fazladan iş'' olarak görür; silo çalışır','Başarıyı paylaşmakta güçlük çeker; krediyi almak ister, vermekte isteksizdir','Takım kararına katılmasa da görüşünü açıkça söylemez; yüz yüze sessiz kalır, arkasında homurdanır','Organizasyonun geri kalanından ayrı hareket eder; başkalarının ne yaptığına ilgi göstermez','Bilgiyi güç olarak görür; paylaşmak yerine biriktirmeyi tercih eder'],
  ARRAY['Farklı güçlü yönlere ve bakış açılarına sahip insanları ortak amaç etrafında birleştirir','Takım başarısının önündeki engelleri proaktif görür ve müdahale eder; bitmesini beklemez','Organizasyon genelinde güçlü ilişki ağları kurar; bu ağlar zor dönemde doğal iş birliği kaynağına dönüşür'],
  ARRAY['Konsensüs arayışı her kararda gerekli değildir; bazen hızlı ve bağımsız karar almak gerekir','Her şeyi birlikte yapmaya çalışmak bireysel hesap verebilirliği zayıflatabilir','İş birliğine o kadar değer verir ki çatışmadan kaçınır; zor gerçekleri söylemek yerine uyum arar'],
  'Satış ekibinden biri hastalanıyor, sezon açılışının tam ortasında. Diğer ekip üyeleri kendi bölgelerini yönetirken o alanı da sahipleniyorlar. Kimse ''bu benim işim değil'' demiyor. Bir haftanın sonunda o kişi iyileştiğinde teşekkür ediyor.',
  '''Farklı departmanlar ya da ekiplerle birlikte yürüttüğün zorlu bir süreci anlat. İş birliğini nasıl sağladın? Hangi engeller çıktı? Sonuç ne oldu?''',
  3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('ao', 'Aksiyona Yönelim', 'Action Oriented', 'A',
  'Yeni fırsatları ve zorlu durumları yüksek enerji, aciliyet duygusu ve istekle ele almak.',
  'Hızlı değişen perakende ortamında fırsatlar göz kırparak geçer. Harika fikirler, kapsamlı planlar, mükemmel stratejiler — bunların hiçbiri hayata geçirilmeden bir fark yaratmaz. Aksiyona yönelimliler fikirleri planlara, planları gerçeğe dönüştürür. Şeyler zorlaştığında yükselmesini bilirler — ''neden böyle oldu?'' sorusunu anında ''bunu nasıl çözebilirim?'' sorusuna çevirirler. Mükemmel zamanı beklemek yerine iyi-yeterli bir planla harekete geçerler.',
  ARRAY['Gereksiz planlama beklemeksizin zorluklara anında müdahale eder; ''ne zaman başlayalım?'' değil, ''başladım'' der','Yeni fırsatları tanımlar ve yakalar; onay beklemeye gerek duymadan inisiyatif alır','İyi dönemde de zor dönemde de eşit bir ''yapabilirim'' tutumunu korur','Zor konuları ve rahatsız edici durumları görmezden gelmez; üzerine gider','Yüksek enerji ve istekle yeni görevler üstlenir; bu heves ekibe de yansır'],
  ARRAY['Harekete geçmeden önce fazla onay ve teyit bekler; zaman ve fırsat penceresi kapanır','Her adımı planlamadan hareket edemez; belirsizlikte felç olur, başlangıç noktasını bekler','Zor durumlardan ve rahatsız edici konulardan kaçınır; biri zorlamadan adım atmaz','Başarısızlık korkusu risk almayı engeller; güvenli ve tanıdık suda kalmayı tercih eder','Sorunla karşılaştığında ''neden böyle oldu?'' sorusunda takılır; çözüme geçişi yavaştır'],
  ARRAY['Karmaşık ve belirsiz durumlarda bile harekete geçme güvencesi verir; çevresindekiler de cesaretlenir','Sınırlı kaynak ve bilgiyle sonuç üretir; mevcut koşullarda çalışır, ideal koşulları beklemez','Yeni fırsatları başkaları henüz fark etmeden görür ve erkenden pozisyon alır'],
  ARRAY['Aşırı hızlı hareket ederek başkalarının görüşünü almadan ilerler; kararlar sahiplenilmez','Sonuçları yeterince düşünmeden harekete geçer; ''önce yap, sonra düşün'' zamanla güven erozyonu yaratır','Sabırsızlık gösterir; süreç gerektiren durumları erkenden kapatmaya çalışır'],
  'Cumartesi öğleden sonrası kasa sırası sokağa taştı. Nöbetçi müdür konuşmada, stok sorumlusu depoda. Satış danışmanının iş tanımında ''kasa'' yazmıyor. Ama müşterilerin sabrının tükendiğini görüyor — ''yardım edebilirim'' diyor ve kasaya geçiyor.',
  '''Hızlı karar alman ve harekete geçmen gereken, zamanın ya da bilginin yetmediği bir durumu anlat. Nasıl düşündün? Ne yaptın? Sonuç ne oldu?''',
  4)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('ea', 'Sorumluluk Alma', 'Ensures Accountability', 'A',
  'Kendini ve başkalarını taahhütleri yerine getirme konusunda sorumlu tutmak.',
  'Sorumluluk almak; taahhütlerin sahibi olmak, hesap verebilir olmak ve hem kendi hem de yönetilen kişilerin eylemlerinden sorumlu olmak demektir. Önemli ve biraz korkutucu. Çünkü hesap verebilir olmak sizi görünür kılar ve eleştiriye açar. Ama hesap verebilirliği organizasyonda bir kültür haline getirmenin getirisi büyüktür: güven ve performans artar, çalışanlar yaptıklarının kuruma katkısını hisseder. Perakendede hesap verebilirlik hem sayısal hem davranışsal boyutuyla sürekli gündemdedir.',
  ARRAY['Taahhütlerini takip eder ve başkalarının da aynısını yapmasını sağlar; söylenenler gerçekleşir','Net bir sahiplik duygusuyla hareket eder — ''bu projenin başarısı da başarısızlığı da benim''','Kararlarının, eylemlerinin ve başarısızlıklarının kişisel sorumluluğunu üstlenir; dışsal açıklamaya sığınmaz','Ekibine net sorumluluklar ve süreç takip yöntemleri oluşturur; herkes ne yapacağını bilir','Sonuçları ölçmek için geri bildirim döngüleri tasarlar; ilerleme izlenir, sürprizler minimize edilir'],
  ARRAY['Makul ölçüde kişisel sorumluluk üstlenmez; ''benim de payım var'' diyemez','Nasıl gittiğine dair bilgi toplamaz; son dakika sürprizleriyle karşılaşır','Yetersiz geribildirim verir; insanlar rotayı nasıl düzelteceğini bilmez','Sorumluluğu başkalarıyla paylaşmayı tercih eder; net sahipliği yoktur, ''hepimizin'' işi olur','Sorun olduğunda dışsal açıklamalara başvurur: ''piyasa kötüydü'', ''stok gelmedi'', ''o söylemedi'''],
  ARRAY['Kritik projelerde beklentileri ve başarı kriterlerini net tanımlar; kimse ne istendiğini tahmin etmek zorunda kalmaz','Hesap verebilirlik kültürünü sistemik hale getirir; kendi davranışı model olur, yazılı kurallar değil','Ekibindeki başarısızlıkları öğrenme fırsatına çevirir; ''neden başarısız olduk?'' yerine ''bir dahaki sefere ne yapacağız?'' sorusunu sorar'],
  ARRAY['Bireyler üzerinde gereğinden fazla baskı ve denetim yaratır; kontrol dışı faktörleri yeterince dikkate almaz','Sayısal ölçümlere ve somut verilere aşırı odaklanır; niteliksel gelişimi ve insan boyutunu ikinci plana atar','Hataya sıfır tolerans tutumu benimseyebilir; bu ekipte risk almaktan kaçınan bir yapı oluşturur'],
  'Mağaza, iki ay üst üste satış hedefinin altında kaldı. Bölge müdürüyle yapılan toplantıda mağaza müdürü ''Planlamamda bir boşluk oluştu, bunu atlıyorum — bu ay şunu değiştireceğiz ve iki hafta sonra sizi güncelleyeceğim'' diyor. Ekip müdürün arkasında duruyor. Üçüncü ayda hedef tutturuluyor.',
  '''Sorumluluğunu tamamen üstlendiğin ve zorlu koşullara rağmen taahhüdünü yerine getirdiğin bir durumu anlat. Baskı altında nasıl hissettin? Ne yaptın?''',
  5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('dr', 'Sonuç Odaklılık', 'Drives Results', 'A',
  'Zorlu koşullar altında bile tutarlı biçimde sonuç üretmek.',
  'Sonuç odaklılık; genel bir başarı zihniyetinin, aksiyona yönelimin ve öne çıkma isteğinin bütünleşik halidir. Sonuç odaklı insanlar takımlarına aciliyet duygusu aşılar; organizasyon performansının her zaman akılda olduğu bir kültür oluştururlar. Sonuçlar ölçülebilir olabilir: ciro büyümesi, müşteri memnuniyet skoru, kâr marjı. Ya da niteliksel olabilir: müşteri nezdinde güçlenen marka algısı, ekibi çeken canlı bir çalışma kültürü. Engeller ve aksilikler karşısında pes etmemek, farklı stratejilerle tekrar ve tekrar denemek bu yetkinliğin özüdür.',
  ARRAY['Güçlü bir sonuç ve alt satır odaklılığına sahiptir; rakamları takip eder ve neyin önemli olduğunu bilir','Engeller ve aksilikler karşısında hedeflere ulaşmayı sürdürür; ilk planı işe yaramadığında alternatif yol bulur','Hedefleri başarıyla aşma sicili vardır; sadece ulaşmakla kalmaz, geçer','Kendini ve ekibini sonuç üretimine iter; performansı hem kendinden hem başkalarından bekler','Her zaman bitişi gözünde tutar; son gün teslimini yakalamak için ekstra çaba gösterir'],
  ARRAY['Sonuçlar için itmekten kaçınır; olduğu gibi kabul eder, daha iyisini zorlamaz','Asgari çabayla idare eder; ''geçti'' ile yetinir, ''aştı''ya ulaşmaya çalışmaz','Tutarsız bir performans sergiler; iyi dönemde çalışır, zor dönemde üretkenliği düşer','Kolayca pes eder; üçüncü ve dördüncü denemede farklı stratejilerle geri dönmez','Son tarihleri sık sık kaçırır; engelleri aşmak yerine onları bahane olarak kullanır'],
  ARRAY['İddialı hedefler koyar ve yüksek standartlara sahiptir; ortalama hedefler tatmin etmez','Tutarlı biçimde en iyi performans gösterenler arasındadır; bir seferlik değil, süregelen mükemmellik','Zorluklar ve aksilikler karşısında ısrar eder; kriz, stratejik düşünmeyi değil aksiyonu hızlandırır'],
  ARRAY['İnsan, ekip, süreç ya da etik boyutlarını yeterince gözetmeksizin her ne pahasına olursa olsun sonuç peşinde koşar','Son tarih odaklılığı o kadar belirgindir ki teslim gününe yetişmek için kalite ve süreç feda edilir','Ekip üzerinde aşırı baskı yaratır; yüksek turnover ve tükenmişliğe yol açar'],
  'Mağaza ayın 15''inde hedefin yüzde on gerisinde. Mağaza müdürü o gün ekibiyle oturuyor: hangi kategoride açık var, müşteri profili bu hafta nasıl değişti, hangi ürünü daha görünür yapabiliriz. Ay sonunda hedef tutturulmuş değil — geçilmiş.',
  '''Koşulların aleyhine olduğu — kaynak kısıtlı, zaman dar ya da koşullar zorlu — bir dönemde sonucu nasıl tutturduğunu anlat.''',
  6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('dw', 'Ekip Yönlendirme', 'Directs Work', 'A',
  'Net yön vermek, görevleri delege etmek ve işin tamamlanması önündeki engelleri kaldırmak.',
  'Kendi işini yapmaktan, işi başkaları aracılığıyla yapmaya geçiş — perakende kariyerinin en kritik ve en zorlu dönüşüm noktalarından biridir. Bu dönüşüm zordur çünkü işin doğrudan kontrolünü bırakmayı, daha fazla risk almayı ve başkalarına güvenmeyi gerektirir. Odak, kişisel başarıdan başkalarını güçlendirmeye ve başarılı kılmaya kayar. Perakendede bu geçiş — satış danışmanından kat müdürüne, kat müdüründen mağaza müdürüne — her kariyer adımında yeniden yaşanır.',
  ARRAY['Net sorumluluklar ve hesap verebilirlikler tanımlar; herkes neyin kendisinden beklendiğini bilir','Görevleri ve kararları doğru kişilere, doğru biçimde delege eder; bottleneck haline gelmez','İş üzerindeki diyaloğu sürdürerek ilerlemeyi takip eder; son dakika sürprizlerini minimize eder','İnsanların yeteneklerine ve deneyim düzeylerine göre uygun rehberlik sağlar; herkese aynı biçimde yönetmez','İşin tamamlanmasının önündeki engelleri proaktif olarak tespit eder ve kaldırır'],
  ARRAY['Eksik, belirsiz ya da dağınık talimatlar verir; insanlar ne yapacaklarını tam anlayamaz','''Bıraksaydın daha iyi yapardım'' düşüncesiyle işi delege edemez; her şeyi kendisi yapmaya çalışır','Yüksek profilli görevleri kendinde tutar; gelişimsel fırsatları ekiple paylaşmaz','Mikro yönetim yapar; delege eder ama bırakmaz, sürekli kontrol eder ve müdahale eder','Gerçekçi olmayan ya da çok kolay hedefler koyar; ekibi ne motive eder ne de zorlar'],
  ARRAY['İnsanları görevlere ustaca eşleştirir; kimin hangi işte en iyi sonucu üreteceğini bilir','Net performans beklentilerini iletir ve tutarlı biçimde takip eder','İnsanların kapasitelerini geliştirecek görevleri bilinçli delege eder; görev hem iş hem gelişim fırsatıdır'],
  ARRAY['Gereğinden fazla yönlendirme yapar; ekip kendi başına karar alamaz, inisiyatif almaktan çekinir','Başkalarından gerçekçi olmayan beklentiler içindedir; kapasiteyi aşan taleplerle moral bozar','Sabırsızdır; gelişim için gerekli zaman ve süreçlere tolerans göstermez'],
  'Yeni mağaza müdürü, kampanya döneminde her şeyi kendisi yapmaya çalışıyor — vitrin, kasa, stok, şikayet. Hiçbirini iyi yapamıyor. Bir ay sonra görevleri net biçimde dağıtıyor. Mağaza daha sakin, daha verimli çalışıyor. Müdür artık yönetiyor — yapan değil, yönlendiren.',
  '''Bir görevi delege ettiğinde beklediğin sonucu elde edemediğin bir durumu anlat. Nerede hata yaptın? Nasıl müdahale ettin?''',
  7)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('bt', 'Ekip Kurma', 'Builds Effective Teams', 'A',
  'Çeşitli beceri ve perspektifleri bir araya getiren, güçlü kimliğe sahip takımlar kurmak.',
  'Harika takımlar nadiren kendiliğinden oluşur. Amaç, görevler, ilişkiler ve süreçlere dikkat edilmesini gerektirir. Perakendede bir mağaza ekibi; farklı deneyim düzeylerinden, farklı kişiliklerden ve farklı kariyer beklentilerinden oluşur. Sezonluk baskı, vardiya çakışmaları, yüksek turnover — bunların hepsi takım dinamiklerini sürekli zorlar. Bu çeşitliliği uyumlu bir güce dönüştürmek — kimliği olan, moralı yüksek, birbirini tamamlayan bir takım kurmak — liderliğin en yüksek ifadesidir.',
  ARRAY['Takımı uygun ve çeşitli stil, bakış açısı ve deneyim kombinasyonuyla oluşturur; benzerler değil, tamamlayanlar bir araya getirir','Ortak hedefler ve paylaşılan bir zihniyetin temelini atar; ekip ne için var olduğunu bilir','Aidiyet duygusu ve güçlü ekip morali yaratır; insanlar o takımın parçası olmaktan gurur duyar','Başarıları paylaşır ve ekip çabalarını ödüllendirir; bireysel başarıyı takım başarısının önüne koymaz','Takımda açık diyalog ve iş birliği ortamı oluşturur ve besler'],
  ARRAY['Takımın amacı ve hedefleri konusunda net değildir; ekip neye doğru çalıştığını bilmez','Ortak bir zihniyet yaratamaz; bireyler yan yana çalışır ama gerçek bir takım oluşmaz','Bireysel çabaları takım başarısının önünde tutar ve ödüllendirir; takım kimliği gelişmez','Görevleri iş birliğini teşvik edecek biçimde dağıtmaz; herkes kendi adasında çalışır','Takım üyeleri arasındaki çatışmayı fark etmez ya da görmezden gelir; geç müdahale eder'],
  ARRAY['Başarıyı bütün takımın başarısı olarak tanımlar; bireysel parlama değil, kolektif zafer önceliktir','Her takım üyesinin özgün geçmişini ve bakış açısını değerlendirmenin takım hedeflerine ulaşmak için kritik olduğunu bilir','Takım üyelerinin kariyer hedeflerini bilir ve bu hedefleri ekip başarısıyla entegre eder'],
  ARRAY['Takım kimliğine o kadar odaklanır ki dış bakış açısına kapalı hale gelir; silo oluşturur','Konsensüs kültürü güçlüdür ama zor kararları almayı geciktirir','Çatışmadan kaçınır; takım uyumunu korumak adına zor gerçekleri söylemez ya da geç söyler'],
  'Yeni mağaza müdürü göreve geldiğinde ekip parçalıdır. İlk yaptığı şey ortak hedef: ''Bu ay en yüksek müşteri memnuniyet puanına ulaşalım — bunu birlikte nasıl yaparız?'' Ay sonunda puan yükseliyor. Ama daha önemlisi — ekip artık birbirini tanıyor ve güveniyor.',
  '''Kurduğun ya da dönüştürdüğün bir takımı anlat. Başladığında tablo nasıldı? Neyi değiştirdin? Ve o takımdan bugün hâlâ gurur duyduğun bir şey nedir?''',
  8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('dt', 'Yetenek Geliştirme', 'Develops Talent', 'A',
  'Başkalarını hem kariyer hedeflerine hem organizasyonun hedeflerine ulaşacak biçimde geliştirmek.',
  'İnsanların büyük çoğunluğu büyümek ve gelişmek ister. Organizasyonlar da çalışanlarının rolün ve kurumun değişen yapısına ayak uyduracak biçimde gelişmesine ihtiyaç duyar. Bu süreç üç parçanın bir arada çalışmasını gerektirir: kişinin büyümek için motivasyonu, organizasyonun gelişimi destekleyen yapısı ve sizin geliştirme sorumluluğunu üstlenmek için zaman, ilgi ve çaba harcamanız. Perakendede bu yetkinlik özellikle kritiktir çünkü sektörün en büyük zorluklarından biri turnoverdir. Yetenekli insanları büyütüp elde tutmak hem mağaza performansını hem organizasyonel sürekliliği doğrudan belirler.',
  ARRAY['Başkalarını geliştirmeyi yüksek öncelik olarak görür; operasyonel koşuşturmanın arkasında bırakmaz','Koçluk, geribildirim, maruziyet ve zorlayıcı görevler aracılığıyla başkalarını aktif olarak geliştirir','Çalışanların kariyer gelişimi hedeflerini organizasyonun hedefleriyle hizalar; sadece kuruma değil, kişiye de yatırım yapar','Gelişimsel transferleri ve yan adımları destekler; kariyer her zaman yukarıya gitmek zorunda değildir','Gerçek gelişim konuşmaları yapar — yalnızca performans değerlendirmesi değil, kariyer diyaloğu kurar'],
  ARRAY['Başkalarını geliştirmek için zaman ayırmaz; ''işler yoğun, sonra bakarız'' döngüsüne girer','Gelişim zorunluluklarını en kolay seçenekle geçiştirmek ister — form doldurur, gerçek koçluk yapmaz','Görünürlüğü paylaşmaktan kaçınır; yüksek profilli görevleri kendinde tutar','Gelişimsel geribildirim vermekten kaçınır; dönüştürücü konuşmayı sürekli erteler','Gelişimsel hamle ya da görev tanımlamakta güçlük çeker; insanı şu anki rolünün ötesinde göremez'],
  ARRAY['Yetenek gelişimini organizasyonel bir zorunluluk olarak görür; bu işi ''ekstra'' değil, liderliğin özü olarak tanımlar','Kendi ekibinin dışına bakar; organizasyon genelinde gelişimsel fırsatları fark eder ve insanlarla paylaşır','Gelişim için kasıtlı olarak gerginlik ve zorluk yaratır; konfor alanının içinde büyüme olmadığını bilir'],
  ARRAY['Geliştirmeye o kadar odaklanır ki anlık iş sonuçları geri planda kalabilir; denge kayar','Herkesin her şeyde gelişmesini bekler; güçlü yönlere odaklanmak yerine her zayıflığı gidermeye çalışır','Gelişim için sabırsızlanır; öğrenme ve büyüme doğal zamanlarına ihtiyaç duyar'],
  'Eğitim müdürü, yeni gelen bir satış danışmanının müşteriyle konuşma biçimini fark eder — doğal, güven veren, dinleyen bir iletişim tarzı var. Üç ay içinde o kişiyi müşteri şikayet yönetimi projesine dahil eder. Danışman CV''sinde hiç olmayan bir deneyim kazanır. Altı ay sonra kat müdürü pozisyonu açılır — ilk adaylar listesinin en üstünde o danışman vardır.',
  '''Ekibindeki birini aktif olarak geliştirdiğin, bu kişinin kariyer yolunu etkilediğin bir süreci anlat. Ne fark ettin? Ne yaptın? Nasıl bir sonuç aldın?''',
  9)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('de', 'Motivasyon ve Bağlılık', 'Drives Engagement', 'A',
  'İnsanların organizasyonun hedeflerine ulaşmak için ellerinden gelenin en iyisini yapmak üzere motive olduğu bir çalışma iklimi yaratmak.',
  'İnsanlar bağlı olduğunda daha büyük şeyler olur. Bağlı çalışanlar daha üretkendirler — iş davranışları enerjik, odaklı ve organizasyonun ihtiyaçlarıyla daha uyumludur. Elde tutma oranları daha yüksektir. Pek çok araştırma, çalışan bağlılığındaki artışın kârlılık, kalite, verimlilik, müşteri memnuniyeti ve yenilikte iyileşmelere yol açtığını ortaya koymaktadır. Perakendede bağlılık doğrudan müşteri deneyimine yansır. Ama bağlılık tek tipli değildir: birini bağlayan şey diğerini bıktırabilir.',
  ARRAY['İşi insanların hedef ve motivasyonlarına hizalayacak biçimde yapılandırır; anlam ve görevi buluşturur','Başkalarını güçlendirir; insanların kendi kararlarını alabildiğini ve bu kararların önemli olduğunu hissettirir','Her kişinin katkısının kuruma değer kattığını somut biçimde gösterir','Görüş ve fikir paylaşımını davet eder; sahipliği ve görünürlüğü paylaşır','İnsanların motivasyonları ile organizasyonel hedefler arasında net bir bağlantı gösterir'],
  ARRAY['Farklı tercih ve güdülere sahip insanlarla ilişki kurmakta güçlük çeker; herkesi aynı biçimde motive etmeye çalışır','Başkalarını neyin motive ettiğine dair çok az içgörüsü vardır; motivasyonun kişisel olduğunu fark etmez','İnsanlara işlerini yapmaları için yeterli esneklik ve özerklik tanımaz; sürekli denetler','Coşku yaratmak için az çaba sarf eder; ekip yönetimini teknik bir süreç olarak görür','Sahipliği ve görünürlüğü paylaşmaya isteksizdir; başarı kendisinde kalır'],
  ARRAY['Bireysel motivatörleri derinlemesine anlar ve işi buna göre yönlendirir; herkese özel bir bağlılık yaklaşımı uygular','Zorlu dönemlerde bile yüksek bağlılık ortamını sürdürür; belirsizlik ve baskı altında bile ekibe ilham verir','Ekip bağlılığını etkileyen faktörleri ölçer ve bu faktörleri proaktif olarak yönetir'],
  ARRAY['Bağlılık yaratmaya o kadar odaklanır ki zor kararları almaktan kaçınır; gerekli ama rahatsız edici adımları erteler','Bağlılığı performansın önüne koyar; gerçek performans sorunlarını ''motivasyon eksikliği'' olarak çerçeveler','Her kararı konsensüsle almak ister; ekibi dahil etmek güçlendirir ama her konuda onay aramak yavaşlatır'],
  'Mağaza müdürü, her Pazartesi sabahı 10 dakikalık bir briefing yapıyor. Hedefleri değil, geçen haftadan bir anı paylaşıyor: ''Cuma günü Ayşe, sıradaki müşteriyi bekletmemek için kasaya geçti — kimse sormadı, kendisi gördü ve yaptı. Bu hafta hepimizin aklında olsun.''',
  '''Ekip bağlılığının düştüğünü fark ettiğin ve durumu tersine çevirmek için harekete geçtiğin bir dönemi anlat. Sinyali nasıl fark ettin? Ne yaptın? Sonuç ne oldu?''',
  10)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('pa', 'Planlama ve Önceliklendirme', 'Plans and Aligns', 'A',
  'İşi organizasyonel hedeflerle uyumlu biçimde planlamak ve önceliklendirmek; taahhütleri karşılamak için doğru sırayla ilerlemek.',
  'İyi bir plan her şeyi kolaylaştırır. İyi planın belirgin işareti ise stratejik önceliklerle hizalanmış olmasıdır. Planlar bir temel oluşturur. Hizalanmış planlar sizi, ekibinizi ve tüm organizasyonu doğru yönde ilerletir. Perakendede planlama yetersizliği direkt zarar üretir: yanlış zamanda yanlış stok, yetersiz personel, çakışan kampanya takvimleri, son dakika vardiya boşlukları. Gün içinde ''itfaiyeci modunda'' çalışan lider ile sezonu kontrollü yöneten lider arasındaki en büyük fark burada başlar.',
  ARRAY['Hedefleri geniş organizasyonel hedeflerle uyumlu biçimde belirler; kendi işini büyük resme bağlar','Hedefleri uygun inisiyatif ve eylem adımlarına kırar; soyut stratejiyi somut görevlere indirger','Faaliyetleri ilgili kilometre taşları ve takvimlerle birlikte aşamalandırır; ne zaman ne olacağı bellidir','Etkili acil durum planları geliştirir ve bunları gerektiğinde uygular; ''plan B'' hazırdır','Taahhütleri karşılamak için zaman ve kaynakları dengeli yönetir; son dakika sürprizleri minimumdur'],
  ARRAY['Daha büyük önceliklere dikkat etmeksizin anlık ihtiyaçlara takılır; her gün kendi kendine bir acil durum yaşanır','Zaman ve kaynakları net bir amaç doğrultusunda kullanmaz; emek harcar ama nereye gittiği belirsizdir','Acil durum planlarının eksikliği nedeniyle sorunlarla hazırlıksız yakalanır','İlerlemeyi rastgele takip eder ya da hiç takip etmez; nerede olduğunu bilemez','Plan yapar ama değişime adapte olmakta zorlanır; plan katılaşır'],
  ARRAY['En yüksek önceliklere odaklanır ve daha az kritik görevleri bir kenara bırakabilir; ''hayır'' diyebilme gücü vardır','Kaynakları tam olarak tahsis eden uygulama planları yapar; kim, ne zaman, neyle çalışacak netdir','Engelleri öngörür ve mükemmel acil durum planları hazırlar; ''ya bu olursa?'' sorusunu önceden sorar'],
  ARRAY['Planlamaya çok zaman harcar; hazırlık aşaması eyleme geçişi geciktirir','Planlara ısrarla bağlı kalır; değişen koşullara ve yeni bilgilere uyum sağlamak için yeterli esneklik bırakmaz','Başkalarına plan yapmaları için gereken özerkliği vermez; her planı kendisi yapmak ister'],
  'Sezon açılışı iki hafta sonra. Operasyon müdürü tüm değişkenleri tek bir plana döker: ürün teslimat tarihleri, vitrin değişim takvimi, ekstra personel vardiyaları, kampanya başlangıç ve bitiş günleri. Her departmana ne zaman ne yapacağını iletir. Açılış gününde sürpriz yok, her şey yerli yerinde.',
  '''Karmaşık bir süreci planladığın, birden fazla değişken ve ekibin koordinasyonunu gerektiren bir durumu anlat. Planı nasıl oluşturdun? Beklenmedik bir şey çıktı mı?''',
  11)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('fa', 'Finansal Okuryazarlık', 'Financial Acumen', 'B',
  'Temel finansal göstergeleri anlayıp yorumlamak ve bu anlayışı daha iyi iş kararları almak için kullanmak.',
  'Perakendede finansal okuryazarlık olmadan mağaza yönetmek; gösterge paneline bakmadan araba sürmek gibidir. Ciro tek başına anlamsızdır — brüt kâr marjı, stok devir hızı, kayıp oranı ve personel gideriyle birlikte okunduğunda gerçek tabloyu gösterir. Bu sayıları sadece raporlamak değil, yorumlamak ve eyleme çevirmek finansal okuryazarlığın özüdür. Mağaza müdüründen bölge direktörüne kadar perakende kariyerinde ilerledikçe finansal bakış açısı giderek daha kritik hale gelir.',
  ARRAY['Temel finansal göstergelerin anlamını ve sonuçlarını anlar; rakamlar ona bir şeyler söyler','Stratejik seçenekler ve fırsatlar üretmek için finansal analizi kullanır','Niceliksel ve niteliksel bilgiyi bütünleştirir; rakamların arkasındaki hikayeyi okur','Finansal kararların organizasyonun farklı işlevleri üzerindeki etkisini bağlar; siloda düşünmez','Bütçe süreçlerine aktif katılım sağlar; rakamları tartışabilir, savunabilir ve sorgulayabilir'],
  ARRAY['Finansal terimler ve kavramlarla yeterli aşinalığı yoktur; brüt marjin, stok devir hızı gibi kavramlar belirsizdir','Farklı iş işlevleri ile genel finansal performans arasındaki neden-sonuç ilişkilerini kavrayamaz','Sonuç çıkarmada finansal etkiyi göz ardı eder; kararlar finansal boyutuyla değerlendirilmez','Operasyonel başarıyı kârlılıktan bağımsız düşünür; ''satış iyi gitti'' ile ''kâr iyi gitti'' aynı şey değildir'],
  ARRAY['Finansal bilgiyi iş istihbarasına dönüştürür; nitel ve nicel bilgiyi analiz ve bütünleştirme yoluyla içgörü üretir','Performansı ölçmek, trendleri belirlemek ve sonuçları etkileyebilecek stratejiler önermek için temel finansal göstergeleri izler','Finansal verileri gelecek odaklı karar almada kullanır; geçmişe bakmakla kalmaz, ileriye projeksiyon yapar'],
  ARRAY['Finansal göstergeleri tek karar kriteri olarak kullanır; dar finansal sonuçlara odaklanan dengesiz bir organizasyonel performans görüşüne yol açar','Kısa vadeli finansal kazanımlar için uzun vadeli iş hedeflerini feda edebilir','İnsan boyutunu — ekip morali, müşteri ilişkisi, kültürel yatırım — sayısal olmadığı için görmezden gelir'],
  'Mağaza müdürü aylık satış raporunu aldığında sadece ciroya bakmıyor. Brüt kâr marjını, iskonto oranını ve stok devir hızını birlikte okuyor. Satış yüzde sekiz arttı ama kâr marjı düştü — demek ki promosyon fazla agresifti.',
  '''Finansal bir göstergeyi takip edip buna göre bir karar aldığın ya da harekete geçtiğin somut bir durumu anlat. Hangi veriyi kullandın? Nasıl yorumladın? Sonuç ne oldu?''',
  12)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('sm', 'Stratejik Bakış', 'Strategic Mindset', 'B',
  'Gelecekteki olasılıkları öngörebilmek ve bunları atılım yaratan stratejilere dönüştürmek.',
  'Stratejik olmak; geleceğe net niyetler ve amaçlı eylemlerle bakmak, planlamak ve hareket etmektir. Stratejik bir bakış açısı her ikisine de hazır olmayı gerektirir: hem taktiksel bugüne hem uzun vadeli yarına. Perakende sektörü bunu daha da kritik kılar. Kısa vadeli baskılar her zaman var olacak. Ama bu anlık meselelere gömülüp kalmak, organizasyonu uzun vadede rekabetsiz bırakır. Stratejik bakan bir lider; rakiplerin hareketini izler, tüketici davranışlarındaki değişimi okur, hem bugüne hem yarına hazırlanır.',
  ARRAY['Kısa vadeli baskı altında uzun vadeli öneme sahip kararlardan vazgeçmez','Sektördeki trendleri ve rakip hareketlerini izleyerek kendi stratejisine entegre eder','Olası gelecek senaryolarını rahatlıkla gündeme taşır; ''ya şu olursa?'' sorusunu sormaktan çekinmez','Sürdürülebilir değer yaratacak olasılıkların güvenilir tablolarını çizer','Vizyon ile eylem arasındaki net bağlantıyı gösteren rekabetçi stratejiler oluşturur'],
  ARRAY['Operasyonel detaylara odaklanır; büyük resmi kaçırır','Strateji konuşmalarında fikir söylemekte zorlanır; taktik düzeyde kalır','Değişen koşullara tepkisel davranır; öngörü değil, yangın söndürme','Rakiplerin ve sektör trendlerinin farkında değildir; içe odaklı kalır'],
  ARRAY['Büyük resmi sürekli görür, gelecek senaryolar üretir ve sürdürülebilir rekabet avantajı yaratan stratejiler oluşturur','Vizyoner bir yapıya sahiptir; olasılıkların ve ihtimallerin güvenilir ve ilham veren tablolarını söze döker','Net bir strateji oluşturur ve organizasyonu stratejik hedeflerine açıkça hızlandıracak iddialı adımları belirler'],
  ARRAY['Stratejik fikirlere o kadar odaklanır ki günlük operasyonel ihtiyaçları ihmal eder','Planları aşırı karmaşık hale getirebilir; strateji anlaşılır ve uygulanabilir olmak zorundadır','Başkalarını geride bırakır; vizyon çok ilerideyse ekip bağlantısını kaybeder'],
  'Bölge müdürü, bölgesindeki satış rakamları hedefte olsa bile müşteri memnuniyet puanının yavaş yavaş düştüğünü fark ediyor. Bu düşüş 6 ay sonraki müşteri kaybının habercisi. Ekip eğitimine yatırım yapıyor. Üç ay sonra puan yükseliyor. Stratejik bakış budur: bugün hâlâ ''iyi'' görünürken yarının sinyalini okumak.',
  '''Uzun vadeli düşünerek aldığın ve kısa vadede fedakarlık ya da dirençle karşılaştığın bir kararı anlat. Neden o kararı aldın? Başkalarını nasıl ikna ettin?''',
  13)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('nl', 'Hızlı Öğrenme', 'Nimble Learning', 'A',
  'Yeni sorunlarla başa çıkarken deneyerek aktif öğrenmek; hem başarıları hem başarısızlıkları öğrenme kaynağı olarak kullanmak.',
  'Çoğumuz daha önce gördüğümüz ve yaptığımız şeyleri uygulamakta iyiyiz. Daha nadir bir beceri ise bir şeyi ilk kez yapmaktır. Değişimin hızlanan temposuyla birlikte, yeni çözümler öğrenip uygulamak giderek daha kritik bir beceri haline geliyor. Bu yetkinlik risk almayı, mükemmeliyetçiliği bir kenara bırakmayı ve yeni yollar açmayı gerektiriyor. Perakendede yeni ürün kategorileri, değişen müşteri alışkanlıkları, dijital satış kanalları, yeni POS sistemleri — bunların hepsi hızlı öğrenmeyi zorunlu kılar.',
  ARRAY['Yeni durumlarla karşılaştığında hızla öğrenir; adaptasyon sürecini kısaltır ve uygulamaya hızlı geçer','Doğru çözümü bulmak için denemeler yapar; deneysellik bir tehdit değil, araçtır','Tanıdık olmayan görevlerin zorluğunu kucaklar; yeni alan onu rahatsız etmez, meraklandırır','Başarısızlıklardan ve hatalardan dersler çıkarır; aynı hatayı tekrarlamamak için analiz yapar','Geçmiş deneyimlerden öğrendiklerini yeni ve farklı bağlamlara esnek biçimde uygular'],
  ARRAY['Yeni durumlarda öğrenmekte güçlük çeker; tanıdık olmayan görevler önünde sıkışır','Denenip sınanmamış çözümlere şans vermekten kaçınır; bilinen yolda kalmayı tercih eder','Sorunları yalnızca geçmişte işe yarayan yöntemlerle çözer; bağlam değişse bile formül değişmez','Risk almaz; mükemmeliyetçilik ya da hata korkusu hareketi engeller','Hatayı öğrenme kaynağı değil, utanç kaynağı olarak görür; tekrar denemekten çekinir'],
  ARRAY['Doğru çözümü bulmak için birden fazla yöntem kullanarak defalarca deneme yapar; bırakmaz','Hataları öğrenme fırsatı olarak görür; veri kaynağı olarak sahiplenir','Tanıdık olmayan görevlerin zorluğundan keyif alır; bilinmezlik onu durdurmaz, tetikler'],
  ARRAY['Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz yere bozar; odak ve öncelik kaybolur','Henüz kanıtlanmamış fikirlere yalnızca yeni oldukları için odaklanır','Öğrenme adına gereksiz riskler alır; deneysellik ile sorumsuzluk arasındaki sınır bulanıklaşır'],
  'Mağazaya yeni bir dijital ödeme sistemi geliyor. Eğitim günü bir hafta sonra. Hızlı öğrenen satış danışmanı beklemiyor — sistemi kendi başına kurcalıyor, temel işlemleri öğreniyor. Eğitim günü geldiğinde sorularla geliyor, herkesten hızlı kavrıyor.',
  '''Daha önce hiç yapmadığın bir şeyi öğrenmek zorunda kaldığın bir durumu anlat. Nasıl yaklaştın? Hangi engelleri yaşadın? Sonuç ne oldu?''',
  14)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('br', 'Dayanıklılık', 'Being Resilient', 'A',
  'Zorlu durumlarla karşılaşıldığında aksiliklerden ve sıkıntılardan sıyrılmak; güçlenerek devam etmek.',
  'Aksilikler çoğunlukla kaçınılmazdır. Özellikle bugünün talep yoğun ve zaman zaman dalgalı çalışma ortamında olası tuzaklar her yerdedir. En dayanıklı insanlar bile aksilikler yaşar. Fark, bu aksiliklere nasıl yanıt verdiklerinde yatar. Öngörürler. Doğrudan karşılarına çıkarlar. Dayanma kapasitesine sahiptirler. Perakendede her gün beklenmedik bir şey olur: müşteri şikayeti, stok krizi, personel yokluğu, satış baskısı. Dayanıklı olanlar aynı koşulları yaşar — ama geri dönerler.',
  ARRAY['Baskı altında kendinden emin ve kararlı kalır; stres performansını düşürmez','Krizleri etkili biçimde yönetir; panik yerine netliği tercih eder','Olumsuz koşullara rağmen olumlu bir tutum ve ileriye dönük bir bakış açısını sürdürür','Aksiliklerden toparlanır; önceki performans, güven ve tatmin düzeyine hızla geri döner','Zorluklardan ve olumsuz deneyimlerden büyür; şikayet yerine öğrenme alışkanlığı geliştirir'],
  ARRAY['Yüksek baskılı durumlarda kolayca sarsılır; sakinliğini ve netliğini kaybeder','Stres ve kaygı dönemlerinde düşük enerji ve motivasyon sergiler; verimlilik düşer','Eleştiri ya da engellerle karşılaşınca savunmaya geçer; sorunu çözmek yerine kendini savunur','Aksiliklerden toparlanmak fazla zaman alır; etkisi günler ya da haftalar boyunca sürer','Değişken ortamlarda anksiyete yaşar; değişimle stresi birbiriyle karıştırır'],
  ARRAY['Stresli durumlarda odaklı ve dengeli kalır; sakinliğini yalnızca kendisi için değil, çevresi için de sürdürür','Başarısızlıktan sistematik biçimde öğrenir; analiz eder, neyi değiştireceğini netleştirir','Dayanıklılığı kasıtlı olarak inşa eder; stres yönetimi ve yeniden şarj etme alışkanlıkları geliştirir'],
  ARRAY['O kadar dayanıklıdır ki gerçekten ciddi sorunlara ''bu da geçer'' diyerek geç müdahale eder','Strese katlanma kapasitesi yüksek ama bu kapasitenin sınırlarını görmez; destek istemekte güçlük çeker','Zorlu durumların etkisini ya da ciddiyetini küçümser; başkalarının yaşadığı güçlüğü kavrayamaz'],
  'Cumartesi, yoğun sezon, bir satış danışmanı art arda dört zor müşteriyle karşılaşıyor. Öğle arasında 10 dakika gerçek bir mola veriyor. Öğleden sonra aynı enerjiyle geri dönüyor. Akşam eve yorgun gidiyor ama öfkeli değil. Tükenmişliği günün içinde taşımıyor.',
  '''Gerçekten zorlandığın bir dönemi anlat — hem profesyonel hem kişisel baskının aynı anda geldiği bir zaman. O dönemde nasıl hissettin? Nasıl baş ettin? O deneyim seni nasıl değiştirdi?''',
  15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('is', 'İlişki Yönetimi', 'Interpersonal Savvy', 'A',
  'Çeşitli insan gruplarıyla açık ve rahat biçimde ilişki kurabilmek.',
  'İlişki yönetimi, organizasyonlarda işlerin yürütülmesinin ayrılmaz bir parçasıdır. Her türlü insanla geçinmenin anahtarı, önce kişisel tepkileri geri çekmek ve önce karşındakine odaklanmaktır. Perakendede bu yetkinlik hem müşteriyle hem ekiple hem de yönetimle sürekli devrededir. En iyi ilişki yöneticileri bu farkları otomatik okur — bir müşteriyle, bir kat müdürüyle, bir bölge direktörüyle eşit rahatlıkta konuşabilirler.',
  ARRAY['Kademeler, fonksiyonlar, kültürler ve coğrafyalar genelinde insanlarla rahatça ilişki kurar; herkesle ortak dil bulur','Diplomasi ve incelikle hareket eder; hassas konularda bile ilişkiyi koruyarak ilerler','Açık, sıcak ve kabul edici bir biçimde bağ inşa eder; karşısındaki kendini görülmüş hisseder','Kendine benzeyen ve benzemeyen insanlarla yapıcı ilişkiler kurar; farklılık engel değil, zenginliktir','Kişilerarası ve grup dinamiklerini okur; odada ne döndüğünü fark eder'],
  ARRAY['Az sayıda ilişki kurar; öncelikle kendi çalışma alanındaki insanlarla etkileşime girer','Kendinden farklı insanlarla etkileşime geçerken rahatsızlık hisseder; çeşitlilik stres vericidir','Fikirlerini küçük düşürücü ya da duyarsız biçimde ifade eder; taktik ve diplomasi eksiktir','Başkalarının ihtiyaçlarına karşı az ilgi gösterir; kendi gündemini öne çıkarır','Eleştiri karşısında savunmaya geçer; ilişkiyi zedeleyecek tepkiler verir'],
  ARRAY['Çok çeşitli insanlarla proaktif biçimde ilişki geliştirir; ağını bilinçli ve geniş tutar','Zor ya da gergin durumlarda bile anlık bağ kurar; baskı altında ilişki yönetimi becerisi azalmaz','Birlikte çalışması güç kişilerle bile üretken ve saygılı bir ilişki sürdürür'],
  ARRAY['Herkes tarafından sevilmek ister; bu net sınır koymayı ve zor mesajları iletmeyi zorlaştırır','Aşırı uyum sağlama eğilimi özgün duruşu ve bakış açısını gizleyebilir','Çatışmayı yönetmek yerine kaçınır; uyumu korumak adına gerçeği söylemez'],
  'Kıdemli satış danışmanı, aynı vardiyada iki çok farklı müşteriyle karşılaşıyor: biri deneyimli ve aceleci bir üst düzey yönetici, diğeri mağazaya ilk kez giren genç bir müşteri. Danışman ikisine de aynı içtenlikle ama tamamen farklı bir yaklaşımla hizmet veriyor.',
  '''Başlangıçta zorlandığın ama zamanla üretken ve güçlü bir ilişkiye dönüştürdüğün bir kişiyle deneyimini anlat. Neden zordu? Ne yaptın? Ne öğrendin?''',
  16)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('mc', 'Çatışma Yönetimi', 'Manages Conflict', 'A',
  'Çatışma durumlarını gürültüyü asgari düzeyde tutarak etkili biçimde yönetmek.',
  'Çatışma, organizasyonların doğal bir parçasıdır. Organizasyonlar farklı görüşlere ve rekabet eden çıkarlara sahip çeşitli insanlardan oluşur. Kötü yönetilen çatışma tutumları pekiştirir, üretkenliği bozar ve ilişkileri zedeler. Ama çatışma her zaman kötü bir şey değildir. Çatışma daha önce tartışılamayan konuları yüzeye çıkarır. İyi yönetilen çatışma; daha iyi alternatifler ve hatta atılım noktaları bulmak için bir forum sağlar. Perakendede çatışma hem müşteri-personel hem de personel arası boyutta sürekli gündemdedir.',
  ARRAY['Çatışmalara fırsat olarak bakar; kaçınmak yerine üzerine gider ve ele alır','Zor anlaşmaları çözer ve anlaşmazlıkları adil biçimde yönetir; her iki taraf da dinlendiğini hisseder','Farklı görüşleri bütünleştirerek ve ortak zemin bularak atılım noktaları yaratır','Farklılıkları üretken biçimde ve gürültüyü minimumda tutarak yönetir; gerilim büyümeden çözülür','Çatışmanın altındaki gerçek sorunu tespit eder; belirtiye değil, kök nedene odaklanır'],
  ARRAY['Çatışmadan kaçınır; gerilimi görmezden gelir ya da kendiliğinden çözümlenmesini bekler','Anlaşmazlıkları çözerken ilerleme kaydeder güçlük çeker; konuşma yeniden başladığı yerden devam eder','Konuları tam anlamadan taraf tutar; yüzeysel okuma yapar, derine inmez','Çatışmaların organizasyonda büyük aksaklıklara yol açmasına izin verir; erken müdahale etmez','İnsanları savunmaya sokar; diyalog açmak yerine baskı uygular'],
  ARRAY['Kişilerarası ve grup dinamikleri bilgisine dayanarak çatışmaları olmadan önce öngörür; proaktif müdahale eder','Soru sorar ve paydaşlar tarafından ortaya konan tüm meseleleri yakından dinler; her tarafın duyulduğunu hissettirmek için çaba gösterir','Ortak zemin bulur ve konsensüse ulaşmak için yönlendirir; yüksek gerginlikli durumları etkili biçimde yatıştırır'],
  ARRAY['Başkalarının meselelerine karışıyormuş gibi görülebilir; her çatışmaya müdahil olmak güven sınırlarını zorlar','Tartışmaya çok heveslidir; her farklı görüşü derinleştirilmesi gereken bir çatışma olarak ele alır','Taraflar hazır olmadan çözüme iter; zamanlamanın da yönetilmesi gerektiğini unutur'],
  'İki satış danışmanı, popüler bir ürünü kimin müşterisine sunduğu konusunda gerilim yaşıyor. Kat müdürü bunu fark eder ve aynı gün ikisiyle ayrı ayrı görüşüyor. Sonra ikisini birlikte oturtuyor: ''Amacımız müşterinin memnun ayrılması — bunu nasıl birlikte yapabiliriz?'' Net bir alan paylaşım kuralı ortaya çıkıyor.',
  '''Ekip içinde ya da müşteriyle ciddi bir çatışma yaşandığı ve doğrudan müdahale etmek zorunda kaldığın bir durumu anlat. Süreci nasıl yönettin? Zorlandığın an hangisiydi? Sonuç ne oldu?''',
  17)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('ci', 'Yenilik ve Yaratıcılık', 'Cultivates Innovation', 'A',
  'Organizasyonun başarılı olması için yeni ve daha iyi yollar yaratmak.',
  'Organizasyonlar sürekli değişen rekabet ortamında hayatta kalmak ve gelişmek için yeniliğe ihtiyaç duyar. Perakendede yenilik hayatta kalmanın koşuludur. Müşteri beklentileri yükseliyor, rekabet kızışıyor, alışveriş davranışları dönüşüyor. Vitrin düzeni, müşteri yolculuğu tasarımı, personel eğitim yöntemleri — bunların hepsi ''hep böyle yapıldı'' kalıplarının dışına çıkmayı bekliyor. Doğası gereği yaratıcı olmayan biri bile bu yetkinliği geliştirebilir: merak etmeyi ve sormayı öğrenmek, kalıpların dışına çıkmak için bilinçli alan açmak.',
  ARRAY['Yeni, daha iyi ya da özgün olan kullanışlı fikirler üretir; sıradan çözümlerde kalmaz','Sorunlara bakmanın yeni yollarını gündeme taşır; mevcut çerçevenin dışından bakar','Yaratıcı bir fikri alır ve pratiğe geçirebilir; hayal gücüyle uygulama kapasitesini birleştirir','Yeniliği teşvik etmek için çeşitli düşünceleri cesaretlendirir; başkalarının farklı düşünmesine alan açar','Statükoya sorular sorar; ''neden böyle?'' ve ''daha iyi nasıl?'' sorularını rutin gündeme taşır'],
  ARRAY['Yeni bakış açılarıyla denemeler yapmak yerine konfor alanında kalmayı tercih eder','Geçmişten gelen olağan, alışılmış ve bilinen fikirler sunar; yenilik boyutu eksiktir','Başkalarının özgün fikirlerini eleştirmeye meyillidir; yeni fikirlerin ilk eleştirmeni olur','Bir tarzı vardır ki başkalarının yaratıcı girişimlerini caydırır; ''olmaz'' refleksi çabuktur'],
  ARRAY['Geleneksel yapma biçimlerinin ötesine geçer; statükoyu sorgular ve zorlar','Yenilikçi bir fikrin pazar potansiyelini sürekli değerlendirir; hayal ile gerçeklik arasındaki mesafeyi ölçer','En iyi fikirleri organize eder ve hayata geçirilene kadar takip eder; sadece üretmekle kalmaz, tamamlar'],
  ARRAY['Yeniliği o kadar sever ki yürürlükteki şeyleri gereksiz yere bozar; istikrar ve tutarlılık zarar görür','Henüz kanıtlanmamış fikirlere peşi sıra gider; odak ve öncelik kaybolur','Altta yatan sorunları görmezden gelerek yeniliklere atlamaya hazırdır; kökteki sorunu çözme disiplini eksik'],
  'VM koordinatörü, yeni sezonda müşteri akış verilerine bakıyor. Soldan giren müşterilerin sağ vitrini neredeyse hiç görmediğini fark ediyor. Standart uygulama ''her zaman böyle yapılır'' diyor, ama o farklı bir yerleşim öneriyor. İki haftanın sonunda sağ vitrin ürünlerine yüzde yirmi daha fazla ilgi var.',
  '''Mevcut bir süreci, ürünü ya da deneyimi geliştirmek ya da değiştirmek için öncülük ettiğin bir durumu anlat. Fikri nereden buldun? Nasıl hayata geçirdin? Karşılaştığın dirençler nelerdi? Sonuç ne oldu?''',
  18)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('pe', 'İkna Etme', 'Persuades', 'A',
  'Başkalarının desteğini ve bağlılığını kazanmak için ikna edici argümanlar kullanmak.',
  'İşler ilişkiler aracılığıyla yürütülür. Bazen başkalarını bakış açılarını değiştirmeye ve harekete geçmeye ikna etmeden şeyleri gerçekleştirmek mümkün olmaz. Etkili ikna; mesajın ustaca iletilmesini ve kitleye uygun biçimde ayarlanmasını gerektirir. Perakendede ikna etme her düzeyde devrededir: satış danışmanı müşteriye doğru ürünü sunarken, mağaza müdürü bölge müdürüne yeni bir uygulama önerisini savunurken — hepsi ikna becerisini kullanmaktadır.',
  ARRAY['Destek kazanmak için görüş ve argümanlarını kitleye uygun biçimde konumlandırır; tek tip sunmaz','Başkalarını harekete geçmeye ikna eder; fikri onaylatan değil, eylemi başlatan','Zor durumlarda ustaca müzakere eder; çıkmaz sokaklarda yol bulur','İlişkilere zarar vermeksizin tavizler elde eder; kazan-kazan zemini arar','Başkalarının tepkilerine ve tutumlarına etkili biçimde yanıt verir; savunmaya geçmez, diyalog açar'],
  ARRAY['Kendi bakış açısını çok güçlü biçimde dayatır; karşısındaki direnç geliştirmeye başlar','Başkalarından destek ya da bağlılık kazanamaz; fikir kabul görmeden ölür','Herkesi tatmin edecek çözümler müzakere edemez; ya olduğu gibi kabul eder ya da çatışır','Başkalarının tutum ve tepkilerine olumsuz biçimde yanıt verir; itiraz geldiğinde kaybeder','Kendi pozisyonunu destekleyen mantıklı bir argüman oluşturmakta güçlük çeker'],
  ARRAY['Başkalarından bağlılık kazanan ikna edici biçimde fikirlerini paylaşır; dinleyen sadece anlamakla kalmaz, sahiplenir','Ustaca müzakere eder ve mutabık kalınan çözüme doğru ilerlerken minimal gürültü yaratır','Birden fazla paydaşın ihtiyaçlarını karşılayan ortak zemin ve kabul edilebilir alternatifler bulur'],
  ARRAY['Sürekli ikna etmeye çalışmak yorgunluğa yol açar; insanlar her konuşmasının bir ''satış'' olduğunu hisseder','Dinlemek yerine konuşmayı tercih eder; ikna etmek isterken aslında başkasını sessize alır','Aşırı ısrarcı olur; ''hayır'' cevabını kabul etmekte güçlük çeker ve ilişkiyi zorlar'],
  'Mağaza müdürü, mağazanın arka alanının müşteri girişine dönüştürülmesini bölge müdürüne öneriyor. Bölge müdürü başlangıçta kuşkulu. Müdür müşteri trafik verisini sunuyor, iki benzer mağazadaki uygulamadan örnekler gösteriyor, altı ayda geri dönen bir maliyet projeksiyonu çiziyor. Onay geliyor.',
  '''Zor ya da dirençli birini ya da grubu ikna etmek zorunda kaldığın bir durumu anlat. Nasıl hazırlandın? Hangi argümanları kullandın? Direnç geldiğinde ne yaptın? Sonuç ne oldu?''',
  19)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('ts', 'Dijital Yetkinlik', 'Tech Savvy', 'A',
  'İş büyütmeye yönelik dijital ve teknoloji uygulamalarındaki yenilikleri öngörmek ve benimsemek.',
  'Teknoloji, imkânsız görüneni olağan hale getirdi. Bozucu teknolojiler inanılmaz bir hızla pazara giriyor. Dijital yetkinlik artık ''sahip olmak güzel'' değil — ''olmazsa olmaz'' kategorisindedir. Perakendede teknoloji dönüşümü somut ve hızlıdır: POS sistemleri, mobil ödeme, e-ticaret entegrasyonu, müşteri verisi analitik araçları, omnichannel sipariş yönetimi — bunların hepsi gündelik gerçektir. Teknolojiye direnen ya da yavaş adapte olan çalışanlar hem müşteri deneyimini zedeler hem kariyer fırsatlarını kaçırır.',
  ARRAY['Ortaya çıkan teknolojilerin etkisini öngörür ve gerekli uyarlamaları yapar; değişim onu hazırlıksız yakalamaz','İş ya da kişisel performansa fayda sağlayabilecek yeni teknik beceriler ve yetenekler için çevresini tarar','Düşük etkili ya da moda teknolojileri reddeder; her yeniliğe kapılmaz, seçici değerlendirme yapar','Yeni teknolojileri hazır bir şekilde öğrenir ve benimser; adaptasyon süreci kısadır'],
  ARRAY['Temel teknoloji araçlarında deneyimsizdir ya da mevcut uygulamalara o kadar bağlıdır ki yeni teknolojileri benimsemekte isteksizdir','İş değeri katabilecek yeni ya da yenilikçi teknolojileri aramaz; fırsatları kaçırır','Teknoloji değişimini tehdit olarak görür, kolaylaştırıcı olarak değil; direnç gösterir','Sadece bildiği araçları kullanır; öğrenme döngüsünü başlatmakta güçlük çeker'],
  ARRAY['Teknoloji atılımları için çevresini sürekli tarar; erken benimseyenler arasındadır','Kurumsal sonuçları geliştiren mevcut ve yeni teknolojileri hem dener hem uygular','Başkalarının yeni teknolojileri öğrenmesini ve benimsemesini teşvik eder; dijital dönüşümde lokomotif işlevi görür'],
  ARRAY['Her yeni teknolojiyi denemek ister; odak ve öncelik kaybolur, organizasyon ''teknoloji yorgunluğu'' yaşar','Teknoloji çözümüne o kadar odaklanır ki insani boyutu ve süreç gerçekliğini göz ardı eder','Teknolojik yeniliği amacın önüne koyar; ''neden?'' sorusunu sormadan ''nasıl?'' sorusuna atlar'],
  'Mağazaya yeni bir müşteri sadakat uygulaması geliyor. Çoğu çalışan ''bir süre sonra öğrenirim'' diyor. Bir satış danışmanı ise o gün akşam uygulamayı kendi telefonuna indiriyor, müşteri gözünden deneyimliyor ve ertesi gün müşterilere nasıl kullanacaklarını anlatıyor.',
  '''Yeni bir teknoloji, sistem ya da dijital araç öğrenmek zorunda kaldığın bir durumu anlat. Nasıl başladın? Hangi zorluklarla karşılaştın? Bu öğrenme süreci işine nasıl katkı sağladı?''',
  20)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('dq', 'Karar Kalitesi', 'Decision Quality', 'B',
  'Organizasyonun ilerlemesini sağlayacak iyi ve zamanında kararlar almak.',
  'İyi karar almak zorlu olabilir: kısa zaman çerçeveleri, sınırlı bilgi, zor ödünleşimler karşısında cevap bekleyen sabırsız insanlar. İyi kararlar analiz, bilgelik, deneyim ve yargının karışımına dayanır. Sorun şu ki insanlar karar almada pek de iyi değildir — yargı yapma yeteneklerini abartma ve sonuçları tahmin etmede aşırı özgüvenli olma eğilimi taşırlar. Perakendede karar kalitesi hem anlık hem stratejik boyutuyla sürekli gündemdedir. Mağaza müdürü gün içinde onlarca operasyonel karar alır — çoğu eksik bilgiyle.',
  ARRAY['Eksik bilgi karşısında bile sağlam kararlar alır; belirsizlik felç etmez','Karar alırken analiz, bilgelik, deneyim ve yargının karışımına başvurur; tek kaynağa bağlı kalmaz','İlgili tüm faktörleri değerlendirir ve uygun karar alma kriterlerini ve ilkelerini kullanır','Hızlı bir %80 çözümün yeterli olacağını ne zaman fark eder; mükemmeli, iyinin düşmanı yapmaz'],
  ARRAY['Kararlara gelişigüzel yaklaşır ya da karar almayı geciktirir; ''biraz daha bekleyelim'' döngüsüne girer','Eksik veri ya da hatalı varsayımlara dayanarak kararlar alır','Farklı bakış açılarını görmezden gelir ya da uzun vadeli hedefler pahasına kısa vadeli sonuçlara odaklanır','Sonuçları yeterince değerlendirmez; karar alırken ''peki sonra ne olur?'' sorusu sorulmaz'],
  ARRAY['Eksik bilgiye ya da belirsizliğe rağmen kararlı biçimde yüksek kaliteli kararlar alır','Zamanında ve iyi bilgilendirilmiş kararlar almak için ilgili kaynaklardan aktif olarak görüş alır','Görüşleri olgulardan ustalıkla ayırır; neyin veri, neyin yorum, neyin önyargı olduğunu fark eder'],
  ARRAY['Deneyim ve sezginin yeterli olacağı durumlarda bile aşırı titiz ya da metodolojik bir karar süreci uygular','Kararları o kadar çok analiz eder ki zaman ve momentum kaybedilir; analiz felci yaşanır','Her kararda konsensüs arar; bazı durumlar hızlı ve bağımsız karar gerektirir'],
  'Sezonun en yoğun haftasında iki mağazanın aynı anda personel açığı var. Bölge müdürü fazla analiz yapmak yerine şunu soruyor: ''Hangi mağazada müşteri trafiği daha yüksek bu hafta? Hangisinde deneyimli personel var ki kısa süre desteksiz çalışabilsin?'' İki soruyla yeterli bilgiye ulaşıyor.',
  '''Eksik bilgiyle ya da baskı altında önemli bir karar almak zorunda kaldığın bir durumu anlat. Nasıl düşündün? Hangi faktörleri değerlendirdin? Sonuç ne oldu?''',
  21)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('op', 'Süreç Optimizasyonu', 'Optimizes Work Processes', 'B',
  'İşleri tamamlamanın en etkili ve verimli yollarını bilmek; sürekli iyileştirme odağıyla çalışmak.',
  'Harika süreçler işi basitleştirir. İletişimi akıcı hale getirir. Maliyetleri düşürür ve verimliliği artırır. Rasyonalize edilmiş süreçler; kalite, müşteri memnuniyeti, satış ve kârlılık üzerinde iyileşmeler sağlar. Perakendede süreç optimizasyonu; stok alım akışından müşteri iade sürecine, vardiya devir tesliminden kasa kapanış prosedürlerine kadar uzanır. Verimsiz bir süreç sessizce büyük maliyetler üretir: zaman kaybı, hata, müşteri hayal kırıklığı ve personel yorgunluğu. Süreci göremeyen lider, fırsatı göremeyen liderdir.',
  ARRAY['İşi tamamlamak için gerekli süreçleri tanımlar ve oluşturur; belirsizlik içinde çalışmaz','Faaliyetleri verimli iş akışlarına göre ayırır ve birleştirir; hangi adımın nereye gittiğini bilir','Uzaktan yönetimi mümkün kılan süreç ve prosedürler tasarlar; her şeyi kendisi kontrol etmek zorunda kalmaz','Küçük ince ayarlardan tam yeniden mühendisliğe kadar süreçleri iyileştirmenin yollarını arar'],
  ARRAY['Dağınık bir şekilde çalışır; işleri örgütlemekte güçlük çeker','İyileştirmeye odaklanmaz; ''hep böyle yapıldı'' anlayışıyla yetinir','Şeyleri sistemler açısından düşünmez; bir değişikliğin diğer adımları nasıl etkilediğini görmez','İşleri tamamlamak için etkili ve verimli süreçleri bulmakta güçlük çeker','Mevcut süreçleri olduğu gibi kabul eder; süreç iyileştirmesine çok az dikkat eder'],
  ARRAY['En kritik süreçlere odaklanır, daha az önemli görevleri bir kenara bırakabilir; öncelik sezgisi güçlüdür','Kaynakları tam olarak tahsis eden uygulama planları hazırlar','Engelleri öngörür ve mükemmel acil durum planları hazırlar; ''bu adım bozulursa ne olur?'' sorusu sürekli gündemdedir'],
  ARRAY['Sürece o kadar odaklanır ki insanı ve esnekliği gözden kaçırır; her durum bir prosedür haline gelir','Küçük sorunları büyük ve resmi süreç güncellemeleriyle çözer; orantısız tepki verir','Değişmeyen bir süreç takıntısıyla koşulların gerektirdiği anlık adaptasyona direnç gösterir'],
  'Stok sorumlusu, ürünlerin raftan çekildikten sonra sisteme girilmesinin bazen bir-iki gün geciktiğini fark ediyor. Satış danışmanları stokta olmayan ürünü satıyor, müşteri hayal kırıklığı yaşıyor, iadeler artıyor. Sorunu rapor etmek yerine süreci değiştiriyor: çekimler gerçek zamanlı sisteme giriyor. İki hafta içinde iade yüzde kırk düşüyor.',
  '''Verimsiz bir süreci fark edip iyileştirdiğin bir durumu anlat. Sorunu nasıl tespit ettin? Ne değiştirdin? Hangi dirençle karşılaştın? Sonuç ne oldu?''',
  22)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('bs', 'Paydaş Dengeleme', 'Balances Stakeholders', 'B',
  'Birden fazla paydaşın ihtiyaçlarını öngörmek ve dengelemek.',
  'Bir paydaş, meşru bir iddiaya ya da ''paya'' sahip olan kişi ya da gruptur. Değer yaratan herhangi bir şeyi gerçekleştirmek artık tek başına bir iş değildir. Paydaşlar herhangi bir strateji, girişim veya projenin başarısı için kritiktir. Savunucunuz olabileceği gibi kolayca engelleyicinize de dönüşebilirler. Perakendede üst seviyeli rollerde paydaş çeşitliliği belirginleşir. Bölge müdürü; merkez, mağaza müdürleri, tedarikçiler, müşteriler ve İK ekibi gibi birbirinden farklı önceliklere sahip grupları aynı anda yönetmek zorundadır.',
  ARRAY['İç ve dış paydaşların gereksinimlerini, beklentilerini ve ihtiyaçlarını anlar; kimsenin ne istediğini bilir','Birden fazla paydaşın çıkarlarını dengeler; tek taraflı karar vermez','Karar alma sürecinde kültürel ve etik faktörleri göz önünde bulundurur','Paydaş taleplerinin çatıştığı durumlarda adil davranır; basınç altında denge korunur'],
  ARRAY['Sınırlı sayıda paydaşın mevcut beklentilerini karşılamaya odaklanır; görünür olanı görür, arka planda bekleyeni görmez','Bazı paydaşların çıkarlarını diğerlerinden daha güçlü biçimde gözetir; örtük bir hiyerarşi oluşturur','Çatışan paydaş taleplerinin eylemlerini adaletsiz biçimde etkilemesine izin verir','Paydaş haritasını çıkarmaz; kimin neye ihtiyacı olduğunu sistematik biçimde düşünmez'],
  ARRAY['Tüm paydaşların örgütsel hedeflere ve kendi beklentilerine ulaşması için iletişim süreçlerini korur','Güvenilirliğini ve itibarını korumak için tüm paydaşlarla tutarlı bir yaklaşım ve takip sağlar','İhtiyaçları çatışan paydaşlar arasında güven inşa eder ve sürdürür; tarafsızlığı için saygı görür'],
  ARRAY['Herkesi memnun etmeye çalışırken hiç kimseyi gerçekten tatmin etmez; net duruş bulanıklaşır','Konsensüs aramak bazı durumlarda karar hızını ve netliğini zayıflatır','Denge kaygısıyla kendi görüşünü ve yargısını sürekli arka plana iter; liderlik inisiyatifi kaybolur'],
  'Bölge direktörü, üç mağazanın vardiya planlamasını değiştirmek istiyor. Merkez maliyet azaltması istiyor, mağaza müdürleri operasyonel etki konusunda endişeli, çalışanlar iş güvencesinden kaygılı. Direktör her grupla ayrı ayrı konuşuyor. Herkes her istediğini almıyor — ama herkes duyulduğunu hissediyor.',
  '''Farklı çıkarlara sahip birden fazla paydaşı aynı anda yönetmek zorunda kaldığın bir durumu anlat. Çatışan beklentileri nasıl dengeledi? Sonuç ne oldu?''',
  23)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('at', 'Yetenek Çekme', 'Attracts Top Talent', 'B',
  'Mevcut ve gelecekteki iş ihtiyaçlarını karşılayacak en iyi yetenekleri çekmek ve seçmek.',
  'Organizasyonlar yetenekle dolu olması gerekir. Pek çok organizasyon için bu, organizasyonel performansın tek en büyük sürücüsüdür. Doğru kişiler, doğru becerilerle, doğru yerde ve doğru zamanda olduğunda hedeflere ulaşmak çok daha kolaydır. Perakendede yetenek çekme hem acil hem stratejik bir zorunluluktur. Sektörün en büyük zorluklarından biri olan yüksek turnover, yetenekli insanları tanımlama ve çekme kapasitesini sürekli sınayıcı kılar.',
  ARRAY['Çeşitli ve yüksek kalibreli yetenekleri çeker ve seçer; benzerlikten değil, tamamlayıcılıktan hareketle karar alır','Grubun ihtiyaçlarını karşılayacak doğru yeteneği bulur; neyin eksik olduğunu bilir','Yetenek boşluklarını iç ve dış adayların doğru dengesiyle kapatır; tek kanala bağımlı kalmaz','Yeteneği değerlendirmede güçlü bir yargı kapasitesine sahiptir; potansiyeli performanstan önce görür','İşe alım kararlarını kurumun değerleri ve uzun vadeli hedefleriyle hizalar'],
  ARRAY['Şirketin neye ihtiyaç duyduğunu anlamaz; yetenek boşluklarının farkında değildir','Organizasyona gelişigüzel yetenek seçer; değerlendirme kriteri belirsiz ya da tutarsızdır','Rolü ya da organizasyonu doldurmak için yetenekle eşleştirme konusunda çok az adım atar','İşe alım ya da kadrolama için seçim kriterleri konusunda belirsizdir','Gelişmemiş sezgiye aşırı güvenir; yapılandırılmış değerlendirme yerine ''içgüdü'' ile karar alır'],
  ARRAY['Çeşitli kanallar aracılığıyla aktif olarak yetenek arar; pozisyon açılmadan önce havuz oluşturur','Yetenekleri değerlendirmede güçlü ve özgün bir bakış açısı geliştirir; derinlikli gözlemle karar alır','İşe alım kararlarını yalnızca mevcut rolün değil, geleceğin gereksinimlerine göre alır'],
  ARRAY['İşe alıma o kadar odaklanır ki mevcut ekibi geliştirmeyi göz ardı eder','Değerlendirme kriterlerine aşırı bağlılık, iyi adayların kaçırılmasına yol açar','Her pozisyon için ''en iyisini'' ararken gereğinden uzun süre bekler; pratiklik ve zamanlamanın değerini küçümser'],
  'Bölge İK iş ortağı, mağaza müdür pozisyonu için iki aday değerlendiriyor. Birincisi CV''si mükemmel, deneyimi zengin. İkincisi daha az deneyimli ama müşteri odaklılık ve ekip motivasyonu konusundaki yanıtları çok güçlü. İK iş ortağı ikinci adayı tercih ediyor: ''Bu mağazanın şu an ihtiyacı olan şey deneyim değil, ekip dinamiğini dönüştürecek biri.''',
  '''İşe aldığın ya da seçtiğin ve zamanla gerçekten doğru tercih olduğunu kanıtlayan biriyle deneyimini anlat. Onu seçerken neyi gördün? O deneyim yetenek değerlendirme anlayışını nasıl şekillendirdi?''',
  24)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('bi', 'İş Anlayışı', 'Business Insight', 'B',
  'İş dünyası ve pazar hakkındaki bilgiyi organizasyonun hedeflerini ilerletmek için uygulamak.',
  'Alanı tanımak zorundasınuz. Olan biteni bilmek, güvenilirlik geliştirmenin temel taşıdır. İnsanların iki yol üzerinden içgörü geliştirmesi gerekir. Birincisi kendi sektörlerine dikkat etmeleri, kendi fonksiyonel alanlarında uzmanlık inşa etmeleri, organizasyonlarındaki departmanların nasıl çalıştığını anlamaları gerekir. İkincisi dışarıya bakmak. Rekabeti ve müşterileri öğrenmek. Trendleri belirlemek. Perakendede iş anlayışı; sektörün dinamiklerini, rakiplerin stratejilerini, müşteri davranış değişimlerini anlayabilmektir.',
  ARRAY['İşlerin nasıl yürüdüğünü ve organizasyonların nasıl para kazandığını bilir; iş modelini içselleştirmiştir','Organizasyondaki, rekabetteki ve pazardaki mevcut ve olası gelecek politikaları, uygulamaları ve trendleri takip eder','Stratejilerin ve taktiklerin pazarda nasıl işlediğine dair iş sürücüleri bilgisini eylemlere rehberlik etmek için kullanır','Kendi sektörünün ve organizasyonunun güçlü ve zayıf yönlerini, fırsatlarını ve tehditlerini anlayarak çalışır'],
  ARRAY['İşlerin nasıl yürüdüğünü anlamaz; temel iş kavramları belirsizdir','Organizasyonu ve rekabeti etkileyen mevcut ve gelecek trendlerle güncel değildir','Stratejilerin ve taktiklerin pazarda nasıl işlediğinden habersizdir; kararlar bağlam olmadan alınır','Planlama ve yürütmesinde iş sürücülerini dikkate almaz; operasyonel düşünce stratejik boyutu gölgeler'],
  ARRAY['İşlerin nasıl yürüdüğünü ve nasıl para kazanıldığını derinlemesine anlar','Organizasyondaki, rekabetteki ve pazardaki olası gelecek politikaları ve trendleri ilk fark edenler arasındadır','Eylemleri önceliklendirirken tutarlı biçimde iş sürücüleri ve pazar odaklı bir bakış açısı uygular'],
  ARRAY['İş bilgisini kısa vadeli finansal kazanımlar için kullanır; uzun vadeli değer yaratmayı göz ardı eder','Sektör uzmanlığına o kadar güvenir ki dışarıdan gelen yeni fikirlere kapalı hale gelir','''İş böyle işler'' bilgisi konformizme dönüşür; statükoyu sorgulamak yerine meşrulaştırır'],
  'Mağaza müdürü, kasım ayının sonunda rakip mağazanın Aralık kampanyasını erkenden ilan ettiğini fark ediyor. Bunu sadece not etmekle kalmıyor — kendi mağazası için ne anlama geldiğini analiz ediyor, bölge müdürüne proaktif bir not gönderiyor ve kendi Aralık taktiğini bir hafta öne çekiyor.',
  '''Sektörü ya da pazarı yakından takip ederek bir fırsatı ya da tehdidi erken fark ettiğin ve buna göre harekete geçtiğin bir durumu anlat. Sinyali nasıl gördün? Ne yaptın? Sonuç ne oldu?''',
  25)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('cu', 'Cesaret', 'Courage', 'C',
  'Zorlu durumlarda bile doğru olanı söylemek ve yapmak için adım atmak; belirsizlik ve baskı altında ilkelerinden taviz vermemek.',
  'Cesaret; korku yokluğu değil, korku olmasına rağmen hareket etmektir. Organizasyonlarda gerçek cesaret; zor gerçekleri söylemek, olumsuz geri bildirimi vermek, popüler olmayan ama doğru olan kararları almak ve sistemin baskısı altında ilkelerden taviz vermemek biçiminde tezahür eder. Cesaret olmadan bilgi gizlenir, kritik geribildirim verilmez, kötü kararlar sorgulanmaz ve organizasyon yavaş yavaş kör noktalarla dolar. Perakendede bölge ve üzeri seviyelerde cesaret, liderliğin en belirleyici boyutlarından biridir.',
  ARRAY['Durumun gerektirdiği zor adımları atar; gerginlik veya belirsizlik karşısında hareketsiz kalmaz','Zor, dolaylı ya da nahoş mesajları doğrudan iletir; gerçekten kaçınmaz','Yüksek baskı altında bile net duruş sergiler; koşullara göre yön değiştirmez','Zor kararları almak için gerekli cesareti gösterir; popülerlik değil, doğruluk rehber olur','Etik dışı ya da değerlere aykırı durumlara karşı açıkça durur'],
  ARRAY['Zor mesajları iletmekten kaçınır; çatışmayı görmezden gelmeyi ya da kendiliğinden düzeleceğini ummayı tercih eder','Yüksek baskı altında tutumunu değiştirir; güçlü bir sesle yönlendirilebilir','Kendi görüşünü söylemek yerine odadaki hâkim görüşe uyum sağlar; gerçek düşüncesini saklar','Eleştiriyle ya da olumsuz tepkiyle karşılaşabileceği durumlarda önerisini geri çeker'],
  ARRAY['Direniş ya da eleştiriyle karşılaşsa bile doğru olduğuna inandığı şeyi savunur; ısrar eder','Başkalarının zorlu konuşmalar yapmasına ve zor adımlar atmasına model olur; organizasyonda cesaret kültürü yaratır','Organizasyonun kör noktalarını cesaretle dile getirir; kimsenin söylemek istemediğini söyler'],
  ARRAY['O kadar doğrudan ve cesurdur ki başkalarının bakış açısını yeterince dinlemez; baskın duruş diyaloğun önüne geçer','''Ben haklıyım'' kesinliği esnek düşünme kapasitesini daralır','Diplomatik hassasiyeti ihmal eder; doğruyu söylemek ilişkiyi zorunlu olmadan zedeler'],
  'Bölge direktörü, merkez tarafından önerilen bir mağaza kapanma kararının bölge için yanlış olduğuna inanıyor. Kapsamlı bir analiz hazırlıyor ve üst yönetime sunuyor: ''Bu karar kısa vadede maliyet azaltır ama bölgenin uzun vadeli büyüme kapasitesini zedeler.'' Karar değişebilir de değişmeyebilir de. Ama söylenmesi gereken söylenmiştir.',
  '''Popüler ya da kolay olmayan ama doğru olduğuna inandığın bir şeyi savunduğun bir durumu anlat. Karşılaştığın baskı ya da direnç neydi? Sonuç ne oldu?''',
  26)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('cx', 'Karmaşıklık Yönetimi', 'Manages Complexity', 'C',
  'Çelişkili ve eksik bilgiden bile anlamlı anlayış üretmek; karmaşık sorunları etkili biçimde çözmek.',
  'Organizasyonlar giderek daha karmaşık hale geliyor. Veri bolluğu, çakışan öncelikler, belirsiz nedensellik ilişkileri ve hızla değişen koşullar — bunların tümü liderlik kararlarının arka planını oluşturuyor. Karmaşıklıkla yüzleşmek; elinizdeki tüm bilgiyi toplamak, çelişkili sinyalleri okumak, neyin önemli neyin gürültü olduğunu ayırt etmek ve tüm bunların ortasında net bir anlayışa ulaşmak demektir. Bölge düzeyinde ve üzerinde perakende yöneticileri onlarca mağaza, yüzlerce çalışan, farklı pazar koşulları ve çakışan iş öncelikleriyle aynı anda başa çıkmak zorundadır.',
  ARRAY['Belirsiz, çelişkili ve eksik bilgiden bile anlamlı içgörü çıkarır; sinyali gürültüden ayırır','Karmaşık sorunları sistematik biçimde ele alır; parçaları görür, bütünü kaybetmez','Çok sayıda değişkeni ve perspektifi göz önünde bulundururken pratik kararlar alır','Karmaşık durumları başkalarına anlaşılır biçimde açıklar; netlik yaratır, karmaşıklığı büyütmez','Belirsizlik içinde çalışır; tüm bilgi gelene kadar beklemez'],
  ARRAY['Birden fazla boyutu olan sorunları ele almakta güçlük çeker','Bilgi belirsiz ya da eksikken karar almaktan kaçınır; netlik gelmesini bekler','Bütünü görmek yerine parçalara takılır; sistemik düşünme eksiktir','Karmaşıklığı daha da karmaşık hale getirir; netlik üretmek yerine belirsizliği artırır'],
  ARRAY['Geniş bir bağlamsal analiz yapar; çok sayıda faktörü ve bakış açısını göz önünde bulundururken pratik kararlar alabilir','Yüksek belirsizlik ortamında bile net bir anlayışa ulaşır; belirsizlik onun için sorun değil, çalışma ortamıdır','Karmaşıklığı yönetmekle kalmaz, başkalarına da bu ortamda nasıl hareket edileceğini öğretir'],
  ARRAY['Her soruna karmaşıklık gözüyle bakar; basit sorunları gereksiz yere derinleştirir','Kapsamlı analiz arayışı karar hızını yavaşlatır; bazen hızlı ve yeterli bir yanıt, mükemmel ama geç bir yanıttan çok daha değerlidir','Başkalarını karmaşıklığın içine çeker; yönetmek yerine karmaşıklığa ortak eder'],
  'Bölge direktörü, üç mağazanın aynı anda performans sorununu raporluyor. İlk bakışta benzer görünüyor — satışlar düşük. Ama direktör her mağazanın verisini derinlemesine inceliyor: biri personel sorunuyla, biri lokasyon değişikliğinin etkisiyle, biri fiyatlandırma stratejisiyle boğuşuyor. Üçü için tek bir çözüm üretmek yerine üç farklı müdahale planlıyor.',
  '''Birden fazla değişken ve belirsizlik içeren karmaşık bir sorunu çözmek zorunda kaldığın bir durumu anlat. Soruna nasıl yaklaştın? Kararı nasıl aldın? Sonuç ne oldu?''',
  27)
ON CONFLICT (code) DO NOTHING;

INSERT INTO competency_definitions (code, name_tr, name_en, tier, definition, why_critical, skilled, less_skilled, highly_skilled, overused, retail_example, interview_question, sort_order)
VALUES ('sa', 'Uyum Sağlama', 'Situational Adaptability', 'C',
  'İletişim tarzını, yaklaşımını ve çalışma biçimini koşullara ve kişilere göre aktif olarak uyarlamak.',
  'Her durum farklı bir yanıt gerektirir. Her insan farklı bir dil ister. Uyum sağlama yetkinliği; durumu doğru okumak, bu okumayla ne yapılması gerektiğini anlamak ve davranışı buna göre ayarlamaktır. Bu; karizmasız olmak ya da karaktersiz olmak değildir — tam tersine, yeterince özgüvenli olmak ki her durumda doğru olanı yapabilmek. Perakendede uyum sağlama günlük gerçektir. Sabahın ilk müşterisi aceleci ve bilgili, öğleden sonraki müşteri isteksiz ve kararsız. Durumu okuyup yanıtı ayarlayan kişi hem daha etkili hem daha güvenilir hem de daha sürdürülebilir bir performans sergiler.',
  ARRAY['Durumu ve kitleyi aktif olarak okur; aynı anda hem içeriği hem bağlamı değerlendirir','Tarzını ve yaklaşımını koşullara göre ayarlar; her duruma aynı tepkiyle girmez','Değişen önceliklere, koşullara ve insanlara uyarlanabilir; esneklik bir güçtür','Farklı bireylerin ihtiyaçlarını ve motivasyonlarını okur; herkese ''özel'' hissettiren bir etkileşim kurar','Beklenmedik değişiklikler karşısında sakinliğini ve etkinliğini korur'],
  ARRAY['Her duruma aynı yaklaşımla girer; durum, kişi ya da bağlam fark etmeksizin tek bir tarz kullanır','Koşullar değiştiğinde hızla adapte olmakta güçlük çeker; değişime geç tepki verir','Farklı kişilerin ihtiyaçlarını ve motivasyonlarını okumaz; ''herkes benim gibi düşünür'' varsayımıyla hareket eder','Beklenmedik durumlar karşısında sarsılır; plan bozulunca etkinliği düşer'],
  ARRAY['Durumu gerçek zamanlı okur ve yaklaşımını anlık olarak ayarlar; geri bildirim döngüsü çok kısadır','Çok farklı bağlamlarda eşit etkinlikte çalışır; hem rutin hem kriz hem de büyüme ortamlarında verimli','Başkalarının da uyum kapasitesini geliştirmesine yardımcı olur; esnekliği örnek olarak gösterir'],
  ARRAY['Aşırı uyum sağlama tutarsız görünebilir; insanlar ''bu kişinin gerçek tutumu ne?'' diye merak eder','Her koşula adapte olma girişimi otantiklik kaybına yol açabilir; kimlik ve duruş bulanıklaşır','Bazı durumlar tutarlılık ve öngörülebilirlik gerektirir; uyum sağlamak her zaman cevap değildir'],
  'Kat müdürü, yeni işe giren bir satış danışmanına sabırlı rehberlik sunuyor — sorularını karşılıyor, adım adım açıklıyor. Aynı gün kıdemli bir danışmanla konuşurken tonu ve üslubu tamamen değişiyor — eşit saygıyla, daha az açıklama yaparak, daha fazla soru sorarak.',
  '''Alışılageldik yaklaşımının işe yaramadığını fark ettiğin ve tarzını ya da stratejini ortada değiştirmek zorunda kaldığın bir durumu anlat. Ne fark ettin? Ne değiştirdin? Sonuç ne oldu?''',
  28)
ON CONFLICT (code) DO NOTHING;

-- ═══ role_competency_map (~200 rows) ═══

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasiyer', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasiyer', 'it', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasiyer', 'ea', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasiyer', 'ce', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasiyer', 'br', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Danışmanı', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Danışmanı', 'ce', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Danışmanı', 'it', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Danışmanı', 'co', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Danışmanı', 'ao', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'ce', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'it', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'co', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'is', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kıdemli Satış Dan.', 'nl', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Görsel Satış Uzm.', 'ci', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Görsel Satış Uzm.', 'pa', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Görsel Satış Uzm.', 'cf', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Görsel Satış Uzm.', 'sa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Görsel Satış Uzm.', 'ao', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Display Uzmanı', 'ci', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Display Uzmanı', 'pa', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Display Uzmanı', 'ao', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Display Uzmanı', 'cf', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Display Uzmanı', 'nl', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Stok Sorumlusu', 'ea', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Stok Sorumlusu', 'op', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Stok Sorumlusu', 'pa', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Stok Sorumlusu', 'co', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Stok Sorumlusu', 'dq', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'ea', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'dw', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'it', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kasa Sorumlusu', 'ce', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'ci', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'pa', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'co', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'cf', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'sa', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Koordinatörü', 'ea', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Onboarding Uzmanı', 'ce', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Onboarding Uzmanı', 'is', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Onboarding Uzmanı', 'co', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Onboarding Uzmanı', 'cf', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Onboarding Uzmanı', 'nl', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'pe', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'bi', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'ce', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'is', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Satış Uzmanı', 'dr', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'bi', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'ce', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'ts', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'nl', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ürün Uzmanı', 'pe', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'ts', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'sa', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'ce', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'bi', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'co', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Omni-Channel Satış', 'dr', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'op', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'dq', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'ea', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'pa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Envanter Uzmanı', 'bi', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'dt', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'ce', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'nl', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'co', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'de', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Uzmanı', 'pa', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'dt', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'is', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'de', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'ce', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Koçu', 'cf', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'at', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'is', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'ce', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'dq', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İşe Alım Uzmanı', 'pe', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'ts', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'bi', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'ce', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'dq', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('CRM Uzmanı', 'pa', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'cf', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'dw', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'mc', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'ea', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'ao', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'co', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Kat Müdürü', 'ce', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'ea', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'de', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'pa', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'cf', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'dw', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'mc', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'co', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdür Yrd.', 'dr', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'ci', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'sm', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'dw', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'pa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'cf', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'co', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('VM Müdürü', 'dr', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'dt', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'ce', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'de', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'pa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'dw', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Eğitim Müdürü', 'ea', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'op', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'dw', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'pa', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'ea', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'dq', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'co', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'bi', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Operasyon Müdürü', 'dr', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'at', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'dt', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'ce', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'bs', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'is', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'mc', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK İş Ortağı', 'dq', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'ea', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'dr', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'dw', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'bt', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'cf', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'dt', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'co', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'fa', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Mağaza Müdürü', 'de', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'sm', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'it', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'de', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'cf', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'dr', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'bt', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'co', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'cu', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Store Leader', 'ea', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'dr', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'ea', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'dt', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'sm', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'cf', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'bt', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'pa', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'de', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'co', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Müdürü', 'fa', 9)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'op', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'pa', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'ea', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'dr', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'cx', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'dw', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'dq', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'co', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Operasyon Müd.', 'fa', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'ci', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'sm', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'dw', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'pa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'cf', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'pe', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'dr', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'co', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Görsel Müdürü', 'bs', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'dr', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'cf', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'pe', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'de', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'bt', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'bi', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'pa', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'co', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Satış Müdürü', 'fa', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'sm', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'cu', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'ea', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'bs', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'bt', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'dr', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'co', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'fa', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'dt', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Bölge Direktörü', 'cx', 9)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'sm', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'cu', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'ea', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'bs', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'bt', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'dr', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'co', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'fa', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'dt', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'cx', 9)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Müdürü', 'de', 10)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'at', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'bt', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'is', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'ea', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'co', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'mc', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'bs', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'ce', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('İK Müdürü', 'sm', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;

INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'dt', 0)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'sm', 1)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'ce', 2)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'pa', 3)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'de', 4)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'bt', 5)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'dr', 6)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'co', 7)
ON CONFLICT (role_name, competency_code) DO NOTHING;
INSERT INTO role_competency_map (role_name, competency_code, sort_order)
VALUES ('Ülke Eğitim Müdürü', 'bs', 8)
ON CONFLICT (role_name, competency_code) DO NOTHING;
