import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const PARTS = {
  I:   { label: "Part I",   subtitle: "Concerning God",                          color: "#D4A85A" },
  II:  { label: "Part II",  subtitle: "On the Nature and Origin of the Mind",    color: "#5AABCC" },
  III: { label: "Part III", subtitle: "On the Origin and Nature of the Emotions",color: "#B06AC8" },
  IV:  { label: "Part IV",  subtitle: "Of Human Bondage",                        color: "#CC6A6A" },
  V:   { label: "Part V",   subtitle: "Of Human Freedom",                        color: "#5CC47A" },
};

// Two color palettes sharing the same token names. The per-Part colors above are
// semantic and used unchanged in both themes.
const THEMES = {
  dark: {
    bg:"#080705", panel:"rgba(8,7,5,0.97)", panelSolid:"rgba(8,7,5,0.9)",
    border:"#2a200855", divider:"#1a1508", accent:"#D4A85A", accentSoft:"#D4A85A66",
    tint:"rgba(200,169,110,0.12)", tintSoft:"rgba(200,169,110,0.07)", inputBg:"rgba(0,0,0,0.3)",
    grid:"#c8a96e", gridOpacity:0.03,
    textBright:"#f0e8d8", textGold:"#c8a96e",
    t1:"#9a8a64", t2:"#8a7a5a", t3:"#7a6040", t4:"#6a5a3a", t5:"#5a4a30", t6:"#4a3a20", t7:"#3a3020",
    nodeFill:"#100e0a", nodeFillBox:"#181410", nodeFillDim:"#1e1a12",
    nodeTextActive:"#fff", nodeTextDim:"#4a3a20", glow:"#ffffff", arrowDim:"#2a2010", btnActiveText:"#08070a",
    parts:{ I:"#D4A85A", II:"#5AABCC", III:"#B06AC8", IV:"#CC6A6A", V:"#5CC47A" },
  },
  light: {
    bg:"#f6f2ea", panel:"rgba(252,250,245,0.97)", panelSolid:"rgba(252,250,245,0.95)",
    border:"#c3b58e99", divider:"#e0d8c4", accent:"#8a5e12", accentSoft:"#8a5e1255",
    tint:"rgba(138,94,18,0.12)", tintSoft:"rgba(138,94,18,0.07)", inputBg:"rgba(255,255,255,0.7)",
    grid:"#b8ab8c", gridOpacity:0.04,
    textBright:"#241c10", textGold:"#5a4012",
    t1:"#33291a", t2:"#43381f", t3:"#544730", t4:"#665740", t5:"#786750", t6:"#8b7a60", t7:"#a08d70",
    nodeFill:"#fdfbf6", nodeFillBox:"#f0e8d6", nodeFillDim:"#ece4d2",
    nodeTextActive:"#1c150a", nodeTextDim:"#a89a7c", glow:"#8a5e12", arrowDim:"#c7b99a",
    btnActiveText:"#fbf7ee",
    // Darker, more saturated Part colors so strokes and labels read on a light ground.
    parts:{ I:"#9a6a14", II:"#1f7a9c", III:"#8a2fa8", IV:"#b43636", V:"#2a8048" },
  },
};

