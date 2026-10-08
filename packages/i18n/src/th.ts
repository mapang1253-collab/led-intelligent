/**
 * Typed Thai (th-TH) string catalog — per docs/technology-stack.md §6 / RD-10, this is the ONLY
 * place user-facing text lives. Components must import from here, never inline Thai/English
 * strings, so that wording can be reviewed in one place.
 *
 * Grouped to mirror the required components in docs/technology-stack.md §5.
 */
export const th = {
  app: {
    title: "ระบบวิเคราะห์ศักยภาพการลงทุนอสังหาริมทรัพย์",
    /* The two halves of the front-page headline. It is the question this field actually asks —
       "highest and best use" is that sentence in English — and it belongs here rather than in a
       component, like every other Thai string in the product. */
    headlineLead: "อสังหาริมทรัพย์ในพื้นที่นี้",
    headlineAnswer: "ควรเป็นอะไร จึงจะดีที่สุด",
    /* "อะไรที่ยังไม่รู้" described the system's epistemics to someone who came to look at land.
       The promise is the same and now says what the reader gets: the limits, and the list of what
       to check. */
    tagline:
      "Highest and Best Use — หาคำตอบจากหลักฐานที่หน่วยงานรัฐเผยแพร่จริง ครบทุกจังหวัดทั่วประเทศ พร้อมสรุปข้อจำกัดทางกฎหมายและรายการที่ต้องตรวจสอบเพิ่มเติม",
    academicBadge: "ต้นแบบเชิงวิชาการ",
  },

  picker: {
    /**
     * Counts of published figures, and they must not read as the figures themselves.
     *
     * These rendered as "ราคาคอนโด 603" and were read by the project owner as a price of 603 —
     * which is what the words say. The number is how many assessed-value records the Treasury has
     * published for the area, so the label now names the record and the unit sits after the count,
     * where a reader cannot mistake it for a baht figure. What the number is worth is said too:
     * more records means better documented, never better to invest in.
     */
    condoBadge: "ราคาประเมินห้องชุด",
    landBadge: "ราคาประเมินที่ดิน",
    figureCountUnit: "รายการ",
    noPropertyData: "ยังไม่มีข้อมูลราคาอสังหาในพื้นที่นี้",
    showcaseToggle: "ยังไม่รู้จะเริ่มจากที่ไหน ดูพื้นที่ที่มีข้อมูลมากที่สุด",
    /* The one claim this list must not make. It is ordered by how many figures the state has
       published, which is a fact about data coverage and says nothing about whether a place is
       worth buying — and ordering places by anything reads as a ranking unless the screen says
       otherwise in as many words. */
    showcaseNote:
      "เรียงตามจำนวนข้อมูลที่หน่วยงานรัฐเผยแพร่ไว้ ไม่ใช่การจัดอันดับว่าที่ไหนน่าลงทุนกว่ากัน พื้นที่ที่มีข้อมูลมากแปลว่ามีอะไรให้ตรวจสอบเยอะ ไม่ได้แปลว่าดีกว่า",
    showcaseSource:
      "จำนวนรายการนับจากบัญชีราคาประเมินของกรมธนารักษ์ และทะเบียนราษฎรของกรมการปกครอง ตามที่นำเข้าระบบแล้ว",
    /* A shortlist, kept in this browser only. Named for what it is — somewhere to put places you
       want to come back to — and never described as a ranking, which the product does not do. */
    favouritesHeading: "พื้นที่ที่คุณสนใจ",
    favouritesNote:
      "เก็บไว้ในเบราว์เซอร์นี้เท่านั้น ไม่ได้ส่งขึ้นเซิร์ฟเวอร์ ไม่ผูกกับบัญชี และไม่ได้เก็บผลวิเคราะห์ เก็บแค่ว่าคุณสนใจพื้นที่ไหน",
    favouriteAdd: "เก็บพื้นที่นี้ไว้ดูภายหลัง",
    favouriteRemove: "เอาออกจากพื้นที่ที่สนใจ",
    favouritesEmpty: "ยังไม่ได้เก็บพื้นที่ไหนไว้ กดรูปดาวข้างพื้นที่เพื่อเก็บไว้เปรียบเทียบกัน",
    favouritesPageIntro: "พื้นที่ที่คุณกดดาวไว้ เรียงตามที่เก็บล่าสุด ดูตัวเลขเทียบกันได้ที่นี่ แล้วกดวิเคราะห์พื้นที่ไหนก็ได้",
    favouriteAnalyse: "วิเคราะห์พื้นที่นี้",
    favouriteStarting: "กำลังเริ่ม",

    /* The shortlist's whole point: four places, one screen, numbers lined up. */
    compareHeading: "เทียบตัวเลขข้างกัน",
    compareNote:
      "เป็นช่วงต่ำสุด–สูงสุดของราคาประเมินที่ประกาศไว้จริง ไม่ใช่ค่าเฉลี่ย และไม่ใช่ราคาตลาด · ระบบใช้ตัวเลขของตำบลนั้นก่อนเสมอ และจะใช้ตัวเลขระดับอำเภอก็ต่อเมื่อตำบลนั้นไม่มีข้อมูลของตัวเอง โดยกำกับไว้ให้เห็นทุกช่อง — ราคาที่ดินของกรมธนารักษ์ประกาศเป็นรายอำเภอ ตำบลที่อยู่ในอำเภอเดียวกันจึงเห็นตัวเลขเดียวกัน",
    compareArea: "พื้นที่",
    compareCondo: "ราคาประเมินห้องชุด (บาท/ตร.ม.)",
    compareLand: "ราคาประเมินที่ดิน (บาท/ตร.ว.)",
    comparePopulation: "ประชากร (คน)",
    compareRecords: "รายการ",
    compareNoFigure: "ไม่มีข้อมูล",
    /* Which area the figure describes. Two subdistricts of one district share a district-level land
       price, and a reader not told the level would read one figure as two findings. */
    compareLevelSubdistrict: "ข้อมูลของตำบลนี้",
    compareLevelDistrict: "ข้อมูลระดับอำเภอ ใช้เป็นบริบท",
    /* Said plainly, because a span from four figures and a span from four hundred look identical on
       a screen and are not the same evidence. */
    compareThinWarning:
      "ตัวเลขที่มาจากข้อมูลน้อยกว่า 5 รายการ อาจไม่สะท้อนภาพรวมของพื้นที่ ดูจำนวนรายการกำกับในแต่ละช่อง",
    compareLoading: "กำลังอ่านตัวเลขเพื่อเทียบ",
    compareFailed: "อ่านตัวเลขเพื่อเทียบไม่สำเร็จ",
    selectedHeading: "พื้นที่ที่จะวิเคราะห์",
    change: "เปลี่ยนพื้นที่",
  },

  /**
   * The map pin and what it buys (docs/adr/0006).
   *
   * Every line here holds one of two lines the product must not cross. The pin is the reader's
   * assertion, not a verified parcel, so nothing here calls it "ที่ดินของคุณ" as established fact.
   * And the distances are straight-line context from OpenStreetMap, so nothing here lets them read
   * as travel time or as a finding the analysis relied on.
   */
  map: {
    heading: "ปักหมุดที่ดินบนแผนที่ (ไม่บังคับ)",
    intro:
      "ค้นหาสถานที่ใกล้ที่ดิน เช่น ชื่อถนนหรือตลาด แล้วคลิกบนแผนที่ตรงตำแหน่งที่ดิน ระบบจะบอกได้ว่าจุดนั้นห่างจากถนนใหญ่ โรงเรียน โรงพยาบาล ร้านสะดวกซื้อ และสถานีรถไฟกี่เมตร ถ้าไม่ปักก็วิเคราะห์ได้ตามปกติ",
    ariaLabel: "แผนที่สำหรับปักหมุดตำแหน่งที่ดิน",
    /* The control the first version of this map did not have, which is the whole reason it was
       judged useless: without it a reader had to drag across the country to find their own land. */
    searchAria: "ค้นหาสถานที่บนแผนที่",
    searchPlaceholder: "ค้นหาถนน ตลาด วัด หรือชื่อสถานที่ใกล้ที่ดิน",
    searchNoMatches: "ไม่พบสถานที่ที่ตรงกับคำค้นนี้",
    instruction: "คลิกบนแผนที่ตรงตำแหน่งที่ดิน ปักแล้วลากย้ายได้",
    pinned: "ปักหมุดไว้ที่",
    clear: "เอาหมุดออก",
    /* Said next to the pin, not buried in a footnote: the whole product rests on not letting an
       assertion pass for evidence. */
    assertedNote:
      "ตำแหน่งนี้เป็นสิ่งที่ท่านระบุเอง ระบบไม่ได้ตรวจสอบว่าตรงกับแปลงที่ดินจริงหรือไม่ และไม่ได้ทำให้ขอบเขตของผลวิเคราะห์เปลี่ยนจากระดับพื้นที่",

    proximityHeading: "ระยะห่างจากจุดสำคัญ",
    /* Asked for rather than attempted. Overpass is a free community service and it refuses under
       load — measured on 6–7 October 2026, every public mirror timed out for minutes at a time —
       so a panel that fetches on sight greeted readers with an amber failure they had not asked
       for, beside results that were perfectly fine. A button costs one click and never lies about
       the state of the rest of the screen. */
    proximityAsk: "วัดระยะห่างจากถนน โรงเรียน โรงพยาบาล ร้านสะดวกซื้อ และสถานีรถไฟ",
    proximityAskNote:
      "ใช้ข้อมูล OpenStreetMap ซึ่งเป็นบริการของชุมชนที่บางช่วงไม่ว่าง ถ้าไม่สำเร็จให้กดลองใหม่ได้ และไม่กระทบผลวิเคราะห์ส่วนอื่น",
    proximityLoading: "กำลังวัดระยะห่าง",
    proximityFailed: "ดึงข้อมูลแผนที่ไม่สำเร็จ บริการภายนอกอาจไม่ว่าง ลองใหม่อีกครั้งได้",
    proximityRetry: "ลองใหม่",
    proximityEmpty: "ไม่พบจุดสำคัญที่ระบบค้นหาภายในรัศมีที่กำหนด",
    /* Both radii, because roads are searched closer than the rest. One combined figure would let
       "ไม่พบถนนสายหลัก" read as "ไม่มีถนนสายหลักในรัศมี 1,500 เมตร" when the road search stopped at 600. */
    proximityRadius: "ค้นหาภายในรัศมี {poi} เมตรจากหมุด ส่วนถนนสายหลักค้นภายใน {road} เมตร",
    proximityUnnamed: "ไม่ระบุชื่อ",
    metres: "เมตร",
    /* Two limits, both load-bearing. A straight line is not a walk, and this is context that the
       analysis never consulted. */
    proximityStraightLine:
      "เป็นระยะเส้นตรงจากหมุด ไม่ใช่ระยะทางเดินหรือขับรถจริง และไม่ได้คิดว่ามีถนนเชื่อมถึงกันหรือไม่",
    proximityContextOnly:
      "ข้อมูลส่วนนี้ใช้ประกอบการพิจารณาเท่านั้น ไม่ได้ถูกนำไปใช้ในการวิเคราะห์ ไม่มีผลต่อผลตรวจข้อกำหนดหรือข้อสรุปสุดท้าย",
    category: {
      MAIN_ROAD: "ถนนสายหลัก",
      SCHOOL: "โรงเรียน",
      HOSPITAL: "โรงพยาบาลหรือคลินิก",
      CONVENIENCE: "ร้านสะดวกซื้อหรือตลาด",
      RAIL_STATION: "สถานีรถไฟหรือรถไฟฟ้า",
    },
  },

  /**
   * The city plan covering the pin (docs/adr/0008).
   *
   * The wording carries a distinction the reader will not make for themselves. The plan says what
   * a zone is *for*; it does not say that a given building is lawful on a given plot. บัญชีท้าย
   * กฎกระทรวง qualifies the permission, other instruments apply on top, and the parcel's own
   * frontage decides much of the rest. So "ทำอะไรได้" is never printed as a verdict — the
   * regulation is quoted, named as a quotation, and followed by where to confirm it.
   */
  zoning: {
    heading: "ผังเมืองรวมที่ครอบคลุมจุดนี้",
    intro: "ปักหมุดบนแผนที่แล้วระบบจะบอกว่าจุดนั้นอยู่ในที่ดินประเภทใดของผังเมืองรวม พร้อมสีและข้อความตามกฎกระทรวง",
    loading: "กำลังตรวจสอบผังเมือง",
    failed: "ดึงข้อมูลผังเมืองไม่สำเร็จ บริการของกรมโยธาธิการและผังเมืองอาจไม่ว่าง ลองใหม่อีกครั้งได้",
    retry: "ลองใหม่",
    /* Three different silences, told apart. A reader who gets "ไม่พบ" when the real answer is
       "จังหวัดนี้ยังไม่เผยแพร่" will conclude their land is unzoned, which is a different and
       wrong belief. */
    outsideCoverage:
      "กรมโยธาธิการและผังเมืองยังไม่ได้เผยแพร่ผังเมืองรวมของจังหวัดนี้ในระบบแผนที่ออนไลน์ จึงตรวจให้ไม่ได้",
    noPlanAtPoint:
      "จุดที่ปักไม่อยู่ในขอบเขตผังเมืองรวมที่เผยแพร่ของจังหวัดนี้ อาจอยู่นอกเขตผังหรืออยู่ในผังเฉพาะที่ยังไม่เผยแพร่",
    zoneLabel: "ที่ดินประเภท",
    blockLabel: "บริเวณหมายเลข",
    planLabel: "รหัสผัง",
    permittedHeading: "ข้อกำหนดการใช้ประโยชน์ที่ดิน",
    prohibitedHeading: "ข้อห้ามการใช้ประโยชน์ที่ดิน",
    noPermitted: "กรมโยธาธิการและผังเมืองไม่ได้เผยแพร่ข้อกำหนดของที่ดินประเภทนี้ในระบบ",
    noProhibited: "ไม่พบรายการข้อห้ามที่เผยแพร่สำหรับที่ดินประเภทนี้ ไม่ได้แปลว่าไม่มีข้อห้าม",
    quoteNote: "ข้อความข้างต้นคัดมาจากที่กรมโยธาธิการและผังเมืองเผยแพร่ ไม่ได้เรียบเรียงใหม่",
    /* The load-bearing sentence on this panel. Without it the zone name reads as clearance. */
    notClearance:
      "ผังเมืองบอกว่าที่ดินประเภทนี้มีไว้เพื่ออะไร ไม่ได้แปลว่าสิ่งที่ท่านจะสร้างทำได้จริงบนแปลงนี้ ยังต้องดูบัญชีท้ายกฎกระทรวง กฎหมายควบคุมอาคาร และสภาพแปลงประกอบด้วย",
    contextOnly:
      "ข้อมูลส่วนนี้แสดงเพื่อประกอบการพิจารณาเท่านั้น ยังไม่ได้ถูกนำเข้าสู่ขั้นตอนตรวจสอบของระบบ จึงไม่มีผลต่อผลตรวจข้อกำหนดหรือข้อสรุปสุดท้าย",
    multiplePlans: "จุดนี้อยู่ในผังมากกว่าหนึ่งผัง ระบบแสดงทุกผังที่ครอบคลุม ไม่ได้เลือกให้ว่าผังใดมีผลบังคับเหนือกว่า",
    verifyAt: "ตรวจสอบกับระบบของกรมโยธาธิการและผังเมือง",
    showLayer: "แสดงสีผังเมืองบนแผนที่",
    hideLayer: "ซ่อนสีผังเมือง",
    legendHeading: "สีที่แสดงบนแผนที่เป็นสีตามที่กรมโยธาธิการและผังเมืองกำหนด",
    /* The key to the overlay. Turning the colours on without one shows pink beside green beside
       red and leaves the reader guessing, which is what the owners asked about. */
    legendOpen: "สีแต่ละสีบนแผนที่หมายความว่าอะไร",
    legendNote: "เป็นประเภทการใช้ประโยชน์ที่ดินทั้งหมดของผังที่ครอบคลุมจุดนี้ สีตรงกับที่กรมโยธาธิการและผังเมืองกำหนด",
    legendUnfilled: "ไม่ถมสี",
  },

  /**
   * Parcel lookup by ระวาง and เลขที่ดิน (docs/adr/0007).
   *
   * Every string here holds one of three lines. Coverage is five provinces, said before the inputs
   * rather than discovered by a reader who typed a correct deed. เลขที่ดิน is not เลขที่โฉนด, and
   * the two are printed beside each other on the same document. And a hit locates a parcel, never
   * establishes who owns it — ownership is not in this data at all.
   */
  /**
   * The map beside the result, which is not the map on the form: this one cannot be moved.
   *
   * The copy has to carry that, because a map with a pin on it looks editable, and a reader who
   * drags this one and sees nothing change would reasonably conclude the page is broken.
   */
  zoningMap: {
    heading: "ที่ตั้งและสีผังเมืองรอบๆ ที่ดินนี้",
    description:
      "หมุดคือจุดที่ท่านระบุไว้ตอนสั่งวิเคราะห์ สีที่ทับคือผังเมืองรวมของกรมโยธาธิการและผังเมือง · ความหมายของแต่ละสีดูได้ที่ “คำอธิบายสีผังเมือง” ด้านล่าง",
    ariaLabel: "แผนที่แสดงตำแหน่งที่ดินและสีผังเมือง ดูอย่างเดียว แก้ไขไม่ได้",
    showOverlay: "แสดงสีผังเมือง",
    hideOverlay: "ซ่อนสีผังเมือง",
    pinIsAsserted:
      "หมุดนี้มาจากที่ท่านระบุเอง ระบบไม่ได้รังวัดหรือยืนยันขอบเขตแปลง และแก้หมุดที่นี่ไม่ได้ เพราะผลวิเคราะห์ด้านล่างคำนวณจากจุดนี้ไปแล้ว หากต้องแก้ ให้เริ่มวิเคราะห์ใหม่",
  },

  /**
   * The box that narrows a long dropdown.
   *
   * The lists it serves are the Treasury's own schedules — 69 building types, 56 land locations —
   * and the owners had to scroll all of them to reach one row.
   */
  optionSearch: {
    placeholder: "พิมพ์เพื่อค้นในรายการ",
    aria: "ค้นในรายการ",
    clear: "ล้างคำค้น",
    count: "พบ {n} จาก {total} รายการ",
    none: "ไม่พบรายการที่ตรงกับคำค้น ลองพิมพ์สั้นลง",
  },

  parcel: {
    heading: "รู้ระวางและเลขที่ดินไหม ค้นหาแปลงได้เลย (ไม่บังคับ)",
    coverage:
      "ค้นได้ {count} จังหวัด เลือกจังหวัดของที่ดินก่อน แล้วกรอกระวางและเลขที่ดิน · จังหวัดที่ไม่มีในรายการยังค้นไม่ได้ ไม่ได้แปลว่าเลขที่ท่านกรอกผิด",
    coverageLoading: "กำลังตรวจสอบว่าจังหวัดใดค้นได้บ้าง",
    provinceLabel: "จังหวัดของที่ดิน",
    provincePlaceholder: "เลือกจังหวัด",
    provinceHelp: "จำเป็น เพราะข้อมูลรูปแปลงแยกตามจังหวัด ระบบจะค้นจากจังหวัดที่เลือกเท่านั้น",
    /* Two publishers answer this box, and which one answered changes what the answer is worth. */
    provinceGroupStored: "เก็บไว้ในระบบแล้ว (ข้อมูลเปิดกรมที่ดิน)",
    provinceGroupLive: "ค้นสดจากกรมโยธาธิการและผังเมือง",
    provinceNotCovered:
      "จังหวัดนี้ยังไม่มีหน่วยงานใดเปิดข้อมูลรูปแปลงให้ค้นด้วยระวาง ท่านยังปักหมุดบนแผนที่และกรอกเนื้อที่เองได้",
    sourceStored: "ที่มา: ข้อมูลรูปแปลงที่ดินแบบเปิดของกรมที่ดิน ภายใต้ DGA Open Government License",
    sourceLive: "ที่มา: ค้นสดจากชั้นข้อมูลรูปแปลงที่ดิน กรมโยธาธิการและผังเมือง (DDS Explorer)",
    /* The department's own data repeats a เลขที่ดิน across split polygons. Shown rather than hidden:
       the area below is one polygon's, which is not the holding if there are three. */
    multipleMatches:
      "ระวางและเลขที่ดินนี้ตรงกับรูปแปลง {count} รูป ด้านล่างแสดงรูปแรก เนื้อที่ที่เห็นจึงอาจเป็นเพียงส่วนหนึ่ง ควรตรวจสอบกับกรมที่ดิน",
    noArea: "หน่วยงานไม่ได้เผยแพร่เนื้อที่ของแปลงนี้ กรุณากรอกเนื้อที่เอง",
    noNames: "หน่วยงานไม่ได้เผยแพร่ชื่อตำบลและอำเภอของแปลงนี้ ระบบกรอกให้เท่าที่ทราบ",
    mapSheetLabel: "ระวาง",
    mapSheetPlaceholder: "เช่น 5137 II 9854-09",
    mapSheetHelp: "พิมพ์อยู่บนหัวโฉนดคู่กับคำว่า “ระวาง” ใส่เว้นวรรคหรือขีดอย่างไรก็ได้",
    landNoLabel: "เลขที่ดิน",
    landNoHelp: "เลขประจำแปลงภายในระวางนั้น เป็นคนละเลขกับ “เลขที่โฉนด” ซึ่งระบบยังค้นไม่ได้",
    lookup: "ค้นหาแปลงที่ดิน",
    notFound: "ไม่พบแปลงที่ตรงกับระวางและเลขที่ดินนี้ในจังหวัดที่เลือก ลองตรวจตัวเลขอีกครั้ง หรือตรวจว่าเลือกจังหวัดถูกต้อง",
    failed: "ค้นหาไม่สำเร็จ ระบบของหน่วยงานอาจไม่ตอบในขณะนี้ ลองใหม่อีกครั้ง",
    retry: "ลองค้นอีกครั้ง",
    found: "พบแปลงที่ดิน",
    foundWhere: "ที่ตั้ง",
    foundArea: "เนื้อที่ตามที่กรมที่ดินคำนวณ",
    /* The live lookup reads a republished copy of the same cadastre, so the figure is not credited
       to the department that computed it on a screen that did not get it from them. */
    foundAreaLive: "เนื้อที่ตามข้อมูลรูปแปลงของหน่วยงาน",
    use: "ใช้เนื้อที่และตำแหน่งนี้",
    notOwnership:
      "ข้อมูลนี้บอกว่าแปลงนี้อยู่ที่ไหนและมีเนื้อที่เท่าไร ไม่ได้บอกว่าใครเป็นเจ้าของ และไม่ได้ยืนยันว่าเป็นแปลงของท่าน ข้อมูลกรรมสิทธิ์ไม่ได้อยู่ในชุดข้อมูลเปิดนี้",

    /**
     * The way out for the readers this lookup cannot serve, and there are three kinds.
     *
     * Someone holding only a เลขที่โฉนด, which this product cannot resolve. Someone in one of the
     * provinces neither publisher opens — กรุงเทพฯ and ชลบุรี among them. And someone who
     * wants to see the shape of the parcel rather than a point, which this product does not draw.
     *
     * LandsMaps serves all three, and it gives back the two numbers this box wants — so the link
     * is a round trip, not a dead end, and the copy says so.
     */
    fallbackHeading: "ไม่รู้ระวาง หรือมีแต่เลขที่โฉนด หรือจังหวัดไม่อยู่ในรายการ",
    fallbackBody:
      "เปิดแผนที่ของกรมที่ดิน ค้นด้วยเลขที่โฉนดหรือเลื่อนหาแปลงบนแผนที่ก็ได้ จะเห็นรูปแปลงจริงพร้อมระวางและเลขที่ดิน แล้วนำสองเลขนั้นกลับมากรอกที่ช่องด้านบน · ใช้ได้ทุกจังหวัดทั่วประเทศ ไม่จำกัดเฉพาะจังหวัดที่ระบบนี้มีข้อมูล",
    fallbackLink: "เปิดแผนที่แปลงที่ดิน กรมที่ดิน (LandsMaps)",
    fallbackNote: "เปิดในแท็บใหม่ เป็นเว็บของกรมที่ดิน ไม่ใช่ส่วนหนึ่งของระบบนี้",
  },

  intake: {
    heading: "ทรัพย์สินที่ต้องการวิเคราะห์",
    /* What the tool is, said before it starts. Read without this, a result full of "ยัง…" lines
       looks like an analysis that broke; read with it, the same lines are the scope. */
    description:
      "เครื่องมือนี้ช่วย “คัดกรองก่อนลงทุน” — บอกว่าอสังหาริมทรัพย์ในพื้นที่นี้ราคาประเมินเท่าไหร่ ที่ดินน่าจะสร้างอะไรได้ และกฎหมายติดตรงไหน ยังไม่ใช่เครื่องคำนวณผลตอบแทน",

    provinceLabel: "จังหวัด",
    districtLabel: "อำเภอ/เขต",
    subdistrictLabel: "ตำบล/แขวง",

    provincePlaceholder: "เลือกจังหวัด",
    districtPlaceholder: "เลือกอำเภอ/เขต",
    subdistrictPlaceholder: "เลือกตำบล/แขวง",

    districtDisabledHint: "เลือกจังหวัดก่อน",
    subdistrictDisabledHint: "เลือกอำเภอ/เขตก่อน",

    siteToggle: "รู้ความกว้างถนนหน้าที่ดินไหม (ไม่บังคับ)",
    siteHelp:
      "สองช่องนี้เป็นช่องที่เปลี่ยนผลลัพธ์ได้จริงที่สุด ระบบจะเอาไปคำนวณระยะร่นตามกฎกระทรวง ฉบับที่ 55 ให้เป็นตัวเลขของที่ดินแปลงนี้ เช่น ถนนกว้าง 12 เมตร ระบบจะตอบว่าต้องร่นอาคารอย่างน้อย 1.2 เมตร ถ้าไม่กรอกก็วิเคราะห์ได้ แต่กฎข้อที่ต้องใช้ตัวเลขนี้จะตอบว่า “ยังสรุปไม่ได้”",
    roadWidthLabel: "ความกว้างถนนสาธารณะหน้าที่ดิน (เมตร)",
    roadWidthHelp:
      "วัดจากเขตทางฝั่งหนึ่งถึงอีกฝั่งหนึ่ง รวมไหล่ทางและทางเท้า ไม่ใช่วัดเฉพาะผิวถนนที่รถวิ่ง ถ้าไม่แน่ใจ ประมาณจากภาพถ่ายดาวเทียมก็พอใช้ได้",
    waterWidthLabel: "ความกว้างแหล่งน้ำสาธารณะที่ติดที่ดิน (เมตร)",
    waterWidthHelp:
      "กรอกเมื่อที่ดินติดคลอง ลำราง หรือลำน้ำสาธารณะ วัดความกว้างของลำน้ำ ถ้าที่ดินไม่ติดแหล่งน้ำให้เว้นว่างไว้",
    nearLargeWaterLabel: "ที่ดินอยู่ติดหรือใกล้บึง ทะเลสาบ หรือทะเล",
    /* Two numbered steps, because the form had grown three ways to answer one question with
       nothing saying they were alternatives, and readers were filling in all of them. */
    stepOne: "1. ที่ดินอยู่ที่ไหน",
    modeArea: "เลือกจากรายการพื้นที่",
    modeParcel: "มีระวางและเลขที่ดิน",
    stepTwo: "2. รายละเอียดเพิ่มเติม",
    stepTwoNote: "ทั้งหมดนี้ไม่บังคับ ไม่รู้ก็ข้ามได้ กดเริ่มวิเคราะห์ได้เลย แต่ถ้ากรอก ระบบจะตรวจข้อกำหนดให้ได้มากขึ้น",
    areaToggle: "รู้เนื้อที่ดินไหม (ไม่บังคับ)",
    areaHelp: "กรอกตามที่ระบุไว้ในโฉนด ระบบจะเติมให้อัตโนมัติในเครื่องคำนวณมูลค่าที่ดินในหน้าผลลัพธ์ จะได้ไม่ต้องกรอกซ้ำ",
    areaConversion: "เท่ากับ",

    landAreaLabel: "เนื้อที่",
    raiUnit: "ไร่",
    nganUnit: "งาน",
    waUnit: "ตารางวา",

    submit: "เริ่มวิเคราะห์",
    submitting: "กำลังส่งข้อมูล",

    scopeNoticeTitle: "ขอบเขตของผลที่จะได้รับ",
    /* One sentence now, because there is only one outcome. The second variant promised a
       property-level attempt that the permitted scope never granted. */
    scopeNoticeArea:
      "เป็นการวิเคราะห์ศักยภาพระดับพื้นที่ ไม่ใช่ข้อสรุปเฉพาะแปลงที่ดิน เพราะยังไม่มีแหล่งข้อมูลรายแปลงที่เข้าถึงได้",
  },

  validation: {
    provinceRequired: "กรุณาเลือกจังหวัด",
    districtRequired: "กรุณาเลือกอำเภอ/เขต",
    subdistrictRequired: "กรุณาเลือกตำบล/แขวง",
    numberInvalid: "กรุณากรอกเป็นตัวเลข",
  },

  progress: {
    heading: "กำลังวิเคราะห์",
    queued: "รอคิวการวิเคราะห์",
    running: "กำลังวิเคราะห์ข้อมูล",
    cancel: "ยกเลิกการวิเคราะห์",
    retry: "ลองวิเคราะห์อีกครั้ง",
    retryNote: "จะเริ่มการวิเคราะห์ใหม่สำหรับพื้นที่เดิม ผลเดิมจะไม่ถูกแก้ไข",
    retrying: "กำลังเริ่มใหม่",
    backToIntake: "กลับไปหน้ากรอกข้อมูล",
    expiresAt: "ผลลัพธ์นี้จะหมดอายุ",
    targetHeading: "พื้นที่ที่วิเคราะห์",
    /* The headline numbers, so the overview answers "what did you find" without five tab visits. */
    summaryHeading: "สรุปตัวเลขสำคัญของพื้นที่นี้",
    summaryNote: "เป็นช่วงต่ำสุด–สูงสุดของตัวเลขที่แหล่งข้อมูลประกาศไว้จริงในพื้นที่นี้ ไม่ใช่ค่าเฉลี่ย และไม่ใช่ราคาตลาด",
    summaryEmpty: "พื้นที่นี้ยังไม่มีตัวเลขที่สรุปเป็นช่วงได้",
    summaryCondo: "ราคาประเมินห้องชุด",
    summaryLand: "ราคาประเมินที่ดิน",
    summaryPopulation: "ประชากรตามทะเบียนราษฎร",
    summaryConcepts: "แนวคิดที่เสนอ",
    summaryConceptsUnit: "แนวคิด",
    summaryFromItems: "จาก {n} รายการในพื้นที่",
    /* Which place a figure is about. Printed on every tile, not only the borrowed ones, because
       "this subdistrict" is the fact a reader relies on when they read the number. */
    summaryLevelOwn: "ข้อมูลของตำบลนี้",
    /* {area} is the area the figures actually describe. It was hardcoded to "อำเภอ", which
       printed a provincial population under the word for district. */
    summaryLevelContext: "ข้อมูลของ{area} ใช้เป็นบริบท",
    summaryBorrowedNote:
      "ตัวเลขที่กำกับว่า “ใช้เป็นบริบท” เป็นของพื้นที่ที่ครอบคลุมตำบลนี้ เช่น อำเภอหรือจังหวัด เพราะหน่วยงานยังไม่ได้ประกาศตัวเลขรายตำบล ใช้ประกอบการพิจารณาได้ แต่ไม่ใช่ตัวเลขของตำบลนี้โดยตรง",
    stageHeading: "ขั้นตอนการทำงาน",
    stageIntro: "รายการนี้บอกว่าระบบทำอะไรให้แล้วบ้าง และขั้นไหนยังให้คำตอบไม่ได้ พร้อมเหตุผล",
    stageSucceeded: "เสร็จแล้ว",
    stageSkipped: "ยังไม่เปิดใช้งาน",
    /* A stage waiting on the one before it is not a stage somebody switched off, and telling a
       reader it was sends them looking for a setting that does not exist. */
    stageBlocked: "รอผลจากขั้นก่อนหน้า",
    stageDegraded: "ได้ข้อมูลไม่ครบ",
    stageFailed: "ไม่สำเร็จ",
    stageFailedRetryable: "ไม่สำเร็จ ลองใหม่ได้",
    stageRunning: "กำลังทำงาน",
    stagePending: "รอดำเนินการ",
    stage: {
      TARGET_RESOLUTION: "ระบุพื้นที่เป้าหมาย",
      EVIDENCE_ACQUISITION: "รวบรวมหลักฐาน",
      CONCEPT_PROPOSAL: "เสนอแนวคิดการใช้ประโยชน์",
      VALIDATION: "ตรวจสอบกฎหมาย/กายภาพ/ดีมานด์",
      SCENARIO: "คำนวณความเป็นไปได้ทางการเงิน",
      COMPARISON: "เปรียบเทียบและสรุปผล",
    },
    /**
     * Why a stage did not complete, at the length the question deserves.
     *
     * The one-line reason beside a row says what happened; these say why, on whose authority, and
     * what would change it — in the register a submitted academic document is written in, because
     * an examiner reading "ยังไม่เปิดใช้งาน" is entitled to more than a shrug.
     *
     * Keyed by reason code first, then by stage for the cases that carry no code.
     */
    stageWhyToggle: "ทำไมจึงเป็นเช่นนี้",
    stageWhy: {
      /* Rewritten once the feasibility method was reviewed. It used to say the system shows no
         yield or payback at all, which the feasibility tab had by then made untrue — and a reason
         that contradicts the screen beside it costs the reader more trust than the limitation it
         was explaining. The limitation itself is unchanged: no cost dataset, so no evidence-based
         comparison between concepts. */
      COMPONENT_NOT_ACTIVATED:
        "ยังไม่มีชุดข้อมูลต้นทุนค่าก่อสร้างที่อ้างอิงได้และครอบคลุมทุกจังหวัด ตามเกณฑ์การเปิดใช้งานใน docs/implementation-plan.md §4 ระบบจึงยังคำนวณผลตอบแทนของแต่ละแนวคิดจากหลักฐานของพื้นที่นี้ไม่ได้ และยังเปรียบเทียบความคุ้มค่าระหว่างแนวคิดไม่ได้ ทั้งนี้ผู้ใช้สามารถกรอกสมมติฐานเองเพื่อคำนวณระยะเวลาคืนทุนและอัตราผลตอบแทนได้ที่แท็บความเป็นไปได้ทางการเงิน โดยผลลัพธ์จะผูกกับสมมติฐานที่กรอก มิใช่หลักฐานของพื้นที่",
      SOURCE_NOT_ACTIVATED:
        "แหล่งข้อมูลที่เกี่ยวข้องยังไม่ผ่านเกณฑ์การเปิดใช้งาน จึงยังไม่ถูกนำมาใช้ประกอบการวิเคราะห์ สถานะการเปิดใช้งานของทุกแหล่งตรวจสอบได้ที่หน้าสถานะระบบ",
      NO_EVIDENCE_FOR_AREA:
        "แหล่งข้อมูลที่เปิดใช้งานแล้วไม่ได้เผยแพร่ตัวเลขสำหรับพื้นที่นี้ กรณีนี้ถือเป็นช่องว่างของความครอบคลุมของข้อมูล มิใช่การยืนยันว่าพื้นที่นี้ไม่มีอสังหาริมทรัพย์หรือมีมูลค่าเป็นศูนย์",
      NO_CANDIDATES:
        "ยังไม่มีแนวคิดการใช้ประโยชน์ที่จะนำเข้าสู่ขั้นตอนนี้ได้ ขั้นตอนนี้จะทำงานต่อเมื่อขั้นตอนก่อนหน้าเสนอแนวคิดที่มีหลักฐานรองรับได้อย่างน้อยหนึ่งรายการ",
      AI_DISABLED:
        "การเรียกใช้แบบจำลองภาษาถูกปิดไว้สำหรับการติดตั้งนี้ ระบบจะไม่สร้างแนวคิดขึ้นเองโดยไม่มีหลักฐานรองรับ",
      AI_RATE_LIMITED:
        "ผู้ให้บริการแบบจำลองภาษาจำกัดอัตราการเรียกใช้ในช่วงเวลาดังกล่าว ระบบไม่เรียกซ้ำเกินโควตาที่กำหนดไว้ต่อหนึ่งการวิเคราะห์ ท่านสามารถเริ่มการวิเคราะห์ใหม่ได้",
      AI_QUOTA_EXHAUSTED:
        "โควตาการเรียกใช้แบบจำลองภาษาประจำวันถูกใช้ครบแล้ว ระบบจะไม่เรียกใช้เกินโควตาที่บันทึกไว้ และจะกลับมาทำงานได้ในรอบโควตาถัดไป",
      AI_PROVIDER_BUSY:
        "ผู้ให้บริการแบบจำลองภาษาไม่พร้อมให้บริการชั่วคราว ระบบไม่ถือว่าเหตุขัดข้องของผู้ให้บริการเป็นข้อสรุปเชิงวิเคราะห์ ท่านสามารถเริ่มการวิเคราะห์ใหม่ได้",
      AI_TIMEOUT:
        "แบบจำลองภาษาตอบกลับเกินกรอบเวลาที่กำหนดไว้ ระบบจึงยุติการรอเพื่อมิให้การวิเคราะห์ค้างโดยไม่มีกำหนด",
      AI_UNAVAILABLE:
        "ระบบติดต่อผู้ให้บริการแบบจำลองภาษาไม่ได้ กรณีนี้เป็นความขัดข้องเชิงปฏิบัติการ มิใช่ข้อสรุปว่าพื้นที่นี้ไม่มีแนวคิดที่เป็นไปได้",
      AI_OUTPUT_INVALID:
        "คำตอบที่ได้รับไม่ผ่านการตรวจสอบโครงสร้างข้อมูลหรือการอ้างอิงหลักฐาน ระบบไม่แสดงผลที่ตรวจสอบไม่ผ่าน แม้จะมีเนื้อหาที่อ่านได้ก็ตาม",
      AI_FAILURE: "ไม่ได้ชุดแนวคิดที่ครบถ้วนเพียงพอจะนำไปสรุปผลต่อได้ ระบบจึงไม่นำผลบางส่วนไปใช้เป็นข้อสรุป",
      ANALYSIS_INCOMPLETE:
        "การวิเคราะห์หยุดลงระหว่างดำเนินการ ระบบรายงานตามสถานะที่เกิดขึ้นจริงแทนการแสดงผลที่ยังไม่สมบูรณ์ ขอความกรุณาเริ่มการวิเคราะห์ใหม่",
    },
    stageReason: {
      NO_CANDIDATES: "ยังไม่มีแนวคิดให้ตรวจ",
      AI_FAILURE: "ไม่ได้ชุดแนวคิดที่ครบพอจะสรุปผล",
      AI_PROVIDER_BUSY: "บริการ AI หนาแน่นชั่วคราว",
      AI_QUOTA_EXHAUSTED: "โควตา AI หมดแล้ววันนี้",
      AI_RATE_LIMITED: "เรียก AI ถี่เกินไป รออีกสักครู่",
      AI_TIMEOUT: "ใช้เวลานานเกินกำหนด",
      AI_UNAVAILABLE: "ติดต่อบริการไม่ได้",
      AI_OUTPUT_INVALID: "คำตอบไม่ผ่านการตรวจสอบ",
      ANALYSIS_INCOMPLETE: "การวิเคราะห์หยุดกลางทาง กรุณาเริ่มใหม่อีกครั้ง",
    },
  },

  /**
   * Running the reviewed feasibility method across every proposed concept at once.
   *
   * The wording works hard in two places. It never calls the table a ranking: the rows stay in
   * proposal order and the highest yield is not marked, because a return computed from the reader's
   * own guesses is a property of the guesses. And it puts the legal column beside the money column
   * on purpose — chasing the best yield onto land where the use cannot be cleared is the specific
   * mistake this screen exists to prevent.
   */
  compare: {
    heading: "เทียบผลตอบแทนระหว่างแนวคิด",
    intro:
      "ใช้วิธีคำนวณเดียวกับแท็บความเป็นไปได้ทางการเงิน แต่คำนวณให้ทุกแนวคิดพร้อมกัน เพื่อให้เห็นว่าภายใต้สมมติฐานชุดเดียวกัน แต่ละแนวทางให้ผลต่างกันอย่างไร ตัวเลขทุกตัวมาจากสมมติฐานที่ท่านกรอกเอง ไม่ใช่ราคาตลาดที่สำรวจได้",
    sharedHeading: "สมมติฐานร่วม ใช้กับทุกแนวคิด",
    perConceptHeading: "สมมติฐานรายแนวคิด",
    perConceptNote:
      "ค่าเริ่มต้นเท่ากันทุกแนวคิด หากไม่แก้ตัวเลขให้ต่างกัน ผลลัพธ์ย่อมออกมาเท่ากันทุกแนวคิด เพราะแนวคิดที่ต่างกันย่อมมีต้นทุนต่อตารางเมตรและค่าเช่าที่ต่างกัน",
    compute: "คำนวณเทียบทุกแนวคิด",
    resultHeading: "ผลการเทียบ",
    columnConcept: "แนวคิด",
    columnLegal: "ผลตรวจข้อกำหนด",
    columnCapital: "เงินลงทุนรวม",
    columnNet: "รายได้สุทธิต่อปี",
    columnPayback: "คืนทุน",
    columnYield: "ผลตอบแทนต่อปี",
    floorArea: "พื้นที่อาคาร (ตร.ม.)",
    cost: "ต้นทุนก่อสร้าง (บาท/ตร.ม.)",
    rent: "ค่าเช่า (บาท/ตร.ม./เดือน)",
    /* Said where the numbers are, not only in a footnote: an unresolved legal check does not become
       less unresolved because a concept happens to show the largest return. */
    notARanking:
      "ตารางนี้เรียงตามลำดับที่เสนอ ไม่ได้เรียงตามความคุ้มค่า และระบบไม่ได้ระบุว่าแนวคิดใดดีที่สุด ตัวเลขผลตอบแทนคำนวณจากสมมติฐานที่ท่านกรอก การเปลี่ยนสมมติฐานย่อมเปลี่ยนลำดับได้ทั้งหมด",
    legalWarning:
      "แนวคิดที่ผลตรวจข้อกำหนดยังไม่ผ่านหรือยังสรุปไม่ได้ ไม่อาจถือว่าทำได้จริงเพียงเพราะให้ผลตอบแทนสูงกว่า ต้องแก้ข้อกำหนดให้ผ่านก่อนเสมอ",
    noConcepts: "ยังไม่มีแนวคิดให้เทียบ ระบบจะเทียบได้เมื่อขั้นตอนเสนอแนวคิดทำงานเสร็จแล้ว",
    identicalWarning:
      "ขณะนี้ทุกแนวคิดใช้สมมติฐานชุดเดียวกัน ผลลัพธ์จึงเท่ากันทั้งหมด กรุณาปรับต้นทุนหรือค่าเช่าของแต่ละแนวคิดให้ต่างกันตามความเป็นจริง",
    notComputedShort: "คำนวณไม่ได้",
  },

  feasibility: {
    heading: "ความเป็นไปได้ทางการเงินเบื้องต้น",
    intro:
      "ส่วนนี้คำนวณจากสมมติฐานที่ท่านระบุเองทั้งหมดในฝั่งต้นทุนก่อสร้างและฝั่งรายรับ เนื่องจากประเทศไทยยังไม่มีแหล่งข้อมูลสาธารณะที่เผยแพร่ต้นทุนค่าก่อสร้างและอัตราค่าเช่ารายพื้นที่อย่างเป็นระบบ ผลลัพธ์จึงแม่นยำเท่าที่สมมติฐานแม่นยำ",
    assumptionBadge: "สมมติฐานที่ท่านระบุ",
    evidenceBadge: "จากราคาประเมินของรัฐ",
    landValueLabel: "มูลค่าที่ดิน (บาท)",
    landValueHelp: "ระบบเติมให้จากราคาประเมินที่ดินเมื่อคำนวณไว้แล้ว แก้ไขเป็นราคาซื้อขายจริงได้",
    floorAreaLabel: "พื้นที่อาคารรวมทุกชั้น (ตารางเมตร)",
    /**
     * The published construction figures, offered beside the field rather than typed into it.
     *
     * The run already reads ราคาประเมินสิ่งปลูกสร้าง from the Treasury — 69 figures for ปทุมธานี —
     * and the system's own evidence model files them under
     * `economic.construction_cost_reference`. They were on the screen above and the calculator
     * still asked the reader to find a number themselves, which is what the owners meant by
     * "ข้อมูลครบแต่แอปไม่ประมวลผลให้".
     *
     * Offered, never filled in automatically, and named for what it is. An assessed value is set
     * for tax purposes from standard cost tables; it is not a builder's quotation, and a reader
     * choosing it is making that substitution knowingly.
     */
    constructionSuggestHeading: "ตัวเลขจากกรมธนารักษ์ที่ใช้แทนได้",
    constructionSuggestNote:
      "เป็น “ราคาประเมินสิ่งปลูกสร้าง” ที่กรมธนารักษ์ประกาศไว้ใช้คำนวณภาษี ไม่ใช่ราคาค่าก่อสร้างจริงจากผู้รับเหมา ถ้ามีใบเสนอราคาจริง ควรใช้ตัวเลขนั้นแทน",
    constructionSuggestPick: "เลือกประเภทสิ่งปลูกสร้าง",
    constructionSuggestUse: "ใช้ตัวเลขนี้",
    constructionCostLabel: "ต้นทุนค่าก่อสร้างต่อตารางเมตร (บาท)",
    rentLabel: "ค่าเช่าที่คาดว่าจะได้ ต่อตารางเมตรต่อเดือน (บาท)",
    occupancyLabel: "อัตราการปล่อยเช่าได้ที่คาด (ร้อยละ)",
    operatingCostLabel: "ค่าใช้จ่ายดำเนินการ คิดเป็นร้อยละของรายรับ",
    compute: "คำนวณ",
    resultHeading: "ผลการคำนวณ",
    capitalTotal: "เงินลงทุนรวม",
    grossRevenue: "รายรับรวมต่อปี",
    operatingCost: "ค่าใช้จ่ายดำเนินการต่อปี",
    netIncome: "รายได้สุทธิต่อปี",
    payback: "ระยะเวลาคืนทุนอย่างง่าย",
    paybackUnit: "ปี",
    simpleYield: "อัตราผลตอบแทนอย่างง่าย",
    simpleYieldUnit: "ร้อยละต่อปี",
    stepsHeading: "วิธีคิดทีละบรรทัด",
    sensitivityHeading: "ถ้าสมมติฐานคลาดเคลื่อน ผลจะเปลี่ยนไปเท่าไหร่",
    sensitivityNote:
      "ปรับสมมติฐานทีละตัวตามร้อยละที่กำหนด แล้วคำนวณซ้ำด้วยสูตรชุดเดิม ช่องว่างหมายถึงกรณีที่ไม่มีระยะเวลาคืนทุน",
    sensitivityColumn: "สมมติฐาน",
    sensitivityChange: "เปลี่ยนแปลง",
    limitationsHeading: "ข้อจำกัดของวิธีคำนวณนี้",
    neverProducesHeading: "สิ่งที่การคำนวณนี้ไม่ได้บอก",
    notMarketAdvice:
      "ผลลัพธ์นี้เป็นการคำนวณเลขคณิตจากสมมติฐานที่ท่านระบุ มิใช่การประเมินมูลค่า มิใช่คำแนะนำการลงทุน และมิใช่ข้อสรุปว่าโครงการคุ้มค่าแก่การลงทุนหรือไม่",
    noPayback: "รายได้สุทธิต่อปีไม่มากกว่าศูนย์ภายใต้สมมติฐานชุดนี้ จึงไม่มีระยะเวลาคืนทุนให้คำนวณ",
    reason: {
      FEASIBILITY_METHOD_NOT_REVIEWED: "วิธีคำนวณนี้ยังไม่ผ่านการตรวจทานเชิงวิชาการ ระบบจึงยังไม่คำนวณให้",
      FLOOR_AREA_MISSING: "ยังไม่ได้ระบุพื้นที่อาคาร",
      CONSTRUCTION_COST_MISSING: "ยังไม่ได้ระบุต้นทุนค่าก่อสร้างต่อตารางเมตร",
      RENT_MISSING: "ยังไม่ได้ระบุค่าเช่าที่คาดว่าจะได้",
      OCCUPANCY_NOT_USABLE: "อัตราการปล่อยเช่าได้ต้องมากกว่าร้อยละ 0 และไม่เกินร้อยละ 100",
      OPERATING_COST_RATE_NOT_USABLE: "สัดส่วนค่าใช้จ่ายดำเนินการต้องอยู่ระหว่างร้อยละ 0 ถึง 100",
      LAND_VALUE_NOT_USABLE: "มูลค่าที่ดินต้องไม่ติดลบ",
    },
  },

  valuation: {
    heading: "ประเมินมูลค่าตามราคาประเมินราชการ",
    intro:
      "เลือกประเภทสิ่งปลูกสร้างและระบุพื้นที่อาคาร ระบบจะคูณด้วยราคาประเมินที่กรมธนารักษ์ประกาศไว้สำหรับจังหวัดนี้ และแสดงวิธีคิดให้ตรวจสอบได้ทุกบรรทัด",
    buildingTypeLabel: "ประเภทสิ่งปลูกสร้าง",
    buildingTypePlaceholder: "เลือกประเภทสิ่งปลูกสร้าง",
    floorAreaLabel: "พื้นที่อาคารรวมทุกชั้น (ตารางเมตร)",
    floorAreaPlaceholder: "เช่น 120",
    landHeading: "ประเมินมูลค่าที่ดิน",
    landIntro: "เลือกลักษณะที่ตั้งของที่ดินและระบุเนื้อที่ ระบบจะคูณด้วยราคาประเมินที่กรมธนารักษ์ประกาศไว้สำหรับพื้นที่นี้",
    landUnitLabel: "ลักษณะที่ตั้งของที่ดิน",
    landUnitPlaceholder: "เลือกลักษณะที่ตั้ง",
    landAreaLabel: "เนื้อที่ดิน",
    rai: "ไร่",
    ngan: "งาน",
    wa: "ตารางวา",
    landNotTitleDeed:
      "ชุดข้อมูลนี้ครอบคลุมเฉพาะที่ดินที่มีเอกสารสิทธิประเภทอื่นนอกเหนือจากโฉนดที่ดินและ น.ส.3 ก. หากที่ดินของคุณเป็นโฉนด ตัวเลขนี้ไม่ใช่ราคาประเมินของที่ดินแปลงนั้น",
    landRangeNote:
      "กรมธนารักษ์ประกาศราคาไว้มากกว่าหนึ่งค่าสำหรับหน่วยที่ดินนี้ในพื้นที่เดียวกัน และชุดข้อมูลไม่ได้ระบุว่าค่าใดใช้กับบล็อกใด จึงแสดงเป็นช่วงราคา ใช้คำนวณมูลค่าไม่ได้",
    noLandRates: "พื้นที่นี้ยังไม่มีราคาประเมินที่ดินในชุดข้อมูลนี้",
    compute: "คำนวณมูลค่า",
    resultHeading: "มูลค่าตามราคาประเมิน",
    stepsHeading: "วิธีคิด",
    baht: "บาท",
    limitationsHeading: "ข้อจำกัดของตัวเลขนี้",
    methodLabel: "วิธีคำนวณ",
    reviewedBy: "ตรวจทานโดย",
    notMarketValue:
      "นี่คือราคาประเมินเพื่อการจัดเก็บภาษี ไม่ใช่ราคาตลาดและไม่ใช่ราคาซื้อขายจริง โดยทั่วไปราคาตลาดสูงกว่านี้ ห้ามใช้แทนการประเมินโดยผู้ประเมินหลักทรัพย์",
    noRates: "จังหวัดนี้ยังไม่มีราคาประเมินสิ่งปลูกสร้างในระบบ จึงยังคำนวณไม่ได้",
    reason: {
      VALUATION_METHOD_NOT_REVIEWED: "วิธีคำนวณยังไม่ผ่านการตรวจทาน จึงยังไม่ทำงาน",
      VALUATION_METHOD_MISSING: "ไม่พบวิธีคำนวณที่ต้องใช้",
      RATE_NOT_NUMERIC: "ราคาประเมินที่ได้มาไม่ใช่ตัวเลข",
      RATE_NOT_USABLE: "ราคาประเมินที่ได้มาใช้คำนวณไม่ได้",
      FLOOR_AREA_MISSING: "ยังไม่ได้ระบุพื้นที่อาคาร",
      LAND_AREA_MISSING: "ยังไม่ได้ระบุเนื้อที่ดิน",
    },
  },

  nav: {
    label: "เมนูหลัก",
    appName: "วิเคราะห์ศักยภาพที่ดิน",
    startHeading: "เริ่มต้น",
    chooseArea: "เลือกพื้นที่",
    resultHeading: "ผลการวิเคราะห์",
    resultLocked: "เลือกพื้นที่แล้วกดวิเคราะห์ก่อน หัวข้อเหล่านี้จึงจะเปิดได้",
    savedAreas: "พื้นที่ที่สนใจ",
    systemHeading: "ระบบ",
    systemStatus: "สถานะระบบ",
    footerNote: "ผลแต่ละครั้งเก็บไว้ 24 ชั่วโมงแล้วหมดอายุ ไม่มีประวัติย้อนหลังและไม่มีการแชร์สาธารณะ",
    openMenu: "เปิดเมนู",
    closeMenu: "ปิดเมนู",
    collapse: "ซ่อนเมนู",
    expand: "แสดงเมนู",
  },

  status: {
    heading: "สถานะระบบ",
    intro:
      "หน้านี้บอกว่าตอนนี้ระบบทำอะไรได้บ้าง และใครเป็นผู้รับผิดชอบ ทุกครั้งที่ระบบตอบว่า “พื้นที่นี้ยังไม่มีข้อมูล” คำตอบนั้นตรวจสอบได้จากที่นี่",
    loading: "กำลังอ่านสถานะ",
    failed: "อ่านสถานะระบบไม่สำเร็จ",
    sourcesHeading: "แหล่งข้อมูล",
    sourcesSummary: "เปิดใช้งาน {active} จาก {total} แหล่ง · หลักฐานที่ใช้งานได้ {figures} รายการ",
    methodsHeading: "ชุดกฎและวิธีคำนวณ",
    methodsIntro:
      "ทั้งสองอย่างนี้ทำงานได้ก็ต่อเมื่ออยู่ในสถานะตรวจทานแล้วและเนื้อหายังไม่ถูกแก้หลังการตรวจทาน หากถูกแก้ ระบบจะหยุดใช้ทันทีโดยไม่สืบทอดการอนุมัติเดิม",
    rules: "ข้อ",
    reviewedBy: "ตรวจทานโดย",
    notReviewed: "ยังไม่มีบันทึกการตรวจทาน จึงยังทำงานไม่ได้",
    aiHeading: "การใช้ AI",
    aiMode: "โหมด",
    aiModel: "โมเดล",
    aiToday: "เรียกไปแล้ววันนี้",
    aiRemaining: "เหลือวันนี้",
    aiNoBudget: "ยังไม่ได้บันทึกโควตา",
    aiOutcomes: "ผลการเรียกวันนี้",
    aiSuccess: "สำเร็จ",
    times: "ครั้ง",
    footnote:
      "ตัวเลขทั้งหมดอ่านจากฐานข้อมูลของระบบโดยตรง ณ เวลาที่เปิดหน้านี้ ไม่มีข้อมูลของการวิเคราะห์ครั้งใดครั้งหนึ่งแสดงอยู่ที่นี่",
    state: {
      ACTIVE: "เปิดใช้งาน",
      INACTIVE: "ยังไม่เปิดใช้งาน",
      RETIRED: "เลิกใช้แล้ว",
      ACADEMIC_REVIEWED: "ตรวจทานแล้ว",
      DRAFT: "ฉบับร่าง",
    },
    mode: {
      LIVE_AI: "เรียกโมเดลจริง",
      RECORDED_AI: "ใช้ตัวอย่างที่บันทึกไว้",
      AI_DISABLED: "ปิดใช้งาน",
    },
  },

  resultTabs: {
    overview: "ภาพรวม",
    prices: "ราคาอสังหาในพื้นที่",
    area: "ข้อมูลพื้นที่",
    valuation: "ประเมินมูลค่า",
    concepts: "แนวคิดการใช้ประโยชน์",
    noPrices: "พื้นที่นี้ยังไม่มีข้อมูลราคาอสังหาในระบบ ซึ่งไม่ได้แปลว่าพื้นที่นี้ไม่มีอสังหาริมทรัพย์",
  },

  runState: {
    QUEUED: "รอคิว",
    RUNNING: "กำลังวิเคราะห์",
    COMPLETE: "เสร็จสมบูรณ์",
    PARTIAL: "ได้ผลบางส่วน",
    FAILED_RETRYABLE: "เกิดข้อผิดพลาด ลองใหม่ได้",
    FAILED_FINAL: "ทำงานไม่สำเร็จ",
    EXPIRED: "หมดอายุแล้ว",
    CANCELLED: "ยกเลิกแล้ว",
  },

  notActivated: {
    heading: "ยังไม่มีผลวิเคราะห์",
    body: "ระบบระบุพื้นที่เป้าหมายได้แล้ว แต่ขั้นตอนตรวจสอบกฎหมาย/กายภาพ/ดีมานด์ และการวิเคราะห์การเงิน ยังไม่เปิดใช้งาน จึงยังไม่มีข้อสรุปหรือคำแนะนำใด ๆ ให้แสดง",
    why: "ระบบจะไม่แสดงคำแนะนำจนกว่าจะมีหลักฐานรองรับจริง การเดาแทนจึงไม่ใช่ทางเลือก",
  },

  /**
   * หน้าหลักฐาน: ทุกตัวเลขต้องมาพร้อมกับที่มา ปีที่เผยแพร่ ระดับพื้นที่ และข้อจำกัดของมันเสมอ
   * (docs/data-architecture.md §5, docs/output-policy.md)
   */
  evidence: {
    heading: "หลักฐานที่รวบรวมได้",
    intro: "ตัวเลขทั้งหมดด้านล่างเป็นข้อมูลที่เผยแพร่จริงจากแหล่งข้อมูลที่ระบุ ยังไม่ผ่านการตีความหรือสรุปผลใด ๆ",
    noneHeading: "ยังไม่มีหลักฐานสำหรับพื้นที่นี้",
    noneBody: "แหล่งข้อมูลที่เปิดใช้งานแล้วไม่ได้เผยแพร่ข้อมูลที่ครอบคลุมพื้นที่เป้าหมายนี้ ระบบจะไม่ใช้ข้อมูลของพื้นที่อื่นมาแทน",
    notActivatedHeading: "ยังไม่ได้เปิดใช้งานแหล่งข้อมูล",
    notActivatedBody:
      "แหล่งข้อมูลจะถูกใช้ได้ก็ต่อเมื่อผ่านการตรวจสอบสิทธิ์การใช้งาน ความหมายของข้อมูล ขอบเขต และการอนุมัติที่บันทึกชื่อผู้ตรวจไว้แล้วเท่านั้น",
    cohortHeading: "กลุ่มครัวเรือน",
    valueHeading: "ค่าที่เผยแพร่",
    periodHeading: "ปีข้อมูล",
    scopeWarning: "ขอบเขตของหลักฐาน",
    sourceLabel: "แหล่งข้อมูล",
    limitLabel: "ข้อจำกัด",
    showDetail: "ดูรายละเอียดและข้อจำกัด",
    rangeNote: "ช่วงราคาระหว่างชั้นต่ำสุดถึงชั้นสูงสุด ไม่ได้ระบุว่าชั้นใดมีราคาเท่าใด",
    openInMaps: "ดูตำแหน่งในแผนที่",
    showAllItems: "ดูทั้งหมด",
    showFewerItems: "ย่อรายการ",
    moreItems: "รายการ",
    hideDetail: "ซ่อนรายละเอียด",
    temporal: {
      CURRENT: "เป็นข้อมูลรอบล่าสุด",
      RECENT: "ข้อมูลย้อนหลังไม่เกิน 3 ปี",
      DATED: "ข้อมูลเก่ากว่า 3 ปี",
      UNKNOWN: "ไม่ทราบช่วงเวลา",
    },
    fitness: {
      FIT: "ใช้ตอบคำถามนี้ได้โดยตรง",
      FIT_WITH_CAVEAT: "ใช้ได้โดยมีข้อควรระวัง",
      CONTEXT_ONLY: "ใช้เป็นบริบทประกอบเท่านั้น ไม่ใช่ข้อมูลของพื้นที่เป้าหมายโดยตรง",
      UNFIT: "ไม่เหมาะกับคำถามนี้",
    },
  },

  /**
   * หน้าจอแนวคิด: แนวคิดมาจาก AI แต่ผลตรวจกฎหมายมาจากเครื่องตรวจแบบ deterministic เท่านั้น
   * ข้อความทุกจุดต้องบอกให้ชัดว่าอะไรคือข้อเสนอ อะไรคือผลตรวจ
   */
  concepts: {
    heading: "แนวคิดการใช้ประโยชน์ที่เสนอ",
    intro:
      "แนวคิดด้านล่างเป็นข้อเสนอที่สร้างจากหลักฐานข้างต้นเท่านั้น ยังไม่ใช่คำแนะนำ และยังไม่ได้จัดลำดับว่าแนวคิดใดดีกว่ากัน",
    disabledHeading: "ยังไม่ได้เปิดใช้งานการเสนอแนวคิด",
    disabledBody: "ขั้นตอนเสนอแนวคิดยังปิดอยู่ ระบบจะไม่สร้างแนวคิดขึ้นเองโดยไม่มีหลักฐานรองรับ",
    failedHeading: "เสนอแนวคิดไม่สำเร็จ",
    noneHeading: "หลักฐานที่มียังไม่พอจะเสนอแนวคิดใดได้",
    noneBody: "ระบบจะไม่เสนอแนวคิดที่หลักฐานปัจจุบันรองรับไม่ได้",
    uncertaintyLabel: "ความไม่แน่นอนที่ระบุไว้",
    demandLabel: "สมมติฐานด้านดีมานด์",
    counterLabel: "หลักฐานที่จะหักล้างสมมติฐานนี้",
    unmappedLabel: "กิจกรรมที่ยังจับคู่รหัสไม่ได้",
    legalHeading: "ผลตรวจข้อกำหนดตามกฎหมายควบคุมอาคาร",
    /* The one legal caveat with real money behind a misreading. "ตรวจกฎหมายแล้ว" is easy to hear as
       "สร้างได้แน่นอน", when what was actually checked is one narrow rule about setback distance.
       Zoning decides what may be built at all, and the rule pack still does not read it.

       What changed is what the sentence can honestly say next. It used to send the reader to the
       provincial planning office to look the plan up, and by the time ADR 0008 landed the app was
       showing them that plan on the same result — the system was telling someone to go and find
       what it had just handed them. The gap is the same and still named; the errand is not. */
    legalDisclaimer:
      "ผลนี้ตรวจเฉพาะระยะร่นอาคารตามกฎกระทรวงฉบับที่ 55 เท่านั้น ไม่ได้นำผังเมืองรวมมาตัดสินด้วย ซึ่งเป็นคนละเรื่องกับระยะร่น — ผังเมืองเป็นตัวกำหนดว่าที่ดินแปลงนี้ใช้ประโยชน์ประเภทใดได้บ้าง และจำกัดความสูงอาคาร ระบบแสดงผังเมืองของจุดที่ปักหมุดไว้ให้ดูแล้ว แต่เป็นข้อมูลประกอบ ไม่ได้ถูกนำเข้าสู่การตรวจข้อกำหนด ก่อนตัดสินใจลงทุนจริงยังต้องยืนยันกับสำนักงานโยธาธิการและผังเมืองจังหวัดอยู่ดี ผลตรวจนี้ไม่ใช่การรับรองทางกฎหมาย และไม่ครอบคลุมข้อบัญญัติท้องถิ่น",
    missingInputsLabel: "ข้อมูลที่ต้องมีเพิ่มจึงจะตรวจข้อนี้ได้",
    requirementLabel: "ข้อกำหนดสำหรับที่ดินแปลงนี้",
    unresolvedApplicability: "ยังระบุไม่ได้ว่ากฎข้อนี้ใช้กับที่ดินแปลงนี้หรือไม่",
    approvalLabel: "รายการที่ต้องขออนุญาต",
    searchRecordLabel: "บันทึกการค้นหาแนวคิด",
    fixtureNotice:
      "แนวคิดชุดนี้มาจากตัวอย่างที่บันทึกไว้ล่วงหน้า ไม่ได้สร้างใหม่จากโมเดลภาษา ใช้เพื่อสาธิตการทำงานของระบบ",
    liveNotice: "แนวคิดชุดนี้สร้างโดยโมเดลภาษาจากหลักฐานข้างต้น และผ่านการตรวจสอบรูปแบบและการอ้างอิงแล้ว",
    buildingTypeLabel: "ประเภทอาคารตามกฎกระทรวง",

    /* Section headings for one concept card. The card used to be nine paragraphs of equal weight
       with the labels buried inline; a reader deciding anything needs to see where "what" ends and
       "what could go wrong" begins. */
    whyHeading: "ทำไมถึงเสนอแนวคิดนี้",
    riskHeading: "ข้อควรระวังของแนวคิดนี้",
    demandGroupLabel: "กลุ่มเป้าหมาย",
    demandMechanismLabel: "เหตุผลที่คาดว่าจะมีดีมานด์",
    legalDetailsToggle: "ดูข้อกำหนดที่ตรวจทีละข้อ",
    /* The model cites its evidence by id inside its own sentences. Left exactly as written — the
       citation is the audit trail — but a reader meeting "ev9" deserves to be told what it is. */
    citationNote: "รหัส ev… ในข้อความคือหมายเลขอ้างอิงหลักฐานที่ระบบใช้ตรวจย้อนกลับได้",
  },

  validationStatus: {
    PASS: "ผ่าน",
    FAIL: "ไม่ผ่าน",
    PARTIAL: "ผ่านบางส่วน",
    UNKNOWN: "ยังสรุปไม่ได้",
  },

  aiFailure: {
    AI_DISABLED: "ขั้นตอนเสนอแนวคิดยังปิดใช้งานอยู่",
    AI_QUOTA_EXHAUSTED:
      "โควตาการใช้ AI ของโปรเจกต์นี้หมดแล้วสำหรับวันนี้ ระบบแสดงเฉพาะหลักฐานที่รวบรวมได้ และจะไม่ให้คำแนะนำใด ๆ จนกว่าจะขึ้นวันใหม่",
    AI_RATE_LIMITED:
      "มีการเรียก AI ถี่เกินกว่าที่ผู้ให้บริการอนุญาตในช่วงเวลาสั้น ๆ ระบบจึงยังไม่ได้เสนอแนวคิด โควตาของวันนี้ยังเหลืออยู่ กรุณากดวิเคราะห์อีกครั้งในอีกสักครู่",
    AI_TIMEOUT: "การเสนอแนวคิดใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง",
    AI_PROVIDER_BUSY:
      "ขณะนี้บริการ AI มีผู้ใช้งานหนาแน่นชั่วคราว ระบบยังไม่ได้เสนอแนวคิด กรุณากดวิเคราะห์อีกครั้งในอีกสักครู่ (โควตาของโปรเจกต์ยังไม่ถูกใช้)",
    AI_UNAVAILABLE: "ไม่สามารถติดต่อบริการเสนอแนวคิดได้ในขณะนี้",
    AI_OUTPUT_INVALID: "ข้อเสนอที่ได้รับไม่ผ่านการตรวจสอบความถูกต้อง ระบบจึงไม่นำมาแสดง",
    AI_NO_DEFENSIBLE_CONCEPTS: "หลักฐานที่มียังไม่พอจะเสนอแนวคิดใดได้",
    NO_EVIDENCE: "ยังไม่มีหลักฐานสำหรับพื้นที่นี้ จึงยังเสนอแนวคิดไม่ได้",
    AI_BUDGET_NOT_CONFIGURED:
      "ยังไม่ได้บันทึกโควตาการเรียก AI ของโปรเจกต์ ระบบจึงไม่เรียกโมเดลเพื่อไม่ให้ใช้โควตาโดยไม่มีการควบคุม",
    PACK_NOT_REVIEWED: "ชุดกฎหมายยังไม่ผ่านการตรวจทาน จึงยังไม่ได้ตรวจข้อกำหนดให้",
  },

  /** หน้าผลลัพธ์สุดท้ายตาม docs/output-policy.md — ข้อความบังคับมาจาก renderer ไม่ใช่จาก AI */
  finalResult: {
    heading: "ผลการวิเคราะห์",
    analysedOn: "วันที่วิเคราะห์",
    /* The work, counted, above the limits. Every run reports the same status — the economic
       components flag is a hardcoded false — so leading with it made a fixed sentence look like a
       failure and hid what the run actually produced. */
    workEvidence: "หลักฐานที่อ่านจากแหล่งข้อมูลรัฐ",
    workConcepts: "แนวคิดการใช้ประโยชน์ที่ประเมิน",
    workRules: "ข้อกำหนดที่นำมาตรวจต่อแนวคิด",
    /**
     * One plain sentence before anything else, because the owners read this screen as a reader
     * would and could not tell what it was for: three bare counts in the product's own vocabulary,
     * then three paragraphs of what the analysis could not do, and the two ideas it did produce
     * reduced to a pair of names. "ถ้าเป็นคนใช้งานก็คงไม่เข้าใจว่าหน้านี้บอกอะไร" was the verdict,
     * and it was right.
     *
     * The numbers are the same ones the tiles below show. Saying them in a sentence first is what
     * makes them mean anything: "110" is not an answer to any question a reader arrived with,
     * and "อ่านข้อมูลที่หน่วยงานรัฐเผยแพร่ 110 รายการ" is.
     */
    leadSentence:
      "ระบบอ่านข้อมูลที่หน่วยงานรัฐเผยแพร่ {evidence} รายการ คิดแนวคิดการใช้ที่ดินได้ {concepts} แบบ แล้วเอาข้อกำหนดกฎหมาย {rules} ข้อมาตรวจกับทุกแนวคิด",
    leadStatus: "ข้อสรุปตอนนี้: {status} เหตุผลและสิ่งที่ต้องตรวจต่ออยู่ด้านล่าง",
    statusLabel: "ระดับข้อสรุป",
    scopeLabel: "ขอบเขตของผลลัพธ์",
    missingHeading: "สิ่งที่ยังขาดจึงจะสรุปได้",
    evaluatedHeading: "แนวคิดที่ประเมินแล้ว",
    evaluatedNote: "แสดงตามลำดับที่เสนอ ไม่ได้เรียงตามความเหมาะสม",
    /* The names alone told a reader nothing, and everything that explains them — what the idea is,
       why this area suggested it, what is uncertain about it — was one tab away with nothing on
       this screen saying so. */
    evaluatedOpen: "ดูรายละเอียดแต่ละแนวคิด",
    verificationHeading: "ขั้นตอนต่อไปที่ทำให้สรุปได้",
    /* Read as a plan of work, not as a list of faults. Every line below was derived from something
       this run actually could not settle, and each one names what settling it would change. */
    verificationIntro:
      "รายการนี้คือสิ่งที่ยังขาดอยู่และวิธีเติมให้ครบ ไม่ใช่ข้อผิดพลาดของการวิเคราะห์ เมื่อเติมรายการที่ระบุว่าจำเป็นได้ครบ ระบบจะสรุปให้ได้",
    verificationNote: "ระบบไม่ได้ติดต่อผู้เชี่ยวชาญให้ และไม่ถือว่ารายการใดดำเนินการแล้ว",
    /* The split that matters most to someone reading this at home: two of these need a trip to a
       government office, and two need a tape measure and a minute on the form they just left. */
    selfHeading: "กรอกเองได้ทันที ไม่ต้องไปที่ไหน",
    selfNote:
      "ข้อมูลเหล่านี้วัดหรือระบุเองได้จากที่ดินหรือแผนที่ ไม่ต้องขอเอกสารจากหน่วยงาน เมื่อกรอกแล้ววิเคราะห์ใหม่ ระบบจะตรวจข้อกำหนดที่เกี่ยวข้องให้ทันที",
    selfCta: "กรอกข้อมูลเพิ่มแล้ววิเคราะห์ใหม่",
    /* Grouped by when a reader needs the item, not by which discipline owns it. Someone still
       deciding whether to look at the land does not need an architect's checklist yet. */
    stage: {
      SCREENING: "ก่อนตัดสินใจซื้อที่ดิน",
      DESIGN: "ตอนออกแบบอาคาร",
      PERMIT: "ตอนยื่นขออนุญาตก่อสร้าง",
    },
    stageNote: {
      SCREENING: "ข้อเหล่านี้อาจทำให้ล้มดีลได้ ควรตรวจก่อนวางเงิน",
      DESIGN: "ต้องใช้ตัวเลขจากแบบสถาปัตยกรรมหรือแบบผังบริเวณ ซึ่งจะมีก็ต่อเมื่อเริ่มออกแบบอาคารแล้ว",
      PERMIT: "เป็นเรื่องที่ต้องดำเนินการกับหน่วยงานตอนยื่นขออนุญาต",
    },
    /* The reasoning, one click from the step it belongs to. Printing it on every one of twenty-odd
       rows turned the list into four fifths of the overview screen, in small grey type. */
    actionWhyToggle: "ทำไมต้องตรวจข้อนี้",
    /* The law a step comes from, named the way a reader could find it. */
    legalBasisLabel: "อ้างอิงกฎหมาย",
    legalTextLink: "เปิดตัวบท",
    whyLabel: "เหตุผล",
    sourceLabel: "แหล่งที่ควรตรวจสอบ",
    couldChangeLabel: "ถ้าตรวจสอบแล้วจะเปลี่ยนอะไร",
    policyLabel: "นโยบายการแสดงผล",
  },

  finalStatus: {
    /**
     * What each status means for the reader, not what it is called internally.
     *
     * "หลักฐานยังไม่เพียงพอ" was read — by the project owners, twice — as "the system found no
     * data", which is the opposite of what a run holds: seven hundred published figures, a
     * population, ten building-control rules checked. The status is narrower than that. It means
     * one thing only: there is no common basis on which to say which use is worth most, because
     * Thailand publishes no construction-cost dataset to compare them with.
     *
     * docs/output-policy.md §5 fixes what an INSUFFICIENT_EVIDENCE screen must do — name no
     * leading use, list the missing basis and the minimum verification — and the full status
     * sentence that does it is unchanged. The short label is this product's own words, so it now
     * says the narrow thing it actually means instead of a broad one that frightened readers away
     * from a page full of findings.
     */
    CLEAR_RECOMMENDATION: "มีข้อเสนอที่ชัดเจน",
    INCONCLUSIVE: "ยังสรุปไม่ได้",
    INSUFFICIENT_EVIDENCE: "ยังชี้ไม่ได้ว่าใช้ทำอะไรคุ้มที่สุด",
  },

  verificationDomain: {
    TITLE_AND_IDENTITY: "เอกสารสิทธิ์และการระบุทรัพย์",
    LAW_AND_PLANNING: "กฎหมาย ผังเมือง และการขออนุญาต",
    SURVEY_AND_SITE: "การสำรวจ การเข้าถึง และสภาพพื้นที่",
    MARKET_AND_FINANCE: "ตลาด ดีมานด์ ต้นทุน และสมมติฐานการเงิน",
    SOURCE_CURRENCY: "ความเป็นปัจจุบันและสิทธิ์ของแหล่งข้อมูล",
  },

  /**
   * Said as what the reader gets, not as an abstract weight.
   *
   * "มีผลต่อข้อสรุป" was accurate and unreadable: it describes the item's relationship to a
   * conclusion the reader has not been shown. Each label now states the consequence of supplying
   * the item, which is the only reason a reader is looking at the list.
   */
  verificationPriority: {
    BLOCKING: "จำเป็นต่อการสรุป",
    MATERIAL: "อาจเปลี่ยนข้อสรุปได้",
    ADVISORY: "ควรตรวจสอบ",
  },

  expired: {
    heading: "ผลการวิเคราะห์นี้หมดอายุแล้ว",
    body: "ผลลัพธ์แต่ละครั้งเก็บไว้ 24 ชั่วโมงเท่านั้น และไม่มีการบันทึกประวัติย้อนหลัง กรุณาเริ่มวิเคราะห์ใหม่",
  },

  error: {
    generic: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    loadAreasFailed: "โหลดข้อมูลพื้นที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    retry: "ลองใหม่",
  },

  common: {
    loading: "กำลังโหลด",
    required: "จำเป็น",
  },
} as const;

export type ThaiCatalog = typeof th;
