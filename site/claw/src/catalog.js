// Single editable catalog. Geometry uses the reference's primitive descriptors;
// all collision shapes are explicit low-count spheres, separate from decoration.
export const PRIZES = [
  ['snitch','Golden snitch','#FFD66B','✨',true],
  ['wand','Percy-style trident','#62CFEF','🔱'],
  ['hat','White barn owl','#FFF8EA','🦉'],
  ['dumpling','Squishy dumpling','#FFF0CD','🥟'],
  ['angry-dumpling','Angry squishy dumpling','#F9C78E','🥟'],
  ['soccer','Soccer ball','#FAFCFF','⚽'],
  ['football','Seahawks football','#69BE28','🏈'],
  ['switch','Nintendo Switch','#FF687A','🎮'],
  ['gold-card','Golden Pokemon card','#FFD66B','🌟',true],
  ['drone','Toy drone','#77E1F5','🚁',true],
  ['duck-yellow','Yellow rubber duck','#FFE04A','🐥'],
  ['duck-rainbow','Rainbow rubber duck','#FF81CD','🌈'],
  ['duck-galaxy','Galaxy rubber duck','#7E5FF2','🌌'],
  ['duck-ninja','Ninja rubber duck','#292D47','🥷'],
  ['duck-seahawks','Seahawks rubber duck','#69BE28','🦆'],
  ['duck-green','Glow-green rubber duck','#85FF58','💚'],
  ['pineapple','Vinny’s sunglasses pineapple','#FFC83F','🍍'],
  ['toilet','Tiny toilet trophy','#E6F5FF','🚽'],
  ['avocado','Chase’s sunglasses avocado','#A8DF68','🥑'],
  ['capybara-burger','Capybara burger','#DAA568','🍔'],
].map(([id,name,dot,emoji,tricky=false]) => Object.freeze({
  id,name,dot,emoji,tricky,weight:tricky ? .35 : 1,
  description:tricky ? 'Tricky toy: its slippery shape can slip from the claw.' : 'A friendly collectible. Aim for the middle and give it a good grab.',
}));