const RAW_NODES = [

  // ── PART I ──────────────────────────────────────────────────────────────
  { id:"I.Def",    part:"I", type:"axiom",    label:"I.Defs I–VIII",   x:1349, y:-14,
    desc:"The 8 foundational definitions: self-caused thing, finite thing, substance, attribute, mode, God (substance of infinite attributes), freedom (self-determined), eternity (existence following from definition alone)." },
  { id:"I.Ax",     part:"I", type:"axiom",    label:"I.Axioms I–VII",  x:606, y:284,
    desc:"Seven axioms: (1) everything exists in itself or something else; (2) what cannot be conceived through another is conceived through itself; (3) from a definite cause an effect follows; (4) knowledge of effect depends on cause; (5) things with nothing in common cannot be understood through each other; (6) a true idea must correspond to its object; (7) if a thing can be conceived as non-existent, its essence does not involve existence." },

  { id:"I.P1",  part:"I", type:"prop",  label:"I.1",  x:2360, y:-150,
    desc:"Substance is by nature prior to its modifications. (From Defs III, V.)" },
  { id:"I.P2",  part:"I", type:"prop",  label:"I.2",  x:2528, y:192,
    desc:"Two substances with different attributes have nothing in common. (From Def III.)" },
  { id:"I.P3",  part:"I", type:"prop",  label:"I.3",  x:1650, y:144,
    desc:"Things which have nothing in common cannot be one the cause of the other. (From Axioms IV, V.)" },
  { id:"I.P4",  part:"I", type:"prop",  label:"I.4",  x:1542, y:284,
    desc:"Distinct things are distinguished either by attributes or by modifications. (From Axiom I, Defs III, V.)" },
  { id:"I.P5",  part:"I", type:"prop",  label:"I.5",  x:2439, y:868,
    desc:"No two substances can share the same attribute or nature. (From P1, P2, P4, Defs III, VI.)" },
  { id:"I.P6",  part:"I", type:"prop",  label:"I.6",  x:2499, y:1112,
    desc:"One substance cannot be produced by another substance. (From P2, P3, P5.)" },
  { id:"I.C6",  part:"I", type:"coroll", label:"I.6c",x:3388, y:1774,
    desc:"Corollary: Substance cannot be produced by anything external to itself. (From P6, Axiom I, Defs III, V.)" },
  { id:"I.P7",  part:"I", type:"prop",  label:"I.7",  x:2611, y:1966,
    desc:"Existence belongs to the nature of substance. (From Corollary of P6.)" },
  { id:"I.P8",  part:"I", type:"prop",  label:"I.8",  x:2638, y:1527,
    desc:"Every substance is necessarily infinite. (From P5, P7, Def II.)" },
  { id:"I.P9",  part:"I", type:"prop",  label:"I.9",  x:2094, y:572,
    desc:"The more reality a thing has, the greater the number of its attributes. (From Def IV.)" },
  { id:"I.P10", part:"I", type:"prop",  label:"I.10", x:1676, y:976,
    desc:"Each particular attribute of the one substance must be conceived through itself. (From Defs III, IV.)" },
  { id:"I.P11", part:"I", type:"keystone",label:"I.11\nGod Exists", x:1804, y:1322,
    desc:"God — substance consisting of infinite attributes — necessarily exists. Three proofs given: (1) from P7 by reductio; (2) cause of existence/non-existence must be in or outside nature; (3) potentiality of existence is power — a being with infinite power necessarily exists." },
  { id:"I.C13", part:"I", type:"coroll", label:"I.13c",x:3184, y:1420,
    desc:"Corollary of P13: No substance, and consequently no extended substance (insofar as it is substance), is divisible." },
  { id:"I.P12", part:"I", type:"prop",  label:"I.12", x:2851, y:888,
    desc:"No attribute of substance implies that substance can be divided. (From P8, P6, P5, P2, Def IV, P10.)" },
  { id:"I.P13", part:"I", type:"prop",  label:"I.13", x:2585, y:1672,
    desc:"Substance absolutely infinite is indivisible. (From P5, P7, P11.)" },
  { id:"I.P14", part:"I", type:"keystone",label:"I.14\nOnly God Exists", x:2162, y:1214,
    desc:"Besides God no substance can be granted or conceived. If any other substance existed, it would have to share an attribute with God — absurd by P5." },
  { id:"I.C14a",part:"I", type:"coroll", label:"I.14c1",x:1893, y:1899,
    desc:"Corollary I of P14: God is one — only one substance can exist in the universe, and it is absolutely infinite." },
  { id:"I.C14b",part:"I", type:"coroll", label:"I.14c2",x:2321, y:1779,
    desc:"Corollary II of P14: Extension and thought are either attributes of God or accidents of the attributes of God." },
  { id:"I.P15", part:"I", type:"keystone",label:"I.15\nDeus sive Natura", x:1259, y:642,
    desc:"Whatsoever is, is in God, and without God nothing can be or be conceived. (From P14, Defs III, V, Axiom I.)" },
  { id:"I.P16", part:"I", type:"prop",  label:"I.16", x:1200, y:563,
    desc:"From the necessity of divine nature, infinite things follow in infinite ways — everything that can fall within the sphere of an infinite intellect. (From Def VI.)" },
  { id:"I.C16a",part:"I", type:"coroll", label:"I.16c1",x:1962, y:39,
    desc:"Corollary I of P16: God is the efficient cause of all things that can fall within the sphere of an infinite intellect." },
  { id:"I.C16b",part:"I", type:"coroll", label:"I.16c2",x:2181, y:372,
    desc:"Corollary II of P16: God is a cause in himself, and not through an accident of his nature." },
  { id:"I.C16c",part:"I", type:"coroll", label:"I.16c3",x:1798, y:-197,
    desc:"Corollary III of P16: God is the absolutely first cause." },
  { id:"I.P17", part:"I", type:"prop",  label:"I.17", x:2039, y:252,
    desc:"God acts solely by the laws of his own nature and is not constrained by anyone. (From P15, P16.)" },
  { id:"I.C17a",part:"I", type:"coroll", label:"I.17c1",x:3132, y:-74,
    desc:"Corollary I of P17: No cause besides God's own perfection moves him to act — neither extrinsically nor intrinsically." },
  { id:"I.C17b",part:"I", type:"coroll", label:"I.17c2",x:3213, y:260,
    desc:"Corollary II of P17: God is the sole free cause. God alone exists by sole necessity of his nature and acts by sole necessity of his nature." },
  { id:"I.P18", part:"I", type:"prop",  label:"I.18", x:2254, y:649,
    desc:"God is the indwelling (immanent) and not the transient cause of all things. (From P15, P16 Corollary I, P14.)" },
  { id:"I.P19", part:"I", type:"prop",  label:"I.19", x:2810, y:1421,
    desc:"God and all the attributes of God are eternal. (From Defs VI, VIII, P11, P7.)" },
  { id:"I.P20", part:"I", type:"prop",  label:"I.20", x:3161, y:829,
    desc:"The existence of God and his essence are one and the same. (From P19, Def VIII.)" },
  { id:"I.C20a",part:"I", type:"coroll", label:"I.20c1",x:4025, y:997,
    desc:"Corollary I of P20: God's existence, like his essence, is an eternal truth." },
  { id:"I.C20b",part:"I", type:"coroll", label:"I.20c2",x:2532, y:2201,
    desc:"Corollary II of P20: God and all his attributes are unchangeable. (Change in existence would entail change in essence — absurd.)" },
  { id:"I.P21", part:"I", type:"prop",  label:"I.21", x:1464, y:2045,
    desc:"All things which follow from the absolute nature of any attribute of God are eternal and infinite. (From P11, Def II, P20 C2.)" },
  { id:"I.P22", part:"I", type:"prop",  label:"I.22", x:1982, y:2799,
    desc:"Whatever follows from an attribute of God, as modified by an infinite and necessary modification, must also exist necessarily and as infinite. (Proof analogous to P21.)" },
  { id:"I.P23", part:"I", type:"prop",  label:"I.23", x:1740, y:2998,
    desc:"Every mode that exists necessarily and as infinite must follow from the absolute nature of some attribute of God, or from an attribute modified by an infinite modification. (From Def V, P15, P21, P22.)" },
  { id:"I.P24", part:"I", type:"prop",  label:"I.24", x:2117, y:2176,
    desc:"The essence of things produced by God does not involve existence. (From Def I, contrast with P7.)" },
  { id:"I.C24", part:"I", type:"coroll", label:"I.24c",x:1203, y:1954,
    desc:"Corollary of P24: God is not only the cause of things coming into existence, but also of their continuing in existence (causa essendi rerum). (From P14 Corollary I.)" },
  { id:"I.P25", part:"I", type:"prop",  label:"I.25", x:1209, y:1335,
    desc:"God is the efficient cause not only of the existence of things, but also of their essence. (From Axiom IV, P15.)" },
  { id:"I.C25", part:"I", type:"coroll", label:"I.C25",x:357, y:641,
    desc:"Corollary of P25: Individual things are nothing but modifications of the attributes of God, or modes by which God's attributes are expressed in a fixed and definite manner. (From P15, Def V.)" },
  { id:"I.P26", part:"I", type:"prop",  label:"I.26", x:798, y:1316,
    desc:"A thing conditioned to act was necessarily conditioned by God; what has not been conditioned by God cannot condition itself to act. (From P25, P16.)" },
  { id:"I.P27", part:"I", type:"prop",  label:"I.27", x:1089, y:2224,
    desc:"A thing conditioned by God to act in a particular way cannot render itself unconditioned. (From Axiom III.)" },
  { id:"I.P28", part:"I", type:"prop",  label:"I.28", x:685, y:1658,
    desc:"Every finite, conditioned thing can only exist or be conditioned to act if conditioned by another finite thing — and so on to infinity. (From P26, P24c, P21.)" },
  { id:"I.P29", part:"I", type:"prop",  label:"I.29\nNo Contingency", x:936, y:1128,
    desc:"Nothing in the universe is contingent; all things are conditioned by the necessity of divine nature. (From P15, P11, P16, P27, P26, P24c.)" },
  { id:"I.P30", part:"I", type:"prop",  label:"I.30", x:938, y:1538,
    desc:"Intellect (finite or infinite) must comprehend only the attributes and modifications of God. (From Axiom VI, P14c1, P15.)" },
  { id:"I.P31", part:"I", type:"prop",  label:"I.31", x:1627, y:-256,
    desc:"Intellect in function, will, desire, love, etc. pertain to passive nature (natura naturata), not active nature. (From Def V, P15, Def VI.)" },
  { id:"I.P32", part:"I", type:"prop",  label:"I.32", x:1123, y:2783,
    desc:"Will cannot be called a free cause, but only a necessary cause. (From P28, P23.)" },
  { id:"I.C32a",part:"I", type:"coroll", label:"I.32c1",x:1407, y:3698,
    desc:"Corollary I of P32: God does not act according to freedom of the will." },
  { id:"I.C32b",part:"I", type:"coroll", label:"I.32c2",x:1832, y:2337,
    desc:"Corollary II of P32: Will and intellect stand in the same relation to God as motion, rest, and all natural phenomena — all are conditioned by divine necessity." },
  { id:"I.P33", part:"I", type:"prop",  label:"I.33", x:1522, y:1301,
    desc:"Things could not have been brought into being by God in any other manner or order than that which in fact obtained. (From P16, P29, P11, P14c1.)" },
  { id:"I.P34", part:"I", type:"prop",  label:"I.34", x:1088, y:240,
    desc:"God's power is identical with his essence. (From P11, P16.)" },
  { id:"I.P35", part:"I", type:"prop",  label:"I.35", x:1950, y:-307,
    desc:"Whatsoever we conceive to be in the power of God necessarily exists. (From P34.)" },
  { id:"I.P36", part:"I", type:"prop",  label:"I.36", x:220, y:-19,
    desc:"There is no cause from whose nature some effect does not follow. (From P25c, P34, P16.)" },
  { id:"I.App",  part:"I", type:"appendix",label:"I.Appendix\nAgainst Teleology", x:1446, y:1118,
    desc:"Appendix: Critiques the prejudice that God or Nature acts for ends. Shows that 'good', 'evil', 'order', 'confusion', 'beauty', 'ugliness' are merely modes of imagination, not objective properties of things. Clears the ground for Part II." },

  // ── PART II ─────────────────────────────────────────────────────────────
  { id:"II.Def",  part:"II", type:"axiom", label:"II.Defs & Ax", x:1223, y:1041,
    desc:"Definitions: body (mode of extension), essence, idea, adequate idea, duration, reality/perfection (synonymous), particular thing. Axioms: human essence does not involve necessary existence; man thinks; modes of thinking presuppose an idea; we perceive bodies and modes of thought." },
  { id:"II.P1",  part:"II", type:"prop",  label:"II.1", x:577, y:1067,
    desc:"Thought is an attribute of God, or God is a thinking thing. (From I.25c, I.Def V, Def VI.)" },
  { id:"II.P2",  part:"II", type:"prop",  label:"II.2", x:354, y:1325,
    desc:"Extension is an attribute of God, or God is an extended thing. (Proof analogous to II.1.)" },
  { id:"II.P3",  part:"II", type:"prop",  label:"II.3", x:1650, y:709,
    desc:"In God there is necessarily the idea not only of his essence but of all things that follow from his essence. (From II.1, I.16, I.35.)" },
  { id:"II.P4",  part:"II", type:"prop",  label:"II.4", x:1594, y:2161,
    desc:"The idea of God, from which infinite things follow in infinite ways, can only be one. (From I.30, I.14c1.)" },
  { id:"II.P5",  part:"II", type:"prop",  label:"II.5", x:2983, y:980,
    desc:"The actual being of ideas owns God as its cause only insofar as he is considered as a thinking thing, not through any other attribute. (From II.3.)" },
  { id:"II.P6",  part:"II", type:"prop",  label:"II.6", x:649, y:2209,
    desc:"The modes of any attribute are caused by God as considered through that attribute, and not through any other. (From I.10.)" },
  { id:"II.C6",  part:"II", type:"coroll",label:"II.6c",x:651, y:3425,
    desc:"Corollary of II.6: The actual being of things (non-modes of thought) does not follow from divine nature because of prior knowledge. Things follow from their attribute the same way ideas follow from thought." },
  { id:"II.P7",  part:"II", type:"keystone",label:"II.7\nParallelism", x:-35, y:1225,
    desc:"The order and connection of ideas is the same as the order and connection of things. (From I.Ax IV.) Extended substance and thinking substance are one and the same substance comprehended through different attributes." },
  { id:"II.C7",  part:"II", type:"coroll",label:"II.7c",x:-910, y:1183,
    desc:"Corollary of II.7: God's power of thinking equals his realized power of action. Whatever follows from infinite nature in extension, follows in the same order from the idea of God in thought." },
  { id:"II.P8",  part:"II", type:"prop",  label:"II.8", x:-796, y:1788,
    desc:"Ideas of non-existent particular things must be comprehended in the infinite idea of God, the same way their formal essences are contained in God's attributes. (From II.7.)" },
  { id:"II.C8",  part:"II", type:"coroll",label:"II.8c",x:-831, y:2299,
    desc:"Corollary of II.8: So long as particular things do not exist, their ideas exist only insofar as God's infinite idea exists. When things exist, their ideas involve that existence." },
  { id:"II.P9",  part:"II", type:"prop",  label:"II.9", x:-251, y:1748,
    desc:"The idea of an individual actually existing thing is caused by God not as infinite, but as affected by another idea of an actually existing thing, and so on to infinity. (From II.8c, II.6, I.28.)" },
  { id:"II.C9",  part:"II", type:"coroll",label:"II.9c",x:-1050, y:981,
    desc:"Corollary of II.9: Whatever takes place in the object of any idea, knowledge thereof is in God only insofar as he has the idea of that object." },
  { id:"II.P10", part:"II", type:"prop",  label:"II.10",x:-568, y:2238,
    desc:"The being of substance does not appertain to the essence of man — substance does not constitute the actual being of man. (From I.7 reductio via II.Ax I; also from I.5.)" },
  { id:"II.C10", part:"II", type:"coroll",label:"II.10c",x:-1476, y:2399,
    desc:"Corollary of II.10: The essence of man is constituted by certain modifications of the attributes of God. (From I.15, I.25c.)" },
  { id:"II.P11", part:"II", type:"keystone",label:"II.11\nHuman Mind", x:-1184, y:1579,
    desc:"The first element constituting the actual being of the human mind is the idea of some particular actually existing thing. (From II.10c, II.Ax II, II.Ax III, II.8c, II.Ax I, I.21, I.22.)" },
  { id:"II.C11", part:"II", type:"coroll",label:"II.11c",x:-443, y:2491,
    desc:"Corollary of II.11: The human mind is part of the infinite intellect of God. When the mind perceives, God has that idea insofar as he constitutes the essence of the human mind." },
  { id:"II.P12", part:"II", type:"prop",  label:"II.12",x:-1769, y:648,
    desc:"Whatever comes to pass in the object of the idea constituting the human mind must be perceived by the human mind. If that object is the body, nothing can take place in the body without the mind perceiving it. (From II.9c, II.11.)" },
  { id:"II.P13", part:"II", type:"keystone",label:"II.13\nMind-Body",x:-456, y:271,
    desc:"The object of the idea constituting the human mind is the body — a mode of extension that actually exists — and nothing else. (From II.9c, II.Ax IV, I.36.)" },
  { id:"II.C13", part:"II", type:"coroll",label:"II.13c",x:-918, y:195,
    desc:"[Embedded in note of II.13]: The human mind is united to the body. The degree of mind corresponds to the complexity and capability of the body." },
  { id:"II.P14", part:"II", type:"prop",  label:"II.14",x:-2713, y:1316,
    desc:"The human mind can perceive many things in proportion as its body can receive many impressions. (From II.Post III, VI, II.12.)" },
  { id:"II.P15", part:"II", type:"prop",  label:"II.15",x:-491, y:1053,
    desc:"The idea constituting the human mind is not simple but compounded of many ideas. (From II.13, II.Post I, II.8c, II.7.)" },
  { id:"II.P16", part:"II", type:"prop",  label:"II.16",x:-1315, y:-131,
    desc:"The idea of every mode in which the human body is affected by external bodies must involve both the nature of the human body and the nature of the external body. (From Lemma III Ax I, I.Ax IV.)" },
  { id:"II.C16a",part:"II", type:"coroll",label:"II.16c1",x:-2322, y:-16,
    desc:"Corollary I of II.16: The human mind perceives the nature of many external bodies, together with the nature of its own body." },
  { id:"II.C16b",part:"II", type:"coroll",label:"II.16c2",x:-2314, y:211,
    desc:"Corollary II of II.16: Ideas of external bodies indicate the constitution of our own body more than the nature of external bodies." },
  { id:"II.P17", part:"II", type:"prop",  label:"II.17",x:-2073, y:-197,
    desc:"If the human body is affected in a manner involving the nature of an external body, the mind will regard that external body as actually existing or present, until the body is affected in a way that excludes the external body's presence. (From II.12.)" },
  { id:"II.C17", part:"II", type:"coroll",label:"II.17c",x:-2895, y:181,
    desc:"Corollary of II.17: The mind can regard external bodies as present even when they do not actually exist — the basis of imagination." },
  { id:"II.P18", part:"II", type:"prop",  label:"II.18",x:-2403, y:-290,
    desc:"If the human body has once been simultaneously affected by two bodies, the mind's recollection of one will lead it to recall the other. (From II.17c, II.12.)" },
  { id:"II.P19", part:"II", type:"prop",  label:"II.19",x:-1180, y:491,
    desc:"The human mind has no knowledge of the body, and does not know that the body exists, except through ideas of the modifications of the body. (From II.9c, II.13.)" },
  { id:"II.P20", part:"II", type:"prop",  label:"II.20",x:-514, y:1998,
    desc:"There is also in God an idea or knowledge of the human mind, which follows in God in the same manner, and is referred to God in the same way, as the idea or knowledge of the human body. (From II.7.)" },
  { id:"II.P21", part:"II", type:"prop",  label:"II.21",x:-710, y:1310,
    desc:"This idea of the mind is united to the mind in the same way as the mind is united to the body. The mind and the idea of the mind are one and the same thing conceived under different attributes. (From II.20, II.7.)" },
  { id:"II.P22", part:"II", type:"prop",  label:"II.22",x:-973, y:416,
    desc:"The human mind perceives not only the modifications of the body, but also the ideas of such modifications. (From II.12, II.13, II.21.)" },
  { id:"II.P23", part:"II", type:"prop",  label:"II.23",x:-1181, y:-362,
    desc:"The mind does not know itself, except insofar as it perceives the ideas of the modifications of the body. (From II.19, II.22.)" },
  { id:"II.P24", part:"II", type:"prop",  label:"II.24",x:-1887, y:1346,
    desc:"The human mind does not involve adequate knowledge of the parts composing the human body. (From II.9c, II.11, II.24.)" },
  { id:"II.P25", part:"II", type:"prop",  label:"II.25",x:-1915, y:126,
    desc:"The idea of each modification of the human body does not involve adequate knowledge of an external body. (From II.16.)" },
  { id:"II.P26", part:"II", type:"prop",  label:"II.26",x:-2362, y:942,
    desc:"The human mind does not perceive any external body as actually existing, except through the ideas of the modifications of its own body. (From II.17c, II.19.)" },
  { id:"II.C26", part:"II", type:"coroll",label:"II.26c",x:-3277, y:1470,
    desc:"Corollary of II.26: Insofar as the human mind imagines external bodies, it does not have adequate knowledge of them." },
  { id:"II.P27", part:"II", type:"prop",  label:"II.27",x:-2098, y:597,
    desc:"The idea of each modification of the human body does not involve adequate knowledge of the human body itself. (From II.25, II.16, II.24.)" },
  { id:"II.P28", part:"II", type:"prop",  label:"II.28",x:-2559, y:1152,
    desc:"The ideas of the modifications of the human body, insofar as they are referred only to the human mind, are not clear and distinct, but confused. (From II.24, II.25, II.27.)" },
  { id:"II.P29", part:"II", type:"prop",  label:"II.29",x:-1906, y:1782,
    desc:"The idea of the idea of each modification of the human body does not involve adequate knowledge of the human mind. (From II.28, II.9c.)" },
  { id:"II.C29", part:"II", type:"coroll",label:"II.29c",x:-2564, y:2540,
    desc:"Corollary of II.29: The human mind does not have adequate self-knowledge whenever it perceives things in the common order of nature — i.e., from external causes, not from within." },
  { id:"II.P30", part:"II", type:"prop",  label:"II.30",x:-1259, y:951,
    desc:"We can only have a very inadequate knowledge of the duration of our body. (From II.Ax I, II.13, I.28.)" },
  { id:"II.P31", part:"II", type:"prop",  label:"II.31",x:-2278, y:1699,
    desc:"We can only have a very inadequate knowledge of the duration of particular things external to us. (From II.30, II.26.)" },
  { id:"II.C31", part:"II", type:"coroll",label:"II.31c",x:-3003, y:2364,
    desc:"Corollary of II.31: All particular things are contingent and perishable. We cannot have adequate knowledge of their duration. Eternal or infinite things can only be perceived adequately." },
  { id:"II.P32", part:"II", type:"prop",  label:"II.32",x:54, y:763,
    desc:"All ideas, insofar as they are referred to God, are true. (From I.Ax VI, I.Def VI, I.30.)" },
  { id:"II.P33", part:"II", type:"prop",  label:"II.33",x:-2550, y:664,
    desc:"There is nothing positive in ideas which causes them to be called false. (From I.Ax VI.)" },
  { id:"II.P34", part:"II", type:"prop",  label:"II.34",x:-1299, y:1125,
    desc:"Every idea, which in us is absolute or adequate and perfect, is true. (From II.32, II.Def IV.)" },
  { id:"II.P35", part:"II", type:"prop",  label:"II.35",x:-2216, y:1516,
    desc:"Falsity consists in the privation of knowledge which inadequate, fragmented, and confused ideas involve. (From II.28, II.33.)" },
  { id:"II.P36", part:"II", type:"prop",  label:"II.36",x:155, y:2017,
    desc:"Inadequate and confused ideas follow with the same necessity as adequate or clear and distinct ideas. (From I.28, II.7.)" },
  { id:"II.P37", part:"II", type:"prop",  label:"II.37",x:-748, y:2043,
    desc:"That which is common to all things and is equally in a part and in the whole, does not constitute the essence of any particular thing. (From II.Def II.)" },
  { id:"II.P38", part:"II", type:"prop",  label:"II.38",x:-334, y:626,
    desc:"Those things which are common to all, and are equally in a part and in the whole, can only be adequately conceived. (From II.37, II.7, II.Def IV.)" },
  { id:"II.C38", part:"II", type:"coroll",label:"II.38c",x:-826, y:-254,
    desc:"Corollary of II.38: Hence it follows that some ideas or notions exist which are common to all men. The human mind perceives them adequately insofar as it perceives adequate ideas." },
  { id:"II.P39", part:"II", type:"prop",  label:"II.39",x:-1316, y:-510,
    desc:"That which is common to and a property of the human body and such external bodies as the human body is usually affected by, and which is equally in the part and in the whole of either body, will be represented adequately in the mind. (From II.38, II.16, II.25.)" },
  { id:"II.C39", part:"II", type:"coroll",label:"II.39c",x:-1264, y:-1122,
    desc:"Corollary of II.39: Hence it follows that the mind is fitted to perceive many things adequately in proportion as its body has many things in common with other bodies." },
  { id:"II.P40", part:"II", type:"keystone",label:"II.40\n3 Kinds of Knowledge", x:-642, y:-862,
    desc:"P40 Note II: Three kinds of knowledge — (1) Opinion or imagination: ideas arising from singular things through the senses, or from signs (inadequate, confused); (2) Reason: common notions and adequate ideas of properties of things (adequate); (3) Intuitive knowledge (scientia intuitiva): proceeds from adequate ideas of certain attributes of God to adequate knowledge of the essence of things. Only kinds 2 and 3 teach us truth from falsity." },
  { id:"II.P41", part:"II", type:"prop",  label:"II.41",x:-1108, y:1401,
    desc:"Knowledge of the first kind is the only source of falsity; knowledge of the second and third kinds is necessarily true. (From II.35, II.34.)" },
  { id:"II.P42", part:"II", type:"prop",  label:"II.42",x:-1662, y:2053,
    desc:"Knowledge of the second and third kind teaches us to distinguish the true from the false. (From II.41, II.34.)" },
  { id:"II.P43", part:"II", type:"prop",  label:"II.43",x:-1662, y:2577,
    desc:"He who has a true idea simultaneously knows that he has a true idea, and cannot doubt of its truth. (From II.Def IV, I.Ax VI.)" },
  { id:"II.C43", part:"II", type:"coroll",label:"II.43c",x:-2127, y:3390,
    desc:"Corollary of II.43: There is no such thing as doubt from a true idea; certainty and truth are the same thing." },
  { id:"II.P44", part:"II", type:"prop",  label:"II.44",x:-208, y:1623,
    desc:"It is not in the nature of reason to regard things as contingent, but as necessary. (From I.29, II.41.)" },
  { id:"II.C44a",part:"II", type:"coroll",label:"II.44c1",x:-411, y:2912,
    desc:"Corollary I of II.44: It is only imagination, not reason, which regards things as contingent and particular." },
  { id:"II.C44b",part:"II", type:"coroll",label:"II.44c2",x:-1249, y:1879,
    desc:"Corollary II of II.44: It is in the nature of reason to perceive things under a certain form of eternity (sub quadam aeternitatis specie)." },
  { id:"II.P45", part:"II", type:"prop",  label:"II.45",x:502, y:223,
    desc:"Every idea of every body, or actually existing particular thing, necessarily involves the eternal and infinite essence of God. (From II.Def I, I.15, I.Def VI.)" },
  { id:"II.C45", part:"II", type:"coroll",label:"II.45c",x:1046, y:-586,
    desc:"Corollary of II.45: God's eternal and infinite essence is known to all, for it is involved in every idea." },
  { id:"II.P46", part:"II", type:"prop",  label:"II.46",x:402, y:-116,
    desc:"The knowledge of the eternal and infinite essence of God which every idea involves is adequate and perfect. (From II.45, II.38.)" },
  { id:"II.P47", part:"II", type:"prop",  label:"II.47",x:1175, y:-373,
    desc:"The human mind has adequate knowledge of the eternal and infinite essence of God. (From II.45, II.46.)" },
  { id:"II.C47", part:"II", type:"coroll",label:"II.47c",x:2024, y:-1069,
    desc:"Corollary of II.47: Hence it follows that God's infinite essence and his eternity are known to all. This knowledge exists in every human mind as adequate, though often obscured by inadequate ideas." },
  { id:"II.P48", part:"II", type:"keystone",label:"II.48\nNo Free Will", x:-150, y:1337,
    desc:"In the mind there is no absolute or free will; the mind is determined to wish this or that by a cause, which has also been determined by another cause, and that last by another, and so on to infinity. (From I.28, II.11c, II.Def III.)" },
  { id:"II.C48", part:"II", type:"coroll",label:"II.48c",x:-58, y:1939,
    desc:"Corollary of II.48: Will and intellect are one and the same thing. Volition and ideas are identical — there is no separate faculty of will." },
  { id:"II.P49", part:"II", type:"prop",  label:"II.49",x:204, y:175,
    desc:"There is in the mind no volition or affirmation and negation save that which an idea, insofar as it is an idea, involves. (From II.48, II.Def III.)" },
  { id:"II.C49", part:"II", type:"coroll",label:"II.49c",x:688, y:589,
    desc:"Corollary of II.49: Will and intellect are one and the same. Hence it follows that will does not exceed intellect — we affirm and deny only what we perceive." },

  // ── PART III ─────────────────────────────────────────────────────────────
  { id:"III.Def", part:"III",type:"axiom", label:"III.Defs & Ax",x:428, y:1084,
    desc:"Definitions: adequate cause (effect fully understood through the cause), inadequate/partial cause, active (action fully explained by our nature), passive (only partially explained by our nature). Two axioms on the human body's capacity for affecting and being affected." },
  { id:"III.P1",  part:"III",type:"prop",  label:"III.1", x:372, y:2424,
    desc:"Our mind is in certain cases active, and in certain cases passive. Insofar as it has adequate ideas, it is necessarily active; insofar as it has inadequate ideas, it is necessarily passive. (From II.Def I, II, II.48c.)" },
  { id:"III.P2",  part:"III",type:"prop",  label:"III.2", x:74, y:1594,
    desc:"Body cannot determine mind to think, and mind cannot determine body to motion or rest or any other state. Mind and body run in parallel — neither causes the other. (From II.7, I.28.)" },
  { id:"III.P3",  part:"III",type:"prop",  label:"III.3", x:103, y:2355,
    desc:"The activities of the mind arise solely from adequate ideas; the passive states arise from inadequate ideas. (From III.Def I, II.)" },
  { id:"III.P4",  part:"III",type:"prop",  label:"III.4", x:786, y:-861,
    desc:"Nothing can be destroyed, except by a cause external to itself. (From I.Def II.)" },
  { id:"III.P5",  part:"III",type:"prop",  label:"III.5", x:291, y:-1415,
    desc:"Things are of a contrary nature, i.e. cannot be in the same subject, insofar as one can destroy the other. (From III.4.)" },
  { id:"III.P6",  part:"III",type:"keystone",label:"III.6\nConatus", x:-142, y:-915,
    desc:"Each thing, as far as it can by its own power, strives to persevere in its being. (From III.4, III.5, I.36.)" },
  { id:"III.P7",  part:"III",type:"prop",  label:"III.7", x:207, y:-1193,
    desc:"The striving (conatus) by which each thing strives to persevere in its being is nothing else than the actual essence of the thing itself. (From III.6.)" },
  { id:"III.P8",  part:"III",type:"prop",  label:"III.8", x:-166, y:-1759,
    desc:"The striving of the mind to persevere in its being is not limited in time, but is indefinite. (From III.7, II.Def V.)" },
  { id:"III.P9",  part:"III",type:"prop",  label:"III.9", x:-749, y:-1154,
    desc:"The mind, both insofar as it has clear and distinct ideas, and insofar as it has confused ideas, endeavors to persevere in its being for an indefinite period, and is conscious of this conatus. (From III.7, III.8, II.23.)" },
  { id:"III.P10", part:"III",type:"prop",  label:"III.10",x:-398, y:-595,
    desc:"An idea which excludes the existence of our body cannot be in our mind, but is contrary to it. (From II.13, III.9, III.5.)" },
  { id:"III.P11", part:"III",type:"keystone",label:"III.11\nJoy/Sadness", x:-1099, y:-1472,
    desc:"Whatsoever increases or diminishes, helps or hinders the power of activity in our body, the idea of the said thing increases, diminishes, helps, or hinders our mind's power of thought — and thereby causes Joy or Sadness. Joy: transition to greater perfection. Sadness: transition to lesser perfection." },
  { id:"III.P12", part:"III",type:"prop",  label:"III.12",x:-532, y:-1603,
    desc:"The mind, as far as it can, endeavors to conceive those things that increase or help the body's power of activity. (From III.6, III.9, III.11.)" },
  { id:"III.P13", part:"III",type:"prop",  label:"III.13",x:-349, y:-2866,
    desc:"When the mind conceives things that diminish or hinder the body's power, it endeavors to recall things which exclude their existence. (From III.12.)" },
  { id:"III.C13", part:"III",type:"coroll",label:"III.13c",x:-324, y:-3847,
    desc:"Corollary of III.13: The mind is averse to conceiving things which diminish its or the body's power." },
  { id:"III.P14", part:"III",type:"prop",  label:"III.14",x:-1948, y:-1252,
    desc:"If the mind has once been affected simultaneously by two emotions, whenever it is afterwards affected by one, it will also be affected by the other. (From II.18, III.11.)" },
  { id:"III.P15", part:"III",type:"prop",  label:"III.15",x:-1894, y:-1830,
    desc:"Anything can, accidentally, be the cause of joy, sadness, or desire. (From III.14, III.11.)" },
  { id:"III.C15", part:"III",type:"coroll",label:"III.15c",x:-2327, y:-2784,
    desc:"Corollary of III.15: Simply from the fact that we have regarded a thing with emotion of joy or sadness, though that thing was not the efficient cause of the emotion, we can either love or hate it." },
  { id:"III.P16", part:"III",type:"prop",  label:"III.16",x:-2773, y:-1620,
    desc:"Simply from the fact that we conceive that a thing has some point of resemblance with an object that usually affects the mind with joy or sadness, we shall love or hate it. (From III.14, III.15.)" },
  { id:"III.P17", part:"III",type:"prop",  label:"III.17",x:-2754, y:-1942,
    desc:"If we conceive that a thing which usually affects us painfully has any point of resemblance with another thing which usually affects us equally powerfully with joy, we shall hate and love it simultaneously. (From III.14, III.15.)" },
  { id:"III.C17", part:"III",type:"coroll",label:"III.17c",x:-3606, y:-2306,
    desc:"Corollary of III.17: From this we understand what is vacillation of mind (fluctuatio animi) — a state arising when a person is simultaneously swayed by opposite emotions." },
  { id:"III.P18", part:"III",type:"prop",  label:"III.18",x:-2017, y:-1041,
    desc:"A man is equally affected with pleasure or pain from the image of a thing past or future as from the image of a present thing. (From II.18, III.11.)" },
  { id:"III.C18a",part:"III",type:"coroll",label:"III.18c1",x:-3051, y:-1366,
    desc:"Corollary I of III.18: A thing is equally good or evil, insofar as it is past or future, as if it were present — the basis of hope and fear." },
  { id:"III.C18b",part:"III",type:"coroll",label:"III.18c2",x:-2982, y:-1616,
    desc:"Corollary II of III.18: This explains confidence and despair as emotions connected with the past: confidence = pleasure from past success, despair = pain." },
  { id:"III.P19", part:"III",type:"prop",  label:"III.19",x:-1410, y:-2131,
    desc:"He who conceives that what he loves is destroyed will feel sadness; if he conceives that it is preserved he will feel joy. (From III.12, III.11.)" },
  { id:"III.P20", part:"III",type:"prop",  label:"III.20",x:-1107, y:-2459,
    desc:"He who conceives that what he hates is destroyed will feel joy. (From III.11, III.13.)" },
  { id:"III.P21", part:"III",type:"prop",  label:"III.21",x:-744, y:-2206,
    desc:"He who conceives that what he loves is affected with joy or sadness, will likewise be affected with joy or sadness; and each of these emotions will be greater or less in the lover according as they are greater or less in the thing loved. (From III.11, III.12.)" },
  { id:"III.P22", part:"III",type:"prop",  label:"III.22",x:-1378, y:-2401,
    desc:"If we conceive that anyone gives joy to the thing we love, we shall feel love towards him. If we conceive that he gives sadness, we shall feel hatred. (From III.21, III.11.)" },
  { id:"III.C22", part:"III",type:"coroll",label:"III.22c",x:-1622, y:-3363,
    desc:"Corollary of III.22: He who has done good or harm to anything which we love or hate, we will love or hate respectively." },
  { id:"III.P26", part:"III",type:"prop",  label:"III.26",x:-1233, y:-2139,
    desc:"We endeavor to affirm concerning ourselves and what we love whatever we conceive to affect with joy, and to deny whatever we conceive to affect with sadness. (From III.12, III.11.)" },
  { id:"III.P27", part:"III",type:"prop",  label:"III.27\nImitation", x:-1532, y:-1050,
    desc:"From the fact that we conceive a thing similar to us to be affected with an emotion, we are affected with a like emotion. The root of empathy, pity, and imitative emotions. (From II.17, II.16, III.11.)" },
  { id:"III.C27a",part:"III",type:"coroll",label:"III.27c1",x:-2542, y:-1294,
    desc:"Corollary I of III.27: If we conceive that someone we have no feeling toward is affected with an emotion, we are thereby affected with a like emotion — the basis of compassion (commiseratio)." },
  { id:"III.C27b",part:"III",type:"coroll",label:"III.27c2",x:-2414, y:-1555,
    desc:"Corollary II of III.27: If we conceive that a person we like is affected with sadness, we will be saddened; if with joy, we will rejoice." },
  { id:"III.C27c",part:"III",type:"coroll",label:"III.27c3",x:-2265, y:-1833,
    desc:"Corollary III of III.27: We endeavor to free from his sadness the thing we pity. This is the foundation of benevolence (benevolentia)." },
  { id:"III.P28", part:"III",type:"prop",  label:"III.28",x:-727, y:-1878,
    desc:"We endeavor to bring about whatever we conceive to conduce to joy, and to remove or destroy what we conceive to hinder or cause sadness. (From III.9, III.11.)" },
  { id:"III.P36", part:"III",type:"prop",  label:"III.36",x:-1804, y:-1148,
    desc:"He who recollects a thing he has once enjoyed desires to have it again under the same circumstances as when he first enjoyed it. (From III.11, II.18.)" },
  { id:"III.C36", part:"III",type:"coroll",label:"III.36c",x:-2822, y:-1855,
    desc:"Corollary of III.36: If one thing that brought joy now causes sadness, the person will feel hatred of it and of himself — the basis of repentance." },
  { id:"III.P37", part:"III",type:"prop",  label:"III.37",x:-958, y:-2277,
    desc:"Desire arising from joy or sadness, hatred or love, is greater in proportion as the emotion is greater. (From III.28, III.11.)" },
  { id:"III.P48", part:"III",type:"prop",  label:"III.48\nAmor Prop", x:-2545, y:-2044,
    desc:"Love and hatred towards (e.g.) Peter are destroyed if the sadness the latter involves is associated with the idea of an internal cause (self-blame), and the joy the former involves similarly. This grounds pride (superbia) and self-abasement. (From III.14, III.15.)" },
  { id:"III.App", part:"III",type:"appendix",label:"III.App\n48 Emotions", x:-1438, y:-1586,
    desc:"The Appendix defines 48 named emotions geometrically derived from the three primitives (Joy, Sadness, Desire): e.g., Love, Hatred, Hope, Fear, Confidence, Despair, Gladness, Remorse, Compassion, Pride, Humility, Envy, Ambition, Avarice, Lust, etc. Each is rigorously defined as a compound of the primitives and their causes." },

  // ── PART IV ───────────────────────────────────────────────────────────────
  { id:"IV.Pref", part:"IV", type:"axiom",   label:"IV.Pref & Defs",x:-859, y:-1602,
    desc:"Preface: Good and evil are not absolute — they are relative to a model of human nature we set before ourselves. Definitions: good (what we know certainly is useful to us), evil (what prevents us from possessing a good), contingent, possible, contrary emotions, freedom." },
  { id:"IV.P1",  part:"IV", type:"prop",   label:"IV.1", x:-3055, y:-832,
    desc:"Nothing positive which a false idea has is removed by the presence of what is true, insofar as it is true. (From II.33.)" },
  { id:"IV.P2",  part:"IV", type:"prop",   label:"IV.2", x:855, y:2408,
    desc:"We are only passive insofar as we are a part of Nature which cannot be conceived independently through itself without other parts. (From III.Def II.)" },
  { id:"IV.P3",  part:"IV", type:"prop",   label:"IV.3", x:1088, y:1344,
    desc:"The power by which man perseveres in existing is limited, and infinitely surpassed by the power of external causes. (From III.Def II, I.28, I.16.)" },
  { id:"IV.P4",  part:"IV", type:"prop",   label:"IV.4", x:1742, y:2526,
    desc:"It is impossible that man should not be a part of nature and should not be liable to undergo changes other than those which can be understood through his own nature alone. (From IV.3, IV.2.)" },
  { id:"IV.C4",  part:"IV", type:"coroll", label:"IV.4c",x:2472, y:3217,
    desc:"Corollary of IV.4: Hence it follows that man is necessarily subject to passive emotions, and that he cannot always follow the order of reason — he must be influenced by things external to him." },
  { id:"IV.P5",  part:"IV", type:"prop",   label:"IV.5", x:782, y:-2379,
    desc:"The force and growth of any passive emotion, and its constancy in existing, are defined not by the power whereby we ourselves endeavor to continue in existing, but by the power of an external cause compared with our own. (From III.5, IV.Pref.)" },
  { id:"IV.P6",  part:"IV", type:"prop",   label:"IV.6", x:165, y:-3227,
    desc:"The force of any passive emotion can surpass the rest of the activities of a man, so that the emotion becomes obstinately fixed to him. (From IV.5.)" },
  { id:"IV.P7",  part:"IV", type:"prop",   label:"IV.7", x:93, y:-2363,
    desc:"An emotion cannot be controlled or destroyed except by a contrary and stronger emotion. (From III.5, IV.6.)" },
  { id:"IV.P8",  part:"IV", type:"prop",   label:"IV.8", x:-1537, y:-1886,
    desc:"The knowledge of good and evil is nothing else but the emotion of joy or sadness insofar as we are conscious thereof. (From IV.Def I, II, III.11.)" },
  { id:"IV.P14", part:"IV", type:"prop",   label:"IV.14",x:-2384, y:-2296,
    desc:"True knowledge of good and evil cannot restrain any emotion by virtue of being true, but only insofar as it is itself an emotion. (From IV.1, IV.8.)" },
  { id:"IV.P15", part:"IV", type:"prop",   label:"IV.15",x:-1775, y:-2850,
    desc:"Desire arising from true knowledge of good and evil can be quenched or checked by many other desires arising from emotions by which we are assailed. (From IV.14, III.37.)" },
  { id:"IV.P17", part:"IV", type:"prop",   label:"IV.17",x:-1265, y:-3218,
    desc:"Desire arising from true knowledge is the strongest desire there is — if only it can avoid being overcome by other desires. (From III.37, IV.15.)" },
  { id:"IV.C17", part:"IV", type:"coroll", label:"IV.17c",x:-1467, y:-4068,
    desc:"Corollary of IV.17: Desire arising from joy is, other things being equal, stronger than desire arising from sadness. Hence the practical importance of joy in ethics." },
  { id:"IV.P18", part:"IV", type:"prop",   label:"IV.18",x:-841, y:-3276,
    desc:"Desire arising from joy is, other things being equal, stronger than one arising from sadness. (From III.37.)" },
  { id:"IV.P20", part:"IV", type:"prop",   label:"IV.20",x:513, y:-414,
    desc:"The more every man endeavors and is able to seek what is useful to him — i.e., to preserve his being — the more is he endowed with virtue. (From III.Def VIII, III.7.)" },
  { id:"IV.P21", part:"IV", type:"prop",   label:"IV.21",x:55, y:-2495,
    desc:"No one can desire to be blessed, to act well, and to live well who does not at the same time desire to be, to act, and to live — that is, to actually exist. (From III.21.)" },
  { id:"IV.P24", part:"IV", type:"keystone",label:"IV.24\nVirtue=Reason",x:607, y:-1552,
    desc:"Acting absolutely in obedience to virtue is in us the same thing as acting, living, and preserving our being (these three mean the same) under the guidance of reason. (From IV.20, IV.21, III.7, Def VIII.)" },
  { id:"IV.C24", part:"IV", type:"coroll", label:"IV.24c",x:1477, y:-2212,
    desc:"Corollary of IV.24: Self-preservation is the foundation of virtue. No one attempts to preserve his being for the sake of anything else — self-existence is always the foundation." },
  { id:"IV.P26", part:"IV", type:"prop",   label:"IV.26",x:-9, y:-2117,
    desc:"We necessarily seek what is truly useful to us — the highest good is the knowledge of God. (From IV.Def I, III.28.)" },
  { id:"IV.P27", part:"IV", type:"prop",   label:"IV.27",x:-92, y:-1400,
    desc:"We know nothing to be certainly good or evil, save such things as really conduce to understanding, or such as prevent us from understanding. (From IV.26, II.40, IV.24.)" },
  { id:"IV.P28", part:"IV", type:"prop",   label:"IV.28",x:942, y:-1273,
    desc:"The highest good of the mind is the knowledge of God, and the highest virtue of the mind is to know God. (From IV.27, II.47.)" },
  { id:"IV.P29", part:"IV", type:"prop",   label:"IV.29",x:437, y:-786,
    desc:"A thing which is of a different nature to ourselves cannot help nor hinder our power of activity, and absolutely nothing can be either good or evil for us, which has no nature in common with us. (From I.Ax V, I.Ax IV, III.6.)" },
  { id:"IV.P35", part:"IV", type:"keystone",label:"IV.35\nSocial Harmony",x:1016, y:-1757,
    desc:"Insofar as men live in obedience to reason, they necessarily do only such things as are necessarily good for human nature, and consequently for each individual man — they agree in nature. The highest good of those who follow virtue is common to all. (From IV.29, IV.26, IV.28.)" },
  { id:"IV.C35a",part:"IV", type:"coroll", label:"IV.35c1",x:1712, y:-2557,
    desc:"Corollary I of IV.35: There is no individual thing in nature that is more useful to man than a man who lives by the guidance of reason." },
  { id:"IV.C35b",part:"IV", type:"coroll", label:"IV.35c2",x:1920, y:-2325,
    desc:"Corollary II of IV.35: When every man most seeks his own advantage, men are most useful to one another. Rational self-interest and social harmony coincide." },
  { id:"IV.P36", part:"IV", type:"prop",   label:"IV.36",x:1530, y:-1930,
    desc:"The highest good of those who follow virtue is common to all, and therefore all can rejoice therein equally. (From IV.35, IV.28.)" },
  { id:"IV.C36", part:"IV", type:"coroll", label:"IV.36c",x:2293, y:-2652,
    desc:"Corollary of IV.36: The good which every man who follows virtue seeks for himself, he also desires for all other men; and this desire is greater in proportion as he has greater knowledge of God." },
  { id:"IV.P37", part:"IV", type:"prop",   label:"IV.37",x:1099, y:-2457,
    desc:"The good which every man, who follows after virtue, desires for himself, he also desires for other men; and so much the more, in proportion as he has a greater knowledge of God. (From IV.36, IV.24.)" },
  { id:"IV.P45", part:"IV", type:"prop",   label:"IV.45",x:480, y:-3313,
    desc:"Hatred can never be good. (From III.41, IV.7.)" },
  { id:"IV.C45a",part:"IV", type:"coroll", label:"IV.45c1",x:276, y:-4200,
    desc:"Corollary I of IV.45: Envy, derision, contempt, anger, revenge, and the like are hateful, or are bad." },
  { id:"IV.C45b",part:"IV", type:"coroll", label:"IV.45c2",x:705, y:-4144,
    desc:"Corollary II of IV.45: Whatsoever we desire from reasons of envy or hatred is base, and in a city unjust." },
  { id:"IV.P46", part:"IV", type:"prop",   label:"IV.46",x:1356, y:-3309,
    desc:"He who lives under the guidance of reason endeavors, as much as possible, to repay his fellow's hatred, rage, contempt, etc., with love or nobility. (From IV.37, IV.45.)" },
  { id:"IV.C46", part:"IV", type:"coroll", label:"IV.46c",x:1885, y:-3981,
    desc:"Corollary of IV.46: He who wishes to avenge wrongs by hating in return lives in misery. He who endeavors to overcome hatred with love fights his battle in joy and confidence." },
  { id:"IV.P50", part:"IV", type:"prop",   label:"IV.50",x:-1033, y:-1803,
    desc:"Pity (misericordia) in a man who lives under the guidance of reason is in itself bad and useless. (From IV.27, III.27.)" },
  { id:"IV.C50", part:"IV", type:"coroll", label:"IV.50c",x:-1453, y:-3019,
    desc:"Corollary of IV.50: He who is swayed neither by reason nor pity is rightly styled inhuman — for he seems unlike a man. However, pity in a man ruled by reason is useless; reason itself dictates aid to our neighbor." },
  { id:"IV.P54", part:"IV", type:"prop",   label:"IV.54",x:-720, y:-2416,
    desc:"Repentance is not a virtue, or does not arise from reason; but he who repents of an action is doubly wretched or impotent. (From IV.7, III.11.)" },
  { id:"IV.P58", part:"IV", type:"prop",   label:"IV.58",x:151, y:-702,
    desc:"Honor (gloria) arising from reason is true; that which arises otherwise is vain. (From IV.52–57.)" },
  { id:"IV.P67", part:"IV", type:"keystone",label:"IV.67\nFree Man",x:816, y:-1919,
    desc:"A free man thinks of nothing less than of death, and his wisdom is a meditation not on death but on life. (From III.7, IV.24, IV.63.)" },
  { id:"IV.P72", part:"IV", type:"prop",   label:"IV.72",x:1425, y:-1225,
    desc:"A free man never acts deceitfully, but always with good faith. (From IV.67, II.49.)" },
  { id:"IV.P73", part:"IV", type:"prop",   label:"IV.73",x:1350, y:-2472,
    desc:"A man who is guided by reason is more free in a state, where he lives under a general system of law, than in solitude. (From IV.35, IV.37.)" },
  { id:"IV.App", part:"IV", type:"appendix",label:"IV.App\n32 Rules",x:620, y:-2654,
    desc:"Appendix: 32 condensed rules of rational life, summarizing Part IV. Includes: virtue is self-interest rightly understood; the highest good is knowledge; the free man fears nothing but ignorance; to live with others is the highest advantage; etc." },

  // ── PART V ────────────────────────────────────────────────────────────────
  { id:"V.Pref",  part:"V", type:"axiom",    label:"V.Preface",    x:-203, y:-1998,
    desc:"Preface: Critiques Stoic and Cartesian accounts of controlling passion by will. The only true path to freedom is through the intellect — understanding causes removes their power over us." },
  { id:"V.P1",   part:"V", type:"prop",     label:"V.1",   x:-1656, y:425,
    desc:"In the same way as thoughts and the ideas of things are ordered and concatenated in the mind, so are the modifications of body ordered and concatenated in the body exactly. (From II.7c, II.C13.)" },
  { id:"V.P2",   part:"V", type:"prop",     label:"V.2",   x:-2032, y:-567,
    desc:"If we remove a disturbance of the mind (perturbatio animi) from the thought of an external cause, and unite it to other thoughts, then the love or hatred towards that external cause, and also the vacillations of mind arising from these emotions, will be destroyed. (From V.1, III.14.)" },
  { id:"V.P3",   part:"V", type:"prop",     label:"V.3",   x:-2439, y:-714,
    desc:"An emotion which is a passion ceases to be a passion as soon as we form a clear and distinct idea thereof. (From II.3 (Part III?), III.Def III.)" },
  { id:"V.C3",   part:"V", type:"coroll",   label:"V.3c",  x:-3722, y:-750,
    desc:"Corollary of V.3: An emotion therefore becomes more under our control, and the mind is less passive in respect to it, in proportion as it is more known to us." },
  { id:"V.P4",   part:"V", type:"prop",     label:"V.4",   x:-1715, y:-636,
    desc:"There is no modification of the body, whereof we cannot form some clear and distinct conception. (From II.38c, II.39, II.40, IV.Def.)" },
  { id:"V.C4",   part:"V", type:"coroll",   label:"V.4c",  x:-2759, y:-1008,
    desc:"Corollary of V.4: Hence it follows that an emotion is only a passion if our knowledge thereof is inadequate; if we form an adequate idea of the emotion, it becomes an activity of the mind." },
  { id:"V.P5",   part:"V", type:"prop",     label:"V.5",   x:-2981, y:-3035,
    desc:"An emotion towards a thing which we conceive simply, and not as necessary, or as contingent, or as possible, is, other things being equal, greater than any other emotion. (From III.49, IV.14.)" },
  { id:"V.P6",   part:"V", type:"prop",     label:"V.6",   x:-2274, y:918,
    desc:"Insofar as the mind understands all things as necessary, it has greater power over emotions — that is, it is less passive in respect to them. (From V.3, II.44.)" },
  { id:"V.P7",   part:"V", type:"prop",     label:"V.7",   x:-2775, y:-601,
    desc:"Emotions arising from reason or excited by reason are, if we take heed of time, more powerful than those relating to particular things which we regard as absent. (From III.18.)" },
  { id:"V.P10",  part:"V", type:"keystone", label:"V.10",  x:-2599, y:474,
    desc:"So long as we are not assailed by emotions contrary to our nature, we have the power of arranging and concatenating the modifications of our body according to the intellectual order. (From V.1, V.7, V.6.)" },
  { id:"V.P11",  part:"V", type:"prop",     label:"V.11",  x:-3395, y:-127,
    desc:"In proportion as a mental image is related to more things, the more often does it occur — the more it flourishes — and the more it occupies the mind. (From II.18.)" },
  { id:"V.P12",  part:"V", type:"prop",     label:"V.12",  x:-3380, y:114,
    desc:"The images of things are more easily associated with images relating to things which we clearly and distinctly understand than with others. (From II.18.)" },
  { id:"V.P13",  part:"V", type:"prop",     label:"V.13",  x:-4178, y:99,
    desc:"A greater number of things cause an image associated with common properties or with God than an image associated with particular things. (From V.11, V.12.)" },
  { id:"V.P14",  part:"V", type:"prop",     label:"V.14",  x:-3837, y:-231,
    desc:"The mind can bring it about that all modifications of body are referred to the idea of God. (From V.13, V.12.)" },
  { id:"V.P15",  part:"V", type:"keystone", label:"V.15\nLove of God",x:-3013, y:-486,
    desc:"He who clearly and distinctly understands himself and his emotions loves God, and does so the more in proportion as he understands himself and his emotions more. (From V.14, V.4, III.P Def VI.)" },
  { id:"V.P16",  part:"V", type:"prop",     label:"V.16",  x:-3849, y:-540,
    desc:"This love towards God must hold the chief place in the mind. (From V.15, V.11, V.13.)" },
  { id:"V.P17",  part:"V", type:"prop",     label:"V.17",  x:2514, y:-310,
    desc:"God is without passions, neither is he affected by any joy or sadness. (From I.Def VI, III.Def III, I.20.)" },
  { id:"V.C17",  part:"V", type:"coroll",   label:"V.17c", x:3251, y:-791,
    desc:"Corollary of V.17: Strictly speaking, God does not love or hate anyone. For God is not affected by joy or sadness — he is not moved toward or away from anything." },
  { id:"V.P18",  part:"V", type:"prop",     label:"V.18",  x:2238, y:-834,
    desc:"No one can hate God. (From II.47, V.17.)" },
  { id:"V.C18",  part:"V", type:"coroll",   label:"V.18c", x:3128, y:-1342,
    desc:"Corollary of V.18: Love of God cannot be stained by the emotion of envy or jealousy; and the more men we conceive to be joined to God by this bond of love, the more it is fostered." },
  { id:"V.P19",  part:"V", type:"prop",     label:"V.19",  x:3443, y:-480,
    desc:"He who loves God cannot endeavor that God should love him in return. (From V.17, V.C17.)" },
  { id:"V.P20",  part:"V", type:"keystone", label:"V.20\nHighest Good",x:3851, y:-1159,
    desc:"This love towards God cannot be stained by the emotion of envy or jealousy, but is fostered the more, the more men we conceive as joined to God by this bond. (From V.18c, V.19.)" },
  { id:"V.P21",  part:"V", type:"prop",     label:"V.21",  x:-843, y:3106,
    desc:"The mind can imagine nothing, nor remember things past, except during the continuance of the body. (From II.C11, II.8c.)" },
  { id:"V.P22",  part:"V", type:"prop",     label:"V.22",  x:1206, y:2373,
    desc:"Nevertheless in God there is necessarily an idea, which expresses the essence of this or that human body under the form of eternity. (From I.22, I.25, I.21.)" },
  { id:"V.P23",  part:"V", type:"keystone", label:"V.23\nEternal Mind",x:516, y:2160,
    desc:"The human mind cannot be absolutely destroyed with the body, but there remains of it something which is eternal. (From V.22, II.7, I.21, II.C11.) This eternal part is the intellect conceiving things sub specie aeternitatis." },
  { id:"V.P24",  part:"V", type:"prop",     label:"V.24",  x:743, y:-192,
    desc:"The more we understand particular things, the more do we understand God. (From I.15, II.45.)" },
  { id:"V.P25",  part:"V", type:"prop",     label:"V.25",  x:314, y:-943,
    desc:"The highest endeavor of the mind, and the highest virtue is to understand things by the third kind of knowledge. (From V.24, IV.28, II.40.)" },
  { id:"V.P26",  part:"V", type:"prop",     label:"V.26",  x:42, y:-1936,
    desc:"In proportion as the mind is more capable of understanding things by the third kind of knowledge, it desires more to understand things by that kind. (From III.37, V.25.)" },
  { id:"V.P27",  part:"V", type:"prop",     label:"V.27",  x:1318, y:-860,
    desc:"From the third kind of knowledge arises the highest possible mental acquiescence (acquiescentia mentis). (From V.25, III.53, IV.52.)" },
  { id:"V.P28",  part:"V", type:"prop",     label:"V.28",  x:-1068, y:54,
    desc:"The endeavor or desire to know things by the third kind of knowledge cannot arise from the first kind, but from the second. (From II.40, II.41.)" },
  { id:"V.P29",  part:"V", type:"prop",     label:"V.29\nSub specie aeternitatis",x:1053, y:1934,
    desc:"Whatever the mind understands under a form of eternity, it does not understand by virtue of conceiving the present actual existence of the body, but by virtue of conceiving the essence of the body under a form of eternity. (From V.23, V.22, I.21.)" },
  { id:"V.P30",  part:"V", type:"prop",     label:"V.30",  x:1062, y:650,
    desc:"Insofar as our mind knows itself and the body under the form of eternity, it necessarily has a knowledge of God, and knows that it is in God, and is conceived through God. (From V.29, I.28, II.45, II.47.)" },
  { id:"V.P31",  part:"V", type:"prop",     label:"V.31",  x:860, y:2886,
    desc:"The third kind of knowledge depends on the mind, as its formal cause, insofar as the mind itself is eternal. (From V.29, V.23.)" },
  { id:"V.C31",  part:"V", type:"coroll",   label:"V.31c", x:959, y:3842,
    desc:"Corollary of V.31: Hence it follows that in proportion as the mind is more potent in the third kind of knowledge, it is less subject to those emotions which are evil, and fears death less." },
  { id:"V.P32",  part:"V", type:"prop",     label:"V.32",  x:1724, y:339,
    desc:"Whatsoever we understand by the third kind of knowledge, we take delight in, and our delight is accompanied by the idea of God as cause. (From V.27, V.30, III.Def VI.)" },
  { id:"V.C32",  part:"V", type:"coroll",   label:"V.32c", x:2926, y:-196,
    desc:"Corollary of V.32: From the third kind of knowledge necessarily arises the intellectual love of God (amor intellectualis Dei). This love is eternal and not stained by any passion." },
  { id:"V.P33",  part:"V", type:"prop",     label:"V.33",  x:1541, y:1750,
    desc:"The intellectual love of God, which arises from the third kind of knowledge, is eternal. (From V.32, V.23, I.21.)" },
  { id:"V.P34",  part:"V", type:"prop",     label:"V.34",  x:56, y:3054,
    desc:"Only during life is it possible for a man to be subject to those emotions which are attributable to passions; to fear, sorrow, etc. (From V.21, V.23.)" },
  { id:"V.P35",  part:"V", type:"prop",     label:"V.35",  x:2177, y:81,
    desc:"God loves himself with an infinite intellectual love. (From V.30, V.32, I.35.)" },
  { id:"V.P36",  part:"V", type:"keystone", label:"V.36\nAmor Dei Intellectualis",x:2851, y:-838,
    desc:"The intellectual love of the mind towards God is part of the infinite love wherewith God loves himself. (From V.35, V.32c.)" },
  { id:"V.C36",  part:"V", type:"coroll",   label:"V.36c", x:3890, y:-839,
    desc:"Corollary of V.36: Hence it follows that God, insofar as he loves himself, loves men; and consequently that the love of God towards men, and the intellectual love of the mind towards God are one and the same." },
  { id:"V.P37",  part:"V", type:"prop",     label:"V.37",  x:1998, y:1056,
    desc:"There is nothing in nature, which is contrary to this intellectual love, or which can take it away. (From V.33, V.35, I.15.)" },
  { id:"V.P38",  part:"V", type:"prop",     label:"V.38",  x:621, y:3150,
    desc:"In proportion as the mind understands more things by the second and third kind of knowledge, it is less subject to those emotions which are evil, and stands in less fear of death. (From V.38, V.23, V.31c.)" },
  { id:"V.P39",  part:"V", type:"prop",     label:"V.39",  x:306, y:3158,
    desc:"He who possesses a body capable of the greatest number of activities, possesses a mind whereof the greatest part is eternal. (From V.38, V.23, V.39.)" },
  { id:"V.C39",  part:"V", type:"coroll",   label:"V.39c", x:236, y:4063,
    desc:"Corollary of V.39: Hence it follows that he who has a body suited for many activities has a mind consisting chiefly of the eternal part — he is scarcely troubled by death or the fear thereof." },
  { id:"V.P40",  part:"V", type:"prop",     label:"V.40",  x:-957, y:-2654,
    desc:"In proportion as each thing possesses more of perfection, so is it more active and less passive; and conversely, in proportion as it is more active, so is it more perfect. (From III.Def I, II, V.3.)" },
  { id:"V.C40",  part:"V", type:"coroll",   label:"V.40c", x:1145, y:-2867,
    desc:"Corollary of V.40: Hence it follows that the part of the mind that is eternal is more powerful than the rest. (That is, understanding is more perfect than imagination.)" },
  { id:"V.P41",  part:"V", type:"prop",     label:"V.41",  x:958, y:-3584,
    desc:"Even if we did not know that our mind is eternal, we should still regard as of primary importance piety and religion, and generally all things which relate to strength of mind (fortitudo). (From IV.App.)" },
  { id:"V.P42",  part:"V", type:"keystone", label:"V.42\nBlessedness IS Virtue",x:2547, y:-1969,
    desc:"Blessedness is not the reward of virtue, but virtue itself; we do not rejoice therein because we control our lusts — but contrariwise, because we rejoice therein, we are able to control our lusts. (From V.36, V.40c, III.P Def II.)" },
];

