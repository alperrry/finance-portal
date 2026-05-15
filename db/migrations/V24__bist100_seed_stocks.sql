-- BIST100'e özgü hisseler (BIST30'a dahil olmayanlar)
-- Filtre: index_name = 'BIST100'
-- BIST100 filtresi = BIST30 (30 hisse) + bu tablo (70 hisse) = ~100 hisse

INSERT INTO stock (symbol, short_name, long_name, sector, industry, exchange, currency, index_name) VALUES
-- Finans
('TSKB.IS',  'TSKB',  'TSKB Türkiye Sınai Kalkınma Bankası A.Ş.',     'Finans',        'Kalkınma ve Yatırım Bankası',  'IST', 'TRY', 'BIST100'),
('SKBNK.IS', 'SKBNK', 'Şekerbank T.A.Ş.',                               'Finans',        'Bankacılık',                   'IST', 'TRY', 'BIST100'),
('ALBRK.IS', 'ALBRK', 'Albaraka Türk Katılım Bankası A.Ş.',             'Finans',        'Katılım Bankacılığı',          'IST', 'TRY', 'BIST100'),
('ISMEN.IS', 'ISMEN', 'İş Yatırım Menkul Değerler A.Ş.',                'Finans',        'Aracı Kurum',                  'IST', 'TRY', 'BIST100'),
('ANSGR.IS', 'ANSGR', 'Anadolu Sigorta A.Ş.',                           'Finans',        'Sigortacılık',                 'IST', 'TRY', 'BIST100'),
('AKGRT.IS', 'AKGRT', 'Aksigorta A.Ş.',                                 'Finans',        'Sigortacılık',                 'IST', 'TRY', 'BIST100'),
('TRCAS.IS', 'TRCAS', 'Türkiye Sigorta A.Ş.',                           'Finans',        'Sigortacılık',                 'IST', 'TRY', 'BIST100'),
-- Enerji
('ENJSA.IS', 'ENJSA', 'Enerjisa Enerji A.Ş.',                           'Enerji',        'Elektrik Dağıtım',             'IST', 'TRY', 'BIST100'),
('AKSEN.IS', 'AKSEN', 'Aksa Enerji Üretim A.Ş.',                        'Enerji',        'Doğalgaz',                     'IST', 'TRY', 'BIST100'),
('ZOREN.IS', 'ZOREN', 'Zorlu Enerji Elektrik Üretim A.Ş.',              'Enerji',        'Elektrik Üretim',              'IST', 'TRY', 'BIST100'),
('AKENR.IS', 'AKENR', 'Akenerji Elektrik Üretim A.Ş.',                  'Enerji',        'Elektrik Üretim',              'IST', 'TRY', 'BIST100'),
('IPEKE.IS', 'IPEKE', 'İpek Doğal Enerji Kaynakları A.Ş.',              'Enerji',        'Doğal Gaz',                    'IST', 'TRY', 'BIST100'),
('ODAS.IS',  'ODAS',  'Odaş Elektrik Üretim Sanayi A.Ş.',               'Enerji',        'Elektrik Üretim',              'IST', 'TRY', 'BIST100'),
-- Otomotiv / Sanayi - Araç
('OTKAR.IS', 'OTKAR', 'Otokar Otobüs Karoseri Sanayi A.Ş.',             'Sanayi',        'Savunma/Araç',                 'IST', 'TRY', 'BIST100'),
('TTRAK.IS', 'TTRAK', 'Türk Traktör ve Ziraat Makineleri A.Ş.',         'Sanayi',        'Tarım Makineleri',             'IST', 'TRY', 'BIST100'),
('ASUZU.IS', 'ASUZU', 'Anadolu Isuzu Otomotiv Sanayi A.Ş.',             'Sanayi',        'Otobüs',                       'IST', 'TRY', 'BIST100'),
('DOAS.IS',  'DOAS',  'Doğuş Otomotiv Servis ve Ticaret A.Ş.',          'Otomotiv',      'Otomotiv Dağıtım',             'IST', 'TRY', 'BIST100'),
('KARSN.IS', 'KARSN', 'Karsan Otomotiv Sanayi ve Ticaret A.Ş.',         'Sanayi',        'Otobüs/Araç',                  'IST', 'TRY', 'BIST100'),
-- Sanayi - Metal / Çelik
('BRSAN.IS', 'BRSAN', 'Borusan Mannesmann Boru Sanayi A.Ş.',            'Sanayi',        'Çelik Boru',                   'IST', 'TRY', 'BIST100'),
('ISDMR.IS', 'ISDMR', 'İskenderun Demir ve Çelik A.Ş.',                 'Sanayi',        'Demir-Çelik',                  'IST', 'TRY', 'BIST100'),
('DMSAS.IS', 'DMSAS', 'Döktaş Dökümcülük Sanayi A.Ş.',                  'Sanayi',        'Metal',                        'IST', 'TRY', 'BIST100'),
('PARSN.IS', 'PARSN', 'Parsan Makine Parçaları Sanayi A.Ş.',            'Sanayi',        'Otomotiv Yan Sanayi',          'IST', 'TRY', 'BIST100'),
-- Sanayi - Kablo / Elektronik
('PRKAB.IS', 'PRKAB', 'Türk Prysmian Kablo ve Sistemleri A.Ş.',        'Sanayi',        'Kablo',                        'IST', 'TRY', 'BIST100'),
('VESTL.IS', 'VESTL', 'Vestel Elektronik Sanayi A.Ş.',                  'Tüketim',       'Elektronik',                   'IST', 'TRY', 'BIST100'),
-- Sanayi - Kimya / Tarım
('GUBRF.IS', 'GUBRF', 'Gübre Fabrikaları T.A.Ş.',                       'Sanayi',        'Gübre',                        'IST', 'TRY', 'BIST100'),
('ALKIM.IS', 'ALKIM', 'Alkim Alkali Kimya A.Ş.',                        'Sanayi',        'Kimya',                        'IST', 'TRY', 'BIST100'),
('HEKTS.IS', 'HEKTS', 'Hektaş Ticaret T.A.Ş.',                         'Tarım',         'Kimya',                        'IST', 'TRY', 'BIST100'),
-- Sanayi - Teknik Tekstil
('KORDS.IS', 'KORDS', 'Kordsa Teknik Tekstil A.Ş.',                     'Sanayi',        'Teknik Tekstil',               'IST', 'TRY', 'BIST100'),
-- Sanayi - Diğer
('EGEEN.IS', 'EGEEN', 'Ege Endüstri ve Ticaret A.Ş.',                   'Sanayi',        'Otomotiv Yan Sanayi',          'IST', 'TRY', 'BIST100'),
('TMSN.IS',  'TMSN',  'Tümosan Motor ve Traktör Sanayi A.Ş.',           'Sanayi',        'Makine',                       'IST', 'TRY', 'BIST100'),
-- İçecek / Gıda
('CCOLA.IS', 'CCOLA', 'Coca-Cola İçecek A.Ş.',                          'İçecek',        'Meşrubat',                     'IST', 'TRY', 'BIST100'),
('AEFES.IS', 'AEFES', 'Anadolu Efes Biracılık ve Malt Sanayi A.Ş.',    'İçecek',        'Bira',                         'IST', 'TRY', 'BIST100'),
('ULKER.IS', 'ULKER', 'Ülker Bisküvi Sanayi A.Ş.',                      'Gıda',          'Atıştırmalık',                 'IST', 'TRY', 'BIST100'),
('TATGD.IS', 'TATGD', 'Tat Gıda Sanayi A.Ş.',                          'Gıda',          'Gıda İşleme',                  'IST', 'TRY', 'BIST100'),
('KERVT.IS', 'KERVT', 'Kerevitaş Gıda Sanayi A.Ş.',                    'Gıda',          'Gıda',                         'IST', 'TRY', 'BIST100'),
('BANVT.IS', 'BANVT', 'Bandırma Vitaminli Yem Sanayi A.Ş.',             'Gıda',          'Tarımsal Gıda',                'IST', 'TRY', 'BIST100'),
('TABGD.IS', 'TABGD', 'TAB Gıda Sanayi ve Ticaret A.Ş.',               'Gıda',          'Restoran',                     'IST', 'TRY', 'BIST100'),
-- Perakende
('SOKM.IS',  'SOKM',  'Şok Marketler Ticaret A.Ş.',                     'Perakende',     'Market Zinciri',               'IST', 'TRY', 'BIST100'),
('MAVI.IS',  'MAVI',  'Mavi Giyim Sanayi A.Ş.',                        'Perakende',     'Giyim',                        'IST', 'TRY', 'BIST100'),
('YATAS.IS', 'YATAS', 'Yataş Yatak ve Yorgan Sanayi A.Ş.',             'Perakende',     'Mobilya',                      'IST', 'TRY', 'BIST100'),
('INDES.IS', 'INDES', 'İndeks Bilgisayar Sistemleri A.Ş.',              'Teknoloji',     'BT Dağıtım',                   'IST', 'TRY', 'BIST100'),
-- Sağlık
('MPARK.IS', 'MPARK', 'MLP Sağlık Hizmetleri A.Ş.',                    'Sağlık',        'Hastane',                      'IST', 'TRY', 'BIST100'),
('SELEC.IS', 'SELEC', 'Selçuk Ecza Deposu Ticaret A.Ş.',                'Sağlık',        'İlaç Dağıtım',                 'IST', 'TRY', 'BIST100'),
('DEVA.IS',  'DEVA',  'Deva Holding A.Ş.',                              'Sağlık',        'İlaç',                         'IST', 'TRY', 'BIST100'),
('ECILC.IS', 'ECILC', 'Eczacıbaşı İlaç Sanayi ve Ticaret A.Ş.',        'Sağlık',        'İlaç',                         'IST', 'TRY', 'BIST100'),
-- İnşaat / Çimento
('CIMSA.IS', 'CIMSA', 'Çimsa Çimento Sanayi A.Ş.',                      'İnşaat',        'Çimento',                      'IST', 'TRY', 'BIST100'),
('OYAKC.IS', 'OYAKC', 'Oyak Çimento Fabrikaları A.Ş.',                  'İnşaat',        'Çimento',                      'IST', 'TRY', 'BIST100'),
('BTCIM.IS', 'BTCIM', 'Batıçim Batı Anadolu Çimento Sanayi A.Ş.',      'İnşaat',        'Çimento',                      'IST', 'TRY', 'BIST100'),
('BOLUC.IS', 'BOLUC', 'Bolu Çimento Sanayi A.Ş.',                       'İnşaat',        'Çimento',                      'IST', 'TRY', 'BIST100'),
('GOLTS.IS', 'GOLTS', 'Göltaş Gölyaka Çimento Sanayi A.Ş.',            'İnşaat',        'Çimento',                      'IST', 'TRY', 'BIST100'),
('ENKAI.IS', 'ENKAI', 'Enka İnşaat ve Sanayi A.Ş.',                    'İnşaat',        'Taahhüt',                      'IST', 'TRY', 'BIST100'),
-- Gayrimenkul (GYO)
('ISGYO.IS', 'ISGYO', 'İş Gayrimenkul Yatırım Ortaklığı A.Ş.',         'Gayrimenkul',   'GYO',                          'IST', 'TRY', 'BIST100'),
('HLGYO.IS', 'HLGYO', 'Halk Gayrimenkul Yatırım Ortaklığı A.Ş.',       'Gayrimenkul',   'GYO',                          'IST', 'TRY', 'BIST100'),
('SNGYO.IS', 'SNGYO', 'Sinpaş Gayrimenkul Yatırım Ortaklığı A.Ş.',     'Gayrimenkul',   'GYO',                          'IST', 'TRY', 'BIST100'),
('ALGYO.IS', 'ALGYO', 'Alarko Gayrimenkul Yatırım Ortaklığı A.Ş.',     'Gayrimenkul',   'GYO',                          'IST', 'TRY', 'BIST100'),
('AKFGY.IS', 'AKFGY', 'Akfen Gayrimenkul Yatırım Ortaklığı A.Ş.',      'Gayrimenkul',   'GYO',                          'IST', 'TRY', 'BIST100'),
-- Teknoloji
('LOGO.IS',  'LOGO',  'Logo Yazılım Sanayi A.Ş.',                       'Teknoloji',     'Yazılım',                      'IST', 'TRY', 'BIST100'),
('KAREL.IS', 'KAREL', 'Karel Elektronik Sanayi A.Ş.',                   'Teknoloji',     'İletişim Ekipmanları',         'IST', 'TRY', 'BIST100'),
('NETAS.IS', 'NETAS', 'NetaŞ Telekomünikasyon A.Ş.',                   'Teknoloji',     'Telekomünikasyon',             'IST', 'TRY', 'BIST100'),
('SMART.IS', 'SMART', 'Smart Güneş Enerji Sistemleri A.Ş.',             'Enerji',        'Solar',                        'IST', 'TRY', 'BIST100'),
-- Madencilik
('KOZAL.IS', 'KOZAL', 'Koza Altın İşletmeleri A.Ş.',                   'Madencilik',    'Altın',                        'IST', 'TRY', 'BIST100'),
('KOZAA.IS', 'KOZAA', 'Koza Anadolu Metal Madencilik A.Ş.',             'Madencilik',    'Maden',                        'IST', 'TRY', 'BIST100'),
('SILVR.IS', 'SILVR', 'Silver Madencilik A.Ş.',                         'Madencilik',    'Gümüş',                        'IST', 'TRY', 'BIST100'),
-- Holding
('ALARK.IS', 'ALARK', 'Alarko Holding A.Ş.',                            'Holding',       'Çeşitlendirilmiş',             'IST', 'TRY', 'BIST100'),
('GLYHO.IS', 'GLYHO', 'Global Yatırım Holding A.Ş.',                   'Holding',       'Çeşitlendirilmiş',             'IST', 'TRY', 'BIST100'),
('AGHOL.IS', 'AGHOL', 'AG Anadolu Grubu Holding A.Ş.',                 'Holding',       'Çeşitlendirilmiş',             'IST', 'TRY', 'BIST100'),
('BERA.IS',  'BERA',  'Bera Holding A.Ş.',                              'Holding',       'Çeşitlendirilmiş',             'IST', 'TRY', 'BIST100'),
('NTHOL.IS', 'NTHOL', 'Net Holding A.Ş.',                               'Holding',       'Çeşitlendirilmiş',             'IST', 'TRY', 'BIST100'),
-- Ulaştırma
('CLEBI.IS', 'CLEBI', 'Çelebi Hava Servisi A.Ş.',                       'Ulaştırma',     'Havalimanı Hizmetleri',        'IST', 'TRY', 'BIST100'),
-- Diğer Sanayi
('DYOBY.IS', 'DYOBY', 'DYO Boya Fabrikaları Sanayi A.Ş.',              'Sanayi',        'Boya',                         'IST', 'TRY', 'BIST100')
ON CONFLICT (symbol) DO NOTHING;
