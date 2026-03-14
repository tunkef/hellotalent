// ── 81 IL VERISI ──
const TUR_ILLER = {
  'Marmara': ['\u0130stanbul','Bursa','Kocaeli','Sakarya','Tekirda\u011f','Edirne','K\u0131rklareli','Bal\u0131kesir','\u00c7anakkale','Yalova','Bilecik'],
  'Ege': ['\u0130zmir','Manisa','Ayd\u0131n','Denizli','Mu\u011fla','Afyonkarahisar','K\u00fctahya','U\u015fak'],
  '\u0130\u00e7 Anadolu': ['Ankara','Konya','Eski\u015fehir','Kayseri','Sivas','Yozgat','K\u0131r\u0131kkale','Aksaray','Ni\u011fde','Nev\u015fehir','K\u0131r\u015fehir','Karaman','\u00c7ank\u0131r\u0131'],
  'Karadeniz': ['Samsun','Trabzon','Ordu','Giresun','Rize','Artvin','Bolu','D\u00fczce','Zonguldak','Bart\u0131n','Karab\u00fck','Kastamonu','Sinop','Amasya','Tokat','G\u00fcm\u00fc\u015fhane','Bayburt'],
  'Akdeniz': ['Antalya','Mersin','Adana','Hatay','Kahramanmara\u015f','Osmaniye','Isparta','Burdur'],
  'Do\u011fu Anadolu': ['Erzurum','Malatya','Van','Elaz\u0131\u011f','Erzincan','A\u011fr\u0131','Kars','I\u011fd\u0131r','Ardahan','Mu\u015f','Bitlis','Hakkari','Bing\u00f6l','Tunceli'],
  'G\u00fcneydo\u011fu Anadolu': ['Gaziantep','Diyarbak\u0131r','\u015eanl\u0131urfa','Mardin','Batman','Siirt','\u015e\u0131rnak','Ad\u0131yaman','Kilis']
};

const ILCELER = {
  '\u0130stanbul':['Be\u015fikta\u015f','Beyo\u011flu','\u015ei\u015fli','Sar\u0131yer','Ka\u011f\u0131thane','Fatih','Ey\u00fcpsultan','Zeytinburnu','Bak\u0131rk\u00f6y','Bah\u00e7elievler','Ba\u011fc\u0131lar','G\u00fcng\u00f6ren','Esenler','Gaziosmanpa\u015fa','Sultangazi','Arnavutk\u00f6y','Ba\u015fak\u015fehir','Esenyurt','Avc\u0131lar','K\u00fc\u00e7\u00fck\u00e7ekmece','Bayrampa\u015fa','Kad\u0131k\u00f6y','Ata\u015fehir','\u00dcsk\u00fcdar','Maltepe','Kartal','Pendik','Tuzla','Sancaktepe','Sultanbeyli','\u00dcmraniye','\u00c7ekmeky','Beykoz','Adalar','Silivri','B\u00fcy\u00fck\u00e7ekmece','\u00c7atalca','\u015eile'],
  'Ankara':['\u00c7ankaya','Ke\u00e7i\u00f6ren','Yenimahalle','Mamak','Etimesgut','Alt\u0131nda\u011f','Sincan','Pursaklar','G\u00f6lba\u015f\u0131','Polatl\u0131','Kazan'],
  '\u0130zmir':['Konak','Kar\u015f\u0131yaka','Bornova','Bayrakl\u0131','Karaba\u011flar','Buca','\u00c7i\u011fli','Gaziemir','Bal\u00e7ova','Narl\u0131dere','G\u00fczelbah\u00e7e','Menemen','Alia\u011fa','Fo\u00e7a','Bergama','\u00d6demi\u015f','Tire','Torbal\u0131','Sel\u00e7uk'],
  'Bursa':['Osmangazi','Nil\u00fcfer','Y\u0131ld\u0131r\u0131m','G\u00f6r\u00fckle','Mudanya','Gemlik','\u0130neg\u00f6l'],
  'Antalya':['Muratpa\u015fa','Kepez','Konyaalt\u0131','Alanya','Manavgat','Serik'],
  'Adana':['Seyhan','\u00c7ukurova','Y\u00fcre\u011fir','Sar\u0131\u00e7am','Ceyhan','Kozan'],
  'Konya':['Sel\u00e7uklu','Karatay','Meram','Ere\u011fli','Ak\u015fehir'],
  'Gaziantep':['\u015eahinbey','\u015eehitkamil','Nizip'],
  'Mersin':['Yeni\u015fehir','Toroslar','Mezitli','Akdeniz','Tarsus','Erdemli'],
  'Kayseri':['Kocasinan','Melikgazi','Talas'],
  'Eski\u015fehir':['Tepeba\u015f\u0131','Odunpazar\u0131'],
  'Kocaeli':['\u0130zmit','K\u00f6rfez','Gebze','Dar\u0131ca','\u00c7ay\u0131rova'],
  'Sakarya':['Adapazar\u0131','Serdivan','Erenler'],
  'Tekirda\u011f':['S\u00fcleymanpa\u015fa','\u00c7erkezk\u00f6y','\u00c7orlu','Kapakl\u0131'],
  'Diyarbak\u0131r':['Ba\u011flar','Kayap\u0131nar','Sur','Yeni\u015fehir'],
  'Hatay':['Antakya','\u0130skenderun','Defne'],
  'Trabzon':['Ortahisar','Ak\u00e7aabat'],
  'Samsun':['Atakum','Canik','\u0130lkad\u0131m'],
  'Malatya':['Battalgazi','Ye\u015filyurt'],
  '\u015eanl\u0131urfa':['Eyy\u00fcbiye','Haliliye','Karak\u00f6pr\u00fc'],
  'Van':['\u0130pekyolu','Edremit','Tu\u015fba']
};