const RAW_EDGES = [
  ["I.Def","I.P1"],
  ["I.Def","I.P2"],
  ["I.Ax","I.P3"],
  ["I.Ax","I.P4"],
  ["I.Def","I.P4"],
  ["I.Def","I.P5"],
  ["I.P1","I.P5"],
  ["I.P4","I.P5"],
  ["I.Ax","I.C6"],
  ["I.Def","I.C6"],
  ["I.P5","I.C6"],
  ["I.P6","I.C6"],
  ["I.P2","I.P6"],
  ["I.P3","I.P6"],
  ["I.C6","I.P7"],
  ["I.Def","I.P8"],
  ["I.P5","I.P8"],
  ["I.P7","I.P8"],
  ["I.Def","I.P9"],
  ["I.Def","I.P10"],
  ["I.Def","I.P11"],
  ["I.P2","I.P11"],
  ["I.P7","I.P11"],
  ["I.Def","I.P12"],
  ["I.P2","I.P12"],
  ["I.P5","I.P12"],
  ["I.P6","I.P12"],
  ["I.P7","I.P12"],
  ["I.P8","I.P12"],
  ["I.P10","I.P12"],
  ["I.P13","I.C13"],
  ["I.P5","I.P13"],
  ["I.P7","I.P13"],
  ["I.P11","I.P13"],
  ["I.Def","I.C14a"],
  ["I.P10","I.C14a"],
  ["I.P14","I.C14a"],
  ["I.Ax","I.C14b"],
  ["I.P14","I.C14b"],
  ["I.Def","I.P14"],
  ["I.P5","I.P14"],
  ["I.P11","I.P14"],
  ["I.Ax","I.P15"],
  ["I.Def","I.P15"],
  ["I.P14","I.P15"],
  ["I.P16","I.C16a"],
  ["I.P16","I.C16b"],
  ["I.P16","I.C16c"],
  ["I.Def","I.P16"],
  ["I.P17","I.C17a"],
  ["I.Def","I.C17b"],
  ["I.P11","I.C17b"],
  ["I.C14a","I.C17b"],
  ["I.P17","I.C17b"],
  ["I.P15","I.P17"],
  ["I.P16","I.P17"],
  ["I.P14","I.P18"],
  ["I.P15","I.P18"],
  ["I.C16a","I.P18"],
  ["I.Def","I.P19"],
  ["I.P7","I.P19"],
  ["I.P11","I.P19"],
  ["I.P20","I.C20a"],
  ["I.P20","I.C20b"],
  ["I.Def","I.P20"],
  ["I.P19","I.P20"],
  ["I.Def","I.P21"],
  ["I.P11","I.P21"],
  ["I.C20b","I.P21"],
  ["I.P21","I.P22"],
  ["I.Def","I.P23"],
  ["I.P15","I.P23"],
  ["I.P21","I.P23"],
  ["I.P22","I.P23"],
  ["I.C14a","I.C24"],
  ["I.P24","I.C24"],
  ["I.Def","I.P24"],
  ["I.Def","I.C25"],
  ["I.P15","I.C25"],
  ["I.P25","I.C25"],
  ["I.Ax","I.P25"],
  ["I.P15","I.P25"],
  ["I.P16","I.P26"],
  ["I.P25","I.P26"],
  ["I.Ax","I.P27"],
  ["I.Ax","I.P28"],
  ["I.Def","I.P28"],
  ["I.P21","I.P28"],
  ["I.C24","I.P28"],
  ["I.P26","I.P28"],
  ["I.P11","I.P29"],
  ["I.P15","I.P29"],
  ["I.P16","I.P29"],
  ["I.C24","I.P29"],
  ["I.P26","I.P29"],
  ["I.P27","I.P29"],
  ["I.Ax","I.P30"],
  ["I.C14a","I.P30"],
  ["I.P15","I.P30"],
  ["I.Def","I.P31"],
  ["I.P15","I.P31"],
  ["I.P32","I.C32a"],
  ["I.P29","I.C32b"],
  ["I.P32","I.C32b"],
  ["I.Def","I.P32"],
  ["I.P23","I.P32"],
  ["I.P28","I.P32"],
  ["I.P11","I.P33"],
  ["I.C14a","I.P33"],
  ["I.P16","I.P33"],
  ["I.P29","I.P33"],
  ["I.P11","I.P34"],
  ["I.P16","I.P34"],
  ["I.P34","I.P35"],
  ["I.P16","I.P36"],
  ["I.C25","I.P36"],
  ["I.P34","I.P36"],
  ["I.Def","II.P1"],
  ["I.C25","II.P1"],
  ["II.P1","II.P2"],
  ["I.P15","II.P3"],
  ["I.P16","II.P3"],
  ["I.P35","II.P3"],
  ["II.P1","II.P3"],
  ["I.C14a","II.P4"],
  ["I.P30","II.P4"],
  ["I.Ax","II.P5"],
  ["I.P10","II.P5"],
  ["I.C25","II.P5"],
  ["II.P3","II.P5"],
  ["II.P6","II.C6"],
  ["I.Ax","II.P6"],
  ["I.P10","II.P6"],
  ["II.P7","II.C7"],
  ["I.Ax","II.P7"],
  ["II.P8","II.C8"],
  ["II.P7","II.P8"],
  ["II.P3","II.C9"],
  ["II.P7","II.C9"],
  ["II.P8","II.C9"],
  ["II.P9","II.C9"],
  ["I.P28","II.P9"],
  ["II.P6","II.P9"],
  ["II.P7","II.P9"],
  ["II.P8","II.P9"],
  ["II.P9","II.C10"],
  ["II.P10","II.C10"],
  ["I.P7","II.P10"],
  ["II.Def","II.P10"],
  ["II.P11","II.C11"],
  ["I.P21","II.P11"],
  ["II.C8","II.P11"],
  ["II.P10","II.P11"],
  ["II.C9","II.P12"],
  ["II.C11","II.P12"],
  ["II.P11","II.P12"],
  ["II.P13","II.C13"],
  ["I.Ax","II.P13"],
  ["I.P36","II.P13"],
  ["II.C9","II.P13"],
  ["II.C11","II.P13"],
  ["II.P11","II.P13"],
  ["II.P12","II.P14"],
  ["II.P7","II.P15"],
  ["II.C8","II.P15"],
  ["II.P13","II.P15"],
  ["II.P16","II.C16a"],
  ["II.P16","II.C16b"],
  ["I.Ax","II.P16"],
  ["II.P12","II.C17"],
  ["II.P17","II.C17"],
  ["II.P12","II.P17"],
  ["II.P16","II.P17"],
  ["II.C17","II.P18"],
  ["II.P7","II.P19"],
  ["II.P9","II.P19"],
  ["II.C11","II.P19"],
  ["II.P12","II.P19"],
  ["II.P13","II.P19"],
  ["II.P16","II.P19"],
  ["II.P1","II.P20"],
  ["II.P3","II.P20"],
  ["II.P7","II.P20"],
  ["II.P9","II.P20"],
  ["II.P11","II.P20"],
  ["II.P12","II.P21"],
  ["II.P13","II.P21"],
  ["II.P12","II.P22"],
  ["II.P20","II.P22"],
  ["II.P21","II.P22"],
  ["II.C11","II.P23"],
  ["II.P11","II.P23"],
  ["II.P13","II.P23"],
  ["II.P16","II.P23"],
  ["II.P19","II.P23"],
  ["II.P20","II.P23"],
  ["II.P22","II.P23"],
  ["II.P3","II.P24"],
  ["II.P7","II.P24"],
  ["II.P9","II.P24"],
  ["II.C11","II.P24"],
  ["II.P13","II.P24"],
  ["II.P7","II.P25"],
  ["II.P9","II.P25"],
  ["II.P17","II.C26"],
  ["II.P25","II.C26"],
  ["II.P26","II.C26"],
  ["II.P7","II.P26"],
  ["II.P16","II.P26"],
  ["II.P16","II.P27"],
  ["II.P16","II.P28"],
  ["II.P24","II.P28"],
  ["II.P19","II.C29"],
  ["II.P23","II.C29"],
  ["II.P25","II.C29"],
  ["II.P27","II.C29"],
  ["II.P28","II.C29"],
  ["II.P29","II.C29"],
  ["I.Ax","II.P29"],
  ["II.P13","II.P29"],
  ["II.P27","II.P29"],
  ["I.P21","II.P30"],
  ["I.P28","II.P30"],
  ["II.C9","II.P30"],
  ["II.C11","II.P30"],
  ["I.P29","II.C31"],
  ["I.P33","II.C31"],
  ["II.P30","II.C31"],
  ["II.P31","II.C31"],
  ["I.P28","II.P31"],
  ["II.P30","II.P31"],
  ["I.Ax","II.P32"],
  ["II.C7","II.P32"],
  ["I.P15","II.P33"],
  ["II.P32","II.P33"],
  ["II.C11","II.P34"],
  ["II.P32","II.P34"],
  ["II.P33","II.P35"],
  ["I.P15","II.P36"],
  ["II.P6","II.P36"],
  ["II.C7","II.P36"],
  ["II.P24","II.P36"],
  ["II.P28","II.P36"],
  ["II.P32","II.P36"],
  ["II.Def","II.P37"],
  ["II.P37","II.C38"],
  ["II.P38","II.C38"],
  ["II.C7","II.P38"],
  ["II.C11","II.P38"],
  ["II.P12","II.P38"],
  ["II.P16","II.P38"],
  ["II.P39","II.C39"],
  ["II.C7","II.P39"],
  ["II.C11","II.P39"],
  ["II.P13","II.P39"],
  ["II.P16","II.P39"],
  ["II.C11","II.P40"],
  ["II.P34","II.P41"],
  ["II.P35","II.P41"],
  ["II.P40","II.P42"],
  ["II.P43","II.C43"],
  ["II.C11","II.P43"],
  ["II.P20","II.P43"],
  ["II.P34","II.P43"],
  ["II.P44","II.C44a"],
  ["I.Ax","II.C44b"],
  ["I.P16","II.C44b"],
  ["II.P37","II.C44b"],
  ["II.P38","II.C44b"],
  ["II.P41","II.C44b"],
  ["II.P44","II.C44b"],
  ["I.Ax","II.P44"],
  ["I.P29","II.P44"],
  ["II.P41","II.P44"],
  ["II.P45","II.C45"],
  ["I.Ax","II.P45"],
  ["I.P6","II.P45"],
  ["I.P15","II.P45"],
  ["II.P6","II.P45"],
  ["II.P8","II.P45"],
  ["II.P38","II.P46"],
  ["II.P45","II.P46"],
  ["II.P47","II.C47"],
  ["II.C16a","II.P47"],
  ["II.P17","II.P47"],
  ["II.P19","II.P47"],
  ["II.P22","II.P47"],
  ["II.P23","II.P47"],
  ["II.P45","II.P47"],
  ["II.P46","II.P47"],
  ["II.P48","II.C48"],
  ["I.C17a","II.P48"],
  ["I.P28","II.P48"],
  ["II.P11","II.P48"],
  ["II.P48","II.C49"],
  ["II.P49","II.C49"],
  ["II.C48","III.Def"],
  ["I.P36","III.P1"],
  ["II.P9","III.P1"],
  ["II.C11","III.P1"],
  ["II.P40","III.P1"],
  ["III.Def","III.P1"],
  ["II.Def","III.P2"],
  ["II.P6","III.P2"],
  ["II.P11","III.P3"],
  ["II.P13","III.P3"],
  ["II.P15","III.P3"],
  ["II.C29","III.P3"],
  ["II.C38","III.P3"],
  ["II.C48","III.P3"],
  ["III.P1","III.P3"],
  ["III.P4","III.P5"],
  ["I.C25","III.P6"],
  ["I.P34","III.P6"],
  ["III.P4","III.P6"],
  ["III.P5","III.P6"],
  ["I.P29","III.P7"],
  ["I.P36","III.P7"],
  ["III.P6","III.P7"],
  ["III.P4","III.P8"],
  ["II.P23","III.P9"],
  ["III.P3","III.P9"],
  ["III.P7","III.P9"],
  ["III.P8","III.P9"],
  ["II.C9","III.P10"],
  ["II.P11","III.P10"],
  ["III.P5","III.P10"],
  ["II.P7","III.P11"],
  ["II.P14","III.P11"],
  ["II.P7","III.P12"],
  ["II.P17","III.P12"],
  ["III.P6","III.P12"],
  ["III.P11","III.P12"],
  ["III.P13","III.C13"],
  ["II.P17","III.P13"],
  ["III.P9","III.P13"],
  ["III.P12","III.P13"],
  ["II.C16a","III.P14"],
  ["II.P18","III.P14"],
  ["III.Def","III.P14"],
  ["III.P11","III.C15"],
  ["III.P12","III.C15"],
  ["III.C13","III.C15"],
  ["III.P13","III.C15"],
  ["III.P14","III.C15"],
  ["III.P15","III.C15"],
  ["III.P11","III.P15"],
  ["III.P14","III.P15"],
  ["III.P14","III.P16"],
  ["III.P15","III.P16"],
  ["III.P17","III.C17"],
  ["III.P13","III.P17"],
  ["III.P16","III.P17"],
  ["III.P18","III.C18a"],
  ["III.P18","III.C18b"],
  ["II.C16a","III.P18"],
  ["II.P17","III.P18"],
  ["II.P44","III.P18"],
  ["II.P17","III.P19"],
  ["III.P11","III.P19"],
  ["III.P12","III.P19"],
  ["III.P11","III.P20"],
  ["III.P13","III.P20"],
  ["III.P11","III.P21"],
  ["III.P19","III.P21"],
  ["III.P22","III.C22"],
  ["III.P13","III.P22"],
  ["III.P21","III.P22"],
  ["III.P21","III.P26"],
  ["III.P1","III.C27a"],
  ["III.P21","III.C27a"],
  ["III.P22","III.C27a"],
  ["III.P26","III.C27a"],
  ["III.P27","III.C27a"],
  ["III.P27","III.C27b"],
  ["III.P9","III.C27c"],
  ["III.P13","III.C27c"],
  ["III.P26","III.C27c"],
  ["III.P27","III.C27c"],
  ["II.P10","III.P27"],
  ["II.P17","III.P27"],
  ["II.C7","III.P28"],
  ["II.C11","III.P28"],
  ["II.P17","III.P28"],
  ["III.P9","III.P28"],
  ["III.P12","III.P28"],
  ["III.P13","III.P28"],
  ["III.P20","III.P28"],
  ["III.P19","III.C36"],
  ["III.P36","III.C36"],
  ["III.P15","III.P36"],
  ["III.P5","III.P37"],
  ["III.P7","III.P37"],
  ["III.P11","III.P37"],
  ["III.P1","III.P48"],
  ["III.P13","III.P48"],
  ["II.P32","IV.P1"],
  ["II.P33","IV.P1"],
  ["II.P35","IV.P1"],
  ["IV.P3","IV.P1"],
  ["III.Def","IV.P2"],
  ["IV.P4","IV.C4"],
  ["I.P16","IV.P4"],
  ["I.P21","IV.P4"],
  ["I.C24","IV.P4"],
  ["I.P34","IV.P4"],
  ["III.P7","IV.P4"],
  ["IV.P3","IV.P4"],
  ["II.P16","IV.P5"],
  ["III.Def","IV.P5"],
  ["III.P7","IV.P5"],
  ["IV.P3","IV.P6"],
  ["IV.P5","IV.P6"],
  ["II.P6","IV.P7"],
  ["II.P12","IV.P7"],
  ["III.P5","IV.P7"],
  ["IV.P5","IV.P7"],
  ["II.P21","IV.P8"],
  ["II.P22","IV.P8"],
  ["III.P7","IV.P8"],
  ["IV.P8","IV.P14"],
  ["III.App","IV.P15"],
  ["III.Def","IV.P15"],
  ["III.P1","IV.P15"],
  ["III.P7","IV.P15"],
  ["III.P37","IV.P15"],
  ["IV.P3","IV.P15"],
  ["IV.P17","IV.C17"],
  ["IV.P1","IV.P17"],
  ["III.App","IV.P18"],
  ["III.P4","IV.P20"],
  ["III.P6","IV.P20"],
  ["III.App","IV.P21"],
  ["III.P7","IV.P21"],
  ["IV.P24","IV.C24"],
  ["III.P3","IV.P24"],
  ["II.P40","IV.P26"],
  ["III.P6","IV.P26"],
  ["III.P7","IV.P26"],
  ["III.P9","IV.P26"],
  ["II.P40","IV.P27"],
  ["II.P41","IV.P27"],
  ["IV.P26","IV.P27"],
  ["I.Def","IV.P28"],
  ["I.P15","IV.P28"],
  ["IV.P26","IV.P28"],
  ["IV.P27","IV.P28"],
  ["I.P28","IV.P29"],
  ["II.P6","IV.P29"],
  ["III.P11","IV.P29"],
  ["IV.P8","IV.P29"],
  ["III.Def","IV.C35a"],
  ["IV.P35","IV.C35a"],
  ["IV.P20","IV.C35b"],
  ["IV.P35","IV.C35b"],
  ["II.P41","IV.P35"],
  ["III.Def","IV.P35"],
  ["III.P3","IV.P35"],
  ["IV.P36","IV.C36"],
  ["II.P47","IV.P36"],
  ["IV.P24","IV.P36"],
  ["IV.P26","IV.P36"],
  ["IV.P28","IV.P36"],
  ["I.P15","IV.P37"],
  ["II.P11","IV.P37"],
  ["II.P47","IV.P37"],
  ["III.App","IV.P37"],
  ["III.P37","IV.P37"],
  ["IV.P26","IV.P37"],
  ["IV.P35","IV.P37"],
  ["IV.P37","IV.C45a"],
  ["IV.P45","IV.C45a"],
  ["IV.P37","IV.C45b"],
  ["IV.P45","IV.C45b"],
  ["IV.P37","IV.P45"],
  ["IV.P46","IV.C46"],
  ["IV.P37","IV.P46"],
  ["IV.C45a","IV.P46"],
  ["IV.P50","IV.C50"],
  ["III.App","IV.P50"],
  ["IV.P27","IV.P50"],
  ["IV.P37","IV.P50"],
  ["III.App","IV.P54"],
  ["III.App","IV.P58"],
  ["IV.P37","IV.P58"],
  ["IV.P24","IV.P67"],
  ["IV.P37","IV.P73"],
  ["II.C6","V.P1"],
  ["II.P7","V.P1"],
  ["II.C13","V.P1"],
  ["II.P18","V.P1"],
  ["III.P2","V.P1"],
  ["III.App","V.P2"],
  ["V.P3","V.C3"],
  ["II.P21","V.P3"],
  ["III.P3","V.P3"],
  ["V.P3","V.C4"],
  ["V.P4","V.C4"],
  ["II.P12","V.P4"],
  ["II.P13","V.P4"],
  ["II.P38","V.P4"],
  ["II.P35","V.P5"],
  ["I.P29","V.P6"],
  ["III.P48","V.P6"],
  ["V.P5","V.P6"],
  ["II.P17","V.P7"],
  ["II.P38","V.P7"],
  ["II.P40","V.P7"],
  ["IV.P6","V.P7"],
  ["II.P40","V.P10"],
  ["II.P47","V.P10"],
  ["IV.P26","V.P10"],
  ["IV.P27","V.P10"],
  ["II.P18","V.P12"],
  ["II.P40","V.P12"],
  ["V.P11","V.P12"],
  ["II.P18","V.P13"],
  ["I.P15","V.P14"],
  ["V.P4","V.P14"],
  ["III.App","V.P15"],
  ["V.P14","V.P15"],
  ["V.P11","V.P16"],
  ["V.P14","V.P16"],
  ["V.P15","V.P16"],
  ["III.App","V.C17"],
  ["V.P16","V.C17"],
  ["V.P17","V.C17"],
  ["I.C20a","V.P17"],
  ["II.Def","V.P17"],
  ["II.P32","V.P17"],
  ["III.App","V.P17"],
  ["V.P18","V.C18"],
  ["II.P46","V.P18"],
  ["II.P47","V.P18"],
  ["III.App","V.P18"],
  ["III.P3","V.P18"],
  ["III.P19","V.P19"],
  ["III.P28","V.P19"],
  ["V.C17","V.P19"],
  ["III.App","V.P20"],
  ["IV.P28","V.P20"],
  ["IV.P36","V.P20"],
  ["IV.P37","V.P20"],
  ["V.P18","V.P20"],
  ["II.C8","V.P21"],
  ["II.P17","V.P21"],
  ["II.P18","V.P21"],
  ["II.P26","V.P21"],
  ["I.Ax","V.P22"],
  ["I.P16","V.P22"],
  ["I.P25","V.P22"],
  ["II.P3","V.P22"],
  ["II.C8","V.P23"],
  ["II.P13","V.P23"],
  ["V.P22","V.P23"],
  ["I.C25","V.P24"],
  ["II.P40","V.P25"],
  ["III.P7","V.P25"],
  ["IV.P28","V.P25"],
  ["V.P24","V.P25"],
  ["III.App","V.P26"],
  ["III.App","V.P27"],
  ["IV.P28","V.P27"],
  ["V.P24","V.P27"],
  ["V.P25","V.P27"],
  ["II.P40","V.P28"],
  ["III.App","V.P28"],
  ["I.Def","V.P29"],
  ["II.P13","V.P29"],
  ["II.P26","V.P29"],
  ["II.C44a","V.P29"],
  ["V.P21","V.P29"],
  ["V.P23","V.P29"],
  ["I.Def","V.P30"],
  ["V.P31","V.C31"],
  ["II.P40","V.P31"],
  ["II.P46","V.P31"],
  ["III.Def","V.P31"],
  ["V.P21","V.P31"],
  ["V.P23","V.P31"],
  ["V.P29","V.P31"],
  ["V.P30","V.P31"],
  ["III.App","V.C32"],
  ["V.P29","V.C32"],
  ["V.P32","V.C32"],
  ["III.App","V.P32"],
  ["V.P27","V.P32"],
  ["V.P30","V.P32"],
  ["I.Ax","V.P33"],
  ["V.P31","V.P33"],
  ["II.C16a","V.P34"],
  ["II.P17","V.P34"],
  ["V.P21","V.P34"],
  ["I.Def","V.P35"],
  ["I.P11","V.P35"],
  ["II.Def","V.P35"],
  ["II.P3","V.P35"],
  ["V.C32","V.P35"],
  ["V.P36","V.C36"],
  ["I.C25","V.P36"],
  ["II.C11","V.P36"],
  ["III.P3","V.P36"],
  ["V.C32","V.P36"],
  ["V.P32","V.P36"],
  ["V.P35","V.P36"],
  ["V.P29","V.P37"],
  ["V.P33","V.P37"],
  ["II.P11","V.P38"],
  ["V.P23","V.P38"],
  ["V.P29","V.P38"],
  ["V.C31","V.P38"],
  ["V.P37","V.P38"],
  ["V.P39","V.C39"],
  ["V.P10","V.P39"],
  ["V.P15","V.P39"],
  ["V.P16","V.P39"],
  ["V.P33","V.P39"],
  ["III.P3","V.C40"],
  ["V.P21","V.C40"],
  ["V.P23","V.C40"],
  ["V.P29","V.C40"],
  ["V.P40","V.C40"],
  ["II.Def","V.P40"],
  ["III.P3","V.P40"],
  ["III.P3","V.P42"],
  ["V.C3","V.P42"],
  ["V.C32","V.P42"],
  ["V.P32","V.P42"],
  ["V.P36","V.P42"],
  ["V.P38","V.P42"],
];