export function buildPrize(id, {V,Hi,Bl,El,Cp,Bx,Co,Ey}) {
  const no = {phys:false};
  const ball=(r,p,c)=>Bl(r,...p,c,no);
  const ell=(s,p,c)=>El(s,p,c,no);
  const cap=(r,a,b,c,r2=r)=>Cp(r,a,b,c,r2,no);
  const box=(s,p,c,rot=[0,0,0])=>Bx(s,p,c,rot,no);
  const eye=(x,y,z,r=.018)=>Ey([x,y,z],[0,0,1],r);
  const hit=(r,x=0,y=r,z=0)=>Hi(r,x,y,z);
  // Elliptical cross sections produce actual open shells rather than stacked blobs.
  const shell=(rings,c,axis='y',center=[0,0,0])=>{
    const vertices=[],indices=[],n=48;
    rings.forEach(([a,b,height])=>{for(let i=0;i<n;i++){const t=i*Math.PI*2/n;
      vertices.push(center[0]+a*Math.cos(t),center[1]+(axis==='y'?height:b*Math.sin(t)),center[2]+(axis==='y'?b*Math.sin(t):height));
    }});
    for(let row=0;row<rings.length-1;row++)for(let i=0;i<n;i++){const a=row*n+i,b=row*n+(i+1)%n,c=a+n,d=b+n;if(axis==='y')indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c)}
    return {t:'surface',vertices,indices,col:c,phys:false};
  };
  const smile=(y,z)=>[
    ell([.05,.025,.009],[0,y,z],'#382631'),
    ell([.039,.009,.01],[0,y+.012,z+.005],'#FFFAE9')
  ];
  const glasses=(y,z)=>[
    box([.095,.055,.021],[-.056,y,z],'#18223C',[0,0,-.08]),
    box([.095,.055,.021],[.056,y,z],'#18223C',[0,0,.08]),
    box([.035,.011,.022],[0,y+.008,z],'#18223C'),
    box([.025,.007,.024],[-.066,y+.012,z+.005],'#88DCF7',[0,0,.35]),
    box([.025,.007,.024],[.046,y+.012,z+.005],'#88DCF7',[0,0,.35])
  ];
  const sneakers=()=>[-1,1].flatMap(s=>[
    cap(.018,[s*.075,.075,0],[s*.075,.03,.01],'#556358'),
    ell([.058,.026,.074],[s*.075,.026,.025],'#EAF6FF'),
    box([.08,.025,.05],[s*.075,.045,.015],'#FF6CB9')
  ]);
  const thumbs=(c)=>[-1,1].flatMap(s=>[
    cap(.013,[s*.13,.18,0],[s*.215,.245,.015],c),
    cap(.022,[s*.215,.245,.015],[s*.215,.28,.015],c)
  ]);

  if (id.startsWith('duck-')) {
    const color={yellow:'#FFE04A',rainbow:'#FF81CD',galaxy:'#6341B6',ninja:'#292D47',seahawks:'#153554',green:'#85FF58'}[id.slice(5)];
    const o=[ell([.14,.09,.16],[0,.09,0],color),ball(.09,[0,.21,.085],color),
      ell([.072,.026,.07],[0,.18,.17],'#FF9B34'),
      ell([.03,.065,.08],[-.125,.105,0],color),ell([.03,.065,.08],[.125,.105,0],color),
      eye(-.047,.234,.155),eye(.047,.234,.155),
      hit(.115,0,.105,0),hit(.075,0,.21,.085)];
    if(id==='duck-rainbow')o.push(...['#FF7474','#FFD55B','#7DEBA6','#79C9FF'].map((c,i)=>ell([.11,.012,.07],[0,.159-i*.021,-.025],c)));
    if(id==='duck-galaxy')o.push(...[[-.06,.15,.04],[.08,.14,.01],[.02,.13,-.11],[-.03,.268,.11]].map(p=>ball(.014,p,'#FCF3BF')));
    if(id==='duck-ninja')o.push(box([.15,.027,.036],[0,.235,.147],'#FF637D'),cap(.015,[.06,.24,.09],[.12,.23,-.01],'#FF637D'));
    if(id==='duck-seahawks')o.push(box([.13,.032,.03],[0,.24,.152],'#69BE28'),ell([.09,.025,.045],[0,.169,.08],'#CDD7E2'));
    if(id==='duck-green')o.push(ell([.085,.014,.08],[0,.169,0],'#D8FF89'));
    return o;
  }

  switch(id) {
    case 'snitch': return [ball(.105,[0,.12,0],'#F9C449'),
      ell([.15,.022,.055],[-.18,.145,0],'#FFF4BB'),ell([.15,.022,.055],[.18,.145,0],'#FFF4BB'),
      cap(.012,[-.085,.145,0],[-.30,.16,0],'#D4A748'),cap(.012,[.085,.145,0],[.30,.16,0],'#D4A748'),
      hit(.105,0,.12,0),hit(.035,-.17,.145,0),hit(.035,.17,.145,0)];
    // Stable saved IDs retain ownership when the toy design changes.
    case 'wand': return [
      cap(.013,[-.235,.03,0],[.09,.03,0],'#206B85'),
      cap(.017,[-.24,.03,0],[-.17,.03,0],'#C6E9EB'),
      cap(.022,[.078,.03,0],[.14,.03,0],'#E5C777'),
      cap(.011,[.115,.03,-.072],[.115,.03,.072],'#D7B255'),
      ...[-1,1].flatMap(side=>[
        cap(.011,[.115,.03,side*.072],[.175,.03,side*.072],'#E5C777'),
        cap(.009,[.175,.03,side*.072],[.21,.03,side*.095],'#E5C777',.002)]),
      cap(.011,[.125,.03,0],[.245,.03,0],'#FFE7A4',.001),
      ball(.018,[.095,.03,0],'#62CFEF'),
      hit(.029,-.19,.03,0),hit(.023,-.08,.03,0),hit(.026,.04,.03,0),
      hit(.03,.135,.03,0),hit(.022,.175,.03,-.072),hit(.022,.175,.03,.072)];
    case 'hat': return [
      ell([.095,.15,.075],[0,.165,0],'#F3EEE5'),
      ...[-1,1].flatMap(side=>[
        ell([.032,.125,.06],[side*.087,.155,-.011],'#E7DFD0'),
        ell([.017,.08,.047],[side*.104,.14,.005],'#FFF8EA'),
        ell([.058,.075,.013],[side*.041,.292,.074],'#D6BFA0'),
        ell([.054,.072,.014],[side*.039,.296,.08],'#FFF9ED'),
        eye(side*.038,.31,.096,.019),
        cap(.009,[side*.043,.045,.013],[side*.043,.026,.032],'#B9A38A'),
        ...[-1,0,1].map(i=>cap(.005,[side*.043,.026,.032],[side*.043+i*.012,.022,.055],'#B9A38A'))]),
      ell([.024,.041,.013],[0,.278,.083],'#FFF9ED'),
      Co(.011,.027,[0,.276,.101],'#C2A273',[Math.PI,0,0]),
      ell([.031,.052,.021],[0,.045,-.048],'#E7DFD0'),
      hit(.083,0,.13,0),hit(.075,0,.25,.018)];
    case 'dumpling':
    case 'angry-dumpling': {
      const angry=id==='angry-dumpling',c=angry?'#F9C78E':'#FFF0CD';
      return [ell([.15,.10,.13],[0,.10,0],c),
        ...[-2,-1,0,1,2].map(i=>cap(.018,[i*.042,.145,-.04],[i*.038,.19,.015],c)),
        eye(-.051,.11,.115),eye(.051,.11,.115),
        ... (angry ? [cap(.009,[-.078,.15,.112],[-.025,.129,.121],'#47352E'),cap(.009,[.078,.15,.112],[.025,.129,.121],'#47352E'),ell([.022,.017,.011],[0,.066,.118],'#754437')] : smile(.07,.124)),
        hit(.123,0,.105,0)];
    }
    case 'soccer': return [ball(.14,[0,.14,0],'#F8FCFF'),
      ...[[0,.14,.135],[0,.14,-.135],[-.135,.14,0],[.135,.14,0],[0,.275,0],[0,.005,0]].map(p=>ball(.052,p,'#24303E')),
      hit(.14,0,.14,0)];
    case 'football': return [ell([.19,.105,.105],[0,.11,0],'#69493A'),
      ell([.025,.104,.104],[-.125,.11,0],'#69BE28'),ell([.025,.104,.104],[.125,.11,0],'#69BE28'),
      box([.12,.015,.018],[0,.213,0],'#F4F8F2'),...[-.035,0,.035].map(x=>box([.012,.018,.049],[x,.215,0],'#F4F8F2')),
      hit(.09,-.095,.11,0),hit(.105,0,.11,0),hit(.09,.095,.11,0)];
    case 'switch': return [box([.28,.038,.18],[0,.035,0],'#222B46'),
      box([.23,.008,.132],[0,.059,0],'#62CFEF'),box([.065,.058,.19],[-.167,.039,0],'#28C9ED'),box([.065,.058,.19],[.167,.039,0],'#FF637D'),
      ball(.019,[-.17,.072,-.036],'#202945'),ball(.019,[.17,.072,.036],'#202945'),
      ...[-1,1].flatMap(s=>[hit(.055,s*.15,.04,-.043),hit(.055,s*.15,.04,.043)]),hit(.065,0,.035,0)];
    case 'gold-card': return [box([.21,.028,.30],[0,.025,0],'#E4AE32'),box([.18,.008,.27],[0,.044,0],'#FFDF76'),
      box([.145,.009,.125],[0,.052,-.025],'#A286D8'),ball(.043,[0,.064,-.025],'#FFEFAB'),
      box([.12,.01,.008],[0,.052,.085],'#B78224'),box([.09,.01,.006],[0,.052,.11],'#B78224'),
      ...[-1,1].flatMap(s=>[hit(.038,s*.068,.032,-.10),hit(.038,s*.068,.032,.10)]),hit(.047,0,.03,0)];
    case 'drone': return [ell([.085,.04,.07],[0,.07,0],'#DBF6FF'),box([.24,.025,.026],[0,.05,0],'#41BCD9'),box([.025,.026,.23],[0,.05,0],'#41BCD9'),
      ...[[-.12,-.11],[-.12,.11],[.12,-.11],[.12,.11]].flatMap(([x,z])=>[
        cap(.01,[0,.06,0],[x,.06,z],'#23324D'),ell([.058,.008,.03],[x,.09,z],'#283B57'),hit(.032,x,.06,z)
      ]),hit(.07,0,.06,0)];
    case 'pineapple': return [ell([.13,.16,.10],[0,.22,0],'#FFCC42'),
      ...[-2,-1,0,1,2].map(i=>Co(.035,.14,[i*.04,.405-Math.abs(i)*.015,0],'#47B56C',[0,0,-i*.27])),
      ...glasses(.265,.095),...smile(.21,.101),...thumbs('#DCB244'),...sneakers(),
      hit(.12,0,.175,0),hit(.105,0,.285,0)];
    case 'avocado': return [
      shell([[.001,.001,-.075],[.065,.082,-.066],[.105,.132,-.04],[.131,.165,.012],[.135,.17,.06],[.124,.157,.061]],'#397450','z',[0,.22,0]),
      ell([.124,.157,.002],[0,.22,.058],'#CCEB79'),
      ell([.076,.075,.024],[0,.155,.065],'#A96840'),ell([.027,.036,.003],[-.025,.17,.087],'#C98F58'),
      ...glasses(.294,.073),...smile(.255,.065),...thumbs('#5E9660'),...sneakers(),
      hit(.12,0,.17,0),hit(.088,0,.29,0)];
    case 'toilet': return [
      box([.13,.17,.065],[0,.13,-.08],'#ECF7FF'),box([.15,.022,.081],[0,.225,-.08],'#C0DFEA'),
      // Continuous porcelain wall turns inward at the rim and descends to the water.
      shell([[.038,.049,.04],[.051,.066,.065],[.077,.1,.1],[.095,.12,.15],[.096,.12,.171],[.077,.099,.173],[.072,.092,.153],[.058,.074,.119],[.035,.045,.092]],'#ECF7FF','y',[0,0,.045]),
      shell([[.097,.122,.174],[.097,.122,.183],[.076,.098,.184],[.076,.098,.173]],'#F9FCFF','y',[0,0,.045]),
      ell([.04,.002,.051],[0,.105,.045],'#76C5DF'),
      box([.08,.06,.08],[0,.035,.025],'#D3EAF3'),
      box([.034,.018,.018],[.048,.166,-.043],'#FFD66B'),hit(.075,0,.105,.025),hit(.07,0,.16,-.07)];
    case 'capybara-burger': return [ell([.17,.055,.12],[0,.08,0],'#D69B57'),ell([.17,.035,.12],[0,.132,0],'#6A4437'),
      ell([.18,.018,.127],[0,.164,0],'#72BD55'),box([.27,.025,.20],[0,.182,0],'#FFD659'),
      ell([.165,.08,.113],[.012,.229,0],'#E7B77A'),
      // A long square muzzle, low ears and two visible eyes identify the capybara.
      ell([.077,.069,.094],[-.076,.261,.046],'#C38B5D'),
      ell([.061,.042,.094],[-.076,.238,.113],'#D9A370'),
      ell([.019,.022,.014],[-.133,.307,.014],'#C38B5D'),ell([.019,.022,.014],[-.018,.307,.014],'#C38B5D'),
      ell([.011,.013,.006],[-.133,.308,.026],'#9D7151'),ell([.011,.013,.006],[-.018,.308,.026],'#9D7151'),
      eye(-.12,.284,.11,.011),eye(-.032,.284,.11,.011),
      ell([.033,.011,.007],[-.076,.257,.207],'#423430'),
      cap(.0025,[-.076,.246,.207],[-.076,.23,.207],'#79523D'),
      cap(.0025,[-.099,.225,.202],[-.053,.225,.202],'#79523D'),
      ...[-1,1].flatMap(s=>[-1,1].map(t=>cap(.033,[s*.1,.07,t*.065],[s*.11,.026,t*.07],'#C38B5D'))),
      hit(.12,-.085,.15,0),hit(.12,.085,.15,0)];
    default: throw new Error(`Unknown prize: ${id}`);
  }
}