// ── BRAND DATABASE ──
var BRAND_DB=[
  {name:'Zara',parent:'\u0130nditex'},{name:'Massimo Dutti',parent:'\u0130nditex'},{name:'Bershka',parent:'\u0130nditex'},{name:'Pull & Bear',parent:'\u0130nditex'},{name:'Stradivarius',parent:'\u0130nditex'},{name:'Oysho',parent:'\u0130nditex'},{name:'Zara Home',parent:'\u0130nditex'},{name:'\u0130nditex',parent:''},
  {name:'H&M',parent:'H&M Group'},{name:'COS',parent:'H&M Group'},{name:'& Other Stories',parent:'H&M Group'},{name:'Arket',parent:'H&M Group'},{name:'Monki',parent:'H&M Group'},
  {name:'Louis Vuitton',parent:'LVMH'},{name:'Dior',parent:'LVMH'},{name:'Sephora',parent:'LVMH'},{name:'Fendi',parent:'LVMH'},{name:'Givenchy',parent:'LVMH'},{name:'Celine',parent:'LVMH'},{name:'Loewe',parent:'LVMH'},{name:'Marc Jacobs',parent:'LVMH'},{name:'Tiffany & Co.',parent:'LVMH'},
  {name:'Gucci',parent:'Kering'},{name:'Saint Laurent',parent:'Kering'},{name:'Balenciaga',parent:'Kering'},{name:'Bottega Veneta',parent:'Kering'},{name:'Alexander McQueen',parent:'Kering'},
  {name:'Gap',parent:'Fiba Retail'},{name:'Banana Republic',parent:'Fiba Retail'},{name:'Marks & Spencer',parent:'Fiba Retail'},{name:'Fiba Retail',parent:''},{name:'Eataly',parent:'Fiba Retail'},
  {name:'Nike',parent:''},{name:'Adidas',parent:''},{name:'Puma',parent:''},{name:'New Balance',parent:''},{name:'Under Armour',parent:''},{name:'Reebok',parent:''},
  {name:'Uniqlo',parent:'Fast Retailing'},{name:'GU',parent:'Fast Retailing'},
  {name:'LC Waikiki',parent:'LC Waikiki'},{name:'DeFacto',parent:''},{name:'Koton',parent:''},{name:'Mavi',parent:''},{name:'Boyner',parent:'Boyner Group'},{name:'Vakko',parent:''},{name:'Beymen',parent:''},{name:'Ipekyol',parent:''},
  {name:'Colin\'s',parent:''},{name:'Network',parent:''},{name:'Twist',parent:''},{name:'Machka',parent:''},{name:'Roman',parent:''},
  {name:'Burberry',parent:''},{name:'Prada',parent:''},{name:'Miu Miu',parent:'Prada Group'},{name:'Versace',parent:'Capri Holdings'},{name:'Michael Kors',parent:'Capri Holdings'},{name:'Jimmy Choo',parent:'Capri Holdings'},
  {name:'Chanel',parent:''},{name:'Hermes',parent:''},{name:'Cartier',parent:'Richemont'},{name:'Montblanc',parent:'Richemont'},
  {name:'Apple',parent:''},{name:'Samsung',parent:''},{name:'MediaMarkt',parent:'Ceconomy'},{name:'Teknosa',parent:'Sabanc\u0131 Holding'},{name:'Vatan Bilgisayar',parent:''},
  {name:'Migros',parent:''},{name:'CarrefourSA',parent:''},{name:'B\u0130M',parent:''},{name:'A101',parent:''},{name:'\u015eOK',parent:''},{name:'Gratis',parent:''},{name:'Watsons',parent:'AS Watson'},
  {name:'MAC',parent:'Estee Lauder'},{name:'Estee Lauder',parent:''},{name:'L\'Oreal',parent:''},{name:'Yves Rocher',parent:''},{name:'The Body Shop',parent:''},
  {name:'IKEA',parent:'Ingka Group'},{name:'Kocta\u015f',parent:''},{name:'English Home',parent:''},
  {name:'Decathlon',parent:''},{name:'Levi\'s',parent:''},{name:'Tommy Hilfiger',parent:'PVH'},{name:'Calvin Klein',parent:'PVH'},{name:'Ralph Lauren',parent:''},{name:'Lacoste',parent:''},
  {name:'Mango',parent:''},{name:'Superdry',parent:''},{name:'The North Face',parent:'VF Corp'},{name:'Timberland',parent:'VF Corp'},{name:'Vans',parent:'VF Corp'},
  {name:'Starbucks',parent:''},{name:'Amazon',parent:''}
];