const nodeMap = {};
RAW_NODES.forEach(n => nodeMap[n.id] = n);

function computeAncestors(nodeId) {
  const nodeSet = new Set([nodeId]);
  const edgeSet = new Set();
  const queue = [nodeId];
  while (queue.length) {
    const cur = queue.shift();
    RAW_EDGES.forEach(([a, b]) => {
      if (b === cur) {
        edgeSet.add(a + "->" + b);
        if (!nodeSet.has(a)) { nodeSet.add(a); queue.push(a); }
      }
    });
  }
  return { nodeSet, edgeSet };
}

function getRadius(type) {
  if (type === "keystone") return 28;
  if (type === "coroll") return 20;
  if (type === "axiom") return 34;
  if (type === "appendix") return 38;
  return 18;
}

// Numeric ordering key from an id like "I.P14" / "I.C14a" → 14 (0 for Defs/Axioms)
function nodeNum(id) {
  const rest = id.slice(id.indexOf(".") + 1);
  const m = rest.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// One-sentence gloss for the index, derived from a node's full description: the first
// real sentence, with any trailing "(From …)" citation dropped. Skips mid-sentence
// abbreviations (e.g. "etc.") by requiring the period to be followed by a capital, "(", or end.
function shortGloss(desc) {
  if (!desc) return "";
  const s = desc.replace(/\s+/g, " ").trim();
  let end = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== ".") continue;
    const m = s.slice(i + 1).match(/^\s*(\S)/);
    const next = m ? m[1] : "";
    if (next === "" || next === "(" || /[A-Z0-9]/.test(next)) { end = i; break; }
  }
  let out = (end >= 0 ? s.slice(0, end + 1) : s).replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (out.length > 130) out = out.slice(0, 127).replace(/\s+\S*$/, "") + "…";
  return out;
}

// Curated one-sentence essences for the index — synthesizing each proposition's core
// point rather than quoting its full statement. Keyed by node id; falls back to
// shortGloss(desc) for anything not listed.
const GLOSS = {
  // ── Part I — Concerning God ──
  "I.Def":"Eight founding definitions: cause-of-itself, substance, attribute, mode, God, freedom, eternity.",
  "I.Ax":"Seven axioms grounding the entire deductive system.",
  "I.P1":"Substance is prior in nature to its modifications.",
  "I.P2":"Substances with different attributes share nothing in common.",
  "I.P3":"What shares nothing in common cannot cause one another.",
  "I.P4":"Things are distinguished only by attributes or modifications.",
  "I.P5":"No two substances can share the same attribute.",
  "I.P6":"One substance cannot be produced by another.",
  "I.C6":"Substance cannot be produced by anything external to itself.",
  "I.P7":"Existence belongs to the nature of substance — it is self-caused.",
  "I.P8":"Every substance is necessarily infinite.",
  "I.P9":"The more reality a thing has, the more attributes it has.",
  "I.P10":"Each attribute is conceived through itself.",
  "I.P11":"God necessarily exists.",
  "I.C13":"Substance, even as extended, is indivisible.",
  "I.P12":"No attribute renders substance divisible.",
  "I.P13":"Absolutely infinite substance is indivisible.",
  "I.P14":"Besides God, no substance can exist or be conceived.",
  "I.C14a":"God is one: only a single substance exists.",
  "I.C14b":"Thought and extension are attributes of God.",
  "I.P15":"Whatever is, is in God; nothing exists or is conceived without God.",
  "I.P16":"Infinite things follow necessarily from the divine nature.",
  "I.C16a":"God is the efficient cause of all things.",
  "I.C16b":"God causes through his own nature, not by accident.",
  "I.C16c":"God is the absolutely first cause.",
  "I.P17":"God acts solely from the laws of his own nature.",
  "I.C17a":"Nothing outside God moves him to act.",
  "I.C17b":"God is the sole free cause.",
  "I.P18":"God is the immanent, not the transient, cause of all things.",
  "I.P19":"God and all his attributes are eternal.",
  "I.P20":"God's existence and essence are one and the same.",
  "I.C20a":"God's existence is an eternal truth.",
  "I.C20b":"God and his attributes are unchangeable.",
  "I.P21":"What follows from an attribute's absolute nature is eternal and infinite.",
  "I.P22":"What follows through an infinite modification is likewise eternal and infinite.",
  "I.P23":"Every infinite mode follows from an attribute of God.",
  "I.P24":"The essence of created things does not involve their existence.",
  "I.C24":"God causes things not only to exist but to persevere in existing.",
  "I.P25":"God is the cause of the essence of things, not only their existence.",
  "I.C25":"Particular things are merely modes expressing God's attributes.",
  "I.P26":"Whatever acts was determined to act by God.",
  "I.P27":"What God has determined cannot make itself undetermined.",
  "I.P28":"Every finite thing is determined by another finite thing, to infinity.",
  "I.P29":"Nothing is contingent; all is determined by divine necessity.",
  "I.P30":"Intellect can grasp only God's attributes and their modifications.",
  "I.P31":"Will and intellect belong to nature-natured, not nature-naturing.",
  "I.P32":"Will is not a free cause but a necessary one.",
  "I.C32a":"God does not act from freedom of will.",
  "I.C32b":"Will and intellect are conditioned by divine necessity like all else.",
  "I.P33":"Things could have been produced in no other order than they were.",
  "I.P34":"God's power is identical with his essence.",
  "I.P35":"Whatever is in God's power necessarily exists.",
  "I.P36":"Every nature produces some effect; nothing is causally barren.",
  "I.App":"Rejects final causes: good, evil, and order are projections of imagination.",
  // ── Part II — Mind ──
  "II.Def":"Definitions and axioms of mind: body, idea, adequate idea, the thinking man.",
  "II.P1":"Thought is an attribute of God; God is a thinking thing.",
  "II.P2":"Extension is an attribute of God; God is an extended thing.",
  "II.P3":"In God is the idea of his essence and all that follows from it.",
  "II.P4":"God's idea of all things can only be one.",
  "II.P5":"Ideas are caused by God only insofar as he is a thinking thing.",
  "II.P6":"Modes of an attribute are caused by God under that attribute alone.",
  "II.C6":"Things follow from their own attribute, not from God's prior knowledge.",
  "II.P7":"The order and connection of ideas is the same as that of things.",
  "II.C7":"God's power of thinking equals his power of acting.",
  "II.P8":"Ideas of non-existent things are contained in God's infinite idea.",
  "II.C8":"Until things exist, their ideas exist only within God's infinite idea.",
  "II.P9":"Each idea of a particular thing is caused by another idea, to infinity.",
  "II.C9":"Whatever happens in an idea's object, God knows through that idea.",
  "II.P10":"Substance does not constitute the essence of man.",
  "II.C10":"Man's essence consists of modifications of God's attributes.",
  "II.P11":"The mind's first constituent is the idea of an actually existing body.",
  "II.C11":"The human mind is part of God's infinite intellect.",
  "II.P12":"Whatever happens in the body is perceived by the mind.",
  "II.P13":"The object of the human mind is the body, and nothing else.",
  "II.C13":"Mind and body are united; the richer the body, the richer the mind.",
  "II.P14":"The mind perceives more as the body can be affected in more ways.",
  "II.P15":"The mind is composed of many ideas, not a single simple one.",
  "II.P16":"Each affection's idea involves both our body and the external body.",
  "II.C16a":"We perceive external bodies together with our own.",
  "II.C16b":"Our ideas reveal our own body more than external ones.",
  "II.P17":"The mind regards a body as present until affected otherwise.",
  "II.C17":"The mind can picture absent bodies as present — imagination.",
  "II.P18":"Memory: one image recalls another once they were linked.",
  "II.P19":"The mind knows the body only through ideas of its affections.",
  "II.P20":"There is in God an idea of the human mind, as of the body.",
  "II.P21":"Mind and the idea of the mind are one thing under different attributes.",
  "II.P22":"The mind perceives not only the body's affections but their ideas.",
  "II.P23":"The mind knows itself only through ideas of bodily affections.",
  "II.P24":"The mind lacks adequate knowledge of its body's parts.",
  "II.P25":"An affection's idea gives no adequate knowledge of external bodies.",
  "II.P26":"We perceive external bodies only through our own body's affections.",
  "II.C26":"In imagining external bodies, the mind lacks adequate knowledge of them.",
  "II.P27":"An affection's idea gives no adequate knowledge of our own body either.",
  "II.P28":"Ideas of bodily affections, taken alone, are confused.",
  "II.P29":"The idea of an affection's idea yields no adequate self-knowledge.",
  "II.C29":"Perceiving things in nature's common order yields confused self-knowledge.",
  "II.P30":"We can know the duration of our own body only inadequately.",
  "II.P31":"We can know the duration of external things only inadequately.",
  "II.C31":"All particular things are, to us, contingent and perishable.",
  "II.P32":"All ideas, referred to God, are true.",
  "II.P33":"There is nothing positive in ideas that makes them false.",
  "II.P34":"Every adequate idea in us is true.",
  "II.P35":"Falsity is the privation of knowledge in confused ideas.",
  "II.P36":"Inadequate ideas follow as necessarily as adequate ones.",
  "II.P37":"What is common to all does not constitute any thing's essence.",
  "II.P38":"What is common to all can only be conceived adequately.",
  "II.C38":"Some notions are common to all men and adequately perceived.",
  "II.P39":"What our body shares with others is adequately conceived.",
  "II.C39":"The more the body shares, the more the mind grasps adequately.",
  "II.P40":"Three kinds of knowledge: imagination, reason, and intuition.",
  "II.P41":"Imagination alone is the source of falsity; reason and intuition are true.",
  "II.P42":"Reason and intuition teach us to distinguish true from false.",
  "II.P43":"He who has a true idea knows he has it, and cannot doubt it.",
  "II.C43":"Certainty and truth are the same thing.",
  "II.P44":"Reason regards things as necessary, not as contingent.",
  "II.C44a":"Only imagination, not reason, regards things as contingent.",
  "II.C44b":"Reason perceives things under a form of eternity.",
  "II.P45":"Every idea of a thing involves God's eternal and infinite essence.",
  "II.C45":"God's essence is involved in every idea and known to all.",
  "II.P46":"The knowledge of God within each idea is adequate and perfect.",
  "II.P47":"The human mind has adequate knowledge of God's eternal essence.",
  "II.C47":"God's essence is known to all, though often obscured.",
  "II.P48":"There is no free will; the will is determined by causes to infinity.",
  "II.C48":"Will and intellect are one and the same thing.",
  "II.P49":"The mind affirms only what an idea, as an idea, involves.",
  "II.C49":"Will does not exceed intellect — we affirm only what we perceive.",
  // ── Part III — Emotions ──
  "III.Def":"Definitions of adequate/inadequate cause, action and passion.",
  "III.P1":"The mind is active through adequate ideas, passive through inadequate ones.",
  "III.P2":"Body cannot move mind nor mind body; they run in parallel.",
  "III.P3":"Mental activity arises from adequate ideas, passivity from inadequate ones.",
  "III.P4":"Nothing can be destroyed except by an external cause.",
  "III.P5":"Contrary things cannot coexist in the same subject.",
  "III.P6":"Each thing strives to persevere in its own being.",
  "III.P7":"This striving (conatus) is the actual essence of the thing.",
  "III.P8":"The mind's striving to persist involves indefinite, not limited, time.",
  "III.P9":"The mind strives to persist and is conscious of this striving.",
  "III.P10":"No idea excluding our body's existence can remain in our mind.",
  "III.P11":"Whatever raises or lowers the body's power causes joy or sadness.",
  "III.P12":"The mind strives to imagine what increases the body's power.",
  "III.P13":"The mind strives to exclude what diminishes the body's power.",
  "III.C13":"The mind is averse to conceiving what lessens its power.",
  "III.P14":"Emotions once felt together are afterwards recalled together.",
  "III.P15":"Anything can, by accident, become a cause of emotion.",
  "III.C15":"By mere association we come to love or hate a thing.",
  "III.P16":"Resemblance to an emotional object makes us love or hate.",
  "III.P17":"A thing resembling both a loved and hated object causes wavering.",
  "III.C17":"Vacillation of mind: being swayed by opposite emotions at once.",
  "III.P18":"Images of past or future move us as the present does — hope and fear.",
  "III.C18a":"Past and future goods move us like present ones: hope and fear.",
  "III.C18b":"Confidence and despair: hope and fear once doubt is removed.",
  "III.P19":"We grieve at the loss, and rejoice at the keeping, of what we love.",
  "III.P20":"We rejoice at the destruction of what we hate.",
  "III.P21":"We share the joy and sadness of what we love.",
  "III.P22":"We love whoever gladdens, and hate whoever pains, what we love.",
  "III.C22":"We love or hate whoever benefits or harms what we love.",
  "III.P26":"We affirm what gladdens, and deny what saddens, ourselves and what we love.",
  "III.P27":"We feel the emotions of those like us — empathy and imitation.",
  "III.C27a":"Pity: sharing the sadness of one like us — compassion.",
  "III.C27b":"We share the sadness or joy of those we like.",
  "III.C27c":"We strive to free the pitied from sadness — benevolence.",
  "III.P28":"We strive to bring about joy and to remove sadness.",
  "III.P36":"We desire to repeat past joys under the same circumstances.",
  "III.C36":"When past joy turns to sadness, repentance arises.",
  "III.P37":"Desire grows in proportion to the strength of the emotion behind it.",
  "III.P48":"Tied to an internal cause, love and hate become pride and self-abasement.",
  "III.App":"Forty-eight named emotions geometrically derived from joy, sadness, and desire.",
  // ── Part IV — Bondage ──
  "IV.Pref":"Good and evil are relative to a model of human nature, not absolute.",
  "IV.P1":"Truth does not remove what is positive in a false idea.",
  "IV.P2":"We are passive insofar as we are only a part of Nature.",
  "IV.P3":"Our power to persist is finite, infinitely surpassed by external causes.",
  "IV.P4":"Man is necessarily a part of Nature and subject to its changes.",
  "IV.C4":"Man is necessarily subject to passions and cannot always follow reason.",
  "IV.P5":"A passion's force is set by its external cause, not by us.",
  "IV.P6":"A passion can fix itself obstinately and dominate a man.",
  "IV.P7":"An emotion is checked only by a stronger, contrary emotion.",
  "IV.P8":"Knowledge of good and evil is simply felt joy or sadness.",
  "IV.P14":"True knowledge restrains emotion only insofar as it is itself an emotion.",
  "IV.P15":"Desire from true knowledge can be overcome by many passions.",
  "IV.P17":"Desire from true knowledge is strongest — if not overcome.",
  "IV.C17":"Desire arising from joy is stronger than that arising from sadness.",
  "IV.P18":"Desire arising from joy is stronger than that arising from sadness.",
  "IV.P20":"The more one seeks what is truly useful, the more virtue one has.",
  "IV.P21":"To desire to live well presupposes desiring to exist.",
  "IV.P24":"To act from virtue is to live by reason in self-preservation.",
  "IV.C24":"Self-preservation is the foundation of virtue.",
  "IV.P26":"Reason's highest good is the knowledge of God.",
  "IV.P27":"Only what aids or hinders understanding is certainly good or evil.",
  "IV.P28":"The mind's highest good and virtue is to know God.",
  "IV.P29":"What has nothing in common with us is neither good nor evil for us.",
  "IV.P35":"Living by reason, men agree in nature and become useful to one another.",
  "IV.C35a":"Nothing is more useful to man than a man guided by reason.",
  "IV.C35b":"Rational self-interest and mutual usefulness coincide.",
  "IV.P36":"The highest good is common to all and shared equally.",
  "IV.C36":"The virtuous desire for others the good they seek for themselves.",
  "IV.P37":"The virtuous desire the good for all, more as they know God more.",
  "IV.P45":"Hatred can never be good.",
  "IV.C45a":"Envy, derision, contempt, anger, and revenge are bad.",
  "IV.C45b":"Whatever we desire from hatred or envy is base and unjust.",
  "IV.P46":"The rational man repays hatred with love and nobility.",
  "IV.C46":"Avenging hatred breeds misery; overcoming it with love brings joy.",
  "IV.P50":"Pity, in a man led by reason, is in itself bad and useless.",
  "IV.C50":"Reason itself dictates aid to others, making mere pity needless.",
  "IV.P54":"Repentance is not a virtue; the repentant is doubly wretched.",
  "IV.P58":"Honor arising from reason is true; otherwise it is vain.",
  "IV.P67":"A free man meditates on life, not on death.",
  "IV.P72":"A free man always acts in good faith, never deceitfully.",
  "IV.P73":"Guided by reason, a man is freer in society than in solitude.",
  "IV.App":"Thirty-two rules of rational life summarizing Part IV.",
  // ── Part V — Freedom ──
  "V.Pref":"Freedom comes through the intellect, not by sheer will over passion.",
  "V.P1":"Bodily affections are ordered exactly as the mind's thoughts are.",
  "V.P2":"Detach an emotion from its imagined cause, and love or hatred dissolves.",
  "V.P3":"A passion ceases to be one once we form a clear idea of it.",
  "V.C3":"The better we know an emotion, the more it is in our control.",
  "V.P4":"Of every bodily affection we can form a clear and distinct idea.",
  "V.C4":"An adequate idea turns a passion into an action of the mind.",
  "V.P5":"Emotion toward a thing conceived as free is the strongest.",
  "V.P6":"Understanding things as necessary gives the mind power over emotion.",
  "V.P7":"Emotions from reason prevail, over time, over those from absent things.",
  "V.P10":"Free of contrary passions, we can order affections by the intellect.",
  "V.P11":"An image tied to more things recurs and occupies the mind more.",
  "V.P12":"Images link more easily to what we clearly understand.",
  "V.P13":"Images tied to common properties or to God recur the most.",
  "V.P14":"The mind can refer all bodily affections to the idea of God.",
  "V.P15":"He who understands himself and his emotions loves God.",
  "V.P16":"This love of God must hold the chief place in the mind.",
  "V.P17":"God is without passions, affected by neither joy nor sadness.",
  "V.C17":"Strictly speaking, God neither loves nor hates anyone.",
  "V.P18":"No one can hate God.",
  "V.C18":"Love of God cannot be stained by envy and grows when shared.",
  "V.P19":"He who loves God cannot want God to love him in return.",
  "V.P20":"Love of God is unstained and grows the more it is shared.",
  "V.P21":"The mind imagines and remembers only while the body lasts.",
  "V.P22":"In God there is an idea of each body under the form of eternity.",
  "V.P23":"Something of the mind is eternal and survives the body.",
  "V.P24":"The more we understand particular things, the more we understand God.",
  "V.P25":"The mind's highest virtue is the third kind of knowledge.",
  "V.P26":"The more the mind knows intuitively, the more it desires to.",
  "V.P27":"From intuitive knowledge comes the highest mental contentment.",
  "V.P28":"The desire for intuitive knowledge arises from reason, not imagination.",
  "V.P29":"The mind grasps things under eternity by conceiving the body's essence.",
  "V.P30":"Knowing itself under eternity, the mind knows it is in God.",
  "V.P31":"Intuitive knowledge flows from the mind insofar as it is eternal.",
  "V.C31":"The more intuitive knowledge, the less the fear of death.",
  "V.P32":"We delight in intuitive knowledge, with the idea of God as its cause.",
  "V.C32":"From intuitive knowledge arises the eternal intellectual love of God.",
  "V.P33":"The intellectual love of God is eternal.",
  "V.P34":"Only while alive is a man subject to the passions.",
  "V.P35":"God loves himself with an infinite intellectual love.",
  "V.P36":"The mind's love of God is part of God's love of himself.",
  "V.C36":"God's love of men and the mind's love of God are one and the same.",
  "V.P37":"Nothing in nature can oppose or take away this intellectual love.",
  "V.P38":"The more the mind understands, the less it fears death.",
  "V.P39":"A body capable of much yields a mind largely eternal.",
  "V.C39":"He whose body can do much is scarcely troubled by death.",
  "V.P40":"The more perfection, the more activity; the more active, the more perfect.",
  "V.C40":"The eternal part of the mind — understanding — is the most powerful.",
  "V.P41":"Even without eternity, piety and strength of mind come first.",
  "V.P42":"Blessedness is not virtue's reward but virtue itself.",
};