// ── UNIVERSITE DATABASE ──
var UNIVERSITE_DB=[
  {name:'\u0130stanbul \u00dcniversitesi',sub:'\u0130stanbul'},{name:'\u0130stanbul Teknik \u00dcniversitesi (\u0130T\u00dc)',sub:'\u0130stanbul'},
  {name:'Marmara \u00dcniversitesi',sub:'\u0130stanbul'},{name:'Y\u0131ld\u0131z Teknik \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'Galatasaray \u00dcniversitesi',sub:'\u0130stanbul'},{name:'Bo\u011fazi\u00e7i \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'Hacettepe \u00dcniversitesi',sub:'Ankara'},{name:'Ankara \u00dcniversitesi',sub:'Ankara'},
  {name:'Orta Do\u011fu Teknik \u00dcniversitesi (ODT\u00dc)',sub:'Ankara'},{name:'Gazi \u00dcniversitesi',sub:'Ankara'},
  {name:'Ege \u00dcniversitesi',sub:'\u0130zmir'},{name:'Dokuz Eyl\u00fcl \u00dcniversitesi',sub:'\u0130zmir'},
  {name:'Uluda\u011f \u00dcniversitesi',sub:'Bursa'},{name:'Anadolu \u00dcniversitesi',sub:'Eski\u015fehir'},
  {name:'\u00c7ukurova \u00dcniversitesi',sub:'Adana'},{name:'Akdeniz \u00dcniversitesi',sub:'Antalya'},
  {name:'Erciyes \u00dcniversitesi',sub:'Kayseri'},{name:'Sel\u00e7uk \u00dcniversitesi',sub:'Konya'},
  {name:'Ko\u00e7 \u00dcniversitesi',sub:'\u0130stanbul'},{name:'Sabanc\u0131 \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'Bah\u00e7e\u015fehir \u00dcniversitesi (BAU)',sub:'\u0130stanbul'},{name:'\u00d6zy\u011fin \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'\u0130stanbul Bilgi \u00dcniversitesi',sub:'\u0130stanbul'},{name:'Kadir Has \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'Yeditepe \u00dcniversitesi',sub:'\u0130stanbul'},{name:'Beykent \u00dcniversitesi',sub:'\u0130stanbul'},
  {name:'Bilkent \u00dcniversitesi',sub:'Ankara'},{name:'TOBB ET\u00dc',sub:'Ankara'},
  {name:'Ya\u015far \u00dcniversitesi',sub:'\u0130zmir'},{name:'\u0130zmir Ekonomi \u00dcniversitesi',sub:'\u0130zmir'},
  {name:'Anadolu \u00dcniversitesi A\u00e7\u0131k\u00f6\u011fretim',sub:'Eski\u015fehir'},
  {name:'Anadolu Lisesi',sub:'Lise'},{name:'Meslek Lisesi',sub:'Lise'},{name:'\u0130mam Hatip Lisesi',sub:'Lise'},
  {name:'Fen Lisesi',sub:'Lise'},{name:'Sosyal Bilimler Lisesi',sub:'Lise'}
];

// ── BOLUM DATABASE ──
var BOLUM_DB=[
  '\u0130\u015fletme','\u0130ktisat','Ekonomi','Uluslararas\u0131 Ticaret','Uluslararas\u0131 \u0130li\u015fkiler',
  'Maliye','Muhasebe ve Finansman','Bankaclk ve Finans','Lojistik Y\u00f6netimi',
  '\u0130nsan Kaynaklar\u0131 Y\u00f6netimi','Pazarlama','Y\u00f6netim Bili\u015fim Sistemleri',
  'End\u00fcstri M\u00fchendisli\u011fi','Bilgisayar M\u00fchendisli\u011fi','Elektrik-Elektronik M\u00fchendisli\u011fi',
  'Makine M\u00fchendisli\u011fi','Tekstil M\u00fchendisli\u011fi','Yaz\u0131l\u0131m M\u00fchendisli\u011fi',
  'Moda Tasar\u0131m\u0131','Moda ve Tekstil Tasar\u0131m\u0131','Grafik Tasar\u0131m',
  '\u0130\u00e7 Mimarl\u0131k','Mimarl\u0131k','End\u00fcstriyel Tasar\u0131m','G\u00f6rsel \u0130leti\u015fim Tasar\u0131m\u0131',
  'Hukuk','Psikoloji','Sosyoloji','\u0130leti\u015fim','Halkla \u0130li\u015fkiler ve Reklamc\u0131l\u0131k',
  'Perakende Sat\u0131\u015f ve Ma\u011faza Y\u00f6netimi','D\u0131\u015f Ticaret','B\u00fcro Y\u00f6netimi',
  'Bilgisayar Programc\u0131l\u0131\u011f\u0131','Muhasebe ve Vergi Uygulamalar\u0131',
  'Turizm \u0130\u015fletmecili\u011fi','Gastronomi','Otelcilik'
];