// Build a table-of-contents tree once: per Part → foundations, propositions
// (with their corollaries nested by number), and appendices, all in document order.
const CONTENTS = Object.keys(PARTS).map(pk => {
  const ns = RAW_NODES.filter(n => n.part === pk);
  const foundations = ns.filter(n => n.type === "axiom");
  const appendix    = ns.filter(n => n.type === "appendix");
  const props       = ns.filter(n => n.type === "prop" || n.type === "keystone")
                        .sort((a, b) => nodeNum(a.id) - nodeNum(b.id));
  const corolls     = ns.filter(n => n.type === "coroll");
  const byProp = {};
  const orphanCorolls = [];
  corolls.forEach(c => {
    const parent = props.find(p => nodeNum(p.id) === nodeNum(c.id));
    if (parent) (byProp[parent.id] ||= []).push(c);
    else orphanCorolls.push(c);
  });
  Object.values(byProp).forEach(arr => arr.sort((a, b) => a.id.localeCompare(b.id)));
  return { pk, foundations, props, byProp, orphanCorolls, appendix };
});

// Kamada-Kawai positions are baked into RAW_NODES (computed offline via networkx).
const KAMADA_LAYOUT = (() => {
  const m = {};
  RAW_NODES.forEach(n => { m[n.id] = { x: n.x, y: n.y }; });
  return m;
})();

// Sequential (layered DAG) layout: axioms/roots at the bottom, every edge pointing
// strictly upward. Longest-path layering gives the minimum possible height; a few
// barycenter sweeps order nodes within each layer to reduce edge crossings.
function buildSequentialLayout() {
  const ids = RAW_NODES.map(n => n.id);
  const idSet = new Set(ids);
  const nodeById = {};
  RAW_NODES.forEach(n => { nodeById[n.id] = n; });

  // Collect valid edges, then strip any back-edges so layering sees a strict DAG.
  // A stray cycle (e.g. from a mechanical re-extraction of the dependency data)
  // would otherwise make longest-path layering blow the height up to ~N layers.
  const rawValid = RAW_EDGES.filter(([a, b]) => idSet.has(a) && idSet.has(b) && a !== b);
  const adj = {}; ids.forEach(id => { adj[id] = []; });
  rawValid.forEach(([a, b]) => adj[a].push(b));

  // DFS; an edge into a node currently on the recursion stack is a back-edge.
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const mark = {}; ids.forEach(id => { mark[id] = WHITE; });
  const backEdges = new Set();
  const visit = root => {
    const stack = [[root, 0]];
    mark[root] = GRAY;
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const [u, i] = frame;
      if (i < adj[u].length) {
        frame[1]++;
        const v = adj[u][i];
        if (mark[v] === GRAY) backEdges.add(`${u} ${v}`);
        else if (mark[v] === WHITE) { mark[v] = GRAY; stack.push([v, 0]); }
      } else { mark[u] = BLACK; stack.pop(); }
    }
  };
  ids.forEach(id => { if (mark[id] === WHITE) visit(id); });

  const out = {}, inc = {}, indeg = {};
  ids.forEach(id => { out[id] = []; inc[id] = []; indeg[id] = 0; });
  rawValid.forEach(([a, b]) => {
    if (backEdges.has(`${a} ${b}`)) return; // drop back-edge to keep DAG
    out[a].push(b); inc[b].push(a); indeg[b]++;
  });

  // Longest-path layering via Kahn topological order (graph is now acyclic).
  const layer = {}; ids.forEach(id => { layer[id] = 0; });
  const deg = { ...indeg };
  const queue = ids.filter(id => deg[id] === 0);
  while (queue.length) {
    const cur = queue.shift();
    out[cur].forEach(b => {
      if (layer[cur] + 1 > layer[b]) layer[b] = layer[cur] + 1;
      if (--deg[b] === 0) queue.push(b);
    });
  }

  const maxLayer = ids.reduce((mx, id) => Math.max(mx, layer[id]), 0);
  const layers = Array.from({ length: maxLayer + 1 }, () => []);
  ids.forEach(id => layers[layer[id]].push(id));

  const partOrder = { I: 0, II: 1, III: 2, IV: 3, V: 4 };
  layers.forEach(arr => arr.sort((a, b) =>
    (partOrder[nodeById[a].part] - partOrder[nodeById[b].part]) || a.localeCompare(b)));

  const SPACING = 220;
  const X = {};
  const assignX = arr => {
    const w = (arr.length - 1) * SPACING;
    arr.forEach((id, i) => { X[id] = i * SPACING - w / 2; });
  };
  layers.forEach(assignX);

  const bary = (id, adj) => {
    const ns = adj[id];
    if (!ns.length) return X[id];
    return ns.reduce((s, n) => s + X[n], 0) / ns.length;
  };
  for (let iter = 0; iter < 6; iter++) {
    for (let l = 1; l <= maxLayer; l++) {
      layers[l].sort((a, b) => bary(a, inc) - bary(b, inc));
      assignX(layers[l]);
    }
    for (let l = maxLayer - 1; l >= 0; l--) {
      layers[l].sort((a, b) => bary(a, out) - bary(b, out));
      assignX(layers[l]);
    }
  }

  const LAYER_H = 170;
  const pos = {};
  ids.forEach(id => { pos[id] = { x: X[id], y: (maxLayer - layer[id]) * LAYER_H }; });
  return pos;
}

function NodeShape({ type, color, active, dim, t }) {
  const fill = dim ? t.nodeFillDim : (type==="axiom"||type==="appendix") ? t.nodeFillBox : t.nodeFill;
  const sw = active ? 2.5 : type==="keystone" ? 1.8 : type==="coroll" ? 1 : 0.9;
  const opacity = dim ? 0.55 : 1;
  const filter = active ? "url(#glow)" : undefined;
  const common = { fill, stroke: color, strokeWidth: sw, opacity, filter };

  if (type === "coroll") {
    const r = 20;
    return <polygon points={`0,${-r} ${r},0 0,${r} ${-r},0`} {...common} />;
  }
  if (type === "axiom" || type === "appendix") {
    const w = type==="appendix" ? 80 : 72, h = 28;
    return <rect x={-w/2} y={-h/2} width={w} height={h} rx={4} {...common} />;
  }
  if (type === "keystone") {
    return <ellipse rx={38} ry={22} {...common} />;
  }
  return <circle r={18} {...common} />;
}

export default function SpinozaEthics() {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.11 });
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [activePart, setActivePart] = useState(null);
  const [traced, setTraced] = useState(null);
  const [ancestry, setAncestry] = useState(null); // { nodeSet, edgeSet } | null
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(["I"]));
  const [treeOpen, setTreeOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState("kamada"); // "kamada" | "sequential"
  const [overrides, setOverrides] = useState({ kamada: {}, sequential: {} }); // manual node moves per layout
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  const [showAll, setShowAll] = useState(false); // keep everything fully visible (no dimming on focus)
  const t = THEMES[theme];
  const dimEnabled = !showAll;
  const pc = (part) => t.parts[part]; // theme-aware Part color
  const svgRef = useRef(null);
  const dragRef = useRef({ dragging: false, lx: 0, ly: 0 });
  const clickRef = useRef({ time: 0, target: null });
  const canvasClickRef = useRef({ time: 0 });
  const nodeDragRef = useRef(null);     // active node drag: { id, lx, ly, sx, sy, moved }
  const justDraggedRef = useRef(false); // suppress click right after a drag

  // Layout positions: a base layout per mode, with manual per-node overrides on top.
  const sequentialLayout = useMemo(() => buildSequentialLayout(), []);
  const baseLayout = layoutMode === "sequential" ? sequentialLayout : KAMADA_LAYOUT;
  const getPosMap = useCallback((mode, ov) => {
    const base = mode === "sequential" ? sequentialLayout : KAMADA_LAYOUT;
    const o = ov[mode] || {};
    const m = {};
    RAW_NODES.forEach(n => { m[n.id] = o[n.id] || base[n.id]; });
    return m;
  }, [sequentialLayout]);
  const posMap = useMemo(() => getPosMap(layoutMode, overrides), [getPosMap, layoutMode, overrides]);

  // Refs so the window drag listener (bound once) sees current layout/positions.
  const tfRef = useRef(transform);
  const layoutModeRef = useRef(layoutMode);
  const baseLayoutRef = useRef(baseLayout);
  const overridesRef = useRef(overrides);
  useEffect(() => {
    tfRef.current = transform;
    layoutModeRef.current = layoutMode;
    baseLayoutRef.current = baseLayout;
    overridesRef.current = overrides;
  });

  const visNodes = activePart ? RAW_NODES.filter(n => n.part === activePart) : RAW_NODES;
  const visIds = new Set(visNodes.map(n => n.id));
  const visEdges = RAW_EDGES.filter(([a,b]) => visIds.has(a) && visIds.has(b));

  const inTraceMode = !!(traced && ancestry);
  const highlighted = !inTraceMode ? (hovered || selected) : null;
  const connectedIds = highlighted ? new Set(
    RAW_EDGES.filter(([a,b]) => a===highlighted||b===highlighted).flat()
  ) : null;

  // Pan/zoom handlers
  const onMouseDown = useCallback(e => {
    if (e.target.closest && e.target.closest("[data-node]")) return;
    dragRef.current = { dragging: true, lx: e.clientX, ly: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = e => {
      // Dragging a single node to reposition it
      const nd = nodeDragRef.current;
      if (nd) {
        const scale = tfRef.current.scale || 1;
        const dx = (e.clientX - nd.lx) / scale;
        const dy = (e.clientY - nd.ly) / scale;
        nd.lx = e.clientX; nd.ly = e.clientY;
        if (Math.abs(e.clientX - nd.sx) + Math.abs(e.clientY - nd.sy) > 3) nd.moved = true;
        const mode = layoutModeRef.current;
        setOverrides(prev => {
          const cur = (prev[mode] && prev[mode][nd.id]) || baseLayoutRef.current[nd.id];
          return { ...prev, [mode]: { ...prev[mode], [nd.id]: { x: cur.x + dx, y: cur.y + dy } } };
        });
        return;
      }
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lx;
      const dy = e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      setTransform(p => ({ ...p, x: p.x + dx, y: p.y + dy }));
    };
    const onUp = () => {
      if (nodeDragRef.current) {
        if (nodeDragRef.current.moved) justDraggedRef.current = true;
        nodeDragRef.current = null;
      }
      dragRef.current.dragging = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const onWheel = useCallback(e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(p => ({ ...p, scale: Math.max(0.04, Math.min(4, p.scale * f)) }));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const handleNodeMouseDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    nodeDragRef.current = { id: nodeId, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
  }, []);

  const handleNodeClick = useCallback((e, nodeId) => {
    e.stopPropagation();
    if (justDraggedRef.current) { justDraggedRef.current = false; return; } // was a drag, not a click
    const now = Date.now();
    const ref = clickRef.current;
    if (ref.target === nodeId && now - ref.time < 350) {
      // double-click: toggle trace
      if (traced === nodeId) {
        setTraced(null); setAncestry(null); setSelected(null);
      } else {
        setTraced(nodeId);
        setAncestry(computeAncestors(nodeId));
        setSelected(nodeId);
      }
      clickRef.current = { time: 0, target: null };
    } else {
      if (traced) { setTraced(null); setAncestry(null); }
      setSelected(prev => prev === nodeId ? null : nodeId);
      clickRef.current = { time: now, target: nodeId };
    }
  }, [traced]);

  const handleCanvasClick = useCallback(e => {
    if (e.target.closest && e.target.closest("[data-node]")) return;
    const now = Date.now();
    const ref = canvasClickRef.current;
    if (now - ref.time < 350) {
      setSelected(null); setTraced(null); setAncestry(null);
      canvasClickRef.current = { time: 0 };
    } else {
      canvasClickRef.current = { time: now };
    }
  }, []);

  // Tree filter: match a node by label, id, or description
  const q = query.trim().toLowerCase();
  const matchNode = (n) => !q ||
    n.label.toLowerCase().includes(q) ||
    n.id.toLowerCase().includes(q) ||
    n.desc.toLowerCase().includes(q);

  const togglePart = (pk) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(pk) ? next.delete(pk) : next.add(pk);
    return next;
  });

  // Fit a given position map within the viewport
  const fitView = useCallback((pmap) => {
    const pts = Object.values(pmap);
    if (!pts.length || typeof window === "undefined") return;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = (maxX - minX) + 400, h = (maxY - minY) + 400;
    const scale = Math.max(0.04, Math.min(2, Math.min(window.innerWidth / w, window.innerHeight / h)));
    setTransform({ x: -((minX + maxX) / 2) * scale, y: -((minY + maxY) / 2) * scale, scale });
  }, []);

  const switchLayout = useCallback((mode) => {
    setLayoutMode(mode);
    fitView(getPosMap(mode, overridesRef.current));
  }, [fitView, getPosMap]);

  // Center the view on a node and lock it as the selection
  const FOCUS_SCALE = 0.55;
  const focusNode = useCallback((node) => {
    setActivePart(prev => (prev && node.part !== prev ? null : prev));
    setTraced(null); setAncestry(null);
    setSelected(node.id);
    setHovered(null);
    const p = posMap[node.id];
    setTransform({ x: -p.x * FOCUS_SCALE, y: -p.y * FOCUS_SCALE, scale: FOCUS_SCALE });
  }, [posMap]);

  const TYPE_GLYPH = { prop:"○", coroll:"◇", keystone:"⬭", axiom:"▭", appendix:"▭" };

  // One clickable entry in the contents tree
  const renderRow = (node, depth) => {
    const color = pc(node.part);
    const isSel = selected === node.id;
    const parts = node.label.split("\n");
    const number = parts[0];
    // Prefer the curated essence, then the keystone title, then a derived first sentence.
    const gloss = GLOSS[node.id] || parts[1] || shortGloss(node.desc);
    const bold = node.type === "axiom" || node.type === "appendix" || node.type === "keystone";
    return (
      <div key={node.id} onClick={() => focusNode(node)}
        onMouseEnter={() => setHovered(node.id)}
        onMouseLeave={() => setHovered(null)}
        style={{ display:"flex", alignItems:"flex-start", gap:7, cursor:"pointer",
          padding:"4px 8px 4px " + (10 + depth * 16) + "px",
          background: isSel ? t.tint : "transparent",
          borderLeft: isSel ? `2px solid ${color}` : "2px solid transparent" }}>
        <span style={{ color, fontSize:11, width:12, flexShrink:0, textAlign:"center", opacity:0.8, marginTop:1 }}>
          {TYPE_GLYPH[node.type]}
        </span>
        <span style={{ fontSize:11.5, lineHeight:1.4, flex:1, minWidth:0 }}>
          <span style={{ color, fontWeight: bold ? "bold" : 600,
            fontStyle: node.type === "keystone" ? "italic" : "normal" }}>{number}</span>
          {gloss && <span style={{ color: isSel ? t.textBright : t.t2 }}>{" — " + gloss}</span>}
        </span>
      </div>
    );
  };

  const worldX = transform.x + (typeof window !== "undefined" ? window.innerWidth : 1200) / 2;
  const worldY = transform.y + (typeof window !== "undefined" ? window.innerHeight : 800) / 2;

  // Info panel content
  const activeNode = selected ? nodeMap[selected] : hovered ? nodeMap[hovered] : null;

  return (
    <div style={{ width:"100%", height:"100vh", background:t.bg, position:"relative", overflow:"hidden",
      transition:"background 0.3s", fontFamily:"'Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif" }}>

      {/* Grid */}
      <div style={{ position:"absolute", inset:0, opacity:t.gridOpacity, pointerEvents:"none",
        backgroundImage:`repeating-linear-gradient(0deg,${t.grid} 0px,transparent 1px,transparent 48px),repeating-linear-gradient(90deg,${t.grid} 0px,transparent 1px,transparent 48px)` }} />

      {/* Header */}
      <div style={{ position:"absolute", top:20, left:0, right:0, textAlign:"center", zIndex:10, pointerEvents:"none" }}>
        <div style={{ color:t.t3, fontSize:10, letterSpacing:6, textTransform:"uppercase", marginBottom:3 }}>Benedictus de Spinoza — 1677</div>
        <div style={{ color:t.textBright, fontSize:26, fontStyle:"italic", letterSpacing:1 }}>Ethica Ordine Geometrico Demonstrata</div>
        <div style={{ color:t.t5, fontSize:10, letterSpacing:4, textTransform:"uppercase", marginTop:3 }}>Complete Logical Structure — Propositions, Corollaries &amp; Appendices</div>
      </div>

      {/* Part filters */}
      <div style={{ position:"absolute", top:108, left:"50%", transform:"translateX(-50%)", display:"flex", gap:6, zIndex:10 }}>
        {[["ALL", null], ...Object.entries(PARTS).map(([k]) => [k, k])].map(([label, val]) => {
          const color = val ? pc(val) : t.accent;
          const active = activePart === val;
          return (
            <button key={label} onClick={() => setActivePart(activePart === val && val !== null ? null : val)}
              style={{ borderRadius:2, cursor:"pointer", fontSize:10, letterSpacing:3, fontFamily:"inherit",
                padding:"4px 13px", background: active ? color : "transparent",
                color: active ? t.btnActiveText : color, border:`1px solid ${color}55`, transition:"all 0.2s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Contents tree */}
      {!treeOpen ? (
        <button onClick={() => setTreeOpen(true)}
          style={{ position:"absolute", top:148, left:20, zIndex:20, padding:"7px 12px",
            background:t.panel, border:`1px solid ${t.border}`, borderRadius:3,
            color:t.accent, cursor:"pointer", fontSize:10, letterSpacing:3, fontFamily:"inherit",
            textTransform:"uppercase", backdropFilter:"blur(12px)" }}>
          ☰ Contents
        </button>
      ) : (
        <div style={{ position:"absolute", top:148, left:20, bottom:64, width:288, zIndex:20,
          display:"flex", flexDirection:"column", background:t.panel,
          border:`1px solid ${t.border}`, borderRadius:3, backdropFilter:"blur(12px)", overflow:"hidden" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 12px", borderBottom:`1px solid ${t.divider}` }}>
            <span style={{ color:t.t3, fontSize:10, letterSpacing:3, textTransform:"uppercase" }}>Contents</span>
            <button onClick={() => setTreeOpen(false)} style={{ background:"none", border:"none",
              color:t.t4, cursor:"pointer", fontSize:14, fontFamily:"inherit", lineHeight:1, padding:0 }}>‹</button>
          </div>

          {/* Filter */}
          <div style={{ position:"relative", padding:"8px 10px", borderBottom:`1px solid ${t.divider}` }}>
            <span style={{ position:"absolute", left:19, top:"50%", transform:"translateY(-50%)",
              color:t.t4, fontSize:12, pointerEvents:"none" }}>⌕</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") setQuery(""); }}
              placeholder="Filter…"
              style={{ width:"100%", boxSizing:"border-box", padding:"6px 24px 6px 26px",
                background:t.inputBg, border:`1px solid ${query?t.accentSoft:t.border}`,
                borderRadius:2, color:t.textBright, fontSize:11.5, fontFamily:"inherit", outline:"none" }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position:"absolute", right:18, top:"50%",
                transform:"translateY(-50%)", background:"none", border:"none", color:t.t4,
                cursor:"pointer", fontSize:13, fontFamily:"inherit", lineHeight:1, padding:2 }}>×</button>
            )}
          </div>

          {/* Tree body */}
          <div style={{ overflowY:"auto", flex:1, padding:"4px 0" }}>
            {(() => {
              let anyMatch = false;
              const body = CONTENTS.map(({ pk, foundations, props, byProp, orphanCorolls, appendix }) => {
                const part = PARTS[pk];
                const partColor = pc(pk);
                const isOpen = !!q || expanded.has(pk);

                const fnd = foundations.filter(matchNode);
                const orph = orphanCorolls.filter(matchNode);
                const app = appendix.filter(matchNode);
                const propGroups = props
                  .map(p => {
                    const cs = byProp[p.id] || [];
                    const propHit = matchNode(p);
                    const corHits = cs.filter(matchNode);
                    if (q && !propHit && corHits.length === 0) return null;
                    return { prop: p, corolls: q ? (propHit ? cs : corHits) : cs };
                  })
                  .filter(Boolean);

                const partHasMatch = !q ||
                  fnd.length || orph.length || app.length || propGroups.length;
                if (q && !partHasMatch) return null;
                anyMatch = true;

                return (
                  <div key={pk}>
                    <div onClick={() => togglePart(pk)}
                      style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                        padding:"6px 10px", marginTop:2 }}>
                      <span style={{ color:partColor, fontSize:9, width:9, transition:"transform 0.15s",
                        transform: isOpen ? "rotate(90deg)" : "none" }}>▶</span>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:partColor, flexShrink:0 }}/>
                      <span style={{ color:partColor, fontSize:11, letterSpacing:1, fontWeight:"bold" }}>{part.label}</span>
                      <span style={{ color:t.t5, fontSize:9.5, fontStyle:"italic", overflow:"hidden",
                        textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{part.subtitle}</span>
                    </div>
                    {isOpen && (
                      <div style={{ paddingBottom:4 }}>
                        {fnd.length > 0 && (
                          <div style={{ color:t.t6, fontSize:9, letterSpacing:2, textTransform:"uppercase",
                            padding:"4px 0 2px 28px" }}>Definitions & Axioms</div>
                        )}
                        {fnd.map(n => renderRow(n, 1))}
                        {propGroups.length > 0 && (
                          <div style={{ color:t.t6, fontSize:9, letterSpacing:2, textTransform:"uppercase",
                            padding:"4px 0 2px 28px" }}>Propositions</div>
                        )}
                        {propGroups.map(({ prop, corolls }) => (
                          <div key={prop.id}>
                            {renderRow(prop, 1)}
                            {corolls.map(c => renderRow(c, 2))}
                          </div>
                        ))}
                        {orph.map(c => renderRow(c, 1))}
                        {app.length > 0 && (
                          <div style={{ color:t.t6, fontSize:9, letterSpacing:2, textTransform:"uppercase",
                            padding:"4px 0 2px 28px" }}>Appendix</div>
                        )}
                        {app.map(n => renderRow(n, 1))}
                      </div>
                    )}
                  </div>
                );
              });
              if (q && !anyMatch) {
                return <div style={{ padding:"12px 14px", color:t.t5, fontSize:11, fontStyle:"italic" }}>No matching nodes</div>;
              }
              return body;
            })()}
          </div>
        </div>
      )}

      {/* SVG canvas */}
      <svg ref={svgRef} style={{ width:"100%", height:"100%", cursor:"grab" }}
        onMouseDown={onMouseDown} onClick={handleCanvasClick}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {Object.keys(PARTS).map(k => (
            <marker key={k} id={`arr-${k}`} markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L7,3z" fill={pc(k)} opacity="0.6"/>
            </marker>
          ))}
          <marker id="arr-dim" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3z" fill={t.arrowDim}/>
          </marker>
        </defs>
        <g transform={`translate(${worldX},${worldY}) scale(${transform.scale})`}>
          {/* Edges */}
          <g>
            {visEdges.map(([a, b], i) => {
              const na = nodeMap[a], nb = nodeMap[b];
              if (!na || !nb) return null;
              let stroke, sw, opacity, marker;
              if (inTraceMode) {
                const isAnc = ancestry.edgeSet.has(a + "->" + b);
                const isDirect = isAnc && b === traced;
                stroke = pc(na.part);
                sw = isDirect ? 2.2 : isAnc ? 1.2 : (showAll ? 0.9 : 0.4);
                opacity = isDirect ? 1 : isAnc ? 0.7 : (showAll ? 0.6 : 0.18);
                marker = `url(#arr-${na.part})`;
              } else {
                const isHi = highlighted && (a===highlighted||b===highlighted);
                const isDim = dimEnabled && highlighted && !isHi;
                stroke = pc(na.part);
                sw = isHi ? 1.5 : (showAll ? 1.0 : 0.6);
                opacity = isDim ? 0.12 : isHi ? 0.85 : (showAll ? 0.72 : 0.28);
                marker = `url(#arr-${na.part})`;
              }
              const rA = getRadius(na.type), rB = getRadius(nb.type);
              const pa = posMap[a], pb = posMap[b];
              const dx=pb.x-pa.x, dy=pb.y-pa.y, len=Math.sqrt(dx*dx+dy*dy)||1;
              const x1=pa.x+(dx/len)*rA, y1=pa.y+(dy/len)*rA;
              const x2=pb.x-(dx/len)*(rB+6), y2=pb.y-(dy/len)*(rB+6);
              const cx=(x1+x2)/2-(dy/len)*25, cy=(y1+y2)/2+(dx/len)*25;
              return (
                <path key={i} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
                  stroke={stroke} strokeWidth={sw} fill="none" opacity={opacity} markerEnd={marker}/>
              );
            })}
          </g>
          {/* Nodes */}
          <g>
            {visNodes.map(node => {
              const color = pc(node.part);
              let isActive, isDim, isAncestor, isTarget;
              if (inTraceMode) {
                isTarget = node.id === traced;
                isAncestor = ancestry.nodeSet.has(node.id) && !isTarget;
                isActive = isTarget;
                isDim = dimEnabled && !ancestry.nodeSet.has(node.id);
              } else {
                isActive = selected===node.id || hovered===node.id;
                isDim = !!(dimEnabled && highlighted && !connectedIds?.has(node.id) && highlighted!==node.id);
                isAncestor = false; isTarget = false;
              }
              const lines = node.label.split("\n");
              const p = posMap[node.id];
              return (
                <g key={node.id} transform={`translate(${p.x},${p.y})`}
                  style={{ cursor:"grab" }} data-node="1"
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  onClick={e => handleNodeClick(e, node.id)}
                  onMouseEnter={() => { if (!inTraceMode && !nodeDragRef.current) setHovered(node.id); }}
                  onMouseLeave={() => { if (!inTraceMode && !nodeDragRef.current) setHovered(null); }}>
                  {(isActive || isAncestor) && (
                    node.type==="keystone"
                      ? <ellipse rx={46} ry={30} fill={isTarget?t.glow:color} opacity={isTarget?0.18:0.08}/>
                      : <circle r={getRadius(node.type)+7} fill={isTarget?t.glow:color} opacity={isTarget?0.18:0.08}/>
                  )}
                  {isTarget && (
                    <circle r={getRadius(node.type)+12} fill="none" stroke={color}
                      strokeWidth={1} opacity={0.5} strokeDasharray="4,3"/>
                  )}
                  <NodeShape type={node.type} color={color} active={isActive||isAncestor} dim={isDim} t={t}/>
                  <text textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents:"none",
                    fontSize: node.type==="keystone"?"8.5px":node.type==="coroll"?"7.5px":"8px",
                    fontFamily:"'Palatino Linotype',Palatino,serif",
                    fontStyle: node.type==="keystone"?"italic":"normal",
                    fontWeight: (node.type==="axiom"||node.type==="appendix")?"bold":"normal",
                    fill: isDim?t.nodeTextDim:(isActive||isAncestor)?t.nodeTextActive:color }}>
                    {lines.map((ln, i) => (
                      <tspan key={i} x="0" dy={lines.length>1?(i===0?-5.5:11):0}>{ln}</tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Info panel */}
      <div style={{ position:"absolute", bottom:20, right:20, width:330, zIndex:10,
        background:t.panel, border:`1px solid ${activeNode?pc(activeNode.part)+"55":t.border}`,
        borderRadius:3, padding:20, backdropFilter:"blur(12px)", transition:"border-color 0.3s" }}>
        {activeNode ? (
          <>
            <div style={{ color:pc(activeNode.part), fontSize:9, letterSpacing:4, textTransform:"uppercase", marginBottom:7 }}>
              {PARTS[activeNode.part].label} · {PARTS[activeNode.part].subtitle}
            </div>
            <div style={{ color:t.textBright, fontSize:14, fontStyle:"italic", marginBottom:10, lineHeight:1.4 }}>
              {activeNode.label.replace("\n"," ")}
            </div>
            <div style={{ color:t.t2, fontSize:11.5, lineHeight:1.75 }}>{activeNode.desc}</div>
            {activeNode.type==="coroll" && (
              <div style={{ marginTop:10, padding:"6px 10px", background:t.tintSoft, borderLeft:`2px solid ${t.accentSoft}`, borderRadius:2 }}>
                <span style={{ color:t.textGold, fontSize:10, letterSpacing:2 }}>COROLLARY</span>
              </div>
            )}
            {traced === activeNode.id ? (
              <div style={{ marginTop:12, padding:"8px 10px", background:t.tintSoft,
                borderLeft:`2px solid ${pc(activeNode.part)}66`, borderRadius:2 }}>
                <div style={{ color:pc(activeNode.part), fontSize:9, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Ancestry Trace</div>
                <div style={{ color:t.t2, fontSize:11, lineHeight:1.7 }}>
                  <b style={{ color:t.textGold }}>{ancestry.nodeSet.size - 1}</b> upstream node{ancestry.nodeSet.size-1!==1?"s":""} feed into this proposition — directly and indirectly.<br/>
                  <span style={{ color:t.t5 }}>Double-click again to clear.</span>
                </div>
              </div>
            ) : (
              <div style={{ marginTop:10, color:t.t7, fontSize:10, letterSpacing:1 }}>Double-click to trace full ancestry</div>
            )}
          </>
        ) : (
          <>
            <div style={{ color:t.t7, fontSize:9, letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>Navigate</div>
            <div style={{ color:t.t7, fontSize:11, lineHeight:1.9 }}>
              Hover to highlight connections<br/>
              Click to lock selection<br/>
              <b style={{ color:t.t4 }}>Double-click to trace ancestry</b><br/>
              Scroll to zoom · Drag to pan<br/>
              Filter by Part above
            </div>
            <div style={{ marginTop:14, borderTop:`1px solid ${t.divider}`, paddingTop:14, display:"flex", flexDirection:"column", gap:6 }}>
              {Object.entries(PARTS).map(([k, v]) => (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:pc(k) }}/>
                  <span style={{ color:pc(k), fontSize:10 }}>{v.label}:</span>
                  <span style={{ color:t.t6, fontSize:10, fontStyle:"italic" }}>{v.subtitle}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, borderTop:`1px solid ${t.divider}`, paddingTop:12, color:t.t7, fontSize:10, lineHeight:1.8 }}>
              ○ Proposition &nbsp;◇ Corollary<br/>
              ⬭ Keystone &nbsp;▭ Defs/Axioms/Appendix
            </div>
          </>
        )}
      </div>

      {/* Layout + display controls */}
      <div style={{ position:"absolute", top:148, right:20, zIndex:20, width:210, display:"flex", flexDirection:"column",
        gap:0, background:t.panel, border:`1px solid ${t.border}`, borderRadius:3,
        overflow:"hidden", backdropFilter:"blur(12px)" }}>
        <div style={{ color:t.t3, fontSize:9, letterSpacing:3, textTransform:"uppercase",
          padding:"8px 12px 6px", borderBottom:`1px solid ${t.divider}` }}>Layout</div>
        {[["kamada","Kamada-Kawai","organic spring layout"],
          ["sequential","Sequential","axioms → derivations, bottom-up"]].map(([mode, label, hint]) => {
          const active = layoutMode === mode;
          return (
            <button key={mode} onClick={() => switchLayout(mode)}
              style={{ textAlign:"left", padding:"8px 12px", background: active ? t.tint : "transparent",
                border:"none", borderLeft:`2px solid ${active?t.accent:"transparent"}`, cursor:"pointer", fontFamily:"inherit" }}>
              <div style={{ color: active ? t.textBright : t.t1, fontSize:11.5 }}>{label}</div>
              <div style={{ color:t.t5, fontSize:9, fontStyle:"italic", marginTop:1 }}>{hint}</div>
            </button>
          );
        })}
        <div style={{ color:t.t7, fontSize:9, fontStyle:"italic", padding:"6px 12px 8px",
          borderTop:`1px solid ${t.divider}`, lineHeight:1.4 }}>Drag any node to reposition it.</div>

        <div style={{ color:t.t3, fontSize:9, letterSpacing:3, textTransform:"uppercase",
          padding:"8px 12px 6px", borderTop:`1px solid ${t.divider}`, borderBottom:`1px solid ${t.divider}` }}>Display</div>
        {/* Theme toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", gap:8 }}>
          <span style={{ color:t.t1, fontSize:11 }}>Theme</span>
          <div style={{ display:"flex", border:`1px solid ${t.border}`, borderRadius:3, overflow:"hidden" }}>
            {[["dark","Dark"],["light","Light"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setTheme(val)}
                style={{ padding:"3px 9px", fontSize:10, letterSpacing:1, fontFamily:"inherit", cursor:"pointer",
                  border:"none", background: theme===val ? t.accent : "transparent",
                  color: theme===val ? t.btnActiveText : t.t2 }}>{lbl}</button>
            ))}
          </div>
        </div>
        {/* Show-all / dimming toggle */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px 10px", gap:8 }}>
          <div>
            <div style={{ color:t.t1, fontSize:11 }}>Show all</div>
            <div style={{ color:t.t5, fontSize:9, fontStyle:"italic" }}>no dimming on focus</div>
          </div>
          <button onClick={() => setShowAll(s => !s)} title="Toggle dimming of unrelated nodes on focus"
            style={{ position:"relative", width:36, height:18, borderRadius:9, cursor:"pointer", flexShrink:0,
              border:`1px solid ${t.border}`, background: showAll ? t.accent : "transparent", transition:"background 0.2s" }}>
            <span style={{ position:"absolute", top:2, left: showAll ? 19 : 2, width:12, height:12, borderRadius:"50%",
              background: showAll ? t.btnActiveText : t.t3, transition:"left 0.2s" }}/>
          </button>
        </div>
      </div>

      {/* Zoom controls */}
      <div style={{ position:"absolute", bottom:20, left:20, display:"flex", flexDirection:"column", gap:4, zIndex:10 }}>
        {[["＋", () => setTransform(p=>({...p,scale:Math.min(4,p.scale*1.2)}))],
          ["−", () => setTransform(p=>({...p,scale:Math.max(0.04,p.scale*0.8)}))],
          ["⤢", () => fitView(posMap)],
          ["↺", () => setOverrides(prev => ({ ...prev, [layoutMode]: {} }))]
        ].map(([lbl, fn]) => (
          <button key={lbl} onClick={fn} title={lbl==="⤢"?"Fit to view":lbl==="↺"?"Reset node positions":undefined}
            style={{ width:32, height:32, background:t.panelSolid,
            border:`1px solid ${t.border}`, borderRadius:2, color:t.accent, cursor:"pointer",
            fontSize:lbl==="↺"||lbl==="⤢"?15:20, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
